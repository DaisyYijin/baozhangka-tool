/* test_move.c - 验证 task_move_to(列表拖拽的移动逻辑) */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/engine.h"

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    Task t;
    task_init(&t);
    /* 5 个步骤,文本分别为 A B C D E,便于识别 */
    for (int i = 0; i < 5; i++) {
        Step s;
        memset(&s, 0, sizeof(s));
        s.type = ACT_CLICK;
        s.x = i;
        task_add(&t, &s);
    }

    /* 下移:0 -> 插入位3(变成第3行,即index2) */
    task_move_to(&t, 0, 3);
    CHECK(t.steps[0].x == 1 && t.steps[1].x == 2 && t.steps[2].x == 0 &&
          t.steps[3].x == 3 && t.steps[4].x == 4, "0->3 顺序错误");

    /* 上移:4 -> 插入位1(变成第2行,即index1) */
    task_move_to(&t, 4, 1);
    CHECK(t.steps[0].x == 1 && t.steps[1].x == 4 && t.steps[2].x == 2 &&
          t.steps[3].x == 0 && t.steps[4].x == 3, "4->1 顺序错误");

    /* 原地不动 */
    task_move_to(&t, 2, 2);
    task_move_to(&t, 2, 3);
    CHECK(t.steps[2].x == 2, "原地移动改变了顺序");

    /* 移到末尾 */
    task_move_to(&t, 1, 5);
    CHECK(t.steps[0].x == 1 && t.steps[4].x == 4, "1->5 顺序错误");

    /* 移到开头 */
    task_move_to(&t, 4, 0);
    CHECK(t.steps[0].x == 4 && t.steps[1].x == 1, "4->0 顺序错误");

    /* 越界安全 */
    task_move_to(&t, -1, 0);
    task_move_to(&t, 0, 99);
    task_move_to(&t, 99, 0);
    task_move_to(NULL, 0, 0);
    CHECK(t.count == 5, "越界调用破坏数据");

    task_free(&t);
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
