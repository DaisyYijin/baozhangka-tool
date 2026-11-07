/* ============================================================
 * platform_x11.h - Linux 平台层导出(X11/XTest 输入合成)
 * 剪贴板由 GUI 主线程的 selection 通道实现(main.c)
 * ============================================================ */
#ifndef AC_PLATFORM_X11_H
#define AC_PLATFORM_X11_H

#include "ac_defs.h"

#ifdef __cplusplus
extern "C" {
#endif

Platform *x11_platform(void);
extern volatile int g_stop_flag;

/* 找图:屏幕区域灰度图(0-255);w/h<=0=到屏幕右下;返回 malloc(w*h) */
unsigned char *x_grab_gray(int x, int y, int w, int h, int *ow, int *oh);

/* 由 GUI 侧(main.c)实现:执行线程把文本交给主线程写入 X11 selection,
   阻塞至设置完成(超时约 1s)。返回 1=成功 */
int ac_x11_clipboard_set(const char *utf8);

#ifdef __cplusplus
}
#endif
#endif /* AC_PLATFORM_X11_H */
