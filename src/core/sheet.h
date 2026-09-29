/* ============================================================
 * sheet.h - 表格数据(xlsx / csv 解析为统一的二维矩阵)
 * ============================================================ */
#ifndef AC_SHEET_H
#define AC_SHEET_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* 二维字符串矩阵。cells[row][col] 为 UTF-8 字符串(malloc),NULL=空 */
typedef struct {
    char ***cells;
    int      rows, cols;
} Sheet;

void sheet_free(Sheet *s);
void sheet_trim_empty(Sheet *s);   /* 去掉全空的首尾行列 */

/* 解析 .xlsx(zipped OOXML)。成功返回 0,使用第一个工作表。 */
int xlsx_parse(const uint8_t *data, size_t size, Sheet *out);

/* 枚举 .xlsx 的工作表名(按 workbook.xml 顺序,UTF-8)。
   返回数量(0=无工作表,-1=非xlsx/读取失败);names 每项容量 nameCap 字节 */
int xlsx_list_sheets(const uint8_t *data, size_t size,
                     char names[][48], int max);

/* 解析第 index 个工作表(0 起;越界或无法确定时取第一个)。
   成功返回 0 */
int xlsx_parse_sheet(const uint8_t *data, size_t size, int index, Sheet *out);

/* 解析 CSV/TSV(UTF-8 带/不带 BOM)。
   非 UTF-8 时调用 fallback 把整段文本转为 UTF-8(可传 NULL,
   Windows 端传入 GBK->UTF8 转换以兼容 Excel 另存的 ANSI CSV)。 */
int csv_parse(const uint8_t *data, size_t size,
              char *(*encoding_fallback)(const char *raw, size_t rawLen),
              Sheet *out);

#ifdef __cplusplus
}
#endif
#endif
