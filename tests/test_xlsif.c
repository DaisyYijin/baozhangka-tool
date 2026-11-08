/* test_xlsif.c - Excel单元格判断:读当前行指定列,按"值=>步骤"分支跳转,
   并验证轮次(=行迭代)继续推进 */
#include <stdio.h>
#include <wchar.h>
#include <stdlib.h>
#include <string.h>
#include "../core/import.h"
#include "../core/engine.h"
#include "../core/u8.h"

#ifndef _WIN32
#define _wcsdup wcsdup
#endif

static int g_log[128];
static int g_logN;
static volatile int g_stop = 0;

static void mm(int x, int y) { (void)y; if (g_logN < 128) g_log[g_logN++] = x; }
static void nop_down(int b) { (void)b; }
static void nop_up(int b) { (void)b; }
static void nop_scroll(int a) { (void)a; }
static void nop_combo(const int *v, int n) { (void)v; (void)n; }
static void nop_paste(const wchar_t *t) { (void)t; }
static void slp(int ms) { (void)ms; }
static uint32_t rnd(void) { return 0; }

static Platform mkp(void)
{
    Platform p;
    memset(&p, 0, sizeof(p));           /* 全指针清零(旧 test_jump 未清,勿学) */
    p.mouse_move = mm;
    p.mouse_down = nop_down;
    p.mouse_up = nop_up;
    p.mouse_scroll = nop_scroll;
    p.key_combo = nop_combo;
    p.text_paste = nop_paste;
    p.sleep_ms = slp;
    p.rand = rnd;
    p.stop = &g_stop;
    return p;
}

static Step click(int tag)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_CLICK;
    s.x = tag;
    return s;
}
static Step xlsif(const wchar_t *cond, int col1)
{
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_XLSIF;
    s.count = col1;                     /* 1 起列号;0={行}选定列 */
    wcsncpy(s.text, cond, AC_TEXT_MAX - 1);
    return s;
}

static void set_row(Task *t, int n)
{
    static const wchar_t *rows[] = {
        L"张三\t男\t25",
        L"李四\t女\t23",
        L"王五\t男\t31",
    };
    t->dataRows = (wchar_t **)calloc((size_t)n, sizeof(wchar_t *));
    t->dataRowCount = n;
    for (int i = 0; i < n; i++)
        t->dataRows[i] = _wcsdup(rows[i]);
}

#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    int fails = 0;
    Platform p = mkp();

    /* ---- 1) 男/女分支 + 行推进(显式列号=第2列) ---- */
    {
        TaskBook tb;
        memset(&tb, 0, sizeof(tb));
        Task *t = &tb.tasks[0];
        t->steps = (Step *)calloc(8, sizeof(Step));
        t->cap = 8;
        /* 1:判断(男=>3,女=>2)  2:女分支(20)  3:男分支(30)  4:公共尾(40) */
        t->steps[t->count++] = xlsif(L"男=>3,女=>2", 2);
        t->steps[t->count++] = click(20);
        t->steps[t->count++] = click(30);
        t->steps[t->count++] = click(40);
        set_row(t, 3);
        t->dataSelCol = 0;
        t->loops = 3;                    /* 三行,每行一轮 */

        g_logN = 0;
        int r = engine_run(&tb, 0, &p, NULL, NULL);
        CHECK(r == ENGINE_DONE, "应正常完成");
        /* 行1"男": 跳步骤3 → 30,40
           行2"女": 跳步骤2 → 20,30,40
           行3"男": 跳步骤3 → 30,40 */
        int exp[] = { 30, 40, 20, 30, 40, 30, 40 };
        int expN = 7;
        CHECK(g_logN == expN, "执行计数不符");
        int bad = 0;
        for (int i = 0; i < expN && i < g_logN; i++)
            if (g_log[i] != exp[i]) { bad = 1; break; }
        CHECK(bad == 0, "执行序列不符");
        printf("== 分支+行推进 OK: ");
        for (int i = 0; i < g_logN; i++) printf("%d ", g_log[i]);
        printf("==\n");
        task_free(t);
    }

    /* ---- 2) 默认列(count=0 → {行}选定列)+全角逗号/空格容忍 ---- */
    {
        TaskBook tb;
        memset(&tb, 0, sizeof(tb));
        Task *t = &tb.tasks[0];
        t->steps = (Step *)calloc(8, sizeof(Step));
        t->cap = 8;
        t->steps[t->count++] = xlsif(L"男 => 2\xFF0C女 => 3", 0);   /* 全角逗号+空格 */
        t->steps[t->count++] = click(20);
        t->steps[t->count++] = click(30);
        set_row(t, 2);
        t->dataSelCol = 1;               /* {行}列=第2列(性别) */
        t->loops = 2;

        g_logN = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        /* 行1"男"→20,30 ; 行2"女"→30 */
        int exp[] = { 20, 30, 30 };
        int expN = 3;
        CHECK(g_logN == expN, "场景2计数不符");
        int bad = 0;
        for (int i = 0; i < expN && i < g_logN; i++)
            if (g_log[i] != exp[i]) { bad = 1; break; }
        CHECK(bad == 0, "场景2序列不符(默认列/全角逗号/空格)");
        printf("== 默认列+全角逗号 OK ==\n");
        task_free(t);
    }

    /* ---- 3) 值不匹配 → 继续下一步(不跳) ---- */
    {
        TaskBook tb;
        memset(&tb, 0, sizeof(tb));
        Task *t = &tb.tasks[0];
        t->steps = (Step *)calloc(8, sizeof(Step));
        t->cap = 8;
        t->steps[t->count++] = xlsif(L"未知=>2", 2);
        t->steps[t->count++] = click(10);
        t->steps[t->count++] = click(20);
        set_row(t, 1);
        t->dataSelCol = 0;
        t->loops = 1;

        g_logN = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        CHECK(g_logN == 2 && g_log[0] == 10 && g_log[1] == 20,
              "不匹配应顺序执行全部步骤");
        printf("== 不匹配继续 OK ==\n");
        task_free(t);
    }

    /* ---- 3) 通用性:任意列(第1列姓名)+任意值(中文/数字)+4分支+不匹配走默认 ---- */
    {
        TaskBook tb;
        memset(&tb, 0, sizeof(tb));
        Task *t = &tb.tasks[0];
        t->steps = (Step *)calloc(10, sizeof(Step));
        t->cap = 10;
        /* 1:判断 2,3:默认路径 4:张三分支 5:李四分支 6:9527分支 7:abc分支(永不中) 8:公共尾 */
        t->steps[t->count++] = xlsif(L"张三=>4,李四=>5,9527=>6,abc=>7", 1);
        t->steps[t->count++] = click(20);
        t->steps[t->count++] = click(21);
        t->steps[t->count++] = click(40);
        t->steps[t->count++] = click(50);
        t->steps[t->count++] = click(60);
        t->steps[t->count++] = click(70);
        t->steps[t->count++] = click(80);
        static const wchar_t *rows4[] = {
            L"张三\t男\t110101199001011234",
            L"李四\t女\t110101199202022345",
            L"赵六\t男\t110101199303033456",     /* 姓名不匹配任何条件→走默认 */
            L"9527\t男\t110101199404044567",     /* 数字姓名→命中 9527=>6 */
        };
        t->dataRows = (wchar_t **)calloc(4, sizeof(wchar_t *));
        t->dataRowCount = 4;
        for (int i = 0; i < 4; i++) t->dataRows[i] = _wcsdup(rows4[i]);
        t->dataSelCol = 0;
        t->loops = 4;

        g_logN = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        /* 跳转到目标步骤后顺序执行到序列尾:
           行1 张三=>4: 40,50,60,70,80 ; 行2 李四=>5: 50,60,70,80 ;
           行3 赵六 全不匹配→从头顺序: 20,21,40,50,60,70,80 ; 行4 9527=>6: 60,70,80 */
        int exp[] = { 40,50,60,70,80,  50,60,70,80,  20,21,40,50,60,70,80,  60,70,80 };
        int expN = 19;
        CHECK(g_logN == expN, "通用性场景计数不符");
        int bad = 0;
        for (int i = 0; i < expN && i < g_logN; i++)
            if (g_log[i] != exp[i]) { bad = 1; break; }
        CHECK(bad == 0, "通用性场景序列不符");
        printf("== 通用性(第1列姓名/中文+数字值/4分支/默认继续) OK ==\n");
        task_free(t);
    }

    printf("\n%s(%d 个失败)\n", fails ? "*** 存在失败 ***" : "全部通过", fails);
    return fails ? 1 : 0;
}
