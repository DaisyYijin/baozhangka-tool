/* lsettings.c - Linux 版设置持久化(纯 stdio 轻量 ini)
   格式:每行 key=value;程序目录(exe 旁) linux_settings.ini */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "lsettings.h"

/* ---- 运行状态(默认值) ---- */
static unsigned long g_theme = 0x0099FFUL;
static unsigned long g_hkKs[3]  = { 0xFFC3UL, 0xFFC4UL, 0xFFC9UL };  /* F6/F7/F12 */
static int           g_hkMod[3] = { 0, 0, LS_MOD_CTRL };
static int g_fltX = -1, g_fltY = -1;

static char g_iniPath[512];

static void build_path(void)
{
    if (g_iniPath[0]) return;
    ssize_t n = readlink("/proc/self/exe", g_iniPath, sizeof(g_iniPath) - 32);
    if (n <= 0) {
        getcwd(g_iniPath, sizeof(g_iniPath) - 32);
        n = (ssize_t)strlen(g_iniPath);
    }
    char *slash = strrchr(g_iniPath, '/');
    if (slash) slash[1] = 0;
    else { g_iniPath[0] = '.'; g_iniPath[1] = '/'; g_iniPath[2] = 0; n = 2; }
    (void)n;
    strcat(g_iniPath, "linux_settings.ini");
}

void ls_load(void)
{
    build_path();
    FILE *f = fopen(g_iniPath, "r");
    if (!f) return;
    char line[256];
    while (fgets(line, sizeof(line), f)) {
        char key[64];
        long v;
        if (sscanf(line, "%63[^=]=%ld", key, &v) != 2) continue;
        if (!strcmp(key, "theme"))        g_theme = (unsigned long)v & 0xFFFFFF;
        else if (!strcmp(key, "startKs"))   g_hkKs[0]  = (unsigned long)v;
        else if (!strcmp(key, "startMod"))  g_hkMod[0] = (int)v;
        else if (!strcmp(key, "pauseKs"))   g_hkKs[1]  = (unsigned long)v;
        else if (!strcmp(key, "pauseMod"))  g_hkMod[1] = (int)v;
        else if (!strcmp(key, "stopKs"))    g_hkKs[2]  = (unsigned long)v;
        else if (!strcmp(key, "stopMod"))   g_hkMod[2] = (int)v;
        else if (!strcmp(key, "floatX"))    g_fltX = (int)v;
        else if (!strcmp(key, "floatY"))    g_fltY = (int)v;
    }
    fclose(f);
}

void ls_save(void)
{
    build_path();
    FILE *f = fopen(g_iniPath, "w");
    if (!f) return;
    fprintf(f, "theme=%lu\n", g_theme);
    fprintf(f, "startKs=%lu\nstartMod=%d\n", g_hkKs[0], g_hkMod[0]);
    fprintf(f, "pauseKs=%lu\npauseMod=%d\n", g_hkKs[1], g_hkMod[1]);
    fprintf(f, "stopKs=%lu\nstopMod=%d\n",  g_hkKs[2], g_hkMod[2]);
    if (g_fltX >= 0 && g_fltY >= 0)
        fprintf(f, "floatX=%d\nfloatY=%d\n", g_fltX, g_fltY);
    fclose(f);
}

unsigned long ls_theme(void) { return g_theme; }
void ls_set_theme(unsigned long rgb) { g_theme = rgb & 0xFFFFFF; }

unsigned long ls_hot_ks(int which)  { return (which >= 0 && which < 3) ? g_hkKs[which] : 0; }
int           ls_hot_mod(int which) { return (which >= 0 && which < 3) ? g_hkMod[which] : 0; }

void ls_set_hotkeys(unsigned long ks0, int mod0,
                    unsigned long ks1, int mod1,
                    unsigned long ks2, int mod2)
{
    g_hkKs[0] = ks0; g_hkMod[0] = mod0;
    g_hkKs[1] = ks1; g_hkMod[1] = mod1;
    g_hkKs[2] = ks2; g_hkMod[2] = mod2;
}

void ls_get_float_pos(int *x, int *y) { *x = g_fltX; *y = g_fltY; }
void ls_set_float_pos(int x, int y)   { g_fltX = x; g_fltY = y; }
