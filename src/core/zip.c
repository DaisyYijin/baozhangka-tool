/* zip.c - 极简 ZIP 读取实现(中央目录解析 + stored/deflate) */
#include "zip.h"
#include "inflate.h"
#include <stdlib.h>
#include <string.h>

#define EOCD_SIG     0x06054b50UL
#define CEN_SIG      0x02014b50UL
#define LOC_SIG      0x04034b50UL

static uint16_t rd16(const uint8_t *p) { return (uint16_t)(p[0] | (p[1] << 8)); }
static uint32_t rd32(const uint8_t *p)
{
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

/* 定位中央目录:返回条目数,*cdOff 为中央目录偏移 */
static int find_central_dir(const uint8_t *d, size_t n, uint32_t *cdOff, uint16_t *entries)
{
    if (n < 22) return ZIP_ERR_NOTZIP;
    /* EOCD 在文件尾部,从后往前搜签名 "PK\x05\x06" */
    size_t i = n - 22;
    for (;;) {
        if (rd32(d + i) == EOCD_SIG) {
            uint16_t clen = rd16(d + i + 20);          /* 注释长度 */
            if (i + 22 + clen == n) {
                *entries = rd16(d + i + 10);
                *cdOff   = rd32(d + i + 16);
                return ZIP_OK;
            }
        }
        if (i == 0) break;
        i--;
    }
    return ZIP_ERR_NOTZIP;
}

typedef struct {
    uint16_t method, nameLen;
    uint32_t csize, usize, localOff;
    const uint8_t *name;
} Entry;

/* 遍历中央目录,对每个条目调用 cb;cb 返回非0时停止并返回该条目信息 */
static int walk_entries(const uint8_t *d, size_t n,
                        int (*cb)(const Entry *e, void *ud), void *ud,
                        Entry *found)
{
    uint32_t cdOff; uint16_t entries;
    int r = find_central_dir(d, n, &cdOff, &entries);
    if (r) return r;

    size_t off = cdOff;
    for (uint16_t k = 0; k < entries; k++) {
        if (off + 46 > n || rd32(d + off) != CEN_SIG) return ZIP_ERR;
        Entry e;
        e.method  = rd16(d + off + 10);
        e.csize   = rd32(d + off + 20);
        e.usize   = rd32(d + off + 24);
        e.nameLen = rd16(d + off + 28);
        uint16_t extraLen = rd16(d + off + 30);
        uint16_t cmtLen   = rd16(d + off + 32);
        e.localOff = rd32(d + off + 42);
        e.name     = d + off + 46;
        if (off + 46 + (size_t)e.nameLen + extraLen + cmtLen > n) return ZIP_ERR;
        if (cb(&e, ud)) { if (found) *found = e; return ZIP_OK; }
        off += 46 + (size_t)e.nameLen + extraLen + cmtLen;
    }
    return ZIP_ERR; /* 没找到匹配项 */
}

struct match_ctx { const char *name; int prefix; };

/* 路径名比较:'/' 与 '\' 视为等价(.NET ZipFile 用反斜杠,Excel 用正斜杠) */
static int path_eq(const uint8_t *a, size_t alen, const char *b, int prefix)
{
    size_t bl = strlen(b);
    if (prefix ? alen < bl : alen != bl) return 0;
    for (size_t i = 0; i < bl; i++) {
        char ca = (char)a[i];
        char cb = b[i];
        if (ca == '\\') ca = '/';
        if (cb == '\\') cb = '/';
        if (ca != cb) return 0;
    }
    return 1;
}

static int match_cb(const Entry *e, void *ud)
{
    struct match_ctx *m = (struct match_ctx *)ud;
    return path_eq(e->name, e->nameLen, m->name, m->prefix);
}

struct list_ctx { int (*cb)(const char *, void *); void *ud; };

static int list_cb(const Entry *e, void *ud)
{
    struct list_ctx *c = (struct list_ctx *)ud;
    char buf[512];
    size_t l = e->nameLen < sizeof(buf) - 1 ? e->nameLen : sizeof(buf) - 1;
    memcpy(buf, e->name, l); buf[l] = 0;
    return c->cb(buf, c->ud);
}

int zip_find(const uint8_t *data, size_t size, const char *name,
             int *method, uint32_t *csize, uint32_t *usize)
{
    struct match_ctx m = { name, 0 };
    Entry e; memset(&e, 0, sizeof(e));
    if (walk_entries(data, size, match_cb, &m, &e)) return ZIP_ERR;
    if (method) *method = e.method;
    if (csize)  *csize  = e.csize;
    if (usize)  *usize  = e.usize;
    return ZIP_OK;
}

int zip_list(const uint8_t *data, size_t size,
             int (*cb)(const char *name, void *ud), void *ud)
{
    struct list_ctx c = { cb, ud };
    if (walk_entries(data, size, list_cb, &c, NULL) == ZIP_OK)
        return ZIP_OK; /* 中途 stop 也算成功 */
    /* 区分"没有条目"与"损坏":重新定位中央目录判断 */
    uint32_t cdOff; uint16_t entries;
    return find_central_dir(data, size, &cdOff, &entries);
}

/* 从 local header 定位条目数据 */
static const uint8_t *entry_data(const uint8_t *d, size_t n,
                                 const Entry *e, uint32_t *csizeOut)
{
    if (e->localOff + 30 > n || rd32(d + e->localOff) != LOC_SIG) return NULL;
    uint16_t nl = rd16(d + e->localOff + 26);
    uint16_t xl = rd16(d + e->localOff + 28);
    size_t off = e->localOff + 30 + nl + xl;
    if (off + e->csize > n) return NULL;
    *csizeOut = e->csize;
    return d + off;
}

uint8_t *zip_read(const uint8_t *data, size_t size, const char *name,
                  int prefixMatch, char *actualName, size_t nameCap,
                  size_t *outLen)
{
    struct match_ctx m = { name, prefixMatch };
    Entry e; memset(&e, 0, sizeof(e));
    if (walk_entries(data, size, match_cb, &m, &e)) return NULL;

    if (actualName && nameCap) {
        size_t l = e.nameLen < nameCap - 1 ? e.nameLen : nameCap - 1;
        memcpy(actualName, e.name, l); actualName[l] = 0;
    }

    uint32_t csize;
    const uint8_t *src = entry_data(data, size, &e, &csize);
    if (!src) return NULL;

    uint8_t *out;
    if (e.method == 0) {                       /* stored */
        out = (uint8_t *)malloc(csize ? csize : 1);
        if (!out) return NULL;
        memcpy(out, src, csize);
        if (outLen) *outLen = csize;
        return out;
    }
    if (e.method != 8) return NULL;            /* 仅支持 deflate */

    /* deflate:按 usize 预估,不足时翻倍重试 */
    size_t cap = e.usize ? (size_t)e.usize + 64 : 65536;
    for (;;) {
        out = (uint8_t *)malloc(cap);
        if (!out) return NULL;
        size_t used = 0;
        int r = inflate_raw(src, csize, out, cap, &used);
        if (r == INFLATE_OK) {
            if (outLen) *outLen = used;
            return out;
        }
        if (r == INFLATE_NEED_MEM) {
            free(out);
            if (cap > (size_t)256 * 1024 * 1024) return NULL;
            cap *= 2;
            continue;
        }
        free(out);
        return NULL;
    }
}
