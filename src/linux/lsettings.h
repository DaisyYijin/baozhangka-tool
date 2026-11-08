/* lsettings.h - Linux 版设置持久化(轻量 ini;程序目录 linux_settings.ini)
   与 Windows settings.ini 对齐的键:theme/hotkeys/floatpos */
#ifndef AC_LSETTINGS_H
#define AC_LSETTINGS_H

/* 修饰位(与 X11 mask 对齐使用) */
#define LS_MOD_SHIFT 1
#define LS_MOD_CTRL  2
#define LS_MOD_ALT   4

/* 热键索引 */
#define LS_HK_START 0
#define LS_HK_PAUSE 1
#define LS_HK_STOP  2

void          ls_load(void);
void          ls_save(void);

unsigned long ls_theme(void);            /* 0xRRGGBB,默认 0x0099FF */
void          ls_set_theme(unsigned long rgb);   /* 即生效;save 由调用方或统一时机 */

unsigned long ls_hot_ks(int which);      /* KeySym 值 */
int           ls_hot_mod(int which);     /* LS_MOD_* 组合位 */
void          ls_set_hotkeys(unsigned long ks0, int mod0,
                             unsigned long ks1, int mod1,
                             unsigned long ks2, int mod2);

void          ls_get_float_pos(int *x, int *y);   /* 未保存=-1 */
void          ls_set_float_pos(int x, int y);

#endif /* AC_LSETTINGS_H */
