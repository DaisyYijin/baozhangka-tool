/* dlg_edit.h - 步骤编辑对话框 */
#ifndef AC_DLG_EDIT_H
#define AC_DLG_EDIT_H

#include <windows.h>
#include "ac_defs.h"

#ifdef __cplusplus
extern "C" {
#endif

/* 弹出步骤编辑对话框(模态小循环)。
   编辑 s 中的内容,确定返回 1 并写回 s,取消返回 0。 */
int edit_step_dialog(HWND owner, Step *s, int isNew);

/* 编辑窗打开期间,拖动屏幕标记实时更新坐标输入框。
   seq 为 0 起的步骤索引;仅当正在编辑该步骤时生效,返回 1。 */
int edit_dlg_live_coords(int seq, int x, int y);

/* 第一步:选择步骤类型。返回 ACT_xxx,取消返回 -1 */
int pick_step_type_dialog(HWND owner);

/* TAB 重命名:单行输入框。buf 传入当前名,确定返回 1 并写回新名 */
int rename_tab_dialog(HWND owner, const wchar_t *title, wchar_t *buf, int buflen);

#ifdef __cplusplus
}
#endif
#endif
