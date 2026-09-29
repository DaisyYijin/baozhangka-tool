/* ============================================================
 * checker.c - 四表联审实现(移植自网页版,逻辑保持一致)
 * ============================================================ */
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
#include "checker.h"
#include "u8.h"

/* ---------- 字段标准化 ---------- */

/* 去括号/空格/横线(全半角) */
static void strip_paren_ws_dash(wchar_t *s)
{
    int w = 0;
    for (int i = 0; s[i]; i++) {
        wchar_t c = s[i];
        if (c == L'(' || c == L')' || c == L'(' + 0xFF08 - 0x28 || c == L')' + 0xFF09 - 0x29 ||
            c == L' ' || c == L'\t' || c == L'-' || c == 0x2014)
            continue;
        s[w++] = c;
    }
    s[w] = 0;
}

/* 去括号/空格(普通字段不去横线) */
static void strip_paren_ws(wchar_t *s)
{
    int w = 0;
    for (int i = 0; s[i]; i++) {
        wchar_t c = s[i];
        if (c == L'(' || c == L')' || c == L'(' + 0xFF08 - 0x28 || c == L')' + 0xFF09 - 0x29 ||
            c == L' ' || c == L'\t')
            continue;
        s[w++] = c;
    }
    s[w] = 0;
}

/* 岗位职务层级非恒等映射(恒等项无需列出:归一化后原样) */
static const wchar_t *kPosMap[][2] = {
    { L"初职（助理级）",   L"初职" },
    { L"初职助理级",       L"初职" },
    { L"初职-助理级",      L"初职" },
    { L"中职（讲师级）",   L"中职" },
    { L"中职讲师级",       L"中职" },
    { L"中职-讲师级",      L"中职" },
    { L"副高职（副教授级）", L"副高职" },
    { L"副高职副教授级",   L"副高职" },
    { L"副高职-副教授级",  L"副高职" },
    { L"高职（副教授级）", L"副高职" },
    { L"高职副教授级",     L"副高职" },
    { L"正高职（教授级）", L"正高职" },
    { L"正高职教授级",     L"正高职" },
    { L"正高职-教授级",    L"正高职" },
};

static const wchar_t *map_lookup(const wchar_t *k, const wchar_t *const (*tab)[2], int n)
{
    for (int i = 0; i < n; i++)
        if (wcscmp(k, tab[i][0]) == 0) return tab[i][1];
    return NULL;
}

/* 字段归一化:v 写入 out(cap),按类型处理 */
static void norm_field(const wchar_t *v, int type, wchar_t *out, int cap)
{
    if (!v) v = L"";
    wcsncpy(out, v, cap - 1);
    out[cap - 1] = 0;
    /* trim */
    wchar_t *b = out, *e = out + wcslen(out);
    while (e > b && *(e - 1) == L' ') *(--e) = 0;
    while (*b == L' ') b++;
    if (b != out) memmove(out, b, (wcslen(b) + 1) * sizeof(wchar_t));

    if (type == CHK_POS) {
        const wchar_t *m = map_lookup(out, kPosMap, (int)(sizeof(kPosMap) / sizeof(kPosMap[0])));
        if (m) { wcsncpy(out, m, cap - 1); out[cap - 1] = 0; return; }
        strip_paren_ws_dash(out);
        m = map_lookup(out, kPosMap, (int)(sizeof(kPosMap) / sizeof(kPosMap[0])));
        if (m) wcsncpy(out, m, cap - 1), out[cap - 1] = 0;
        return;
    }
    if (type == CHK_RANK) {           /* 军衔/文职级无别名,仅做清理 */
        strip_paren_ws_dash(out);
        return;
    }
    if (type == CHK_TREAT) {
        strip_paren_ws_dash(out);
        return;
    }
    strip_paren_ws(out);              /* 普通字段 */
}

int checker_field_equal(const wchar_t *a, const wchar_t *b, int fieldType)
{
    wchar_t na[64], nb[64];
    norm_field(a, fieldType, na, 64);
    norm_field(b, fieldType, nb, 64);
    return wcscmp(na, nb) == 0;
}

/* 身份证归一化:全角字母数字→半角、trim、大写 */
void checker_norm_id(const wchar_t *v, wchar_t *out, int cap)
{
    int w = 0;
    if (!v) v = L"";
    for (const wchar_t *p = v; *p && w < cap - 1; p++) {
        wchar_t c = *p;
                if (c == '\r' || c == '\n' || c == '\t') continue;  /* 行尾/控制残留 */
        if (c >= 0xFF10 && c <= 0xFF19) c -= 0xFEE0;       /* ０-９ */
        else if (c >= 0xFF21 && c <= 0xFF3A) c -= 0xFEE0;  /* Ａ-Ｚ */
        else if (c >= 0xFF41 && c <= 0xFF5A) c -= 0xFEE0;  /* ａ-ｚ */
        if (c >= L'a' && c <= L'z') c -= 32;
        out[w++] = c;
    }
    out[w] = 0;
    /* trim */
    wchar_t *b = out, *e = out + w;
    while (e > b && *(e - 1) == L' ') *(--e) = 0;
    while (*b == L' ') b++;
    if (b != out) memmove(out, b, (wcslen(b) + 1) * sizeof(wchar_t));
}

/* ---------- Sheet 取值辅助 ---------- */

/* 行值(UTF-8→wchar);r 行 c 列,-1 列或空 → 空串 */
static void cell_w(const Sheet *s, int r, int c, wchar_t *out, int cap)
{
    out[0] = 0;
    if (!s || c < 0 || r >= s->rows || c >= s->cols) return;
    if (!s->cells || !s->cells[r] || !s->cells[r][c]) return;
    u8_to_wcs(s->cells[r][c], out, cap - 1);
}

static int header_col(const Sheet *s, const wchar_t *name)
{
    if (!s || s->rows <= 0 || !s->cells || !s->cells[0]) return -1;
    wchar_t w[48];
    for (int c = 0; c < s->cols; c++) {
        cell_w(s, 0, c, w, 48);
        if (wcscmp(w, name) == 0) return c;
    }
    return -1;
}

static int key_col(const Sheet *s)
{
    int c = header_col(s, L"公民身份号码");
    if (c < 0) c = header_col(s, L"身份证号码");
    if (c < 0) c = header_col(s, L"身份证号");
    return c;
}

/* ---------- 联审 ---------- */

struct rowref { int sheet; int row; };   /* 指向某表某行 */

static void add_issue(CheckResult *r, const wchar_t *id, const wchar_t *name,
                      const wchar_t *dept, const wchar_t *type,
                      const wchar_t *source, const wchar_t *desc)
{
    if (r->issueCount == r->issueCap) {
        int nc = r->issueCap ? r->issueCap * 2 : 64;
        CheckIssue *ni = (CheckIssue *)realloc(r->issues, (size_t)nc * sizeof(CheckIssue));
        if (!ni) return;
        r->issues = ni;
        r->issueCap = nc;
    }
    CheckIssue *it = &r->issues[r->issueCount++];
    memset(it, 0, sizeof(*it));
    wcsncpy(it->idcard, id, 23);   it->idcard[23] = 0;
    wcsncpy(it->name, name ? name : L"", 31);   it->name[31] = 0;
    wcsncpy(it->dept, dept ? dept : L"", 47);   it->dept[47] = 0;
    wcsncpy(it->type, type, 7);    it->type[7] = 0;
    wcsncpy(it->source, source, 23); it->source[23] = 0;
    wcsncpy(it->desc, desc, 159);  it->desc[159] = 0;
}

/* 简单哈希表:身份证 → 行号(冲突时后写覆盖,与网页版一致) */
struct ent { wchar_t key[24]; int row; int used; };

static unsigned hash_key(const wchar_t *s)
{
    unsigned h = 2166136261u;
    for (; *s; s++) { h ^= (unsigned)*s; h *= 16777619u; }
    return h;
}

struct map { struct ent *e; int cap; int n; };

static void map_init(struct map *m, int cap)
{
    m->cap = cap < 16 ? 16 : cap;
    m->e = (struct ent *)calloc((size_t)m->cap, sizeof(struct ent));
    m->n = 0;
}

static void map_put(struct map *m, const wchar_t *key, int row)
{
    unsigned h = hash_key(key) % (unsigned)m->cap;
    while (m->e[h].used && wcscmp(m->e[h].key, key) != 0)
        h = (h + 1) % (unsigned)m->cap;
    if (!m->e[h].used) {
        wcsncpy(m->e[h].key, key, 23);
        m->e[h].key[23] = 0;
        m->e[h].used = 1;
        m->n++;
    }
    m->e[h].row = row;
}

static int map_get(const struct map *m, const wchar_t *key)
{
    unsigned h = hash_key(key) % (unsigned)m->cap;
    while (m->e[h].used) {
        if (wcscmp(m->e[h].key, key) == 0) return m->e[h].row;
        h = (h + 1) % (unsigned)m->cap;
    }
    return -1;
}

static void map_union(struct map *all, const struct map *m)
{
    for (int i = 0; i < m->cap; i++)
        if (m->e[i].used)
            map_put(all, m->e[i].key, 0);
}

static int map_each(const struct map *m, int start)
{
    for (int i = start; i < m->cap; i++)
        if (m->e[i].used) return i;
    return -1;
}

/* 字段比对并记录问题 */
static void cmp_field(const Sheet *a, int ar, const Sheet *b, int br,
                      const wchar_t *colName, int ftype,
                      const wchar_t *srcLabel, const wchar_t *id,
                      const wchar_t *name, const wchar_t *dept, CheckResult *r)
{
    int ac = header_col(a, colName), bc = header_col(b, colName);
    if (ac < 0 || bc < 0) return;
    wchar_t va[64], vb[64];
    cell_w(a, ar, ac, va, 64);
    cell_w(b, br, bc, vb, 64);
    if (!va[0] || !vb[0]) return;               /* 空值不比对(与网页版一致) */
    if (!checker_field_equal(va, vb, ftype)) {
        wchar_t desc[160];
        _snwprintf(desc, 159, L"保障卡:%ls,%ls:%ls", va, srcLabel, vb);
        desc[159] = 0;
        add_issue(r, id, name, dept, L"不一致", srcLabel, desc);
    }
}

int checker_run(const Sheet *card, const Sheet *hr,
                const Sheet *fin, const Sheet *uni, CheckResult *out)
{
    memset(out, 0, sizeof(*out));
    const Sheet *tabs[4] = { card, hr, fin, uni };
    const wchar_t *tabNames[4] = { L"保障卡", L"人资", L"财务", L"被装" };

    int kc[4];
    struct map maps[4];
    for (int t = 0; t < 4; t++) {
        kc[t] = -1;
        map_init(&maps[t], 64);
        if (!tabs[t] || tabs[t]->rows <= 1) continue;      /* 只有表头或空 = 未提供 */
        kc[t] = key_col(tabs[t]);
        if (kc[t] < 0) {
            _snwprintf(out->err, 159, L"「%ls」表中未找到主键列(公民身份号码/身份证号码/身份证号)",
                       tabNames[t]);
            out->err[159] = 0;
            for (int j = 0; j <= t; j++) free(maps[j].e);
            return -1;
        }
        wchar_t key[24];
        for (int r2 = 1; r2 < tabs[t]->rows; r2++) {
            cell_w(tabs[t], r2, kc[t], key, 24);
            checker_norm_id(key, key, 24);
            if (key[0]) map_put(&maps[t], key, r2);
        }
        /* 预检:有数据但索引为空 → 主键列全空 */
        if (tabs[t]->rows > 1 && maps[t].n == 0) {
            _snwprintf(out->err, 159, L"「%ls」表主键列全部为空", tabNames[t]);
            out->err[159] = 0;
            for (int j = 0; j <= t; j++) free(maps[j].e);
            return -1;
        }
    }
    out->cardCount = maps[0].n;
    out->hrCount = maps[1].n;
    out->finCount = maps[2].n;
    out->uniCount = maps[3].n;

    /* 主键并集 */
    struct map all;
    map_init(&all, 256);
    for (int t = 0; t < 4; t++) map_union(&all, &maps[t]);
    out->total = all.n;

    int issuePersons = 0;
    wchar_t name[32], dept[48];
    int i = map_each(&all, 0);
    while (i >= 0) {
        const wchar_t *key = all.e[i].key;
        int cr = map_get(&maps[0], key);
        int rr = map_get(&maps[1], key);
        int fr = map_get(&maps[2], key);
        int ur = map_get(&maps[3], key);
        int before = out->issueCount;

        name[0] = 0; dept[0] = 0;
        if (cr < 0) {
            /* 保障卡缺此人 */
            const Sheet *src = rr >= 0 ? hr : (fr >= 0 ? fin : uni);
            int sr = rr >= 0 ? rr : (fr >= 0 ? fr : ur);
            cell_w(src, sr, header_col(src, L"姓名"), name, 32);
            wchar_t srcs[32] = L"";
            if (rr >= 0) wcscat(srcs, L"人资、");
            if (fr >= 0) wcscat(srcs, L"财务、");
            if (ur >= 0) wcscat(srcs, L"被装、");
            size_t L = wcslen(srcs);
            if (L && srcs[L - 1] == L'、') srcs[L - 1] = 0;
            wchar_t desc[96];
            _snwprintf(desc, 95, L"%ls有此人,但保障卡数据中缺失", srcs);
            desc[95] = 0;
            add_issue(out, key, name, L"", L"缺失", L"保障卡", desc);
        } else {
            cell_w(card, cr, header_col(card, L"姓名"), name, 32);
            cell_w(card, cr, header_col(card, L"部门"), dept, 48);

            if (rr < 0) {
                add_issue(out, key, name, dept, L"缺失", L"人资",
                          L"保障卡有此人,但人资数据中缺失");
            } else {
                cmp_field(card, cr, hr, rr, L"姓名", CHK_NORMAL, L"人资-姓名", key, name, dept, out);
                cmp_field(card, cr, hr, rr, L"岗位职务层级", CHK_POS, L"人资-岗位职务层级", key, name, dept, out);
                cmp_field(card, cr, hr, rr, L"军衔文职级", CHK_RANK, L"人资-军衔文职级", key, name, dept, out);
            }
            if (fr < 0) {
                add_issue(out, key, name, dept, L"缺失", L"财务",
                          L"保障卡有此人,但财务数据中缺失");
            } else {
                cmp_field(card, cr, fin, fr, L"姓名", CHK_NORMAL, L"财务-姓名", key, name, dept, out);
                cmp_field(card, cr, fin, fr, L"岗位职务层级", CHK_POS, L"财务-岗位职务层级", key, name, dept, out);
                cmp_field(card, cr, fin, fr, L"待遇级别", CHK_TREAT, L"财务-待遇级别", key, name, dept, out);
                cmp_field(card, cr, fin, fr, L"人员类别", CHK_NORMAL, L"财务-人员类别", key, name, dept, out);
            }
            if (ur < 0) {
                add_issue(out, key, name, dept, L"缺失", L"被装",
                          L"保障卡有此人,但被装数据中缺失");
            } else {
                cmp_field(card, cr, uni, ur, L"姓名", CHK_NORMAL, L"被装-姓名", key, name, dept, out);
                cmp_field(card, cr, uni, ur, L"人员类别", CHK_NORMAL, L"被装-人员类别", key, name, dept, out);
            }
        }
        if (out->issueCount > before) issuePersons++;
        i = map_each(&all, i + 1);
    }
    out->issuePersons = issuePersons;

    free(all.e);
    for (int t = 0; t < 4; t++) free(maps[t].e);
    return 0;
}

void checker_free(CheckResult *r)
{
    free(r->issues);
    r->issues = NULL;
    r->issueCount = r->issueCap = 0;
}
