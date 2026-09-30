/* ui_shared.h - 跨窗口共享的 UI 风格资源(字体/颜色/按钮绘制) */
#ifndef AC_UI_SHARED_H
#define AC_UI_SHARED_H

#include <windows.h>

#ifdef __cplusplus
extern "C" {
#endif

/* 颜色 */
#define UI_BG       RGB(0xF2, 0xF2, 0xF2)   /* 窗口底色(QQ 灰) */
#define CARD_BG     RGB(0xFF, 0xFF, 0xFF)   /* 卡片白 */
#define QQ_BLUE     RGB(0x00, 0x99, 0xFF)   /* QQ 主色 */

/* 字体(gui.c 创建,对话框直接复用) */
extern HFONT g_uiFont, g_uiFontBold, g_uiFontTitle, g_uiFontSub;

/* 当前悬停的自绘按钮(全局;模态对话框打开期间由对话框接管) */
extern HWND g_uiHotBtn;
extern volatile int g_uiDlgActive;   /* 非0=有模态对话框,主窗口悬停轮询暂停 */
extern HWND g_uiNavSel;              /* 侧栏当前选中页按钮(选中态高亮) */

/* 按钮绘制 */
void draw_nav_button(DRAWITEMSTRUCT *dis);     /* 侧栏导航:无边框悬停灰块 */
void draw_flat_button(DRAWITEMSTRUCT *dis);    /* 白底圆角细边 */
void draw_accent_button(DRAWITEMSTRUCT *dis, COLORREF normal, COLORREF hot, COLORREF down, BOOL disabled);

/* 屏幕标记(置顶显示步骤序号+动作,点击穿透) */
void mark_preview(int x, int y, int type, int seq);
void mark_clear_preview(void);
extern int g_mark_seq;            /* 当前编辑中步骤的序号(1 起) */

/* 编辑窗「导入Excel数据」:选文件并记录工作表名单(不弹选择框)。
   返回工作表数(xlsx),0=CSV,-1=取消/失败 */
int gui_pick_excel_file(HWND owner);
/* 按当前绑定文件与选择重新收集数据源;col=0 第1列含首行,col>=1 该列跳表头行 */
int gui_rebind_excel(int sheet, int col);
/* 当前绑定文件的工作表信息 */
int gui_excel_sheet_count(void);
const char *gui_excel_sheet_name(int idx);   /* UTF-8;idx 越界返回 "" */
int gui_excel_cur_sheet(void);
/* 当前工作表首行的列名(数据列下拉) */
int gui_excel_col_count(void);
const char *gui_excel_col_name(int idx);     /* UTF-8;越界返回 "" */
int gui_excel_cur_col(void);

/* 运行日志(platform_win 的 OCR 识别结果记录用) */
void log_add(const wchar_t *fmt, ...);

/* TAB 显示名(无自定义名时为 步骤N);idx 从 0 起 */
const wchar_t *gui_tab_display_name(int idx);
int gui_tab_count(void);   /* 当前实际TAB数(1~8) */
int gui_cur_task(void);    /* 当前选中TAB索引(0起) */

#ifdef __cplusplus
}
#endif
#endif
