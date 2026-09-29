/* test_jump.c - 验证跳转(当前任务内 + 跨TAB)的执行序列 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/engine.h"
#include "../src/core/u8.h"

static int g_log[64];
static int g_logN;
static volatile int g_stop = 0;

static void mm(int x, int y) { (void)y; if (g_logN < 64) g_log[g_logN++] = x; }
static void nop_down(int b) { (void)b; }
static void nop_up(int b) { (void)b; }
static void nop_scroll(int a) { (void)a; }
static void nop_combo(const int *v, int n) { (void)v; (void)n; }
static void nop_paste(const wchar_t *t) { (void)t; }
static void slp(int ms) { (void)ms; }
static uint32_t rnd(void) { return 0; }

static Platform mkp(void)
{
    Platform p;
    p.mouse_move = mm;
    p.mouse_down = nop_down;
    p.mouse_up = nop_up;
    p.mouse_scroll = nop_scroll;
    p.key_combo = nop_combo;
    p.text_paste = nop_paste;
    p.sleep_ms = slp;
    p.rand = rnd;
    p.stop = &g_stop;
    return p;
}

/* 构造单击步骤(坐标=标记) */
static Step click(int tag)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_CLICK;
    s.x = tag;
    return s;
}
static Step jump(int tab, int to)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_JUMP;
    s.jumpTab = tab;
    s.jumpTo = to;
    return s;
}

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)
static int seq_is(const int *want, int n, const char *msg)
{
    int ok = (g_logN == n);
    for (int i = 0; ok && i < n; i++) ok = (g_log[i] == want[i]);
    if (!ok) {
        printf("FAIL: %s\n  实际序列(%d):", msg, g_logN);
        for (int i = 0; i < g_logN; i++) printf(" %d", g_log[i]);
        printf("\n  期望序列(%d):", n);
        for (int i = 0; i < n; i++) printf(" %d", want[i]);
        printf("\n");
        fails++;
    }
    return ok;
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    TaskBook tb;
    memset(&tb, 0, sizeof(tb));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb.tasks[i]);
    Platform p = mkp();

    /* 1) 当前任务内向前跳:步骤[11,12,JUMP→4,13,14] → 11 12 14(跳过第3步的13) */
    Task *A = &tb.tasks[0];
    task_add(A, &(Step){0}); A->steps[0] = click(11);
    task_add(A, &(Step){0}); A->steps[1] = click(12);
    task_add(A, &(Step){0}); A->steps[2] = jump(0, 5);
    task_add(A, &(Step){0}); A->steps[3] = click(13);
    task_add(A, &(Step){0}); A->steps[4] = click(14);
    A->loops = 1;
    g_logN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    { int w[] = {11, 12, 14}; seq_is(w, 3, "任务内跳转"); }

    /* 2) 跨TAB跳转:A1 跳[2:2] → B2 B3 → 本轮结束(1轮) */
    task_clear(A);
    task_add(A, &(Step){0}); A->steps[0] = click(21);
    task_add(A, &(Step){0}); A->steps[1] = jump(2, 2);
    Task *B = &tb.tasks[1];
    task_add(B, &(Step){0}); B->steps[0] = click(31);
    task_add(B, &(Step){0}); B->steps[1] = click(32);
    task_add(B, &(Step){0}); B->steps[2] = click(33);
    g_logN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    { int w[] = {21, 32, 33}; seq_is(w, 3, "跨TAB跳转"); }

    /* 3) 多轮:每轮都从启动任务开始 */
    A->loops = 2;
    g_logN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    { int w[] = {21, 32, 33, 21, 32, 33}; seq_is(w, 6, "跨TAB多轮"); }

    /* 4) 无效目标(目标TAB空/jumpTo越界)回退为当前任务内跳转 */
    task_clear(A);
    task_add(A, &(Step){0}); A->steps[0] = click(41);
    task_add(A, &(Step){0}); A->steps[1] = jump(5, 3);   /* TAB5 空 → 回退:跳本任务第3步 */
    task_add(A, &(Step){0}); A->steps[2] = click(42);
    A->loops = 1;
    g_logN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    { int w[] = {41, 42}; seq_is(w, 2, "无效目标回退"); }

    /* 5) 往返跳转:A1 跳[2:1] → B1 跳[1:3](回A)→ A3 → 轮结束 */
    task_clear(A);
    task_add(A, &(Step){0}); A->steps[0] = click(51);
    task_add(A, &(Step){0}); A->steps[1] = click(52);
    task_add(A, &(Step){0}); A->steps[2] = click(53);
    A->steps[0] = click(51);
    A->steps[1] = jump(2, 1);
    task_clear(B);
    task_add(B, &(Step){0}); B->steps[0] = click(61);
    task_add(B, &(Step){0}); B->steps[1] = jump(1, 3);
    g_logN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    { int w[] = {51, 61, 53}; seq_is(w, 3, "往返跳转"); }

    /* 6) CSV 往返:跨TAB跳转导出 "tab:step" 并恢复 */
    TaskBook tb2;
    memset(&tb2, 0, sizeof(tb2));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb2.tasks[i]);
    tb2.count = 2;
    Task *C = &tb2.tasks[0];
    task_add(C, &(Step){0}); C->steps[0] = jump(3, 5);
    size_t len = 0;
    char *csv = taskbook_export_csv(&tb2, &len);
    CHECK(csv != NULL, "export NULL");
    CHECK(strstr(csv, "3:5") != NULL, "缺 3:5 目标格式");
    TaskBook tb3;
    memset(&tb3, 0, sizeof(tb3));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb3.tasks[i]);
    CHECK(taskbook_import_csv(&tb3, csv, len) == 1, "回导步骤数");
    printf("回读: jumpTab=%d jumpTo=%d type=%d count=%d\n",
           tb3.tasks[0].steps[0].jumpTab, tb3.tasks[0].steps[0].jumpTo,
           (int)tb3.tasks[0].steps[0].type, tb3.tasks[0].count);
    CHECK(tb3.tasks[0].steps[0].jumpTab == 3 && tb3.tasks[0].steps[0].jumpTo == 5, "jumpTab/jumpTo 回读");
    free(csv);

    for (int i = 0; i < MAX_TASKS; i++) task_free(&tb.tasks[i]);
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
