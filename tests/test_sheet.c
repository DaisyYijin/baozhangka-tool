/* test_sheet.c - 解析链路测试:xlsx / csv(GBK) / 任务导出导入回环 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../core/sheet.h"
#include "../core/import.h"
#include "../core/engine.h"
#include "../core/ac_keys.h"
#include "../core/u8.h"

#ifdef _WIN32
extern char *win_gbk_to_utf8(const char *raw, size_t rawLen);
#define GBK_FALLBACK win_gbk_to_utf8
#else
#define GBK_FALLBACK NULL
#endif

static void print_sheet(const Sheet *s)
{
    printf("rows=%d cols=%d\n", s->rows, s->cols);
    for (int r = 0; r < s->rows; r++) {
        printf("  [row %d] ", r + 1);
        for (int c = 0; c < s->cols; c++) {
            const char *cell = (s->cells && s->cells[r]) ? s->cells[r][c] : NULL;
            if (cell) printf("`%s` | ", cell);
            else      printf("(空) | ");
        }
        printf("\n");
    }
}

static void print_task(const Task *t)
{
    printf("任务: %d 步, loops=%d gap=%d jitter=%d countdown=%d\n",
           t->count, t->loops, t->loopGap, t->jitter, t->startCountdown);
    for (int i = 0; i < t->count; i++) {
        Step *s = &t->steps[i];
        wchar_t text[128] = L"";
        wcsncpy(text, s->text, 127);
        printf("  #%d type=%ls x=%d y=%d w=%d h=%d n=%d gap=%d text=%ls clr=%d en=%d db=%d da=%d\n",
               i + 1, act_type_name(s->type), s->x, s->y, s->w, s->h,
               s->count, s->interval, text, s->clearFirst, s->enabled,
               s->delayBefore, s->delayAfter);
    }
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    int fail = 0;

    /* ---- 1) xlsx ---- */
    {
        size_t len = 0;
        unsigned char *data = read_file_all(L"examples/test.xlsx", &len);
        if (!data) { printf("FAIL: 无法读取 xlsx\n"); fail++; }
        else {
            Sheet s;
            int r = xlsx_parse(data, len, &s);
            if (r != 0) { printf("FAIL: xlsx_parse=%d\n", r); fail++; }
            else {
                printf("== xlsx 解析 ==\n");
                print_sheet(&s);
                Task t; task_init(&t);
                int n = task_import_sheet(&t, &s, 0);
                printf("导入 %d 步\n", n);
                print_task(&t);
                /* 行1:单击(x=200, y=0) 行2:单击(100,200,50,80)
                   行3/4:输入 文本在默认列序的次数/间隔位,仅验证类型
                   行5:动作名不识别,应跳过 */
                if (n != 4) { printf("FAIL: 预期 4 步\n"); fail++; }
                if (n >= 2) {
                    Step *a = &t.steps[1];
                    if (a->type != ACT_CLICK || a->x != 100 || a->y != 200 || a->w != 50 || a->h != 80) {
                        printf("FAIL: 单击步骤字段错误\n"); fail++;
                    }
                }
                if (n >= 4) {
                    Step *b = &t.steps[3];
                    if (b->type != ACT_TEXT) {
                        printf("FAIL: 输入步骤类型错误\n"); fail++;
                    }
                }
                task_free(&t);
                sheet_free(&s);
            }
            free(data);
        }
    }

    /* ---- 2) CSV (UTF-8 BOM) ---- */
    {
        const char *csv =
            "\xEF\xBB\xBF#设置,循环次数,3,循环间隔毫秒,500,随机抖动毫秒,50,开始倒计时毫秒,1000\r\n"
            "动作,X,Y,宽,高,次数,间隔毫秒,文本或按键,前延时毫秒,后延时毫秒,输入前清空,启用,备注\r\n"
            "单击,10,20,0,0,1,0,,0,100,是,是,普通点击\r\n"
            "双击,30,40,,,,,,0,100,,是,\r\n"
            "输入,0,0,,,,,\"你好,世界\",0,200,是,是,含逗号\r\n"
            "按键,0,0,,,,,ctrl+s,0,50,,是,\r\n"
            "等待,0,0,,,,,,1500,0,,是,等1.5秒\r\n";
        Task t; task_init(&t);
        int r = task_import_csv_text(&t, csv, strlen(csv), 0);
        printf("== CSV 导入 == %d 步\n", r);
        print_task(&t);
        if (r != 5) { printf("FAIL: 预期 5 步\n"); fail++; }
        if (t.loops != 3 || t.loopGap != 500 || t.jitter != 50 || t.startCountdown != 1000) {
            printf("FAIL: 设置行解析错误\n"); fail++;
        }
        if (t.count >= 3) {
            Step *s3 = &t.steps[2];   /* 输入 */
            if (wcscmp(s3->text, L"你好,世界") != 0 || !s3->clearFirst) {
                printf("FAIL: 输入步骤解析错误\n"); fail++;
            }
            Step *s5 = &t.steps[4];   /* 等待 */
            if (s5->delayBefore != 1500) { printf("FAIL: 等待时长解析错误\n"); fail++; }
        }

        /* ---- 3) 导出回环 ---- */
        size_t outLen = 0;
        char *csvOut = task_export_csv(&t, &outLen);
        if (!csvOut) { printf("FAIL: 导出失败\n"); fail++; }
        else {
            Task t2; task_init(&t2);
            int r2 = task_import_csv_text(&t2, csvOut, outLen, 0);
            if (r2 != t.count) { printf("FAIL: 回环步数不一致 %d != %d\n", r2, t.count); fail++; }
            else if (t2.count > 0) {
                for (int i = 0; i < t.count; i++) {
                    Step *a = &t.steps[i], *b = &t2.steps[i];
                    if (a->type != b->type || a->x != b->x || a->y != b->y ||
                        a->w != b->w || a->h != b->h || a->delayBefore != b->delayBefore ||
                        a->delayAfter != b->delayAfter || a->clearFirst != b->clearFirst ||
                        wcscmp(a->text, b->text) != 0) {
                        printf("FAIL: 回环第 %d 步不一致\n", i + 1); fail++;
                        break;
                    }
                }
            }
            printf("== 导出回环 == %d 步 %s\n", r2, r2 == t.count ? "一致" : "不一致");
            task_free(&t2);
        }
        free(csvOut);
        task_free(&t);
    }

    /* ---- 4) 按键解析 ---- */
    {
        printf("== 按键解析 ==\n");
        struct { const wchar_t *in; int ok; int first; } cases[] = {
            { L"ctrl+s",     1, ACK_LCTRL },
            { L"CTRL+S",     1, ACK_LCTRL },
            { L"win+r",      1, ACK_LWIN },
            { L"F5",         1, 150 + 4 },
            { L"ctrl+shift+esc", 1, ACK_LCTRL },
            { L"enter",      1, ACK_ENTER },
            { L"alt+F4",     1, ACK_LALT },
            { L"ctrl+",      0, 0 },
            { L"xyz",        0, 0 },
        };
        for (int i = 0; i < (int)(sizeof(cases) / sizeof(cases[0])); i++) {
            int vks[AC_MAX_KEYS], n = 0;
            int r = key_parse(cases[i].in, vks, &n);
            printf("  `%ls` -> %s n=%d", cases[i].in, r == 0 ? "OK" : "REJ", n);
            if (r == 0) printf(" k0=%d", vks[0]);
            printf("\n");
            if ((r == 0) != cases[i].ok) { printf("FAIL: `%ls`\n", cases[i].in); fail++; }
            else if (r == 0 && vks[0] != cases[i].first) { printf("FAIL first: `%ls`\n", cases[i].in); fail++; }
        }
    }

    printf("\n%s(%d 个失败)\n", fail ? "*** 存在失败 ***" : "全部通过", fail);
    return fail ? 1 : 0;
}
