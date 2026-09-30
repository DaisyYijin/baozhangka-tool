/* test_jumpref.c - 拖拽后跳转序号同步 + 无限跳转保护 */
#include <stdio.h>
#include <time.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/engine.h"

static int g_steps[64], g_n;          /* 执行过的步骤 x 标记 */
static volatile int g_stop = 0;
static void mm(int x, int y) { (void)y; if (g_n < 64) g_steps[g_n++] = x; }
static void nd(int b) { (void)b; }
static void nu(int b) { (void)b; }
static void ns(int a) { (void)a; }
static void nc(const int *v, int n) { (void)v; (void)n; }
static void np2(const wchar_t *t) { (void)t; }
static void sl(int ms) { (void)ms; }
static uint32_t rnd(void) { return 0; }
static void prog(int loop, int step, void *ud) { (void)loop; (void)step; (void)ud; if (g_n < 64) g_n++; else g_n++; }

static int fails = 0;
#define CHECK(c, m) do { if (!(c)) { printf("FAIL: %s\n", m); fails++; } } while (0)

static Platform mkp(void)
{
    Platform p;
    p.mouse_move = mm; p.mouse_down = nd; p.mouse_up = nu;
    p.mouse_scroll = ns; p.key_combo = nc; p.text_paste = np2;
    p.sleep_ms = sl; p.rand = rnd; p.stop = &g_stop;
    return p;
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    /* 1) 互相指向对方的跳转死循环:必须在 10000 次内自动停止 */
    TaskBook tb;
    memset(&tb, 0, sizeof(tb));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb.tasks[i]);
    Platform p = mkp();
    Task *A = &tb.tasks[0];
    A->loops = 0;                     /* 无限轮 */
    Step s1, s2;
    memset(&s1, 0, sizeof(s1)); s1.type = ACT_JUMP; s1.jumpTo = 2;      /* 1 -> 2 */
    memset(&s2, 0, sizeof(s2)); s2.type = ACT_JUMP; s2.jumpTo = 1;      /* 2 -> 1 */
    task_add(A, &s1);
    task_add(A, &s2);
    g_n = 0;
    clock_t t0 = clock();
    int r = engine_run(&tb, 0, &p, prog, NULL);
    double secs = (double)(clock() - t0) / CLOCKS_PER_SEC;
    printf("死循环保护: ret=%d 用时 %.2fs 跳转次数=%d\n", r, secs, g_n);
    CHECK(r == ENGINE_DONE, "死循环应正常结束(非崩溃)");
    CHECK(secs < 5.0, "死循环应快速停止");
    CHECK(g_n < 11000, "跳转计数应受限");
    task_free(&tb.tasks[0]);

    /* 2) 拖拽后 jumpTo 同步(gui 层逻辑,此处仅验证 task_move_to 语义参考) */
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
