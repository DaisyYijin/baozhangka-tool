/* test_findimg.c - 找图:匹配算法 + 打包回环 + CSV 序列化回环 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
#include "../core/findimg.h"
#include "../core/import.h"
#include "../core/engine.h"
#include "../core/ac_defs.h"
#include "../core/u8.h"

#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    int fails = 0;

    /* ---- 1) 打包/解包回环(含非偶数尺寸/坏数据) ---- */
    {
        int W = 37, H = 11;
        unsigned char tpl[37 * 11];
        for (int i = 0; i < W * H; i++) tpl[i] = (unsigned char)((i * 7) & 0xFF);
        char *cell = findimg_pack(1920, 1080, 5, tpl, W, H);
        CHECK(cell != NULL, "pack 失败");
        if (cell) {
            int sw = 0, sh = 0, mj = 0, tw = 0, th = 0;
            unsigned char *out = NULL;
            CHECK(findimg_unpack(cell, &sw, &sh, &mj, &out, &tw, &th) == 1, "unpack 失败");
            CHECK(sw == 1920 && sh == 1080 && mj == 5, "unpack 头部错误");
            CHECK(tw == W && th == H, "unpack 尺寸错误");
            if (out) {
                int bad = 0;
                for (int i = 0; i < W * H; i++)
                    if (out[i] != (tpl[i] >> 4)) { bad = 1; break; }
                CHECK(bad == 0, "unpack 像素错误");
                free(out);
            }
            CHECK(findimg_unpack("1,2,3,!!!", NULL, NULL, NULL, NULL, NULL, NULL) == 0,
                  "坏数据应拒绝");
            CHECK(findimg_pack(1, 1, 0, tpl, 1, 1) == NULL, "过小模板应拒绝");
            printf("== 打包回环 OK ==\n");
            free(cell);
        }
    }

    /* ---- 2) 搜索:命中/中心坐标/容差/区域限定 ---- */
    {
        int SW = 100, SH = 60, TW = 10, TH = 6, ox = 53, oy = 31;
        unsigned char scr[100 * 60], tpl[10 * 6];
        unsigned int st = 12345;                       /* LCG 无周期填充 */
        for (int i = 0; i < SW * SH; i++) {
            st = st * 1103515245u + 12345u;
            scr[i] = (unsigned char)(st >> 16);
        }
        for (int y = 0; y < TH; y++)
            for (int x = 0; x < TW; x++)
                tpl[y * TW + x] = scr[(oy + y) * SW + ox + x];
        int fx = -1, fy = -1;
        CHECK(findimg_search(scr, SW, SH, tpl, TW, TH, 0, 0, 0, SW, SH, &fx, &fy) == 1,
              "精确匹配应找到");
        CHECK(fx == ox + TW / 2 && fy == oy + TH / 2, "中心坐标错误");
        /* 容差:模板整体抬 60 灰度(4bit 域差 3~4) */
        unsigned char tpl2[10 * 6];
        for (int i = 0; i < TW * TH; i++)
            tpl2[i] = (unsigned char)(tpl[i] > 195 ? 255 : tpl[i] + 60);
        fx = -1; fy = -1;
        CHECK(findimg_search(scr, SW, SH, tpl2, TW, TH, 4, 0, 0, SW, SH, &fx, &fy) == 1,
              "容差4应找到");
        CHECK(findimg_search(scr, SW, SH, tpl2, TW, TH, 0, 0, 0, SW, SH, &fx, &fy) == 0,
              "容差0应找不到");
        /* 区域限定 */
        CHECK(findimg_search(scr, SW, SH, tpl, TW, TH, 0, 0, 0, 40, 60, &fx, &fy) == 0,
              "区域外应找不到");
        CHECK(findimg_search(scr, SW, SH, tpl, TW, TH, 0, 40, 20, 40, 40, &fx, &fy) == 1,
              "区域内应找到");
        printf("== 搜索算法 OK ==\n");
    }

    /* ---- 3) CSV 序列化回环(含跨TAB跳转/模板逐字节一致) ---- */
    {
        Task t; task_init(&t);
        Step s;
        memset(&s, 0, sizeof(s));
        s.type = ACT_FINDIMG;
        s.x = 10; s.y = 20; s.w = 800; s.h = 600;
        s.count = 2;                       /* 双击 */
        s.ifTol = 32;
        s.jumpTo = 3; s.jumpTab = 2;       /* 找到跳 TAB2 第3步 */
        s.missJump = 7;
        unsigned char g[8 * 4];
        for (int i = 0; i < 8 * 4; i++) g[i] = (unsigned char)(i * 8);
        char *cell = findimg_pack(800, 600, 7, g, 8, 4);
        CHECK(cell != NULL, "pack(测试3) 失败");
        s.imgB64 = cell;
        CHECK(task_add(&t, &s) >= 0, "task_add");

        size_t len = 0;
        char *csv = task_export_csv(&t, &len);
        CHECK(csv != NULL, "导出失败");
        if (csv) {
            Task t2; task_init(&t2);
            int n = task_import_csv_text(&t2, csv, len, 0);
            CHECK(n == 1, "回环步数应为1");
            if (t2.count >= 1) {
                Step *b = &t2.steps[0];
                CHECK(b->type == ACT_FINDIMG, "类型回环");
                CHECK(b->x == 10 && b->y == 20 && b->w == 800 && b->h == 600, "搜索区回环");
                CHECK(b->count == 2 && b->ifTol == 32, "动作/容差回环");
                CHECK(b->jumpTo == 3 && b->jumpTab == 2, "找到跳转回环");
                CHECK(b->missJump == 7, "未找到跳转回环");
                CHECK(b->imgB64 && strcmp(b->imgB64, cell) == 0, "模板逐字节回环");
                printf("== CSV 回环 OK(模板 %d 字节) ==\n", (int)strlen(cell));
            }
            free(csv);
            task_free(&t2);
        }
        task_free(&t);                     /* 释放 s.imgB64(转移至 t) */
    }

    printf("\n%s(%d 个失败)\n", fails ? "*** 存在失败 ***" : "全部通过", fails);
    return fails ? 1 : 0;
}
