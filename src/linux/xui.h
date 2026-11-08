/* ============================================================
 * xui.h - 纯 Xlib 轻量控件层(仅依赖 libX11,零第三方库)
 * 提供:窗口/按钮/标签/输入框/勾选框/下拉框/多列列表/状态栏、
 *       模态对话框、消息框、文件选择框、selection 剪贴板、
 *       全局热键(XGrabKey)、XIM 中文输入支持
 * ============================================================ */
#ifndef XUI_H
#define XUI_H

#include <X11/Xlib.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct XUi   XUi;
typedef struct XuiWin XuiWin;
typedef struct XuiWgt XuiWgt;

/* 回调 */
typedef void (*XuiFn)(XuiWgt *w, void *ud);              /* 点击/勾选 */
typedef void (*XuiListFn)(XuiWgt *w, int row, void *ud); /* 列表选择/双击 */
typedef void (*XuiKeyFn)(XuiWin *win, KeySym ks, unsigned state, void *ud);
typedef void (*XuiHotFn)(XUi *ui, KeySym ks, unsigned state, void *ud);
typedef int  (*XuiCloseFn)(XuiWin *win, void *ud);       /* 返回1=允许关闭 */

/* ---- 生命周期 ---- */
XUi *xui_open(void);                 /* 打开显示/字体/颜色;失败 NULL */
void xui_close(XUi *ui);
void xui_quit(XUi *ui);              /* 请求退出主循环 */
void xui_wake(XUi *ui);              /* 跨线程唤醒主循环等待 */

/* ---- 窗口 ---- */
XuiWin *xui_window_new(XUi *ui, int w, int h, const char *titleUtf8);
void    xui_window_show(XuiWin *w);
int     xui_window_run(XuiWin *w);   /* 模态运行(grab 输入),返回 xui_window_exit 的值 */
void    xui_window_exit(XuiWin *w, int result);
void    xui_window_set_key(XuiWin *w, XuiKeyFn fn, void *ud);
void    xui_window_set_close(XuiWin *w, XuiCloseFn fn, void *ud);
void    xui_window_set_default(XuiWin *w, XuiWgt *okBtn, XuiWgt *cancelBtn);
void    xui_set_theme(XUi *ui, unsigned long rgb);   /* 主题色 0xRRGGBB(选中/强调色联动) */
void    xui_ungrab_keys(XUi *ui, KeySym ks, unsigned mods); /* 解除全局热键 */
void    xui_window_stay_top(XuiWin *w);              /* 置顶(EWMH _NET_WM_STATE_ABOVE) */
void    xui_window_move(XuiWin *w, int x, int y);    /* 移动到屏幕坐标 */
void    xui_window_pos(XuiWin *w, int *x, int *y);   /* 取屏幕坐标 */
void    xui_window_hide(XuiWin *w);                  /* 隐藏(Unmap) */

/* ---- 控件(父窗口内绝对布局,坐标含边框) ---- */
XuiWgt *xui_label (XuiWin *p, int x,int y,int w,int h, const char *utf8);
XuiWgt *xui_button(XuiWin *p, int x,int y,int w,int h, const char *utf8, XuiFn cb, void *ud);
XuiWgt *xui_button_col(XuiWin *p, int x,int y,int w,int h, unsigned long rgb, XuiFn cb, void *ud); /* 彩色按钮(色板) */
XuiWgt *xui_entry (XuiWin *p, int x,int y,int w,int h, const char *initUtf8);
XuiWgt *xui_check (XuiWin *p, int x,int y,int w,int h, const char *utf8, int checked, XuiFn cb, void *ud);
XuiWgt *xui_combo (XuiWin *p, int x,int y,int w,int h, XuiFn onPick, void *ud);
XuiWgt *xui_statusbar(XuiWin *p, int x,int y,int w,int h);

void xui_combo_add(XuiWgt *c, const char *utf8);
int  xui_combo_active(XuiWgt *c);
void xui_combo_set_active(XuiWgt *c, int idx);

XuiWgt *xui_list_new(XuiWin *p, int x,int y,int w,int h, int nCols, const int *colW);
void xui_list_cb(XuiWgt *l, XuiListFn onSel, XuiListFn onActivate, void *ud);
void xui_list_set_rows(XuiWgt *l, int nRows);
void xui_list_set(XuiWgt *l, int row, int col, const char *utf8);
void xui_list_set_header(XuiWgt *l, int col, const char *utf8);
int  xui_list_sel(XuiWgt *l);
void xui_list_sel_set(XuiWgt *l, int row);
/* 勾选模式:行首画勾选框,点击行首切换(用于多选批量操作);行数变化勾选清零 */
void xui_list_enable_check(XuiWgt *l, int on);
int  xui_list_checked(XuiWgt *l, int row);

/* ---- 通用 ---- */
void xui_set_text(XuiWgt *w, const char *utf8);   /* label/entry/statusbar */
const char *xui_entry_text(XuiWgt *e);            /* 内部缓冲,勿久存 */
int  xui_checked(XuiWgt *c);
void xui_set_sensitive(XuiWgt *w, int on);
void xui_show(XuiWgt *w, int on);
void xui_set_focus(XuiWgt *e);

/* ---- 主循环 ---- */
void xui_pump(XUi *ui, int timeoutMs);   /* 处理积压事件,最多等 timeoutMs(-1=阻塞至事件) */
int  xui_should_quit(XUi *ui);           /* 收到退出请求(窗口关闭/WM 退出)后为真 */

/* ---- 全局热键(XGrabKey,事件驱动) ---- */
int  xui_grab_keys(XUi *ui, KeySym ks, unsigned mods);
void xui_set_hotkey_fn(XUi *ui, XuiHotFn fn, void *ud);

/* ---- 剪贴板(selection,主线程调用) ---- */
void xui_clip_set(XUi *ui, const char *utf8);   /* 成为 owner,应答在 pump 内进行 */
char *xui_clip_get(XUi *ui);                    /* 读取 CLIPBOARD,失败 NULL(malloc 结果) */

/* ---- 消息框:返回按钮下标(0起);icon: 0=信息 1=错误 2=询问 ---- */
int xui_alert(XUi *ui, XuiWin *parent, int icon, const char *textUtf8,
              int nBtns, const char *const *btnUtf8);

/* ---- 文件选择。filterCsv 形如 "xlsx,csv,txt"(NULL=全部)。返回 malloc 路径/NULL ---- */
char *xui_filesel(XUi *ui, XuiWin *parent, int isSave, const char *titleUtf8,
                  const char *filterCsv, const char *defNameUtf8);

/* ---- 底层绘图辅助(取点覆盖窗等专用) ---- */
Display *xui_dpy(XUi *ui);
XFontSet xui_fs(XUi *ui);
GC       xui_gc(XUi *ui);
unsigned long xui_black(XUi *ui);
int  xui_text_w(XUi *ui, const char *utf8);
int  xui_font_h(XUi *ui);                          /* 字体行高 */
int  xui_font_ascent(XUi *ui);
void xui_draw_text(XUi *ui, Drawable d, int x, int yTop, const char *utf8);
/* 在 (x,yTop) 画指定颜色文本,返回文本宽度 */
int  xui_draw_text_c(XUi *ui, Drawable d, int x, int yTop, const char *utf8, unsigned long pix);

#ifdef __cplusplus
}
#endif
#endif /* XUI_H */
