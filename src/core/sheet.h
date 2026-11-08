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

/* 数据提取:以 b 的表头(第0行各列名)为模板,从 a 中取同名列生成 out
   (表头=b 表头,行数与 a 相同;b 有而 a 无的列为空)。返回提取列数,-1=参数错 */
int sheet_extract(const Sheet *a, const Sheet *b, Sheet *out);
/* Sheet 写出 CSV(UTF-8 BOM+CRLF,Excel 双击可开);0=成功 */
int sheet_save_csv(const Sheet *s, const wchar_t *path);

/* Excel 97-2003 (.xls, BIFF8) 只读解析:第一个工作表的表头与数据。
   gbk 与 csv_parse 同签名(8-bit 串降码,NULL 则 Latin1)。0=成功 */
int xls_parse(const unsigned char *data, size_t len,
              char *(*gbk)(const char *, size_t), Sheet *out);
/* 自动判型:OLE2 头(D0 CF 11 E0)→xls,PK 头→xlsx(首表),否则 CSV */
int sheet_parse_auto(const unsigned char *data, size_t len,
                     char *(*gbk)(const char *, size_t), Sheet *out);
/* 多条件筛选(筛选提取用):cols[i]/vals[i] 为第 i 个条件;
   列名或值为空则跳过该条;多条件 AND(同时满足);值为包含式匹配(strstr)。
   命中数据行(连同表头)复制到 out;返回命中数据行数,-1=条件列名在表头中不存在 */
int sheet_filter_rows_multi(const Sheet *src, const char *const *cols,
                            const char *const *vals, int n, Sheet *out);

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
