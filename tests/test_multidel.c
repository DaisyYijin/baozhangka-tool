/* test_multidel.c - 批量删除步骤:索引集合删除/顺序保持/堆字段所有权 */
#include <stdio.h>
#include <wchar.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/engine.h"

#ifndef _WIN32
#define _strdup strdup
#endif

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

/* ---- engine 跳过测试 mock ---- */
static int g_log[64];
static int g_logN;
static volatile int g_stop = 0;
static void mm(int x, int y) { (void)y; if (g_logN < 64) g_log[g_logN++] = x; }
static void slp(int ms) { (void)ms; }
static void nop_btn(int b) { (void)b; }
static Platform mkp(void)
{
    Platform p;
    memset(&p, 0, sizeof(p));
    p.mouse_move = mm;
    p.mouse_down = nop_btn;
    p.mouse_up = nop_btn;
    p.sleep_ms = slp;
    p.stop = &g_stop;
    return p;
}

static Step mk_click(int tag)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_CLICK;
    s.x = tag;
    return s;
}
static Step mk_findimg(const char *b64)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_FINDIMG;
    s.imgB64 = _strdup(b64);
    return s;
}
static void free_all(Task *t)
{
    for (int i = 0; i < t->count; i++) free(t->steps[i].imgB64);
    free(t->steps);
    t->steps = NULL;
    t->count = t->cap = 0;
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    /* ---- 1) 升序索引删中间两步:顺序保持+imgB64 所有权随迁 ---- */
    {
        Task t;
        memset(&t, 0, sizeof(t));
        t.steps = (Step *)calloc(8, sizeof(Step));
        t.cap = 8;
        t.steps[t.count++] = mk_click(10);
        t.steps[t.count++] = mk_click(20);
        t.steps[t.count++] = mk_findimg("800;600;0;QUJDRA==");
        t.steps[t.count++] = mk_click(30);
        t.steps[t.count++] = mk_click(40);

        int idx[2] = { 1, 3 };              /* 删 20 与 30 */
        int n = task_remove_multi(&t, idx, 2);
        CHECK(n == 2, "应删除 2 步");
        CHECK(t.count == 3, "应剩 3 步");
        CHECK(t.steps[0].type == ACT_CLICK && t.steps[0].x == 10, "剩余0应为10");
        CHECK(t.steps[1].type == ACT_FINDIMG, "剩余1应为找图");
        CHECK(t.steps[2].type == ACT_CLICK && t.steps[2].x == 40, "剩余2应为40");
        CHECK(t.steps[1].imgB64 && strcmp(t.steps[1].imgB64, "800;600;0;QUJDRA==") == 0,
              "找图的 imgB64 应完整随迁");
        printf("== 升序删除 OK ==\n");
        free_all(&t);
    }

    /* ---- 2) 乱序索引删首尾 ---- */
    {
        Task t;
        memset(&t, 0, sizeof(t));
        t.steps = (Step *)calloc(8, sizeof(Step));
        t.cap = 8;
        t.steps[t.count++] = mk_click(1);
        t.steps[t.count++] = mk_click(2);
        t.steps[t.count++] = mk_findimg("1;1;0;QQ==");
        t.steps[t.count++] = mk_click(4);

        int idx[2] = { 3, 0 };              /* 乱序:删 4 与 1 */
        int n = task_remove_multi(&t, idx, 2);
        CHECK(n == 2, "乱序应删除 2 步");
        CHECK(t.count == 2, "应剩 2 步");
        CHECK(t.steps[0].x == 2, "剩余0应为2");
        CHECK(t.steps[1].type == ACT_FINDIMG && t.steps[1].imgB64, "剩余1应为找图且模板在");
        printf("== 乱序删除 OK ==\n");
        free_all(&t);
    }

    /* ---- 3) 全删+无效参数 ---- */
    {
        Task t;
        memset(&t, 0, sizeof(t));
        t.steps = (Step *)calloc(8, sizeof(Step));
        t.cap = 8;
        t.steps[t.count++] = mk_click(1);
        t.steps[t.count++] = mk_findimg("1;1;0;QQ==");
        t.steps[t.count++] = mk_click(3);

        int idx[3] = { 0, 1, 2 };
        CHECK(task_remove_multi(&t, idx, 3) == 3, "应全删");
        CHECK(t.count == 0, "count 应为 0");
        CHECK(task_remove_multi(&t, idx, 3) == 0, "空任务应返回 0");
        CHECK(task_remove_multi(NULL, idx, 1) == 0, "NULL 任务应返回 0");
        printf("== 全删/无效参数 OK ==\n");
        free(t.steps);
    }

    /* ---- 4) 批量禁用 + engine 跳过 + 再启用 ---- */
    {
        TaskBook tb;
        memset(&tb, 0, sizeof(tb));
        Task *t = &tb.tasks[0];
        t->steps = (Step *)calloc(8, sizeof(Step));
        t->cap = 8;
        t->steps[t->count++] = mk_click(10);
        t->steps[t->count++] = mk_click(20);
        t->steps[t->count++] = mk_click(30);
        t->steps[t->count++] = mk_click(40);
        t->loops = 1;                     /* 有限轮次(0=无限循环会卡死测试) */
        Platform p = mkp();

        int idx[2] = { 1, 2 };
        CHECK(task_set_disabled_multi(t, idx, 2, 1) == 2, "应禁用 2 步");
        CHECK(t->steps[1].disabled == 1 && t->steps[2].disabled == 1 &&
              t->steps[0].disabled == 0, "禁用状态正确");
        g_logN = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        CHECK(g_logN == 2 && g_log[0] == 10 && g_log[1] == 40,
              "禁用步骤应被跳过(只剩 10,40)");

        CHECK(task_set_disabled_multi(t, idx, 2, 0) == 2, "应启用 2 步");
        g_logN = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        CHECK(g_logN == 4, "全部启用后应执行 4 步");
        printf("== 批量禁用/引擎跳过/再启用 OK ==\n");
        free_all(t);
    }

    /* ---- 5) 连续段块移动 ---- */
    {
        Task t;
        memset(&t, 0, sizeof(t));
        t.steps = (Step *)calloc(8, sizeof(Step));
        t.cap = 8;
        for (int i = 0; i < 5; i++) t.steps[t.count++] = mk_click(i + 1);

        CHECK(task_move_block(&t, 1, 3, -1) == 1, "段[2..4]上移应成功");
        CHECK(t.steps[0].x == 2 && t.steps[1].x == 3 && t.steps[2].x == 4 &&
              t.steps[3].x == 1 && t.steps[4].x == 5, "上移后应为 2,3,4,1,5");
        CHECK(task_move_block(&t, 0, 2, 1) == 1, "段[0..2]下移应成功");
        CHECK(t.steps[0].x == 1 && t.steps[1].x == 2 && t.steps[2].x == 3 &&
              t.steps[3].x == 4 && t.steps[4].x == 5, "下移后应为 1,2,3,4,5");
        CHECK(task_move_block(&t, 0, 4, -1) == 0, "顶段上移应拒绝");
        CHECK(task_move_block(&t, 0, 4, 1) == 0, "底段下移应拒绝");
        CHECK(task_move_block(&t, 1, 3, 2) == 0, "delta 非±1 应拒绝");
        printf("== 块移动 OK ==\n");
        free_all(&t);
    }

    /* ---- 6) 批量改延时 ---- */
    {
        Task t;
        memset(&t, 0, sizeof(t));
        t.steps = (Step *)calloc(8, sizeof(Step));
        t.cap = 8;
        for (int i = 0; i < 3; i++) {
            t.steps[t.count++] = mk_click(i + 1);
            t.steps[i].delayBefore = 10 * (i + 1);
            t.steps[i].delayAfter = 100 * (i + 1);
        }
        int idx[2] = { 0, 2 };
        CHECK(task_set_delay_multi(&t, idx, 2, 555, 3) == 2, "应改 2 步延时");
        CHECK(t.steps[0].delayBefore == 555 && t.steps[0].delayAfter == 555 &&
              t.steps[2].delayBefore == 555 && t.steps[2].delayAfter == 555,
              "步骤0/2 双延时应为 555");
        CHECK(t.steps[1].delayBefore == 20 && t.steps[1].delayAfter == 200,
              "步骤1 不应受影响");
        CHECK(task_set_delay_multi(&t, idx, 1, 77, 1) == 1, "只改前延时应成功");
        CHECK(t.steps[0].delayBefore == 77 && t.steps[0].delayAfter == 555,
              "which=1 只改前延时");
        CHECK(task_set_delay_multi(&t, idx, 2, -1, 3) == 0, "负值应拒绝");
        printf("== 批量改延时 OK ==\n");
        free_all(&t);
    }

    /* ---- 7) CSV 启用列回环 ---- */
    {
        Task t;
        memset(&t, 0, sizeof(t));
        t.steps = (Step *)calloc(8, sizeof(Step));
        t.cap = 8;
        t.steps[t.count++] = mk_click(10);
        t.steps[t.count++] = mk_click(20);
        t.steps[1].disabled = 1;           /* 第2步禁用 */
        t.loops = 1;

        size_t len = 0;
        char *csv = task_export_csv(&t, &len);
        CHECK(csv && len > 0, "导出应成功");
        if (csv) {
            Task t2;
            memset(&t2, 0, sizeof(t2));
            int n = task_import_csv_text(&t2, csv, len, 0);
            CHECK(n == 2, "应导入 2 步");
            CHECK(t2.count >= 2 && t2.steps[0].disabled == 0 &&
                  t2.steps[1].disabled == 1, "禁用状态应回环(步骤2=禁用)");
            printf("== CSV 启用列回环 OK ==\n");
            task_free(&t2);
            free(csv);
        }
        free_all(&t);
    }

    printf(fails ? "*** 失败 ***(%d 处)\n" : "*** 全部通过 ***\n", fails);
    return fails ? 1 : 0;
}
