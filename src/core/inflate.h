/* ============================================================
 * inflate.h - DEFLATE(RFC1951)解压,纯 C 实现
 * 用于读取 .xlsx(本质是 zip 包)
 * ============================================================ */
#ifndef AC_INFLATE_H
#define AC_INFLATE_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* 返回值 */
#define INFLATE_OK        0   /* 成功解压完成 */
#define INFLATE_NEED_MEM  1   /* 输出缓冲不足,请扩大后重试 */
#define INFLATE_ERR      -1   /* 数据损坏或其它错误 */

/* 解压原始 deflate 流(无 zlib 头)。
   返回 INFLATE_OK 时 *outUsed 为实际输出字节数。
   返回 INFLATE_NEED_MEM 时应扩大 out 缓冲后重新调用。 */
int inflate_raw(const unsigned char *in, size_t inLen,
                unsigned char *out, size_t outCap, size_t *outUsed);

#ifdef __cplusplus
}
#endif
#endif
