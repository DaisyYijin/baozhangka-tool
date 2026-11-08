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

    printf(fails ? "*** 失败 ***(%d 处)\n" : "*** 全部通过 ***\n", fails);
    return fails ? 1 : 0;
}
