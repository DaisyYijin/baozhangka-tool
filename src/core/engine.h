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
void task_move(Task *t, int index, int delta); /* delta 上移/下移 */
void task_move_to(Task *t, int src, int dst);  /* 移到插入位 dst(0..count,列表拖拽用) */
void task_clear(Task *t);

/* 内置随机数(平台可直接用作 Platform.rand) */
uint32_t ac_lcg_rand(void);
void ac_srand(uint32_t seed);

#ifdef __cplusplus
}
#endif
#endif
