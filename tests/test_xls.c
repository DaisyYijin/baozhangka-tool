/* test_xls.c - Excel 97-2003 (.xls/BIFF8) 解析:真实 Excel COM 转存样本 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
#include "../src/core/sheet.h"
#include "../src/core/import.h"
#include "../src/core/u8.h"

extern char *win_gbk_to_utf8(const char *raw, size_t n);  /* stub/platform_win */

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

static int eq(const Sheet *s, int r, int c, const char *want)
{
    return s->cells && s->cells[r] && s->cells[r][c] &&
           strcmp(s->cells[r][c], want) == 0;
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    size_t len = 0;
    unsigned char *d = read_file_all(L"examples/测试表A.xls", &len);
    CHECK(d && len > 512, "样本文件可读");
    if (!d) { printf("*** 失败 ***(样本缺失)\n"); return 1; }
    CHECK(d[0] == 0xD0 && d[1] == 0xCF && d[2] == 0x11 && d[3] == 0xE0,
          "OLE2 复合文档头");

    Sheet s;
    memset(&s, 0, sizeof(s));
    int r = xls_parse(d, len, win_gbk_to_utf8, &s);
    printf("parse=%d rows=%d cols=%d\n", r, s.rows, s.cols);
    CHECK(r == 0, "xls_parse 应成功(0)");
    if (r != 0) { free(d); printf("*** 失败 ***(%d 处)\n", fails); return 1; }

    CHECK(s.rows == 11 && s.cols == 5, "应 11 行 × 5 列(表头+10 人)");
    for (int i = 0; i <= 2 && i < s.rows; i++) {   /* 诊断:打印前三行 */
        printf("row%d:", i);
        for (int c = 0; c < s.cols; c++)
            printf(" [%s]", (s.cells[i] && s.cells[i][c]) ? s.cells[i][c] : "(nil)");
        printf("\n");
    }
    CHECK(eq(&s, 0, 0, "姓名") && eq(&s, 0, 1, "性别") && eq(&s, 0, 2, "血型") &&
          eq(&s, 0, 3, "年龄") && eq(&s, 0, 4, "出生日期"), "表头五列正确(SST 中文)");
    CHECK(eq(&s, 1, 0, "张三") && eq(&s, 1, 1, "男") && eq(&s, 1, 2, "A") &&
          eq(&s, 1, 3, "25") && eq(&s, 1, 4, "1980-01-01"), "行1 张三/男/A/25/1980-01-01");
    CHECK(eq(&s, 2, 0, "李四") && eq(&s, 2, 1, "女") && eq(&s, 2, 2, "B") &&
          eq(&s, 2, 3, "26"), "行2 李四/女/B/26");
    CHECK(eq(&s, 3, 0, "王五") && eq(&s, 3, 2, "O"), "行3 王五/O");
    CHECK(eq(&s, 10, 0, "钱二"), "行10 钱二");

    /* sheet_parse_auto 应把 OLE2 头判到 xls 分支 */
    Sheet s2;
    memset(&s2, 0, sizeof(s2));
    int r2 = sheet_parse_auto(d, len, win_gbk_to_utf8, &s2);
    CHECK(r2 == 0 && s2.rows == 11 && s2.cols == 5, "auto 判型走 xls 分支");

    /* .xlsx/.csv 不受影响(PK 头仍走 xlsx) */
    size_t len2 = 0;
    unsigned char *d2 = read_file_all(L"examples/测试表A.xlsx", &len2);
    if (d2) {
        Sheet s3;
        memset(&s3, 0, sizeof(s3));
        CHECK(sheet_parse_auto(d2, len2, win_gbk_to_utf8, &s3) == 0 &&
              s3.rows == 11, "auto 对 xlsx 仍走 xlsx 分支");
        sheet_free(&s3);
        free(d2);
    }

    sheet_free(&s);
    sheet_free(&s2);
    free(d);
    printf(fails ? "*** 失败 ***(%d 处)\n" : "*** 全部通过 ***\n", fails);
    return fails ? 1 : 0;
}
