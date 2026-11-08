/* ============================================================
 * settings.c - 应用设置集中管理(主题色/快捷按钮/预留扩展)
 * 持久化:程序目录 settings.ini(Unicode 私有 API)
 * ============================================================ */
#include <windows.h>
#include <wchar.h>
#include <stdio.h>
#include "settings.h"

/* ---- 运行时状态 ---- */
static COLORREF g_themeColor = RGB(0x00, 0x99, 0xFF);   /* 默认主题蓝 */
static int g_floatHotkey = VK_F6;  /* 开始快捷键 */
static int g_floatMod    = 0;      /* 开始修饰(0=无) */
static int g_pauseHotkey = VK_F7;  /* 暂停/继续快捷键 */
static int g_pauseMod    = 0;
static int g_stopHotkey  = VK_F12; /* 停止快捷键 */
static int g_stopMod     = MOD_CONTROL;   /* 停止默认 Ctrl+ */
static int g_fltX = -1, g_fltY = -1;     /* 悬浮窗上次位置 */

static wchar_t g_iniPath[MAX_PATH];

/* 预设主题色板(8 色) */
static const COLORREF THEME_PRESETS[8] = {
    RGB(0x00,0x99,0xFF),   /* 天空蓝(默认) */
    RGB(0x2E,0x7D,0x32),   /* 森林绿 */
    RGB(0xE5,0x3E,0x3E),   /* 热情红 */
    RGB(0x8E,0x24,0xAA),   /* 优雅紫 */
    RGB(0xEF,0x6C,0x00),   /* 活力橙 */
    RGB(0x00,0x89,0x7B),   /* 青碧 */
    RGB(0x39,0x49,0xAB),   /* 靛蓝 */
    RGB(0x5D,0x40,0x37),   /* 咖啡棕 */
};

static void build_ini_path(void)
{
    if (g_iniPath[0]) return;
    GetModuleFileNameW(NULL, g_iniPath, MAX_PATH);
    wchar_t *slash = wcsrchr(g_iniPath, L'\\');
    if (slash) slash[1] = 0;
    wcscat(g_iniPath, L"settings.ini");
}

void settings_load(void)
{
    build_ini_path();
    wchar_t buf[64];
    GetPrivateProfileStringW(L"ui", L"theme", L"0099FF", buf, 32, g_iniPath);
    unsigned v = 0;
    if (swscanf(buf, L"%x", &v) == 1)
        g_themeColor = RGB((v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF);
    g_floatHotkey   = GetPrivateProfileIntW(L"hotkey", L"floatVk", VK_F6, g_iniPath);
    g_floatMod      = GetPrivateProfileIntW(L"hotkey", L"floatMod", 0, g_iniPath);
    g_pauseHotkey   = GetPrivateProfileIntW(L"hotkey", L"pauseVk", VK_F7, g_iniPath);
    g_pauseMod      = GetPrivateProfileIntW(L"hotkey", L"pauseMod", 0, g_iniPath);
    g_stopHotkey    = GetPrivateProfileIntW(L"hotkey", L"stopVk", VK_F12, g_iniPath);
    g_stopMod       = GetPrivateProfileIntW(L"hotkey", L"stopMod", MOD_CONTROL, g_iniPath);
    g_fltX          = GetPrivateProfileIntW(L"float", L"x", -1, g_iniPath);
    g_fltY          = GetPrivateProfileIntW(L"float", L"y", -1, g_iniPath);
}

void settings_save(void)
{
    build_ini_path();
    wchar_t buf[32];
    swprintf(buf, 32, L"%02X%02X%02X",
             (g_themeColor >> 16) & 0xFF, (g_themeColor >> 8) & 0xFF, g_themeColor & 0xFF);
    WritePrivateProfileStringW(L"ui", L"theme", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_floatHotkey);
    WritePrivateProfileStringW(L"hotkey", L"floatVk", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_floatMod);
    WritePrivateProfileStringW(L"hotkey", L"floatMod", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_pauseHotkey);
    WritePrivateProfileStringW(L"hotkey", L"pauseVk", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_pauseMod);
    WritePrivateProfileStringW(L"hotkey", L"pauseMod", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_stopHotkey);
    WritePrivateProfileStringW(L"hotkey", L"stopVk", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_stopMod);
    WritePrivateProfileStringW(L"hotkey", L"stopMod", buf, g_iniPath);
    if (g_fltX >= 0 && g_fltY >= 0) {   /* 悬浮窗位置(仅保存过才写) */
        swprintf(buf, 32, L"%d", g_fltX);
        WritePrivateProfileStringW(L"float", L"x", buf, g_iniPath);
        swprintf(buf, 32, L"%d", g_fltY);
        WritePrivateProfileStringW(L"float", L"y", buf, g_iniPath);
    }
}

COLORREF ThemeColor(void) { return g_themeColor; }

void settings_set_theme_color(COLORREF c)
{
    g_themeColor = c;
    settings_save();
}

void settings_get_float_pos(int *x, int *y) { *x = g_fltX; *y = g_fltY; }
void settings_set_float_pos(int x, int y)   { g_fltX = x; g_fltY = y; settings_save(); }

const COLORREF *settings_theme_presets(int *n)
{
    if (n) *n = 8;
    return THEME_PRESETS;
}

int settings_float_hotkey(void) { return g_floatHotkey; }
int settings_float_mod(void)    { return g_floatMod; }
int settings_pause_hotkey(void) { return g_pauseHotkey; }
int settings_pause_mod(void)    { return g_pauseMod; }
int settings_stop_hotkey(void)  { return g_stopHotkey; }
int settings_stop_mod(void)     { return g_stopMod; }

void settings_set_hotkeys(int floatVk, int floatMod,
                          int pauseVk, int pauseMod,
                          int stopVk,  int stopMod)
{
    if (floatVk) { g_floatHotkey = floatVk; g_floatMod = floatMod; }
    if (pauseVk) { g_pauseHotkey = pauseVk; g_pauseMod = pauseMod; }
    if (stopVk)  { g_stopHotkey  = stopVk;  g_stopMod  = stopMod; }
    settings_save();
}
