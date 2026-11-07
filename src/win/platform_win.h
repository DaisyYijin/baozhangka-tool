/* platform_win.h - Windows 平台层导出 */
#ifndef AC_PLATFORM_WIN_H
#define AC_PLATFORM_WIN_H

#include "ac_defs.h"

#ifdef __cplusplus
extern "C" {
#endif

Platform *win_platform(void);
extern volatile int g_stop_flag;      /* 置 1 停止执行 */
char *win_gbk_to_utf8(const char *raw, size_t rawLen); /* CSV 编码回退 */

/* 区域文本识别(轻量模板匹配:数字/字母/常用符号) */
int win_ocr_region(int x, int y, int w, int h, wchar_t *out, int cap);

/* 找图:屏幕区域灰度图(0-255);w/h<=0=到屏幕右下;返回 malloc(w*h) */
unsigned char *win_grab_gray(int x, int y, int w, int h, int *ow, int *oh);

#ifdef __cplusplus
}
#endif
#endif
