/* ============================================================
 * platform_x11.c - Linux 输入合成(X11 + XTest)
 * 鼠标/键盘合成、滚轮、可中断睡眠、热键轮询
 * 剪贴板由 GUI 侧(GTK)协助,见 x11_text_paste
 * ============================================================ */
#define _DEFAULT_SOURCE          /* useconds_t(usleep) */
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/keysym.h>
#include <X11/extensions/XTest.h>
#include <unistd.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include "platform_x11.h"
#include "engine.h"
#include "ac_keys.h"
#include "u8.h"

volatile int g_stop_flag = 0;

static Display *g_dpy = NULL;

static Display *xd(void)
{
    if (!g_dpy) g_dpy = XOpenDisplay(NULL);
    return g_dpy;
}

/* ---------------- ACK -> X Keysym ---------------- */

static unsigned long ack_to_keysym(int k)
{
    if (ACK_IS_ALPHA(k)) return XK_a + ACK_ALPHA(k);
    if (ACK_IS_DIGIT(k)) return XK_0 + ACK_DIGIT(k);
    if (ACK_IS_FUNC(k))  return XK_F1 + ACK_FUNC(k) - 1;
    switch (k) {
    case ACK_LCTRL:   return XK_Control_L;
    case ACK_RCTRL:   return XK_Control_R;
    case ACK_LSHIFT:  return XK_Shift_L;
    case ACK_RSHIFT:  return XK_Shift_R;
    case ACK_LALT:    return XK_Alt_L;
    case ACK_RALT:    return XK_Alt_R;
    case ACK_LWIN:    return XK_Super_L;
    case ACK_RWIN:    return XK_Super_R;
    case ACK_ENTER:   return XK_Return;
    case ACK_TAB:     return XK_Tab;
    case ACK_SPACE:   return XK_space;
    case ACK_ESC:     return XK_Escape;
    case ACK_BACKSPACE: return XK_BackSpace;
    case ACK_DELETE:  return XK_Delete;
    case ACK_UP:      return XK_Up;
    case ACK_DOWN:    return XK_Down;
    case ACK_LEFT:    return XK_Left;
    case ACK_RIGHT:   return XK_Right;
    case ACK_HOME:    return XK_Home;
    case ACK_END:     return XK_End;
    case ACK_PAGEUP:  return XK_Page_Up;
    case ACK_PAGEDOWN:return XK_Page_Down;
    case ACK_PRINTSCREEN: return XK_Print;
    case ACK_CAPSLOCK:return XK_Caps_Lock;
    case ACK_NUMLOCK: return XK_Num_Lock;
    case ACK_SCROLLLOCK: return XK_Scroll_Lock;
    case ACK_COMMA:   return XK_comma;
    case ACK_PERIOD:  return XK_period;
    case ACK_SLASH:   return XK_slash;
    case ACK_BACKSLASH: return XK_backslash;
    case ACK_SEMICOLON: return XK_semicolon;
    case ACK_QUOTE:   return XK_apostrophe;
    case ACK_LBRACKET:return XK_bracketleft;
    case ACK_RBRACKET:return XK_bracketright;
    case ACK_BACKQUOTE: return XK_grave;
    case ACK_MINUS:   return XK_minus;
    case ACK_EQUAL:   return XK_equal;
    default: return 0;
    }
}

/* ---------------- 鼠标 ---------------- */

static int xbtn(int btn)   /* AC btn -> X button number */
{
    switch (btn) {
    case BTN_LEFT: return 1;
    case BTN_MIDDLE: return 2;
    case BTN_RIGHT: return 3;
    default: return 1;
    }
}

static void x_mouse_move(int x, int y)
{
    Display *d = xd();
    if (!d) return;
    XTestFakeMotionEvent(d, -1, x, y, CurrentTime);
    XFlush(d);
}

static void x_mouse_down(int btn)
{
    Display *d = xd();
    if (!d) return;
    XTestFakeButtonEvent(d, xbtn(btn), True, CurrentTime);
    XFlush(d);
}

static void x_mouse_up(int btn)
{
    Display *d = xd();
    if (!d) return;
    XTestFakeButtonEvent(d, xbtn(btn), False, CurrentTime);
    XFlush(d);
}

static void x_mouse_scroll(int amount)
{
    Display *d = xd();
    if (!d) return;
    int button = amount > 0 ? 4 : 5;      /* 4=上 5=下 */
    int n = amount > 0 ? amount : -amount;
    for (int i = 0; i < n; i++) {
        XTestFakeButtonEvent(d, button, True, CurrentTime);
        XTestFakeButtonEvent(d, button, False, CurrentTime);
        usleep(2000);
    }
    XFlush(d);
}

/* ---------------- 键盘 ---------------- */

static void x_key_combo(const int *vks, int n)
{
    Display *d = xd();
    if (!d || n <= 0 || n > AC_MAX_KEYS) return;
    /* 修饰键先按,普通键后按;释放逆序 */
    KeyCode codes[AC_MAX_KEYS];
    for (int i = 0; i < n; i++) {
        unsigned long ks = ack_to_keysym(vks[i]);
        codes[i] = ks ? XKeysymToKeycode(d, (KeySym)ks) : 0;
    }
    for (int i = 0; i < n; i++)
        if (codes[i]) XTestFakeKeyEvent(d, codes[i], True, CurrentTime);
    for (int i = n - 1; i >= 0; i--)
        if (codes[i]) XTestFakeKeyEvent(d, codes[i], False, CurrentTime);
    XFlush(d);
}

/* ---------------- 文本输入(剪贴板由 GUI 层实现) ---------------- */

extern int ac_gtk_clipboard_set(const char *utf8);   /* main.c 实现 */

static void x_text_paste(const wchar_t *text)
{
    if (!text || !text[0]) return;
    char *u8 = (char *)malloc(AC_TEXT_MAX * 3);
    if (!u8) return;
    wcs_to_u8(text, u8, AC_TEXT_MAX * 3 - 1);
    if (ac_gtk_clipboard_set(u8)) {
        usleep(80000);                       /* 等待目标应用读取剪贴板 */
        int vks[2] = { ACK_LCTRL, ACK_CHAR('V') };
        x_key_combo(vks, 2);
        usleep(120000);
    }
    free(u8);
}

/* ---------------- 其它 ---------------- */

static void x_sleep_ms(int ms)
{
    int left = ms;
    while (left > 0) {
        int n = left > 20 ? 20 : left;
        usleep((useconds_t)n * 1000);
        left -= n;
    }
}

static uint32_t x_rand(void) { return ac_lcg_rand(); }

Platform *x11_platform(void)
{
    static Platform p;
    static int inited = 0;
    if (!inited) {
        memset(&p, 0, sizeof(p));
        p.mouse_move = x_mouse_move;
        p.mouse_down = x_mouse_down;
        p.mouse_up = x_mouse_up;
        p.mouse_scroll = x_mouse_scroll;
        p.key_combo = x_key_combo;
        p.text_paste = x_text_paste;
        p.sleep_ms = x_sleep_ms;
        p.rand = x_rand;
        p.get_pixel = NULL;        /* X11 取色暂未实现:判断动作视为不满足 */
        p.find_window = NULL;      /* X11 窗口匹配暂未实现:等待窗口立即通过 */
        p.stop = &g_stop_flag;
        inited = 1;
    }
    return &p;
}

/* ---------------- Ctrl+F12 全局热键轮询 ---------------- */

void x11_hotkey_poll(void)
{
    Display *d = xd();
    if (!d) return;
    static KeyCode ctrlCode = 0, f12Code = 0;
    if (!ctrlCode) {
        ctrlCode = XKeysymToKeycode(d, XK_Control_L);
        f12Code = XKeysymToKeycode(d, XK_F12);
    }
    if (!ctrlCode || !f12Code) return;

    char keys[32];
    memset(keys, 0, sizeof(keys));
    XQueryKeymap(d, keys);

    int ctrlDown = (keys[ctrlCode / 8] >> (ctrlCode % 8)) & 1;
    int f12Down = (keys[f12Code / 8] >> (f12Code % 8)) & 1;
    if (ctrlDown && f12Down) g_stop_flag = 1;    /* 触发停止 */
}
