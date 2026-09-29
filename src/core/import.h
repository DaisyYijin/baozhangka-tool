/* ============================================================
 * import.h - Excel(xlsx/csv)导入导出、任务文件读写
 *
 * 统一列格式(第一行为表头,顺序不限,可只填部分列):
 *   动作 | X | Y | 宽 | 高 | 次数 | 间隔毫秒 | 文本或按键 |
 *   前延时毫秒 | 后延时毫秒 | 输入前清空 | 启用 | 备注
 * 任务文件即同格式 CSV(UTF-8 BOM),可用 Excel 直接编辑。
 * ============================================================ */
#ifndef AC_IMPORT_H
#define AC_IMPORT_H

#include "ac_defs.h"
#include "sheet.h"

#ifdef __cplusplus
extern "C" {
#endif

/* 表格 -> 步骤列表(自动识别表头)。
   返回导入的步骤数;<0 失败。skipHeader 由本函数判断,
   append=0 时先清空原列表。 */
int task_import_sheet(Task *t, const Sheet *s, int append);

/* "Excel 导入输入":把指定列(0 起,列内容为文本)每行生成一个输入步骤 */
int task_import_text_column(Task *t, const Sheet *s, int col, int append);

/* 任务 -> CSV 文本(UTF-8 BOM,malloc,调用方 free)。
   含全局设置行(以 #设置 开头)。 */
char *task_export_csv(const Task *t, size_t *outLen);

/* CSV 文本 -> 任务(与 task_export_csv 互逆,append=0 清空) */
int task_import_csv_text(Task *t, const char *utf8Text, size_t len, int append);
/* 便捷:读取文件到内存(二进制)。返回 malloc 缓冲区。 */
unsigned char *read_file_all(const wchar_t *path, size_t *outLen);

/* ---- 任务簿(多 TAB)导入导出 ---- */

/* 解析含 #任务,N 分段的任务文件到任务簿(替换模式,恢复设置)。
   无 #任务 段 → 全部导入到任务 cur。返回导入总步骤数,-1 失败。 */
int taskbook_import_csv(TaskBook *tb, const char *utf8Text, size_t len);

/* 将整本任务簿导出为 CSV(含 #设置/#任务 分段) */
char *taskbook_export_csv(const TaskBook *tb, size_t *outLen);

/* 单任务版(保留:测试与简易用途) */
int task_import_csv_text(Task *t, const char *utf8Text, size_t len, int append);
char *task_export_csv(const Task *t, size_t *outLen);

#ifdef __cplusplus
}
#endif
#endif
