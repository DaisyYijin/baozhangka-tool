/* ============================================================
 * platform_x11.h - Linux 平台层导出(X11/XTest + GTK剪贴板)
 * ============================================================ */
#ifndef AC_PLATFORM_X11_H
#define AC_PLATFORM_X11_H

#include "ac_defs.h"

#ifdef __cplusplus
extern "C" {
#endif

Platform *x11_platform(void);
extern volatile int g_stop_flag;

/* 由 GTK 主循环周期调用:轮询 Ctrl+F12 全局停止热键 */
void x11_hotkey_poll(void);

/* GTK 剪贴板设置(线程安全,内部转主线程) */
int gtk_clipboard_set_text_sync(const char *utf8);

#ifdef __cplusplus
}
#endif
#endif
