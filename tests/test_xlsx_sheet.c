/* test_xlsx_sheet.c - 验证多工作表枚举/按索引解析(用 examples/示例数据.xlsx) */
#include <stdio.h>
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

    /* 1) 枚举工作表 */
    char names[16][48];
    int n = xlsx_list_sheets(data, len, names, 16);
    printf("sheets=%d\n", n);
    for (int i = 0; i < n && i < 4; i++) printf("  [%d] %s\n", i, names[i]);
    CHECK(n == 2, "应有 2 个工作表");
    if (n >= 2) {
        CHECK(strcmp(names[0], "人员名单") == 0, "工作表0名字");
        CHECK(strcmp(names[1], "登录账号") == 0, "工作表1名字");
    }

    /* 2) 解析第 2 个工作表(登录账号) */
    Sheet sh;
    memset(&sh, 0, sizeof(sh));
    int r = xlsx_parse_sheet(data, len, 1, &sh);
    CHECK(r == 0, "parse sheet1 失败");
    char buf[96];
    cell_s(&sh, 0, 0, buf, sizeof(buf));
    CHECK(strcmp(buf, "账号") == 0, "sheet1(0,0)应为表头'账号'");
    cell_s(&sh, 1, 0, buf, sizeof(buf));
    CHECK(strcmp(buf, "user01") == 0, "sheet1(1,0)");
    cell_s(&sh, 2, 2, buf, sizeof(buf));
    CHECK(strcmp(buf, "报表系统") == 0, "sheet1(2,2)");
    printf("登录账号表 %d 行 x %d 列\n", sh.rows, sh.cols);
    sheet_free(&sh);

    /* 3) 解析第 1 个工作表(人员名单):验证表头跳过的数据基础 */
    memset(&sh, 0, sizeof(sh));
    r = xlsx_parse_sheet(data, len, 0, &sh);
    CHECK(r == 0, "parse sheet0 失败");
    CHECK(sh.rows == 6, "人员名单应 6 行(含表头)");
    cell_s(&sh, 0, 1, buf, sizeof(buf));
    CHECK(strcmp(buf, "身份证号") == 0, "sheet0(0,1)");
    cell_s(&sh, 5, 0, buf, sizeof(buf));
    CHECK(strcmp(buf, "钱七") == 0, "sheet0(5,0)");
    sheet_free(&sh);

    /* 4) 越界索引:回退第一个 */
    memset(&sh, 0, sizeof(sh));
    r = xlsx_parse_sheet(data, len, 99, &sh);
    CHECK(r == 0, "越界索引应回退并成功");
    cell_s(&sh, 0, 0, buf, sizeof(buf));
    CHECK(strcmp(buf, "姓名") == 0, "越界回退到第一个工作表");
    sheet_free(&sh);

    /* 5) 非 xlsx 数据 */
    CHECK(xlsx_list_sheets((const uint8_t *)"abcd", 4, names, 16) == -1, "非xlsx应返回-1");

    free(data);
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
