/* ============================================================
 * picker.h - 屏幕取点(单击取坐标,拖拽取范围)
 * ============================================================ */
#ifndef AC_PICKER_H
#define AC_PICKER_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    int ok;        /* 1=已取到 0=按Esc取消 */
    int x, y;      /* 坐标(点) 或 矩形左上角 */
    int w, h;      /* >0 时为框选出的范围 */
} PickResult;

/* 进入全屏取点模式,自带消息循环。返回 1=取到,0=取消。 */
int pick_screen_point(PickResult *r);

#ifdef __cplusplus
}
#endif
#endif
