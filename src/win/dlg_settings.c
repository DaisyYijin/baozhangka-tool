/* ============================================================
 * dlg_settings.c - 设置对话框(主题色/快捷按钮/悬浮窗快捷键/预留扩展)
 * 模态小循环,风格参照 dlg_edit 的 sched_dialog
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
#define SET_W 380
#define SET_H 360

#define SID_OK      1
#define SID_CANCEL  2
#define SID_CHK_FLOAT  104
#define SID_CHK_PICK    105
#define SID_SWATCH0     110   /* 预设色块 110..117 */
#define SID_HK_FLOAT    120   /* 悬浮窗快捷键下拉 */
#define SID_HK_STOP     121   /* 停止快捷键下拉 */

/* 快捷键选项(下拉):悬浮窗开始键 */
static const struct { int vk; const wchar_t *label; } HK_OPTIONS[] = {
    { VK_F5,     L"F5" },
    { VK_F6,     L"F6(默认)" },
    { VK_F7,     L"F7" },
    { VK_F8,     L"F8" },
    { VK_F9,     L"F9" },
    { VK_F10,    L"F10" },
    { VK_F11,    L"F11" },
    { VK_PAUSE,  L"Pause" },
    { VK_SCROLL, L"ScrollLock" },
};
#define HK_OPT_N ((int)(sizeof(HK_OPTIONS) / sizeof(HK_OPTIONS[0])))

static struct {
    HWND hwnd, ok, cancel;
    HWND chkFloat, chkPick;
    HWND swatch[8];
    HWND hkFloat, hkStop;
    int done, result;
    COLORREF theme;
    int showFloat, showPick;
    int hkFloatVk, hkStopVk;    /* 选择的快捷键 VK 码 */
} g_st;

static void paint_swatch(HWND h, COLORREF c, int sel)
{
    HDC dc = GetDC(h);
    RECT rc;
    GetClientRect(h, &rc);
    HBRUSH br = CreateSolidBrush(c);
    HBRUSH frame = CreateSolidBrush(sel ? RGB(0x33,0x33,0x33) : RGB(0xC8,0xC8,0xC8));
    FillRect(dc, &rc, br);
    FrameRect(dc, &rc, frame);
    if (sel) {
        /* 选中标记:白色对角线 */
        HPEN p = CreatePen(PS_SOLID, 2, RGB(255,255,255));
        HGDIOBJ op = SelectObject(dc, p);
        MoveToEx(dc, rc.left+4, rc.top+4, NULL); LineTo(dc, rc.right-4, rc.bottom-4);
        MoveToEx(dc, rc.right-4, rc.top+4, NULL); LineTo(dc, rc.left+4, rc.bottom-4);
        SelectObject(dc, op);
        DeleteObject(p);
    }
    DeleteObject(br);
    DeleteObject(frame);
    ReleaseDC(h, dc);
}

static void refresh_swatches(void)
{
    int n = 0;
    const COLORREF *ps = settings_theme_presets(&n);
    for (int i = 0; i < n && i < 8; i++)
        paint_swatch(g_st.swatch[i], ps[i], ps[i] == g_st.theme);
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
        HBRUSH br = CreateSolidBrush(CARD_BG);
        FillRect(dc, &rc, br);
        DeleteObject(br);
        SetBkMode(dc, TRANSPARENT);
        /* 分组标题 */
        HGDIOBJ of = SelectObject(dc, g_uiFontBold);
        SetTextColor(dc, RGB(0x2E,0x2E,0x2E));
        TextOutW(dc, 16, 12, L"\x4E3B\x9898\x8272", 3);            /* 主题色 */
        TextOutW(dc, 16, 118, L"\x5FEB\x6377\x6309\x94AE", 4);     /* 快捷按钮 */
        TextOutW(dc, 16, 168, L"\x60AC\x6D6E\x7A97\x5FEB\x6377\x952E", 6); /* 悬浮窗快捷键 */
        TextOutW(dc, 16, 236, L"\x66F4\x591A\x8BBE\x7F6E\xFF08\x9884\x7559\xFF09", 8); /* 更多设置(预留) */
        SelectObject(dc, of);
        HGDIOBJ of2 = SelectObject(dc, g_uiFont);
        SetTextColor(dc, RGB(0x8A,0x8A,0x8A));
        TextOutW(dc, 16, 254,
                 L"\x540E\x7EED\x7248\x672C\x5C06\x5728\x6B64\x589E\x52A0\x66F4\x591A\x914D\x7F6E\x9879", 15); /* 后续版本将在此增加更多配置项 */
        SelectObject(dc, of2);
        EndPaint(hwnd, &ps);
        return 0;
    }
    case WM_CTLCOLORSTATIC:
        SetBkColor((HDC)wp, CARD_BG);
        SetTextColor((HDC)wp, RGB(0x3A,0x3A,0x3A));
        return (LRESULT)GetStockObject(WHITE_BRUSH);
    case WM_LBUTTONUP: {
        /* 预设色块命中 → 即时换色 */
        POINT pt = { GET_X_LPARAM(lp), GET_Y_LPARAM(lp) };
        for (int i = 0; i < 8; i++) {
            RECT rc;
            GetWindowRect(g_st.swatch[i], &rc);
            POINT sp = pt;
            ClientToScreen(hwnd, &sp);
            if (PtInRect(&rc, sp)) {
                int n = 0;
                const COLORREF *ps = settings_theme_presets(&n);
                g_st.theme = ps[i];
                settings_set_theme_color(g_st.theme);   /* 即时保存+生效 */
                refresh_swatches();
                break;
            }
        }
        return 0;
    }
    case WM_COMMAND: {
        int id = LOWORD(wp);
        if (id == SID_OK) {
            g_st.showFloat = (SendMessageW(g_st.chkFloat, BM_GETCHECK, 0, 0) == BST_CHECKED);
            g_st.showPick  = (SendMessageW(g_st.chkPick,  BM_GETCHECK, 0, 0) == BST_CHECKED);
            /* 快捷键下拉选择 */
            int sf = (int)SendMessageW(g_st.hkFloat, CB_GETCURSEL, 0, 0);
            int ss = (int)SendMessageW(g_st.hkStop,  CB_GETCURSEL, 0, 0);
            if (sf >= 0 && sf < HK_OPT_N) g_st.hkFloatVk = HK_OPTIONS[sf].vk;
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
    g_st.showFloat = settings_show_float_btn();
    g_st.showPick = settings_show_quick_pick();
    g_st.hkFloatVk = settings_float_hotkey();
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

    /* --- 主题色:预设色板(点选即换,无 RGB 输入) --- */
    int n = 0;
    const COLORREF *ps = settings_theme_presets(&n);
    for (int i = 0; i < n && i < 8; i++) {
        int col = i % 4, row = i / 4;
        g_st.swatch[i] = CreateWindowExW(0, L"STATIC", L"",
            WS_CHILD | WS_VISIBLE | SS_NOTIFY,
            20 + col * 60, 36 + row * 38, 48, 30,
            g_st.hwnd, (HMENU)(INT_PTR)(SID_SWATCH0 + i), wc.hInstance, NULL);
    }

    /* --- 快捷按钮开关 --- */
    g_st.chkFloat = CreateWindowExW(0, L"BUTTON",
        L"\x4FA7\x680F\x663E\x793A\x300C\x60AC\x6D6E\x7A97\x300D\x6309\x94AE",   /* 侧栏显示「悬浮窗」按钮 */
        WS_CHILD | WS_VISIBLE | BS_AUTOCHECKBOX,
        20, 140, 320, 22, g_st.hwnd, (HMENU)SID_CHK_FLOAT, wc.hInstance, NULL);
    g_st.chkPick = CreateWindowExW(0, L"BUTTON",
        L"\x4FA7\x680F\x663E\x793A\x300C\x5C4F\x5E55\x53D6\x70B9\x300D\x6309\x94AE",  /* 侧栏显示「屏幕取点」按钮 */
        WS_CHILD | WS_VISIBLE | BS_AUTOCHECKBOX,
        20, 166, 320, 22, g_st.hwnd, (HMENU)SID_CHK_PICK, wc.hInstance, NULL);
    SendMessageW(g_st.chkFloat, BM_SETCHECK, g_st.showFloat ? BST_CHECKED : BST_UNCHECKED, 0);
    SendMessageW(g_st.chkPick,  BM_SETCHECK, g_st.showPick  ? BST_CHECKED : BST_UNCHECKED, 0);

    /* --- 悬浮窗快捷键设置 --- */
    CreateWindowExW(0, L"STATIC",
        L"\x5F00\x59CB\x952E:",  /* 开始键: */
        WS_CHILD | WS_VISIBLE, 20, 190, 60, 20, g_st.hwnd, NULL, wc.hInstance, NULL);
    g_st.hkFloat = CreateWindowExW(0, L"COMBOBOX", L"",
        CBS_DROPDOWNLIST | WS_CHILD | WS_VISIBLE | WS_VSCROLL,
        88, 187, 100, 200, g_st.hwnd, (HMENU)SID_HK_FLOAT, wc.hInstance, NULL);
    CreateWindowExW(0, L"STATIC",
        L"\x505C\x6B62\x952E:",  /* 停止键: */
        WS_CHILD | WS_VISIBLE, 200, 190, 60, 20, g_st.hwnd, NULL, wc.hInstance, NULL);
    g_st.hkStop = CreateWindowExW(0, L"COMBOBOX", L"",
        CBS_DROPDOWNLIST | WS_CHILD | WS_VISIBLE | WS_VSCROLL,
        268, 187, 90, 200, g_st.hwnd, (HMENU)SID_HK_STOP, wc.hInstance, NULL);
    /* 填充选项并选中当前值 */
    for (int i = 0; i < HK_OPT_N; i++) {
        SendMessageW(g_st.hkFloat, CB_ADDSTRING, 0, (LPARAM)HK_OPTIONS[i].label);
        SendMessageW(g_st.hkStop,  CB_ADDSTRING, 0, (LPARAM)HK_OPTIONS[i].label);
        if (HK_OPTIONS[i].vk == g_st.hkFloatVk)
            SendMessageW(g_st.hkFloat, CB_SETCURSEL, i, 0);
        if (HK_OPTIONS[i].vk == g_st.hkStopVk)
            SendMessageW(g_st.hkStop, CB_SETCURSEL, i, 0);
    }
    /* 无匹配项时默认 F6 */
    if (SendMessageW(g_st.hkFloat, CB_GETCURSEL, 0, 0) == CB_ERR)
        SendMessageW(g_st.hkFloat, CB_SETCURSEL, 1, 0);   /* F6 */
    if (SendMessageW(g_st.hkStop, CB_GETCURSEL, 0, 0) == CB_ERR)
        SendMessageW(g_st.hkStop, CB_SETCURSEL, 1, 0);

    /* --- 底部按钮 --- */
    g_st.ok = CreateWindowExW(0, L"BUTTON",
        L"\x786E\x5B9A",                        /* 确定 */
        WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
        SET_W - 190, SET_H - 62, 80, 30, g_st.hwnd, (HMENU)SID_OK, wc.hInstance, NULL);
    g_st.cancel = CreateWindowExW(0, L"BUTTON",
        L"\x53D6\x6D88",                        /* 取消 */
        WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
        SET_W - 100, SET_H - 62, 80, 30, g_st.hwnd, (HMENU)SID_CANCEL, wc.hInstance, NULL);

    if (g_uiFont) {
        HWND kids[] = { g_st.chkFloat, g_st.chkPick, g_st.hkFloat, g_st.hkStop,
                        g_st.ok, g_st.cancel, NULL };
        for (int i = 0; kids[i]; i++)
            SendMessageW(kids[i], WM_SETFONT, (WPARAM)g_uiFont, TRUE);
    }

    refresh_swatches();

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
int settings_dlg_stop_hotkey(void)  { return g_st.hkStopVk; }
