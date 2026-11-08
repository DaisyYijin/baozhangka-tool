/* ============================================================
 * dlg_edit.c - 步骤编辑对话框(QQ 风格白色表单卡片)
 * 类型由选择窗口确定(无下拉框);
 * 窗口高度按当前类型可见行数动态收缩,无空白。
 * ============================================================ */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <windowsx.h>
#include <imm.h>
#include "ac_defs.h"
#include "engine.h"
#include "ac_keys.h"
#include "picker.h"
#include "dlg_edit.h"
#include <shellapi.h>
#include "ui_shared.h"
#include "u8.h"
#include "findimg.h"
#include "platform_win.h"
#include <string.h>
#include <stdio.h>

#define DLG_CW 448           /* 客户区宽(固定) */

enum {
    IDC_TYPE = 100, IDC_X, IDC_Y, IDC_W, IDC_H, IDC_COUNT, IDC_INTERVAL,
    IDC_TEXT, IDC_SCROLL, IDC_X2, IDC_Y2, IDC_DELAYB, IDC_DELAYA,
    IDC_CLEAR, IDC_NOTE,
    IDC_PICKXY, IDC_PICKXY2, IDC_BTN_IMPEXCEL,
    IDC_LB_XY, IDC_LB_COUNT, IDC_LB_TEXT, IDC_LB_SCROLL, IDC_LB_XY2, IDC_LB_DELAY,
    IDC_LB_NOTE, IDC_LB_JUMP, IDC_JUMP, IDC_JUMPTAB,
    IDC_LB_W,
    /* 找图新增 ID 与数据源下拉 ID 统一从 140/146 起:
       避开 ctl 槽位 30/31(IDOK/IDCANCEL 保留)——
       原先 IDC_IMPCOL=130 恰好映射到槽 30,布局隐藏 IMPCOL 时
       会误把确定按钮一并隐藏(v1.5.0 起的潜伏 bug) */
    IDC_LB_TPL = 140, IDC_PICKTPL, IDC_TPLINFO, IDC_LB_MISSJUMP, IDC_MISSJUMP,
    IDC_TYPEHELP = 148,               /* 底部:按类型的通俗填写说明(灰字多行) */
    IDC_PICKREGION,                   /* 找图:框选搜索区域(局域识图) */
    IDC_IMPSHEET = 146, IDC_IMPCOL,
};

/* 行几何:标签右对齐列 + 控件列 */
#define LB_X    12
#define LB_W    110
#define CT_X    128
#define ROW_H   33
#define TOP_Y   12

/* CTL 槽位:ID>=100 存 ctl[id-100];IDOK/IDCANCEL 存 30/31 */
#define CTL_ID_OF(id) ((id) >= 100 ? (id) - 100 : ((id) == IDOK ? 30 : 31))

typedef struct {
    HWND  hwnd;
    HWND  ctl[56];
    int   done;
    int   ok;
    Step *step;
    int   isNew;
    char *tplB64;             /* 找图:框选产生的模板(findimg_pack 结果) */
    int   tplW, tplH;
} EditDlg;

static EditDlg g_edit;
static const wchar_t EDIT_DLG_CLASS[] = L"AcEditDlg";

/* 输入法正在组合候选(打字未上屏)时返回 1:
   此时的回车/ESC 属于输入法,不能当成对话框的确定/取消 */
static int ime_composing(void)
{
    HWND focus = GetFocus();
    if (!focus) return 0;
    HIMC imc = ImmGetContext(focus);
    if (!imc) return 0;
    LONG n = ImmGetCompositionStringW(imc, GCS_COMPSTR, NULL, 0);
    ImmReleaseContext(focus, imc);
    return n > 0;
}

/* 数据源行控件 <- 当前绑定状态(工作表下拉/数据列下拉) */
static void fill_imp_controls(int sel, int col)
{
    HWND cb = g_edit.ctl[IDC_IMPSHEET - 100];
    HWND cc = g_edit.ctl[IDC_IMPCOL - 100];
    if (!cb || !cc) return;
    int n = gui_excel_sheet_count();
    SendMessageW(cb, CB_RESETCONTENT, 0, 0);
    if (n > 0) {
        for (int i = 0; i < n; i++) {
            wchar_t w[48] = L"";
            u8_to_wcs(gui_excel_sheet_name(i), w, 47);
            SendMessageW(cb, CB_ADDSTRING, 0, (LPARAM)w);
        }
        if (sel < 0 || sel >= n) sel = 0;
        SendMessageW(cb, CB_SETCURSEL, (WPARAM)sel, 0);
        EnableWindow(cb, TRUE);
    } else {
        SendMessageW(cb, CB_ADDSTRING, 0, (LPARAM)L"(单工作表)");
        SendMessageW(cb, CB_SETCURSEL, 0, 0);
        EnableWindow(cb, FALSE);
    }
    /* 数据列:第1列(无表头) + 首行各列名(选列名=用该列并跳过表头行) */
    SendMessageW(cc, CB_RESETCONTENT, 0, 0);
    SendMessageW(cc, CB_ADDSTRING, 0, (LPARAM)L"第1列(无表头)");
    int m = gui_excel_col_count();
    for (int i = 0; i < m; i++) {
        wchar_t w[48] = L"";
        u8_to_wcs(gui_excel_col_name(i), w, 47);
        SendMessageW(cc, CB_ADDSTRING, 0, (LPARAM)w);
    }
    if (col < 0 || col > m) col = (m > 0) ? 1 : 0;
    SendMessageW(cc, CB_SETCURSEL, (WPARAM)col, 0);
    EnableWindow(cc, m >= 0);
}

/* ---------- 控件创建 ---------- */

static HWND mk_ctl(const wchar_t *cls, const wchar_t *text, DWORD style,
                   int id, int w, int h)
{
    HWND hwnd = CreateWindowExW(0, cls, text,
                             WS_CHILD | WS_VISIBLE | style,
                             0, 0, w, h, g_edit.hwnd,
                             (HMENU)(INT_PTR)id,
                             GetModuleHandleW(NULL), NULL);
    if (g_uiFont) SendMessageW(hwnd, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
    return hwnd;
}

static int get_int(int id, int defVal)
{
    wchar_t buf[32];
    GetWindowTextW(g_edit.ctl[id - 100], buf, 31);
    if (!buf[0]) return defVal;
    wchar_t *end;
    long v = wcstol(buf, &end, 10);
    if (end == buf) return defVal;
    return (int)v;
}

static void set_int(int id, int v)
{
    wchar_t buf[32];
    _snwprintf(buf, 31, L"%d", v);
    buf[31] = 0;
    SetWindowTextW(g_edit.ctl[id - 100], buf);
}

static void set_ctl_text(int id, const wchar_t *s)
{
    SetWindowTextW(g_edit.ctl[id - 100], s ? s : L"");
}

static void get_ctl_text(int id, wchar_t *out, int cap)
{
    GetWindowTextW(g_edit.ctl[id - 100], out, cap);
}

static void show_ctl(int id, int show)
{
    ShowWindow(g_edit.ctl[id - 100], show ? SW_SHOW : SW_HIDE);
}

static void place(int id, int x, int y, int w, int h)
{
    MoveWindow(g_edit.ctl[CTL_ID_OF(id)], x, y, w, h, TRUE);
}

/* ---------- 按类型重排布局并收缩窗口 ---------- */

/* 各类型填写说明(通俗,面向普通用户;显示在对话框底部,按 \n 计行数) */
static const wchar_t *const TYPE_HELP[ACT_TYPE_COUNT_] = {
    /* ACT_CLICK 单击 */
    L"在指定坐标点击一次。坐标点「屏幕取点」到屏幕上点一下即可;\n"
    L"填了宽/高会在该范围内随机落点(更像真人操作)。",
    /* ACT_DBLCLICK 双击 */
    L"在指定坐标双击打开。坐标点「屏幕取点」获取;",
    /* ACT_MULTI 多击 */
    L"同一位置连续点击:次数=一共点几下,间隔=每两下之间等待的毫秒。\n"
    L"例:次数 5、间隔 300 = 每 0.3 秒点一下,共点 5 下。",
    /* ACT_RCLICK 右击 */
    L"在指定坐标点击鼠标右键(弹出右键菜单)。",
    /* ACT_MCLICK 中击 */
    L"在指定坐标点击鼠标中键(滚轮键)。",
    /* ACT_TEXT 输入 */
    L"把文字粘贴到当前输入框(支持中文)。\n"
    L"勾选「输入前清空」会先全选删除原内容再输入;\n"
    L"文字里可写 {行} 自动填入当轮 Excel 对应列的内容。",
    /* ACT_KEY 按键 */
    L"发送按键或组合键,多个键用 + 连接。\n"
    L"例:ctrl+s 保存、alt+tab 切窗口、win+r 运行、F5 刷新、enter 回车。",
    /* ACT_WAIT 等待 */
    L"暂停等待一段时间:1000 毫秒 = 1 秒。",
    /* ACT_SCROLL 滚轮 */
    L"滚动鼠标滚轮:正数向上翻页,负数向下翻页。",
    /* ACT_DRAG 拖动 */
    L"按住鼠标从起点拖到终点再松开(拖滑块/框选文字等)。",
    /* ACT_JUMP 跳转 */
    L"直接跳到指定步骤继续执行(可跳过或重复某些步骤)。\n"
    L"目标格式:步骤号,如 5;或 TAB:步号,如 2:5 = 跳到任务2的第5步。",
    /* ACT_WAITWIN 等窗口 */
    L"等到出现指定窗口再继续:填写窗口标题包含的文字。\n"
    L"超过「等待时长」就不再等,直接往下执行。",
    /* ACT_CHECK 判断 */
    L"屏幕上某点的颜色符合设定时,跳转到指定步骤(做条件分支)。\n"
    L"点「屏幕取点」会自动抓取该处颜色;容差越大判定越宽松;\n"
    L"取点时拖动框选 = 在整个区域内找到该颜色即算满足。",
    /* ACT_CALL 调用 */
    L"子流程:先执行另一个 TAB 的全部步骤,做完自动回到本步的下一步。\n"
    L"公共流程(如登录)只需写一份,最多嵌套 8 层。",
    /* ACT_OCR 读文本 */
    L"识别屏幕区域内的文字(数字/字母/常用符号,中文暂不支持)。\n"
    L"取点时拖动框选识别区域;「关键词」命中时跳转——\n"
    L"例如等页面出现「成功」二字再继续往下做。",
    /* ACT_FINDIMG 找图 */
    L"先点「≡ 框选模板」在屏幕上拖动框选要查找的图块,执行时自动搜索:\n"
    L"动作:0=只定位到该处,1=单击它,2=双击它;「找到则跳转」可跳步骤;\n"
    L"「未找到跳转」常用于先去点开下拉菜单再回来找;\n"
    L"容差(0-255)越大越宽松,找不到时可调大试试(默认 20);\n"
    L"搜索范围两种:宽/高填 0 = 全屏(默认);\n"
    L"或点「⊞ 框选区域」拖动圈定范围,区域外的相似图不参与匹配。",
    /* ACT_XLSIF Excel判断 */
    L"读取 Excel 当前行指定列的文字,按条件跳到不同步骤:\n"
    L"条件写法:文字=>步骤号,多个条件用逗号分开。\n"
    L"例:男=>2,女=>5 = 该列是「男」跳第2步、「女」跳第5步,都不是则继续。\n"
    L"列号:第几列(从 1 数);填 0 = 用数据源绑定的 {行} 列。\n"
    L"提示:分支只影响本行走哪段流程,本轮结束后自动处理下一行。",
};

/* 说明文字行数(按换行符计数) */
static int help_lines(const wchar_t *s)
{
    int n = 1;
    for (const wchar_t *p = s; *p; p++)
        if (*p == L'\n') n++;
    return n;
}

static void layout_rows(int type)
{
    /* 先隐藏全部可选控件,再按类型显示,杜绝残留控件叠在当前布局上 */
    {
        static const int allIds[] = {
            IDC_LB_XY, IDC_X, IDC_Y, IDC_PICKXY,
            IDC_LB_COUNT, IDC_COUNT, IDC_INTERVAL,
            IDC_LB_TEXT, IDC_TEXT, IDC_BTN_IMPEXCEL, IDC_IMPSHEET, IDC_IMPCOL,
            IDC_CLEAR,
            IDC_LB_SCROLL, IDC_SCROLL,
            IDC_LB_W, IDC_W, IDC_H,
            IDC_LB_JUMP, IDC_JUMP, IDC_JUMPTAB,
            IDC_LB_XY2, IDC_X2, IDC_Y2, IDC_PICKXY2,
            IDC_LB_DELAY, IDC_DELAYB, IDC_DELAYA,
            IDC_LB_NOTE, IDC_NOTE,
            IDC_LB_TPL, IDC_PICKTPL, IDC_TPLINFO, IDC_LB_MISSJUMP, IDC_MISSJUMP,
            IDC_PICKREGION,
        };
        for (int i = 0; i < (int)(sizeof(allIds) / sizeof(allIds[0])); i++) {
            HWND h = g_edit.ctl[CTL_ID_OF(allIds[i])];
            if (h) ShowWindow(h, SW_HIDE);
        }
    }
    int isClick = (type == ACT_CLICK || type == ACT_DBLCLICK || type == ACT_MULTI ||
                   type == ACT_RCLICK || type == ACT_MCLICK || type == ACT_CHECK ||
                   type == ACT_OCR || type == ACT_FINDIMG);
    int scroll  = (type == ACT_SCROLL);
    int drag    = (type == ACT_DRAG);
    int text    = (type == ACT_TEXT || type == ACT_KEY || type == ACT_WAITWIN ||
                   type == ACT_OCR || type == ACT_XLSIF);
    int y = TOP_Y;

    /* 行:坐标 / 滚动位置 / 起点 */
    if (isClick || scroll || drag) {
        set_ctl_text(IDC_LB_XY,
                     drag ? L"起点 X / Y" : scroll ? L"滚动位置" :
                     type == ACT_OCR ? L"区域起点 X / Y" :
                     type == ACT_FINDIMG ? L"搜索区起点 X / Y" : L"坐标 X / Y");
        show_ctl(IDC_LB_XY, 1);
        show_ctl(IDC_X, 1);
        show_ctl(IDC_Y, 1);
        place(IDC_LB_XY, LB_X, y + 2, LB_W, 20);
        place(IDC_X, CT_X, y, 64, 22);
        place(IDC_Y, CT_X + 68, y, 64, 22);
        if ((isClick && type != ACT_FINDIMG) || drag) {
            show_ctl(IDC_PICKXY, 1);
            place(IDC_PICKXY, CT_X + 148, y - 2, 100, 26);
        } else {
            show_ctl(IDC_PICKXY, 0);
        }
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_XY, 0);
        show_ctl(IDC_X, 0);
        show_ctl(IDC_Y, 0);
        show_ctl(IDC_PICKXY, 0);
    }

    /* 行:次数 / 间隔(多击);Excel判断=列号(0={行}选定列,单框) */
    if (type == ACT_MULTI || type == ACT_XLSIF) {
        set_ctl_text(IDC_LB_COUNT, type == ACT_MULTI ? L"次数 / 间隔ms" :
                                                 L"列号(0={行}列)");
        show_ctl(IDC_LB_COUNT, 1);
        show_ctl(IDC_COUNT, 1);
        show_ctl(IDC_INTERVAL, type == ACT_MULTI);
        place(IDC_LB_COUNT, LB_X, y + 2, LB_W, 20);
        place(IDC_COUNT, CT_X, y, 56, 22);
        place(IDC_INTERVAL, CT_X + 62, y, 56, 22);
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_COUNT, 0);
        show_ctl(IDC_COUNT, 0);
        show_ctl(IDC_INTERVAL, 0);
    }

    /* 行:输入内容 */
    if (text) {
        set_ctl_text(IDC_LB_TEXT,
                     type == ACT_TEXT ? L"输入内容" :
                     type == ACT_WAITWIN ? L"窗口标题包含" :
                     type == ACT_OCR ? L"关键词" :
                     type == ACT_XLSIF ? L"条件(值=>步骤)" : L"按键组合");
        show_ctl(IDC_LB_TEXT, 1);
        show_ctl(IDC_TEXT, 1);
        place(IDC_LB_TEXT, LB_X, y + 2, LB_W, 20);
        place(IDC_TEXT, CT_X, y, 200, 22);
        show_ctl(IDC_BTN_IMPEXCEL, type == ACT_TEXT);
        show_ctl(IDC_IMPSHEET, type == ACT_TEXT);
        show_ctl(IDC_IMPCOL, type == ACT_TEXT);
        if (type == ACT_TEXT) {
            place(IDC_BTN_IMPEXCEL, CT_X + 196, y - 1, 108, 24);
            y += 26;
            /* 数据源行:工作表下拉 + 数据列下拉(列名=表头名) */
            place(IDC_IMPSHEET, CT_X, y, 148, 22);
            place(IDC_IMPCOL, CT_X + 154, y, 148, 22);
            fill_imp_controls(gui_excel_cur_sheet(), gui_excel_cur_col());
        }
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_TEXT, 0);
        show_ctl(IDC_TEXT, 0);
        show_ctl(IDC_BTN_IMPEXCEL, 0);
        show_ctl(IDC_IMPSHEET, 0);
        show_ctl(IDC_IMPCOL, 0);
    }

    /* 行:清空(仅文本输入) */
    if (type == ACT_TEXT) {
        show_ctl(IDC_CLEAR, 1);
        place(IDC_CLEAR, CT_X, y, 248, 20);
        y += ROW_H;
    } else {
        show_ctl(IDC_CLEAR, 0);
    }

    /* 行:滚动格数 */
    if (scroll) {
        set_ctl_text(IDC_LB_SCROLL, L"滚动格数(±)");
        show_ctl(IDC_LB_SCROLL, 1);
        show_ctl(IDC_SCROLL, 1);
        place(IDC_LB_SCROLL, LB_X, y + 2, LB_W, 20);
        place(IDC_SCROLL, CT_X, y, 64, 22);
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_SCROLL, 0);
        show_ctl(IDC_SCROLL, 0);
    }

    /* 行:判断/识别/找图 区域宽高(0=单点/全屏;拖框自动填) */
    if (type == ACT_CHECK || type == ACT_OCR || type == ACT_FINDIMG) {
        show_ctl(IDC_LB_W, 1);
        show_ctl(IDC_W, 1);
        show_ctl(IDC_H, 1);
        place(IDC_LB_W, LB_X, y + 2, LB_W, 20);
        place(IDC_W, CT_X, y, 56, 22);
        place(IDC_H, CT_X + 64, y, 56, 22);
        set_ctl_text(IDC_LB_W,
                     type == ACT_FINDIMG ? L"搜索区 W/H" : L"区域 W / H");
        if (type == ACT_FINDIMG) {         /* 局域识图:框选搜索范围 */
            show_ctl(IDC_PICKREGION, 1);
            place(IDC_PICKREGION, CT_X + 128, y - 1, 96, 24);
        } else {
            show_ctl(IDC_PICKREGION, 0);
        }
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_W, 0);
        show_ctl(IDC_W, 0);
        show_ctl(IDC_H, 0);
        show_ctl(IDC_PICKREGION, 0);
    }
    /* 行:找图图像模板 */
    if (type == ACT_FINDIMG) {
        show_ctl(IDC_LB_TPL, 1);
        show_ctl(IDC_PICKTPL, 1);
        show_ctl(IDC_TPLINFO, 1);
        place(IDC_LB_TPL, LB_X, y + 2, LB_W, 20);
        place(IDC_PICKTPL, CT_X, y - 2, 108, 26);
        place(IDC_TPLINFO, CT_X + 116, y + 2, 130, 20);
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_TPL, 0);
        show_ctl(IDC_PICKTPL, 0);
        show_ctl(IDC_TPLINFO, 0);
    }
    /* 行:找图 找到动作 + 容差(复用 次数=动作 间隔=容差) */
    if (type == ACT_FINDIMG) {
        set_ctl_text(IDC_LB_COUNT, L"动作/容差");
        show_ctl(IDC_LB_COUNT, 1);
        show_ctl(IDC_COUNT, 1);
        show_ctl(IDC_INTERVAL, 1);
        place(IDC_LB_COUNT, LB_X, y + 2, LB_W, 20);
        place(IDC_COUNT, CT_X, y, 56, 22);
        place(IDC_INTERVAL, CT_X + 62, y, 56, 22);
        y += ROW_H;
    }
    /* 行:判断颜色(仅判断;复用次数=颜色 间隔=容差) */
    if (type == ACT_CHECK) {
        set_ctl_text(IDC_LB_COUNT, L"颜色0xRRGGBB");
        show_ctl(IDC_LB_COUNT, 1);
        show_ctl(IDC_COUNT, 1);
        show_ctl(IDC_INTERVAL, 1);
        set_ctl_text(IDC_INTERVAL, L"10");
        place(IDC_LB_COUNT, LB_X, y + 2, LB_W, 20);
        place(IDC_COUNT, CT_X, y, 90, 22);
        place(IDC_INTERVAL, CT_X + 98, y, 56, 22);
        y += ROW_H;
    }
    /* 行:跳转/调用/判断满足时目标 */
    if (type == ACT_JUMP || type == ACT_CALL || type == ACT_CHECK ||
        type == ACT_OCR || type == ACT_FINDIMG) {
        set_ctl_text(IDC_LB_JUMP,
                     type == ACT_CALL ? L"调用目标" :
                     type == ACT_CHECK ? L"满足则跳转" :
                     type == ACT_OCR ? L"含关键词跳转" :
                     type == ACT_FINDIMG ? L"找到则跳转" : L"跳转目标");
        show_ctl(IDC_LB_JUMP, 1);
        show_ctl(IDC_JUMP, 1);
        show_ctl(IDC_JUMPTAB, 1);
        place(IDC_LB_JUMP, LB_X, y + 2, LB_W, 20);
        place(IDC_JUMP, CT_X, y, 64, 22);
        place(IDC_JUMPTAB, CT_X + 72, y, 168, 22);
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_JUMP, 0);
        show_ctl(IDC_JUMP, 0);
        show_ctl(IDC_JUMPTAB, 0);
    }

    /* 行:找图 未找到跳转(0=继续;常用于"没找到→先去点开下拉") */
    if (type == ACT_FINDIMG) {
        show_ctl(IDC_LB_MISSJUMP, 1);
        show_ctl(IDC_MISSJUMP, 1);
        place(IDC_LB_MISSJUMP, LB_X, y + 2, LB_W, 20);
        place(IDC_MISSJUMP, CT_X, y, 56, 22);
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_MISSJUMP, 0);
        show_ctl(IDC_MISSJUMP, 0);
    }

    /* 行:拖动终点 */
    if (drag) {
        set_ctl_text(IDC_LB_XY2, L"终点 X / Y");
        show_ctl(IDC_LB_XY2, 1);
        show_ctl(IDC_X2, 1);
        show_ctl(IDC_Y2, 1);
        show_ctl(IDC_PICKXY2, 1);
        place(IDC_LB_XY2, LB_X, y + 2, LB_W, 20);
        place(IDC_X2, CT_X, y, 64, 22);
        place(IDC_Y2, CT_X + 68, y, 64, 22);
        place(IDC_PICKXY2, CT_X + 148, y - 2, 100, 26);
        y += ROW_H;
    } else {
        show_ctl(IDC_LB_XY2, 0);
        show_ctl(IDC_X2, 0);
        show_ctl(IDC_Y2, 0);
        show_ctl(IDC_PICKXY2, 0);
    }

    /* 行:延时(全部类型) */
    set_ctl_text(IDC_LB_DELAY, type == ACT_WAIT ? L"等待时长(ms)" : L"延时 前/后(ms)");
    show_ctl(IDC_LB_DELAY, 1);
    show_ctl(IDC_DELAYB, 1);
    show_ctl(IDC_DELAYA, 1);
    place(IDC_LB_DELAY, LB_X, y + 2, LB_W, 20);
    place(IDC_DELAYB, CT_X, y, 72, 22);
    place(IDC_DELAYA, CT_X + 80, y, 72, 22);
    y += ROW_H;

    /* 行:启用 + 备注(全部类型) */
    show_ctl(IDC_LB_NOTE, 1);
    show_ctl(IDC_NOTE, 1);
    place(IDC_LB_NOTE, CT_X + 106, y + 2, 32, 20);
    place(IDC_NOTE, CT_X + 142, y, 106, 22);
    y += ROW_H;

    /* 行:按类型的通俗填写说明(灰字多行,高度自适应) */
    {
        const wchar_t *ht = (type >= 0 && type < ACT_TYPE_COUNT_) ?
                            TYPE_HELP[type] : L"";
        set_ctl_text(IDC_TYPEHELP, ht);
        show_ctl(IDC_TYPEHELP, 1);
        int hl = help_lines(ht);
        place(IDC_TYPEHELP, LB_X, y, DLG_CW - LB_X - 8, hl * 15 + 4);
        y += hl * 15 + 10;
    }

    /* 底部按钮 */
    y += 6;
    place(IDCANCEL, DLG_CW - 198, y, 86, 28);
    place(IDOK, DLG_CW - 106, y, 90, 28);
    y += 28 + 10;

    /* 按可见行数收缩窗口高度 */
    DWORD style = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU;
    RECT rc = { 0, 0, DLG_CW, y };
    AdjustWindowRectEx(&rc, style, FALSE, WS_EX_DLGMODALFRAME);
    SetWindowPos(g_edit.hwnd, NULL, 0, 0, rc.right - rc.left, rc.bottom - rc.top,
                 SWP_NOMOVE | SWP_NOZORDER);
}

/* ---------- 取点联动 ---------- */

static void do_pick(int which)
{
    PickResult r;
    ShowWindow(g_edit.hwnd, SW_HIDE);
    Sleep(60);
    int got = pick_screen_point(&r);
    ShowWindow(g_edit.hwnd, SW_SHOW);
    SetForegroundWindow(g_edit.hwnd);
    if (!got) return;

    if (which == 0) {
        set_int(IDC_X, r.x);
        set_int(IDC_Y, r.y);
        if (g_edit.step->type == ACT_CHECK) {
            /* 判断:取点同时抓取该处颜色;拖框则填入区域并取框中心色 */
            HDC dc = GetDC(NULL);
            int cx2 = r.x, cy2 = r.y;
            if (r.w > 0 && r.h > 0) {
                set_int(IDC_W, r.w);
                set_int(IDC_H, r.h);
                cx2 = r.x + r.w / 2;
                cy2 = r.y + r.h / 2;
            }
            COLORREF c = GetPixel(dc, cx2, cy2);
            ReleaseDC(NULL, dc);
            if (c != CLR_INVALID) {
                wchar_t cb[16];
                _snwprintf(cb, 15, L"%02X%02X%02X",
                           (int)(c & 0xFF), (int)((c >> 8) & 0xFF), (int)((c >> 16) & 0xFF));
                cb[15] = 0;
                set_ctl_text(IDC_COUNT, cb);
            }
        }
        /* 屏幕上留下置顶预览标记:序号 · 动作 */
        mark_preview(r.x, r.y, g_edit.step->type, g_mark_seq);
    } else {
        set_int(IDC_X2, r.x);
        set_int(IDC_Y2, r.y);
    }
}

/* 找图:全屏拖框截取模板图像(灰度打包) */
static void do_pick_tpl(void)
{
    PickResult r;
    ShowWindow(g_edit.hwnd, SW_HIDE);
    Sleep(60);
    int got = pick_screen_point(&r);
    ShowWindow(g_edit.hwnd, SW_SHOW);
    SetForegroundWindow(g_edit.hwnd);
    if (!got) return;
    if (r.w < 2 || r.h < 2) {
        MessageBoxW(g_edit.hwnd, L"请在屏幕上拖动框选一块图像作为模板(单击无效)。",
                    L"提示", MB_ICONINFORMATION);
        return;
    }
    int ow = 0, oh = 0;
    unsigned char *gray = win_grab_gray(r.x, r.y, r.w, r.h, &ow, &oh);
    if (!gray) {
        MessageBoxW(g_edit.hwnd, L"抓取屏幕图像失败。", L"提示", MB_ICONINFORMATION);
        return;
    }
    char *packed = findimg_pack(get_int(IDC_W, 0), get_int(IDC_H, 0),
                                get_int(IDC_MISSJUMP, 0), gray, ow, oh);
    free(gray);
    if (!packed) {
        MessageBoxW(g_edit.hwnd, L"模板过大(上限约 128x128 像素),请框小一些。",
                    L"提示", MB_ICONINFORMATION);
        return;
    }
    free(g_edit.tplB64);
    g_edit.tplB64 = packed;
    g_edit.tplW = ow;
    g_edit.tplH = oh;
    wchar_t ti[40];
    _snwprintf(ti, 39, L"已框选 %dx%d", ow, oh);
    ti[39] = 0;
    set_ctl_text(IDC_TPLINFO, ti);
}

/* 框选搜索区域(局域识图):拖动圈定找图范围,回填 起点 X/Y + 宽 W/H */
static void do_pick_region(void)
{
    PickResult r;
    ShowWindow(g_edit.hwnd, SW_HIDE);
    Sleep(60);
    int got = pick_screen_point(&r);
    ShowWindow(g_edit.hwnd, SW_SHOW);
    SetForegroundWindow(g_edit.hwnd);
    if (!got) return;
    if (r.w < 8 || r.h < 8) {
        MessageBoxW(g_edit.hwnd, L"请在屏幕上拖动框选一块搜索范围(区域不能太小)。",
                    L"提示", MB_ICONINFORMATION);
        return;
    }
    set_int(IDC_X, r.x);
    set_int(IDC_Y, r.y);
    set_int(IDC_W, r.w);
    set_int(IDC_H, r.h);
}

/* 编辑窗打开期间,拖动屏幕标记实时更新坐标输入框 */
int edit_dlg_live_coords(int seq, int x, int y)
{
    if (!g_edit.hwnd || g_edit.done) return 0;
    /* 负值 seq = 取点预览标记,必属于当前编辑步骤;正式标记需序号匹配 */
    if (seq >= 0 && seq != g_mark_seq - 1) return 0;
    set_int(IDC_X, x);
    set_int(IDC_Y, y);
    return 1;
}

/* ---------- 校验并收集 ---------- */

static int collect(void)
{
    Step *s = g_edit.step;

    s->x = get_int(IDC_X, 0);
    s->y = get_int(IDC_Y, 0);
    s->count = (s->type == ACT_MULTI || s->type == ACT_FINDIMG ||
                s->type == ACT_XLSIF) ?
               get_int(IDC_COUNT, s->type == ACT_XLSIF ? 0 : 1) : 0;
    /* 单击/双击/右击/中击固定次数,忽略(隐藏的)次数框,避免默认值混入 */
    s->interval = get_int(IDC_INTERVAL, 100);
    s->x2 = get_int(IDC_X2, 0);
    s->y2 = get_int(IDC_Y2, 0);
    s->scroll = get_int(IDC_SCROLL, 3);
    s->jumpTo = get_int(IDC_JUMP, 0);
    {
        int sel = (int)SendMessageW(g_edit.ctl[IDC_JUMPTAB - 100], CB_GETCURSEL, 0, 0);
        int n = gui_tab_count();
        if (n < 1) n = 1;
        if (n > MAX_TASKS) n = MAX_TASKS;
        s->jumpTab = (sel >= 0 && sel < n) ? sel + 1 : 0;
    }
    if (s->type == ACT_CHECK) {
        s->w = get_int(IDC_W, 0);
        s->h = get_int(IDC_H, 0);
        if (s->w < 0) s->w = 0;
        if (s->h < 0) s->h = 0;
        /* 颜色框是 16 进制文本(如 FF8000 或 0xFF8000) */
        wchar_t cb[24];
        get_ctl_text(IDC_COUNT, cb, 23);
        wchar_t *e;
        long cv = wcstol(cb, &e, 16);
        s->ifColor = (int)cv;
        s->ifTol = get_int(IDC_INTERVAL, 10);
    } else if (s->type == ACT_FINDIMG) {
        s->w = get_int(IDC_W, 0);
        s->h = get_int(IDC_H, 0);
        if (s->w < 0) s->w = 0;
        if (s->h < 0) s->h = 0;
        s->ifColor = 0;
        s->ifTol = get_int(IDC_INTERVAL, 20);
        s->missJump = get_int(IDC_MISSJUMP, 0);
        free(s->imgB64);
        s->imgB64 = g_edit.tplB64 ? strdup(g_edit.tplB64) : NULL;
        if (!s->imgB64) {
            MessageBoxW(g_edit.hwnd, L"请先点「≡ 框选模板」截取要查找的图像。",
                        L"提示", MB_ICONINFORMATION);
            return 0;
        }
    } else {
        s->ifColor = 0;
        s->ifTol = 0;
        s->missJump = 0;
    }
    s->delayBefore = get_int(IDC_DELAYB, 0);
    s->delayAfter  = get_int(IDC_DELAYA, 200);
    s->clearFirst = (SendMessageW(g_edit.ctl[IDC_CLEAR - 100], BM_GETCHECK, 0, 0) == BST_CHECKED);
    get_ctl_text(IDC_TEXT, s->text, AC_TEXT_MAX - 1);
    get_ctl_text(IDC_NOTE, s->note, AC_NOTE_MAX - 1);

    if (s->type == ACT_TEXT && !s->text[0]) {
        if (gui_excel_bound()) {
            /* 已绑定数据源:空文本自动引用所选列,不阻止保存 */
            wcscpy(s->text, L"{行}");     /* {行} */
            MessageBoxW(g_edit.hwnd,
                L"输入内容为空,已自动填入 {行}(执行时取当轮所选列内容)。\n"
                L"如需引用其他列,可改写为 {列名} 或 {列N},如 账号:{账号}。",
                L"提示", MB_ICONINFORMATION);
        } else {
            MessageBoxW(g_edit.hwnd,
                L"请填写输入内容。\n\n"
                L"提示:先点「导入Excel数据」(或直接拖入 Excel 文件)绑定数据源,\n"
                L"绑定后可留空(自动取所选列),或用 {行}/{列名} 引用数据,如 账号:{账号}。",
                L"提示", MB_ICONINFORMATION);
            return 0;
        }
    }
    if (s->type == ACT_XLSIF && !s->text[0]) {
        MessageBoxW(g_edit.hwnd, L"请填写条件,如:男=>3,女=>18",
                    L"提示", MB_ICONINFORMATION);
        return 0;
    }
    if (s->type == ACT_KEY) {
        int vks[AC_MAX_KEYS], n = 0;
        if (key_parse(s->text, vks, &n) != 0) {
            MessageBoxW(g_edit.hwnd,
                L"按键格式无法识别。\n示例:ctrl+s、alt+tab、win+r、F5、enter",
                L"提示", MB_ICONINFORMATION);
            return 0;
        }
    }
    return 1;
}

/* ---------- 窗口过程 ---------- */

static void on_command(WPARAM wp)
{
    int id = LOWORD(wp);
    switch (id) {
    case IDC_PICKTPL: do_pick_tpl(); break;
    case IDC_PICKREGION: do_pick_region(); break;
    case IDC_PICKXY:  do_pick(0); break;
    case IDC_PICKXY2: do_pick(1); break;
    case IDC_BTN_IMPEXCEL: {
        int ns = gui_pick_excel_file(g_edit.hwnd);
        if (ns >= 0) {
            fill_imp_controls(0, gui_excel_cur_col());
            gui_rebind_excel(0, gui_excel_cur_col());
            /* 文本为空时自动填占位符 */
            wchar_t cur[AC_TEXT_MAX];
            get_ctl_text(IDC_TEXT, cur, AC_TEXT_MAX - 1);
            if (!cur[0]) set_ctl_text(IDC_TEXT, L"{行}");
            SetForegroundWindow(g_edit.hwnd);
        }
        break;
    }
    case IDC_IMPSHEET: {                     /* 换工作表:列重置为默认并重绑 */
        if (HIWORD(wp) == CBN_SELCHANGE) {
            int sel = (int)SendMessageW(g_edit.ctl[IDC_IMPSHEET - 100],
                                        CB_GETCURSEL, 0, 0);
            if (sel >= 0) {
                /* 旧列选择对新表可能越界,统一重置为默认(首列表头) */
                gui_rebind_excel(sel, 1);
                fill_imp_controls(sel, gui_excel_cur_col());
            }
        }
        break;
    }
    case IDC_IMPCOL: {                       /* 换数据列:立即重绑 */
        if (HIWORD(wp) == CBN_SELCHANGE) {
            int sel = (int)SendMessageW(g_edit.ctl[IDC_IMPSHEET - 100],
                                        CB_GETCURSEL, 0, 0);
            int col = (int)SendMessageW(g_edit.ctl[IDC_IMPCOL - 100],
                                        CB_GETCURSEL, 0, 0);
            if (sel < 0) sel = 0;
            if (col < 0) col = 0;
            gui_rebind_excel(sel, col);
        }
        break;
    }
    case IDOK:
        if (collect()) { g_edit.ok = 1; g_edit.done = 1; }
        break;
    case IDCANCEL:
        g_edit.ok = 0;
        g_edit.done = 1;
        break;
    }
}

static LRESULT CALLBACK edit_wndproc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_COMMAND:
        on_command(wp);
        return 0;

    case WM_TIMER:
        if (wp == 5) {                     /* 对话框内悬停轮询 */
            POINT pt;
            GetCursorPos(&pt);
            HWND under = WindowFromPoint(pt);
            HWND newHot = NULL;
            int hotIds[] = { IDC_PICKXY, IDC_PICKXY2, IDC_BTN_IMPEXCEL, IDOK, IDCANCEL };
            for (int i = 0; i < 5 && !newHot; i++) {
                HWND h = (hotIds[i] == IDOK || hotIds[i] == IDCANCEL)
                       ? g_edit.ctl[CTL_ID_OF(hotIds[i])]
                       : g_edit.ctl[hotIds[i] - 100];
                if (h && under == h) newHot = h;
            }
            if (newHot != g_uiHotBtn) {
                HWND old = g_uiHotBtn;
                g_uiHotBtn = newHot;
                if (old) InvalidateRect(old, NULL, FALSE);
                if (newHot) InvalidateRect(newHot, NULL, FALSE);
            }
        }
        return 0;

    case WM_DRAWITEM: {
        DRAWITEMSTRUCT *dis = (DRAWITEMSTRUCT *)lp;
        if (dis->CtlType == ODT_BUTTON) {
            if ((int)dis->CtlID == IDOK) {
                draw_accent_button(dis, ThemeColor(), RGB(0x33,0xAA,0xFF), RGB(0x00,0x7A,0xD4), FALSE);
                return TRUE;
            }
            draw_flat_button(dis);      /* 取点/取终点/取消 */
            return TRUE;
        }
        break;
    }

    case WM_DROPFILES: {
        /* 拖拽 Excel 到编辑框 = 绑定数据源(与「导入Excel数据」按钮共用) */
        wchar_t dpath[MAX_PATH] = L"";
        if (DragQueryFileW((HDROP)wp, 0, dpath, MAX_PATH) > 0) {
            const wchar_t *dot = wcsrchr(dpath, L'.');
            if (dot && (_wcsicmp(dot, L".xlsx") == 0 || _wcsicmp(dot, L".csv") == 0 ||
                        _wcsicmp(dot, L".txt") == 0)) {
                if (gui_bind_excel_path(dpath) >= 0) {
                    fill_imp_controls(gui_excel_cur_sheet(), gui_excel_cur_col());
                    if (g_edit.step && g_edit.step->type == ACT_TEXT) {
                        show_ctl(IDC_IMPSHEET, 1);
                        show_ctl(IDC_IMPCOL, 1);
                    }
                }
            } else {
                MessageBoxW(g_edit.hwnd, L"仅支持拖入 .xlsx / .csv / .txt 文件。",
                            L"提示", MB_ICONINFORMATION);
            }
        }
        DragFinish((HDROP)wp);
        return 0;
    }
    case WM_CTLCOLORSTATIC:
        SetBkColor((HDC)wp, CARD_BG);
        if (GetDlgCtrlID((HWND)lp) == IDC_TYPEHELP)
            SetTextColor((HDC)wp, RGB(0x90,0x90,0x90));   /* 说明文字用浅灰 */
        else
            SetTextColor((HDC)wp, RGB(0x3A,0x3A,0x3A));
        return (LRESULT)GetStockObject(WHITE_BRUSH);

    case WM_CTLCOLORBTN:
        return (LRESULT)GetStockObject(WHITE_BRUSH);

    case WM_CLOSE:
        g_edit.ok = 0;
        g_edit.done = 1;
        return 0;

    case WM_DESTROY:
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

/* ---------- 界面搭建 ---------- */

#define CTL(cls, txt, st, id, w, h) \
    g_edit.ctl[CTL_ID_OF(id)] = mk_ctl(cls, txt, st, id, w, h)

static void build_controls(void)
{
    /* 坐标/起点行 */
    g_edit.ctl[IDC_LB_XY - 100] = mk_ctl(L"STATIC", L"坐标 X / Y", SS_RIGHT, IDC_LB_XY, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_X, 64, 22);
    /* 判断区域宽高(0=单点);默认隐藏 */
    g_edit.ctl[IDC_LB_W - 100] = mk_ctl(L"STATIC", L"区域 W / H", SS_RIGHT, IDC_LB_W, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_W, 56, 22);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_H, 56, 22);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_Y, 64, 22);
    CTL(L"BUTTON", L"≡ 屏幕取点", BS_OWNERDRAW, IDC_PICKXY, 100, 26);

    /* 次数行 */
    g_edit.ctl[IDC_LB_COUNT - 100] = mk_ctl(L"STATIC", L"次数 / 间隔ms", SS_RIGHT, IDC_LB_COUNT, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_COUNT, 56, 22);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_INTERVAL, 56, 22);

    /* 文本行 */
    g_edit.ctl[IDC_LB_TEXT - 100] = mk_ctl(L"STATIC", L"输入内容", SS_RIGHT, IDC_LB_TEXT, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_AUTOHSCROLL, IDC_TEXT, 200, 22);
    CTL(L"BUTTON", L"导入Excel数据", BS_OWNERDRAW, IDC_BTN_IMPEXCEL, 108, 24);
    CTL(L"COMBOBOX", L"", CBS_DROPDOWNLIST | WS_VSCROLL, IDC_IMPSHEET, 148, 160);
    CTL(L"COMBOBOX", L"", CBS_DROPDOWNLIST | WS_VSCROLL, IDC_IMPCOL, 148, 160);
    /* 数据源下拉创建时隐藏(仅输入步骤显示,避免叠在其他控件上) */
    ShowWindow(g_edit.ctl[IDC_IMPSHEET - 100], SW_HIDE);
    ShowWindow(g_edit.ctl[IDC_IMPCOL - 100], SW_HIDE);

    /* 清空复选 */
    CTL(L"BUTTON", L"输入前清空原内容(Ctrl+A 后删除)", BS_AUTOCHECKBOX, IDC_CLEAR, 248, 20);

    /* 滚动行 */
    g_edit.ctl[IDC_LB_SCROLL - 100] = mk_ctl(L"STATIC", L"滚动格数(±)", SS_RIGHT, IDC_LB_SCROLL, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER, IDC_SCROLL, 64, 22);

    /* 跳转目标行:步骤号 + 目标任务 */
    g_edit.ctl[IDC_LB_JUMP - 100] = mk_ctl(L"STATIC", L"跳转目标", SS_RIGHT, IDC_LB_JUMP, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_JUMP, 64, 22);
    CTL(L"COMBOBOX", L"", CBS_DROPDOWNLIST | WS_VSCROLL, IDC_JUMPTAB, 168, 160);

    /* 找图:模板行 + 找不到跳转行 */
    g_edit.ctl[IDC_LB_TPL - 100] = mk_ctl(L"STATIC", L"图像模板", SS_RIGHT, IDC_LB_TPL, LB_W, 20);
    CTL(L"BUTTON", L"≡ 框选模板", BS_OWNERDRAW, IDC_PICKTPL, 108, 26);
    CTL(L"BUTTON", L"⊞ 框选区域", BS_OWNERDRAW, IDC_PICKREGION, 96, 24);
    g_edit.ctl[IDC_TPLINFO - 100] = mk_ctl(L"STATIC", L"未框选", 0, IDC_TPLINFO, 130, 20);
    g_edit.ctl[IDC_LB_MISSJUMP - 100] = mk_ctl(L"STATIC", L"未找到跳转", SS_RIGHT, IDC_LB_MISSJUMP, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_MISSJUMP, 56, 22);

    /* 拖动终点行 */
    g_edit.ctl[IDC_LB_XY2 - 100] = mk_ctl(L"STATIC", L"终点 X / Y", SS_RIGHT, IDC_LB_XY2, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_X2, 64, 22);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_Y2, 64, 22);
    CTL(L"BUTTON", L"≡ 取终点", BS_OWNERDRAW, IDC_PICKXY2, 100, 26);

    /* 延时行 */
    g_edit.ctl[IDC_LB_DELAY - 100] = mk_ctl(L"STATIC", L"延时 前/后(ms)", SS_RIGHT, IDC_LB_DELAY, LB_W, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_DELAYB, 72, 22);
    CTL(L"EDIT", L"", WS_BORDER | ES_NUMBER, IDC_DELAYA, 72, 22);

    /* 启用 + 备注 */
    g_edit.ctl[IDC_LB_NOTE - 100] = mk_ctl(L"STATIC", L"备注", 0, IDC_LB_NOTE, 32, 20);
    CTL(L"EDIT", L"", WS_BORDER | ES_AUTOHSCROLL, IDC_NOTE, 106, 22);

    /* 按类型说明区(灰字多行) */
    g_edit.ctl[IDC_TYPEHELP - 100] = mk_ctl(L"STATIC", L"", 0, IDC_TYPEHELP, 420, 90);

    /* 底部按钮 */
    CTL(L"BUTTON", L"取消", BS_OWNERDRAW, IDCANCEL, 86, 28);
    CTL(L"BUTTON", L"确定", BS_OWNERDRAW, IDOK, 90, 28);
}

/* ============================================================
 * 第一步:步骤类型选择(QQ 风格卡片网格)
 * ============================================================ */

#define TP_W   532
#define TP_CH  556
#define TP_CARD_W  160
#define TP_CARD_H  66
#define TP_GAP     12
#define TP_LEFT    ((TP_W - (3 * TP_CARD_W + 2 * TP_GAP)) / 2)
#define TP_TOP     60

static const wchar_t TYPE_PICK_CLASS[] = L"AcTypePick";

typedef struct {
    HWND hwnd;
    HWND btnCancel;
    int  hover;
    int  chosen;
    int  done;
} TypePick;

static TypePick g_tp;

static const struct {
    int type;
    const wchar_t *name;
    const wchar_t *desc;
} TP_ITEMS[] = {
    { ACT_CLICK,    L"单击",   L"在指定坐标点击一次" },
    { ACT_DBLCLICK, L"双击",   L"快速点击两次" },
    { ACT_MULTI,    L"多击",   L"自定义次数与间隔" },
    { ACT_RCLICK,   L"右击",   L"弹出右键菜单" },
    { ACT_MCLICK,   L"中击",   L"点击鼠标中键" },
    { ACT_TEXT,     L"输入",   L"粘贴文本(支持中文)" },
    { ACT_KEY,      L"按键",   L"发送组合键" },
    { ACT_WAIT,     L"等待",   L"停留一段时间" },
    { ACT_SCROLL,   L"滚轮",   L"上下滚动页面" },
    { ACT_DRAG,     L"拖动",   L"从起点拖到终点" },
    { ACT_JUMP,     L"跳转",   L"跳转到指定步骤" },
    { ACT_WAITWIN,  L"等窗口", L"等待窗口出现再继续" },
    { ACT_CHECK,    L"判断",   L"屏幕颜色判断分支" },
    { ACT_CALL,     L"调用",   L"执行另一TAB后返回" },
    { ACT_OCR,      L"读文本", L"区域识别文字并判断" },
    { ACT_FINDIMG,  L"找图",   L"框选图像模板,找到后定位/点击" },
    { ACT_XLSIF,    L"Excel判断", L"读当前行指定列,按 值=>步骤 跳转" },
};
#define TP_COUNT 17

/* GDI 绘制类型小图标(36x36,QQ 蓝) */
static void draw_type_icon(HDC dc, int x, int y, int type)
{
    COLORREF col = ThemeColor();
    HPEN pen = CreatePen(PS_SOLID, 2, col);
    HGDIOBJ op = SelectObject(dc, pen);
    HGDIOBJ ob = SelectObject(dc, GetStockObject(NULL_BRUSH));

    static const POINT arrow[7] = { {6,2},{6,26},{12,21},{16,29},{20,27},{16,20},{23,20} };
    POINT apt[7];

    switch (type) {
    case ACT_CLICK:
    case ACT_DBLCLICK:
    case ACT_MULTI: {
        for (int i = 0; i < 7; i++) { apt[i].x = x + arrow[i].x; apt[i].y = y + arrow[i].y; }
        HBRUSH br = CreateSolidBrush(col);
        HGDIOBJ obb = SelectObject(dc, br);
        Polygon(dc, apt, 7);
        SelectObject(dc, obb);
        DeleteObject(br);
        int rings = (type == ACT_CLICK) ? 1 : (type == ACT_DBLCLICK) ? 2 : 3;
        for (int r = 0; r < rings; r++)
            Arc(dc, x + 18, y + 12, x + 20 + (r + 1) * 5, y + 14 + (r + 1) * 5,
                x + 19, y + 8, x + 19, y + 8);
        break;
    }
    case ACT_RCLICK: {
        for (int i = 0; i < 7; i++) { apt[i].x = x + 30 - arrow[i].x; apt[i].y = y + arrow[i].y; }
        HBRUSH br = CreateSolidBrush(col);
        HGDIOBJ obb = SelectObject(dc, br);
        Polygon(dc, apt, 7);
        SelectObject(dc, obb);
        DeleteObject(br);
        Arc(dc, x + 2, y + 12, x + 16, y + 26, x + 9, y + 8, x + 9, y + 8);
        break;
    }
    case ACT_MCLICK: {
        HBRUSH br = CreateSolidBrush(col);
        Ellipse(dc, x + 10, y + 10, x + 24, y + 24);
        DeleteObject(br);
        Arc(dc, x + 2, y + 2, x + 32, y + 32, x + 34, y + 6, x + 34, y + 6);
        break;
    }
    case ACT_TEXT: {
        Rectangle(dc, x + 1, y + 8, x + 35, y + 28);
        for (int i = 0; i < 3; i++)
            for (int j = 0; j < 3; j++) {
                RECT k = { x + 5 + j * 9, y + 12 + i * 5, x + 10 + j * 9, y + 15 + i * 5 };
                MoveToEx(dc, k.left, k.top, NULL); LineTo(dc, k.right, k.top);
            }
        MoveToEx(dc, x + 32, y + 32, NULL); LineTo(dc, x + 32, y + 36);
        break;
    }
    case ACT_KEY: {
        RoundRect(dc, x + 3, y + 8, x + 33, y + 30, 6, 6);
        wchar_t ch = L'A';
        SetBkMode(dc, TRANSPARENT);
        SetTextColor(dc, col);
        HGDIOBJ of = SelectObject(dc, g_uiFontBold);
        TextOutW(dc, x + 14, y + 13, &ch, 1);
        SelectObject(dc, of);
        break;
    }
    case ACT_WAIT: {
        Ellipse(dc, x + 4, y + 2, x + 32, y + 30);
        MoveToEx(dc, x + 18, y + 16, NULL); LineTo(dc, x + 18, y + 9);
        MoveToEx(dc, x + 18, y + 16, NULL); LineTo(dc, x + 24, y + 19);
        break;
    }
    case ACT_SCROLL: {
        MoveToEx(dc, x + 18, y + 2, NULL); LineTo(dc, x + 10, y + 12); LineTo(dc, x + 26, y + 12); LineTo(dc, x + 18, y + 2);
        MoveToEx(dc, x + 18, y + 34, NULL); LineTo(dc, x + 10, y + 24); LineTo(dc, x + 26, y + 24); LineTo(dc, x + 18, y + 34);
        MoveToEx(dc, x + 14, y + 15, NULL); LineTo(dc, x + 22, y + 15);
        MoveToEx(dc, x + 14, y + 21, NULL); LineTo(dc, x + 22, y + 21);
        break;
    }
    case ACT_JUMP: {
        /* 跳转:起点圆点 + 向上折线 + 实心箭头(↪) */
        HBRUSH db = CreateSolidBrush(col);
        HGDIOBJ odb = SelectObject(dc, db);
        Ellipse(dc, x + 1, y + 23, x + 8, y + 30);
        SelectObject(dc, odb);
        DeleteObject(db);
        MoveToEx(dc, x + 4, y + 26, NULL);
        LineTo(dc, x + 4, y + 12);
        LineTo(dc, x + 18, y + 12);
        POINT tri[3] = { {x + 18, y + 5}, {x + 18, y + 19}, {x + 33, y + 12} };
        HBRUSH br = CreateSolidBrush(col);
        HGDIOBJ obb = SelectObject(dc, br);
        Polygon(dc, tri, 3);
        SelectObject(dc, obb);
        DeleteObject(br);
        break;
    }
    case ACT_OCR: {
        /* 读文本:文档形+扫描线 */
        Rectangle(dc, x + 5, y + 4, x + 27, y + 32);
        MoveToEx(dc, x + 10, y + 11, NULL); LineTo(dc, x + 22, y + 11);
        MoveToEx(dc, x + 10, y + 16, NULL); LineTo(dc, x + 22, y + 16);
        MoveToEx(dc, x + 10, y + 21, NULL); LineTo(dc, x + 18, y + 21);
        HPEN sp = CreatePen(PS_SOLID, 2, col);
        SelectObject(dc, sp);
        MoveToEx(dc, x + 2, y + 27, NULL); LineTo(dc, x + 32, y + 27);
        SelectObject(dc, pen);
        DeleteObject(sp);
        break;
    }
    case ACT_FINDIMG: {
        /* 找图:虚线选框(框选模板) + 中心准星 */
        HPEN dp = CreatePen(PS_DASH, 2, col);
        SelectObject(dc, dp);
        Rectangle(dc, x + 4, y + 6, x + 28, y + 26);
        SelectObject(dc, pen);
        DeleteObject(dp);
        MoveToEx(dc, x + 12, y + 16, NULL); LineTo(dc, x + 20, y + 16);
        MoveToEx(dc, x + 16, y + 12, NULL); LineTo(dc, x + 16, y + 20);
        break;
    }
    case ACT_XLSIF: {
        /* Excel判断:单元格表格 + 分叉箭头 */
        for (int i = 0; i < 3; i++) {
            MoveToEx(dc, x + 4, y + 8 + i * 8, NULL);
            LineTo(dc, x + 28, y + 8 + i * 8);
        }
        MoveToEx(dc, x + 10, y + 8, NULL);  LineTo(dc, x + 10, y + 24);
        MoveToEx(dc, x + 21, y + 8, NULL);  LineTo(dc, x + 21, y + 24);
        MoveToEx(dc, x + 14, y + 12, NULL); LineTo(dc, x + 24, y + 12);
        MoveToEx(dc, x + 24, y + 12, NULL); LineTo(dc, x + 19, y + 9);
        MoveToEx(dc, x + 24, y + 12, NULL); LineTo(dc, x + 19, y + 15);
        break;
    }
    case ACT_WAITWIN: {
        /* 窗形 + 沙漏:等待窗口 */
        Rectangle(dc, x + 4, y + 6, x + 30, y + 26);
        MoveToEx(dc, x + 4, y + 11, NULL); LineTo(dc, x + 30, y + 11);
        MoveToEx(dc, x + 13, y + 14, NULL); LineTo(dc, x + 21, y + 22);
        MoveToEx(dc, x + 21, y + 14, NULL); LineTo(dc, x + 13, y + 22);
        break;
    }
    case ACT_CHECK: {
        /* 判断:色块 + 分支 */
        HBRUSH db2 = CreateSolidBrush(col);
        HGDIOBJ ob2 = SelectObject(dc, db2);
        Rectangle(dc, x + 2, y + 12, x + 12, y + 22);
        SelectObject(dc, ob2);
        DeleteObject(db2);
        MoveToEx(dc, x + 12, y + 17, NULL); LineTo(dc, x + 20, y + 17);
        MoveToEx(dc, x + 20, y + 5, NULL); LineTo(dc, x + 20, y + 29);
        MoveToEx(dc, x + 20, y + 5, NULL); LineTo(dc, x + 31, y + 5);
        MoveToEx(dc, x + 20, y + 29, NULL); LineTo(dc, x + 31, y + 29);
        break;
    }
    case ACT_CALL: {
        /* 调用:去程箭头 + 回程虚线 */
        MoveToEx(dc, x + 3, y + 10, NULL); LineTo(dc, x + 26, y + 10);
        POINT t3[3] = { {x + 26, y + 4}, {x + 26, y + 16}, {x + 34, y + 10} };
        HBRUSH db3 = CreateSolidBrush(col);
        HGDIOBJ ob3 = SelectObject(dc, db3);
        Polygon(dc, t3, 3);
        SelectObject(dc, ob3);
        DeleteObject(db3);
        HPEN dp = CreatePen(PS_DOT, 1, col);
        SelectObject(dc, dp);
        MoveToEx(dc, x + 31, y + 24, NULL); LineTo(dc, x + 8, y + 24);
        POINT t4[3] = { {x + 8, y + 18}, {x + 8, y + 30}, {x, y + 24} };
        SelectObject(dc, db3);
        HBRUSH db4 = CreateSolidBrush(col);
        SelectObject(dc, db4);
        Polygon(dc, t4, 3);
        SelectObject(dc, ob3);
        DeleteObject(db4);
        SelectObject(dc, pen);
        DeleteObject(dp);
        break;
    }
    case ACT_DRAG: {
        for (int i = 0; i < 7; i++) { apt[i].x = x + arrow[i].x + 8; apt[i].y = y + arrow[i].y + 6; }
        HBRUSH br = CreateSolidBrush(col);
        HGDIOBJ obb = SelectObject(dc, br);
        Polygon(dc, apt, 7);
        SelectObject(dc, obb);
        DeleteObject(br);
        HPEN dot = CreatePen(PS_DOT, 1, col);
        SelectObject(dc, dot);
        Arc(dc, x - 6, y + 16, x + 24, y + 42, x + 2, y + 36, x + 16, y + 34);
        SelectObject(dc, pen);
        DeleteObject(dot);
        break;
    }
    }
    SelectObject(dc, op);
    SelectObject(dc, ob);
    DeleteObject(pen);
}

static void tp_card_rect(int i, RECT *rc)
{
    int col = i % 3, row = i / 3;
    rc->left = TP_LEFT + col * (TP_CARD_W + TP_GAP);
    rc->top = TP_TOP + row * (TP_CARD_H + TP_GAP);
    rc->right = rc->left + TP_CARD_W;
    rc->bottom = rc->top + TP_CARD_H;
}

static int tp_hit(int x, int y)
{
    for (int i = 0; i < TP_COUNT; i++) {
        RECT rc;
        tp_card_rect(i, &rc);
        if (x >= rc.left && x < rc.right && y >= rc.top && y < rc.bottom) return i;
    }
    return -1;
}

static void tp_paint(HDC dc)
{
    SetBkMode(dc, TRANSPARENT);

    HGDIOBJ of = SelectObject(dc, g_uiFontTitle);
    SetTextColor(dc, RGB(0x1B,0x1B,0x1B));
    TextOutW(dc, TP_LEFT, 14, L"添加步骤", 4);
    SelectObject(dc, g_uiFont);
    SetTextColor(dc, RGB(0x8A,0x8A,0x8A));
    TextOutW(dc, TP_LEFT, 40, L"选择要添加的步骤类型", 10);
    SelectObject(dc, of);

    for (int i = 0; i < TP_COUNT; i++) {
        RECT rc;
        tp_card_rect(i, &rc);
        BOOL hot = (g_tp.hover == i);

        HBRUSH br = CreateSolidBrush(hot ? RGB(0xEF,0xF7,0xFF) : CARD_BG);
        HBRUSH brPen = CreateSolidBrush(hot ? ThemeColor() : RGB(0xE6,0xE6,0xE6));
        FillRect(dc, &rc, br);
        FrameRect(dc, &rc, brPen);
        DeleteObject(br);
        DeleteObject(brPen);

        draw_type_icon(dc, rc.left + 8, rc.top + 15, TP_ITEMS[i].type);

        RECT rcName = { rc.left + 46, rc.top + 12, rc.right - 4, rc.top + 34 };
        SetTextColor(dc, hot ? ThemeColor() : RGB(0x2E,0x2E,0x2E));
        HGDIOBJ ofb = SelectObject(dc, g_uiFontBold);
        DrawTextW(dc, TP_ITEMS[i].name, -1, &rcName, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
        SelectObject(dc, ofb);
        /* 描述区两行自动换行(卡片内宽仅约 110px,单行会截断) */
        RECT rcDesc = { rc.left + 46, rc.top + 35, rc.right - 4, rc.top + 62 };
        SetTextColor(dc, RGB(0x9A,0x9A,0x9A));
        SelectObject(dc, g_uiFont);
        DrawTextW(dc, TP_ITEMS[i].desc, -1, &rcDesc,
                  DT_LEFT | DT_TOP | DT_WORDBREAK | DT_EDITCONTROL);
    }
}

static LRESULT CALLBACK tp_wndproc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_ERASEBKGND:
        return 1;   /* 背景由双缓冲统一绘制,消除闪动 */
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC dc = BeginPaint(hwnd, &ps);
        RECT rc;
        GetClientRect(hwnd, &rc);
        /* 排除子窗口(取消按钮)区域:父窗口重绘不覆盖按钮,
           否则按钮被反复擦画导致闪烁 */
        if (g_tp.btnCancel) {
            RECT rcb;
            GetWindowRect(g_tp.btnCancel, &rcb);
            MapWindowPoints(NULL, hwnd, (POINT *)&rcb, 2);
            ExcludeClipRect(dc, rcb.left, rcb.top, rcb.right, rcb.bottom);
        }
        /* 双缓冲:先画到内存位图,一次性上屏 */
        HDC mem = CreateCompatibleDC(dc);
        HBITMAP bmp = CreateCompatibleBitmap(dc, rc.right, rc.bottom);
        HGDIOBJ oldBmp = SelectObject(mem, bmp);
        FillRect(mem, &rc, (HBRUSH)GetStockObject(WHITE_BRUSH));
        tp_paint(mem);
        BitBlt(dc, 0, 0, rc.right, rc.bottom, mem, 0, 0, SRCCOPY);
        SelectObject(mem, oldBmp);
        DeleteObject(bmp);
        DeleteDC(mem);
        EndPaint(hwnd, &ps);
        return 0;
    }
    case WM_SETCURSOR:
        if (LOWORD(lp) == HTCLIENT && g_tp.hover >= 0) {
            SetCursor(LoadCursorW(NULL, (LPCWSTR)IDC_HAND));
            return TRUE;
        }
        break;
    case WM_MOUSEMOVE: {
        int h = tp_hit(GET_X_LPARAM(lp), GET_Y_LPARAM(lp));
        if (h != g_tp.hover) {
            g_tp.hover = h;
            InvalidateRect(hwnd, NULL, TRUE);
        }
        return 0;
    }
    case WM_MOUSELEAVE:
        if (g_tp.hover != -1) { g_tp.hover = -1; InvalidateRect(hwnd, NULL, TRUE); }
        return 0;
    case WM_LBUTTONUP: {
        int h = tp_hit(GET_X_LPARAM(lp), GET_Y_LPARAM(lp));
        if (h >= 0) {
            g_tp.chosen = TP_ITEMS[h].type;
            g_tp.done = 1;
        }
        return 0;
    }
    case WM_COMMAND:
        if (LOWORD(wp) == IDCANCEL) {
            g_tp.chosen = -1;
            g_tp.done = 1;
        }
        return 0;

    case WM_TIMER:
        if (wp == 6) {
            POINT pt;
            GetCursorPos(&pt);
            HWND under = WindowFromPoint(pt);
            HWND newHot = (under == g_tp.btnCancel) ? g_tp.btnCancel : NULL;
            if (newHot != g_uiHotBtn) {
                HWND old = g_uiHotBtn;
                g_uiHotBtn = newHot;
                if (old) InvalidateRect(old, NULL, FALSE);
                if (newHot) InvalidateRect(newHot, NULL, FALSE);
            }
        }
        return 0;

    case WM_DRAWITEM: {
        DRAWITEMSTRUCT *dis = (DRAWITEMSTRUCT *)lp;
        if (dis->CtlType == ODT_BUTTON && (int)dis->CtlID == IDCANCEL) {
            draw_flat_button(dis);
            return TRUE;
        }
        break;
    }
    case WM_KEYDOWN:
        if (wp == VK_ESCAPE) { g_tp.chosen = -1; g_tp.done = 1; }
        return 0;
    case WM_CLOSE:
        g_tp.chosen = -1;
        g_tp.done = 1;
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

int pick_step_type_dialog(HWND owner)
{
    memset(&g_tp, 0, sizeof(g_tp));
    g_tp.chosen = -1;

    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = tp_wndproc;
    wc.hInstance = GetModuleHandleW(NULL);
    wc.lpszClassName = TYPE_PICK_CLASS;
    wc.hbrBackground = (HBRUSH)GetStockObject(WHITE_BRUSH);
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    RegisterClassW(&wc);

    RECT rcOwner;
    GetWindowRect(owner, &rcOwner);
    int cx = rcOwner.left + ((rcOwner.right - rcOwner.left) - TP_W) / 2;
    int cy = rcOwner.top + ((rcOwner.bottom - rcOwner.top) - TP_CH) / 2;
    if (cx < 0) cx = 80;
    if (cy < 0) cy = 80;

    DWORD tpStyle = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU;
    RECT rcAdj = { 0, 0, TP_W, TP_CH };
    AdjustWindowRectEx(&rcAdj, tpStyle, FALSE, WS_EX_DLGMODALFRAME);
    int winW = rcAdj.right - rcAdj.left;
    int winH = rcAdj.bottom - rcAdj.top;

    g_tp.hwnd = CreateWindowExW(
        WS_EX_DLGMODALFRAME, TYPE_PICK_CLASS, L"选择步骤类型 - 点击助手",
        tpStyle, cx, cy, winW, winH,
        owner, NULL, wc.hInstance, NULL);
    if (!g_tp.hwnd) return -1;

    g_tp.btnCancel = CreateWindowExW(0, L"BUTTON", L"取消", BS_OWNERDRAW | WS_CHILD | WS_VISIBLE,
        TP_W - 14 - 84, TP_CH - 14 - 28, 84, 28, g_tp.hwnd, (HMENU)IDCANCEL,
        GetModuleHandleW(NULL), NULL);
    SendMessageW(g_tp.btnCancel, WM_SETFONT, (WPARAM)g_uiFont, TRUE);

    ShowWindow(g_tp.hwnd, SW_SHOW);
    UpdateWindow(g_tp.hwnd);
    EnableWindow(owner, FALSE);
    g_uiDlgActive = 1;
    SetTimer(g_tp.hwnd, 6, 30, NULL);

    TRACKMOUSEEVENT tme;
    tme.cbSize = sizeof(tme);
    tme.dwFlags = TME_LEAVE;
    tme.hwndTrack = g_tp.hwnd;
    tme.dwHoverTime = 0;

    MSG msg;
    while (!g_tp.done) {
        if (PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) {
            if (msg.message == WM_KEYDOWN && msg.wParam == VK_ESCAPE) { g_tp.chosen = -1; break; }
            if (msg.message == WM_MOUSEMOVE) TrackMouseEvent(&tme);
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        } else {
            WaitMessage();
        }
    }

    g_uiDlgActive = 0;
    g_uiHotBtn = NULL;
    KillTimer(g_tp.hwnd, 6);
    EnableWindow(owner, TRUE);
    DestroyWindow(g_tp.hwnd);
    UnregisterClassW(TYPE_PICK_CLASS, wc.hInstance);
    SetForegroundWindow(owner);
    return g_tp.chosen;
}

/* ---------- 入口 ---------- */

int edit_step_dialog(HWND owner, Step *s, int isNew)
{
    memset(&g_edit, 0, sizeof(g_edit));
    g_edit.step = s;
    g_edit.isNew = isNew;

    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = edit_wndproc;
    wc.hInstance = GetModuleHandleW(NULL);
    wc.lpszClassName = EDIT_DLG_CLASS;
    wc.hbrBackground = (HBRUSH)GetStockObject(WHITE_BRUSH);
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    RegisterClassW(&wc);

    wchar_t title[128];
    _snwprintf(title, 127, L"%ls步骤[%ls] - 点击助手",
               isNew ? L"添加" : L"编辑", act_type_name(s->type));
    title[127] = 0;

    RECT rcOwner;
    GetWindowRect(owner, &rcOwner);
    int cx = rcOwner.left + ((rcOwner.right - rcOwner.left) - DLG_CW) / 2;
    int cy = rcOwner.top + ((rcOwner.bottom - rcOwner.top) - 420) / 2;
    if (cx < 0) cx = 60;
    if (cy < 0) cy = 60;

    free(g_edit.tplB64);
    g_edit.tplB64 = NULL;
    g_edit.tplW = g_edit.tplH = 0;
    g_edit.hwnd = CreateWindowExW(
        WS_EX_DLGMODALFRAME, EDIT_DLG_CLASS, title,
        WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU,
        cx, cy, TP_W + 16, TP_CH + 34,
        owner, NULL, wc.hInstance, NULL);
    if (!g_edit.hwnd) return 0;
    DragAcceptFiles(g_edit.hwnd, TRUE);     /* 支持拖拽 Excel 到编辑框绑定数据源 */

    build_controls();

    /* 初始值 */
    set_int(IDC_X, s->x);
    set_int(IDC_Y, s->y);
    set_int(IDC_COUNT, s->type == ACT_XLSIF ? s->count :
              (s->count > 0 ? s->count : 3));
    set_int(IDC_INTERVAL, s->interval > 0 ? s->interval : 100);
    set_int(IDC_X2, s->x2);
    set_int(IDC_Y2, s->y2);
    set_int(IDC_SCROLL, s->scroll != 0 ? s->scroll : 3);
    set_int(IDC_JUMP, s->jumpTo);
    if (s->type == ACT_CHECK) {
        set_int(IDC_W, s->w);
        set_int(IDC_H, s->h);
        wchar_t cb[16];
        _snwprintf(cb, 15, L"%06X", s->ifColor & 0xFFFFFF);
        cb[15] = 0;
        set_ctl_text(IDC_COUNT, cb);
        set_int(IDC_INTERVAL, s->ifTol > 0 ? s->ifTol : 10);
    }
    if (s->type == ACT_FINDIMG) {
        set_int(IDC_W, s->w);
        set_int(IDC_H, s->h);
        set_int(IDC_COUNT, s->count);
        set_int(IDC_INTERVAL, s->ifTol > 0 ? s->ifTol : 20);
        set_int(IDC_MISSJUMP, s->missJump);
        if (s->imgB64 && s->imgB64[0]) {
            int tw2 = 0, th2 = 0;
            if (findimg_unpack(s->imgB64, NULL, NULL, NULL, NULL, &tw2, &th2)) {
                free(g_edit.tplB64);
                g_edit.tplB64 = strdup(s->imgB64);
                g_edit.tplW = tw2;
                g_edit.tplH = th2;
                wchar_t ti[40];
                _snwprintf(ti, 39, L"已框选 %dx%d", tw2, th2);
                ti[39] = 0;
                set_ctl_text(IDC_TPLINFO, ti);
            }
        }
    }
    {   /* 目标任务下拉:只列当前实际存在的TAB;默认选中当前任务 */
        HWND cb = g_edit.ctl[IDC_JUMPTAB - 100];
        int n = gui_tab_count();
        if (n < 1) n = 1;
        if (n > MAX_TASKS) n = MAX_TASKS;
        SendMessageW(cb, CB_RESETCONTENT, 0, 0);
        for (int k = 0; k < n; k++)
            SendMessageW(cb, CB_ADDSTRING, 0, (LPARAM)gui_tab_display_name(k));
        int sel = (s->jumpTab >= 1 && s->jumpTab <= n) ? s->jumpTab - 1 : gui_cur_task();
        if (sel < 0 || sel >= n) sel = 0;
        SendMessageW(cb, CB_SETCURSEL, (WPARAM)sel, 0);
    }
    set_int(IDC_DELAYB, s->delayBefore);
    set_int(IDC_DELAYA, s->delayAfter);
    set_ctl_text(IDC_TEXT, s->text);
    set_ctl_text(IDC_NOTE, s->note);
    SendMessageW(g_edit.ctl[IDC_CLEAR - 100], BM_SETCHECK,
                 s->clearFirst ? BST_CHECKED : BST_UNCHECKED, 0);

    ShowWindow(g_edit.hwnd, SW_HIDE);
    layout_rows(s->type);              /* 按类型重排并收缩窗口 */

    /* 按收缩后的实际尺寸,在主窗口内居中 */
    {
        RECT rw;
        GetWindowRect(g_edit.hwnd, &rw);
        int w2 = rw.right - rw.left, h2 = rw.bottom - rw.top;
        int nx = rcOwner.left + ((rcOwner.right - rcOwner.left) - w2) / 2;
        int ny = rcOwner.top + ((rcOwner.bottom - rcOwner.top) - h2) / 2;
        if (nx < 0) nx = 0;
        if (ny < 0) ny = 0;
        SetWindowPos(g_edit.hwnd, NULL, nx, ny, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
    }

    ShowWindow(g_edit.hwnd, SW_SHOW);
    UpdateWindow(g_edit.hwnd);
    EnableWindow(owner, FALSE);
    g_uiDlgActive = 1;
    g_uiHotBtn = NULL;
    SetTimer(g_edit.hwnd, 5, 30, NULL);

    MSG msg;
    while (!g_edit.done) {
        if (PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) {
            if (msg.message == WM_KEYDOWN && !ime_composing()) {
                if (msg.wParam == VK_ESCAPE) {
                    g_edit.ok = 0;
                    break;
                }
                if (msg.wParam == VK_RETURN) {
                    if (collect()) { g_edit.ok = 1; break; }
                    continue;
                }
            }
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        } else {
            WaitMessage();
        }
    }

    free(g_edit.tplB64);
    g_edit.tplB64 = NULL;
    g_uiDlgActive = 0;
    g_uiHotBtn = NULL;
    KillTimer(g_edit.hwnd, 5);
    mark_clear_preview();              /* 清除取点预览标记 */
    EnableWindow(owner, TRUE);
    DestroyWindow(g_edit.hwnd);
    UnregisterClassW(EDIT_DLG_CLASS, wc.hInstance);
    SetForegroundWindow(owner);
    return g_edit.ok;
}

/* ================= 定时执行设置对话框(gui.c 数据/入口) ================= */

static const wchar_t SCHED_DLG_CLASS[] = L"AcSchedDlg";
static HWND g_sdHwnd, g_sdHH, g_sdMM, g_sdChk;
static int  g_sdDone, g_sdOk;
static int (*g_sdGet)(int *en, int *hh, int *mm);      /* 读取当前设置 */
static void (*g_sdSet)(int en, int hh, int mm);        /* 保存设置 */

static LRESULT CALLBACK sched_wndproc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_COMMAND:
        if (LOWORD(wp) == IDOK) { g_sdOk = 1; g_sdDone = 1; return 0; }
        if (LOWORD(wp) == IDCANCEL) { g_sdDone = 1; return 0; }
        break;
    case WM_CLOSE:
        g_sdDone = 1;
        return 0;
    case WM_DRAWITEM: {
        DRAWITEMSTRUCT *dis = (DRAWITEMSTRUCT *)lp;
        if (dis->CtlType == ODT_BUTTON) draw_flat_button(dis);
        return TRUE;
    }
    case WM_CTLCOLORSTATIC:
        SetBkColor((HDC)wp, CARD_BG);
        SetTextColor((HDC)wp, RGB(0x2E, 0x2E, 0x2E));
        return (LRESULT)GetStockObject(WHITE_BRUSH);
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

/* 弹出定时设置;getter/setter 由 gui.c 提供(读写 g_sched*) */
int sched_dialog(HWND owner, int (*getter)(int *, int *, int *),
                 void (*setter)(int, int, int))
{
    g_sdGet = getter;
    g_sdSet = setter;
    int en = 0, hh = 9, mm = 0;
    if (getter) getter(&en, &hh, &mm);

    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = sched_wndproc;
    wc.hInstance = GetModuleHandleW(NULL);
    wc.lpszClassName = SCHED_DLG_CLASS;
    wc.hbrBackground = (HBRUSH)GetStockObject(WHITE_BRUSH);
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    RegisterClassW(&wc);

    RECT rcOwner;
    GetWindowRect(owner, &rcOwner);
    int cw = 320, ch = 168;
    int cx = rcOwner.left + ((rcOwner.right - rcOwner.left) - cw) / 2;
    int cy = rcOwner.top + ((rcOwner.bottom - rcOwner.top) - ch) / 2;
    if (cx < 0) cx = 60;
    if (cy < 0) cy = 60;

    g_sdHwnd = CreateWindowExW(WS_EX_DLGMODALFRAME, SCHED_DLG_CLASS, L"定时执行",
                               WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU,
                               cx, cy, cw, ch, owner, NULL, wc.hInstance, NULL);
    if (!g_sdHwnd) { UnregisterClassW(SCHED_DLG_CLASS, wc.hInstance); return 0; }

    HWND lbl = CreateWindowExW(0, L"STATIC", L"每天", WS_CHILD | WS_VISIBLE,
                               16, 18, 36, 20, g_sdHwnd, NULL, wc.hInstance, NULL);
    wchar_t v[8];
    _snwprintf(v, 7, L"%d", hh);
    g_sdHH = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", v,
                             WS_CHILD | WS_VISIBLE | WS_TABSTOP | ES_NUMBER,
                             56, 15, 40, 24, g_sdHwnd, NULL, wc.hInstance, NULL);
    HWND c1 = CreateWindowExW(0, L"STATIC", L":", WS_CHILD | WS_VISIBLE,
                              100, 18, 8, 20, g_sdHwnd, NULL, wc.hInstance, NULL);
    _snwprintf(v, 7, L"%d", mm);
    g_sdMM = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", v,
                             WS_CHILD | WS_VISIBLE | WS_TABSTOP | ES_NUMBER,
                             110, 15, 40, 24, g_sdHwnd, NULL, wc.hInstance, NULL);
    HWND lbl2 = CreateWindowExW(0, L"STATIC", L"自动运行当前任务(时 0~23,分 0~59)",
                                WS_CHILD | WS_VISIBLE,
                                16, 48, 280, 20, g_sdHwnd, NULL, wc.hInstance, NULL);
    g_sdChk = CreateWindowExW(0, L"BUTTON", L"启用定时(每天一次,到点自动开始)",
                              WS_CHILD | WS_VISIBLE | BS_AUTOCHECKBOX,
                              16, 76, 286, 22, g_sdHwnd, NULL, wc.hInstance, NULL);
    SendMessageW(g_sdChk, BM_SETCHECK, en ? BST_CHECKED : BST_UNCHECKED, 0);
    HWND btnOk = CreateWindowExW(0, L"BUTTON", L"确定",
                                 WS_CHILD | WS_VISIBLE | BS_OWNERDRAW | WS_TABSTOP,
                                 cw - 216, 126, 96, 27, g_sdHwnd, (HMENU)IDOK, wc.hInstance, NULL);
    HWND btnCa = CreateWindowExW(0, L"BUTTON", L"取消",
                                 WS_CHILD | WS_VISIBLE | BS_OWNERDRAW | WS_TABSTOP,
                                 cw - 112, 126, 96, 27, g_sdHwnd, (HMENU)IDCANCEL, wc.hInstance, NULL);
    (void)lbl; (void)c1; (void)lbl2; (void)btnOk; (void)btnCa;
    if (g_uiFont) {
        HWND all[] = { lbl, g_sdHH, c1, g_sdMM, lbl2, g_sdChk, btnOk, btnCa };
        for (int i = 0; i < 8; i++) SendMessageW(all[i], WM_SETFONT, (WPARAM)g_uiFont, TRUE);
    }

    ShowWindow(g_sdHwnd, SW_SHOW);
    UpdateWindow(g_sdHwnd);
    SetFocus(g_sdHH);
    EnableWindow(owner, FALSE);
    g_uiDlgActive = 1;
    g_uiHotBtn = NULL;
    g_sdDone = 0;
    g_sdOk = 0;

    MSG msg;
    while (!g_sdDone) {
        if (PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) {
            if (msg.message == WM_KEYDOWN && msg.wParam == VK_ESCAPE) break;
            if (msg.message == WM_KEYDOWN && msg.wParam == VK_RETURN) {
                PostMessageW(g_sdHwnd, WM_COMMAND, MAKELONG(IDOK, 0), 0);
                continue;
            }
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        } else {
            WaitMessage();
        }
    }

    if (g_sdOk) {
        wchar_t b1[8] = L"";
        GetWindowTextW(g_sdHH, b1, 7);
        int h2 = _wtoi(b1);
        GetWindowTextW(g_sdMM, b1, 7);
        int m2 = _wtoi(b1);
        if (h2 < 0) h2 = 0;  if (h2 > 23) h2 = 23;
        if (m2 < 0) m2 = 0;  if (m2 > 59) m2 = 59;
        if (g_sdSet) g_sdSet(SendMessageW(g_sdChk, BM_GETCHECK, 0, 0) == BST_CHECKED,
                             h2, m2);
    }
    g_uiDlgActive = 0;
    g_uiHotBtn = NULL;
    EnableWindow(owner, TRUE);
    DestroyWindow(g_sdHwnd);
    UnregisterClassW(SCHED_DLG_CLASS, wc.hInstance);
    SetForegroundWindow(owner);
    return g_sdOk;
}

/* ================= TAB 重命名对话框(双击步骤TAB弹出) ================= */

static const wchar_t RENAME_DLG_CLASS[] = L"AcRenameDlg";
static HWND g_rnHwnd, g_rnEdit;
static int g_rnDone, g_rnOk;

static LRESULT CALLBACK rename_wndproc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_COMMAND:
        if (LOWORD(wp) == IDOK) {
            wchar_t tmp[AC_TASKNAME_MAX];
            GetWindowTextW(g_rnEdit, tmp, AC_TASKNAME_MAX);
            /* 滤掉控制字符(粘贴可能混入换行),再去首尾空格;清空则不改名 */
            {
                int w = 0;
                for (int r2 = 0; tmp[r2]; r2++)
                    if (tmp[r2] >= 0x20) tmp[w++] = tmp[r2];
                tmp[w] = 0;
            }
            wchar_t *b = tmp, *e = tmp + wcslen(tmp);
            while (e > b && *(e - 1) == L' ') *(--e) = 0;
            while (*b == L' ') b++;
            SetWindowTextW(g_rnEdit, b);          /* 回写供调用方读取 */
            if (!b[0]) return 0;                 /* 空名=取消 */
            g_rnOk = 1;
            g_rnDone = 1;
            return 0;
        }
        if (LOWORD(wp) == IDCANCEL) {
            g_rnDone = 1;                         /* 未置ok=取消 */
            return 0;
        }
        break;
    case WM_CLOSE:
        g_rnDone = 1;
        return 0;
    case WM_DRAWITEM: {                           /* 白底细边按钮,与编辑对话框一致 */
        DRAWITEMSTRUCT *dis = (DRAWITEMSTRUCT *)lp;
        if (dis->CtlType == ODT_BUTTON) draw_flat_button(dis);
        return TRUE;
    }
    case WM_CTLCOLORSTATIC:
        SetBkColor((HDC)wp, CARD_BG);
        SetTextColor((HDC)wp, RGB(0x2E, 0x2E, 0x2E));
        return (LRESULT)GetStockObject(WHITE_BRUSH);
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

/* 重命名TAB:弹出单行输入框。buf 传入当前名(可为空),确定返回1并写回新名 */
int rename_tab_dialog(HWND owner, const wchar_t *title, wchar_t *buf, int buflen)
{
    WNDCLASSW wc;
    memset(&wc, 0, sizeof(wc));
    wc.lpfnWndProc = rename_wndproc;
    wc.hInstance = GetModuleHandleW(NULL);
    wc.lpszClassName = RENAME_DLG_CLASS;
    wc.hbrBackground = (HBRUSH)GetStockObject(WHITE_BRUSH);
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    RegisterClassW(&wc);

    RECT rcOwner;
    GetWindowRect(owner, &rcOwner);
    int cw = 316, ch = 118;
    int cx = rcOwner.left + ((rcOwner.right - rcOwner.left) - cw) / 2;
    int cy = rcOwner.top + ((rcOwner.bottom - rcOwner.top) - ch) / 2;
    if (cx < 0) cx = 60;
    if (cy < 0) cy = 60;

    g_rnHwnd = CreateWindowExW(
        WS_EX_DLGMODALFRAME, RENAME_DLG_CLASS, title,
        WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU,
        cx, cy, cw, ch, owner, NULL, wc.hInstance, NULL);
    if (!g_rnHwnd) { UnregisterClassW(RENAME_DLG_CLASS, wc.hInstance); return 0; }

    HWND lbl = CreateWindowExW(0, L"STATIC", L"名称:",
                               WS_CHILD | WS_VISIBLE,
                               14, 20, 40, 20, g_rnHwnd, NULL, wc.hInstance, NULL);
    g_rnEdit = CreateWindowExW(0, L"EDIT", buf,
                               WS_CHILD | WS_VISIBLE | WS_TABSTOP | ES_AUTOHSCROLL | WS_BORDER,
                               58, 17, cw - 58 - 18, 24, g_rnHwnd, NULL, wc.hInstance, NULL);
    HWND btnOk = CreateWindowExW(0, L"BUTTON", L"确定",
                                 WS_CHILD | WS_VISIBLE | BS_OWNERDRAW | WS_TABSTOP,
                                 cw - 196, 56, 86, 27, g_rnHwnd, (HMENU)IDOK, wc.hInstance, NULL);
    HWND btnCa = CreateWindowExW(0, L"BUTTON", L"取消",
                                 WS_CHILD | WS_VISIBLE | BS_OWNERDRAW | WS_TABSTOP,
                                 cw - 100, 56, 86, 27, g_rnHwnd, (HMENU)IDCANCEL, wc.hInstance, NULL);
    (void)lbl; (void)btnOk; (void)btnCa;
    if (g_uiFont) {
        SendMessageW(lbl, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        SendMessageW(g_rnEdit, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        SendMessageW(btnOk, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
        SendMessageW(btnCa, WM_SETFONT, (WPARAM)g_uiFont, TRUE);
    }
    SendMessageW(g_rnEdit, EM_SETLIMITTEXT, buflen - 1, 0);
    SendMessageW(g_rnEdit, EM_SETSEL, 0, -1);

    ShowWindow(g_rnHwnd, SW_SHOW);
    UpdateWindow(g_rnHwnd);
    SetFocus(g_rnEdit);
    EnableWindow(owner, FALSE);
    g_uiDlgActive = 1;
    g_uiHotBtn = NULL;

    g_rnDone = 0;
    g_rnOk = 0;
    MSG msg;
    while (!g_rnDone) {
        if (PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) {
            if (msg.message == WM_KEYDOWN && !ime_composing()) {
                if (msg.wParam == VK_ESCAPE) break;
                if (msg.wParam == VK_RETURN) {
                    SendMessageW(g_rnHwnd, WM_COMMAND, MAKELONG(IDOK, 0), 0);
                    continue;
                }
                if (msg.wParam == VK_TAB) {  /* 确定/取消切换焦点 */
                    HWND f = GetFocus();
                    SetFocus(f == g_rnEdit ? GetDlgItem(g_rnHwnd, IDOK)
                            : f == GetDlgItem(g_rnHwnd, IDOK) ? GetDlgItem(g_rnHwnd, IDCANCEL)
                            : g_rnEdit);
                    continue;
                }
            }
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        } else {
            WaitMessage();
        }
    }

    if (g_rnOk) GetWindowTextW(g_rnEdit, buf, buflen);
    g_uiDlgActive = 0;
    g_uiHotBtn = NULL;
    EnableWindow(owner, TRUE);
    DestroyWindow(g_rnHwnd);
    UnregisterClassW(RENAME_DLG_CLASS, wc.hInstance);
    SetForegroundWindow(owner);
    return g_rnOk;
}
