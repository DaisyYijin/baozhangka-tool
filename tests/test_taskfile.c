/* test_taskfile.c - 验证 examples/示例任务.csv 解析 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../core/import.h"
#include "../core/engine.h"
#include "../core/u8.h"

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    wchar_t path[512];
    u8_to_wcs("examples/示例任务.csv", path, 511);
    size_t len = 0;
    unsigned char *data = read_file_all(path, &len);
    if (!data) { printf("FAIL: read\n"); return 1; }

    Task t; task_init(&t);
    int n = task_import_csv_text(&t, (const char *)data, len, 0);
    free(data);
    if (n < 0) { printf("FAIL: parse\n"); return 1; }

    printf("导入 %d 步, loops=%d gap=%d jitter=%d cd=%d\n",
           n, t.loops, t.loopGap, t.jitter, t.startCountdown);

    char u8[256];
    for (int i = 0; i < t.count; i++) {
        Step *s = &t.steps[i];
        u8[0] = 0;
        if (s->text[0]) wcs_to_u8(s->text, u8, 255);
        printf("  #%-2d %-4ls x=%-4d y=%-4d w=%-4d h=%-4d n=%-3d gap=%-4d text=%-14s clr=%d db=%-5d da=%-4d\n",
               i + 1, act_type_name(s->type), s->x, s->y, s->w, s->h,
               s->count, s->interval, u8, s->clearFirst, s->delayBefore, s->delayAfter);
    }

    /* 断言 */
    int fail = 0;
    if (n != 11) { printf("FAIL: 预期11步\n"); fail++; }
    if (t.loops != 2 || t.loopGap != 500 || t.jitter != 50 || t.startCountdown != 3000) {
        printf("FAIL: 设置\n"); fail++;
    }
    if (t.count >= 5) {
        Step *inp = &t.steps[4];   /* 输入 */
        if (wcscmp(inp->text, L"你好,世界") != 0 || !inp->clearFirst) {
            printf("FAIL: 输入步骤\n"); fail++;
        }
    }
    if (t.count >= 9) {
        Step *wa = &t.steps[8];    /* 等待 */
        if (wa->type != ACT_WAIT || wa->delayBefore != 1000) { printf("FAIL: 等待\n"); fail++; }
    }
    if (t.count >= 10) {
        Step *sc = &t.steps[9];    /* 滚动 */
        if (sc->type != ACT_SCROLL || sc->scroll != -3) { printf("FAIL: 滚动\n"); fail++; }
    }
    if (t.count >= 11) {
        Step *dg = &t.steps[10];   /* 拖动 */
        if (dg->type != ACT_DRAG || dg->x2 != 500 || dg->y2 != 400) { printf("FAIL: 拖动\n"); fail++; }
    }
    printf(fail ? "*** 有失败 ***\n" : "全部通过\n");
    return fail ? 1 : 0;
}
