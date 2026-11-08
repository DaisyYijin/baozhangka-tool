/* ============================================================
 * xls.c - Excel 97-2003 (.xls, BIFF8) 只读解析
 * 零依赖自研:OLE2 复合文档容器(扇区/FAT/MiniFAT/目录) →
 * Workbook 流 → 第一个工作表的表头与数据单元格。
 * 边界:BIFF5(Excel 95 及更老)返回 -3;只读第一个工作表;
 *       8-bit ANSI 串经 gbk 回调解码(与 csv_parse 同签名,Linux 传 NULL 降级 Latin1)。
 * ============================================================ */
#include "sheet.h"
#include "u8.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

#ifndef AC_TEXT_MAX
#define AC_TEXT_MAX 8192
#endif

static unsigned long rd32(const unsigned char *p)
{
    return (unsigned long)p[0] | ((unsigned long)p[1] << 8) |
           ((unsigned long)p[2] << 16) | ((unsigned long)p[3] << 24);
}
static unsigned rd16(const unsigned char *p)
{
    return (unsigned)p[0] | ((unsigned)p[1] << 8);
}
static unsigned long long rd64(const unsigned char *p)
{
    return (unsigned long long)rd32(p) | ((unsigned long long)rd32(p + 4) << 32);
}

/* ================= OLE2 复合文档容器 ================= */

#define FREESECT   0xFFFFFFFFUL
#define ENDOFCHAIN 0xFFFFFFFEUL

typedef struct {
    const unsigned char *d;
    size_t n;
    unsigned secSize, miniSize;
    unsigned long *fat;  unsigned long nFat;
    unsigned long *mfat; unsigned long nMfat;
} Ole;

static size_t sec_off(const Ole *o, unsigned long s)
{
    return (size_t)o->secSize + (size_t)s * o->secSize;
}

static int ole_load_fat(Ole *o)
{
    const unsigned char *h = o->d;
    if (o->n < 512) return -1;
    unsigned shift = rd16(h + 0x1E);
    if (shift != 9 && shift != 12) return -1;
    o->secSize  = 1u << shift;
    o->miniSize = 1u << rd16(h + 0x20);
    if (o->miniSize != 64) return -1;
    unsigned long nfatSect = rd32(h + 0x2C);   /* FAT 扇区数 */
    if (!nfatSect || nfatSect > 0x100000UL) return -1;

    /* FAT 扇区号列表:头内 DIFAT[109] + DIFAT 链 */
    unsigned cap = (unsigned)nfatSect + 128;
    unsigned long *fats = (unsigned long *)malloc(cap * sizeof *fats);
    if (!fats) return -1;
    unsigned nf = 0;
    for (int i = 0; i < 109 && nf < nfatSect && nf < cap; i++) {
        unsigned long s = rd32(h + 0x4C + (unsigned)i * 4);
        if (s != FREESECT && s != ENDOFCHAIN && s != 0xFFFFFFFDUL && s != 0xFFFFFFFCUL)
            fats[nf++] = s;
    }
    unsigned long dif = rd32(h + 0x44);        /* DIFAT 链首扇区 */
    unsigned guard = 0;
    while (dif != ENDOFCHAIN && dif < 0xFFFFFFFCUL && guard++ < 65536) {
        size_t off = sec_off(o, dif);
        if (off + o->secSize > o->n) break;
        const unsigned char *sp = o->d + off;
        unsigned ent = o->secSize / 4;
        for (unsigned i = 0; i + 1 < ent && nf < nfatSect && nf < cap; i++) {
            unsigned long s = rd32(sp + i * 4);
            if (s < 0xFFFFFFFCUL) fats[nf++] = s;
        }
        dif = rd32(sp + (ent - 1) * 4);
    }
    if (!nf) { free(fats); return -1; }

    /* 展平 FAT */
    unsigned long total = (unsigned long)nf * (o->secSize / 4);
    o->fat = (unsigned long *)malloc(total * sizeof *o->fat);
    if (!o->fat) { free(fats); return -1; }
    memset(o->fat, 0xFF, total * sizeof *o->fat);
    o->nFat = 0;
    for (unsigned i = 0; i < nf; i++) {
        size_t off = sec_off(o, fats[i]);
        if (off + o->secSize > o->n) continue;
        for (unsigned j = 0; j < o->secSize / 4; j++)
            o->fat[o->nFat++] = rd32(o->d + off + j * 4);
    }
    free(fats);
    if (!o->nFat) return -1;

    /* MiniFAT 链 */
    unsigned long m0 = rd32(h + 0x3C);         /* 首 MiniFAT 扇区 */
    if (m0 != ENDOFCHAIN && m0 < o->nFat) {
        unsigned long capM = 256;
        o->mfat = (unsigned long *)malloc(capM * sizeof *o->mfat);
        unsigned long s = m0;
        guard = 0;
        while (s != ENDOFCHAIN && s < o->nFat && guard++ < 65536) {
            size_t off = sec_off(o, s);
            if (off + o->secSize > o->n) break;
            if (o->nMfat + o->secSize / 4 > capM) {
                capM *= 2;
                o->mfat = (unsigned long *)realloc(o->mfat, capM * sizeof *o->mfat);
                if (!o->mfat) { o->nMfat = 0; break; }
            }
            for (unsigned j = 0; j < o->secSize / 4; j++)
                o->mfat[o->nMfat++] = rd32(o->d + off + j * 4);
            s = o->fat[s];
        }
    }
    return 0;
}

/* 沿 FAT 链读取(已知长度);返回 malloc 缓冲(可能比 len 长,按扇区对齐) */
static unsigned char *ole_read(Ole *o, unsigned long start, unsigned long len,
                               unsigned long *outLen)
{
    if (start == ENDOFCHAIN || start >= o->nFat || !len) return NULL;
    unsigned nsec = (unsigned)((len + o->secSize - 1) / o->secSize);
    unsigned char *buf = (unsigned char *)malloc((size_t)nsec * o->secSize);
    if (!buf) return NULL;
    unsigned long got = 0, s = start, guard = 0;
    while (s != ENDOFCHAIN && s < o->nFat && got < nsec && guard++ < (1UL << 20)) {
        size_t off = sec_off(o, s);
        if (off + o->secSize > o->n) break;
        memcpy(buf + (size_t)got * o->secSize, o->d + off, o->secSize);
        got++;
        s = o->fat[s];
    }
    if (!got) { free(buf); return NULL; }
    if (outLen) *outLen = got * o->secSize;
    return buf;
}

/* mini 链读取(流 <4096 字节):从根项 mini stream 大缓冲切 64 字节小扇区 */
static unsigned char *ole_read_mini(Ole *o, unsigned long start, unsigned long len,
                                    const unsigned char *mini, unsigned long miniCap)
{
    if (!o->mfat || !o->nMfat || start >= o->nMfat || !len || !mini) return NULL;
    unsigned nsec = (unsigned)((len + o->miniSize - 1) / o->miniSize);
    unsigned char *buf = (unsigned char *)malloc((size_t)nsec * o->miniSize);
    if (!buf) return NULL;
    unsigned long got = 0, s = start, guard = 0;
    while (s != ENDOFCHAIN && s < o->nMfat && got < nsec && guard++ < (1UL << 20)) {
        if ((s + 1) * o->miniSize > miniCap) break;
        memcpy(buf + (size_t)got * o->miniSize, mini + (size_t)s * o->miniSize,
               o->miniSize);
        got++;
        s = o->mfat[s];
    }
    if (!got) { free(buf); return NULL; }
    return buf;
}

/* 目录项名字(UTF-16LE)与宽字符比较 */
static int name_eq_utf16(const unsigned char *entry, const wchar_t *want)
{
    unsigned cb = rd16(entry + 0x40);
    if (cb < 4) return 0;
    unsigned cn = cb / 2 - 1;             /* 去 NUL */
    unsigned wl = 0;
    while (want[wl]) wl++;
    if (cn != wl) return 0;
    for (unsigned i = 0; i < wl; i++)
        if (rd16(entry + i * 2) != (unsigned)want[i]) return 0;
    return 1;
}

/* 在目录树里找名字为 name 的流;返回目录项指针或 NULL */
static int ole_find_stream(Ole *o, const wchar_t *name,
                           unsigned long *start, unsigned long *len)
{
    unsigned long dlen = 0;
    unsigned char *dir = ole_read(o, rd32(o->d + 0x30), 0x1000000UL, &dlen);
    if (!dir) return -1;
    int ok = 0;
    for (unsigned long off = 0; off + 128 <= dlen; off += 128) {
        const unsigned char *e = dir + off;
        if (e[66] == 2 && name_eq_utf16(e, name)) {
            *start = rd32(e + 0x74);
            *len   = (unsigned long)rd64(e + 0x78);
            ok = 1;
            break;
        }
    }
    free(dir);
    return ok ? 0 : -1;
}

/* ================= BIFF8 Workbook 流 ================= */

typedef struct {
    const unsigned char *p;
    unsigned len;
} Seg;                                     /* SST+CONTINUE 段 */

typedef struct {
    const Seg *segs; unsigned ns;
    unsigned si;                            /* 当前段 */
    unsigned pos;                           /* 段内偏移 */
} Rdr;

static int rdr_ok(Rdr *r, unsigned need)
{
    if (r->si >= r->ns) return 0;
    if (r->pos + need <= r->segs[r->si].len) return 1;
    return 0;
}

/* 读 1 字节;跨段失败返回 -1(调用方先确保段内足够) */
static int rd8r(Rdr *r)
{
    if (!rdr_ok(r, 1)) return -1;
    return r->segs[r->si].p[r->pos++];
}
static int rd16r(Rdr *r, unsigned *out)
{
    if (!rdr_ok(r, 2)) return -1;
    *out = rd16(r->segs[r->si].p + r->pos);
    r->pos += 2;
    return 0;
}
static int rd32r(Rdr *r, unsigned long *out)
{
    if (!rdr_ok(r, 4)) return -1;
    *out = rd32(r->segs[r->si].p + r->pos);
    r->pos += 4;
    return 0;
}
static void skipr(Rdr *r, unsigned n)
{
    while (n && r->si < r->ns) {
        unsigned rem = r->segs[r->si].len - r->pos;
        if (n < rem) { r->pos += n; break; }
        n -= rem;
        r->si++;
        r->pos = 0;
    }
}

/* 读一个 SST 字符串(cch/flags/字符/rich/ext),跨段续读;
   成功时 *out 为 malloc 的 NUL 终止 UTF-8 */
static int sst_read_str(Rdr *r, char *(*gbk)(const char *, size_t), char **out)
{
    unsigned cch = 0, flags = 0;
    if (rd16r(r, &cch)) return -1;
    flags = (unsigned)rd8r(r);
    if ((int)flags < 0) return -1;
    unsigned highByte = flags & 1;
    unsigned cRun = 0;
    unsigned long cbExt = 0;
    unsigned hasRich = (flags >> 2) & 1, hasExt = (flags >> 3) & 1;
    if (hasRich) { if (rd16r(r, &cRun)) return -1; }
    if (hasExt)  { if (rd32r(r, &cbExt)) return -1; }
    if (cch > 32760) return -1;

    wchar_t *w = (wchar_t *)malloc(((size_t)cch + 1) * sizeof *w);
    if (!w) return -1;
    unsigned got = 0;
    unsigned char *raw8 = NULL;            /* 8-bit 原始字节(可能 GBK) */
    unsigned n8 = 0;
    if (!highByte) raw8 = (unsigned char *)malloc(cch + 1);

    while (got < cch) {
        if (r->si >= r->ns) break;
        /* 段尾:下一段开头是新 flags 字节(可能切换宽度) */
        if (r->pos >= r->segs[r->si].len) {
            r->si++;
            r->pos = 0;
            if (r->si >= r->ns) break;
            int nf = rd8r(r);
            if (nf < 0) break;
            highByte = (unsigned)nf & 1;
            if (!highByte && !raw8) { /* 宽度切窄:转存已有的到 w */ }
            continue;
        }
        unsigned rem = r->segs[r->si].len - r->pos;
        if (highByte) {
            unsigned can = rem / 2;
            if (can > cch - got) can = cch - got;
            for (unsigned i = 0; i < can; i++) {
                w[got++] = (wchar_t)rd16(r->segs[r->si].p + r->pos);
                r->pos += 2;
            }
            if (rem >= 2 && got < cch) continue;   /* 段内还有 */
            if (got < cch) { /* 段尾奇字节/耗尽 */ r->pos = r->segs[r->si].len; continue; }
        } else {
            unsigned can = rem;
            if (can > cch - got) can = cch - got;
            memcpy(raw8 + n8, r->segs[r->si].p + r->pos, can);
            n8 += can;
            got += can;
            r->pos += can;
        }
    }
    /* rich/ext 尾数据跳过 */
    skipr(r, hasRich ? cRun * 4 : 0);
    skipr(r, hasExt ? cbExt : 0);

    char *u8s = NULL;
    if (!highByte && raw8) {
        raw8[n8] = 0;
        int hasHigh = 0;
        for (unsigned i = 0; i < n8; i++) if (raw8[i] >= 0x80) { hasHigh = 1; break; }
        if (hasHigh && gbk) {
            char *g = gbk((const char *)raw8, n8);
            if (g) u8s = g;
        }
        if (!u8s) {
            /* Latin1/ASCII 逐字 */
            for (unsigned i = 0; i < n8; i++) w[i] = (wchar_t)raw8[i];
            w[n8] = 0;
            char *b2 = (char *)malloc((size_t)n8 * 3 + 8);
            if (b2) { wcs_to_u8(w, b2, (int)((size_t)n8 * 3 + 7)); u8s = b2; }
        }
        free(raw8);
    } else {
        w[got < cch ? got : cch] = 0;
        char *b2 = (char *)malloc((size_t)cch * 3 + 8);
        if (b2) { wcs_to_u8(w, b2, (int)((size_t)cch * 3 + 7)); u8s = b2; }
    }
    free(w);
    if (!u8s) return -1;
    *out = u8s;
    return 0;
}

/* 单元格写入(自动扩容行列,旧数据保留) */
static void cell_set(Sheet *s, unsigned r, unsigned c, const char *utf8)
{
    if (r >= 0x100000 || c >= 4096) return;
    unsigned orow = s->rows > 0 ? (unsigned)s->rows : 0;
    unsigned ocol = s->cols > 0 ? (unsigned)s->cols : 0;
    unsigned nr = s->rows > (int)r ? orow : r + 1;
    unsigned nc = s->cols > (int)c ? ocol : c + 1;
    if (!s->cells) {
        s->cells = (char ***)calloc(nr, sizeof(char **));
    } else if (nr > orow) {
        s->cells = (char ***)realloc(s->cells, nr * sizeof(char **));
        memset(s->cells + orow, 0, (nr - orow) * sizeof(char **));
    }
    if (nc > ocol) {
        for (unsigned i = 0; i < nr; i++)
            if (s->cells[i]) {
                s->cells[i] = (char **)realloc(s->cells[i], nc * sizeof(char *));
                memset(s->cells[i] + ocol, 0, (nc - ocol) * sizeof(char *));
            }
    }
    s->rows = (int)nr;
    s->cols = (int)nc;
    if (!s->cells[r])
        s->cells[r] = (char **)calloc(nc, sizeof(char *));
    free(s->cells[r][c]);
    s->cells[r][c] = strdup(utf8);
}

/* RK 压缩数值 → double(实证 Excel COM 写法:bit0=0 为 IEEE double 高 30 位,
   bit0=1 为 30 位有符号整数;bit1=1 时再除以 100) */
static double rk_val(unsigned long rk)
{
    double v;
    if (rk & 1) {
        long iv = (long)(rk & 0xFFFFFFFCUL);
        v = (double)(iv >> 2);            /* 30 位有符号整数,算术移位保号 */
    } else {
        unsigned long long bits = ((unsigned long long)(rk & 0xFFFFFFFCUL)) << 32;
        memcpy(&v, &bits, 8);             /* double 高 32 位(低 34 位为 0) */
    }
    if (rk & 2) v /= 100.0;
    return v;
}

/* ================= 对外入口 ================= */

int xls_parse(const unsigned char *data, size_t len,
              char *(*gbk)(const char *, size_t), Sheet *out)
{
    if (!data || len < 512 || !out) return -1;
    if (data[0] != 0xD0 || data[1] != 0xCF || data[2] != 0x11 || data[3] != 0xE0)
        return -1;
    memset(out, 0, sizeof *out);

    Ole o;
    memset(&o, 0, sizeof o);
    o.d = data;
    o.n = len;
    if (ole_load_fat(&o)) { free(o.fat); free(o.mfat); return -1; }

    /* Workbook 流(首选 Workbook,退化 Book) */
    unsigned long ws = 0, wl = 0;
    if (ole_find_stream(&o, L"Workbook", &ws, &wl) &&
        ole_find_stream(&o, L"Book", &ws, &wl)) {
        free(o.fat); free(o.mfat); return -2;
    }
    unsigned long wbLen = 0;
    unsigned char *wb = NULL;
    if (wl >= 4096) {
        wb = ole_read(&o, ws, wl, &wbLen);
    } else {
        /* mini stream:根目录项(第一个,类型 5)承载 */
        unsigned long dl = 0;
        unsigned char *dir = ole_read(&o, rd32(o.d + 0x30), 0x1000000UL, &dl);
        if (dir && dl >= 128) {
            unsigned long ms = rd32(dir + 0x74);
            unsigned long ml = (unsigned long)rd64(dir + 0x78);
            unsigned long msl = 0;
            unsigned char *mini = ole_read(&o, ms, ml, &msl);
            if (mini) {
                wb = ole_read_mini(&o, ws, wl, mini, msl);
                wbLen = wl;
                free(mini);
            }
        }
        free(dir);
    }
    free(o.fat);
    free(o.mfat);
    if (!wb) return -2;

    /* ---- BIFF 记录扫描:globals(SST/BoundSheet) + 第一个 sheet ---- */
    int rc = -3;
    wchar_t **sst = NULL;
    unsigned nSst = 0;
    unsigned long firstSheetPos = 0;
    int haveSheet = 0;
    unsigned codepage = 1252;

    unsigned long pos = 0;
    while (pos + 4 <= wbLen) {
        unsigned id = rd16(wb + pos);
        unsigned rl = rd16(wb + pos + 2);
        const unsigned char *dp = wb + pos + 4;
        if (pos + 4 + (unsigned long)rl > wbLen) break;
        pos += 4 + rl;

        if (id == 0x0809) {                /* BOF:检查 BIFF 版本 */
            unsigned ver = rd16(dp);
            if (ver < 0x0600) goto done;   /* BIFF5 及更老:不支持 */
        } else if (id == 0x0042 && rl >= 2) {
            codepage = rd16(dp);
        } else if (id == 0x0085) {         /* BoundSheet:取第一个可见表 */
            if (rl >= 8 && !haveSheet) {
                unsigned state = dp[4];
                if (state == 0) {
                    firstSheetPos = rd32(dp);
                    haveSheet = 1;
                }
            }
        } else if (id == 0x00FC) {         /* SST(+CONTINUE) */
            /* 收集段 */
            unsigned capS = 8;
            Seg *segs = (Seg *)malloc(capS * sizeof *segs);
            unsigned ns = 0;
            segs[ns].p = dp + 8;           /* 跳过 total/unique 计数 */
            segs[ns].len = rl >= 8 ? rl - 8 : 0;
            ns++;
            unsigned long p2 = pos;
            while (p2 + 4 <= wbLen) {
                unsigned id2 = rd16(wb + p2);
                unsigned rl2 = rd16(wb + p2 + 2);
                if (id2 != 0x003C) break;  /* 只跟 CONTINUE */
                if (p2 + 4 + rl2 > wbLen) rl2 = (unsigned)(wbLen - p2 - 4);
                if (ns == capS) {
                    capS *= 2;
                    segs = (Seg *)realloc(segs, capS * sizeof *segs);
                }
                segs[ns].p = wb + p2 + 4;
                segs[ns].len = rl2;
                ns++;
                p2 += 4 + rl2;
            }
            unsigned unique = rd32(dp + 4);
            if (unique > 0x100000UL) unique = 0x100000UL;
            sst = (wchar_t **)malloc((unique ? unique : 1) * sizeof *sst);
            Rdr r;
            memset(&r, 0, sizeof r);
            r.segs = segs;
            r.ns = ns;
            for (unsigned i = 0; i < unique; i++) {
                char *s8 = NULL;
                if (sst_read_str(&r, gbk, &s8)) break;
                /* 转 wchar 存(单元格侧统一 wchar→按需 utf8) */
                wchar_t *wc = (wchar_t *)malloc(strlen(s8) * 4 + 8);
                if (wc) { u8_to_wcs(s8, wc, (int)(strlen(s8) * 4 + 7)); }
                free(s8);
                sst[nSst++] = wc;
                if (wc && !wc[0]) { free(wc); sst[nSst - 1] = NULL; }
            }
            pos = p2;                      /* 主循环跳过 CONTINUE */
            free(segs);
        } else if (id == 0x000A && haveSheet) {
            break;                          /* globals EOF */
        }
    }
    if (!haveSheet) goto done;

    /* ---- 第一个工作表子流 ---- */
    {
        unsigned long p = firstSheetPos;
        unsigned pendingRow = 0, pendingCol = 0;   /* FORMULA 字符串结果 */
        int pendStr = 0;
        while (p + 4 <= wbLen) {
            unsigned id = rd16(wb + p);
            unsigned rl = rd16(wb + p + 2);
            const unsigned char *dp = wb + p + 4;
            if (p + 4 + (unsigned long)rl > wbLen) break;
            p += 4 + rl;

            unsigned row, col;
            char buf[64];
            switch (id) {
            case 0x000A:                   /* EOF:第一个 sheet 结束 */
                goto sheetDone;
            case 0x00FD:                   /* LABELSST */
                if (rl < 10) break;
                row = rd16(dp); col = rd16(dp + 2);
                {
                    unsigned long isst = rd32(dp + 6);
                    if (isst < nSst && sst[isst]) {
                        char u8b[AC_TEXT_MAX];
                        wcs_to_u8(sst[isst], u8b, AC_TEXT_MAX - 1);
                        cell_set(out, row, col, u8b);
                    }
                }
                break;
            case 0x0203:                   /* NUMBER */
                if (rl < 14) break;
                row = rd16(dp); col = rd16(dp + 2);
                {
                    double v;
                    memcpy(&v, dp + 6, 8);
                    snprintf(buf, sizeof buf, "%.15g", v);
                    cell_set(out, row, col, buf);
                }
                break;
            case 0x027E:                   /* RK */
                if (rl < 10) break;
                row = rd16(dp); col = rd16(dp + 2);
                snprintf(buf, sizeof buf, "%.15g", rk_val(rd32(dp + 6)));
                cell_set(out, row, col, buf);
                break;
            case 0x00BD:                   /* MULRK */
                if (rl < 6) break;
                row = rd16(dp);
                {
                    unsigned fc = rd16(dp + 2);
                    unsigned nRk = (rl - 6) / 6;
                    for (unsigned i = 0; i < nRk; i++) {
                        snprintf(buf, sizeof buf, "%.15g",
                                 rk_val(rd32(dp + 4 + i * 6 + 2)));
                        cell_set(out, row, fc + i, buf);
                    }
                }
                break;
            case 0x0006: {                 /* FORMULA:读缓存结果 */
                if (rl < 22) break;
                row = rd16(dp); col = rd16(dp + 2);
                if (rd16(dp + 12) == 0xFFFF) {
                    unsigned t = rd16(dp + 10);
                    if (t == 1) { pendingRow = row; pendingCol = col; pendStr = 1; }
                    /* 布尔/错误:留空 */
                } else {
                    double v;
                    memcpy(&v, dp + 6, 8);
                    snprintf(buf, sizeof buf, "%.15g", v);
                    cell_set(out, row, col, buf);
                }
                break;
            }
            case 0x0207:                   /* STRING(FORMULA 字符串结果) */
                if (pendStr && rl >= 3) {
                    unsigned cch = rd16(dp);
                    unsigned fl = dp[2];
                    char u8b[AC_TEXT_MAX];
                    wchar_t tmp[512];
                    unsigned nn = cch < 500 ? cch : 500;
                    for (unsigned i = 0; i < nn; i++)
                        tmp[i] = fl & 1 ? (wchar_t)rd16(dp + 3 + i * 2)
                                        : (wchar_t)dp[3 + i];
                    tmp[nn] = 0;
                    wcs_to_u8(tmp, u8b, AC_TEXT_MAX - 1);
                    cell_set(out, pendingRow, pendingCol, u8b);
                    pendStr = 0;
                }
                break;
            default:
                break;
            }
        }
    sheetDone:;
        rc = out->rows > 0 ? 0 : -4;
    }

done:
    if (sst) {
        for (unsigned i = 0; i < nSst; i++) free(sst[i]);
        free(sst);
    }
    free(wb);
    (void)codepage;
    return rc;
}
