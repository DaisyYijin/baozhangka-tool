/* test_tabname.c - 验证任务簿导出/导入的 TAB 名字列、标签数与单任务 #TAB名 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/engine.h"
#include "../src/core/u8.h"

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    /* ---- 1. 任务簿往返:名字列 + 引号转义 + #标签数 ---- */
    TaskBook tb;
    memset(&tb, 0, sizeof(tb));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb.tasks[i]);
    tb.count = 5;                                /* 5 个TAB(含空白) */
    wcscpy(tb.tasks[0].name, L"登录流程");
    wcscpy(tb.tasks[2].name, L"Tab 3,带逗号");
    wcscpy(tb.tasks[3].name, L"带\"引号\"名");

    size_t len = 0;
    char *csv = taskbook_export_csv(&tb, &len);
    CHECK(csv != NULL, "export NULL");
    printf("---- 导出 ----\n%.220s\n", csv);

    CHECK(strstr(csv, "#\xe4\xbb\xbb\xe5\x8a\xa1,1,\xe7\x99\xbb\xe5\xbd\x95\xe6\xb5\x81\xe7\xa8\x8b") != NULL, "缺 #任务,1,登录流程");
    CHECK(strstr(csv, "\"Tab 3,\xe5\xb8\xa6\xe9\x80\x97\xe5\x8f\xb7\"") != NULL, "含逗号名未加引号");
    CHECK(strstr(csv, "\"\xe5\xb8\xa6\"\"\xe5\xbc\x95\xe5\x8f\xb7\"\"\xe5\x90\x8d\"") != NULL, "含引号名未转义");
    CHECK(strstr(csv, "#\xe6\xa0\x87\xe7\xad\xbe\xe6\x95\xb0,5") != NULL, "缺 #标签数,5");

    TaskBook tb2;
    memset(&tb2, 0, sizeof(tb2));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb2.tasks[i]);
    int r = taskbook_import_csv(&tb2, csv, len);
    free(csv);
    printf("回导返回 %d\n", r);
    CHECK(r >= 0, "回导失败");
    CHECK(wcscmp(tb2.tasks[0].name, L"登录流程") == 0, "名字0 回读错误");
    CHECK(wcscmp(tb2.tasks[2].name, L"Tab 3,带逗号") == 0, "名字2 回读错误");
    CHECK(wcscmp(tb2.tasks[3].name, L"带\"引号\"名") == 0, "名字3 回读错误");
    CHECK(tb2.count == 5, "#标签数 回读错误");
    CHECK(tb2.tasks[5].name[0] == 0, "未命名槽被误写");

    /* ---- 2. 旧格式(无 #标签数):count 应为 0,由调用者按内容推断 ---- */
    const char *oldCsv =
        "\xEF\xBB\xBF"
        "#\xe8\xae\xbe\xe7\xbd\xae,\xe5\xbe\xaa\xe7\x8e\xaf\xe6\xac\xa1\xe6\x95\xb0,1\r\n"  /* #设置,... */
        "#\xe4\xbb\xbb\xe5\x8a\xa1,1\r\n"                                                  /* #任务,1 */
        "\xe5\x8d\x95\xe5\x87\xbb,100,200,1,0,,0,200,0,1,\r\n";                             /* 单击,... */
    TaskBook tb3;
    memset(&tb3, 0, sizeof(tb3));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb3.tasks[i]);
    r = taskbook_import_csv(&tb3, oldCsv, strlen(oldCsv));
    CHECK(r == 1, "旧格式步骤数错误");
    CHECK(tb3.count == 0, "旧格式不应设置 count");
    CHECK(tb3.tasks[0].count == 1, "旧格式任务1步骤数错误");

    /* ---- 3. 单任务导出带 #TAB名 + 单任务导入恢复 ---- */
    Task t1;
    task_init(&t1);
    wcscpy(t1.name, L"我的任务");
    char *csv1 = task_export_csv(&t1, &len);
    CHECK(csv1 != NULL, "单任务 export NULL");
    CHECK(strstr(csv1, "#TAB\xe5\x90\x8d,\xe6\x88\x91\xe7\x9a\x84\xe4\xbb\xbb\xe5\x8a\xa1") != NULL, "缺 #TAB名,我的任务");
    Task t2;
    task_init(&t2);
    r = task_import_csv_text(&t2, csv1, len, 0);
    free(csv1);
    CHECK(r >= 0, "单任务回导失败");
    CHECK(wcscmp(t2.name, L"我的任务") == 0, "单任务名字回读错误");

    /* ---- 4. 名字含 \r 也应被引号包裹(不破坏行结构) ---- */
    TaskBook tb4;
    memset(&tb4, 0, sizeof(tb4));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb4.tasks[i]);
    tb4.count = 1;
    wcscpy(tb4.tasks[0].name, L"a\rb");
    char *csv4 = taskbook_export_csv(&tb4, &len);
    CHECK(csv4 != NULL, "CR export NULL");
    CHECK(strstr(csv4, "\"a\rb\"") != NULL, "含CR名字未加引号");
    free(csv4);

    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
