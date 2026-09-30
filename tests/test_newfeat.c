/* test_newfeat.c - 新功能:多列占位符 / 子流程调用返回 / 判断颜色 / 等待窗口 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/engine.h"
#include "../src/core/u8.h"

static wchar_t g_pasted[16][256];
static int g_pasteN;
static int g_clicks[64];
static int g_n;
static volatile int g_stop = 0;

static int g_pixVal = -1;              /* mock 像素 */
static const wchar_t *g_winTitle = L"";/* mock 窗口标题 */

static void mm(int x, int y) { (void)y; if (g_n < 64) g_clicks[g_n++] = x; }
static void nd(int b) { (void)b; }
static void nu(int b) { (void)b; }
static void ns(int a) { (void)a; }
static void nc(const int *v, int n) { (void)v; (void)n; }
static void paste_cb(const wchar_t *t) {
    if (g_pasteN < 16) { wcsncpy(g_pasted[g_pasteN], t, 255); g_pasted[g_pasteN][255] = 0; }
    g_pasteN++;
}
static void slp(int ms) { (void)ms; }
static uint32_t rnd(void) { return 0; }
static int mock_pixel(int x, int y) { (void)x; (void)y; return g_pixVal; }
static int area_mock_pixel(int x, int y)          /* 仅 (57,63)=红,其余黑 */
{
    return (x == 57 && y == 63) ? 0xFF0000 : 0x000000;
}
static int mock_findwin(const wchar_t *t) { return wcsstr(g_winTitle, t) != NULL; }

static int fails = 0;
#define CHECK(c, m) do { if (!(c)) { printf("FAIL: %s\n", m); fails++; } } while (0)

static Platform mkp(void)
{
    Platform p;
    p.mouse_move = mm; p.mouse_down = nd; p.mouse_up = nu;
    p.mouse_scroll = ns; p.key_combo = nc; p.text_paste = paste_cb;
    p.sleep_ms = slp; p.rand = rnd;
    p.get_pixel = mock_pixel;
    p.find_window = mock_findwin;
    p.stop = &g_stop;
    return p;
}

static void u8w(const wchar_t *w, char *out, int cap)
{
    wcs_to_u8(w, out, cap - 1);
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    TaskBook tb;
    memset(&tb, 0, sizeof(tb));
    for (int i = 0; i < MAX_TASKS; i++) task_init(&tb.tasks[i]);
    Platform p = mkp();

    /* ============ 1) 多列占位符 ============ */
    {
        Task *A = &tb.tasks[0];
        A->loops = 1;
        Step s1;
        memset(&s1, 0, sizeof(s1));
        s1.type = ACT_TEXT;
        wcscpy(s1.text, L"账号:{账号} 密码:{密码} 行:{行} 第2列:{列2}");
        task_add(A, &s1);
        /* 两列数据:列名 账号/密码;{行}=选定列(dataSelCol=0) */
        A->dataRows = (wchar_t **)calloc(1, sizeof(wchar_t *));
        A->dataRows[0] = _wcsdup(L"user01\tpass01");
        A->dataRowCount = 1;
        A->dataSelCol = 0;
        A->dataColN = 2;
        A->dataColNames = (wchar_t (*)[32])calloc(2, 32 * sizeof(wchar_t));
        wcscpy(A->dataColNames[0], L"账号");
        wcscpy(A->dataColNames[1], L"密码");

        g_pasteN = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        char out[256];
        u8w(g_pasted[0], out, 256);
        printf("多列展开: %s\n", out);
        CHECK(wcscmp(g_pasted[0], L"账号:user01 密码:pass01 行:user01 第2列:pass01") == 0,
              "多列占位符展开错误");

        task_clear(A);
        free(A->dataRows[0]); free(A->dataRows); A->dataRows = NULL; A->dataRowCount = 0;
        free(A->dataColNames); A->dataColNames = NULL; A->dataColN = 0;
    }

    /* ============ 2) 子流程调用返回 ============ */
    {
        Task *A = &tb.tasks[0];
        Task *B = &tb.tasks[1];
        A->loops = 1; B->loops = 1;
        Step a1; memset(&a1, 0, sizeof(a1)); a1.type = ACT_CLICK; a1.x = 11;
        Step a2; memset(&a2, 0, sizeof(a2)); a2.type = ACT_CALL; a2.jumpTab = 2; a2.jumpTo = 1;
        Step a3; memset(&a3, 0, sizeof(a3)); a3.type = ACT_CLICK; a3.x = 12;
        task_add(A, &a1); task_add(A, &a2); task_add(A, &a3);
        Step b1; memset(&b1, 0, sizeof(b1)); b1.type = ACT_CLICK; b1.x = 21;
        Step b2; memset(&b2, 0, sizeof(b2)); b2.type = ACT_CLICK; b2.x = 22;
        task_add(B, &b1); task_add(B, &b2);

        g_n = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        printf("调用返回: ");
        for (int i = 0; i < g_n; i++) printf("%d ", g_clicks[i]);
        printf("\n");
        int want[] = { 11, 21, 22, 12 };       /* A1 → B全 → A3 */
        int ok = (g_n == 4);
        for (int i = 0; ok && i < 4; i++) ok = (g_clicks[i] == want[i]);
        CHECK(ok, "子流程调用应执行 A1,B1,B2,A3");

        task_clear(A); task_clear(B);
    }

    /* ============ 3) 判断颜色分支 ============ */
    {
        Task *A = &tb.tasks[0];
        A->loops = 1;
        Step c1; memset(&c1, 0, sizeof(c1)); c1.type = ACT_CLICK; c1.x = 31;
        Step c2; memset(&c2, 0, sizeof(c2));
        c2.type = ACT_CHECK; c2.x = 5; c2.y = 5; c2.ifColor = 0xFF8000; c2.ifTol = 10;
        c2.jumpTo = 4;                            /* 满足 → 第4步 */
        Step c3; memset(&c3, 0, sizeof(c3)); c3.type = ACT_CLICK; c3.x = 32;
        Step c4; memset(&c4, 0, sizeof(c4)); c4.type = ACT_CLICK; c4.x = 33;
        task_add(A, &c1); task_add(A, &c2); task_add(A, &c3); task_add(A, &c4);

        g_pixVal = 0xFF8000;                       /* 与目标一致 → 满足 */
        g_n = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        printf("判断满足: ");
        for (int i = 0; i < g_n; i++) printf("%d ", g_clicks[i]);
        printf("\n");
        int ok1 = (g_n == 2 && g_clicks[0] == 31 && g_clicks[1] == 33);
        CHECK(ok1, "满足应 31→33(跳过32)");

        g_pixVal = 0x00FF00;                       /* 差异大 → 不满足 */
        g_n = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        printf("判断不满足: ");
        for (int i = 0; i < g_n; i++) printf("%d ", g_clicks[i]);
        printf("\n");
        int ok2 = (g_n == 3 && g_clicks[0] == 31 && g_clicks[1] == 32 && g_clicks[2] == 33);
        CHECK(ok2, "不满足应顺序 31,32,33");

        g_pixVal = -1;                             /* 取色失败 → 不满足 */
        g_n = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        CHECK(g_n == 3, "取色失败按不满足处理");

        task_clear(A);
    }

    /* ============ 3.5) 区域颜色判断 ============ */
    {
        Task *A = &tb.tasks[0];
        A->loops = 1;
        Step c1; memset(&c1, 0, sizeof(c1)); c1.type = ACT_CLICK; c1.x = 51;
        Step c2; memset(&c2, 0, sizeof(c2));
        c2.type = ACT_CHECK; c2.x = 0; c2.y = 0; c2.w = 100; c2.h = 100;
        c2.ifColor = 0xFF0000; c2.ifTol = 0;
        c2.jumpTo = 4;                        /* 满足 → 第4步(跳过52) */
        Step c3; memset(&c3, 0, sizeof(c3)); c3.type = ACT_CLICK; c3.x = 52;
        Step c4; memset(&c4, 0, sizeof(c4)); c4.type = ACT_CLICK; c4.x = 53;
        task_add(A, &c1); task_add(A, &c2); task_add(A, &c3); task_add(A, &c4);

        /* mock 像素:仅 (57,63) 为目标色,其余全黑 */
        static int px_call = 0;
        (void)px_call;
        g_pixVal = 0x000000;
        /* 用自定义 mock 不便改值——本套 mock 是常量;改用临时 Platform */
        Platform p2 = p;
        p2.get_pixel = area_mock_pixel;
        g_n = 0;
        engine_run(&tb, 0, &p2, NULL, NULL);
        printf("区域判断: ");
        for (int i = 0; i < g_n; i++) printf("%d ", g_clicks[i]);
        printf("\n");
        int ok3 = (g_n == 2 && g_clicks[0] == 51 && g_clicks[1] == 53);
        CHECK(ok3, "区域扫描应在(57,63)命中→51,53");

        /* 区域内无目标色(缩小区域避开命中点;改已添加的步骤) */
        A->steps[1].w = 50; A->steps[1].h = 50;
        g_n = 0;
        engine_run(&tb, 0, &p2, NULL, NULL);
        CHECK(g_n == 3, "区域不含目标色应顺序执行");
        A->steps[1].w = 100; A->steps[1].h = 100;

        task_clear(A);
    }

    /* ============ 4) 等待窗口(mock) ============ */
    {
        Task *A = &tb.tasks[0];
        A->loops = 1;
        Step w1; memset(&w1, 0, sizeof(w1));
        w1.type = ACT_WAITWIN; wcscpy(w1.text, L"计算器"); w1.delayBefore = 600;  /* 短超时 */
        Step w2; memset(&w2, 0, sizeof(w2)); w2.type = ACT_CLICK; w2.x = 41;
        task_add(A, &w1); task_add(A, &w2);

        g_winTitle = L"无标题 - 记事本";            /* 不包含 → 超时继续 */
        g_n = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        CHECK(g_n == 1 && g_clicks[0] == 41, "超时后应继续执行");

        g_winTitle = L"计算器";                     /* 已存在 → 立即过 */
        g_n = 0;
        engine_run(&tb, 0, &p, NULL, NULL);
        CHECK(g_n == 1 && g_clicks[0] == 41, "窗口存在应立即通过");

        task_clear(A);
    }

    for (int i = 0; i < MAX_TASKS; i++) task_free(&tb.tasks[i]);
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
