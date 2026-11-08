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

/* 全局快捷键(可配置,默认 F6/F7/Ctrl+F12;支持修饰键组合) */
int settings_float_hotkey(void);       /* 返回 VK_xx */
int settings_float_mod(void);          /* 返回 MOD_ 组合(0=无) */
int settings_pause_hotkey(void);
int settings_pause_mod(void);
int settings_stop_hotkey(void);
int settings_stop_mod(void);
void settings_set_hotkeys(int floatVk, int floatMod,
                          int pauseVk, int pauseMod,
                          int stopVk,  int stopMod);

/* 设置对话框结束后取所选快捷键(dlg_settings.c 内部) */
int settings_dlg_float_hotkey(void);
int settings_dlg_float_mod(void);
int settings_dlg_pause_hotkey(void);
int settings_dlg_pause_mod(void);
int settings_dlg_stop_hotkey(void);
int settings_dlg_stop_mod(void);

/* 悬浮窗位置记忆(未保存过返回 -1) */
void settings_get_float_pos(int *x, int *y);
void settings_set_float_pos(int x, int y);

/* ---- 预留扩展:后续设置项在此追加接口 ---- */

#ifdef __cplusplus
}
#endif
#endif /* AC_SETTINGS_H */
