/* ac_keys.c - 组合键解析 */
#include "ac_keys.h"
#include "u8.h"
#include <string.h>
#include <ctype.h>

struct keyname { const char *name; int code; };

static const struct keyname KEYNAMES[] = {
    { "ctrl",    ACK_LCTRL },   { "lctrl",   ACK_LCTRL },
    { "control", ACK_LCTRL },   { "rctrl",   ACK_RCTRL },
    { "shift",   ACK_LSHIFT },  { "lshift",  ACK_LSHIFT },
    { "rshift",  ACK_RSHIFT },
    { "alt",     ACK_LALT },    { "lalt",    ACK_LALT },
    { "ralt",    ACK_RALT },
    { "win",     ACK_LWIN },    { "lwin",    ACK_LWIN },
    { "rwin",    ACK_RWIN },    { "super",   ACK_LWIN },
    { "meta",    ACK_LWIN },    { "cmd",     ACK_LWIN },
    { "enter",   ACK_ENTER },   { "return",  ACK_ENTER },
    { "tab",     ACK_TAB },
    { "space",   ACK_SPACE },   { "spacebar", ACK_SPACE },
    { "esc",     ACK_ESC },     { "escape",  ACK_ESC },
    { "backspace", ACK_BACKSPACE }, { "bs",   ACK_BACKSPACE },
    { "delete",  ACK_DELETE },  { "del",     ACK_DELETE },
    { "up",      ACK_UP },      { "down",    ACK_DOWN },
    { "left",    ACK_LEFT },    { "right",   ACK_RIGHT },
    { "home",    ACK_HOME },    { "end",     ACK_END },
    { "pageup",  ACK_PAGEUP },  { "pgup",    ACK_PAGEUP },
    { "pagedown", ACK_PAGEDOWN }, { "pgdn",  ACK_PAGEDOWN },
    { "printscreen", ACK_PRINTSCREEN }, { "prtsc", ACK_PRINTSCREEN },
    { "capslock", ACK_CAPSLOCK },
    { "numlock", ACK_NUMLOCK }, { "scrolllock", ACK_SCROLLLOCK },
    { "comma",   ACK_COMMA },   { "period",  ACK_PERIOD },
    { "slash",   ACK_SLASH },   { "backslash", ACK_BACKSLASH },
    { "semicolon", ACK_SEMICOLON }, { "quote", ACK_QUOTE },
    { "lbracket", ACK_LBRACKET }, { "rbracket", ACK_RBRACKET },
    { "backquote", ACK_BACKQUOTE },
    { "minus",   ACK_MINUS },   { "equal",   ACK_EQUAL },
};

/* 单段名 -> 键码 */
static int parse_one(const char *s, size_t n)
{
    char buf[32];
    if (n == 0 || n >= sizeof(buf)) return 0;

    for (size_t i = 0; i < n; i++) {
        char c = (char)tolower((unsigned char)s[i]);
        buf[i] = c;
    }
    buf[n] = 0;

    if (n == 1) {
        char c = buf[0];
        if (c >= 'a' && c <= 'z') return 100 + (c - 'a');
        if (c >= '0' && c <= '9') return 130 + (c - '0');
        switch (c) {
            case ',':  return ACK_COMMA;
            case '.':  return ACK_PERIOD;
            case '/':  return ACK_SLASH;
            case '\\': return ACK_BACKSLASH;
            case ';':  return ACK_SEMICOLON;
            case '\'': return ACK_QUOTE;
            case '[':  return ACK_LBRACKET;
            case ']':  return ACK_RBRACKET;
            case '`':  return ACK_BACKQUOTE;
            case '-':  return ACK_MINUS;
            case '=':  return ACK_EQUAL;
            default:   return 0;
        }
    }

    if (buf[0] == 'f' && n >= 2 && n <= 3) {   /* f1..f24 */
        int v = 0;
        for (size_t i = 1; i < n; i++) {
            if (buf[i] < '0' || buf[i] > '9') return 0;
            v = v * 10 + (buf[i] - '0');
        }
        if (v >= 1 && v <= 24) return 150 + v - 1;
        return 0;
    }

    for (size_t i = 0; i < sizeof(KEYNAMES) / sizeof(KEYNAMES[0]); i++)
        if (strcmp(buf, KEYNAMES[i].name) == 0) return KEYNAMES[i].code;
    return 0;
}

int key_parse(const wchar_t *combo, int vks[AC_MAX_KEYS], int *n)
{
    char s[256];
    if (!combo || !vks || !n) return -1;
    {
        size_t l = wcs_to_u8(combo, s, sizeof(s) - 1);
        if (l == 0) return -1;
    }

    int cnt = 0;
    int sawEmpty = 0;
    size_t i = 0, len = strlen(s);
    while (i <= len && cnt < AC_MAX_KEYS) {
        size_t start = i;
        while (i < len && s[i] != '+') i++;
        /* 去空白 */
        while (start < i && (s[start] == ' ' || s[start] == '\t')) start++;
        size_t e = i;
        while (e > start && (s[e - 1] == ' ' || s[e - 1] == '\t')) e--;
        if (e > start) {
            int k = parse_one(s + start, e - start);
            if (!k) return -1;
            vks[cnt++] = k;
        } else {
            sawEmpty = 1;                      /* 空段("a+" / "a++b" / "+a") */
        }
        if (i >= len) break;
        i++; /* 跳过 '+' */
    }
    if (cnt == 0 || sawEmpty) return -1;       /* 空段视为格式错误 */
    *n = cnt;
    return 0;
}
