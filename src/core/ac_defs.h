/* ============================================================
 * ac_defs.h - 公共数据类型(平台无关)
 * 自动点击器 - 支持 Windows XP 及以上 / Linux x86 / Linux ARM
 * ============================================================ */
#ifndef AC_DEFS_H
#define AC_DEFS_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define AC_TEXT_MAX   512      /* 单条文本最大长度 */
#define AC_NOTE_MAX   256      /* 备注最大长度 */
#define AC_TASKNAME_MAX 32     /* 任务(TAB)名称最大长度 */
#define AC_MAX_KEYS   8        /* 组合键最多键数 */

/* ---- 动作类型 ---- */
enum {
    ACT_CLICK = 0,   /* 单击(左键) */
    ACT_DBLCLICK,    /* 双击 */
    ACT_MULTI,       /* 多击(次数/间隔可设) */
    ACT_RCLICK,      /* 右击 */
    ACT_MCLICK,      /* 中击 */
    ACT_TEXT,        /* 文本输入(剪贴板粘贴方式,支持中文) */
    ACT_KEY,         /* 按键/组合键,如 ctrl+s */
    ACT_WAIT,        /* 等待(时长=前延时) */
    ACT_SCROLL,      /* 滚轮(正数向上,负数向下) */
    ACT_DRAG,        /* 鼠标拖动(x,y)->(x2,y2) */
    ACT_JUMP,        /* 跳转到指定步骤 */
    ACT_WAITWIN,     /* 等待窗口出现(标题包含 text,超时=前延时) */
    ACT_CHECK,       /* 判断 (x,y) 颜色:满足→跳转(jumpTo/jumpTab),否则继续 */
    ACT_CALL,        /* 子流程调用:执行目标TAB后返回调用处下一步 */
    ACT_TYPE_COUNT_
};

/* 鼠标键 */
enum { BTN_LEFT = 0, BTN_RIGHT = 1, BTN_MIDDLE = 2 };

/* ---- 单个步骤 ---- */
typedef struct {
    int      type;                    /* 动作类型,见 ACT_xxx */
    int      x, y;                    /* 坐标:点击点/范围左上角/拖动起点 */
    int      x2, y2;                  /* 拖动终点 */
    int      w, h;                    /* 范围宽高(0=精确点,非0=区域内随机) */
    int      count;                    /* 多击次数 */
    int      interval;                 /* 多击间隔(毫秒) */
    wchar_t  text[AC_TEXT_MAX];       /* 输入文本 或 按键串 或 滚动说明 */
    int      delayBefore;             /* 步骤前延时(毫秒) */
    int      delayAfter;              /* 步骤后延时(毫秒) */
    int      clearFirst;              /* 输入前清空当前输入框(0/1) */
    int      scroll;                  /* 滚动量,正=向上 */
    int      jumpTo;                  /* 跳转/调用/判断:目标步骤序号(1 起) */
    int      jumpTab;                 /* 跳转/调用/判断:目标任务(0=当前,1~8=TAB) */
    int      ifColor;                 /* 判断:目标色 0xRRGGBB */
    int      ifTol;                   /* 判断:每通道容差(0~255) */
    wchar_t  note[AC_NOTE_MAX];       /* 备注 */
} Step;

/* ---- 任务(步骤列表+全局设置) ---- */
typedef struct {
    Step    *steps;
    int      count, cap;
    int      loops;            /* 循环次数(0=无限) */
    int      loopGap;          /* 每轮之间的间隔(毫秒) */
    int      jitter;           /* 延时随机抖动上限(毫秒) */
    int      startCountdown;   /* 点击开始后的倒计时(毫秒) */
    int      loopsFromExcel;   /* 勾选:循环次数自动=导入 Excel 的行数 */
    wchar_t  name[AC_TASKNAME_MAX];  /* TAB 显示名(空=默认 步骤N,双击TAB可改名) */
    /* 数据源:每行整行文本(各列以 	 分隔),输入文本中的
       {行}=选定列,{列名}/{列N}=任意列,逐轮替换 */
    wchar_t **dataRows;
    int      dataRowCount;
    int      dataSelCol;              /* {行} 使用的列索引(0 起) */
    wchar_t (*dataColNames)[32];      /* 列名表(导入时记录表头) */
    int      dataColN;
} Task;

/* ---- 平台抽象层:引擎通过函数指针调用各平台实现 ---- */
typedef struct {
    void         (*mouse_move)(int x, int y);
    void         (*mouse_down)(int btn);          /* btn: BTN_xxx */
    void         (*mouse_up)(int btn);
    void         (*mouse_scroll)(int amount);     /* 正=向上 */
    void         (*key_combo)(const int *vks, int n); /* 依次按下,逆序释放 */
    void         (*text_paste)(const wchar_t *text);  /* 剪贴板+Ctrl+V(支持中文) */
    void         (*sleep_ms)(int ms);             /* 可中断睡眠(分片查 stop) */
    uint32_t     (*rand)(void);                   /* 随机数 */
    int          (*get_pixel)(int x, int y);      /* 屏幕取色 0xRRGGBB,失败 -1;NULL=不支持 */
    int          (*find_window)(const wchar_t *titleContains); /* 标题包含返回1;NULL=不支持(视为1) */
    volatile int *stop;                           /* 停止标志(非0=请求停止) */
} Platform;

/* 动作类型中文名,如 L"单击" */
const wchar_t *act_type_name(int type);
/* 由中文名/英文名解析动作类型,失败返回 -1 */
int act_type_from_name(const wchar_t *name);

/* ---- 任务簿:多个独立任务(主界面 TAB) ---- */
#define MAX_TASKS 8

typedef struct {
    Task tasks[MAX_TASKS];
    int  count;                      /* = MAX_TASKS */
} TaskBook;

#ifdef __cplusplus
}
#endif
#endif /* AC_DEFS_H */
