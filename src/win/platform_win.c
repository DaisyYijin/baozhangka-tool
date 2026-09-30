/* ============================================================
 * platform_win.c - Windows 平台实现(XP~Win11)
 * SendInput 输入合成 / 剪贴板粘贴 / 可中断睡眠 / GBK转换
 * ============================================================ */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include "ac_defs.h"
#include "ac_keys.h"
#include "engine.h"
#include "u8.h"
#include <stdlib.h>
#include <string.h>

volatile int g_stop_flag = 0;   /* 停止标志(GUI 置 1 停止引擎) */

/* ---------------- ACK -> VK 映射 ---------------- */

static int ack_to_vk(int k)
{
    if (ACK_IS_ALPHA(k)) return 'A' + ACK_ALPHA(k);
    if (ACK_IS_DIGIT(k)) return '0' + ACK_DIGIT(k);
    if (ACK_IS_FUNC(k))  return VK_F1 + ACK_FUNC(k) - 1;
    switch (k) {
    case ACK_LCTRL:   return VK_LCONTROL;
    case ACK_RCTRL:   return VK_RCONTROL;
    case ACK_LSHIFT:  return VK_LSHIFT;
    case ACK_RSHIFT:  return VK_RSHIFT;
    case ACK_LALT:    return VK_LMENU;
    case ACK_RALT:    return VK_RMENU;
    case ACK_LWIN:    return VK_LWIN;
    case ACK_RWIN:    return VK_RWIN;
    case ACK_ENTER:   return VK_RETURN;
    case ACK_TAB:     return VK_TAB;
    case ACK_SPACE:   return VK_SPACE;
    case ACK_ESC:     return VK_ESCAPE;
    case ACK_BACKSPACE: return VK_BACK;
    case ACK_DELETE:  return VK_DELETE;
    case ACK_UP:      return VK_UP;
    case ACK_DOWN:    return VK_DOWN;
    case ACK_LEFT:    return VK_LEFT;
    case ACK_RIGHT:   return VK_RIGHT;
    case ACK_HOME:    return VK_HOME;
    case ACK_END:     return VK_END;
    case ACK_PAGEUP:  return VK_PRIOR;
    case ACK_PAGEDOWN:return VK_NEXT;
    case ACK_PRINTSCREEN: return VK_SNAPSHOT;
    case ACK_CAPSLOCK:return VK_CAPITAL;
    case ACK_NUMLOCK: return VK_NUMLOCK;
    case ACK_SCROLLLOCK: return VK_SCROLL;
    case ACK_COMMA:   return VK_OEM_COMMA;
    case ACK_PERIOD:  return VK_OEM_PERIOD;
    case ACK_SLASH:   return VK_OEM_2;
    case ACK_BACKSLASH: return VK_OEM_5;
    case ACK_SEMICOLON: return VK_OEM_1;
    case ACK_QUOTE:   return VK_OEM_7;
    case ACK_LBRACKET:return VK_OEM_4;
    case ACK_RBRACKET:return VK_OEM_6;
    case ACK_BACKQUOTE: return VK_OEM_3;
    case ACK_MINUS:   return VK_OEM_MINUS;
    case ACK_EQUAL:   return VK_OEM_PLUS;
    default: return 0;
    }
}

/* ---------------- 鼠标 ---------------- */

/* 窗口是否属于本进程 */
static int is_own_window(HWND h)
{
    DWORD pid = 0;
    GetWindowThreadProcessId(h, &pid);
    return h && pid == GetCurrentProcessId();
}

static INPUT g_input[16];

static void win_mouse_move(int x, int y)
{
    INPUT *in = &g_input[0];
    memset(in, 0, sizeof(INPUT));
    in->type = INPUT_MOUSE;
    in->mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
    /* 多显示器:用虚拟屏幕归一化坐标 */
    int vx = GetSystemMetrics(SM_XVIRTUALSCREEN);
    int vy = GetSystemMetrics(SM_YVIRTUALSCREEN);
    int vw = GetSystemMetrics(SM_CXVIRTUALSCREEN);
    int vh = GetSystemMetrics(SM_CYVIRTUALSCREEN);
    if (vw <= 0) vw = 1;
    if (vh <= 0) vh = 1;
    in->mi.dx = (x - vx) * 65535 / (vw - 1);
    in->mi.dy = (y - vy) * 65535 / (vh - 1);
    SendInput(1, in, sizeof(INPUT));
}

static int btn_flags(int btn, DWORD *down, DWORD *up)
{
    switch (btn) {
    case BTN_LEFT:   *down = MOUSEEVENTF_LEFTDOWN;  *up = MOUSEEVENTF_LEFTUP;  return 1;
    case BTN_RIGHT:  *down = MOUSEEVENTF_RIGHTDOWN; *up = MOUSEEVENTF_RIGHTUP; return 1;
    case BTN_MIDDLE: *down = MOUSEEVENTF_MIDDLEDOWN;*up = MOUSEEVENTF_MIDDLEUP;return 1;
    default: return 0;
    }
}

static void win_mouse_down(int btn)
{
    /* 点击点若落在本工具自己的窗口上(主窗/标记盖住了目标),先最小化
       主窗把位置让出来,否则这次点击会点在本工具上而落空 */
    POINT pt;
    if (GetCursorPos(&pt)) {
        HWND h = WindowFromPoint(pt);
        if (is_own_window(h)) {
            HWND mainw = FindWindowW(L"AcAutoClickerMain", NULL);
            if (mainw) {
                ShowWindow(mainw, SW_MINIMIZE);
                Sleep(200);
            }
        }
    }

    DWORD d, u;
    if (!btn_flags(btn, &d, &u)) return;
    INPUT *in = &g_input[0];
    memset(in, 0, sizeof(INPUT));
    in->type = INPUT_MOUSE;
    in->mi.dwFlags = d;
    SendInput(1, in, sizeof(INPUT));
}

static void win_mouse_up(int btn)
{
    DWORD d, u;
    if (!btn_flags(btn, &d, &u)) return;
    INPUT *in = &g_input[0];
    memset(in, 0, sizeof(INPUT));
    in->type = INPUT_MOUSE;
    in->mi.dwFlags = u;
    SendInput(1, in, sizeof(INPUT));
}

static void win_mouse_scroll(int amount)
{
    INPUT *in = &g_input[0];
    memset(in, 0, sizeof(INPUT));
    in->type = INPUT_MOUSE;
    in->mi.dwFlags = MOUSEEVENTF_WHEEL;
    in->mi.mouseData = (DWORD)(amount * WHEEL_DELTA);
    SendInput(1, in, sizeof(INPUT));
}

/* ---------------- 键盘 ---------------- */

static void win_key_combo(const int *vks, int n)
{
    if (n <= 0 || n > AC_MAX_KEYS) return;
    INPUT in[AC_MAX_KEYS * 2];
    int m = 0;
    for (int i = 0; i < n; i++) {
        int vk = ack_to_vk(vks[i]);
        if (!vk) continue;
        memset(&in[m], 0, sizeof(INPUT));
        in[m].type = INPUT_KEYBOARD;
        in[m].ki.wVk = (WORD)vk;
        in[m].ki.wScan = (WORD)MapVirtualKeyW(vk, MAPVK_VK_TO_VSC);
        in[m].ki.dwFlags = 0;
        m++;
    }
    /* 逆序释放 */
    for (int i = n - 1; i >= 0; i--) {
        int vk = ack_to_vk(vks[i]);
        if (!vk) continue;
        memset(&in[m], 0, sizeof(INPUT));
        in[m].type = INPUT_KEYBOARD;
        in[m].ki.wVk = (WORD)vk;
        in[m].ki.wScan = (WORD)MapVirtualKeyW(vk, MAPVK_VK_TO_VSC);
        in[m].ki.dwFlags = KEYEVENTF_KEYUP;
        m++;
    }
    if (m) SendInput((UINT)m, in, sizeof(INPUT));
}

/* 发送 Ctrl+V */
static void send_ctrl_v(void)
{
    int vks[2] = { ACK_LCTRL, ACK_CHAR('V') };
    win_key_combo(vks, 2);
}

/* ---------------- 剪贴板输入 ---------------- */

/* 打开剪贴板(带重试,目标程序可能占用) */
static int clip_open(int retries)
{
    for (int i = 0; i < retries; i++) {
        if (OpenClipboard(NULL)) return 1;
        Sleep(10);
    }
    return 0;
}

static HGLOBAL clip_backup(void)
{
    HANDLE h = GetClipboardData(CF_UNICODETEXT);
    if (!h) return NULL;
    SIZE_T sz = GlobalSize(h);
    HGLOBAL copy = GlobalAlloc(GMEM_MOVEABLE, sz);
    if (!copy) return NULL;
    void *dst = GlobalLock(copy);
    void *src = GlobalLock(h);
    if (dst && src) memcpy(dst, src, sz);
    if (dst) GlobalUnlock(copy);
    if (src) GlobalUnlock(h);
    return copy;
}

static int clip_restore(HGLOBAL backup)
{
    if (!backup) return 0;
    if (!clip_open(20)) { GlobalFree(backup); return 0; }
    EmptyClipboard();
    wchar_t *p = (wchar_t *)GlobalLock(backup);
    if (p) {
        size_t len = 0;
        while (p[len]) len++;
        HGLOBAL h = GlobalAlloc(GMEM_MOVEABLE, (len + 1) * sizeof(wchar_t));
        if (h) {
            wchar_t *q = (wchar_t *)GlobalLock(h);
            if (q) {
                memcpy(q, p, (len + 1) * sizeof(wchar_t));
                GlobalUnlock(h);
                SetClipboardData(CF_UNICODETEXT, h);
            } else GlobalFree(h);
        }
        GlobalUnlock(backup);
    }
    CloseClipboard();
    GlobalFree(backup);
    return 1;
}

static void win_text_paste(const wchar_t *text)
{
    if (!text || !text[0]) return;

    /* 输入发给当前焦点窗口:若焦点还停在本工具(用户点完开始没切换),
       最小化主窗口把前台让给用户之前的目标窗口,否则粘贴会静默落空 */
    HWND fg = GetForegroundWindow();
    if (is_own_window(fg)) {
        HWND mainw = FindWindowW(L"AcAutoClickerMain", NULL);
        if (mainw) ShowWindow(mainw, SW_MINIMIZE);
        Sleep(250);
    }

    if (!clip_open(10)) return;
    HGLOBAL backup = clip_backup();

    size_t len = 0;
    while (text[len]) len++;
    HGLOBAL h = GlobalAlloc(GMEM_MOVEABLE, (len + 1) * sizeof(wchar_t));
    if (!h) { CloseClipboard(); clip_restore(backup); return; }
    wchar_t *q = (wchar_t *)GlobalLock(h);
    if (!q) { GlobalFree(h); CloseClipboard(); clip_restore(backup); return; }
    memcpy(q, text, (len + 1) * sizeof(wchar_t));
    GlobalUnlock(h);
    EmptyClipboard();
    SetClipboardData(CF_UNICODETEXT, h);
    CloseClipboard();

    send_ctrl_v();
    Sleep(400);                      /* 等目标程序读取剪贴板(慢程序需较长时间) */

    clip_restore(backup);
}

/* 屏幕取色 0xRRGGBB,失败 -1 */
static int win_get_pixel(int x, int y)
{
    HDC dc = GetDC(NULL);
    COLORREF c = GetPixel(dc, x, y);
    ReleaseDC(NULL, dc);
    if (c == CLR_INVALID) return -1;
    return (int)(((c & 0xFF) << 16) | (c & 0x00FF00) | ((c >> 16) & 0xFF));
}

struct fw_ctx { const wchar_t *needle; int found; };

static BOOL CALLBACK fw_cb(HWND h, LPARAM lp)
{
    struct fw_ctx *c = (struct fw_ctx *)lp;
    if (!IsWindowVisible(h)) return TRUE;
    wchar_t t[200];
    int n = GetWindowTextW(h, t, 200);
    if (n > 0 && wcsstr(t, c->needle)) { c->found = 1; return FALSE; }
    return TRUE;
}

/* 标题包含指定文本的可见窗口是否存在 */
static int win_find_window(const wchar_t *titleContains)
{
    if (!titleContains || !titleContains[0]) return 1;
    struct fw_ctx c = { titleContains, 0 };
    EnumWindows(fw_cb, (LPARAM)&c);
    return c.found;
}

/* ---------------- 其它 ---------------- */

static void win_sleep_ms(int ms)
{
    /* 分片睡眠,由调用方检查停止标志;此处再留一个快速返回机制:
       sleep 期间无法打断(简单实现),粒度 20ms 足够灵敏 */
    int left = ms;
    while (left > 0) {
        int n = left > 20 ? 20 : left;
        Sleep(n);
        left -= n;
    }
}

static uint32_t win_rand(void)
{
    return ac_lcg_rand();
}

/* GBK(CP936)-> UTF-8,用于非 UTF-8 的 ANSI CSV(csv_parse 回调) */
char *win_gbk_to_utf8(const char *raw, size_t rawLen)
{
    int wlen = MultiByteToWideChar(936, 0, raw, (int)rawLen, NULL, 0);
    if (wlen <= 0) return NULL;
    wchar_t *w = (wchar_t *)malloc((size_t)(wlen + 1) * sizeof(wchar_t));
    if (!w) return NULL;
    MultiByteToWideChar(936, 0, raw, (int)rawLen, w, wlen);
    w[wlen] = 0;
    /* 估算 UTF-8 长度 */
    int ulen = WideCharToMultiByte(CP_UTF8, 0, w, wlen, NULL, 0, NULL, NULL);
    char *u = NULL;
    if (ulen > 0) {
        u = (char *)malloc((size_t)ulen + 1);
        if (u) {
            WideCharToMultiByte(CP_UTF8, 0, w, wlen, u, ulen, NULL, NULL);
            u[ulen] = 0;
        }
    }
    free(w);
    return u;
}

/* 供 GUI 使用的平台操作集 */
Platform *win_platform(void)
{
    static Platform p;
    static int inited = 0;
    if (!inited) {
        memset(&p, 0, sizeof(p));
        p.mouse_move   = win_mouse_move;
        p.mouse_down   = win_mouse_down;
        p.mouse_up     = win_mouse_up;
        p.mouse_scroll = win_mouse_scroll;
        p.key_combo    = win_key_combo;
        p.text_paste   = win_text_paste;
        p.sleep_ms     = win_sleep_ms;
        p.rand         = win_rand;
        p.get_pixel    = win_get_pixel;
        p.find_window  = win_find_window;
        p.stop         = &g_stop_flag;
        inited = 1;
        ac_srand((uint32_t)GetTickCount() ^ (uint32_t)(ptrdiff_t)&g_stop_flag);
    }
    return &p;
}
