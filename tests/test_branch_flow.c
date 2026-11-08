/* test_branch_flow.c - 场景端到端:表格A多人数据,步骤1判性别分支,
   步骤2输入当前人数据({列名}展开),步骤3公共收尾(男女都执行);
   并验证 examples/条件分支示例.csv 可导入成同构任务 */
#include <stdio.h>
#include <wchar.h>
#include <stdlib.h>
#include <string.h>
#include "../core/import.h"
#include "../core/engine.h"
#include "../core/u8.h"

#ifndef _WIN32
#define _wcsdup wcsdup
#endif

static int g_log[128];
static int g_logN;
static wchar_t g_paste[8][128];
static int g_pasteN;
static volatile int g_stop = 0;

static void mm(int x, int y) { (void)y; if (g_logN < 128) g_log[g_logN++] = x; }
static void nop_down(int b) { (void)b; }
static void nop_up(int b) { (void)b; }
static void nop_scroll(int a) { (void)a; }
static void nop_combo(const int *v, int n) { (void)v; (void)n; }
static void pst(const wchar_t *t)
{
    if (g_pasteN < 8) {
        wcsncpy(g_paste[g_pasteN], t, 127);
        g_paste[g_pasteN][127] = 0;
        g_pasteN++;
    }
}
static void slp(int ms) { (void)ms; }
static uint32_t rnd(void) { return 0; }

static Platform mkp(void)
{
    Platform p;
    memset(&p, 0, sizeof(p));           /* 全指针清零 */
    p.mouse_move = mm;
    p.mouse_down = nop_down;
    p.mouse_up = nop_up;
    p.mouse_scroll = nop_scroll;
    p.key_combo = nop_combo;
    p.text_paste = pst;                 /* 记录展开后的文本 */
    p.sleep_ms = slp;
    p.rand = rnd;
    p.stop = &g_stop;
    return p;
}

static Step click(int tag)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_CLICK;
    s.x = tag;
    return s;
}
static Step xlsif(const wchar_t *cond, int col1)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_XLSIF;
    s.count = col1;                     /* 1 起列号 */
    wcsncpy(s.text, cond, AC_TEXT_MAX - 1);
    return s;
}
static Step text_step(const wchar_t *txt)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_TEXT;
    wcsncpy(s.text, txt, AC_TEXT_MAX - 1);
    return s;
}

static void set_rows(Task *t)
{
    static const wchar_t *rows[] = {
        L"张三\t男\t110101199001011234",
        L"李四\t女\t110101199202022345",
        L"王二\t男\t110101199505054567",
    };
    static const wchar_t *names[] = { L"姓名", L"性别", L"证件号" };
    t->dataRows = (wchar_t **)calloc(3, sizeof(wchar_t *));
    t->dataRowCount = 3;
    for (int i = 0; i < 3; i++) t->dataRows[i] = _wcsdup(rows[i]);
    t->dataColN = 3;
    t->dataColNames = (wchar_t (*)[32])calloc(3, sizeof(*t->dataColNames));
    for (int i = 0; i < 3; i++) {
        wcsncpy(t->dataColNames[i], names[i], 31);
        t->dataColNames[i][31] = 0;
    }
    t->dataSelCol = 0;
}

#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    int fails = 0;
    Platform p = mkp();

    /* ---- 1) 端到端:步骤1判性别 → 男执行步骤2(输入该人数据) → 步骤3公共尾 ---- */
    {
        TaskBook tb;
        memset(&tb, 0, sizeof(tb));
        Task *t = &tb.tasks[0];
        t->steps = (Step *)calloc(8, sizeof(Step));
        t->cap = 8;
        t->steps[t->count++] = xlsif(L"男=>2,女=>3", 2);       /* 步骤1:第2列=性别 */
        t->steps[t->count++] = text_step(L"{姓名}:{证件号}");   /* 步骤2(男) */
        t->steps[t->count++] = click(99);                       /* 步骤3:公共收尾 */
        set_rows(t);
        t->loops = 3;                    /* 一行一人,三轮 */

        g_logN = 0;
        g_pasteN = 0;
        int r = engine_run(&tb, 0, &p, NULL, NULL);
        CHECK(r == ENGINE_DONE, "应正常完成");
        CHECK(g_logN == 3, "公共尾(步骤3)应每轮执行,共3次");
        for (int i = 0; i < g_logN; i++) CHECK(g_log[i] == 99, "公共尾标记应为99");
        CHECK(g_pasteN == 2, "输入(步骤2)应仅男执行,共2次");
        CHECK(g_pasteN >= 1 && wcscmp(g_paste[0], L"张三:110101199001011234") == 0,
              "第1轮张三(男)应输入张三的姓名:证件号");
        CHECK(g_pasteN >= 2 && wcscmp(g_paste[1], L"王二:110101199505054567") == 0,
              "第3轮王二(男)应输入王二的姓名:证件号");
        printf("== 场景端到端 OK: 公共尾x%d, 输入x%d ==\n", g_logN, g_pasteN);
        for (int i = 0; i < g_pasteN; i++) {
            char nb[160];
            wcs_to_u8(g_paste[i], nb, sizeof(nb));
            printf("  paste[%d]=%s\n", i, nb);
        }
        task_free(t);
    }

    /* ---- 2) 示例任务文件导入:examples/条件分支示例.csv ---- */
    {
        size_t len = 0;
        unsigned char *data = read_file_all(L"examples/条件分支示例.csv", &len);
        CHECK(data && len > 0, "示例文件应可读");
        if (data) {
            Task t2;
            memset(&t2, 0, sizeof(t2));
            int n = task_import_csv_text(&t2, (const char *)data, len, 0);
            CHECK(n == 3, "应导入3个步骤");
            CHECK(t2.dataRowCount == 3, "应导入3行数据(一人一行)");
            CHECK(t2.dataColN == 3, "应有3个列名(姓名/性别/证件号)");
            CHECK(t2.loops == 3, "循环次数应为3(=行数)");
            CHECK(t2.count >= 1 && t2.steps[0].type == ACT_XLSIF && t2.steps[0].count == 2,
                  "步骤1应为Excel判断且列号=2(性别)");
            CHECK(t2.count >= 1 && wcscmp(t2.steps[0].text, L"男=>2,女=>3") == 0,
                  "步骤1条件串应为 男=>2,女=>3");
            if (t2.count >= 2) {
                char d1[128], d2[128];
                wcs_to_u8(t2.steps[1].text, d1, sizeof(d1));
                wcs_to_u8(L"{姓名}:{证件号}", d2, sizeof(d2));
                printf("  [diag] steps[1].type=%d (ACT_TEXT=%d) text='%s' 期望='%s'\n",
                       (int)t2.steps[1].type, (int)ACT_TEXT, d1, d2);
            }
            CHECK(t2.count >= 2 && t2.steps[1].type == ACT_TEXT,
                  "步骤2类型应为输入(ACT_TEXT)");
            CHECK(t2.count >= 2 && wcscmp(t2.steps[1].text, L"{姓名}:{证件号}") == 0,
                  "步骤2文本应为{姓名}:{证件号}");
            CHECK(t2.count >= 3 && t2.steps[2].type == ACT_CLICK, "步骤3应为单击");
            printf("== 示例文件导入 OK: %d 步,%d 行数据,loops=%d ==\n",
                   t2.count, t2.dataRowCount, t2.loops);
            task_free(&t2);
            free(data);
        }
    }

    printf(fails ? "*** 失败 ***(%d 处)\n" : "*** 全部通过 ***\n", fails);
    return fails ? 1 : 0;
}
