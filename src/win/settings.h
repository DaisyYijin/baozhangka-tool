/* settings.h - 应用设置集中管理(主题色/快捷按钮/预留扩展) */
#ifndef AC_SETTINGS_H
#define AC_SETTINGS_H

#include <windows.h>

#ifdef __cplusplus
extern "C" {
#endif

/* 启动时加载 / 变更时保存(写 settings.ini) */
void settings_load(void);
void settings_save(void);

/* 主题色(界面主色调;默认 RGB(0,0x99,0xFF)) */
COLORREF settings_theme_color(void);
COLORREF ThemeColor(void);   /* 兼容别名:界面原 QQ_BLUE 引用点 */
int settings_dialog(HWND owner);   /* 设置对话框(模态);返回1=有变更已应用 */
void settings_set_theme_color(COLORREF c);      /* 保存并即时生效 */
const COLORREF *settings_theme_presets(int *n); /* 预设色板(当前 8 色) */

/* 悬浮窗快捷键(可配置,默认 F6/F7/Ctrl+F12) */
int settings_float_hotkey(void);       /* 返回 VK_xx */
int settings_pause_hotkey(void);       /* 返回 VK_xx */
int settings_stop_hotkey(void);        /* 返回 VK_xx(修饰固定 Ctrl) */
void settings_set_hotkeys(int floatVk, int pauseVk, int stopVk);

/* 设置对话框结束后取所选快捷键(dlg_settings.c 内部) */
int settings_dlg_float_hotkey(void);
int settings_dlg_pause_hotkey(void);
int settings_dlg_stop_hotkey(void);

/* ---- 预留扩展:后续设置项在此追加接口 ---- */

#ifdef __cplusplus
}
#endif
#endif /* AC_SETTINGS_H */
