/* u8.c - UTF-8 与 wchar_t 互转实现 */
#include "u8.h"
#include <stdint.h>

/* 宽字符宽度判断:Windows 为 2 字节 UTF-16,Linux 为 4 字节 UCS-4 */
#if defined(__WCHAR_MAX__) && __WCHAR_MAX__ <= 0xFFFF
#define WCHAR_IS_UTF16 1
#else
#define WCHAR_IS_UTF16 0
#endif

/* 解码一个码点,返回消耗字节数,坏序列返回 1 且 *cp=0xFFFD */
static int u8_decode(const unsigned char *s, size_t remain, uint32_t *cp)
{
    unsigned char c = s[0];
    if (c < 0x80) { *cp = c; return 1; }
    if ((c & 0xE0) == 0xC0) {
        if (remain < 2 || (s[1] & 0xC0) != 0x80) goto bad;
        *cp = ((uint32_t)(c & 0x1F) << 6) | (s[1] & 0x3F);
        if (*cp < 0x80) goto bad;
        return 2;
    }
    if ((c & 0xF0) == 0xE0) {
        if (remain < 3 || (s[1] & 0xC0) != 0x80 || (s[2] & 0xC0) != 0x80) goto bad;
        *cp = ((uint32_t)(c & 0x0F) << 12) | ((uint32_t)(s[1] & 0x3F) << 6) | (s[2] & 0x3F);
        if (*cp < 0x800 || (*cp >= 0xD800 && *cp <= 0xDFFF)) goto bad;
        return 3;
    }
    if ((c & 0xF8) == 0xF0) {
        if (remain < 4 || (s[1] & 0xC0) != 0x80 || (s[2] & 0xC0) != 0x80 || (s[3] & 0xC0) != 0x80) goto bad;
        *cp = ((uint32_t)(c & 0x07) << 18) | ((uint32_t)(s[1] & 0x3F) << 12)
            | ((uint32_t)(s[2] & 0x3F) << 6) | (s[3] & 0x3F);
        if (*cp < 0x10000 || *cp > 0x10FFFF) goto bad;
        return 4;
    }
bad:
    *cp = 0xFFFD;
    return 1;
}

/* 码点 -> UTF-8 */
static int u8_encode(uint32_t cp, unsigned char *out)
{
    if (cp < 0x80) { out[0] = (unsigned char)cp; return 1; }
    if (cp < 0x800) {
        out[0] = (unsigned char)(0xC0 | (cp >> 6));
        out[1] = (unsigned char)(0x80 | (cp & 0x3F));
        return 2;
    }
    if (cp < 0x10000) {
        out[0] = (unsigned char)(0xE0 | (cp >> 12));
        out[1] = (unsigned char)(0x80 | ((cp >> 6) & 0x3F));
        out[2] = (unsigned char)(0x80 | (cp & 0x3F));
        return 3;
    }
    out[0] = (unsigned char)(0xF0 | (cp >> 18));
    out[1] = (unsigned char)(0x80 | ((cp >> 12) & 0x3F));
    out[2] = (unsigned char)(0x80 | ((cp >> 6) & 0x3F));
    out[3] = (unsigned char)(0x80 | (cp & 0x3F));
    return 4;
}

/* 宽串 -> 码点迭代器(处理 UTF-16 代理对) */
static int wcs_next(const wchar_t *s, size_t i, uint32_t *cp)
{
#if WCHAR_IS_UTF16
    uint16_t u = (uint16_t)s[i];
    if (u >= 0xD800 && u <= 0xDBFF && s[i + 1]) {
        uint16_t lo = (uint16_t)s[i + 1];
        if (lo >= 0xDC00 && lo <= 0xDFFF) {
            *cp = 0x10000 + (((uint32_t)(u - 0xD800) << 10) | (lo - 0xDC00));
            return 2;
        }
    }
    *cp = u;
    return 1;
#else
    *cp = (uint32_t)s[i];
    return 1;
#endif
}

size_t u8_to_wcs(const char *s, wchar_t *out, size_t max)
{
    size_t wi = 0;
    size_t len = 0;
    if (max == 0) return 0;
    if (!s) { out[0] = 0; return 0; }
    while (s[len]) len++;                      /* strlen */

    size_t i = 0;
    while (i < len && wi + 8 <= max) {   /* 预留代理对+结尾空间 */
        uint32_t cp;
        int n = u8_decode((const unsigned char *)s + i, len - i, &cp);
        i += (size_t)n;
#if WCHAR_IS_UTF16
        if (cp >= 0x10000) {
            cp -= 0x10000;
            out[wi++] = (wchar_t)(0xD800 + (cp >> 10));
            out[wi++] = (wchar_t)(0xDC00 + (cp & 0x3FF));
        } else
#endif
        out[wi++] = (wchar_t)cp;
    }
    out[wi] = 0;
    return wi;
}

size_t wcs_to_u8(const wchar_t *s, char *out, size_t max)
{
    size_t oi = 0, i = 0;
    if (max == 0) return 0;
    if (!s) { out[0] = 0; return 0; }
    while (s[i]) {
        uint32_t cp;
        int wn = wcs_next(s, i, &cp);
        i += (size_t)wn;
        unsigned char tmp[4];
        int n = u8_encode(cp, tmp);
        if (oi + (size_t)n + 1 > max) break;
        for (int k = 0; k < n; k++) out[oi++] = (char)tmp[k];
    }
    out[oi] = 0;
    return oi;
}

int u8_valid(const unsigned char *s, size_t n)
{
    size_t i = 0;
    while (i < n) {
        uint32_t cp;
        int used = u8_decode(s + i, n - i, &cp);
        /* 判断是否走了 bad 路径:重新检查首字节 */
        unsigned char c = s[i];
        int ok = 0;
        if (c < 0x80) ok = (used == 1);
        else if ((c & 0xE0) == 0xC0) ok = (used == 2);
        else if ((c & 0xF0) == 0xE0) ok = (used == 3);
        else if ((c & 0xF8) == 0xF0) ok = (used == 4);
        if (!ok) return 0;
        i += (size_t)used;
    }
    return 1;
}
