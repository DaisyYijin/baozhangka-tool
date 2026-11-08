/* test_xlsx_sheet.c - 验证工作表枚举/按索引解析(用 examples/示例数据.xlsx,单表 10 人) */
#include <stdio.h>
#include <wchar.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/sheet.h"
#include "../src/core/u8.h"

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

static void cell_s(const Sheet *s, int r, int c, char *out, int cap)
{
    out[0] = 0;
    if (r < s->rows && s->cells && s->cells[r] && c < s->cols && s->cells[r][c])
        snprintf(out, cap, "%s", s->cells[r][c]);
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    size_t len = 0;
    unsigned char *data = read_file_all(L"examples/示例数据.xlsx", &len);
    if (!data) { printf("FAIL: read\n"); return 1; }

    /* 1) 枚举工作表(单表:Sheet1) */
    char names[16][48];
    int n = xlsx_list_sheets(data, len, names, 16);
    printf("sheets=%d\n", n);
    for (int i = 0; i < n && i < 4; i++) printf("  [%d] %s\n", i, names[i]);
    CHECK(n == 1, "应有 1 个工作表");
    if (n >= 1)
        CHECK(strcmp(names[0], "Sheet1") == 0, "工作表0名字应为 Sheet1");

    /* 2) 解析第 1 个工作表:表头+10 人(姓名/性别/证件号,男女交替) */
    Sheet sh;
    memset(&sh, 0, sizeof(sh));
    int r = xlsx_parse_sheet(data, len, 0, &sh);
    CHECK(r == 0, "parse sheet0 失败");
    CHECK(sh.rows == 11, "应 11 行(表头+10 人)");
    CHECK(sh.cols == 3, "应 3 列");
    char buf[96];
    cell_s(&sh, 0, 0, buf, sizeof(buf));
    CHECK(strcmp(buf, "姓名") == 0, "表头(0,0)应为'姓名'");
    cell_s(&sh, 0, 2, buf, sizeof(buf));
    CHECK(strcmp(buf, "证件号") == 0, "表头(0,2)应为'证件号'");
    cell_s(&sh, 1, 0, buf, sizeof(buf));
    CHECK(strcmp(buf, "张三") == 0, "(1,0)应为张三");
    cell_s(&sh, 1, 1, buf, sizeof(buf));
    CHECK(strcmp(buf, "男") == 0, "(1,1)应为男");
    cell_s(&sh, 1, 2, buf, sizeof(buf));
    CHECK(strcmp(buf, "110101199001011000") == 0, "(1,2)证件号");
    cell_s(&sh, 10, 0, buf, sizeof(buf));
    CHECK(strcmp(buf, "钱二") == 0, "(10,0)应为钱二(第10人)");
    cell_s(&sh, 10, 1, buf, sizeof(buf));
    CHECK(strcmp(buf, "女") == 0, "(10,1)应为女(交替)");
    printf("Sheet1 %d 行 x %d 列\n", sh.rows, sh.cols);
    sheet_free(&sh);

    /* 3) 越界索引:回退第一个 */
    memset(&sh, 0, sizeof(sh));
    r = xlsx_parse_sheet(data, len, 99, &sh);
    CHECK(r == 0, "越界索引应回退并成功");
    cell_s(&sh, 0, 0, buf, sizeof(buf));
    CHECK(strcmp(buf, "姓名") == 0, "越界回退到第一个工作表");
    sheet_free(&sh);

    /* 4) 非 xlsx 数据 */
    CHECK(xlsx_list_sheets((const uint8_t *)"abcd", 4, names, 16) == -1, "非xlsx应返回-1");

    free(data);
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
