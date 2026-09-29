/* test_textflow.c - 验证输入步骤执行链:文本/{行}替换/数据行为空时的行为 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/engine.h"
#include "../src/core/u8.h"

static wchar_t g_pasted[8][256];
static int g_pasteN;
static volatile int g_stop = 0;

static void mm(int x, int y) { (void)x; (void)y; }
static void nop_down(int b) { (void)b; }
static void nop_up(int b) { (void)b; }
static void nop_scroll(int a) { (void)a; }
static void nop_combo(const int *v, int n) { (void)v; (void)n; }
static void paste_cb(const wchar_t *t) {
    if (g_pasteN < 8) { wcsncpy(g_pasted[g_pasteN], t, 255); g_pasted[g_pasteN][255] = 0; }
    g_pasteN++;
}
static void slp(int ms) { (void)ms; }
static uint32_t rnd(void) { return 0; }

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    TaskBook tb;
    memset(&tb, 0, sizeof(tb));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb.tasks[i]);
    Platform p;
    p.mouse_move = mm; p.mouse_down = nop_down; p.mouse_up = nop_up;
    p.mouse_scroll = nop_scroll; p.key_combo = nop_combo;
    p.text_paste = paste_cb; p.sleep_ms = slp; p.rand = rnd;
    p.stop = &g_stop;

    Task *A = &tb.tasks[0];
    A->loops = 1;

    /* 1) 固定文本输入 */
    Step s1;
    memset(&s1, 0, sizeof(s1));
    s1.type = ACT_TEXT;
    wcscpy(s1.text, L"你好ABC");
    task_add(A, &s1);
    g_pasteN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    CHECK(g_pasteN == 1, "固定文本:应粘贴1次");
    CHECK(g_pasteN >= 1 && wcscmp(g_pasted[0], L"你好ABC") == 0, "固定文本内容错误");

    /* 2) {行} 替换:2 行数据源,2 轮 */
    task_clear(A);
    A->loops = 2;
    Step s2;
    memset(&s2, 0, sizeof(s2));
    s2.type = ACT_TEXT;
    wcscpy(s2.text, L"账号:{行}");
    task_add(A, &s2);
    A->dataRows = (wchar_t **)calloc(2, sizeof(wchar_t *));
    A->dataRows[0] = _wcsdup(L"user01");
    A->dataRows[1] = _wcsdup(L"user02");
    A->dataRowCount = 2;
    g_pasteN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    CHECK(g_pasteN == 2, "{行}:应粘贴2次");
    CHECK(g_pasteN >= 2 && wcscmp(g_pasted[0], L"账号:user01") == 0, "第1轮替换错误");
    CHECK(g_pasteN >= 2 && wcscmp(g_pasted[1], L"账号:user02") == 0, "第2轮替换错误");

    /* 3) 数据源为空时:{行} 保持字面(不应是空串) */
    A->dataRowCount = 0;
    g_pasteN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    CHECK(g_pasteN == 2, "空数据源:应仍粘贴2次");
    CHECK(g_pasteN >= 1 && wcscmp(g_pasted[0], L"账号:{行}") == 0, "空数据源应保留字面{行}");

    /* 4) 文本为空:不粘贴 */
    task_clear(A);
    A->loops = 1;
    Step s4;
    memset(&s4, 0, sizeof(s4));
    s4.type = ACT_TEXT;
    s4.text[0] = 0;
    task_add(A, &s4);
    g_pasteN = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    CHECK(g_pasteN == 0, "空文本不应粘贴");

    task_free(&tb.tasks[0]);
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
