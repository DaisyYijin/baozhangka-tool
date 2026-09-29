/* test_import_mini.c - 定位 task_import_sheet 卡死 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../core/sheet.h"
#include "../core/import.h"
#include "../core/engine.h"

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    /* 手工构造 1 行 Sheet */
    Sheet s;
    memset(&s, 0, sizeof(s));
    s.rows = 2; s.cols = 4;
    s.cells = (char ***)calloc(2, sizeof(char **));
    s.cells[0] = (char **)calloc(4, sizeof(char *));
    s.cells[1] = (char **)calloc(4, sizeof(char *));
    s.cells[0][0] = _strdup("\xe5\x8d\x95\xe5\x87\xbb");  /* 单击 */
    s.cells[0][1] = _strdup("100");
    s.cells[0][2] = _strdup("200");
    s.cells[1][0] = _strdup("\xe8\xbe\x93\xe5\x85\xa5");  /* 输入 */
    s.cells[1][1] = _strdup("0");

    printf("sheet ready rows=%d cols=%d\n", s.rows, s.cols);

    Task t;
    printf("before task_init\n");
    task_init(&t);
    printf("before import\n");
    int n = task_import_sheet(&t, &s, 0);
    printf("imported=%d\n", n);
    task_free(&t);
    sheet_free(&s);
    printf("DONE\n");
    return 0;
}
