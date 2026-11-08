/* test_extract.c - 数据提取:按表B表头从表A取同名列 + CSV 导出 */
#include <stdio.h>
#include <wchar.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/sheet.h"
#include "../src/core/import.h"
#include "../src/core/u8.h"

#ifndef _WIN32
#define _strdup strdup
#endif

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

/* 用字符串矩阵构造 Sheet(vals[0] 为表头行) */
static Sheet mk(int rows, int cols, const char *vals[6][6])
{
    Sheet s;
    memset(&s, 0, sizeof(s));
    s.rows = rows;
    s.cols = cols;
    s.cells = (char ***)calloc((size_t)rows, sizeof(char **));
    for (int r = 0; r < rows; r++) {
        s.cells[r] = (char **)calloc((size_t)cols, sizeof(char *));
        for (int c = 0; c < cols; c++)
            s.cells[r][c] = _strdup(vals[r][c] ? vals[r][c] : "");
    }
    return s;
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    /* ---- 1) 按B表头取A同名列 ---- */
    {
        /* 表A:姓名/性别/血型/年龄/出生日期 × 3 数据行 */
        const char *aV[4][6] = {
            { "姓名", "性别", "血型", "年龄", "出生日期" },
            { "张三", "男", "A", "30", "1996-01-02" },
            { "李四", "女", "B", "25", "2001-03-04" },
            { "王五", "男", "O", "41", "1985-05-06" },
        };
        /* 表B:姓名/性别/血型 + 一列A没有的「电话」(应输出空列) */
        const char *bV[2][6] = {
            { "姓名", "性别", "血型", "电话" },
            { "占位", "占位", "占位", "占位" },
        };
        Sheet a = mk(4, 5, aV);
        Sheet b = mk(2, 4, bV);
        Sheet out;
        memset(&out, 0, sizeof(out));

        int n = sheet_extract(&a, &b, &out);
        CHECK(n == 4, "应提取 4 列");
        CHECK(out.cols == 4 && out.rows == 4, "out 应 4列×4行(含表头)");
        CHECK(strcmp(out.cells[0][0], "姓名") == 0 &&
              strcmp(out.cells[0][1], "性别") == 0 &&
              strcmp(out.cells[0][2], "血型") == 0 &&
              strcmp(out.cells[0][3], "电话") == 0, "表头应为B的结构");
        CHECK(strcmp(out.cells[1][0], "张三") == 0 &&
              strcmp(out.cells[1][1], "男") == 0 &&
              strcmp(out.cells[1][2], "A") == 0, "行1 应取A同名列(张三/男/A)");
        CHECK(strcmp(out.cells[2][0], "李四") == 0 &&
              strcmp(out.cells[3][2], "O") == 0, "行2/3 同列取数");
        CHECK(out.cells[1][3][0] == 0, "A没有的「电话」列应为空");
        printf("== 按B表头提取A同名列 OK ==\n");
        sheet_free(&out);
        sheet_free(&a);
        sheet_free(&b);
    }

    /* ---- 2) CSV 导出与读回 ---- */
    {
        const char *aV[3][6] = {
            { "姓名", "性别", "血型" },
            { "张三", "男,上海", "A" },     /* 含逗号 → 引号包裹 */
            { "李四", "女", "B" },
        };
        Sheet a = mk(3, 3, aV);
        wchar_t path[300];
        {
            char p[150];
            const char *dir = getenv("TEMP");       /* MSYS2/Windows 下 TEMP 为本机路径 */
            if (!dir || !dir[0]) dir = ".";
            snprintf(p, sizeof(p), "%s\\extract_out.csv", dir);
            u8_to_wcs(p, path, 299);
        }
        CHECK(sheet_save_csv(&a, path) == 0, "CSV 导出应成功");

        size_t len = 0;
        unsigned char *d = read_file_all(path, &len);
        CHECK(d && len > 10, "导出文件应可读回");
        if (d) {
            CHECK(len >= 3 && d[0] == 0xEF && d[1] == 0xBB && d[2] == 0xBF,
                  "应含 UTF-8 BOM");
            char *txt = (char *)d;
            CHECK(strstr(txt, "\"男,上海\"") != NULL, "含逗号值应引号包裹");
            CHECK(strstr(txt, "李四") != NULL && strstr(txt, "血型") != NULL,
                  "数据与表头应在文件中");
            free(d);
        }
        printf("== CSV 导出(UTF-8 BOM+转义) OK ==\n");
        sheet_free(&a);
    }

    /* ---- 3) 参数错 ---- */
    {
        Sheet out;
        memset(&out, 0, sizeof(out));
        CHECK(sheet_extract(NULL, NULL, &out) == -1, "NULL 应返回 -1");
        printf("== 参数校验 OK ==\n");
    }

    printf(fails ? "*** 失败 ***(%d 处)\n" : "*** 全部通过 ***\n", fails);
    return fails ? 1 : 0;
}
