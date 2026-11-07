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
static int g_showFloatBtn  = 1;    /* 侧栏「悬浮窗」快捷按钮 */
static int g_showQuickPick = 1;    /* 侧栏「取点」快捷按钮 */
static int g_floatHotkey = VK_F6;  /* 开始快捷键 */
static int g_pauseHotkey = VK_F7;  /* 暂停/继续快捷键 */
static int g_stopHotkey  = VK_F12; /* 停止快捷键(修饰固定 Ctrl) */

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
    g_showFloatBtn  = GetPrivateProfileIntW(L"quick", L"showFloatBtn", 1, g_iniPath);
    g_showQuickPick = GetPrivateProfileIntW(L"quick", L"showQuickPick", 1, g_iniPath);
    g_floatHotkey   = GetPrivateProfileIntW(L"hotkey", L"floatVk", VK_F6, g_iniPath);
    g_pauseHotkey   = GetPrivateProfileIntW(L"hotkey", L"pauseVk", VK_F7, g_iniPath);
    g_stopHotkey    = GetPrivateProfileIntW(L"hotkey", L"stopVk", VK_F12, g_iniPath);
}

void settings_save(void)
{
    build_ini_path();
    wchar_t buf[32];
    swprintf(buf, 32, L"%02X%02X%02X",
             (g_themeColor >> 16) & 0xFF, (g_themeColor >> 8) & 0xFF, g_themeColor & 0xFF);
    WritePrivateProfileStringW(L"ui", L"theme", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_showFloatBtn);
    WritePrivateProfileStringW(L"quick", L"showFloatBtn", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_showQuickPick);
    WritePrivateProfileStringW(L"quick", L"showQuickPick", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_floatHotkey);
    WritePrivateProfileStringW(L"hotkey", L"floatVk", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_pauseHotkey);
    WritePrivateProfileStringW(L"hotkey", L"pauseVk", buf, g_iniPath);
    swprintf(buf, 32, L"%d", g_stopHotkey);
    WritePrivateProfileStringW(L"hotkey", L"stopVk", buf, g_iniPath);
}

COLORREF ThemeColor(void) { return g_themeColor; }
int settings_show_float_btn(void)   { return g_showFloatBtn; }
int settings_show_quick_pick(void)  { return g_showQuickPick; }

void settings_set_theme_color(COLORREF c)
{
    g_themeColor = c;
    settings_save();
}
void settings_set_quick(int showFloatBtn, int showQuickPick)
{
    g_showFloatBtn = showFloatBtn;
    g_showQuickPick = showQuickPick;
    settings_save();
}

const COLORREF *settings_theme_presets(int *n)
{
    if (n) *n = 8;
    return THEME_PRESETS;
}

int settings_float_hotkey(void) { return g_floatHotkey; }
int settings_pause_hotkey(void) { return g_pauseHotkey; }
int settings_stop_hotkey(void)  { return g_stopHotkey; }

void settings_set_hotkeys(int floatVk, int pauseVk, int stopVk)
{
    if (floatVk) g_floatHotkey = floatVk;
    if (pauseVk) g_pauseHotkey = pauseVk;
    if (stopVk)  g_stopHotkey  = stopVk;
    settings_save();
}
