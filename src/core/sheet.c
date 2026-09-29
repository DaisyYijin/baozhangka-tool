/* ============================================================
 * sheet.c - xlsx(OOXML)与 CSV 解析
 * xlsx = zip,内为 XML。这里做有针对性的 XML 扫描,
 * 不引入完整的 XML 解析器,保持零依赖。
 * ============================================================ */
#include "sheet.h"
#include "zip.h"
#include "u8.h"
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdio.h>

#define AC_CELL_MAX 8192

/* ---------------- 基础工具 ---------------- */

static char *sdup(const char *s, size_t n)
{
    char *p = (char *)malloc(n + 1);
    if (!p) return NULL;
    memcpy(p, s, n);
    p[n] = 0;
    return p;
}

static void sheet_reserve(Sheet *s, int row, int col)
{
    if (row >= s->rows) {
        int nr = row + 1;
        char ***nc = (char ***)realloc(s->cells, (size_t)nr * sizeof(char **));
        if (!nc) return;
        s->cells = nc;
        for (int r = s->rows; r < nr; r++) s->cells[r] = NULL;
        s->rows = nr;
    }
    if (col >= s->cols) {
        int nc2 = col + 1;
        for (int r = 0; r < s->rows; r++) {
            if (s->cells[r]) {
                char **row2 = (char **)realloc(s->cells[r], (size_t)nc2 * sizeof(char *));
                if (!row2) continue;
                s->cells[r] = row2;
                for (int c = s->cols; c < nc2; c++) s->cells[r][c] = NULL;
            }
        }
        s->cols = nc2;
    }
    if (!s->cells[row]) {
        s->cells[row] = (char **)calloc((size_t)s->cols, sizeof(char *));
    }
}

static void sheet_set(Sheet *s, int row, int col, const char *utf8)
{
    if (row < 0 || col < 0 || row > 1000000 || col > 4096) return; /* 防御 */
    sheet_reserve(s, row, col);
    if (!s->cells[row]) return;
    free(s->cells[row][col]);
    s->cells[row][col] = sdup(utf8, strlen(utf8));
}

void sheet_free(Sheet *s)
{
    if (!s || !s->cells) return;
    for (int r = 0; r < s->rows; r++) {
        if (s->cells[r]) {
            for (int c = 0; c < s->cols; c++) free(s->cells[r][c]);
            free(s->cells[r]);
        }
    }
    free(s->cells);
    memset(s, 0, sizeof(*s));
}

void sheet_trim_empty(Sheet *s)
{
    if (!s->cells) return;
    while (s->rows > 0) {                       /* 尾部空行 */
        char **row = s->cells[s->rows - 1];
        int has = 0;
        if (row) for (int c = 0; c < s->cols; c++) if (row[c] && row[c][0]) { has = 1; break; }
        if (has) break;
        if (row) { for (int c = 0; c < s->cols; c++) free(row[c]); free(row); }
        s->cells[s->rows - 1] = NULL;
        s->rows--;
    }
    while (s->cols > 0) {                       /* 尾部空列 */
        int has = 0;
        for (int r = 0; r < s->rows; r++)
            if (s->cells[r] && s->cells[r][s->cols - 1] && s->cells[r][s->cols - 1][0]) { has = 1; break; }
        if (has) break;
        for (int r = 0; r < s->rows; r++)
            if (s->cells[r]) { free(s->cells[r][s->cols - 1]); s->cells[r][s->cols - 1] = NULL; }
        s->cols--;
    }
}

/* ---------------- XML 扫描工具 ---------------- */

/* 查找下一个元素标签(跳过 <!-- 和 <?) */
static const char *find_tag(const char *p, const char *end)
{
    while (p < end) {
        if (*p == '<' && p + 1 < end && p[1] != '!' && p[1] != '?') return p;
        p++;
    }
    return NULL;
}

static const char *after_tag_open(const char *p, const char *end)
{
    while (p < end && *p != '>') p++;
    return (p < end) ? p + 1 : NULL;
}

static int tag_is_close(const char *p, const char *end)
{
    return (p + 1 < end && p[1] == '/');
}

static int tag_is_selfclose(const char *p, const char *end)
{
    const char *q = p;
    while (q < end && *q != '>') q++;
    return (q > p && q[-1] == '/');
}

static int tagname_eq(const char *p, const char *end, const char *name)
{
    size_t n = strlen(name);
    if ((size_t)(end - p) <= n) return 0;
    if (memcmp(p, name, n) != 0) return 0;
    char c = p[n];
    return c == ' ' || c == '>' || c == '/' || c == '\t' || c == '\r' || c == '\n';
}

/* 在标签头中提取属性值区间 */
static int get_attr(const char *tagStart, const char *tagEnd,
                    const char *attr, const char **vStart, const char **vEnd)
{
    size_t alen = strlen(attr);
    for (const char *p = tagStart; p + alen + 2 < tagEnd; p++) {
        if ((p == tagStart || p[-1] == ' ' || p[-1] == '\t') &&
            memcmp(p, attr, alen) == 0 && p[alen] == '=' && p[alen + 1] == '"') {
            const char *v = p + alen + 2;
            const char *q = v;
            while (q < tagEnd && *q != '"') q++;
            if (q < tagEnd) { *vStart = v; *vEnd = q; return 1; }
        }
    }
    return 0;
}

/* XML 实体解码(in-place,长度只减不增) */
static void xml_unescape(char *s, size_t n)
{
    size_t r = 0, w = 0;
    while (r < n) {
        if (s[r] == '&') {
            if (n - r >= 5 && memcmp(s + r, "&amp;", 5) == 0)  { s[w++] = '&';  r += 5; continue; }
            if (n - r >= 4 && memcmp(s + r, "&lt;", 4) == 0)   { s[w++] = '<';  r += 4; continue; }
            if (n - r >= 4 && memcmp(s + r, "&gt;", 4) == 0)   { s[w++] = '>';  r += 4; continue; }
            if (n - r >= 6 && memcmp(s + r, "&quot;", 6) == 0) { s[w++] = '"';  r += 6; continue; }
            if (n - r >= 6 && memcmp(s + r, "&apos;", 6) == 0) { s[w++] = '\''; r += 6; continue; }
            if (n - r >= 3 && s[r + 1] == '#') {
                unsigned cp = 0; int k = (int)r + 2, hex = 0;
                if (s[k] == 'x' || s[k] == 'X') { hex = 1; k++; }
                while (k < (int)n && s[k] != ';') {
                    char c = s[k];
                    int d = (c >= '0' && c <= '9') ? c - '0'
                          : (hex && c >= 'a' && c <= 'f') ? c - 'a' + 10
                          : (hex && c >= 'A' && c <= 'F') ? c - 'A' + 10 : -1;
                    if (d < 0) break;
                    cp = cp * (hex ? 16u : 10u) + (unsigned)d;
                    k++;
                }
                if (k < (int)n && s[k] == ';' && cp > 0) {
                    if (cp < 0x80) {
                        s[w++] = (char)cp;
                    } else if (cp < 0x800) {
                        s[w++] = (char)(0xC0 | (cp >> 6));
                        s[w++] = (char)(0x80 | (cp & 0x3F));
                    } else if (cp < 0x10000) {
                        s[w++] = (char)(0xE0 | (cp >> 12));
                        s[w++] = (char)(0x80 | ((cp >> 6) & 0x3F));
                        s[w++] = (char)(0x80 | (cp & 0x3F));
                    } else {
                        s[w++] = (char)(0xF0 | (cp >> 18));
                        s[w++] = (char)(0x80 | ((cp >> 12) & 0x3F));
                        s[w++] = (char)(0x80 | ((cp >> 6) & 0x3F));
                        s[w++] = (char)(0x80 | (cp & 0x3F));
                    }
                    r = (size_t)k + 1;
                    continue;
                }
            }
        }
        s[w++] = s[r++];
    }
    s[w] = 0;
}

/* 在 [body,close) 中找 <name>..</name> 的正文,成功返回1 */
static int find_body(const char *body, const char *close, const char *name,
                     const char **bOut, const char **eOut)
{
    const char *q = body;
    while (q < close) {
        q = find_tag(q, close);
        if (!q) return 0;
        if (!tag_is_close(q, close) && tagname_eq(q + 1, close, name)) {
            const char *tb = after_tag_open(q, close);
            const char *tc = q + 1;
            while (tc < close) {
                tc = find_tag(tc, close);
                if (!tc) { tc = close; break; }
                if (tag_is_close(tc, close) && tagname_eq(tc + 2, close, name)) break;
                tc++;
            }
            if (tb && tc >= tb) { *bOut = tb; *eOut = tc; return 1; }
        }
        q++;
    }
    return 0;
}

/* ---------------- sharedStrings.xml ---------------- */

struct ss_ctx {
    char **items;
    int    count, cap;
};

static void ss_add(struct ss_ctx *ctx, const char *text, size_t n)
{
    if (ctx->count == ctx->cap) {
        int nc = ctx->cap ? ctx->cap * 2 : 64;
        char **ni = (char **)realloc(ctx->items, (size_t)nc * sizeof(char *));
        if (!ni) return;
        ctx->items = ni;
        ctx->cap = nc;
    }
    char *s = sdup(text, n);
    if (!s) return;
    xml_unescape(s, n);
    ctx->items[ctx->count++] = s;
}

static void parse_shared_strings(const char *xml, size_t len, struct ss_ctx *ctx)
{
    const char *p = xml, *end = xml + len;
    while (p < end && (p = find_tag(p, end)) != NULL) {
        if (!tag_is_close(p, end) && tagname_eq(p + 1, end, "si")) {
            /* 找配对的 </si> */
            const char *siEnd = p + 1;
            while (siEnd < end) {
                siEnd = find_tag(siEnd, end);
                if (!siEnd) { siEnd = end; break; }
                if (tag_is_close(siEnd, end) && tagname_eq(siEnd + 2, end, "si")) break;
                siEnd++;
            }
            if (siEnd >= end) siEnd = end;

            /* 在 [p, siEnd) 中收集所有 <t>..</t> 拼接(富文本 run) */
            char *buf = (char *)malloc((size_t)(siEnd - p) + 2);
            if (buf) {
                size_t wl = 0;
                const char *q = p;
                while (q < siEnd) {
                    q = find_tag(q, siEnd);
                    if (!q) break;
                    if (!tag_is_close(q, siEnd) && tagname_eq(q + 1, siEnd, "t")) {
                        const char *tb = after_tag_open(q, siEnd);
                        const char *te = q + 1;
                        while (te < siEnd) {
                            te = find_tag(te, siEnd);
                            if (!te) { te = siEnd; break; }
                            if (tag_is_close(te, siEnd) && tagname_eq(te + 2, siEnd, "t")) break;
                            te++;
                        }
                        if (tb && te > tb) {
                            size_t n = (size_t)(te - tb);
                            memcpy(buf + wl, tb, n);
                            wl += n;
                        }
                        q = te;
                    } else {
                        q++;
                    }
                }
                ss_add(ctx, buf, wl);
                free(buf);
            }
            p = siEnd;
        }
        p++;
    }
}

/* ---------------- worksheet XML ---------------- */

static int ref_to_col(const char *r, size_t n)
{
    int col = 0;
    for (size_t i = 0; i < n; i++) {
        char c = r[i];
        if (c >= 'A' && c <= 'Z') col = col * 26 + (c - 'A' + 1);
        else if (c >= 'a' && c <= 'z') col = col * 26 + (c - 'a' + 1);
        else break;
    }
    return col - 1;
}

static int ref_to_row(const char *r, size_t n)
{
    int row = 0; size_t i = 0;
    while (i < n && !(r[i] >= '0' && r[i] <= '9')) i++;
    for (; i < n && r[i] >= '0' && r[i] <= '9'; i++)
        row = row * 10 + (r[i] - '0');
    return row - 1;
}

static void parse_sheet_xml(const char *xml, size_t len,
                            const struct ss_ctx *ss, Sheet *out)
{
    const char *p = xml, *end = xml + len;
    while (p < end && (p = find_tag(p, end)) != NULL) {
        if (!tag_is_close(p, end) && tagname_eq(p + 1, end, "c")) {
            const char *tagEnd = p;
            while (tagEnd < end && *tagEnd != '>') tagEnd++;
            const char *body = (tagEnd < end) ? tagEnd + 1 : end;
            const char *close = body;
            if (!tag_is_selfclose(p, end)) {
                while (close < end) {
                    close = find_tag(close, end);
                    if (!close) { close = end; break; }
                    if (tag_is_close(close, end) && tagname_eq(close + 2, end, "c")) break;
                    close++;
                }
            }

            int row = -1, col = -1, shared = 0, inlineStr = 0;
            const char *vs, *ve;
            if (get_attr(p, tagEnd, "r", &vs, &ve)) {
                col = ref_to_col(vs, (size_t)(ve - vs));
                row = ref_to_row(vs, (size_t)(ve - vs));
            }
            if (get_attr(p, tagEnd, "t", &vs, &ve)) {
                if (ve - vs == 1 && vs[0] == 's') shared = 1;
                else if (ve - vs == 9 && memcmp(vs, "inlineStr", 9) == 0) inlineStr = 1;
            }

            if (row >= 0 && col >= 0) {
                char buf[AC_CELL_MAX];
                if (inlineStr) {
                    const char *tb, *te;
                    if (find_body(body, close, "t", &tb, &te)) {
                        size_t n = (size_t)(te - tb);
                        if (n < sizeof(buf)) {
                            memcpy(buf, tb, n);
                            buf[n] = 0;
                            xml_unescape(buf, n);
                            sheet_set(out, row, col, buf);
                        }
                    }
                } else {
                    const char *vb, *ve2;
                    if (find_body(body, close, "v", &vb, &ve2)) {
                        size_t n = (size_t)(ve2 - vb);
                        if (n < sizeof(buf)) {
                            memcpy(buf, vb, n);
                            buf[n] = 0;
                            if (shared) {
                                int idx = atoi(buf);
                                if (ss && idx >= 0 && idx < ss->count)
                                    sheet_set(out, row, col, ss->items[idx]);
                            } else {
                                xml_unescape(buf, n);
                                if (buf[0]) sheet_set(out, row, col, buf);
                            }
                        }
                    }
                }
            }
            p = (close > p) ? close : tagEnd;
        }
        p++;
    }
}

/* 选择编号最小的工作表:sheet1 优先于 sheet10 */
static int sheet_num(const char *name)
{
    const char *p = strstr(name, "sheet");
    if (!p) return 0x7FFFFFFF;
    p += 5;
    int v = 0;
    while (*p >= '0' && *p <= '9') { v = v * 10 + (*p - '0'); p++; }
    return (*p == '.') ? v : 0x7FFFFFFF;
}

struct pick_ctx { char best[256]; int bestNum; int found; };

/* 匹配 xl/worksheets/sheetN.xml(兼容反斜杠) */
static int is_sheet_path(const char *name)
{
    static const char PAT[] = "xl/worksheets/sheet";
    for (int i = 0; i < 19; i++) {
        char c = name[i];
        if (!c) return 0;
        if (c == '\\') c = '/';
        if (c != PAT[i]) return 0;
    }
    return 1;
}

static int pick_sheet_cb(const char *name, void *ud)
{
    struct pick_ctx *c = (struct pick_ctx *)ud;
    if (is_sheet_path(name)) {
        int n = sheet_num(name);
        if (!c->found || n < c->bestNum) {
            strncpy(c->best, name, sizeof(c->best) - 1);
            c->best[sizeof(c->best) - 1] = 0;
            c->bestNum = n;
            c->found = 1;
        }
    }
    return 0;
}

/* xlsx_parse / xlsx_parse_sheet / xlsx_list_sheets 定义见下方多工作表支持部分 */

/* ---------------- CSV / TSV ---------------- */

static void csv_set_cell(Sheet *s, int row, int col, const char *p, size_t n)
{
    /* 去前后空白(保留中间内容) */
    while (n > 0 && (p[0] == ' ' || p[0] == '\t')) { p++; n--; }
    while (n > 0 && (p[n - 1] == ' ' || p[n - 1] == '\t' || p[n - 1] == '\r')) n--;
    if (n == 0) return;
    sheet_reserve(s, row, col);
    if (!s->cells[row]) return;
    free(s->cells[row][col]);
    s->cells[row][col] = sdup(p, n);
}

int csv_parse(const uint8_t *data, size_t size,
              char *(*encoding_fallback)(const char *raw, size_t rawLen),
              Sheet *out)
{
    memset(out, 0, sizeof(*out));
    if (!data || size == 0) return -1;

    const char *p = (const char *)data;
    size_t len = size;
    char *converted = NULL;

    int utf8Bom = (len >= 3 && (unsigned char)p[0] == 0xEF &&
                   (unsigned char)p[1] == 0xBB && (unsigned char)p[2] == 0xBF);
    int u16le = (len >= 2 && (unsigned char)p[0] == 0xFF && (unsigned char)p[1] == 0xFE);
    int u16be = (len >= 2 && (unsigned char)p[0] == 0xFE && (unsigned char)p[1] == 0xFF);

    if (utf8Bom) {
        p += 3; len -= 3;
    } else if (u16le || u16be) {
        size_t wn = len / 2;
        wchar_t *w = (wchar_t *)malloc((wn + 1) * sizeof(wchar_t));
        converted = (char *)malloc(len * 3 + 8);
        if (!w || !converted) { free(w); free(converted); return -1; }
        for (size_t i = 0; i < wn; i++) {
            w[i] = (wchar_t)(u16le
                ? ((unsigned)p[2 * i] | ((unsigned)p[2 * i + 1] << 8))
                : ((unsigned)p[2 * i + 1] | ((unsigned)p[2 * i] << 8)));
        }
        w[wn] = 0;
        size_t ul = wcs_to_u8(w, converted, len * 3 + 7);
        free(w);
        p = converted; len = ul;
    } else if (!u8_valid((const unsigned char *)p, len) && encoding_fallback) {
        /* 非 UTF-8:交给平台转换(Windows 按 GBK/ANSI,Linux 可传 NULL) */
        converted = encoding_fallback(p, len);
        if (converted) { p = converted; len = strlen(converted); }
    }

    /* 分隔符探测:统计第一行 , ; \t 出现次数 */
    char sep = ',';
    {
        size_t i = 0;
        int nComma = 0, nSemi = 0, nTab = 0;
        while (i < len && p[i] != '\n' && p[i] != '\r') {
            if (p[i] == ',') nComma++;
            else if (p[i] == ';') nSemi++;
            else if (p[i] == '\t') nTab++;
            i++;
        }
        if (nSemi > nComma && nSemi >= nTab) sep = ';';
        else if (nTab > nComma && nTab > nSemi) sep = '\t';
    }

    int row = 0, col = 0;
    size_t i = 0;
    char *field = (char *)malloc(len + 1);
    if (!field) { free(converted); return -1; }

    while (i <= len) {
        size_t fl = 0;
        int quoted = 0;
        if (i < len && p[i] == '"') { quoted = 1; i++; }
        while (i < len) {
            char c = p[i];
            if (quoted) {
                if (c == '"') {
                    if (i + 1 < len && p[i + 1] == '"') { field[fl++] = '"'; i += 2; continue; }
                    i++; quoted = 0; continue;
                }
                field[fl++] = c; i++;
            } else {
                if (c == sep) { i++; break; }
                if (c == '\r' || c == '\n') break;
                field[fl++] = c; i++;
            }
        }
        field[fl] = 0;
        csv_set_cell(out, row, col++, field, fl);

        if (i >= len) break;
        if (p[i] == '\r' || p[i] == '\n') {
            if (p[i] == '\r' && i + 1 < len && p[i + 1] == '\n') i += 2; else i++;
            row++; col = 0;
        }
    }
    free(field);
    free(converted);

    sheet_trim_empty(out);
    return (out->rows > 0) ? 0 : -2;
}

/* ================= 多工作表支持 ================= */

/* XML 属性值反转义(&amp; 等基本实体) */
static void attr_unescape(const char *v, int n, char *out, int cap)
{
    int o = 0;
    for (int i = 0; i < n && o < cap - 1; i++) {
        if (v[i] == '&') {
            if (n - i >= 5 && strncmp(v + i, "&amp;", 5) == 0) { out[o++] = '&'; i += 4; }
            else if (n - i >= 4 && strncmp(v + i, "&lt;", 4) == 0) { out[o++] = '<'; i += 3; }
            else if (n - i >= 4 && strncmp(v + i, "&gt;", 4) == 0) { out[o++] = '>'; i += 3; }
            else if (n - i >= 6 && strncmp(v + i, "&quot;", 6) == 0) { out[o++] = '"'; i += 5; }
            else if (n - i >= 6 && strncmp(v + i, "&apos;", 6) == 0) { out[o++] = '\''; i += 5; }
            else out[o++] = v[i];
        } else out[o++] = v[i];
    }
    out[o] = 0;
}

/* 在标签文本 [tag,tagEnd) 内找 attr="值" 写入 out。返回 1 找到 */
static int attr_get(const char *tag, const char *tagEnd, const char *attr,
                    char *out, int cap)
{
    size_t alen = strlen(attr);
    const char *p = tag;
    while (p < tagEnd) {
        const char *hit = strstr(p, attr);
        if (!hit || hit >= tagEnd) break;
        if ((hit == tag || hit[-1] == ' ' || hit[-1] == '\t') && hit[alen] == '=') {
            const char *v = hit + alen + 1;
            if (v >= tagEnd) break;
            char q = *v;
            if (q != '"' && q != '\'') { p = hit + alen; continue; }
            v++;
            const char *e = v;
            while (e < tagEnd && *e != q) e++;
            attr_unescape(v, (int)(e - v), out, cap);
            return 1;
        }
        p = hit + alen;
    }
    return 0;
}

struct wb_sheet { char name[48]; char path[160]; };

/* workbook.xml + rels → 工作表(名字+zip内路径)。返回数量;
   workbook/rels 缺失时按 worksheets 文件顺序降级(名字用文件名) */
static int wb_enumerate(const uint8_t *data, size_t size,
                        struct wb_sheet *out, int max)
{
    int n = 0;
    size_t wbLen = 0;
    uint8_t *wb = zip_read(data, size, "xl/workbook.xml", 0, NULL, 0, &wbLen);
    if (wb) {
        struct { char id[32]; char tgt[128]; } rels[32];
        int relN = 0;
        size_t relLen = 0;
        uint8_t *rel = zip_read(data, size, "xl/_rels/workbook.xml.rels", 0, NULL, 0, &relLen);
        if (rel) {
            const char *p = (const char *)rel;
            const char *end = (const char *)rel + relLen;
            while (relN < 32 && p < end) {
                const char *t = strstr(p, "<Relationship");
                if (!t || t >= end) break;
                const char *te = strchr(t, '>');
                if (!te || te >= end) break;
                char id[32] = "", tgt[128] = "";
                attr_get(t, te, "Id", id, sizeof(id));
                attr_get(t, te, "Target", tgt, sizeof(tgt));
                if (strstr(t, "worksheet") && id[0] && tgt[0]) {
                    snprintf(rels[relN].id, sizeof(rels[relN].id), "%s", id);
                    snprintf(rels[relN].tgt, sizeof(rels[relN].tgt), "%s", tgt);
                    relN++;
                }
                p = te + 1;
            }
            free(rel);
        }
        const char *p = (const char *)wb;
        const char *end = (const char *)wb + wbLen;
        while (n < max && p < end) {
            const char *t = strstr(p, "<sheet");
            if (!t || t >= end) break;
            if (t[6] == 's') { p = t + 7; continue; }     /* <sheets 容器 */
            const char *te = strchr(t, '>');
            if (!te || te >= end) break;
            char nm[48] = "", rid[32] = "";
            attr_get(t, te, "name", nm, sizeof(nm));
            attr_get(t, te, "r:id", rid, sizeof(rid));
            if (!rid[0]) attr_get(t, te, "id", rid, sizeof(rid));
            if (nm[0]) {
                snprintf(out[n].name, sizeof(out[n].name), "%s", nm);
                out[n].path[0] = 0;
                for (int i = 0; i < relN; i++) {
                    if (strcmp(rels[i].id, rid) == 0) {
                        const char *tg = rels[i].tgt;
                        while (*tg == '/') tg++;
                        snprintf(out[n].path, sizeof(out[n].path), "xl/%s", tg);
                        break;
                    }
                }
                n++;
            }
            p = te + 1;
        }
        free(wb);
    }
    if (n == 0) {   /* 降级:按 worksheets 文件顺序 */
        struct pick_ctx pk; memset(&pk, 0, sizeof(pk));
        zip_list(data, size, pick_sheet_cb, &pk);
        if (pk.found) {
            for (int i = 1; i <= 32 && n < max; i++) {
                char path[160];
                snprintf(path, sizeof(path), "xl/worksheets/sheet%d.xml", i);
                size_t dummy = 0;
                uint8_t *x = zip_read(data, size, path, 0, NULL, 0, &dummy);
                if (!x) continue;
                free(x);
                snprintf(out[n].name, 48, "Sheet%d", i);
                snprintf(out[n].path, sizeof(out[n].path), "%s", path);
                n++;
            }
        }
    }
    return n;
}

int xlsx_list_sheets(const uint8_t *data, size_t size,
                     char names[][48], int max)
{
    if (!data || size < 4 || data[0] != 'P' || data[1] != 'K') return -1;
    struct wb_sheet sh[32];
    int n = wb_enumerate(data, size, sh, 32);
    if (n > max) n = max;
    for (int i = 0; i < n; i++) memcpy(names[i], sh[i].name, 48);
    return n;
}

int xlsx_parse_sheet(const uint8_t *data, size_t size, int index, Sheet *out)
{
    memset(out, 0, sizeof(*out));
    if (!data || size < 4) return -1;

    const char *want = NULL;
    struct wb_sheet sh[32];
    int n = wb_enumerate(data, size, sh, 32);
    if (index >= 0 && index < n && sh[index].path[0]) want = sh[index].path;

    struct ss_ctx ss; memset(&ss, 0, sizeof(ss));
    size_t ssLen = 0;
    uint8_t *ssXml = zip_read(data, size, "xl/sharedStrings.xml", 0, NULL, 0, &ssLen);
    if (ssXml) {
        parse_shared_strings((const char *)ssXml, ssLen, &ss);
        free(ssXml);
    }

    uint8_t *shXml = NULL;
    size_t shLen = 0;
    if (want)
        shXml = zip_read(data, size, want, 1, NULL, 0, &shLen);
    if (!shXml) {   /* 目标缺失:退回编号最小的工作表 */
        struct pick_ctx pick; memset(&pick, 0, sizeof(pick));
        zip_list(data, size, pick_sheet_cb, &pick);
        if (!pick.found) {
            for (int i = 0; i < ss.count; i++) free(ss.items[i]);
            free(ss.items);
            return -2;
        }
        shXml = zip_read(data, size, pick.best, 1, NULL, 0, &shLen);
        if (!shXml) {
            for (int i = 0; i < ss.count; i++) free(ss.items[i]);
            free(ss.items);
            return -3;
        }
    }

    parse_sheet_xml((const char *)shXml, shLen, &ss, out);
    free(shXml);
    for (int i = 0; i < ss.count; i++) free(ss.items[i]);
    free(ss.items);

    sheet_trim_empty(out);
    return (out->rows > 0) ? 0 : -4;
}

int xlsx_parse(const uint8_t *data, size_t size, Sheet *out)
{
    return xlsx_parse_sheet(data, size, 0, out);
}
