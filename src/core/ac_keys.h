/* ============================================================
 * ac_keys.h - 统一键码定义与组合键解析(平台无关)
 * 平台层负责把 ACK_xxx 映射为 Windows VK 或 X11 keysym
 * ============================================================ */
#ifndef AC_KEYS_H
#define AC_KEYS_H

#include "ac_defs.h"

#ifdef __cplusplus
extern "C" {
#endif

/* 修饰键 */
enum {
    ACK_LCTRL = 1, ACK_LSHIFT, ACK_LALT, ACK_LWIN,
    ACK_RCTRL, ACK_RSHIFT, ACK_RALT, ACK_RWIN,
};

/* 字母/数字/功能键用区间值 */
#define ACK_IS_ALPHA(k) ((k) >= 100 && (k) <= 125)   /* A..Z */
#define ACK_IS_DIGIT(k) ((k) >= 130 && (k) <= 139)   /* 0..9 */
#define ACK_IS_FUNC(k)  ((k) >= 150 && (k) <= 173)   /* F1..F24 */
#define ACK_ALPHA(k)    ((k) - 100)                  /* 'A'..'Z' */
#define ACK_DIGIT(k)    ((k) - 130)                  /* '0'..'9' */
#define ACK_FUNC(k)     ((k) - 150 + 1)              /* 1..24 */
#define ACK_CHAR(c)     (100 + (((c) | 32) - 'a'))   /* 字母字符 -> 键码 */

enum {
    ACK_ENTER = 200, ACK_TAB, ACK_SPACE, ACK_ESC, ACK_BACKSPACE, ACK_DELETE,
    ACK_UP, ACK_DOWN, ACK_LEFT, ACK_RIGHT,
    ACK_HOME, ACK_END, ACK_PAGEUP, ACK_PAGEDOWN,
    ACK_PRINTSCREEN, ACK_CAPSLOCK, ACK_NUMLOCK, ACK_SCROLLLOCK,
    ACK_COMMA, ACK_PERIOD, ACK_SLASH, ACK_BACKSLASH, ACK_SEMICOLON,
    ACK_QUOTE, ACK_LBRACKET, ACK_RBRACKET, ACK_BACKQUOTE,
    ACK_MINUS, ACK_EQUAL,
};

/* 解析组合键串,如 "ctrl+shift+a"、"F5"、"win+r"。
   成功返回 0,*n 为键数;失败返回 -1。 */
int key_parse(const wchar_t *combo, int vks[AC_MAX_KEYS], int *n);

#ifdef __cplusplus
}
#endif
#endif
