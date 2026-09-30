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

#ifdef __cplusplus
}
#endif
#endif
