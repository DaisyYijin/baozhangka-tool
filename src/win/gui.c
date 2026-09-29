/* ============================================================
 * gui.c - 自动点击器主界面(Win32 API,XP~Win11)
 *
 * 功能:
 *   · 步骤列表管理:单击/双击/多击/右击/中击/范围/输入/按键/
 *     等待/滚动/拖动
 *   · 屏幕取点(单击取点,拖拽框选范围)
 *   · Excel(.xlsx/.csv)导入步骤、导入输入列
 *   · 输入前清空当前输入框
 *   · F6 开始 / Ctrl+F12 停止
 * ============================================================ */
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include <windowsx.h>
#include <commctrl.h>
#include <commdlg.h>
#include "ac_defs.h"
#include "engine.h"
#include "sheet.h"
#include "import.h"
#include "u8.h"
#include "platform_win.h"
#include "picker.h"
#include "dlg_edit.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdarg.h>

/* ---------- 控件 ID ---------- */
enum {
    IDC_LIST = 100,
    IDC_T_TITLE,          /* 主区标题 */
    IDC_T_HINT,           /* 右上热键提示 */
    IDC_NAV_TASK, IDC_NAV_LOG,     /* 侧栏页面切换 */
    IDC_BTN_ADD, IDC_BTN_EDIT, IDC_BTN_DEL, IDC_BTN_UP, IDC_BTN_DOWN,
    IDC_BTN_PICK, IDC_BTN_IMPORT, IDC_BTN_FLOAT,
    IDC_BTN_OPEN, IDC_BTN_SAVE, IDC_BTN_START, IDC_BTN_STOP,
    IDC_BTN_HELP,
    IDC_BTN_CHECKER,                /* 打开网页版综合检查工具 */
    IDC_ED_LOOPS, IDC_ED_GAP, IDC_ED_COUNTDOWN, IDC_ED_JITTER,
    IDC_BTN_DATA,                 /* Excel 数据行绑定(保留枚举) */
    IDC_CHK_EXCELROWS,            /* 勾选:循环次数=Excel 行数 */
    IDC_TAB_BASE = 3000,           /* TAB 步骤1~8(3000~3007) */
    IDC_TAB_ADD = 3100,            /* 添加TAB */
    IDC_STATUS = 2100,
    IDC_LOG,              /* 日志文本框 */
    IDC_BTN_LOGCLEAR,     /* 清空日志 */
    IDC_CHK_AUTOSCROLL,   /* 自动滚动 */
    IDC_LB1, IDC_LB2, IDC_LB3, IDC_LB4
};

#define WM_APP_PROGRESS   (WM_APP + 1)
#define WM_APP_DONE       (WM_APP + 2)
#define HOTK_STOP   1
#define HOTK_START  2

/* QQ 风格布局:左侧导航栏 + 白色圆角内容卡片 */
#define NAV_W      64    /* 左侧导航栏宽度 */
#define CARD_PAD   6     /* 卡片与窗口边缘 */
#define NAV_BTN_W  58
#define NAV_BTN_H  34
#define TAB_H      26    /* TAB 行高度 */
#define TAB_CLOSE_W 18   /* TAB 右侧内嵌 × 区宽(点击删除该步骤) */
#define SET_TOP     16   /* 设置行 y(顶部无标题) */
#define TABS_TOP    48   /* TAB 行 y */

#define UI_BG       RGB(0xF2, 0xF2, 0xF2)   /* 窗口底色(QQ 灰) */
#define CARD_BG     RGB(0xFF, 0xFF, 0xFF)   /* 内容卡片白色 */
#define QQ_BLUE     RGB(0x00, 0x99, 0xFF)   /* QQ 主色蓝 */

static const wchar_t MAIN_CLASS[] = L"AcAutoClickerMain";
static HWND g_hMain, g_hList, g_hStatus, g_hLog;
static HWND g_hBtn[20];
static HWND g_hTabs[MAX_TASKS];             /* 步骤 TAB 按钮 */
static HWND g_hTabAdd = NULL;               /* "+" 添加 TAB 按钮 */
static int  g_curTask = 0;                  /* 当前 TAB(0~g_tabCount-1) */
static int  g_tabCount = 1;                 /* 当前 TAB 数(1~8,默认1) */
static int  g_closeHot = -1;                /* 悬停在哪个 TAB 的 × 区(-1=无) */
static HBRUSH g_hbrBg, g_hbrCard;
static TaskBook g_taskbook;                 /* 任务簿(8 TAB) */
#define g_task (g_taskbook.tasks[g_curTask])/* 当前任务(旧代码无缝适配) */
static int  g_running = 0;
static HANDLE g_thread = NULL;
static int  g_page = 0;        /* 0=任务页 1=日志页 */

/* ---- 共享 UI 资源(见 ui_shared.h) ---- */
HFONT g_uiFont, g_uiFontBold, g_uiFontTitle, g_uiFontSub;
HWND g_uiHotBtn;
HWND g_uiNavSel;
volatile int g_uiDlgActive = 0;

/* ---- QQ 风格按钮绘制 ---- */

/* 悬停检测:记录当前鼠标所在的自绘按钮 */

/* 侧栏导航按钮:每次绘制完整填满矩形,不依赖系统背景 */
void draw_nav_button(DRAWITEMSTRUCT *dis)
{
    HDC dc = dis->hDC;
    RECT rc = dis->rcItem;
    BOOL hot      = (g_uiHotBtn == dis->hwndItem);
    BOOL pressed  = (dis->itemState & ODS_SELECTED) != 0;
    BOOL disabled = !IsWindowEnabled(dis->hwndItem);
    BOOL selected = (g_uiNavSel == dis->hwndItem);

    COLORREF bg, txtcolor;
    if (selected) {
        bg = QQ_BLUE;   txtcolor = RGB(255,255,255);
    } else if (!disabled && pressed) {
        bg = RGB(0xDC,0xDC,0xDC); txtcolor = RGB(0x2E,0x2E,0x2E);
    } else if (!disabled && hot) {
        bg = RGB(0xE7,0xE7,0xE7); txtcolor = RGB(0x2E,0x2E,0x2E);
    } else {
        bg = UI_BG;     txtcolor = disabled ? RGB(0xB8,0xB8,0xB8) : RGB(0x2E,0x2E,0x2E);
    }

    /* 填满整个按钮矩形,覆盖任何残留 */
    HBRUSH br = CreateSolidBrush(bg);
    HPEN pen = CreatePen(PS_SOLID, 1, bg);
    HGDIOBJ ob = SelectObject(dc, br);
    HGDIOBJ op = SelectObject(dc, pen);
    Rectangle(dc, rc.left, rc.top, rc.right, rc.bottom);
    SelectObject(dc, ob);
    SelectObject(dc, op);
    DeleteObject(br);
    DeleteObject(pen);

    wchar_t txt[64];
    GetWindowTextW(dis->hwndItem, txt, 63);
    txt[63] = 0;
    SetBkMode(dc, TRANSPARENT);
    SetTextColor(dc, txtcolor);
    HGDIOBJ of = SelectObject(dc, selected ? g_uiFontBold : g_uiFont);
    if (pressed && !selected) OffsetRect(&rc, 0, 1);
    DrawTextW(dc, txt, -1, &rc, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    SelectObject(dc, of);
}

/* 白底圆角细边按钮(对话框内的次按钮/取点按钮) */
void draw_flat_button(DRAWITEMSTRUCT *dis)
{
    HDC dc = dis->hDC;
    RECT rc = dis->rcItem;
    BOOL hot      = (g_uiHotBtn == dis->hwndItem);
    BOOL pressed  = ((dis->itemState & ODS_SELECTED) != 0) && IsWindowEnabled(dis->hwndItem);
    BOOL disabled = !IsWindowEnabled(dis->hwndItem);

    COLORREF bg, border, text;
    if (disabled) {
        bg = RGB(0xFA,0xFA,0xFA); border = RGB(0xE4,0xE4,0xE4); text = RGB(0xA8,0xA8,0xA8);
    } else if (pressed) {
        bg = RGB(0xE6,0xE6,0xE6); border = RGB(0xB8,0xB8,0xB8); text = RGB(0x1B,0x1B,0x1B);
    } else if (hot) {
        bg = RGB(0xF2,0xF2,0xF2); border = RGB(0xAD,0xAD,0xAD); text = RGB(0x1B,0x1B,0x1B);
    } else {
        bg = RGB(0xFF,0xFF,0xFF); border = RGB(0xD1,0xD1,0xD1); text = RGB(0x1B,0x1B,0x1B);
    }

    HBRUSH br = CreateSolidBrush(bg);
    HPEN pen = CreatePen(PS_SOLID, 1, border);
    HGDIOBJ ob = SelectObject(dc, br);
    HGDIOBJ op = SelectObject(dc, pen);
    Rectangle(dc, rc.left, rc.top, rc.right, rc.bottom);
    SelectObject(dc, ob);
    SelectObject(dc, op);
    DeleteObject(br);
    DeleteObject(pen);

    wchar_t txt[64];
    GetWindowTextW(dis->hwndItem, txt, 63);
    txt[63] = 0;
    SetBkMode(dc, TRANSPARENT);
    SetTextColor(dc, text);
    HGDIOBJ of = SelectObject(dc, g_uiFont);
    if (pressed) OffsetRect(&rc, 0, 1);
    DrawTextW(dc, txt, -1, &rc, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    SelectObject(dc, of);
}

/* 彩色主按钮:纯色方角白字(开始=QQ蓝,停止=红);禁用态由调用方判定传入 */
void draw_accent_button(DRAWITEMSTRUCT *dis, COLORREF normal, COLORREF hot, COLORREF down, BOOL disabled)
{
    HDC dc = dis->hDC;
    RECT rc = dis->rcItem;
    BOOL isHot    = (g_uiHotBtn == dis->hwndItem) && !disabled;
    BOOL pressed  = ((dis->itemState & ODS_SELECTED) != 0) && !disabled;

    COLORREF col = disabled ? RGB(0xC9,0xCE,0xD4) : pressed ? down : isHot ? hot : normal;
    if (pressed) { rc.left += 1; rc.top += 1; rc.right -= 1; rc.bottom -= 1; }

    HBRUSH br = CreateSolidBrush(col);
    HPEN pen = CreatePen(PS_SOLID, 1, col);
    HGDIOBJ ob = SelectObject(dc, br);
    HGDIOBJ op = SelectObject(dc, pen);
    Rectangle(dc, rc.left, rc.top, rc.right, rc.bottom);
    SelectObject(dc, ob);
    SelectObject(dc, op);
    DeleteObject(br);
    DeleteObject(pen);

    wchar_t txt[64];
    GetWindowTextW(dis->hwndItem, txt, 63);
    txt[63] = 0;
    SetBkMode(dc, TRANSPARENT);
    SetTextColor(dc, disabled ? RGB(0xEF,0xF1,0xF4) : RGB(255,255,255));
    HGDIOBJ of = SelectObject(dc, g_uiFontBold);
    DrawTextW(dc, txt, -1, &rc, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    SelectObject(dc, of);
}

/* ================= 运行日志 ================= */

static void log_add(const wchar_t *fmt, ...)
{
    wchar_t body[460], line[512];
    va_list ap;
    SYSTEMTIME st;

    va_start(ap, fmt);
    _vsnwprintf(body, 459, fmt, ap);
    va_end(ap);
    body[459] = 0;

    GetLocalTime(&st);
    _snwprintf(line, 511, L"[%02d:%02d:%02d] %s\r\n",
               st.wHour, st.wMinute, st.wSecond, body);
    line[511] = 0;

    if (!g_hLog) return;

    /* 控制总量:超过 60000 字符时丢弃前 30000 */
    int len = GetWindowTextLengthW(g_hLog);
    if (len > 60000) {
        SendMessageW(g_hLog, EM_SETSEL, 0, 30000);
        SendMessageW(g_hLog, EM_REPLACESEL, FALSE, (LPARAM)L"");
        len = GetWindowTextLengthW(g_hLog);
    }
    SendMessageW(g_hLog, EM_SETSEL, len, len);
    SendMessageW(g_hLog, EM_REPLACESEL, FALSE, (LPARAM)line);
    if (IsWindowVisible(g_hLog) &&
        SendMessageW(GetDlgItem(g_hMain, IDC_CHK_AUTOSCROLL), BM_GETCHECK, 0, 0) == BST_CHECKED)
        SendMessageW(g_hLog, EM_SCROLLCARET, 0, 0);
}

/* 当前实际TAB数/选中TAB(编辑对话框的目标下拉用) */
int gui_tab_count(void) { return g_tabCount; }
int gui_cur_task(void)  { return g_curTask; }

/* TAB 显示名(跨TAB跳转等界面元素用;无自定义名时返回 步骤N) */
const wchar_t *gui_tab_display_name(int idx)
{
    static wchar_t name[AC_TASKNAME_MAX];
    if (idx < 0 || idx >= MAX_TASKS) return L"?";
    if (g_taskbook.tasks[idx].name[0]) {
        wcsncpy(name, g_taskbook.tasks[idx].name, AC_TASKNAME_MAX - 1);
        name[AC_TASKNAME_MAX - 1] = 0;
    } else {
        _snwprintf(name, AC_TASKNAME_MAX - 1, L"步骤%d", idx + 1);
        name[AC_TASKNAME_MAX - 1] = 0;
    }
    return name;
}

/* 步骤的可读描述(日志/列表摘要共用) */
static void step_desc(const Step *s, wchar_t *buf, int cap)
{
    switch (s->type) {
    case ACT_CLICK:
    case ACT_DBLCLICK:
    case ACT_RCLICK:
    case ACT_MCLICK:
        _snwprintf(buf, cap - 1, L"%ls (%d,%d),后延时%ums",
                   act_type_name(s->type), s->x, s->y, s->delayAfter);
        break;
    case ACT_MULTI:
        _snwprintf(buf, cap - 1, L"多击 (%d,%d) ×%d次,每次间隔%ums",
                   s->x, s->y, s->count > 0 ? s->count : 1, s->interval);
        break;
    case ACT_TEXT: {
        wchar_t t[48] = L"";
        wcsncpy(t, s->text, 40);
        t[40] = 0;
        _snwprintf(buf, cap - 1, L"输入 \"%s\"%ls", t, s->clearFirst ? L"(先清空)" : L"");
        break;
    }
    case ACT_KEY:
        _snwprintf(buf, cap - 1, L"按键 [%s]", s->text);
        break;
    case ACT_WAIT:
        _snwprintf(buf, cap - 1, L"等待 %d ms", s->delayBefore);
        break;
    case ACT_SCROLL:
        _snwprintf(buf, cap - 1, L"滚轮 %d 格(%ls)", s->scroll, s->scroll >= 0 ? L"上" : L"下");
        break;
    case ACT_DRAG:
        _snwprintf(buf, cap - 1, L"拖动 (%d,%d)→(%d,%d)", s->x, s->y, s->x2, s->y2);
        break;
    case ACT_JUMP:
        if (s->jumpTab >= 1 && s->jumpTab <= MAX_TASKS)
            _snwprintf(buf, cap - 1, L"跳转到[%ls]第 %d 步",
                       gui_tab_display_name(s->jumpTab - 1), s->jumpTo);
        else
            _snwprintf(buf, cap - 1, L"跳转到第 %d 步", s->jumpTo);
        break;
    default:
        wcscpy(buf, act_type_name(s->type));
        break;
    }
    buf[cap - 1] = 0;
}

/* ================= 步骤屏幕标记(置顶:红点=精确坐标+胶囊标签=序号·动作,可拖动) ================= */
/* ================= 步骤屏幕标记(置顶:红点=精确坐标+胶囊标签=序号·动作,可拖动) ================= */

static void refresh_list(void);              /* 前向声明(拖动标记后刷新列表) */
static void collect_data_rows(const Sheet *sh, int col);

static const wchar_t MARK_CLASS[] = L"AcMarkWnd";
#define MARK_MAX 1024
static HWND g_marks[MARK_MAX];
static HWND g_hPreviewMark = NULL;
static int  g_curMark = -1;          /* 执行中当前步索引(高亮) */
int g_mark_seq = 0;                  /* 当前编辑步骤序号(1 起) */

void mark_clear_preview(void);       /* 前向声明 */

/* 拖动状态 */
static HWND  g_dragMark = NULL;
static POINT g_dragOff;

#define MARK_COLORKEY RGB(255, 0, 255)
#define MARK_DOT_R    6

static LRESULT CALLBACK mark_wndproc(HWND h, UINT m, WPARAM w, LPARAM l)
{
    switch (m) {
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC dc = BeginPaint(h, &ps);
        RECT rc;
        GetClientRect(h, &rc);
        int seq = (int)GetWindowLongPtrW(h, GWLP_USERDATA);
        wchar_t txt[64];
        GetWindowTextW(h, txt, 63);

        int cx = rc.right / 2;
        int dotCY = rc.bottom - MARK_DOT_R - 2;

        /* 品红背景 = 完全透明(colorkey) */
        HBRUSH brK = CreateSolidBrush(MARK_COLORKEY);
        FillRect(dc, &rc, brK);
        DeleteObject(brK);

        BOOL cur = (g_running && seq == g_curMark);
        COLORREF tagBg = cur ? RGB(0xE8,0x7A,0x10) : RGB(0x26,0x26,0x26);
        COLORREF dotBg = cur ? RGB(0xFF,0x9A,0x30) : RGB(0xE8,0x32,0x28);

        /* 红点:精确点击坐标(白边) */
        HBRUSH brDot = CreateSolidBrush(dotBg);
        HPEN penDot = CreatePen(PS_SOLID, 2, RGB(255,255,255));
        HGDIOBJ ob = SelectObject(dc, brDot);
        HGDIOBJ op = SelectObject(dc, penDot);
        Ellipse(dc, cx - MARK_DOT_R, dotCY - MARK_DOT_R,
                cx + MARK_DOT_R, dotCY + MARK_DOT_R);
        SelectObject(dc, ob);
        SelectObject(dc, op);
        DeleteObject(brDot);
        DeleteObject(penDot);

        /* 胶囊标签 + 指向红点的三角 */
        int lblX = 4, lblY = 2;
        int lblW = rc.right - 8, lblH = 22;
        HBRUSH brTag = CreateSolidBrush(tagBg);
        HPEN penTag = CreatePen(PS_SOLID, 1, tagBg);
        HGDIOBJ ob2 = SelectObject(dc, brTag);
        HGDIOBJ op2 = SelectObject(dc, penTag);
        RoundRect(dc, lblX, lblY, lblX + lblW, lblY + lblH, 10, 10);
        POINT tri[3] = { { cx - 6, lblY + lblH - 1 },
                         { cx + 6, lblY + lblH - 1 },
                         { cx, dotCY - MARK_DOT_R + 1 } };
        Polygon(dc, tri, 3);
        SelectObject(dc, ob2);
        SelectObject(dc, op2);
        DeleteObject(brTag);
        DeleteObject(penTag);

        /* 白字 */
        SetBkMode(dc, TRANSPARENT);
        SetTextColor(dc, RGB(255,255,255));
        HGDIOBJ of = SelectObject(dc, g_uiFontBold);
        RECT rt = { lblX, lblY, lblX + lblW, lblY + lblH };
        DrawTextW(dc, txt, -1, &rt, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
        SelectObject(dc, of);
        EndPaint(h, &ps);
        return 0;
    }
    case WM_ERASEBKGND:
        return 1;

    case WM_LBUTTONDOWN: {
        SetCapture(h);
        POINT pt;
        GetCursorPos(&pt);
        RECT rw;
        GetWindowRect(h, &rw);
        g_dragOff.x = pt.x - rw.left;
        g_dragOff.y = pt.y - rw.top;
        g_dragMark = h;
        return 0;
    }
    case WM_MOUSEMOVE:
        if (g_dragMark == h && (w & MK_LBUTTON)) {
            POINT pt;
            GetCursorPos(&pt);
            RECT rw;
            GetWindowRect(h, &rw);
            int nx = pt.x - g_dragOff.x;
            int ny = pt.y - g_dragOff.y;
            SetWindowPos(h, NULL, nx, ny, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE);
            /* 坐标实时同步:红点中心即步骤坐标 */
            int seq = (int)GetWindowLongPtrW(h, GWLP_USERDATA);
            int newStepX = nx + (rw.right - rw.left) / 2;
            int newStepY = ny + (rw.bottom - rw.top) - MARK_DOT_R - 2;
            if (!edit_dlg_live_coords(seq, newStepX, newStepY)) {
                /* 编辑窗未处理(非编辑中步骤)→ 同步任务数据 */
                if (seq >= 0 && seq < g_task.count) {
                    g_task.steps[seq].x = newStepX;
                    g_task.steps[seq].y = newStepY;
                }
            }
        }
        return 0;
    case WM_LBUTTONUP:
        if (g_dragMark == h) {
            ReleaseCapture();
            g_dragMark = NULL;
            refresh_list();               /* 拖动结束:同步列表坐标显示 */
        }
        return 0;

    case WM_RBUTTONUP:
        return 0;   /* 右键无操作(防止误触隐藏标记) */
    }
    return DefWindowProcW(h, m, w, l);
}

static void mark_register(void)
{
    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = mark_wndproc;
    wc.hInstance = GetModuleHandleW(NULL);
    wc.lpszClassName = MARK_CLASS;
    RegisterClassW(&wc);
}

/* 窗口几何:标签居中于红点上方;红点中心 = 步骤坐标 */
static void mark_geo(int x, int y, const wchar_t *txt,
                     int *winX, int *winY, int *winW, int *winH)
{
    HDC dc = GetDC(NULL);
    HGDIOBJ of = SelectObject(dc, g_uiFontBold);
    SIZE sz;
    GetTextExtentPoint32W(dc, txt, (int)wcslen(txt), &sz);
    SelectObject(dc, of);
    ReleaseDC(NULL, dc);

    *winW = (sz.cx + 20 > 56) ? sz.cx + 20 : 56;
    *winH = 22 + 6 + MARK_DOT_R + 8;      /* 标签 + 三角 + 红点区 */
    *winX = x - *winW / 2;
    *winY = y - *winH + MARK_DOT_R + 2;
}

/* 在 (x,y) 处创建标记(红点中心即坐标);seq>=0 正式步骤,负值预览 */
static HWND mark_create(int x, int y, const wchar_t *txt, int seq)
{
    int winX, winY, winW, winH;
    mark_geo(x, y, txt, &winX, &winY, &winW, &winH);

    HWND hwnd = CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_LAYERED | WS_EX_NOACTIVATE,
        MARK_CLASS, txt, WS_POPUP,
        winX, winY, winW, winH,
        NULL, NULL, GetModuleHandleW(NULL), NULL);
    if (!hwnd) return NULL;
    SetWindowLongPtrW(hwnd, GWLP_USERDATA, (LONG_PTR)seq);
    if (g_running) { ShowWindow(hwnd, SW_HIDE); return hwnd; }   /* 执行中不显示 */
    SetLayeredWindowAttributes(hwnd, MARK_COLORKEY, 0, LWA_COLORKEY);
    ShowWindow(hwnd, SW_SHOWNOACTIVATE);
    return hwnd;
}

/* 执行期间隐藏/恢复屏幕标记:标记盖在步骤坐标上,执行中若不隐藏,
   注入的鼠标点击会落在标记窗口上而到不了目标程序(LAYERED 色键窗口
   的鼠标穿透不可靠,直接隐藏最稳) */
static void marks_set_visible(int show)
{
    for (int i = 0; i < MARK_MAX; i++)
        if (g_marks[i]) ShowWindow(g_marks[i], show ? SW_SHOWNOACTIVATE : SW_HIDE);
}

/* 按任务列表重建全部标记(增删/移动/导入后调用) */
static void marks_sync(void)
{
    for (int i = 0; i < MARK_MAX; i++) {
        if (g_marks[i]) { DestroyWindow(g_marks[i]); g_marks[i] = NULL; }
    }
    for (int i = 0; i < g_task.count && i < MARK_MAX; i++) {
        Step *s = &g_task.steps[i];
        int hasPos = (s->type == ACT_CLICK || s->type == ACT_DBLCLICK ||
                      s->type == ACT_MULTI  || s->type == ACT_RCLICK ||
                      s->type == ACT_MCLICK || s->type == ACT_DRAG ||
                      (s->type == ACT_SCROLL && (s->x || s->y)));
        if (!hasPos) continue;
        wchar_t txt[64];
        _snwprintf(txt, 63, L"%d · %ls", i + 1, act_type_name(s->type));
        txt[63] = 0;
        g_marks[i] = mark_create(s->x, s->y, txt, i);
    }
}

/* 取点后的临时预览标记 */
void mark_preview(int x, int y, int type, int seq)
{
    mark_clear_preview();
    wchar_t txt[64];
    _snwprintf(txt, 63, L"%d · %ls", seq, act_type_name(type));
    txt[63] = 0;
    g_hPreviewMark = mark_create(x, y, txt, -2);
}

void mark_clear_preview(void)
{
    if (g_hPreviewMark) { DestroyWindow(g_hPreviewMark); g_hPreviewMark = NULL; }
}

/* ================= 置顶悬浮窗(状态 + 开始/停止,可拖动) ================= */

static HWND g_hFloat = NULL;
static wchar_t g_floatText[96] = L"空闲";

static void start_run(void);
static void stop_run(void);
static void float_update(const wchar_t *text);
static void float_toggle(void);

#define FLT_W 252
#define FLT_H 36
/* 悬浮窗内按钮区(窗口坐标,右侧) */
#define FLT_BTN_X (FLT_W - 12 - 58)
#define FLT_BTN_Y 7
#define FLT_BTN_W 58
#define FLT_BTN_H 22

static LRESULT CALLBACK float_wndproc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_ERASEBKGND:
        return 1;
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC dc = BeginPaint(hwnd, &ps);
        RECT rc;
        GetClientRect(hwnd, &rc);

        HDC mem = CreateCompatibleDC(dc);
        HBITMAP bmp = CreateCompatibleBitmap(dc, rc.right, rc.bottom);
        HGDIOBJ oldBmp = SelectObject(mem, bmp);

        /* 白色圆角卡片 + 浅描边 */
        HBRUSH brBg = CreateSolidBrush(CARD_BG);
        FillRect(mem, &rc, brBg);
        DeleteObject(brBg);
        HBRUSH brEdge = CreateSolidBrush(RGB(0xD9,0xD9,0xD9));
        HPEN pen = CreatePen(PS_SOLID, 1, RGB(0xD9,0xD9,0xD9));
        HGDIOBJ op = SelectObject(mem, pen);
        HGDIOBJ ob = SelectObject(mem, brEdge);
        RoundRect(mem, rc.left, rc.top, rc.right, rc.bottom, 10, 10);
        SelectObject(mem, op);
        SelectObject(mem, ob);
        DeleteObject(brEdge);
        DeleteObject(pen);

        SetBkMode(mem, TRANSPARENT);

        /* 状态文字(单行,垂直居中) */
        HGDIOBJ of = SelectObject(mem, g_uiFontBold);
        SetTextColor(mem, g_running ? QQ_BLUE : RGB(0x44,0x44,0x44));
        {
            RECT rt = { 12, 0, FLT_BTN_X - 8, FLT_H };
            DrawTextW(mem, g_floatText, -1, &rt,
                      DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
        }

        /* 运行按钮(蓝=开始,红=停止) */
        RECT rb = { FLT_BTN_X, FLT_BTN_Y, FLT_BTN_X + FLT_BTN_W, FLT_BTN_Y + FLT_BTN_H };
        COLORREF col = g_running ? RGB(0xE0,0x4A,0x3E) : QQ_BLUE;
        HBRUSH brB = CreateSolidBrush(col);
        HPEN penB = CreatePen(PS_SOLID, 1, col);
        HGDIOBJ opb = SelectObject(mem, penB);
        HGDIOBJ obb = SelectObject(mem, brB);
        Rectangle(mem, rb.left, rb.top, rb.right, rb.bottom);
        SelectObject(mem, opb);
        SelectObject(mem, obb);
        DeleteObject(brB);
        DeleteObject(penB);
        SetTextColor(mem, RGB(255,255,255));
        DrawTextW(mem, g_running ? L"停 止" : L"开 始", -1, &rb,
                  DT_CENTER | DT_VCENTER | DT_SINGLELINE);
        SelectObject(mem, of);

        BitBlt(dc, 0, 0, rc.right, rc.bottom, mem, 0, 0, SRCCOPY);
        SelectObject(mem, oldBmp);
        DeleteObject(bmp);
        DeleteDC(mem);
        EndPaint(hwnd, &ps);
        return 0;
    }
    case WM_LBUTTONUP: {
        int x = GET_X_LPARAM(lp), y = GET_Y_LPARAM(lp);
        if (x >= FLT_BTN_X && x < FLT_BTN_X + FLT_BTN_W &&
            y >= FLT_BTN_Y && y < FLT_BTN_Y + FLT_BTN_H) {
            if (g_running) stop_run();
            else            start_run();
        }
        return 0;
    }
    case WM_LBUTTONDOWN:
        /* 非按钮区:拖动窗口 */
        {
            int x = GET_X_LPARAM(lp), y = GET_Y_LPARAM(lp);
            if (!(x >= FLT_BTN_X && x < FLT_BTN_X + FLT_BTN_W &&
                  y >= FLT_BTN_Y && y < FLT_BTN_Y + FLT_BTN_H)) {
                ReleaseCapture();
                SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            }
        }
        return 0;
    case WM_RBUTTONUP:
        ShowWindow(hwnd, SW_HIDE);
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

static void float_register(void)
{
    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = float_wndproc;
    wc.hInstance = GetModuleHandleW(NULL);
    wc.lpszClassName = L"AcFloatWnd";
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    RegisterClassW(&wc);
}

static void float_create(void)
{
    if (g_hFloat) return;
    g_hFloat = CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        L"AcFloatWnd", L"",
        WS_POPUP,
        GetSystemMetrics(SM_CXSCREEN) - FLT_W - 24,
        GetSystemMetrics(SM_CYSCREEN) - FLT_H - 60,
        FLT_W, FLT_H,
        NULL, NULL, GetModuleHandleW(NULL), NULL);
}

static void float_update(const wchar_t *text)
{
    if (text && text[0]) {
        wcsncpy(g_floatText, text, 95);
        g_floatText[95] = 0;
    }
    if (g_hFloat && IsWindowVisible(g_hFloat))
        InvalidateRect(g_hFloat, NULL, FALSE);
}

static void float_toggle(void)
{
    if (!g_hFloat) return;
    if (IsWindowVisible(g_hFloat)) ShowWindow(g_hFloat, SW_HIDE);
    else {
        ShowWindow(g_hFloat, SW_SHOWNOACTIVATE);
        InvalidateRect(g_hFloat, NULL, FALSE);
    }
    log_add(IsWindowVisible(g_hFloat) ? L"悬浮窗已显示" : L"悬浮窗已隐藏");
}

/* ================= 小工具 ================= */

static void set_status(const wchar_t *fmt, ...)
{
    wchar_t buf[256];
    va_list ap;
    va_start(ap, fmt);
    _vsnwprintf(buf, 255, fmt, ap);
    va_end(ap);
    buf[255] = 0;
    SetWindowTextW(g_hStatus, buf);
}

static void msg_info(const wchar_t *s)
{
    MessageBoxW(g_hMain, s, L"保障卡全能工具", MB_ICONINFORMATION);
}
static void msg_err(const wchar_t *s)
{
    MessageBoxW(g_hMain, s, L"保障卡全能工具", MB_ICONERROR);
}

static HWND mk(const wchar_t *cls, const wchar_t *text, DWORD style,
               int x, int y, int w, int h, int id)
{
    HWND hwnd = CreateWindowExW(0, cls, text, WS_CHILD | WS_VISIBLE | style,
                             x, y, w, h, g_hMain, (HMENU)(INT_PTR)id,
                             GetModuleHandleW(NULL), NULL);
    SendMessageW(hwnd, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
    return hwnd;
}

static int ed_int(HWND edit, int defVal)
{
    wchar_t buf[32];
    GetWindowTextW(edit, buf, 31);
    if (!buf[0]) return defVal;
    wchar_t *e;
    long v = wcstol(buf, &e, 10);
    return (e == buf) ? defVal : (int)v;
}

/* ================= 步骤列表显示 ================= */

static void autosave(void);          /* 前向声明(refresh_list 变更后自动保存) */
static void update_bind_button(void);   /* 数据源按钮文本/可用态 */
static void rebind_data(void);          /* 按当前绑定状态重收集数据源 */

static void refresh_list(void)
{
    ListView_DeleteAllItems(g_hList);
    wchar_t buf[64];

    for (int i = 0; i < g_task.count; i++) {
        Step *s = &g_task.steps[i];
        LVITEMW lvi;
        memset(&lvi, 0, sizeof(lvi));
        lvi.mask = LVIF_TEXT;

        /* 列0:拖拽把手(提示此列可拖动排序) */
        lvi.iItem = i;
        lvi.iSubItem = 0;
        lvi.pszText = (LPWSTR)L"⠿";
        int idx = ListView_InsertItem(g_hList, &lvi);
        if (idx < 0) break;

        /* 列1:序号 */
        _snwprintf(buf, 31, L"%d", i + 1);
        buf[31] = 0;
        ListView_SetItemText(g_hList, idx, 1, buf);

        /* 列2:类型 */
        ListView_SetItemText(g_hList, idx, 2, (LPWSTR)act_type_name(s->type));

        /* 列3:坐标 / 跳转目标 */
        switch (s->type) {
        case ACT_DRAG:
            _snwprintf(buf, 63, L"(%d,%d)→(%d,%d)", s->x, s->y, s->x2, s->y2);
            break;
        case ACT_JUMP:
            if (s->jumpTab >= 1 && s->jumpTab <= MAX_TASKS) {
                const Task *jt = &g_taskbook.tasks[s->jumpTab - 1];
                _snwprintf(buf, 63, L"→[%ls] 第%d步",
                           jt->name[0] ? jt->name : gui_tab_display_name(s->jumpTab - 1),
                           s->jumpTo);
            } else {
                _snwprintf(buf, 63, L"→第 %d 步", s->jumpTo);
            }
            break;
        case ACT_CLICK: case ACT_DBLCLICK: case ACT_MULTI:
        case ACT_RCLICK: case ACT_MCLICK: case ACT_SCROLL:
            _snwprintf(buf, 63, L"(%d,%d)", s->x, s->y);
            break;
        default:
            wcscpy(buf, L"—");
            break;
        }
        buf[63] = 0;
        ListView_SetItemText(g_hList, idx, 3, buf);

        /* 列4:次数 / 格数 */
        switch (s->type) {
        case ACT_MULTI:  _snwprintf(buf, 31, L"×%d", s->count > 0 ? s->count : 1); break;
        case ACT_SCROLL: _snwprintf(buf, 31, L"%d 格", s->scroll); break;
        default:         buf[0] = L'—'; buf[1] = 0; break;
        }
        buf[31] = 0;
        ListView_SetItemText(g_hList, idx, 4, buf);

        /* 列5:内容(文本/按键) */
        ListView_SetItemText(g_hList, idx, 5,
            (s->type == ACT_TEXT || s->type == ACT_KEY) ? (LPWSTR)s->text : L"—");

        /* 列6:延迟 前/后 */
        _snwprintf(buf, 63, L"%d / %d", s->delayBefore, s->delayAfter);
        buf[63] = 0;
        ListView_SetItemText(g_hList, idx, 6, buf);

        /* 列7:备注 */
        ListView_SetItemText(g_hList, idx, 7, (LPWSTR)s->note);
    }
    _snwprintf(buf, 63, L"共 %d 个步骤", g_task.count);
    buf[63] = 0;
    if (!g_running) set_status(L"%s", buf);
    marks_sync();                       /* 同步屏幕标记 */
    autosave();                         /* 变更即自动保存 */
}

static int selected_index(void)
{
    return ListView_GetNextItem(g_hList, -1, LVNI_SELECTED);
}

/* ================= 执行 ================= */

static void progress_cb(int loop, int stepIdx, void *ud)
{
    (void)ud;
    PostMessageW(g_hMain, WM_APP_PROGRESS, (WPARAM)loop, (LPARAM)stepIdx);
}

typedef struct { int dummy; } RunArg;

static DWORD WINAPI run_thread(LPVOID arg)
{
    (void)arg;
    /* 可见倒计时(每 100ms 更新,可被停止) */
    int cd = g_task.startCountdown;
    while (cd > 0 && !g_stop_flag) {
        int show = cd;
        PostMessageW(g_hMain, WM_APP_PROGRESS, (WPARAM)-1, (LPARAM)show);
        int step = cd > 100 ? 100 : cd;
        Sleep(step);
        cd -= step;
    }
    if (!g_stop_flag) {
        int r = engine_run(&g_taskbook, g_curTask, win_platform(), progress_cb, NULL);
        PostMessageW(g_hMain, WM_APP_DONE, (WPARAM)r, 0);
    } else {
        PostMessageW(g_hMain, WM_APP_DONE, (WPARAM)ENGINE_STOP, 0);
    }
    return 0;
}

static void start_run(void)
{
    if (g_running) return;
    if (g_task.count == 0) { msg_info(L"步骤列表为空,请先添加步骤或导入 Excel。"); return; }

    /* 读取设置 */
    g_task.loops = ed_int(g_hBtn[0], 1);
    g_task.loopGap = ed_int(g_hBtn[1], 0);
    g_task.startCountdown = ed_int(g_hBtn[2], 0);
    g_task.jitter = ed_int(g_hBtn[3], 0);

    g_stop_flag = 0;
    g_running = 1;
    marks_set_visible(0);           /* 执行中隐藏标记,点击直达目标 */

    for (int i = 6; i <= 12; i++)
        if (g_hBtn[i]) EnableWindow(g_hBtn[i], FALSE);
    for (int i = 0; i < MAX_TASKS; i++)            /* 运行中锁定TAB行 */
        if (g_hTabs[i]) EnableWindow(g_hTabs[i], FALSE);
    if (g_hTabAdd) EnableWindow(g_hTabAdd, FALSE);
    SetWindowTextW(g_hBtn[14], L"停止 Ctrl+F12");
    InvalidateRect(g_hBtn[14], NULL, TRUE);
    float_update(L"运行中…");

    log_add(L"开始执行:共 %d 步,循环 %ls,倒计时 %d ms,抖动 %d ms",
            g_task.count,
            g_task.loops > 0 ? L"(指定轮数)" : L"无限",
            g_task.startCountdown, g_task.jitter);

    g_thread = CreateThread(NULL, 0, run_thread, NULL, 0, NULL);
}

static void stop_run(void)
{
    if (!g_running) return;
    g_stop_flag = 1;
    log_add(L"收到停止请求,等待当前动作完成…");
    set_status(L"正在停止…(等待当前动作完成)");
}

static void run_finished(WPARAM r)
{
    g_running = 0;
    marks_set_visible(1);           /* 恢复屏幕标记 */
    if (g_thread) { WaitForSingleObject(g_thread, 2000); CloseHandle(g_thread); g_thread = NULL; }
    for (int i = 6; i <= 12; i++)
        if (g_hBtn[i]) EnableWindow(g_hBtn[i], TRUE);
    for (int i = 0; i < MAX_TASKS; i++)            /* 解除TAB行锁定 */
        if (g_hTabs[i]) EnableWindow(g_hTabs[i], TRUE);
    if (g_hTabAdd) EnableWindow(g_hTabAdd, TRUE);
    SetWindowTextW(g_hBtn[14], L"开始 F6");
    InvalidateRect(g_hBtn[14], NULL, TRUE);
    float_update(r == ENGINE_STOP ? L"空闲 · 已停止" : L"空闲 · 已完成");
    g_curMark = -1;                     /* 清除执行高亮 */
    for (int i = 0; i < MARK_MAX; i++)
        if (g_marks[i]) InvalidateRect(g_marks[i], NULL, TRUE);
    refresh_list();
    log_add(r == ENGINE_STOP ? L"执行已停止(用户中断)" : L"全部步骤执行完成 ✓");
    set_status(r == ENGINE_STOP ? L"已停止(用户中断)" : L"全部步骤执行完成 ✓");
}

/* ================= 文件操作 ================= */

/* 统一的导入入口:支持 .xlsx 与 .csv;
   替换模式 = 打开任务(恢复步骤+设置);追加模式 = 在现有列表尾部增加 */
static void load_task_file(void);
static void sync_tab_labels(void);   /* TAB文本 <- 任务簿名 */
static int g_excelRows;                 /* 前向声明(定义在后) */
static void apply_excel_rows_check(HWND hwndDlg);

static void load_task_file(void)
{
    wchar_t path[MAX_PATH] = L"";
    OPENFILENAMEW ofn;
    memset(&ofn, 0, sizeof(ofn));
    ofn.lStructSize = sizeof(ofn);
    ofn.hwndOwner = g_hMain;
    ofn.lpstrFilter = L"任务 / Excel 文件 (*.xlsx;*.csv;*.txt)\0*.xlsx;*.csv;*.txt\0所有文件 (*.*)\0*.*\0";
    ofn.lpstrFile = path;
    ofn.nMaxFile = MAX_PATH;
    ofn.Flags = OFN_FILEMUSTEXIST | OFN_HIDEREADONLY;
    ofn.lpstrTitle = L"选择任务 / Excel 文件";
    if (!GetOpenFileNameW(&ofn)) return;

    size_t len = 0;
    unsigned char *data = read_file_all(path, &len);
    if (!data) { msg_err(L"无法读取文件。"); return; }

    const wchar_t *fname = wcsrchr(path, L'\\') ? wcsrchr(path, L'\\') + 1 : path;
    int isCsv = !(len >= 4 && data[0] == 'P' && data[1] == 'K');

    int mode = MessageBoxW(g_hMain,
        L"选择导入方式:\n\n"
        L"【是】 替换全部步骤并恢复文件中的设置(= 打开任务)\n"
        L"【否】 追加到当前列表末尾(保留现有步骤与设置)\n"
        L"【取消】 放弃",
        L"导入任务", MB_YESNOCANCEL | MB_ICONQUESTION);
    if (mode == IDCANCEL) { free(data); return; }

    int n = -1;
    Sheet sh;
    memset(&sh, 0, sizeof(sh));
    int ok;
    if (isCsv)
        ok = csv_parse(data, len, win_gbk_to_utf8, &sh);
    else
        ok = xlsx_parse(data, len, &sh);
    if (ok == 0)
        n = task_import_sheet(&g_task, &sh, mode == IDNO);
    free(data);

    if (n < 0) {
        sheet_free(&sh);
        msg_err(L"解析失败:\n· .xlsx 文件需为 Excel 2007 及以上格式\n· .csv 需为 UTF-8 或 ANSI 编码\n\n请用 Excel 重新保存后重试。");
        return;
    }

    /* 按Excel行数:记录导入行数;勾选时同步数据源 */
    HWND chk = GetDlgItem(g_hMain, IDC_CHK_EXCELROWS);
    BOOL rowsChecked = (SendMessageW(chk, BM_GETCHECK, 0, 0) == BST_CHECKED);
    g_excelRows = (n > 0) ? n : g_task.dataRowCount;
    if (rowsChecked || g_task.loopsFromExcel)
        collect_data_rows(&sh, 0);
    sheet_free(&sh);

    if (n == 0 && g_task.dataRowCount == 0) {
        msg_info(L"未识别到有效步骤行。\n\n格式:动作 | X | Y | 次数 | 间隔毫秒 | 文本或按键 | 前延时毫秒 | 后延时毫秒 | 输入前清空 | 启用 | 备注\n首行可为表头。");
        return;
    }

    /* 替换模式回填设置控件 */
    if (mode == IDYES) {
        wchar_t buf[32];
        _snwprintf(buf, 31, L"%d", g_task.loopGap);        buf[31] = 0;
        SetWindowTextW(g_hBtn[1], buf);
        _snwprintf(buf, 31, L"%d", g_task.startCountdown); buf[31] = 0;
        SetWindowTextW(g_hBtn[2], buf);
        _snwprintf(buf, 31, L"%d", g_task.jitter);         buf[31] = 0;
        SetWindowTextW(g_hBtn[3], buf);

        /* 勾选状态恢复 */
        SendMessageW(chk, BM_SETCHECK,
                     g_task.loopsFromExcel ? BST_CHECKED : BST_UNCHECKED, 0);
        if (g_task.loopsFromExcel) {
            EnableWindow(g_hBtn[0], FALSE);
            _snwprintf(buf, 31, L"%d", g_excelRows > 0 ? g_excelRows : 1);
            buf[31] = 0;
            SetWindowTextW(g_hBtn[0], buf);
        } else {
            EnableWindow(g_hBtn[0], TRUE);
            _snwprintf(buf, 31, L"%d", g_task.loops);
            buf[31] = 0;
            SetWindowTextW(g_hBtn[0], buf);
        }
    } else if (rowsChecked) {
        /* 追加模式下勾选:循环次数刷新为新行数 */
        wchar_t buf[32];
        _snwprintf(buf, 31, L"%d", g_excelRows > 0 ? g_excelRows : 1);
        buf[31] = 0;
        SetWindowTextW(g_hBtn[0], buf);
    }

    wchar_t buf[160];
    _snwprintf(buf, 159, L"%ls %d 个步骤(来源:%s)",
               mode == IDYES ? L"已打开任务,共" : L"已追加", n, fname);
    buf[159] = 0;
    log_add(L"%ls:%d 个步骤(来源:%s)",
            mode == IDYES ? L"打开任务" : L"追加导入", n, fname);
    if (rowsChecked || g_task.loopsFromExcel) {
        log_add(L"按Excel行数:循环次数 = %d", g_excelRows);
        if (g_task.dataRowCount > 0)
            log_add(L"数据源 %d 行已绑定;输入步骤文本中的 {行} 将逐轮替换", g_task.dataRowCount);
    }
    set_status(L"%s", buf);
    sync_tab_labels();     /* 文件含 #TAB名 时恢复显示名 */
    refresh_list();
}

/* ---- 数据源绑定状态与接口(编辑对话框的工作表/表头选择驱动) ---- */

/* 当前数据源绑定状态(导入Excel数据后记录,供编辑框内重选) */
static wchar_t g_bindPath[MAX_PATH] = L"";
static int  g_bindIsXlsx = 0;
static int  g_bindSheet = 0;                 /* 选中的工作表索引 */
static int  g_bindCol = 0;                   /* 数据列:0=第1列含首行,n=第n列(表头名) */
static char g_bindSheetNames[16][48];
static int  g_bindSheetN = 0;
static char g_bindColNames[24][48];          /* 当前工作表首行各列名 */
static int  g_bindColN = 0;

int gui_excel_sheet_count(void)
{
    return (g_bindPath[0] && g_bindIsXlsx) ? g_bindSheetN : 0;
}

const char *gui_excel_sheet_name(int idx)
{
    if (idx < 0 || idx >= g_bindSheetN || idx >= 16) return "";
    return g_bindSheetNames[idx];
}

int gui_excel_cur_sheet(void) { return g_bindSheet; }
int gui_excel_cur_col(void)   { return g_bindCol; }

int gui_excel_col_count(void)
{
    return g_bindColN;
}

const char *gui_excel_col_name(int idx)
{
    if (idx < 0 || idx >= g_bindColN || idx >= 24) return "";
    return g_bindColNames[idx];
}

/* 从 Sheet 首行刷新列名名单(供编辑框的"数据列"下拉) */
static void bind_refresh_cols(const Sheet *sh)
{
    g_bindColN = 0;
    if (!sh || sh->rows <= 0 || !sh->cells || !sh->cells[0]) return;
    for (int c = 0; c < sh->cols && g_bindColN < 24; c++) {
        const char *v = sh->cells[0][c];
        if (v && v[0])
            snprintf(g_bindColNames[g_bindColN++], 48, "%s", v);
        else
            snprintf(g_bindColNames[g_bindColN++], 48, "列%d", c + 1);
    }
}

/* 按当前绑定文件与选择(工作表/数据列)重新收集数据源并同步主界面。
   col=0 取第1列含首行;col>=1 取该列并跳过表头行。返回数据行数 */
int gui_rebind_excel(int sheet, int col)
{
    if (!g_bindPath[0]) return 0;
    size_t len = 0;
    unsigned char *data = read_file_all(g_bindPath, &len);
    if (!data) { msg_err(L"无法重新读取数据文件。"); return 0; }
    Sheet sh;
    memset(&sh, 0, sizeof(sh));
    int ok = g_bindIsXlsx ? xlsx_parse_sheet(data, len, sheet, &sh)
                          : csv_parse(data, len, win_gbk_to_utf8, &sh);
    free(data);
    if (ok != 0) { sheet_free(&sh); msg_err(L"解析失败,数据源未变更。"); return 0; }
    bind_refresh_cols(&sh);
    collect_data_rows(&sh, col);
    sheet_free(&sh);

    g_bindSheet = g_bindIsXlsx ? sheet : 0;
    g_bindCol = col;
    g_excelRows = g_task.dataRowCount;
    wchar_t buf[32];
    _snwprintf(buf, 31, L"%d", g_excelRows > 0 ? g_excelRows : 1);
    buf[31] = 0;
    SetWindowTextW(g_hBtn[0], buf);
    HWND chk = GetDlgItem(g_hMain, IDC_CHK_EXCELROWS);
    if (chk && g_task.dataRowCount > 0) SendMessageW(chk, BM_SETCHECK, BST_CHECKED, 0);
    if (col >= 1) {
        wchar_t w[48] = L"";
        u8_to_wcs(gui_excel_col_name(col - 1), w, 47);
        log_add(L"数据源已更新:%d 行(表头列「%s」,已跳过表头行)", g_task.dataRowCount, w);
    } else {
        log_add(L"数据源已更新:%d 行(第1列,含首行)", g_task.dataRowCount);
    }
    return g_task.dataRowCount;
}

/* 编辑窗「导入Excel数据」第一步:选择文件并记录工作表名单。
   返回工作表数(xlsx),0=CSV 文件,-1=取消/失败。后续由编辑框控件驱动 */
int gui_pick_excel_file(HWND owner)
{
    wchar_t path[MAX_PATH] = L"";
    OPENFILENAMEW ofn;
    memset(&ofn, 0, sizeof(ofn));
    ofn.lStructSize = sizeof(ofn);
    ofn.hwndOwner = owner;
    ofn.lpstrFilter = L"Excel / CSV 文件 (*.xlsx;*.csv;*.txt) *.xlsx;*.csv;*.txt 所有文件 (*.*) *.* ";
    ofn.lpstrFile = path;
    ofn.nMaxFile = MAX_PATH;
    ofn.Flags = OFN_FILEMUSTEXIST | OFN_HIDEREADONLY;
    ofn.lpstrTitle = L"选择 Excel 数据(取第一列每行)";
    if (!GetOpenFileNameW(&ofn)) return -1;

    size_t len = 0;
    unsigned char *data = read_file_all(path, &len);
    if (!data) { msg_err(L"无法读取文件。"); return -1; }

    int isXlsx = (len >= 4 && data[0] == 'P' && data[1] == 'K');
    int ns = 0;
    if (isXlsx) {
        ns = xlsx_list_sheets(data, len, g_bindSheetNames, 16);
        if (ns < 0) { free(data); msg_err(L"无法读取工作簿结构。"); return -1; }
    }
    free(data);

    wcsncpy(g_bindPath, path, MAX_PATH - 1);
    g_bindPath[MAX_PATH - 1] = 0;
    g_bindIsXlsx = isXlsx;
    g_bindSheetN = isXlsx ? ns : 0;
    g_bindSheet = 0;

    /* 预解析一次取列名(编辑框的"数据列"下拉立即有内容) */
    data = read_file_all(g_bindPath, &len);
    if (data) {
        Sheet sh;
        memset(&sh, 0, sizeof(sh));
        int ok2 = isXlsx ? xlsx_parse_sheet(data, len, 0, &sh)
                         : csv_parse(data, len, win_gbk_to_utf8, &sh);
        if (ok2 == 0) bind_refresh_cols(&sh);
        sheet_free(&sh);
        free(data);
    }
    /* 默认:首行像表头(第一格非空且非纯数字)则选第1列表头,否则含首行 */
    g_bindCol = 0;
    if (g_bindColN > 0 && g_bindColNames[0][0]) {
        const char *v = g_bindColNames[0];
        int digitsOnly = 1;
        for (const char *q = v; *q; q++)
            if (*q < '0' || *q > '9') { digitsOnly = 0; break; }
        if (!digitsOnly) g_bindCol = 1;
    }
    return isXlsx ? ns : 0;
}

/* 从 Sheet 收集数据行供 {行} 替换。
   col=0:取第 1 列全部行(跳过 # 行、动作行与已知表头词);
   col>=1:取第 col 列并跳过首行(首行为表头) */
static void collect_data_rows(const Sheet *sh, int col)
{
    int ci = (col >= 1) ? col - 1 : 0;
    int skipFirst = (col >= 1);
    if (g_task.dataRows) {
        for (int i = 0; i < g_task.dataRowCount; i++) free(g_task.dataRows[i]);
        free(g_task.dataRows);
        g_task.dataRows = NULL;
        g_task.dataRowCount = 0;
    }
    static wchar_t wbuf[AC_TEXT_MAX * 2];
    for (int r = skipFirst ? 1 : 0; r < sh->rows; r++) {
        if (!sh->cells || !sh->cells[r]) continue;
        if (ci >= sh->cols) continue;
        const char *cell = sh->cells[r][ci];
        if (!cell || !cell[0]) continue;
        if (u8_to_wcs(cell, wbuf, AC_TEXT_MAX * 2 - 1) == 0) continue;
        if (wbuf[0] == L'#' || act_type_from_name(wbuf) >= 0) continue;
        if (wcscmp(wbuf, L"动作") == 0 || _wcsicmp(wbuf, L"action") == 0 ||
            wcscmp(wbuf, L"类型") == 0)
            continue;                                   /* 表头 */

        wchar_t *dup = (wchar_t *)malloc((wcslen(wbuf) + 1) * sizeof(wchar_t));
        if (!dup) continue;
        wcscpy(dup, wbuf);
        wchar_t **nr = (wchar_t **)realloc(g_task.dataRows,
                (size_t)(g_task.dataRowCount + 1) * sizeof(wchar_t *));
        if (!nr) { free(dup); break; }
        g_task.dataRows = nr;
        g_task.dataRows[g_task.dataRowCount++] = dup;
    }
}

/* 勾选「按Excel行数」:循环次数自动 = 最近导入文件的行数 */
static int g_excelRows = 0;      /* 最近一次导入的行数 */
static int g_manualLoops = 1;    /* 手填的循环次数(取消勾选时恢复) */

static void apply_excel_rows_check(HWND hwndDlg)
{
    HWND chk = GetDlgItem(g_hMain, IDC_CHK_EXCELROWS);
    BOOL on = (SendMessageW(chk, BM_GETCHECK, 0, 0) == BST_CHECKED);
    g_task.loopsFromExcel = on ? 1 : 0;

    wchar_t buf[32];
    if (on) {
        g_manualLoops = ed_int(g_hBtn[0], 1);
        _snwprintf(buf, 31, L"%d", g_excelRows > 0 ? g_excelRows : 1);
        buf[31] = 0;
        SetWindowTextW(g_hBtn[0], buf);
        EnableWindow(g_hBtn[0], FALSE);
        log_add(L"按Excel行数:循环次数 = %d(最近导入的行数)", g_excelRows);
        if (g_task.dataRowCount > 0)
            log_add(L"数据源 %d 行已绑定;输入步骤文本中的 {行} 将逐轮替换", g_task.dataRowCount);
    } else {
        EnableWindow(g_hBtn[0], TRUE);
        _snwprintf(buf, 31, L"%d", g_manualLoops);
        buf[31] = 0;
        SetWindowTextW(g_hBtn[0], buf);
    }
}

static void save_task(void)
{
    wchar_t path[MAX_PATH] = L"任务1.csv";
    OPENFILENAMEW ofn;
    memset(&ofn, 0, sizeof(ofn));
    ofn.lStructSize = sizeof(ofn);
    ofn.hwndOwner = g_hMain;
    ofn.lpstrFilter = L"任务文件 (*.csv)\0*.csv\0所有文件 (*.*)\0*.*\0";
    ofn.lpstrFile = path;
    ofn.nMaxFile = MAX_PATH;
    ofn.Flags = OFN_OVERWRITEPROMPT | OFN_HIDEREADONLY;
    ofn.lpstrDefExt = L"csv";
    if (!GetSaveFileNameW(&ofn)) return;

    /* 保存前读取设置控件 */
    g_task.loops = ed_int(g_hBtn[0], 1);
    g_task.loopGap = ed_int(g_hBtn[1], 0);
    g_task.startCountdown = ed_int(g_hBtn[2], 0);
    g_task.jitter = ed_int(g_hBtn[3], 0);

    size_t len = 0;
    char *csv = task_export_csv(&g_task, &len);
    if (!csv) { msg_err(L"生成任务数据失败。"); return; }

    FILE *f = _wfopen(path, L"wb");
    if (!f) { free(csv); msg_err(L"无法写入文件。"); return; }
    fwrite(csv, 1, len, f);
    fclose(f);
    free(csv);
    set_status(L"任务已保存(可用 Excel 打开编辑)");
    log_add(L"保存任务:共 %d 步", g_task.count);
}

/* ================= 步骤编辑 ================= */

static void add_step(void)
{
    /* 第一步:选择步骤类型 */
    int type = pick_step_type_dialog(g_hMain);
    if (type < 0) return;

    /* 第二步:详细设置 */
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = type;
        s.delayAfter = 200;
    g_mark_seq = g_task.count + 1;      /* 取点预览标记用序号 */
    if (edit_step_dialog(g_hMain, &s, 1)) {
        task_add(&g_task, &s);
        refresh_list();
        ListView_SetItemState(g_hList, g_task.count - 1,
                              LVIS_SELECTED | LVIS_FOCUSED, LVIS_SELECTED | LVIS_FOCUSED);
    }
}

static void edit_step(void)
{
    int i = selected_index();
    if (i < 0 || i >= g_task.count) { msg_info(L"请先选中一个步骤。"); return; }
    g_mark_seq = i + 1;                /* 取点预览标记用序号 */
    if (edit_step_dialog(g_hMain, &g_task.steps[i], 0))
        refresh_list();
}

static void del_step(void)
{
    int i = selected_index();
    if (i < 0) return;
    task_remove(&g_task, i);
    refresh_list();
}

/* ================= 菜单 / 通知 ================= */

#define MENU_FILE   10
#define MENU_EDITM  11
#define MENU_RUN    12
#define MENU_HELP   13

enum {
    M_OPEN = 2001, M_SAVE, M_IMPEXCEL, M_IMPTEXT, M_EXIT,
    M_ADD, M_EDIT, M_DEL, M_UP, M_DOWN, M_DUP, M_PICK, M_CLEARALL,
    M_START, M_STOP,
    M_ABOUT, M_HELP,
    CTX_EDIT, CTX_DEL, CTX_UP, CTX_DOWN, CTX_DUP
};

/* 打开网页版「保障卡综合检查工具」(需从 Release 下载 checker-web.zip 解压) */
static void open_checker_tool(void)
{
    wchar_t dir[MAX_PATH], html[MAX_PATH + 64];
    GetModuleFileNameW(NULL, dir, MAX_PATH);
    wchar_t *p = wcsrchr(dir, L'\\');
    if (p) *(p + 1) = 0;
    _snwprintf(html, MAX_PATH + 63, L"%s保障卡综合检查工具\\主程序.html", dir);
    html[MAX_PATH + 63] = 0;
    if (GetFileAttributesW(html) != INVALID_FILE_ATTRIBUTES) {
        ShellExecuteW(NULL, L"open", html, NULL, NULL, SW_SHOWNORMAL);
        log_add(L"已打开综合检查工具(浏览器)");
    } else {
        msg_info(L"未找到综合检查工具。\n\n"
                 L"请从 GitHub Release 下载 baozhangka-checker-web.zip,\n"
                 L"解压到本程序所在目录,使存在:\n"
                 L"  保障卡综合检查工具\\主程序.html");
    }
}

static void show_help(void)
{
    MessageBoxW(g_hMain,
        L"【使用说明】\n\n"
        L"1. 添加步骤:点『添加』选类型,点『屏幕取点』到屏幕上点一下即取该处坐标\n"
        L"2. 常用动作:\n"
        L"   · 单击/双击/多击/右击/中击:点哪里就点哪里,坐标精确\n"
        L"   · 文本输入:支持中文,粘贴方式输入;勾选『输入前清空』会先 Ctrl+A 清空\n"
        L"   · 按键:ctrl+s、alt+tab、win+r、F5 等组合\n"
        L"   · 等待/滚动/拖动按提示填写\n"
        L"3. Excel 数据驱动:设置区点『数据』选择 Excel,第一列每行会绑定为一轮的数据,\n"
        L"   循环次数自动=行数;输入步骤的文本中写 {行},执行时自动替换为当轮内容\n"
        L"4. 导入:支持 .xlsx 与 .csv,可选择替换(打开任务)或追加\n"
        L"5. 开始:F6 或『开始』按钮;停止:再点同一按钮或 Ctrl+F12(全局热键)\n"
        L"5. 前延时/后延时:每步执行前后等待的时间\n\n"
        L"提示:执行期间请勿移动鼠标,点击/输入动作依赖鼠标键盘模拟。",
        L"使用说明 - 保障卡全能工具", MB_ICONINFORMATION);
}

/* 右键菜单 */
static void list_context_menu(void)
{
    int i = selected_index();
    HMENU m = CreatePopupMenu();
    AppendMenuW(m, MF_STRING, CTX_EDIT,   L"编辑…");
    AppendMenuW(m, MF_STRING, CTX_DEL,    L"删除");
    AppendMenuW(m, MF_SEPARATOR, 0, NULL);
    AppendMenuW(m, MF_STRING, CTX_UP,     L"上移");
    AppendMenuW(m, MF_STRING, CTX_DOWN,   L"下移");
    AppendMenuW(m, MF_STRING, CTX_DUP,    L"复制");
    POINT pt;
    GetCursorPos(&pt);
    TrackPopupMenu(m, TPM_RIGHTBUTTON, pt.x, pt.y, 0, g_hMain, NULL);
    DestroyMenu(m);
    (void)i;
}

/* 页面切换:0=任务 1=日志 */
static void layout_children(int cx, int cy);   /* 前向声明 */

static void switch_page(int page)
{
    if (page == g_page) return;
    g_page = page;

    int taskCtrls = (page == 0);
    for (int i = 0; i < 4; i++) {
        ShowWindow(g_hBtn[i], taskCtrls ? SW_SHOW : SW_HIDE);
    }
    const int taskLabelIds[] = { IDC_LB1, IDC_LB2, IDC_LB3, IDC_LB4 };
    for (int i = 0; i < 4; i++) {
        HWND h = GetDlgItem(g_hMain, taskLabelIds[i]);
        if (h) ShowWindow(h, taskCtrls ? SW_SHOW : SW_HIDE);
    }
    ShowWindow(g_hList, taskCtrls ? SW_SHOW : SW_HIDE);
    ShowWindow(g_hStatus, taskCtrls ? SW_SHOW : SW_HIDE);
    ShowWindow(g_hBtn[14], taskCtrls ? SW_SHOW : SW_HIDE);   /* 运行按钮 */

    ShowWindow(g_hLog, page == 1 ? SW_SHOW : SW_HIDE);
    ShowWindow(GetDlgItem(g_hMain, IDC_BTN_LOGCLEAR), page == 1 ? SW_SHOW : SW_HIDE);
    ShowWindow(GetDlgItem(g_hMain, IDC_CHK_AUTOSCROLL), page == 1 ? SW_SHOW : SW_HIDE);

    g_uiNavSel = (page == 0) ? g_hBtn[4] : g_hBtn[5];
    InvalidateRect(g_hBtn[4], NULL, TRUE);
    InvalidateRect(g_hBtn[5], NULL, TRUE);

    RECT rc;
    GetClientRect(g_hMain, &rc);
    layout_children(rc.right, rc.bottom);
}

/* ================= 自动保存 / 自动恢复 ================= */

static wchar_t g_autosavePath[MAX_PATH] = L"";

static void autoload(void);

static void autosave_path(void)
{
    if (g_autosavePath[0]) return;
    wchar_t exe[MAX_PATH];
    GetModuleFileNameW(NULL, exe, MAX_PATH);
    wcscpy(g_autosavePath, exe);
    wchar_t *p = wcsrchr(g_autosavePath, L'\\');
    if (p) *(p + 1) = 0;                       /* 保留反斜杠 */
    wcscat(g_autosavePath, L"last_task.csv");
}

/* 任务有变更时自动保存到程序目录 last_task.csv */
static void autosave(void)
{
    autosave_path();
    g_taskbook.count = g_tabCount;   /* 随文件持久化,重启恢复TAB数 */
    size_t len = 0;
    char *csv = taskbook_export_csv(&g_taskbook, &len);
    if (!csv) return;
    FILE *f = _wfopen(g_autosavePath, L"wb");
    if (f) {
        fwrite(csv, 1, len, f);
        fclose(f);
    }
    free(csv);
}

/* 启动时自动恢复上次任务(整本) */
static void autoload(void)
{
    autosave_path();
    size_t len = 0;
    unsigned char *data = read_file_all(g_autosavePath, &len);
    if (!data) return;
    int n = taskbook_import_csv(&g_taskbook, (const char *)data, len);
    free(data);
    /* 恢复TAB数:优先用文件中的 #标签数(空白TAB也恢复);旧文件按内容推断 */
    if (g_taskbook.count >= 1) {
        g_tabCount = g_taskbook.count;
    } else {
        int cnt = 0;
        for (int i = 0; i < MAX_TASKS; i++)
            if (g_taskbook.tasks[i].count > 0 || g_taskbook.tasks[i].name[0]) cnt = i + 1;
        g_tabCount = cnt > 1 ? cnt : 1;
    }
    if (g_curTask >= g_tabCount) g_curTask = 0;
    g_taskbook.count = g_tabCount;
    log_add(L"已自动恢复上次任务:%d 个步骤(%d 个TAB)", n > 0 ? n : 0, g_tabCount);
}

/* ================= 主窗口过程 ================= */

/* 主区内容起点/宽度 */
#define MAIN_X(cx)   (NAV_W + CARD_PAD + 16)
#define MAIN_W(cx)   ((cx) - NAV_W - CARD_PAD * 2 - 28)

static void layout_children(int cx, int cy)
{
    if (!g_hList) return;
    int mx = MAIN_X(cx);
    int mw = MAIN_W(cx);

    /* 任务页设置行(顶部无标题,直接从 SET_TOP 开始) */
    int gy = SET_TOP;
    MoveWindow(GetDlgItem(g_hMain, IDC_LB1), mx, gy + 4, 54, 20, TRUE);
    MoveWindow(g_hBtn[0], mx + 56, gy, 46, 22, TRUE);
    MoveWindow(GetDlgItem(g_hMain, IDC_CHK_EXCELROWS), mx + 106, gy + 1, 100, 20, TRUE);
    MoveWindow(GetDlgItem(g_hMain, IDC_LB2), mx + 216, gy + 4, 68, 20, TRUE);
    MoveWindow(g_hBtn[1], mx + 288, gy, 52, 22, TRUE);
    MoveWindow(GetDlgItem(g_hMain, IDC_LB3), mx + 392, gy + 4, 88, 20, TRUE);
    MoveWindow(g_hBtn[2], mx + 484, gy, 52, 22, TRUE);
    MoveWindow(GetDlgItem(g_hMain, IDC_LB4), mx + 588, gy + 4, 78, 20, TRUE);
    MoveWindow(g_hBtn[3], mx + 670, gy, 52, 22, TRUE);
    /* 悬浮窗开关:紧随设置行,与输入框垂直对齐 */
    MoveWindow(GetDlgItem(g_hMain, IDC_BTN_FLOAT), mx + 736, gy - 1, 88, 24, TRUE);


    /* TAB 行(只显示 g_tabCount 个 + ＋按钮;删除用 TAB 内嵌 ×) */
    {
        int tx = mx;
        for (int i = 0; i < MAX_TASKS; i++) {
            if (g_hTabs[i]) {
                if (i < g_tabCount) {
                    MoveWindow(g_hTabs[i], tx, TABS_TOP, 72, TAB_H, TRUE);
                    ShowWindow(g_hTabs[i], SW_SHOW);
                    tx += 74;
                } else {
                    ShowWindow(g_hTabs[i], SW_HIDE);
                }
            }
        }
        if (g_hTabAdd) {
            MoveWindow(g_hTabAdd, tx + 4, TABS_TOP, 28, TAB_H, TRUE);
            ShowWindow(g_hTabAdd, g_tabCount < MAX_TASKS ? SW_SHOW : SW_HIDE);
        }
    }

    MoveWindow(g_hList, mx - 8, TABS_TOP + TAB_H + 8, mw + 16,
               cy - (TABS_TOP + TAB_H + 8) - 58, TRUE);

    int by = cy - 46;
    int btnX = cx - CARD_PAD - 16 - 130;                   /* 运行按钮左缘 */
    MoveWindow(g_hStatus, mx, by + 5, btnX - mx - 16, 20, TRUE);
    MoveWindow(g_hBtn[14], btnX, by, 130, 30, TRUE);

    /* 日志页 */
    MoveWindow(GetDlgItem(g_hMain, IDC_CHK_AUTOSCROLL), mx, gy + 2, 90, 20, TRUE);
    MoveWindow(GetDlgItem(g_hMain, IDC_BTN_LOGCLEAR), mx + 104, gy - 2, 96, 26, TRUE);
    MoveWindow(g_hLog, mx - 8, SET_TOP + 32, mw + 16, cy - (SET_TOP + 32) - 18, TRUE);
}

/* 绘制左侧导航栏底色 + 主区白色圆角卡片 */
static void paint_shell(HDC dc, int cx, int cy)
{
    /* 侧栏(QQ 灰) */
    RECT rcNav = { 0, 0, NAV_W, cy };
    FillRect(dc, &rcNav, g_hbrBg);

    /* 主区白色圆角卡片 */
    HBRUSH br = CreateSolidBrush(CARD_BG);
    HPEN pen = CreatePen(PS_SOLID, 1, RGB(0xEC,0xEC,0xEC));
    HGDIOBJ ob = SelectObject(dc, br);
    HGDIOBJ op = SelectObject(dc, pen);
    RoundRect(dc, NAV_W + CARD_PAD - 3, CARD_PAD - 3, cx - CARD_PAD + 3, cy - CARD_PAD + 3, 12, 12);
    SelectObject(dc, ob);
    SelectObject(dc, op);
    DeleteObject(br);
    DeleteObject(pen);

    /* 卡片与列表之间的分隔线 */
    RECT sep = { NAV_W + CARD_PAD + 8, 84, cx - CARD_PAD - 8, 85 };
    HBRUSH brSep = CreateSolidBrush(RGB(0xF0,0xF0,0xF0));
    FillRect(dc, &sep, brSep);
    DeleteObject(brSep);
}

/* TAB 按钮文本 <- 任务簿:自定义名优先,空则默认 步骤N */
static void sync_tab_labels(void)
{
    for (int i = 0; i < MAX_TASKS; i++) {
        if (!g_hTabs[i]) continue;
        if (g_taskbook.tasks[i].name[0]) {
            SetWindowTextW(g_hTabs[i], g_taskbook.tasks[i].name);
        } else {
            wchar_t lbl[16];
            _snwprintf(lbl, 15, L"步骤%d", i + 1);
            lbl[15] = 0;
            SetWindowTextW(g_hTabs[i], lbl);
        }
    }
}

/* 双击TAB重命名(空名=取消不改) */
static void rename_tab(int idx)
{
    if (g_running || idx < 0 || idx >= g_tabCount) return;
    wchar_t buf[AC_TASKNAME_MAX];
    wcsncpy(buf, g_taskbook.tasks[idx].name, AC_TASKNAME_MAX - 1);
    buf[AC_TASKNAME_MAX - 1] = 0;
    if (!rename_tab_dialog(g_hMain, L"重命名步骤", buf, AC_TASKNAME_MAX)) return;
    wcsncpy(g_taskbook.tasks[idx].name, buf, AC_TASKNAME_MAX - 1);
    g_taskbook.tasks[idx].name[AC_TASKNAME_MAX - 1] = 0;
    sync_tab_labels();
    log_add(L"步骤%d 已重命名:%s", idx + 1, g_taskbook.tasks[idx].name);
    autosave();
}

/* 删除指定索引的步骤TAB(数据前移补位) */
static void delete_tab(int idx)
{
    static DWORD lastDelTime = 0;
    static int   lastDelIdx = -1;
    DWORD now = GetTickCount();
    if (g_running || g_tabCount <= 1) return;
    if (idx < 0 || idx >= g_tabCount) return;
    /* 同一TAB上双击(× 区快速两击)只删一次;不同TAB连续删除不受限 */
    if (idx == lastDelIdx && now - lastDelTime < 400) return;
    lastDelTime = now;
    lastDelIdx = idx;
    task_free(&g_taskbook.tasks[idx]);            /* 释放被删任务的步骤/数据源 */
    for (int i = idx; i < g_tabCount - 1 && i < MAX_TASKS - 1; i++)
        g_taskbook.tasks[i] = g_taskbook.tasks[i + 1];
    task_init(&g_taskbook.tasks[g_tabCount - 1]);
    g_tabCount--;
    if (idx < g_curTask) g_curTask--;               /* 删的是前面的TAB,当前索引前移 */
    if (g_curTask >= g_tabCount) g_curTask = g_tabCount - 1;
    g_closeHot = -1;
    sync_tab_labels();                              /* 名字随数据前移 */
    RECT rc;
    GetClientRect(g_hMain, &rc);
    layout_children(rc.right, rc.bottom);
    refresh_list();
    log_add(L"已删除 步骤%d(剩余 %d 个)", idx + 1, g_tabCount);
}

/* ================= 步骤列表拖拽排序 ================= */
/* LVN_BEGINDRAG 进入:拖动影像 + 插入位置指示线,松开移动步骤,ESC 取消 */
static void list_begin_drag(NM_LISTVIEW *nmlv)
{
    static int busy = 0;
    if (busy || g_running) return;
    int src = nmlv->iItem;
    if (src < 0 || src >= g_task.count || g_task.count < 2) return;
    busy = 1;

    HWND hList = nmlv->hdr.hwndFrom;
    POINT ptStart = nmlv->ptAction;

    /* 拖动影像(创建失败则只用插入线,同样可拖) */
    HIMAGELIST himl = NULL;
    POINT ptHot = ptStart;
    himl = ListView_CreateDragImage(hList, src, &ptHot);
    if (himl) {
        ImageList_BeginDrag(himl, 0, ptHot.x, ptHot.y);
        POINT pts = ptStart;
        ClientToScreen(hList, &pts);
        ImageList_DragEnter(NULL, pts.x, pts.y);
    }
    SetCapture(g_hMain);

    int dst = -1;                    /* 插入位(0..count);-1=拖出列表/取消 */
    LVINSERTMARK im;
    MSG msg;
    for (;;) {
        if (!PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) { WaitMessage(); continue; }
        if (msg.message == WM_MOUSEMOVE) {
            POINT ptS = msg.pt;                          /* 屏幕坐标 */
            if (himl) ImageList_DragMove(ptS.x, ptS.y);
            POINT ptC = ptS;
            ScreenToClient(hList, &ptC);
            RECT rc;
            GetClientRect(hList, &rc);
            /* 上下边缘自动滚动 */
            if (ptC.y > rc.top && ptC.y < rc.bottom) {
                if (ptC.y < rc.top + 26)      ListView_Scroll(hList, 0, -16);
                else if (ptC.y > rc.bottom - 26) ListView_Scroll(hList, 0, 16);
            }
            LVHITTESTINFO ht;
            memset(&ht, 0, sizeof(ht));
            ht.pt = ptC;
            int hit = ListView_HitTest(hList, &ht);
            int inside = PtInRect(&rc, ptC) && hit >= 0 &&
                         !(ht.flags & (LVHT_NOWHERE | LVHT_ABOVE | LVHT_BELOW));
            if (himl) ImageList_DragShowNolock(FALSE);
            memset(&im, 0, sizeof(im));
            im.cbSize = sizeof(im);
            im.iItem = -1;
            if (inside) {                                /* 行上半=插其前,下半=插其后 */
                RECT rcItem;
                ListView_GetItemRect(hList, hit, &rcItem, LVIR_BOUNDS);
                im.iItem = hit;
                im.dwFlags = (ptC.y > (rcItem.top + rcItem.bottom) / 2) ? LVIM_AFTER : 0;
            }
            SendMessageW(hList, LVM_SETINSERTMARK, 0, (LPARAM)&im);
            dst = inside ? hit + (im.dwFlags & LVIM_AFTER ? 1 : 0) : -1;
            if (himl) ImageList_DragShowNolock(TRUE);
        } else if (msg.message == WM_LBUTTONUP) {
            break;
        } else if (msg.message == WM_KEYDOWN && msg.wParam == VK_ESCAPE) {
            dst = -1;
            break;
        } else if (msg.message == WM_CANCELMODE) {
            dst = -1;
            break;
        } else {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }

    ReleaseCapture();
    if (himl) { ImageList_EndDrag(); ImageList_Destroy(himl); }
    memset(&im, 0, sizeof(im));
    im.cbSize = sizeof(im);
    im.iItem = -1;
    SendMessageW(hList, LVM_SETINSERTMARK, 0, (LPARAM)&im);   /* 清除插入线 */

    if (dst >= 0 && dst != src && dst != src + 1) {
        task_move_to(&g_task, src, dst);
        int final = dst > src ? dst - 1 : dst;
        refresh_list();
        ListView_SetItemState(g_hList, final,
                              LVIS_SELECTED | LVIS_FOCUSED, LVIS_SELECTED | LVIS_FOCUSED);
        ListView_EnsureVisible(g_hList, final, FALSE);
        log_add(L"步骤%d 已移到第 %d 位", src + 1, final + 1);
    }
    busy = 0;
}

static LRESULT CALLBACK main_wndproc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_CREATE: {
        /* ★关键:WM_CREATE 在 CreateWindowExW 内部触发,
           此时必须先记录窗口句柄,否则子控件父窗口为 NULL 创建失败 */
        g_hMain = hwnd;

        /* ---- 左侧导航栏(QQ 风格竖排:页面切换 + 命令区) ---- */
        {
            g_hBtn[4] = mk(L"BUTTON", L"任务", BS_OWNERDRAW,
                           (NAV_W - NAV_BTN_W) / 2, 14, NAV_BTN_W, NAV_BTN_H, IDC_NAV_TASK);
            g_hBtn[5] = mk(L"BUTTON", L"日志", BS_OWNERDRAW,
                           (NAV_W - NAV_BTN_W) / 2, 14 + NAV_BTN_H + 6, NAV_BTN_W, NAV_BTN_H, IDC_NAV_LOG);
            g_uiNavSel = g_hBtn[4];

            struct { const wchar_t *txt; int id; } nav[] = {
                { L"添加",     IDC_BTN_ADD },
                { L"编辑",     IDC_BTN_EDIT },
                { L"删除",     IDC_BTN_DEL },
                { L"↑ 上移",   IDC_BTN_UP },
                { L"↓ 下移",   IDC_BTN_DOWN },
                { L"导入导出", IDC_BTN_IMPORT },
                { L"使用说明", IDC_BTN_HELP },
                { L"综合检查", IDC_BTN_CHECKER },
            };
            int ny = 14 + (NAV_BTN_H + 6) * 2 + 12;   /* 分隔区之后 */
            for (int i = 0; i < 7; i++) {
                g_hBtn[6 + i] = mk(L"BUTTON", nav[i].txt, BS_OWNERDRAW,
                                   (NAV_W - NAV_BTN_W) / 2, ny, NAV_BTN_W, NAV_BTN_H, nav[i].id);
                ny += NAV_BTN_H + 6;
            }
        }

        /* ---- 主区顶部(无标题) ---- */

        /* 悬浮窗开关:与设置行对齐 */
        HWND btnFloat = mk(L"BUTTON", L"悬浮窗", BS_OWNERDRAW, 0, 0, 88, 24, IDC_BTN_FLOAT);
        (void)btnFloat;


        /* ---- 步骤 TAB 行(动态:默认1个,可添加到8个;删除点 TAB 内嵌 ×;双击重命名) ---- */
        for (int i = 0; i < MAX_TASKS; i++) {
            wchar_t lbl[16];
            _snwprintf(lbl, 15, L"步骤%d", i + 1);
            lbl[15] = 0;
            g_hTabs[i] = mk(L"BUTTON", lbl, BS_OWNERDRAW | BS_NOTIFY, 0, 0, 72, TAB_H, IDC_TAB_BASE + i);
            if (i > 0) ShowWindow(g_hTabs[i], SW_HIDE);  /* 默认只显示第1个 */
        }
        sync_tab_labels();   /* 恢复上次任务的自定义TAB名(autoload 已先行) */
        g_hTabAdd = mk(L"BUTTON", L"＋", BS_OWNERDRAW, 0, 0, 28, TAB_H, IDC_TAB_ADD);

        /* ---- 设置行 ---- */
        mk(L"STATIC", L"循环次数", 0, 0, 0, 54, 20, IDC_LB1);
        g_hBtn[0] = mk(L"EDIT", L"1", WS_BORDER | ES_NUMBER, 0, 0, 46, 22, IDC_ED_LOOPS);
        HWND chkRows = mk(L"BUTTON", L"按Excel行数", BS_AUTOCHECKBOX, 0, 0, 100, 20, IDC_CHK_EXCELROWS);
        SendMessageW(chkRows, BM_SETCHECK,
                     g_task.loopsFromExcel ? BST_CHECKED : BST_UNCHECKED, 0);
        if (g_task.loopsFromExcel) EnableWindow(g_hBtn[0], FALSE);
        {
            wchar_t buf[32];
            _snwprintf(buf, 31, L"%d", g_task.loops);
            buf[31] = 0;
            SetWindowTextW(g_hBtn[0], buf);
        }
        (void)chkRows;
        mk(L"STATIC", L"循环间隔ms", 0, 0, 0, 68, 20, IDC_LB2);
        g_hBtn[1] = mk(L"EDIT", L"500", WS_BORDER | ES_NUMBER, 0, 0, 52, 22, IDC_ED_GAP);
        mk(L"STATIC", L"开始倒计时ms", 0, 0, 0, 88, 20, IDC_LB3);
        g_hBtn[2] = mk(L"EDIT", L"0", WS_BORDER | ES_NUMBER, 0, 0, 52, 22, IDC_ED_COUNTDOWN);
        mk(L"STATIC", L"随机抖动ms", 0, 0, 0, 78, 20, IDC_LB4);
        g_hBtn[3] = mk(L"EDIT", L"0", WS_BORDER | ES_NUMBER, 0, 0, 52, 22, IDC_ED_JITTER);

        /* ---- 运行按钮(开始/停止 二合一,状态切换) ---- */
        g_hBtn[14] = mk(L"BUTTON", L"开始 F6", BS_OWNERDRAW, 0, 0, 130, 30, IDC_BTN_START);

        /* ---- 日志页控件(初始隐藏) ---- */
        g_hLog = CreateWindowExW(0, L"EDIT", L"",
                                 WS_CHILD | ES_MULTILINE | ES_READONLY |
                                 WS_VSCROLL | ES_AUTOVSCROLL,
                                 0, 0, 500, 300, hwnd,
                                 (HMENU)(INT_PTR)IDC_LOG,
                                 GetModuleHandleW(NULL), NULL);
        SendMessageW(g_hLog, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        SendMessageW(g_hLog, EM_SETLIMITTEXT, 0, 0);
        {
            HWND chk = CreateWindowExW(0, L"BUTTON", L"自动滚动",
                                       WS_CHILD | BS_AUTOCHECKBOX,
                                       0, 0, 90, 20, hwnd,
                                       (HMENU)(INT_PTR)IDC_CHK_AUTOSCROLL,
                                       GetModuleHandleW(NULL), NULL);
            SendMessageW(chk, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
            SendMessageW(chk, BM_SETCHECK, BST_CHECKED, 0);

            HWND clr = CreateWindowExW(0, L"BUTTON", L"清空日志",
                                       WS_CHILD | BS_OWNERDRAW,
                                       0, 0, 96, 26, hwnd,
                                       (HMENU)(INT_PTR)IDC_BTN_LOGCLEAR,
                                       GetModuleHandleW(NULL), NULL);
            SendMessageW(clr, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        }

        /* ---- 步骤列表 ---- */
        g_hList = CreateWindowExW(0, WC_LISTVIEWW, L"",
                                  WS_CHILD | WS_VISIBLE | LVS_REPORT |
                                  LVS_SHOWSELALWAYS | LVS_SINGLESEL,
                                  0, 0, 800, 300,
                                  hwnd, (HMENU)(INT_PTR)IDC_LIST,
                                  GetModuleHandleW(NULL), NULL);
        SendMessageW(g_hList, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        ListView_SetExtendedListViewStyle(g_hList,
            LVS_EX_FULLROWSELECT | LVS_EX_GRIDLINES | LVS_EX_DOUBLEBUFFER);

        struct { const wchar_t *name; int w; } cols[] = {
            { L"⠿", 30 },    { L"序号", 52 }, { L"类型", 78 }, { L"坐标", 130 },
            { L"次数/格数", 76 }, { L"文本 / 按键", 250 },
            { L"延迟 前/后ms", 96 }, { L"备注", 150 },
        };
        LVCOLUMNW col;
        memset(&col, 0, sizeof(col));
        col.mask = LVCF_TEXT | LVCF_WIDTH;
        for (int i = 0; i < 8; i++) {
            col.pszText = (LPWSTR)cols[i].name;
            col.cx = cols[i].w;
            ListView_InsertColumn(g_hList, i, &col);
        }

        /* ---- 状态文字 ---- */
        g_hStatus = CreateWindowExW(0, L"STATIC", L"就绪",
                                    WS_CHILD | WS_VISIBLE | SS_LEFT,
                                    0, 0, 400, 20, hwnd,
                                    (HMENU)(INT_PTR)IDC_STATUS,
                                    GetModuleHandleW(NULL), NULL);
        SendMessageW(g_hStatus, WM_SETFONT, (WPARAM)g_uiFont, TRUE);

        RegisterHotKey(hwnd, HOTK_STOP, MOD_CONTROL, VK_F12);
        RegisterHotKey(hwnd, HOTK_START, 0, VK_F6);
        SetTimer(hwnd, 3, 30, NULL);          /* 按钮悬停轮询 */

        /* 初始为任务页:隐藏日志页控件 */
        ShowWindow(g_hLog, SW_HIDE);
        ShowWindow(GetDlgItem(hwnd, IDC_BTN_LOGCLEAR), SW_HIDE);
        ShowWindow(GetDlgItem(hwnd, IDC_CHK_AUTOSCROLL), SW_HIDE);

        refresh_list();
        log_add(L"程序启动 · 保障卡全能工具 v1.0(Windows XP~Win11)");
        return 0;
    }

    case WM_GETMINMAXINFO: {
        MINMAXINFO *mmi = (MINMAXINFO *)lp;
        mmi->ptMinTrackSize.x = 860;   /* 保证侧栏与主区完整 */
        mmi->ptMinTrackSize.y = 640;
        return 0;
    }

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC dc = BeginPaint(hwnd, &ps);
        RECT rc;
        GetClientRect(hwnd, &rc);
        paint_shell(dc, rc.right, rc.bottom);
        EndPaint(hwnd, &ps);
        return 0;
    }

    case WM_ERASEBKGND:
        return 1;   /* 背景由 paint_shell 统一绘制 */

    case WM_CTLCOLORSTATIC: {
        /* 静态标签融入白色卡片;状态文字用深灰 */
        HDC hdc = (HDC)wp;
        SetBkColor(hdc, CARD_BG);
        SetTextColor(hdc, (HWND)lp == g_hStatus ? RGB(0x55,0x55,0x55)
                     : RGB(0x1B,0x1B,0x1B));
        return (LRESULT)g_hbrCard;
    }

    case WM_CTLCOLORBTN:
        /* 自绘按钮的擦除背景:返回窗口底色刷,防止被填成黑色 */
        return (LRESULT)g_hbrBg;

    case WM_DRAWITEM: {
        DRAWITEMSTRUCT *dis = (DRAWITEMSTRUCT *)lp;
        if (dis->CtlType == ODT_BUTTON) {
            switch ((int)dis->CtlID) {
            case IDC_BTN_START:                    /* 二合一:运行=停止(红),空闲=开始(蓝) */
                if (g_running)
                    draw_accent_button(dis, RGB(0xE0,0x4A,0x3E), RGB(0xEA,0x6E,0x63), RGB(0xB5,0x2C,0x22), FALSE);
                else
                    draw_accent_button(dis, QQ_BLUE, RGB(0x33,0xAA,0xFF), RGB(0x00,0x7A,0xD4), FALSE);
                return TRUE;
            case IDC_BTN_LOGCLEAR:
            case IDC_BTN_FLOAT:
                draw_flat_button(dis);
                return TRUE;
            default:
                /* TAB 按钮(步骤1~8) */
                if ((int)dis->CtlID >= IDC_TAB_BASE && (int)dis->CtlID < IDC_TAB_BASE + MAX_TASKS) {
                    int tab = (int)dis->CtlID - IDC_TAB_BASE;
                    int sel = (tab == g_curTask);
                    HDC dc = dis->hDC;
                    RECT rc = dis->rcItem;
                    HBRUSH br = CreateSolidBrush(sel ? QQ_BLUE : CARD_BG);
                    HPEN pen = CreatePen(PS_SOLID, 1, sel ? QQ_BLUE : RGB(0xC8,0xD4,0xE8));
                    HGDIOBJ ob = SelectObject(dc, br);
                    HGDIOBJ op = SelectObject(dc, pen);
                    Rectangle(dc, rc.left, rc.top, rc.right, rc.bottom);
                    SelectObject(dc, ob);
                    SelectObject(dc, op);
                    DeleteObject(br);
                    DeleteObject(pen);
                    wchar_t txt[AC_TASKNAME_MAX];
                    GetWindowTextW(dis->hwndItem, txt, AC_TASKNAME_MAX - 1);
                    txt[AC_TASKNAME_MAX - 1] = 0;
                    BOOL off = !IsWindowEnabled(dis->hwndItem);
                    SetBkMode(dc, TRANSPARENT);
                    HGDIOBJ of = SelectObject(dc, sel ? g_uiFontBold : g_uiFont);
                    RECT rcText = rc;
                    if (g_tabCount > 1) rcText.right -= TAB_CLOSE_W;
                    SetTextColor(dc, off ? RGB(0xB8, 0xB8, 0xB8)
                                         : (sel ? RGB(255,255,255) : RGB(0x2E,0x2E,0x2E)));
                    DrawTextW(dc, txt, -1, &rcText,
                              DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
                    if (g_tabCount > 1) {   /* 右侧内嵌 ×:悬停变红,点击删除该步骤 */
                        RECT rcX = rc;
                        rcX.left = rc.right - TAB_CLOSE_W;
                        SetTextColor(dc, off ? RGB(0xC8, 0xC8, 0xC8)
                                      : (g_closeHot == tab) ? RGB(0xE0,0x4A,0x3E)
                                      : (sel ? RGB(0xBF,0xE3,0xFF) : RGB(0x9A,0xA7,0xB8)));
                        SelectObject(dc, g_uiFontBold);
                        DrawTextW(dc, L"×", -1, &rcX, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
                    }
                    SelectObject(dc, of);
                    return TRUE;
                }
                draw_nav_button(dis);
                return TRUE;
            }
        }
        break;
    }

    case WM_TIMER:
        if (wp == 3 && !g_uiDlgActive) {     /* 悬停轮询(对话框打开时让位) */
            POINT pt;
            GetCursorPos(&pt);
            HWND under = WindowFromPoint(pt);
            HWND newHot = NULL;
            for (int i = 4; i <= 14; i++)
                if (g_hBtn[i] && under == g_hBtn[i]) { newHot = g_hBtn[i]; break; }
            if (!newHot) {
                HWND floatBtn = GetDlgItem(g_hMain, IDC_BTN_FLOAT);
                if (floatBtn && under == floatBtn) newHot = floatBtn;
            }
            if (!newHot && g_page == 0) {
                for (int i = 0; i < MAX_TASKS; i++)
                    if (g_hTabs[i] && under == g_hTabs[i]) { newHot = g_hTabs[i]; break; }
            }
            if (newHot != g_uiHotBtn) {
                HWND old = g_uiHotBtn;
                g_uiHotBtn = newHot;
                if (old) InvalidateRect(old, NULL, FALSE);
                if (newHot) InvalidateRect(newHot, NULL, FALSE);
            }
            /* TAB 内嵌 × 的悬停高亮(进入/离开 × 区时重绘该TAB;运行中不亮) */
            int newClose = -1;
            if (newHot && g_page == 0 && g_tabCount > 1 && !g_running) {
                for (int i = 0; i < g_tabCount; i++)
                    if (g_hTabs[i] == newHot) {
                        RECT rc;
                        GetWindowRect(g_hTabs[i], &rc);
                        if (pt.x >= rc.right - TAB_CLOSE_W) newClose = i;
                        break;
                    }
            }
            if (newClose != g_closeHot) {
                if (g_closeHot >= 0 && g_closeHot < MAX_TASKS && g_hTabs[g_closeHot])
                    InvalidateRect(g_hTabs[g_closeHot], NULL, FALSE);
                g_closeHot = newClose;
                if (newClose >= 0) InvalidateRect(g_hTabs[newClose], NULL, FALSE);
            }
        }
        return 0;

    case WM_SIZE:
        layout_children(LOWORD(lp), HIWORD(lp));
        InvalidateRect(hwnd, NULL, TRUE);   /* 重绘卡片 */
        return 0;

    case WM_HOTKEY:
        if (g_uiDlgActive) return 0;   /* 模态对话框打开期间忽略热键 */
        if (wp == HOTK_START) start_run();
        else if (wp == HOTK_STOP) stop_run();
        return 0;

    case WM_APP_PROGRESS: {
        wchar_t buf[160];
        if ((int)wp == -1) {
            _snwprintf(buf, 159, L"倒计时中… %d 毫秒后开始(Ctrl+F12 取消)", (int)lp);
            if ((int)lp == g_task.startCountdown)
                log_add(L"倒计时 %d ms,期间请勿移动鼠标…", (int)lp);
        } else {
            _snwprintf(buf, 159, L"运行中:第 %d 轮,第 %d 步 / 共 %d 步   ——  停止:Ctrl+F12",
                       (int)wp, (int)lp + 1, g_task.count);
            wchar_t desc[160];
            step_desc(&g_task.steps[(int)lp], desc, 160);
            log_add(L"第 %d 轮 · 第 %d 步:%s", (int)wp, (int)lp + 1, desc);
        }
        buf[159] = 0;
        SetWindowTextW(g_hStatus, buf);
        /* 悬浮窗同步进度 */
        {
            wchar_t ftxt[64];
            if ((int)wp == -1)
                _snwprintf(ftxt, 63, L"倒计时 %d ms", (int)lp);
            else
                _snwprintf(ftxt, 63, L"第 %d 轮 · 第 %d 步", (int)wp, (int)lp + 1);
            ftxt[63] = 0;
            float_update(ftxt);
        }
        /* 高亮当前步的屏幕标记 */
        {
            int old = g_curMark;
            g_curMark = (int)lp;
            if (old >= 0 && old < MARK_MAX && g_marks[old])
                InvalidateRect(g_marks[old], NULL, TRUE);
            if (g_curMark >= 0 && g_curMark < MARK_MAX && g_marks[g_curMark])
                InvalidateRect(g_marks[g_curMark], NULL, TRUE);
        }
        return 0;
    }

    case WM_APP_DONE:
        run_finished(wp);
        return 0;

    case WM_NOTIFY: {
        NMHDR *nm = (NMHDR *)lp;
        if (nm->idFrom == IDC_LIST) {
            if (nm->code == NM_DBLCLK) { edit_step(); return 0; }
            if (nm->code == LVN_BEGINDRAG) { list_begin_drag((NM_LISTVIEW *)nm); return 0; }
            if (nm->code == NM_CUSTOMDRAW) {   /* 拖拽把手列(列0)淡灰 */
                LPNMLVCUSTOMDRAW cd = (LPNMLVCUSTOMDRAW)nm;
                if (cd->nmcd.dwDrawStage == CDDS_PREPAINT)
                    return CDRF_NOTIFYITEMDRAW;
                if (cd->nmcd.dwDrawStage == CDDS_ITEMPREPAINT)
                    return CDRF_NOTIFYSUBITEMDRAW;
                if (cd->nmcd.dwDrawStage == (CDDS_ITEMPREPAINT | CDDS_SUBITEM)) {
                    /* 把手列淡灰;其余列显式恢复默认色
                       (不能用 CDRF_NEWFONT,会把灰色延续到整行剩余列) */
                    cd->clrText = (cd->iSubItem == 0) ? RGB(0xA8, 0xB0, 0xBC)
                                                      : CLR_DEFAULT;
                    return CDRF_NOTIFYSUBITEMDRAW;
                }
                return CDRF_DODEFAULT;
            }
            /* 右键菜单只由 WM_CONTEXTMENU 统一处理,
               此处不再响应 NM_RCLICK,避免菜单弹出两次 */
        }
        break;
    }

    case WM_CONTEXTMENU:
        if ((HWND)wp == g_hList && selected_index() >= 0)
            list_context_menu();
        return 0;

    case WM_COMMAND: {
        int id = LOWORD(wp);
        switch (id) {
        case IDC_NAV_TASK:  switch_page(0); return 0;
        case IDC_NAV_LOG:   switch_page(1); return 0;
        case IDC_BTN_LOGCLEAR:
            SetWindowTextW(g_hLog, L"");
            log_add(L"日志已清空");
            return 0;
        case IDC_BTN_ADD:    add_step();   return 0;
        case IDC_BTN_EDIT:   edit_step();  return 0;
        case IDC_BTN_DEL:    del_step();   return 0;
        case IDC_BTN_UP: { int i = selected_index(); task_move(&g_task, i, -1); refresh_list();
                           ListView_SetItemState(g_hList, i > 0 ? i - 1 : 0, LVIS_SELECTED, LVIS_SELECTED); return 0; }
        case IDC_BTN_DOWN: { int i = selected_index(); task_move(&g_task, i, 1); refresh_list();
                             ListView_SetItemState(g_hList, i + 1, LVIS_SELECTED, LVIS_SELECTED); return 0; }
        case IDC_BTN_IMPORT: {
            /* 导入导出:弹出菜单 */
            POINT pt;
            GetCursorPos(&pt);
            HMENU m = CreatePopupMenu();
            AppendMenuW(m, MF_STRING, M_OPEN, L"导入文件…");
            AppendMenuW(m, MF_STRING, M_SAVE, L"导出当前步骤…");
            TrackPopupMenu(m, TPM_RIGHTBUTTON, pt.x, pt.y, 0, hwnd, NULL);
            DestroyMenu(m);
            return 0;
        }
        case M_OPEN:     load_task_file(); return 0;
        case M_SAVE:     save_task(); return 0;
        case IDC_CHK_EXCELROWS:
            apply_excel_rows_check(hwnd);
            return 0;
        case IDC_BTN_FLOAT:  float_toggle(); return 0;

        /* TAB:点主体切换;点右侧内嵌 × 删除该步骤;双击重命名 */
        case IDC_TAB_BASE:   case IDC_TAB_BASE+1:  case IDC_TAB_BASE+2:
        case IDC_TAB_BASE+3: case IDC_TAB_BASE+4:  case IDC_TAB_BASE+5:
        case IDC_TAB_BASE+6: case IDC_TAB_BASE+7:
        {
            int newTab = LOWORD(wp) - IDC_TAB_BASE;
            if (HIWORD(wp) == BN_DOUBLECLICKED) {   /* 双击:重命名 */
                if (!g_running && newTab >= 0 && newTab < g_tabCount) {
                    if (newTab != g_curTask) {       /* 第一击已切换 */
                        g_curTask = newTab;
                        for (int i = 0; i < MAX_TASKS; i++)
                            if (g_hTabs[i]) InvalidateRect(g_hTabs[i], NULL, TRUE);
                        refresh_list();
                    }
                    rename_tab(newTab);
                }
                return 0;
            }
            if (!g_running && newTab >= 0 && newTab < g_tabCount && g_tabCount > 1) {
                POINT pt;
                RECT rc;
                GetCursorPos(&pt);
                GetWindowRect(g_hTabs[newTab], &rc);
                if (pt.x >= rc.right - TAB_CLOSE_W && pt.x <= rc.right &&
                    pt.y >= rc.top && pt.y <= rc.bottom) {
                    delete_tab(newTab);
                    return 0;
                }
            }
            if (newTab >= 0 && newTab < g_tabCount && newTab != g_curTask && !g_running) {
                g_curTask = newTab;
                for (int i = 0; i < MAX_TASKS; i++)
                    if (g_hTabs[i]) InvalidateRect(g_hTabs[i], NULL, TRUE);
                refresh_list();
                log_add(L"切换到 步骤%d", g_curTask + 1);
            }
            return 0;
        }

        case IDC_TAB_ADD:   /* 添加TAB */
            if (!g_running && g_tabCount < MAX_TASKS) {
                g_tabCount++;
                g_curTask = g_tabCount - 1;
                RECT rc;
                GetClientRect(hwnd, &rc);
                layout_children(rc.right, rc.bottom);
                refresh_list();
                log_add(L"已添加 步骤%d(共 %d 个)", g_curTask + 1, g_tabCount);
            }
            return 0;

        case IDC_BTN_HELP:   show_help(); return 0;
        case IDC_BTN_CHECKER: open_checker_tool(); return 0;
        case IDC_BTN_SAVE:   save_task();  return 0;
        case IDC_BTN_START:
            if (g_running) stop_run();
            else           start_run();
            return 0;

        case M_EXIT:     DestroyWindow(hwnd); return 0;
        case M_ADD:      add_step(); return 0;
        case M_EDIT:     edit_step(); return 0;
        case M_DEL:      del_step(); return 0;
        case M_DUP: {
            int i = selected_index();
            if (i >= 0) { task_add(&g_task, &g_task.steps[i]); refresh_list(); }
            return 0;
        }
        case M_UP: { int i = selected_index(); task_move(&g_task, i, -1); refresh_list(); return 0; }
        case M_DOWN:{ int i = selected_index(); task_move(&g_task, i, 1); refresh_list(); return 0; }
        case M_CLEARALL:
            if (MessageBoxW(hwnd, L"确定清空全部步骤?", L"确认", MB_YESNO | MB_ICONQUESTION) == IDYES) {
                task_clear(&g_task);
                refresh_list();
            }
            return 0;
        case M_START: start_run(); return 0;
        case M_STOP:  stop_run(); return 0;
        case M_HELP:  show_help(); return 0;
        case M_ABOUT:
            MessageBoxW(hwnd,
                L"保障卡全能工具 v1.0\n支持 Windows XP / 7 / 8 / 10 / 11(32/64 位)\n\n"
                L"功能:屏幕取点、单击/双击/多击、右击/中击、文本输入、\n"
                L"组合键、滚轮、拖动、Excel 导入步骤与输入列、运行日志\n\n"
                L"单文件绿色软件,无需安装。",
                L"关于", MB_ICONINFORMATION);
            return 0;

        case CTX_EDIT:   edit_step(); return 0;
        case CTX_DEL:    del_step(); return 0;
        case CTX_UP: { int i = selected_index(); task_move(&g_task, i, -1); refresh_list(); return 0; }
        case CTX_DOWN:{ int i = selected_index(); task_move(&g_task, i, 1); refresh_list(); return 0; }
        case CTX_DUP: {
            int i = selected_index();
            if (i >= 0) { task_add(&g_task, &g_task.steps[i]); refresh_list(); }
            return 0;
        }
        }
        break;
    }

    case WM_CLOSE:
        if (g_running) {
            stop_run();
            MessageBoxW(hwnd, L"已发出停止请求,请稍候程序自动退出…", L"提示", MB_ICONINFORMATION);
            return 0;
        }
        DestroyWindow(hwnd);
        return 0;

    case WM_DESTROY:
        UnregisterHotKey(hwnd, HOTK_STOP);
        UnregisterHotKey(hwnd, HOTK_START);
        autosave();                      /* 退出前再保存一次 */
        g_stop_flag = 1;
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

/* ================= 入口 ================= */

int WINAPI wWinMain(HINSTANCE hInst, HINSTANCE hPrev, PWSTR cmdLine, int show)
{
    (void)hPrev; (void)cmdLine;

    INITCOMMONCONTROLSEX icc;
    icc.dwSize = sizeof(icc);
    icc.dwICC = ICC_LISTVIEW_CLASSES | ICC_BAR_CLASSES;
    InitCommonControlsEx(&icc);

    mark_register();                   /* 屏幕标记窗口类 */
    float_register();
    float_create();                    /* 悬浮窗(默认隐藏) */

    g_uiFont = CreateFontW(-12, 0, 0, 0, FW_NORMAL, 0, 0, 0, DEFAULT_CHARSET,
                         OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
                         DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
    if (!g_uiFont) g_uiFont = (HFONT)GetStockObject(DEFAULT_GUI_FONT);
    {
        LOGFONTW lf;
        GetObjectW(g_uiFont, sizeof(lf), &lf);
        lf.lfWeight = FW_BOLD;
        lf.lfCharSet = DEFAULT_CHARSET;
        g_uiFontBold = CreateFontIndirectW(&lf);
        lf.lfHeight = -20;
        lf.lfWidth = 0;
        g_uiFontTitle = CreateFontIndirectW(&lf);
        lf.lfHeight = -12;
        g_uiFontSub = CreateFontIndirectW(&lf);
    }
    g_hbrBg = CreateSolidBrush(UI_BG);
    g_hbrCard = CreateSolidBrush(CARD_BG);

    for (int i = 0; i < MAX_TASKS; i++)
        task_init(&g_taskbook.tasks[i]);
    g_taskbook.count = 1;     /* 实际TAB数(随 #标签数 持久化,autoload 恢复) */
    ac_srand((uint32_t)GetTickCount());

    autoload();                        /* 启动时自动恢复上次任务 */

    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = main_wndproc;
    wc.hInstance = hInst;
    wc.lpszClassName = MAIN_CLASS;
    wc.hIcon = LoadIconW(NULL, (LPCWSTR)IDI_APPLICATION);
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    wc.hbrBackground = g_hbrBg;
    RegisterClassW(&wc);

    int sw = GetSystemMetrics(SM_CXSCREEN);
    int sh = GetSystemMetrics(SM_CYSCREEN);
    int w = sw > 1100 ? 1060 : sw - 40;
    int h = sh > 760 ? 700 : sh - 60;

    g_hMain = CreateWindowExW(0, MAIN_CLASS,
        L"保障卡全能工具",
        WS_OVERLAPPEDWINDOW,
        (sw - w) / 2, (sh - h) / 3, w, h,
        NULL, NULL, hInst, NULL);
    if (!g_hMain) return 1;

    ShowWindow(g_hMain, show);
    UpdateWindow(g_hMain);

    RECT rc;
    GetClientRect(g_hMain, &rc);
    layout_children(rc.right, rc.bottom);

    MSG msg;
    while (GetMessageW(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
    return (int)msg.wParam;
}
