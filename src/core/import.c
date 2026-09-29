/* ============================================================
 * import.c - Excel/CSV 导入导出 + 任务簿(多 TAB)读写
 * ============================================================ */
#include "import.h"
#include "engine.h"
#include "u8.h"
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdio.h>

#ifdef _WIN32
#define AC_SWPRINTF(b, n, ...) do { _snwprintf(b, n, __VA_ARGS__); (b)[(n) - 1] = 0; } while (0)
#else
#define AC_SWPRINTF(b, n, ...) do { swprintf(b, n, __VA_ARGS__); (b)[(n) - 1] = 0; } while (0)
#endif

/* ---------------- 列定义 ---------------- */

enum {
    COL_ACTION = 0, COL_X, COL_Y, COL_W, COL_H,
    COL_COUNT, COL_INTERVAL, COL_TEXT,
    COL_DELAY_BEFORE, COL_DELAY_AFTER, COL_CLEAR,
    COL_JUMP, COL_NOTE,
    COL_COUNT_
};

static const wchar_t *HEADER_ALIASES[COL_COUNT_][6] = {
    [COL_ACTION]       = { L"动作", L"类型", L"action", L"type", NULL },
    [COL_X]            = { L"X", L"坐标X", L"x", NULL },
    [COL_Y]            = { L"Y", L"坐标Y", L"y", NULL },
    [COL_W]            = { L"宽", L"范围宽", L"w", NULL },
    [COL_H]            = { L"高", L"范围高", L"h", NULL },
    [COL_COUNT]        = { L"次数", L"点击次数", L"count", NULL },
    [COL_INTERVAL]     = { L"间隔", L"间隔毫秒", L"interval", NULL },
    [COL_TEXT]         = { L"文本", L"文本或按键", L"内容", L"text", NULL },
    [COL_DELAY_BEFORE] = { L"前延时", L"前延时毫秒", L"延时前", NULL },
    [COL_DELAY_AFTER]  = { L"后延时", L"后延时毫秒", L"延时后", L"延时", NULL },
    [COL_CLEAR]        = { L"清空", L"输入前清空", L"clear", NULL },
    [COL_JUMP]         = { L"跳转", L"跳转到", L"jump", NULL },
    [COL_NOTE]         = { L"备注", L"note", NULL },
};

static int ci_eq(const wchar_t *a, const wchar_t *b)
{
    while (*a && *b) {
        wchar_t ca = *a, cb = *b;
        if (ca >= L'A' && ca <= L'Z') ca += 32;
        if (cb >= L'A' && cb <= L'Z') cb += 32;
        if (ca != cb) return 0;
        a++; b++;
    }
    return *a == 0 && *b == 0;
}

static wchar_t *cell_wcs(const Sheet *s, int r, int c)
{
    static wchar_t buf[AC_TEXT_MAX * 2];
    if (r >= s->rows || c >= s->cols || !s->cells || !s->cells[r]) return NULL;
    const char *cell = s->cells[r][c];
    if (!cell || !cell[0]) return NULL;
    if (u8_to_wcs(cell, buf, AC_TEXT_MAX * 2 - 1) == 0) return NULL;
    return buf;
}

static int cell_int(const Sheet *s, int r, int c, int defVal)
{
    wchar_t *w = cell_wcs(s, r, c);
    if (!w) return defVal;
    wchar_t *end;
    long v = wcstol(w, &end, 10);
    if (end == w) return defVal;
    return (int)v;
}

static int truthy(const wchar_t *s)
{
    if (!s) return 0;
    if (ci_eq(s, L"是") || ci_eq(s, L"真") || ci_eq(s, L"y") ||
        ci_eq(s, L"yes") || ci_eq(s, L"true") || ci_eq(s, L"1"))
        return 1;
    return 0;
}

static void map_headers(const Sheet *s, int headerRow, int map[COL_COUNT_])
{
    for (int i = 0; i < COL_COUNT_; i++) map[i] = -1;
    for (int c = 0; c < s->cols && c < 64; c++) {
        wchar_t *h = cell_wcs(s, headerRow, c);
        if (!h) continue;
        for (int f = 0; f < COL_COUNT_; f++) {
            for (int a = 0; HEADER_ALIASES[f][a]; a++) {
                if (ci_eq(h, HEADER_ALIASES[f][a])) {
                    if (map[f] < 0) map[f] = c;
                    break;
                }
            }
        }
    }
}

int task_import_sheet(Task *t, const Sheet *s, int append)
{
    if (!t || !s || s->rows <= 0) return -1;
    if (!append) task_clear(t);

    int map[COL_COUNT_];
    int startRow = 0;
    int headerRow = -1, dataRow = -1;

    for (int r = 0; r < s->rows && r < 12 && dataRow < 0; r++) {
        wchar_t *a = cell_wcs(s, r, 0);
        if (a && act_type_from_name(a) >= 0) { dataRow = r; break; }
        for (int c = 0; c < s->cols && headerRow < 0; c++) {
            wchar_t *h = cell_wcs(s, r, c);
            if (h && (ci_eq(h, L"动作") || ci_eq(h, L"action") || ci_eq(h, L"类型")))
                headerRow = r;
        }
    }

    if (headerRow >= 0)
        map_headers(s, headerRow, map);
    else {
        /* 无表头:按导出列序 动作,x,y,次数,间隔,文本,前延时,后延时,清空,启用,备注 */
        for (int i = 0; i < COL_COUNT_; i++) map[i] = -1;
        map[COL_ACTION] = 0;
        map[COL_X] = 1;
        map[COL_Y] = 2;
        map[COL_COUNT] = 3;
        map[COL_INTERVAL] = 4;
        map[COL_TEXT] = 5;
        map[COL_DELAY_BEFORE] = 6;
        map[COL_DELAY_AFTER] = 7;
        map[COL_CLEAR] = 8;
        map[COL_NOTE] = 10;
    }

    startRow = (dataRow >= 0) ? dataRow : s->rows;

    /* 提取数据源段(#数据,N + 后续 N 行第一列) */
    for (int r = 0; r < s->rows; r++) {
        wchar_t *c0 = cell_wcs(s, r, 0);
        if (c0 && wcscmp(c0, L"#数据") == 0) {
            int n = cell_int(s, r, 1, 0);
            if (n > 0) {
                if (t->dataRows) {
                    for (int i = 0; i < t->dataRowCount; i++) free(t->dataRows[i]);
                    free(t->dataRows);
                }
                t->dataRows = (wchar_t **)calloc((size_t)n, sizeof(wchar_t *));
                t->dataRowCount = 0;
                for (int k = 0; k < n && r + 1 + k < s->rows; k++) {
                    wchar_t *v = cell_wcs(s, r + 1 + k, 0);
                    if (!v) v = L"";
                    size_t wl = wcslen(v);
                    wchar_t *dup = (wchar_t *)malloc((wl + 1) * sizeof(wchar_t));
                    if (dup) {
                        wcscpy(dup, v);
                        t->dataRows[t->dataRowCount++] = dup;
                    }
                }
            }
            break;
        }
    }

    /* 解析 #设置 行(打开任务时恢复全局设置;仅替换模式) */
    if (!append) {
        for (int r = 0; r < s->rows; r++) {
            wchar_t *c0 = cell_wcs(s, r, 0);
            if (c0 && wcscmp(c0, L"#设置") == 0) {
                t->loops           = cell_int(s, r, 2, t->loops);
                t->loopGap         = cell_int(s, r, 4, t->loopGap);
                t->jitter          = cell_int(s, r, 6, t->jitter);
                t->startCountdown  = cell_int(s, r, 8, t->startCountdown);
                t->loopsFromExcel  = cell_int(s, r, 10, t->loopsFromExcel) ? 1 : 0;
                break;
            }
        }
        /* 解析 #TAB名 行(单任务导出携带的TAB显示名) */
        for (int r = 0; r < s->rows; r++) {
            wchar_t *c0 = cell_wcs(s, r, 0);
            if (c0 && wcscmp(c0, L"#TAB名") == 0) {
                wchar_t *nm = cell_wcs(s, r, 1);
                if (nm && nm[0]) {
                    wcsncpy(t->name, nm, AC_TASKNAME_MAX - 1);
                    t->name[AC_TASKNAME_MAX - 1] = 0;
                }
                break;
            }
        }
    }

    int textCol = map[COL_TEXT] >= 0 ? map[COL_TEXT] : -1;
    int imported = 0;

    for (int r = startRow; r < s->rows; r++) {
        /* # 开头(设置/数据/任务标记):不作为步骤;多任务文件遇到 #任务 即停止单任务导入 */
        wchar_t *c0 = cell_wcs(s, r, 0);
        if (c0 && c0[0] == L'#') {
            if (c0[1] == 0xE4 && 0) { }   /* 占位,无实际分支 */
            if (wcsncmp(c0, L"#任务", 3) == 0) break;
            continue;
        }

        int any = 0;
        for (int c = 0; c < s->cols; c++) {
            wchar_t *w = cell_wcs(s, r, c);
            if (w && w[0]) { any = 1; break; }
        }
        if (!any) continue;

        Step st;
        memset(&st, 0, sizeof(st));

        int actCol = map[COL_ACTION] >= 0 ? map[COL_ACTION] : 0;
        wchar_t *actName = cell_wcs(s, r, actCol);
        int type = actName ? act_type_from_name(actName) : -1;
        if (type < 0) continue;

        st.type = type;
        st.x     = map[COL_X]         >= 0 ? cell_int(s, r, map[COL_X], 0) : 0;
        st.y     = map[COL_Y]         >= 0 ? cell_int(s, r, map[COL_Y], 0) : 0;
        st.w     = map[COL_W]         >= 0 ? cell_int(s, r, map[COL_W], 0) : 0;
        st.h     = map[COL_H]         >= 0 ? cell_int(s, r, map[COL_H], 0) : 0;
        st.count = map[COL_COUNT]     >= 0 ? cell_int(s, r, map[COL_COUNT], 0) : 0;
        st.interval = map[COL_INTERVAL] >= 0 ? cell_int(s, r, map[COL_INTERVAL], 0) : 0;
        st.delayBefore = map[COL_DELAY_BEFORE] >= 0 ? cell_int(s, r, map[COL_DELAY_BEFORE], 0) : 0;
        st.delayAfter  = map[COL_DELAY_AFTER]  >= 0 ? cell_int(s, r, map[COL_DELAY_AFTER],  200) : 200;

        wchar_t *txt = textCol >= 0 ? cell_wcs(s, r, textCol) : NULL;
        if (txt) wcsncpy(st.text, txt, AC_TEXT_MAX - 1);

        wchar_t *clr = map[COL_CLEAR] >= 0 ? cell_wcs(s, r, map[COL_CLEAR]) : NULL;
        st.clearFirst = clr ? truthy(clr) : 0;

        wchar_t *note = map[COL_NOTE] >= 0 ? cell_wcs(s, r, map[COL_NOTE]) : NULL;
        if (note) wcsncpy(st.note, note, AC_NOTE_MAX - 1);

        if (type == ACT_SCROLL) {
            if (st.count != 0) st.scroll = st.count;
            else {
                wchar_t *w2 = textCol >= 0 ? cell_wcs(s, r, textCol) : NULL;
                if (w2) { wchar_t *e2; long v = wcstol(w2, &e2, 10); if (e2 != w2) st.scroll = (int)v; }
            }
        }

        if (type == ACT_DRAG) {
            wchar_t *w2 = textCol >= 0 ? cell_wcs(s, r, textCol) : NULL;
            if (w2) {
                wchar_t *e2, *e3;
                long v1 = wcstol(w2, &e2, 10);
                if (e2 != w2 && (*e2 == L',' || *e2 == 0xFF0C)) {
                    long v2 = wcstol(e2 + 1, &e3, 10);
                    if (e3 != e2 + 1) { st.x2 = (int)v1; st.y2 = (int)v2; st.text[0] = 0; }
                }
            }
        }

        if (type == ACT_JUMP) {
            int jt = 0, jtab = 0;
            /* 目标写法:5=当前任务第5步;3:5=步骤TAB3的第5步。
               依次从 跳转列 / 次数列 / 文本列 解析 */
            const wchar_t *cand[2];
            int ncand = 0;
            if (map[COL_JUMP] >= 0) cand[ncand++] = cell_wcs(s, r, map[COL_JUMP]);
            if (textCol >= 0)      cand[ncand++] = cell_wcs(s, r, textCol);
            for (int ci = 0; ci < ncand && jt == 0; ci++) {
                const wchar_t *w2 = cand[ci];
                if (!w2 || !w2[0]) continue;
                wchar_t *e2;
                long v = wcstol(w2, &e2, 10);
                if (e2 == w2) continue;
                jt = (int)v;
                if (*e2 == L':') {
                    long v2 = wcstol(e2 + 1, &e2, 10);
                    if (*e2 == 0 && v2 > 0 && v >= 1 && v <= MAX_TASKS) {
                        jtab = (int)v;
                        jt = (int)v2;
                    }
                }
            }
            if (jt == 0 && map[COL_COUNT] >= 0) jt = cell_int(s, r, map[COL_COUNT], 0);
            st.jumpTo = jt;
            st.jumpTab = jtab;
        }

        if (task_add(t, &st) >= 0) imported++;
    }
    return imported;
}

/* ---------------- CSV 序列化辅助 ---------------- */

static void append_str(char **buf, size_t *len, size_t *cap, const char *s, size_t n)
{
    if (*len + n + 1 > *cap) {
        *cap = (*len + n + 1) * 2;
        *buf = (char *)realloc(*buf, *cap);
    }
    memcpy(*buf + *len, s, n);
    *len += n;
    (*buf)[*len] = 0;
}

static void append_field(char **buf, size_t *len, size_t *cap, const wchar_t *w)
{
    char tmp[AC_TEXT_MAX * 3];
    if (w) wcs_to_u8(w, tmp, sizeof(tmp) - 1);
    else tmp[0] = 0;
    int needQ = strchr(tmp, ',') || strchr(tmp, '"') || strchr(tmp, '\n') || strchr(tmp, '\r');
    if (needQ) {
        append_str(buf, len, cap, "\"", 1);
        for (const char *p = tmp; *p; p++) {
            if (*p == '"') append_str(buf, len, cap, "\"\"", 2);
            else append_str(buf, len, cap, p, 1);
        }
        append_str(buf, len, cap, "\"", 1);
    } else {
        append_str(buf, len, cap, tmp, strlen(tmp));
    }
}

static void append_int(char **buf, size_t *len, size_t *cap, int v)
{
    char tmp[32];
    snprintf(tmp, sizeof(tmp), "%d", v);
    append_str(buf, len, cap, tmp, strlen(tmp));
}

static void csv_row_end(char **buf, size_t *len, size_t *cap)
{
    append_str(buf, len, cap, "\r\n", 2);
}

/* ---------------- 单任务导出(保留:测试/简易用途) ---------------- */

char *task_export_csv(const Task *t, size_t *outLen)
{
    if (!t) return NULL;
    size_t cap = 4096, len = 0;
    char *buf = (char *)malloc(cap);
    if (!buf) return NULL;
    buf[0] = 0;
    append_str(&buf, &len, &cap, "\xEF\xBB\xBF", 3);

    {
        char tmp[160];
        snprintf(tmp, sizeof(tmp),
                 "#设置,循环次数,%d,循环间隔毫秒,%d,随机抖动毫秒,%d,开始倒计时毫秒,%d,按Excel行数,%d\r\n",
                 t->loops, t->loopGap, t->jitter, t->startCountdown, t->loopsFromExcel ? 1 : 0);
        append_str(&buf, &len, &cap, tmp, strlen(tmp));
    }
    if (t->name[0]) {   /* 重命名过的TAB:名字随单任务导出 */
        append_str(&buf, &len, &cap, "#TAB名,", 8);
        append_field(&buf, &len, &cap, t->name);
        csv_row_end(&buf, &len, &cap);
    }

    /* 数据源段 */
    if (t->dataRowCount > 0) {
        char tmp[32];
        snprintf(tmp, sizeof(tmp), "#数据,%d\r\n", t->dataRowCount);
        append_str(&buf, &len, &cap, tmp, strlen(tmp));
        for (int i = 0; i < t->dataRowCount; i++) {
            append_field(&buf, &len, &cap, t->dataRows[i]);
            csv_row_end(&buf, &len, &cap);
        }
    }

    /* 表头 */
    append_field(&buf, &len, &cap, L"动作");
    append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"X");   append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"Y");   append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"次数"); append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"间隔毫秒"); append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"文本或按键"); append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"前延时毫秒"); append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"后延时毫秒"); append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"输入前清空"); append_str(&buf, &len, &cap, ",", 1);
    append_field(&buf, &len, &cap, L"备注");
    csv_row_end(&buf, &len, &cap);

    for (int i = 0; i < t->count; i++) {
        const Step *s = &t->steps[i];
        append_field(&buf, &len, &cap, act_type_name(s->type));
        append_str(&buf, &len, &cap, ",", 1);
        append_int(&buf, &len, &cap, s->x);  append_str(&buf, &len, &cap, ",", 1);
        append_int(&buf, &len, &cap, s->y);  append_str(&buf, &len, &cap, ",", 1);
        append_int(&buf, &len, &cap, s->type == ACT_SCROLL ? s->scroll : s->count);
        append_str(&buf, &len, &cap, ",", 1);
        append_int(&buf, &len, &cap, s->interval);
        append_str(&buf, &len, &cap, ",", 1);
        if (s->type == ACT_DRAG && (s->x2 || s->y2)) {
            wchar_t tmp[64];
            AC_SWPRINTF(tmp, 64, L"%d,%d", s->x2, s->y2);
            append_field(&buf, &len, &cap, tmp);
        } else if (s->type == ACT_JUMP && s->jumpTo > 0) {
            wchar_t tmp[32];
            if (s->jumpTab >= 1 && s->jumpTab <= MAX_TASKS)
                AC_SWPRINTF(tmp, 32, L"%d:%d", s->jumpTab, s->jumpTo);
            else
                AC_SWPRINTF(tmp, 32, L"%d", s->jumpTo);
            append_field(&buf, &len, &cap, tmp);
        } else {
            append_field(&buf, &len, &cap, s->text);
        }
        append_str(&buf, &len, &cap, ",", 1);
        append_int(&buf, &len, &cap, s->delayBefore); append_str(&buf, &len, &cap, ",", 1);
        append_int(&buf, &len, &cap, s->delayAfter);  append_str(&buf, &len, &cap, ",", 1);
        append_field(&buf, &len, &cap, s->clearFirst ? L"是" : L"否");
        append_str(&buf, &len, &cap, ",", 1);
        append_field(&buf, &len, &cap, s->note);
        csv_row_end(&buf, &len, &cap);
    }
    if (outLen) *outLen = len;
    return buf;
}

/* ---------------- 单任务文本导入(设置行+步骤;遇 #任务 停止) ---------------- */

int task_import_csv_text(Task *t, const char *utf8Text, size_t len, int append)
{
    Sheet sh;
    memset(&sh, 0, sizeof(sh));
    if (csv_parse((const unsigned char *)utf8Text, len, NULL, &sh) != 0) {
        sheet_free(&sh);
        return -1;
    }
    int r = task_import_sheet(t, &sh, append);
    sheet_free(&sh);
    return r;
}

/* ---------------- 文件读取 ---------------- */

unsigned char *read_file_all(const wchar_t *path, size_t *outLen)
{
    if (!path) return NULL;
    char u8path[1024];
    wcs_to_u8(path, u8path, sizeof(u8path) - 1);
#ifdef _WIN32
    FILE *f = _wfopen(path, L"rb");
#else
    FILE *f = fopen(u8path, "rb");
#endif
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (sz < 0) { fclose(f); return NULL; }
    unsigned char *buf = (unsigned char *)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return NULL; }
    size_t rd = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    if (rd != (size_t)sz) { free(buf); return NULL; }
    buf[sz] = 0;
    if (outLen) *outLen = (size_t)sz;
    return buf;
}

/* ================= 任务簿(多 TAB)导入导出 ================= */

/* Sheet 构建辅助 */
static void tb_set(Sheet *s, int r, int c, const char *v)
{
    if (r >= s->rows) {
        int nr = r + 1;
        char ***nc = (char ***)realloc(s->cells, (size_t)nr * sizeof(char **));
        if (!nc) return;
        s->cells = nc;
        for (int rr = s->rows; rr < nr; rr++) s->cells[rr] = NULL;
        s->rows = nr;
    }
    if (c >= s->cols) {
        int nc2 = c + 1;
        for (int rr = 0; rr < s->rows; rr++) {
            if (s->cells[rr]) {
                char **row2 = (char **)realloc(s->cells[rr], (size_t)nc2 * sizeof(char *));
                if (!row2) continue;
                s->cells[rr] = row2;
                for (int cc = s->cols; cc < nc2; cc++) s->cells[rr][cc] = NULL;
            }
        }
        s->cols = nc2;
    }
    if (!s->cells[r]) s->cells[r] = (char **)calloc((size_t)s->cols, sizeof(char *));
    free(s->cells[r][c]);
    s->cells[r][c] = (char *)malloc(strlen(v) + 1);
    if (s->cells[r][c]) strcpy(s->cells[r][c], v);
}

/* 从含 #任务,N 分段的 Sheet 导入到任务簿;无段→全部到 cur。返回总步骤数 */
int taskbook_import_sheet(TaskBook *tb, int cur, const Sheet *sh)
{
    if (!tb || !sh) return -1;

    tb->count = 0;   /* 0=文件未含 #标签数 行(由调用者按旧规则推断) */

    int segStart[16], segTab[16], segCount = 0;
    for (int r = 0; r < sh->rows; r++) {
        if (!sh->cells || !sh->cells[r]) continue;
        const char *c0 = sh->cells[r][0];
        if (c0 && strcmp(c0, "#标签数") == 0) {
            int n = (sh->cells[r][1]) ? atoi(sh->cells[r][1]) : 0;
            if (n >= 1 && n <= MAX_TASKS) tb->count = n;
        }
        if (c0 && strcmp(c0, "#任务") == 0) {
            int tab = (sh->cells[r][1]) ? atoi(sh->cells[r][1]) : 1;
            if (tab >= 1 && tab <= 8 && segCount < 16) {
                segStart[segCount] = r;
                segTab[segCount] = tab - 1;
                segCount++;
                /* 第3列为重命名的TAB名(可省略) */
                tb->tasks[tab - 1].name[0] = 0;
                const char *nm = sh->cells[r][2];
                if (nm && nm[0])
                    u8_to_wcs(nm, tb->tasks[tab - 1].name, AC_TASKNAME_MAX - 1);
            }
        }
    }

    if (segCount == 0)
        return task_import_sheet(&tb->tasks[cur], sh, 0);

    int total = 0;
    for (int s2 = 0; s2 < segCount; s2++) {
        int rowBegin = segStart[s2] + 1;
        int rowEnd = (s2 + 1 < segCount) ? segStart[s2 + 1] : sh->rows;
        Sheet sub;
        memset(&sub, 0, sizeof(sub));
        for (int r = rowBegin; r < rowEnd; r++) {
            if (!sh->cells || !sh->cells[r]) continue;
            for (int c = 0; c < sh->cols; c++) {
                const char *cell = sh->cells[r][c];
                if (cell) tb_set(&sub, r - rowBegin, c, cell);
            }
        }
        Task *t = &tb->tasks[segTab[s2]];
        task_clear(t);
        int n = task_import_sheet(t, &sub, 0);
        total += n > 0 ? n : 0;
        sheet_free(&sub);
    }
    return total;
}

int taskbook_import_csv(TaskBook *tb, const char *utf8Text, size_t len)
{
    Sheet sh;
    memset(&sh, 0, sizeof(sh));
    if (csv_parse((const unsigned char *)utf8Text, len, NULL, &sh) != 0) {
        sheet_free(&sh);
        return -1;
    }
    int r = taskbook_import_sheet(tb, 0, &sh);
    sheet_free(&sh);
    return r;
}

/* book 导出辅助 */
static void bk_append(char **buf, size_t *len, size_t *cap, const char *s, size_t n)
{
    if (*len + n + 1 > *cap) {
        *cap = (*len + n + 1) * 2;
        *buf = (char *)realloc(*buf, *cap);
    }
    memcpy(*buf + *len, s, n);
    *len += n;
    (*buf)[*len] = 0;
}

static void bk_field_w(char **buf, size_t *len, size_t *cap, const wchar_t *w)
{
    char tmp[AC_TEXT_MAX * 3];
    if (w) wcs_to_u8(w, tmp, sizeof(tmp) - 1);
    else tmp[0] = 0;
    int needQ = strchr(tmp, ',') || strchr(tmp, '"') || strchr(tmp, '\n') || strchr(tmp, '\r');
    if (needQ) {
        bk_append(buf, len, cap, "\"", 1);
        for (const char *p = tmp; *p; p++) {
            if (*p == '"') bk_append(buf, len, cap, "\"\"", 2);
            else bk_append(buf, len, cap, p, 1);
        }
        bk_append(buf, len, cap, "\"", 1);
    } else {
        bk_append(buf, len, cap, tmp, strlen(tmp));
    }
}

static void bk_field_n(char **buf, size_t *len, size_t *cap, int v)
{
    char tmp[32];
    snprintf(tmp, sizeof(tmp), "%d", v);
    bk_append(buf, len, cap, tmp, strlen(tmp));
}

static void bk_sep(char **buf, size_t *len, size_t *cap)
{
    bk_append(buf, len, cap, ",", 1);
}

static void bk_row_end(char **buf, size_t *len, size_t *cap)
{
    bk_append(buf, len, cap, "\r\n", 2);
}

/* 导出整本任务簿(含 #设置/#任务 分段) */
char *taskbook_export_csv(const TaskBook *tb, size_t *outLen)
{
    if (!tb) return NULL;
    size_t cap = 4096, len = 0;
    char *buf = (char *)malloc(cap);
    if (!buf) return NULL;
    buf[0] = 0;

    bk_append(&buf, &len, &cap, "\xEF\xBB\xBF", 3);

    {
        char tmp[160];
        snprintf(tmp, sizeof(tmp),
                 "#设置,循环次数,%d,循环间隔毫秒,%d,随机抖动毫秒,%d,开始倒计时毫秒,%d,按Excel行数,%d\r\n",
                 tb->tasks[0].loops, tb->tasks[0].loopGap, tb->tasks[0].jitter,
                 tb->tasks[0].startCountdown, tb->tasks[0].loopsFromExcel ? 1 : 0);
        bk_append(&buf, &len, &cap, tmp, strlen(tmp));
    }
    {   /* 上次使用的TAB数(重启恢复用);tb->count 由 UI 维护 */
        char tmp[32];
        snprintf(tmp, sizeof(tmp), "#标签数,%d\r\n",
                 (tb->count >= 1 && tb->count <= MAX_TASKS) ? tb->count : 1);
        bk_append(&buf, &len, &cap, tmp, strlen(tmp));
    }

    for (int k = 0; k < MAX_TASKS; k++) {
        char tmp[32];
        snprintf(tmp, sizeof(tmp), "#任务,%d", k + 1);
        bk_append(&buf, &len, &cap, tmp, strlen(tmp));
        if (tb->tasks[k].name[0]) {          /* 重命名过的TAB:附加名字列 */
            bk_sep(&buf, &len, &cap);
            bk_field_w(&buf, &len, &cap, tb->tasks[k].name);
        }
        bk_append(&buf, &len, &cap, "\r\n", 2);

        const Task *t = &tb->tasks[k];
        for (int i = 0; i < t->count; i++) {
            const Step *s = &t->steps[i];
            bk_field_w(&buf, &len, &cap, act_type_name(s->type));
            bk_sep(&buf, &len, &cap);
            bk_field_n(&buf, &len, &cap, s->x);
            bk_sep(&buf, &len, &cap);
            bk_field_n(&buf, &len, &cap, s->y);
            bk_sep(&buf, &len, &cap);
            bk_field_n(&buf, &len, &cap, s->type == ACT_SCROLL ? s->scroll : s->count);
            bk_sep(&buf, &len, &cap);
            bk_field_n(&buf, &len, &cap, s->interval);
            bk_sep(&buf, &len, &cap);
            if (s->type == ACT_JUMP && s->jumpTo > 0) {
                wchar_t jt[32];
                if (s->jumpTab >= 1 && s->jumpTab <= MAX_TASKS)
                    AC_SWPRINTF(jt, 32, L"%d:%d", s->jumpTab, s->jumpTo);
                else
                    AC_SWPRINTF(jt, 32, L"%d", s->jumpTo);
                bk_field_w(&buf, &len, &cap, jt);
            } else if (s->type == ACT_DRAG) {
                wchar_t jt[48];
                AC_SWPRINTF(jt, 48, L"%d,%d", s->x2, s->y2);
                jt[47] = 0;
                bk_field_w(&buf, &len, &cap, jt);
            } else {
                bk_field_w(&buf, &len, &cap, s->text);
            }
            bk_sep(&buf, &len, &cap);
            bk_field_n(&buf, &len, &cap, s->delayBefore);
            bk_sep(&buf, &len, &cap);
            bk_field_n(&buf, &len, &cap, s->delayAfter);
            bk_sep(&buf, &len, &cap);
            bk_field_w(&buf, &len, &cap, s->clearFirst ? L"1" : L"");
            bk_sep(&buf, &len, &cap);
            bk_field_w(&buf, &len, &cap, s->note);
            bk_row_end(&buf, &len, &cap);
        }
    }
    if (outLen) *outLen = len;
    return buf;
}
