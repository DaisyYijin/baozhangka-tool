/* ============================================================
 * zip.h - 极简 ZIP 读取(仅解压,用于 .xlsx)
 * ============================================================ */
#ifndef AC_ZIP_H
#define AC_ZIP_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define ZIP_OK            0
#define ZIP_ERR          -1   /* 数据损坏/格式不对 */
#define ZIP_ERR_NOTZIP   -2   /* 不是 zip 文件 */

/* 在 zip 数据中按名称查找条目。找到返回 0,并填充 method/csize/usize。 */
int zip_find(const uint8_t *data, size_t size, const char *name,
             int *method, uint32_t *csize, uint32_t *usize);

/* 读取指定名称的条目并解压,返回 malloc 的缓冲区(调用方 free),
   *outLen 为输出长度。失败返回 NULL。
   nameMatchPrefix 非 0 时按前缀匹配(用于匹配 xl/worksheets/sheetN.xml,
   返回实际文件名 actualName,容量 nameCap)。 */
uint8_t *zip_read(const uint8_t *data, size_t size, const char *name,
                  int prefixMatch, char *actualName, size_t nameCap,
                  size_t *outLen);

/* 列出所有条目名,回调式遍历(cb 返回非0停止)。返回条目数。 */
int zip_list(const uint8_t *data, size_t size,
             int (*cb)(const char *name, void *ud), void *ud);

#ifdef __cplusplus
}
#endif
#endif
