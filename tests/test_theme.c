/* test_theme.c - 最小主题验证:一个窗口一个按钮 */
#include <windows.h>

LRESULT CALLBACK WndProc(HWND h, UINT m, WPARAM w, LPARAM l)
{
    switch (m) {
    case WM_DESTROY: PostQuitMessage(0); return 0;
    }
    return DefWindowProcW(h, m, w, l);
}

int WINAPI wWinMain(HINSTANCE hi, HINSTANCE hp, PWSTR cl, int show)
{
    (void)hp; (void)cl;
    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hi;
    wc.lpszClassName = L"ThemeTest";
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
    RegisterClassW(&wc);

    HWND w = CreateWindowExW(0, L"ThemeTest", L"主题测试",
        WS_OVERLAPPEDWINDOW, 100, 100, 420, 220, NULL, NULL, hi, NULL);
    CreateWindowExW(0, L"BUTTON", L"主题测试按钮", WS_CHILD | WS_VISIBLE,
        20, 20, 140, 30, w, NULL, hi, NULL);
    CreateWindowExW(0, L"EDIT", L"edit", WS_CHILD | WS_VISIBLE | WS_BORDER,
        20, 60, 140, 24, w, NULL, hi, NULL);
    ShowWindow(w, show);
    UpdateWindow(w);

    MSG m;
    while (GetMessageW(&m, NULL, 0, 0)) { TranslateMessage(&m); DispatchMessageW(&m); }
    return (int)m.wParam;
}
