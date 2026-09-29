/* test_clickcount.c - 验证单击类步骤固定点击 1 次(即使 count 存了 3) */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/engine.h"

static int g_downs = 0;
static volatile int g_stop = 0;
static void mm(int x, int y) { (void)x; (void)y; }
static void down_cb(int b) { (void)b; g_downs++; }
static void up_cb(int b) { (void)b; }
static void nop_scroll(int a) { (void)a; }
static void nop_combo(const int *v, int n) { (void)v; (void)n; }
static void nop_paste(const wchar_t *t) { (void)t; }
static void slp(int ms) { (void)ms; }
static uint32_t rnd(void) { return 0; }

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

static int run_type(int type, int count)
{
    TaskBook tb;
    memset(&tb, 0, sizeof(tb));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb.tasks[i]);
    Platform p;
    p.mouse_move = mm; p.mouse_down = down_cb; p.mouse_up = up_cb;
    p.mouse_scroll = nop_scroll; p.key_combo = nop_combo;
    p.text_paste = nop_paste; p.sleep_ms = slp; p.rand = rnd;
    p.stop = &g_stop;
    Task *A = &tb.tasks[0];
    A->loops = 1;
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = type;
    s.x = 1;
    s.count = count;              /* 故意存 3 */
    task_add(A, &s);
    g_downs = 0;
    engine_run(&tb, 0, &p, NULL, NULL);
    int n = g_downs;
    task_free(&tb.tasks[0]);
    return n;
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    CHECK(run_type(ACT_CLICK, 3) == 1, "单击存3应只点1次");
    CHECK(run_type(ACT_CLICK, 0) == 1, "单击存0应只点1次");
    CHECK(run_type(ACT_RCLICK, 3) == 1, "右击存3应只点1次");
    CHECK(run_type(ACT_MCLICK, 3) == 1, "中击存3应只点1次");
    CHECK(run_type(ACT_DBLCLICK, 3) == 2, "双击应点2次");
    CHECK(run_type(ACT_DBLCLICK, 0) == 2, "双击默认2次");
    CHECK(run_type(ACT_MULTI, 3) == 3, "多击存3应点3次");
    CHECK(run_type(ACT_MULTI, 5) == 5, "多击存5应点5次");
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
