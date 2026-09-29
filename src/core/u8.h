/* ============================================================
 * u8.h - UTF-8 与本地 wchar_t 互转(无第三方依赖)
 *   Windows: wchar_t = UTF-16(处理代理对)
 *   Linux:   wchar_t = UCS-4
 * ============================================================ */
#ifndef AC_U8_H
#define AC_U8_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* 返回写入 out 的字符数(不含结尾0)。max 为 out 容量(字符数)。
   解码失败的字节按 U+FFFD 处理,保证不越界。 */
size_t u8_to_wcs(const char *s, wchar_t *out, size_t max);

/* 宽串 -> UTF-8。返回写入字节数(不含结尾0)。 */
size_t wcs_to_u8(const wchar_t *s, char *out, size_t max);

/* 严格校验是否合法 UTF-8。返回 1 合法, 0 非法 */
int u8_valid(const unsigned char *s, size_t n);

#ifdef __cplusplus
}
#endif
#endif
