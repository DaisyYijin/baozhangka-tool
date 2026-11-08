/* ============================================================
 * dlg_settings.c - 设置对话框(主题色/快捷按钮/快捷键/预留扩展)
 * 模态小循环;色板由主窗口 WM_PAINT 自绘(非 STATIC 子窗口,
 * 避免被 WM_CTLCOLORSTATIC 白色刷子覆盖)
 * ============================================================ */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <windowsx.h>
#include "settings.h"
#include "ui_shared.h"
#include <wchar.h>
#include <stdio.h>
#include <string.h>

static const wchar_t SET_DLG_CLASS[] = L"AcSettingsDlg";
#define SET_W 400
#define SET_H 420

#define SID_OK      1
#define SID_CANCEL  2
#define SID_CHK_FLOAT  104
#define SID_CHK_PICK    105
#define SID_HK_FLOAT    120
#define SID_HK_PAUSE    121
#define SID_HK_STOP     122
#define SID_HELP1       130   /* 快捷键说明行1(STATIC,CTLCOLOR 控底色) */
#define SID_HELP2       131   /* 快捷键说明行2 */
#define SID_HELP3       132   /* 预留区说明 */

/* ---- 色板几何(主窗口自绘区) ---- */
#define PAL_X   20
#define PAL_Y   36
#define PAL_CW  60               /* 色块宽 */
#define PAL_CH  28               /* 色块高 */
#define PAL_GAP 8                /* 间距 */
#define PAL_COLS 4

/* 快捷键选项 */
static const struct { int vk; const wchar_t *label; } HK_OPTIONS[] = {
    { VK_F5,     L"F5" },
    { VK_F6,     L"F6 (默认)" },
    { VK_F7,     L"F7" },
    { VK_F8,     L"F8" },
    { VK_F9,     L"F9" },
    { VK_F10,    L"F10" },
    { VK_F11,    L"F11" },
    { VK_F12,    L"F12" },
    { VK_PAUSE,  L"Pause" },
    { VK_SCROLL, L"ScrollLock" },
    { VK_INSERT, L"Insert" },
    { VK_HOME,   L"Home" },
};
#define HK_OPT_N ((int)(sizeof(HK_OPTIONS) / sizeof(HK_OPTIONS[0])))

static struct {
    HWND hwnd, ok, cancel;
    HWND hkFloat, hkPause, hkStop;
    int done, result;
    COLORREF theme;
    int hkFloatVk, hkPauseVk, hkStopVk;
} g_st;

/* 色块命中:返回索引 0-7,-1=未命中 */
static int swatch_hit(int x, int y)
{
    int col = (x - PAL_X) / (PAL_CW + PAL_GAP);
    int row = (y - PAL_Y) / (PAL_CH + PAL_GAP);
    if (x < PAL_X || y < PAL_Y) return -1;
    if (col < 0 || col >= PAL_COLS) return -1;
    int idx = row * PAL_COLS + col;
    if (idx < 0 || idx >= 8) return -1;
    /* 检查是否在色块内(而非间隙) */
    int bx = PAL_X + col * (PAL_CW + PAL_GAP);
    int by = PAL_Y + row * (PAL_CH + PAL_GAP);
    if (x >= bx && x < bx + PAL_CW && y >= by && y < by + PAL_CH)
        return idx;
    return -1;
}

static LRESULT CALLBACK set_wndproc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_ERASEBKGND:
        return 1;

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC dc = BeginPaint(hwnd, &ps);
        RECT rc;
        GetClientRect(hwnd, &rc);

        /* 白底 */
        HBRUSH brBg = CreateSolidBrush(CARD_BG);
        FillRect(dc, &rc, brBg);
        DeleteObject(brBg);
        SetBkMode(dc, TRANSPARENT);

        /* ---- 标题:主题色 ---- */
        HGDIOBJ of = SelectObject(dc, g_uiFontBold);
        SetTextColor(dc, RGB(0x2E,0x2E,0x2E));
        TextOutW(dc, 16, 10, L"\x4E3B\x9898\x8272", 3);
        SelectObject(dc, of);

        /* ---- 色板(主窗口自绘) ---- */
        {
            int n = 0;
            const COLORREF *ps = settings_theme_presets(&n);
            for (int i = 0; i < n && i < 8; i++) {
                int col = i % PAL_COLS, row = i / PAL_COLS;
                int bx = PAL_X + col * (PAL_CW + PAL_GAP);
                int by = PAL_Y + row * (PAL_CH + PAL_GAP);
                int sel = (ps[i] == g_st.theme);
                HBRUSH br = CreateSolidBrush(ps[i]);
                RECT sr = { bx, by, bx + PAL_CW, by + PAL_CH };
                FillRect(dc, &sr, br);
                DeleteObject(br);
                /* 边框:选中=粗黑框,未选=浅灰 */
                HPEN p = CreatePen(PS_SOLID, sel ? 3 : 1,
                                   sel ? RGB(0x22,0x22,0x22) : RGB(0xC0,0xC0,0xC0));
                HGDIOBJ op = SelectObject(dc, p);
                HBRUSH ob = (HBRUSH)SelectObject(dc, GetStockObject(NULL_BRUSH));
                Rectangle(dc, sr.left, sr.top, sr.right, sr.bottom);
                SelectObject(dc, op);
                SelectObject(dc, ob);
                DeleteObject(p);
                /* 选中打勾标记 */
                if (sel) {
                    SetTextColor(dc, RGB(255,255,255));
                    TextOutW(dc, bx + 4, by + 4, L"\x2713", 1);   /* ✓ */
                }
            }
            /* 提示文字 */
            HGDIOBJ of2 = SelectObject(dc, g_uiFont);
            SetTextColor(dc, RGB(0x8A,0x8A,0x8A));
            TextOutW(dc, 16, PAL_Y + 2 * (PAL_CH + PAL_GAP) + 6,
                     L"\x70B9\x9009\x5373\x6362\x8272", 5);   /* 点选即换色 */
            SelectObject(dc, of2);
        }

        /* ---- 标题:全局快捷键 ---- */
        of = SelectObject(dc, g_uiFontBold);
        SetTextColor(dc, RGB(0x2E,0x2E,0x2E));
        TextOutW(dc, 16, 138, L"\x5168\x5C40\x5FEB\x6377\x952E", 5);
        /* ---- 标题:更多设置 ---- */
        TextOutW(dc, 16, 294, L"\x66F4\x591A\x8BBE\x7F6E\xFF08\x9884\x7559\xFF09", 8);
        SelectObject(dc, of);

        EndPaint(hwnd, &ps);
        return 0;
    }

    case WM_CTLCOLORSTATIC: {
        /* 说明文字(STATIC):白底+浅灰字;普通标签:白底+深灰字(显式控制避免系统默认灰底) */
        HDC hdc = (HDC)wp;
        int cid = GetDlgCtrlID((HWND)lp);
        SetBkColor(hdc, CARD_BG);
        SetTextColor(hdc, (cid == SID_HELP1 || cid == SID_HELP2 || cid == SID_HELP3)
                           ? RGB(0x8A,0x8A,0x8A) : RGB(0x3A,0x3A,0x3A));
        return (LRESULT)GetStockObject(WHITE_BRUSH);
    }

    case WM_LBUTTONUP: {
        int x = GET_X_LPARAM(lp), y = GET_Y_LPARAM(lp);
        int idx = swatch_hit(x, y);
        if (idx >= 0) {
            int n = 0;
            const COLORREF *ps = settings_theme_presets(&n);
            g_st.theme = ps[idx];
            settings_set_theme_color(g_st.theme);
            InvalidateRect(hwnd, NULL, FALSE);   /* 重绘色板选中标记 */
        }
        return 0;
    }

    case WM_COMMAND: {
        int id = LOWORD(wp);
        if (id == SID_OK) {
            int sf = (int)SendMessageW(g_st.hkFloat, CB_GETCURSEL, 0, 0);
            int sp = (int)SendMessageW(g_st.hkPause, CB_GETCURSEL, 0, 0);
            int ss = (int)SendMessageW(g_st.hkStop,  CB_GETCURSEL, 0, 0);
            if (sf >= 0 && sf < HK_OPT_N) g_st.hkFloatVk = HK_OPTIONS[sf].vk;
            if (sp >= 0 && sp < HK_OPT_N) g_st.hkPauseVk = HK_OPTIONS[sp].vk;
            if (ss >= 0 && ss < HK_OPT_N) g_st.hkStopVk  = HK_OPTIONS[ss].vk;
            g_st.result = 1;
            g_st.done = 1;
        } else if (id == SID_CANCEL) {
            g_st.result = 0;
            g_st.done = 1;
        }
        return 0;
    }

    case WM_CLOSE:
        g_st.result = 0;
        g_st.done = 1;
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

int settings_dialog(HWND owner)
{
    memset(&g_st, 0, sizeof(g_st));
    g_st.theme = ThemeColor();
    g_st.hkFloatVk = settings_float_hotkey();
    g_st.hkPauseVk = settings_pause_hotkey();
    g_st.hkStopVk  = settings_stop_hotkey();

    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = set_wndproc;
    wc.hInstance = GetModuleHandleW(NULL);
    wc.lpszClassName = SET_DLG_CLASS;
    wc.hbrBackground = (HBRUSH)GetStockObject(WHITE_BRUSH);
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    RegisterClassW(&wc);

    RECT rcOwner;
    GetWindowRect(owner, &rcOwner);
    int cx = rcOwner.left + ((rcOwner.right - rcOwner.left) - SET_W) / 2;
    int cy = rcOwner.top + ((rcOwner.bottom - rcOwner.top) - SET_H) / 2;
    if (cx < 0) cx = 40;
    if (cy < 0) cy = 40;

    g_st.hwnd = CreateWindowExW(WS_EX_DLGMODALFRAME, SET_DLG_CLASS,
        L"\x8BBE\x7F6E",                        /* 设置 */
        WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU,
        cx, cy, SET_W, SET_H,
        owner, NULL, wc.hInstance, NULL);
    if (!g_st.hwnd) return 0;

    /* --- 全局快捷键(y=158 区,三行下拉) --- */
    static const struct { const wchar_t *lbl; int defIdx; int id; } hkRows[] = {
        { L"\x5F00\x59CB\x952E:",  1, SID_HK_FLOAT },   /* 开始键: */
        { L"\x6682\x505C\x952E:",  2, SID_HK_PAUSE },   /* 暂停键: */
        { L"\x505C\x6B62\x952E:",  7, SID_HK_STOP  },   /* 停止键: */
    };
    HWND *hkHwnds[] = { &g_st.hkFloat, &g_st.hkPause, &g_st.hkStop };
    int *hkVals[]   = { &g_st.hkFloatVk, &g_st.hkPauseVk, &g_st.hkStopVk };
    for (int r = 0; r < 3; r++) {
        HWND lbl = CreateWindowExW(0, L"STATIC", hkRows[r].lbl,
            WS_CHILD | WS_VISIBLE, 20, 157 + r * 26, 64, 22,
            g_st.hwnd, NULL, wc.hInstance, NULL);
        if (lbl && g_uiFont)   /* 标签统一雅黑,与下拉/说明/按钮一致 */
            SendMessageW(lbl, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        *hkHwnds[r] = CreateWindowExW(0, L"COMBOBOX", L"",
            CBS_DROPDOWNLIST | WS_CHILD | WS_VISIBLE | WS_VSCROLL,
            88, 155 + r * 26, 110, 250,
            g_st.hwnd, (HMENU)hkRows[r].id, wc.hInstance, NULL);
        for (int i = 0; i < HK_OPT_N; i++) {
            SendMessageW(*hkHwnds[r], CB_ADDSTRING, 0, (LPARAM)HK_OPTIONS[i].label);
            if (HK_OPTIONS[i].vk == *hkVals[r])
                SendMessageW(*hkHwnds[r], CB_SETCURSEL, i, 0);
        }
        if (SendMessageW(*hkHwnds[r], CB_GETCURSEL, 0, 0) == CB_ERR)
            SendMessageW(*hkHwnds[r], CB_SETCURSEL, hkRows[r].defIdx, 0);
    }

    /* --- 说明文字(STATIC ×3:快捷键说明两行+预留区一行;高 22 防裁剪,行距 24 与后续区不叠) --- */
    CreateWindowExW(0, L"STATIC",
        L"\x5F00\x59CB=\x542F\x52A8\x4EFB\x52A1\x20\x20\x6682\x505C=\x6682\x505C/\x7EE7\x7EED\x20\x20\x505C\x6B62=Ctrl+\x6240\x9009\x952E",   /* 开始=启动任务  暂停=暂停/继续  停止=Ctrl+所选键 */
        WS_CHILD | WS_VISIBLE, 20, 240, 364, 22,
        g_st.hwnd, (HMENU)SID_HELP1, wc.hInstance, NULL);
    CreateWindowExW(0, L"STATIC",
        L"\x4FEE\x6539\x540E\x70B9\x300C\x786E\x5B9A\x300D\x7ACB\x5373\x751F\x6548\xFF0C\x65E0\x9700\x91CD\x542F",   /* 修改后点「确定」立即生效,无需重启 */
        WS_CHILD | WS_VISIBLE, 20, 264, 364, 22,
        g_st.hwnd, (HMENU)SID_HELP2, wc.hInstance, NULL);
    CreateWindowExW(0, L"STATIC",
        L"\x540E\x7EED\x7248\x672C\x5C06\x5728\x6B64\x589E\x52A0\x66F4\x591A\x914D\x7F6E\x9879",   /* 后续版本将在此增加更多配置项 */
        WS_CHILD | WS_VISIBLE, 16, 316, 340, 22,
        g_st.hwnd, (HMENU)SID_HELP3, wc.hInstance, NULL);

    /* --- 底部按钮 --- */
    g_st.ok = CreateWindowExW(0, L"BUTTON",
        L"\x786E\x5B9A",
        WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
        SET_W - 190, SET_H - 72, 80, 30, g_st.hwnd, (HMENU)SID_OK, wc.hInstance, NULL);
    g_st.cancel = CreateWindowExW(0, L"BUTTON",
        L"\x53D6\x6D88",
        WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
        SET_W - 100, SET_H - 72, 80, 30, g_st.hwnd, (HMENU)SID_CANCEL, wc.hInstance, NULL);

    if (g_uiFont) {
        HWND kids[] = { g_st.hkFloat, g_st.hkPause, g_st.hkStop,
                        g_st.ok, g_st.cancel, NULL };
        for (int i = 0; kids[i]; i++)
            SendMessageW(kids[i], WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        /* 说明 STATIC 与快捷键标签 */
        for (int cid = SID_HELP1; cid <= SID_HELP3; cid++) {
            HWND h = GetDlgItem(g_st.hwnd, cid);
            if (h) SendMessageW(h, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        }
    }

    ShowWindow(g_st.hwnd, SW_SHOW);
    UpdateWindow(g_st.hwnd);
    EnableWindow(owner, FALSE);
    g_uiDlgActive = 1;
    SetTimer(g_st.hwnd, 5, 30, NULL);

    MSG msg;
    while (!g_st.done) {
        if (PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) {
            if (msg.message == WM_KEYDOWN && msg.wParam == VK_ESCAPE) { g_st.result = 0; break; }
            if (msg.message == WM_KEYDOWN && msg.wParam == VK_RETURN) {
                PostMessageW(g_st.hwnd, WM_COMMAND, MAKEWPARAM(SID_OK, 0), 0);
                continue;
            }
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        } else {
            WaitMessage();
        }
    }

    g_uiDlgActive = 0;
    KillTimer(g_st.hwnd, 5);
    EnableWindow(owner, TRUE);
    DestroyWindow(g_st.hwnd);
    UnregisterClassW(SET_DLG_CLASS, wc.hInstance);
    SetForegroundWindow(owner);
    return g_st.result;
}

/* 对话框结束后取所选值(gui.c 使用) */
int settings_dlg_float_hotkey(void) { return g_st.hkFloatVk; }
int settings_dlg_pause_hotkey(void) { return g_st.hkPauseVk; }
int settings_dlg_stop_hotkey(void)  { return g_st.hkStopVk; }
