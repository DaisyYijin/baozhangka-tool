/* ============================================================
 * picker.c - 全屏取点:半透明覆盖 + 十字线 + 坐标提示
 *   左键单击      -> 取一个坐标点
 *   左键按下并拖拽 -> 取一个矩形范围(范围随机点击用)
 *   Esc           -> 取消
 * ============================================================ */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <windowsx.h>
#include "picker.h"
#include <string.h>
#include <stdio.h>

static const wchar_t PICKER_CLASS[] = L"AcPickerWnd";

typedef struct {
    HWND    hwnd;
    int     vx, vy, vw, vh;          /* 虚拟屏幕 */
    int     done;                    /* 消息循环退出标志 */
    int     dragging;
    POINT   press;                   /* 按下点(屏幕坐标) */
    POINT   cur;                     /* 当前光标 */
    PickResult result;
} Picker;

static Picker g_picker;

static void draw_picker(HDC hdc)
{
    Picker *p = &g_picker;

    /* 十字线 */
    HPEN penCross = CreatePen(PS_SOLID, 1, RGB(255, 60, 60));
    HGDIOBJ oldPen = SelectObject(hdc, penCross);
    int cx = p->cur.x - p->vx, cy = p->cur.y - p->vy;
    MoveToEx(hdc, cx, 0, NULL); LineTo(hdc, cx, p->vh);
    MoveToEx(hdc, 0, cy, NULL); LineTo(hdc, p->vw, cy);
    SelectObject(hdc, oldPen);
    DeleteObject(penCross);

    /* 拖拽矩形 */
    if (p->dragging) {
        int x1 = p->press.x - p->vx, y1 = p->press.y - p->vy;
        int x2 = cx, y2 = cy;
        RECT rc = { x1 < x2 ? x1 : x2, y1 < y2 ? y1 : y2,
                    x1 < x2 ? x2 : x1, y1 < y2 ? y2 : y1 };
        HBRUSH br = CreateSolidBrush(RGB(80, 200, 120));
        FrameRect(hdc, &rc, br);
        DeleteObject(br);
    }

    /* 坐标文字 */
    SetBkMode(hdc, TRANSPARENT);
    HFONT font = (HFONT)GetStockObject(DEFAULT_GUI_FONT);
    HGDIOBJ oldFont = SelectObject(hdc, font);

    wchar_t buf[160];
    if (p->dragging) {
        int x1 = p->press.x, y1 = p->press.y, x2 = p->cur.x, y2 = p->cur.y;
        int rw = x2 > x1 ? x2 - x1 : x1 - x2;
        int rh = y2 > y1 ? y2 - y1 : y1 - y2;
        _snwprintf(buf, 159, L"起点(%d, %d)  大小 %d × %d   —— 松开鼠标确定范围",
                   x1, y1, rw, rh);
        buf[159] = 0;
    } else {
        _snwprintf(buf, 159, L"当前坐标:(%d, %d)", p->cur.x, p->cur.y);
        buf[159] = 0;
    }

    /* 跟随鼠标的信息框 */
    int tx = cx + 18, ty = cy + 18;
    if (tx > p->vw - 340) tx = p->vw - 340;
    if (ty > p->vh - 60) ty = p->vh - 60;
    if (tx < 0) tx = 0;
    if (ty < 0) ty = 0;
    RECT rcTip = { tx, ty, tx + 330, ty + 22 };
    HBRUSH brTip = CreateSolidBrush(RGB(255, 255, 200));
    FillRect(hdc, &rcTip, brTip);
    DeleteObject(brTip);
    SetTextColor(hdc, RGB(0, 0, 0));
    DrawTextW(hdc, buf, -1, &rcTip, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

    /* 顶部提示 */
    RECT rcTop = { 0, 0, p->vw, 34 };
    HBRUSH brTop = CreateSolidBrush(RGB(20, 90, 190));
    FillRect(hdc, &rcTop, brTop);
    DeleteObject(brTop);
    wchar_t tip[128];
    wcscpy(tip, L"  单击左键=取点    按住左键拖拽=框选范围    Esc=取消");
    SetTextColor(hdc, RGB(255, 255, 255));
    DrawTextW(hdc, tip, -1, &rcTop, DT_LEFT | DT_VCENTER | DT_SINGLELINE);

    SelectObject(hdc, oldFont);
}

static LRESULT CALLBACK picker_wndproc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    Picker *p = &g_picker;
    switch (msg) {
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        /* 双缓冲:先画到内存位图再一次性拷贝,消除闪烁与拖影 */
        HDC mem = CreateCompatibleDC(hdc);
        HBITMAP bmp = CreateCompatibleBitmap(hdc, p->vw, p->vh);
        HGDIOBJ oldBmp = SelectObject(mem, bmp);
        RECT full = { 0, 0, p->vw, p->vh };
        FillRect(mem, &full, (HBRUSH)GetStockObject(BLACK_BRUSH));
        draw_picker(mem);
        BitBlt(hdc, 0, 0, p->vw, p->vh, mem, 0, 0, SRCCOPY);
        SelectObject(mem, oldBmp);
        DeleteObject(bmp);
        DeleteDC(mem);
        EndPaint(hwnd, &ps);
        return 0;
    }
    case WM_ERASEBKGND:
        return 1;   /* 背景由双缓冲统一绘制,禁止系统擦除 */
    case WM_TIMER:
        GetCursorPos(&p->cur);
        InvalidateRect(hwnd, NULL, TRUE);
        return 0;
    case WM_LBUTTONDOWN:
        SetCapture(hwnd);
        GetCursorPos(&p->press);
        p->cur = p->press;
        p->dragging = 1;
        return 0;
    case WM_MOUSEMOVE:
        if (p->dragging) {
            GetCursorPos(&p->cur);
            InvalidateRect(hwnd, NULL, TRUE);
        }
        return 0;
    case WM_LBUTTONUP: {
        ReleaseCapture();
        GetCursorPos(&p->cur);
        p->dragging = 0;
        int dx = p->cur.x - p->press.x;
        int dy = p->cur.y - p->press.y;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;
        if (dx < 5 && dy < 5) {              /* 视为单击取点 */
            p->result.ok = 1;
            p->result.x = p->press.x;
            p->result.y = p->press.y;
            p->result.w = 0;
            p->result.h = 0;
        } else {                              /* 框选范围 */
            int x1 = p->press.x, y1 = p->press.y;
            int x2 = p->cur.x, y2 = p->cur.y;
            if (x2 < x1) { int t = x1; x1 = x2; x2 = t; }
            if (y2 < y1) { int t = y1; y1 = y2; y2 = t; }
            p->result.ok = 1;
            p->result.x = x1; p->result.y = y1;
            p->result.w = x2 - x1; p->result.h = y2 - y1;
        }
        p->done = 1;
        return 0;
    }
    case WM_KEYDOWN:
        if (wp == VK_ESCAPE) {
            p->result.ok = 0;
            p->done = 1;
        }
        return 0;
    case WM_RBUTTONDOWN:                     /* 右键取消 */
        p->result.ok = 0;
        p->done = 1;
        return 0;
    case WM_CLOSE:
        p->result.ok = 0;
        p->done = 1;
        return 0;
    case WM_DESTROY:
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

int pick_screen_point(PickResult *r)
{
    Picker *p = &g_picker;
    memset(p, 0, sizeof(*p));

    p->vx = GetSystemMetrics(SM_XVIRTUALSCREEN);
    p->vy = GetSystemMetrics(SM_YVIRTUALSCREEN);
    p->vw = GetSystemMetrics(SM_CXVIRTUALSCREEN);
    p->vh = GetSystemMetrics(SM_CYVIRTUALSCREEN);

    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = picker_wndproc;
    wc.hInstance = GetModuleHandleW(NULL);
    wc.lpszClassName = PICKER_CLASS;
    wc.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_CROSS);
    RegisterClassW(&wc);

    p->hwnd = CreateWindowExW(
        WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        PICKER_CLASS, L"取点",
        WS_POPUP,
        p->vx, p->vy, p->vw, p->vh,
        NULL, NULL, wc.hInstance, NULL);
    if (!p->hwnd) return 0;

    SetLayeredWindowAttributes(p->hwnd, 0, 72, LWA_ALPHA);
    ShowWindow(p->hwnd, SW_SHOW);
    UpdateWindow(p->hwnd);
    SetForegroundWindow(p->hwnd);
    SetFocus(p->hwnd);
    SetTimer(p->hwnd, 1, 40, NULL);

    /* 独立消息循环 */
    MSG msg;
    while (!p->done) {
        if (PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) {
            if (msg.message == WM_KEYDOWN && msg.wParam == VK_ESCAPE) {
                p->result.ok = 0;
                break;
            }
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        } else {
            WaitMessage();
        }
    }

    KillTimer(p->hwnd, 1);
    DestroyWindow(p->hwnd);
    UnregisterClassW(PICKER_CLASS, wc.hInstance);

    /* 强制系统重绘被覆盖层遮挡的区域,消除分层窗口残留 */
    InvalidateRect(NULL, NULL, TRUE);

    if (r) *r = p->result;
    return p->result.ok;
}
