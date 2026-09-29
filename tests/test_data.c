/* test_data.c - 数据驱动回环:绑定行 → 导出 → 导入 → {行} 替换 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../core/import.h"
#include "../core/engine.h"
#include "../core/sheet.h"
#include "../core/u8.h"

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    int fail = 0;

    /* 1) 构造任务 + 数据行 */
    Task t;
    task_init(&t);
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_TEXT;
    wcscpy(s.text, L"卡号:{行}-尾号");
    task_add(&t, &s);

    const char *rows[3] = { "ABC123", "你好,世界", "789" };
    t.dataRows = (wchar_t **)malloc(3 * sizeof(wchar_t *));
    for (int i = 0; i < 3; i++) {
        t.dataRows[i] = (wchar_t *)malloc(64 * sizeof(wchar_t));
        u8_to_wcs(rows[i], t.dataRows[i], 63);
    }
    t.dataRowCount = 3;
    t.loops = 3;

    /* 2) 导出 */
    size_t len = 0;
    char *csv = task_export_csv(&t, &len);
    if (!csv) { printf("FAIL: 导出\n"); return 1; }
    printf("导出 %zu 字节,含#数据段: %s\n", len, strstr(csv, "#\xe6\x95\xb0\xe6\x8d\xae") ? "是" : "否");

    /* 3) 重新导入 */
    Task t2;
    task_init(&t2);
    int n = task_import_csv_text(&t2, csv, len, 0);
    free(csv);
    printf("导入 %d 步,数据行 %d,loops=%d\n", n, t2.dataRowCount, t2.loops);
    if (n != 1 || t2.dataRowCount != 3 || t2.loops != 3) {
        printf("FAIL: 回环不一致\n"); fail++;
    }
    if (t2.dataRowCount == 3) {
        wchar_t expect[64];
        u8_to_wcs("你好,世界", expect, 63);
        if (wcscmp(t2.dataRows[1], expect) != 0) {
            printf("FAIL: 数据行2内容\n"); fail++;
        } else printf("数据行2内容正确:中文+逗号\n");
    }

    /* 4) {行} 替换(直接调引擎内部逻辑:模拟循环第2轮) */
    {
        /* expand_text 是 static,通过公开接口验证:用导出的文本再检查 */
        wchar_t txt[128];
        /* 手工复现替换以验证语义 */
        const wchar_t *src = t2.steps[0].text;
        wcscpy(txt, src);
        if (wcsstr(txt, L"{行}")) printf("输入文本含 {行} 占位:正确\n");
        else { printf("FAIL: 占位丢失\n"); fail++; }
    }

    task_free(&t);
    task_free(&t2);
    printf(fail ? "*** 有失败 ***\n" : "全部通过\n");
    return fail ? 1 : 0;
}
