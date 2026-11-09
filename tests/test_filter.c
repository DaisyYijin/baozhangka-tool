/* test_filter.c - 多条件筛选(AND+包含匹配)+筛选后按表B表头提取的组合链路 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
#include "../src/core/sheet.h"
#include "../src/core/import.h"
#include "../src/core/u8.h"

#ifndef _WIN32
#define _strdup strdup
#endif

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

static Sheet mk(int rows, int cols, const char *v[][5])
{
    Sheet s;
    memset(&s, 0, sizeof(s));
    s.rows = rows;
    s.cols = cols;
    s.cells = (char ***)calloc((size_t)rows, sizeof(char **));
    for (int r = 0; r < rows; r++) {
        s.cells[r] = (char **)calloc((size_t)cols, sizeof(char *));
        for (int c = 0; c < cols; c++)
            s.cells[r][c] = _strdup(v[r][c] ? v[r][c] : "");
    }
    return s;
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    /* 表A:人员类别/姓名/性别/血型 × 6 行 */
    const char *aV[7][5] = {
        { "人员类别", "姓名", "性别", "血型" },
        { "父亲", "张三", "男", "A" },
        { "母亲", "李四", "女", "B" },
        { "父亲", "王五", "男", "O" },
        { "儿子", "赵六", "男", "AB" },
        { "女儿", "钱七", "女", "A" },
        { "女儿", "孙八", "女", "B" },
    };
    Sheet a = mk(7, 4, aV);

    /* ---- 1) 单条件精确语义(包含匹配下全串) ---- */
    {
        Sheet o;
        memset(&o, 0, sizeof(o));
        const char *cs[] = { "人员类别" }, *vs[] = { "父亲" };
        int n = sheet_filter_rows_multi(&a, cs, vs, 1, &o);
        CHECK(n == 2, "父亲应命中 2 行");
        CHECK(o.rows == 3 && strcmp(o.cells[1][1], "张三") == 0 &&
              strcmp(o.cells[2][1], "王五") == 0, "命中行=张三/王五");
        printf("== 单条件(人员类别=父亲) OK ==\n");
        sheet_free(&o);
    }

    /* ---- 2) 包含式匹配 ---- */
    {
        Sheet o;
        memset(&o, 0, sizeof(o));
        const char *cs[] = { "人员类别" }, *vs[] = { "儿" };
        int n = sheet_filter_rows_multi(&a, cs, vs, 1, &o);
        CHECK(n == 3, "含\"儿\"应命中 3 行(儿子+女儿×2)");
        printf("== 包含匹配(人员类别含\"儿\") OK ==\n");
        sheet_free(&o);
    }

    /* ---- 3) 多条件 AND ---- */
    {
        Sheet o;
        memset(&o, 0, sizeof(o));
        const char *cs[] = { "人员类别", "性别" }, *vs[] = { "女儿", "女" };
        int n = sheet_filter_rows_multi(&a, cs, vs, 2, &o);
        CHECK(n == 2, "女儿+女 应命中 2 行");
        const char *cs2[] = { "人员类别", "性别" }, *vs2[] = { "女儿", "男" };
        int n2 = sheet_filter_rows_multi(&a, cs2, vs2, 2, &o);
        CHECK(n2 == 0 && o.rows == 1, "女儿+男 应 0 行(仅表头)");
        printf("== 多条件 AND OK ==\n");
        sheet_free(&o);
    }

    /* ---- 4) 空条件跳过/列不存在/全通过 ---- */
    {
        Sheet o;
        memset(&o, 0, sizeof(o));
        const char *cs[] = { NULL, "" }, *vs[] = { "x", "y" };
        CHECK(sheet_filter_rows_multi(&a, cs, vs, 2, &o) == 6, "空条件=全部 6 行");
        const char *cs2[] = { "不存在的列" }, *vs2[] = { "1" };
        CHECK(sheet_filter_rows_multi(&a, cs2, vs2, 1, &o) == -1, "列不存在应 -1");
        printf("== 空条件跳过/列不存在 OK ==\n");
        sheet_free(&o);
    }

    /* ---- 4.5) 条件数无上限(>8 不截断) ---- */
    {
        Sheet o;
        memset(&o, 0, sizeof(o));
        const char *cs[12], *vs[12];
        for (int i = 0; i < 12; i++) { cs[i] = "人员类别"; vs[i] = "父亲"; }
        CHECK(sheet_filter_rows_multi(&a, cs, vs, 12, &o) == 2,
              "12 个条件(>8)应仍命中 2 行(不截断)");
        printf("== 条件数无上限(12 个>8) OK ==\n");
        sheet_free(&o);
    }

    /* ---- 5) 筛选 → 按表B表头提取 组合链路 ---- */
    {
        Sheet o;
        memset(&o, 0, sizeof(o));
        const char *cs[] = { "人员类别" }, *vs[] = { "父亲" };
        sheet_filter_rows_multi(&a, cs, vs, 1, &o);
        const char *bV[1][5] = { { "姓名", "血型" } };   /* 表B 只要姓名/血型 */
        Sheet b = mk(1, 2, bV);
        Sheet out;
        memset(&out, 0, sizeof(out));
        CHECK(sheet_extract(&o, &b, &out) == 2, "提取应 2 列");
        CHECK(out.rows == 3 && strcmp(out.cells[0][0], "姓名") == 0 &&
              strcmp(out.cells[1][0], "张三") == 0 &&
              strcmp(out.cells[2][1], "O") == 0, "输出=表B结构×筛选行");
        printf("== 筛选+表B提取组合链路 OK ==\n");
        sheet_free(&o); sheet_free(&b); sheet_free(&out);
    }

    sheet_free(&a);
    printf(fails ? "*** 失败 ***(%d 处)\n" : "*** 全部通过 ***\n", fails);
    return fails ? 1 : 0;
}
