/* ============================================================
 * engine.h - 自动执行引擎(平台无关)
 * ============================================================ */
#ifndef AC_ENGINE_H
#define AC_ENGINE_H

#include "ac_defs.h"

#ifdef __cplusplus
extern "C" {
#endif

/* 返回码 */
#define ENGINE_DONE   0    /* 正常完成 */
#define ENGINE_STOP   1    /* 被停止(Ctrl+F12) */

/* 执行任务簿中 startTab 任务的整轮循环。
   跳转步骤可指定其他 TAB(jumpTab):切换到目标任务从目标步继续,
   目标序列执行完即本轮结束,下一轮仍从 startTab 开始。
   p->stop 由 UI 线程置位以停止。
   progressCb 可为 NULL:每步开始前回调(轮次从1开始,步骤索引为当前任务内) */
int engine_run(TaskBook *tb, int startTab, const Platform *p,
               void (*progressCb)(int loop, int stepIndex, void *ud), void *ud);

/* 任务管理 */
void task_init(Task *t);
void task_free(Task *t);
int  task_add(Task *t, const Step *s);        /* 返回新步骤索引,-1 失败 */
void task_remove(Task *t, int index);
/* 按索引集合批量删除步骤(保持剩余顺序,索引无需有序);返回实际删除数 */
int task_remove_multi(Task *t, const int *indices, int n);
/* 批量启停用;返回受影响数 */
int task_set_disabled_multi(Task *t, const int *indices, int n, int on);
/* 连续段整体移动一格(delta=±1);越界返回 0 */
int task_move_block(Task *t, int lo, int hi, int delta);
/* 批量改延时(ms;which:1=前延时 2=后延时 3=两者) */
int task_set_delay_multi(Task *t, const int *indices, int n, int ms, int which);
void task_move(Task *t, int index, int delta); /* delta 上移/下移 */
void task_move_to(Task *t, int src, int dst);  /* 移到插入位 dst(0..count,列表拖拽用) */
void task_clear(Task *t);

/* 内置随机数(平台可直接用作 Platform.rand) */
uint32_t ac_lcg_rand(void);
void ac_srand(uint32_t seed);

/* 暂停/恢复:暂停时引擎在当前动作/延时边界挂起(不占CPU),恢复后继续。
   由 UI 线程调用;与 stop 同时置位时 stop 优先 */
void engine_pause(int on);
int  engine_paused(void);

#ifdef __cplusplus
}
#endif
#endif
