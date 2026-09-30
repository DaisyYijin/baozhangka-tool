/* ============================================================
 * engine.c - 执行引擎 + 任务管理 + 动作类型表
 * ============================================================ */
/* 宽字符不区分大小写比较:Windows CRT 与 POSIX 命名不同 */
#ifdef _WIN32
#define AC_WCS_NICMP _wcsnicmp
#else
#define AC_WCS_NICMP wcsncasecmp
#endif
#include "engine.h"
#include "ac_keys.h"
#include <stdlib.h>
#include <string.h>

/* ---------------- 动作类型表 ---------------- */

static const struct { const wchar_t *cn; const wchar_t *en; } ACT_NAMES[] = {
    { L"单击",   L"click" },
    { L"双击",   L"double" },
    { L"多击",   L"multi" },
    { L"右击",   L"rclick" },
    { L"中击",   L"mclick" },
    { L"输入",   L"text" },
    { L"按键",   L"key" },
    { L"等待",   L"wait" },
    { L"滚动",   L"scroll" },
    { L"拖动",   L"drag" },
    { L"跳转",   L"jump" },
};

const wchar_t *act_type_name(int type)
{
    if (type < 0 || type >= ACT_TYPE_COUNT_) return L"?";
    return ACT_NAMES[type].cn;
}

static int wci_eq(const wchar_t *a, const wchar_t *b)
{
    while (*a && *b) {
        wchar_t ca = *a, cb = *b;
        if (ca >= L'A' && ca <= L'Z') ca += 32;
        if (cb >= L'A' && cb <= L'Z') cb += 32;
        if (ca != cb) return 0;
        a++; b++;
    }
    return *a == 0 && *b == 0;
}

int act_type_from_name(const wchar_t *name)
{
    if (!name || !name[0]) return -1;
    /* 中文别名(旧任务文件中的"范围"兼容映射为单击) */
    static const struct { const wchar_t *alias; int type; } CN_ALIAS[] = {
        { L"单击", ACT_CLICK },   { L"左键单击", ACT_CLICK },
        { L"左击", ACT_CLICK },
        { L"双击", ACT_DBLCLICK },
        { L"多击", ACT_MULTI },   { L"连击", ACT_MULTI },
        { L"右击", ACT_RCLICK },  { L"右键单击", ACT_RCLICK },
        { L"右键", ACT_RCLICK },
        { L"中击", ACT_MCLICK },  { L"中键单击", ACT_MCLICK },
        { L"中键", ACT_MCLICK },
        { L"范围", ACT_CLICK },   { L"范围点击", ACT_CLICK },
        { L"随机点击", ACT_CLICK },
        { L"输入", ACT_TEXT },    { L"文本", ACT_TEXT },
        { L"文本输入", ACT_TEXT },
        { L"按键", ACT_KEY },     { L"组合键", ACT_KEY },
        { L"等待", ACT_WAIT },    { L"延时", ACT_WAIT },
        { L"滚动", ACT_SCROLL },  { L"滚轮", ACT_SCROLL },
        { L"拖动", ACT_DRAG },    { L"拖拽", ACT_DRAG },
        { L"跳转", ACT_JUMP },    { L"转到", ACT_JUMP },
    };
    for (int i = 0; i < (int)(sizeof(CN_ALIAS) / sizeof(CN_ALIAS[0])); i++)
        if (wci_eq(name, CN_ALIAS[i].alias)) return CN_ALIAS[i].type;

    /* 英文名 */
    for (int i = 0; i < ACT_TYPE_COUNT_; i++)
        if (wci_eq(name, ACT_NAMES[i].en)) return i;
    return -1;
}

/* ---------------- 任务管理 ---------------- */

void task_init(Task *t)
{
    memset(t, 0, sizeof(*t));
    t->loops = 1;
}

void task_free(Task *t)
{
    free(t->steps);
    if (t->dataRows) {
        for (int i = 0; i < t->dataRowCount; i++) free(t->dataRows[i]);
        free(t->dataRows);
        t->dataRows = NULL;
        t->dataRowCount = 0;
    }
    memset(t, 0, sizeof(*t));
}

int task_add(Task *t, const Step *s)
{
    if (t->count == t->cap) {
        int nc = t->cap ? t->cap * 2 : 64;
        Step *ns = (Step *)realloc(t->steps, (size_t)nc * sizeof(Step));
        if (!ns) return -1;
        t->steps = ns;
        t->cap = nc;
    }
    t->steps[t->count] = *s;
    return t->count++;
}

void task_remove(Task *t, int index)
{
    if (index < 0 || index >= t->count) return;
    memmove(&t->steps[index], &t->steps[index + 1],
            (size_t)(t->count - index - 1) * sizeof(Step));
    t->count--;
}

void task_move(Task *t, int index, int delta)
{
    int j = index + delta;
    if (index < 0 || index >= t->count) return;
    if (j < 0 || j >= t->count) return;
    Step tmp = t->steps[index];
    t->steps[index] = t->steps[j];
    t->steps[j] = tmp;
}

void task_move_to(Task *t, int src, int dst)
{
    if (!t || !t->steps) return;
    if (src < 0 || src >= t->count) return;
    if (dst < 0 || dst > t->count) return;
    if (dst == src || dst == src + 1) return;   /* 位置不变 */
    Step tmp = t->steps[src];
    if (dst > src) {
        memmove(&t->steps[src], &t->steps[src + 1],
                (size_t)(dst - src - 1) * sizeof(Step));
        t->steps[dst - 1] = tmp;
    } else {
        memmove(&t->steps[dst + 1], &t->steps[dst],
                (size_t)(src - dst) * sizeof(Step));
        t->steps[dst] = tmp;
    }
}

void task_clear(Task *t)
{
    t->count = 0;
}

/* ---------------- 执行引擎 ---------------- */

/* 可中断延时:返回 1 表示被停止 */
static int esleep(const Platform *p, int ms)
{
    if (ms <= 0) return 0;
    p->sleep_ms(ms);
    return *(p->stop) != 0;
}

static int jitter_ms(const Platform *p, int jitter)
{
    if (jitter <= 0) return 0;
    return (int)(p->rand() % (uint32_t)jitter);
}

static void do_click(const Platform *p, const Step *s, int btn)
{
    p->mouse_move(s->x, s->y);

    int count = s->count;
    int gap = s->interval;
    if (s->type == ACT_CLICK || s->type == ACT_RCLICK || s->type == ACT_MCLICK)
        count = 1;                    /* 单击类:无论存了什么次数都只点一下 */
    if (s->type == ACT_DBLCLICK) {
        count = 2;                    /* 双击固定两下 */
        if (gap < 0) gap = 30;
    }
    if (count <= 0) count = 1;
    if (gap < 0) gap = 0;

    for (int i = 0; i < count; i++) {
        p->mouse_down(btn);
        p->mouse_up(btn);
        if (i + 1 < count && gap > 0) {
            if (esleep(p, gap)) return;
        }
    }
}

static void do_drag(const Platform *p, const Step *s)
{
    p->mouse_move(s->x, s->y);
    p->mouse_down(BTN_LEFT);
    /* 平滑移动,分 12 步 */
    const int N = 12;
    for (int i = 1; i <= N; i++) {
        int nx = s->x + (s->x2 - s->x) * i / N;
        int ny = s->y + (s->y2 - s->y) * i / N;
        p->mouse_move(nx, ny);
        p->sleep_ms(8);
    }
    p->mouse_up(BTN_LEFT);
}

/* 把文本中的 {行} / {row} 替换为当前轮次对应的数据行 */
static void expand_text(const Task *t, int loop, const wchar_t *src,
                        wchar_t *out, int cap)
{
    int oi = 0;
    if (!t || t->dataRowCount <= 0 || !src) {
        wcsncpy(out, src ? src : L"", cap - 1);
        out[cap - 1] = 0;
        return;
    }
    const wchar_t *row = t->dataRows[(loop - 1) % t->dataRowCount];

    for (int i = 0; src[i] && oi < cap - 1; ) {
        if (src[i] == L'{' &&
            (wcsncmp(src + i, L"{行}", 3) == 0 || AC_WCS_NICMP(src + i, L"{row}", 5) == 0)) {
            int skip = (src[i + 1] == L'行') ? 3 : 5;      /* {行} 或 {row} */
            for (const wchar_t *p = row; *p && oi < cap - 1; p++)
                out[oi++] = *p;
            i += skip;
        } else {
            out[oi++] = src[i++];
        }
    }
    out[oi] = 0;
}

static void do_text(const Task *t, const Platform *p, const Step *s, int loop)
{
    if (s->clearFirst) {
        int cbs[2] = { ACK_LCTRL, ACK_CHAR('A') };
        p->key_combo(cbs, 2);                       /* 全选 */
        int del[1] = { ACK_BACKSPACE };
        p->key_combo(del, 1);                       /* 删除 */
        if (esleep(p, 30)) return;
    }
    if (s->text[0]) {
        wchar_t expanded[AC_TEXT_MAX * 2];
        expand_text(t, loop, s->text, expanded, AC_TEXT_MAX * 2);
        p->text_paste(expanded);
    }
}

int engine_run(TaskBook *tb, int startTab, const Platform *p,
               void (*progressCb)(int loop, int stepIndex, void *ud), void *ud)
{
    if (!tb || !p) return ENGINE_DONE;
    if (startTab < 0 || startTab >= MAX_TASKS) startTab = 0;

    Task *base = &tb->tasks[startTab];   /* 启动任务:轮数/间隔/倒计时以它为准 */
    Task *cur = base;                    /* 当前执行任务(跨TAB跳转后切换) */

    /* 开始倒计时 */
    if (base->startCountdown > 0) {
        if (esleep(p, base->startCountdown)) return ENGINE_STOP;
    }

    int loop = 0;
    int jumps = 0;                       /* 单轮跳转计数(防互相指向死循环) */
    for (;;) {
        loop++;
        jumps = 0;
        cur = base;                      /* 每轮从启动任务第1步开始 */
        for (int i = 0; i < cur->count; i++) {
            Step *s = &cur->steps[i];
            if (*(p->stop)) return ENGINE_STOP;
            if (progressCb) progressCb(loop, i, ud);

            /* 步骤前延时(等待类型以此为时长) */
            if (s->type == ACT_WAIT) {
                if (esleep(p, s->delayBefore + jitter_ms(p, cur->jitter))) return ENGINE_STOP;
                continue;
            }
            if (esleep(p, s->delayBefore + jitter_ms(p, cur->jitter))) return ENGINE_STOP;

            switch (s->type) {
            case ACT_CLICK:
                do_click(p, s, BTN_LEFT);
                break;
            case ACT_DBLCLICK:
                do_click(p, s, BTN_LEFT);
                break;
            case ACT_MULTI:
                do_click(p, s, BTN_LEFT);
                break;
            case ACT_RCLICK:
                do_click(p, s, BTN_RIGHT);
                break;
            case ACT_MCLICK:
                do_click(p, s, BTN_MIDDLE);
                break;
            case ACT_TEXT:
                do_text(cur, p, s, loop);
                break;
            case ACT_KEY: {
                int vks[AC_MAX_KEYS], n = 0;
                if (key_parse(s->text, vks, &n) == 0)
                    p->key_combo(vks, n);
                break;
            }
            case ACT_SCROLL:
                p->mouse_scroll(s->scroll);
                break;
            case ACT_DRAG:
                do_drag(p, s);
                break;
            case ACT_JUMP:
                /* 跳转到第N步(N为界面序号):i 置为 N-2,经 for 的 i++ 后
                   落在 0-based N-1。跨TAB时同时切换执行任务。
                   单轮跳转超上限视为循环配置错误,停止本轮(整体结束)。 */
                if (++jumps > 10000) return ENGINE_DONE;
                if (s->jumpTab >= 1 && s->jumpTab <= MAX_TASKS &&
                    tb->tasks[s->jumpTab - 1].count > 0 &&
                    s->jumpTo >= 1 && s->jumpTo <= tb->tasks[s->jumpTab - 1].count) {
                    cur = &tb->tasks[s->jumpTab - 1];
                    i = s->jumpTo - 2;
                } else if (s->jumpTo >= 1 && s->jumpTo <= cur->count) {
                    i = s->jumpTo - 2;
                }
                break;
            default:
                break;
            }

            if (esleep(p, s->delayAfter + jitter_ms(p, cur->jitter))) return ENGINE_STOP;
        }

        if (base->loops > 0 && loop >= base->loops) break;   /* 指定轮数(按启动任务) */
        if (base->loopGap > 0) {
            if (esleep(p, base->loopGap)) return ENGINE_STOP;
        }
    }
    return ENGINE_DONE;
}

/* ---------------- 简单 LCG 随机数(平台默认实现可用) ---------------- */

static uint32_t lcg_state = 0;

uint32_t ac_lcg_rand(void)
{
    if (!lcg_state) lcg_state = (uint32_t)(ptrdiff_t)&lcg_state | 1u;
    lcg_state = lcg_state * 1664525u + 1013904223u;
    return lcg_state >> 8;
}

void ac_srand(uint32_t seed)
{
    lcg_state = seed ? seed : 1u;
}
