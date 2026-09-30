/* ============================================================
 * ocr.c - 区域文本识别(轻量模板匹配,数字/字母/常用符号)
 *
 * 原理:截取区域位图 → 灰度 → Otsu 自适应二值化 →
 *       行切割(水平投影) → 字符切割(垂直投影) →
 *       每字符归一化 12x16 网格 → 与 GDI 运行时渲染的
 *       模板(多字体多字号)比对取最近 → 拼接文本。
 * 适合 UI 界面上的标准文本;中文不支持。
 * ============================================================ */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "platform_win.h"
#include "ui_shared.h"

#define GW 12      /* 模板网格宽 */
#define GH 16      /* 模板网格高 */

/* 识别字符集 */
static const wchar_t *kCharset =
    L"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.:_-/@#$%&*()+=<>";

/* ---------------- 位图抓取 ---------------- */

/* 抓取区域灰度图(0=黑..255=白),失败返回 NULL;*ow/*oh 输出尺寸 */
static unsigned char *grab_gray(int x, int y, int w, int h, int *ow, int *oh)
{
    int stride = (w * 3 + 3) & ~3;               /* 24bpp 行按 4 字节对齐 */
    HDC dc = GetDC(NULL);
    HDC mem = CreateCompatibleDC(dc);
    BITMAPINFO bi;
    memset(&bi, 0, sizeof(bi));
    bi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bi.bmiHeader.biWidth = w;
    bi.bmiHeader.biHeight = -h;                 /* 自上而下 */
    bi.bmiHeader.biPlanes = 1;
    bi.bmiHeader.biBitCount = 24;
    void *bits = NULL;
    HBITMAP bmp = CreateDIBSection(dc, &bi, DIB_RGB_COLORS, &bits, NULL, 0);
    if (!bmp || !bits) {
        DeleteDC(mem); ReleaseDC(NULL, dc);
        return NULL;
    }
    HGDIOBJ ob = SelectObject(mem, bmp);
    BitBlt(mem, 0, 0, w, h, dc, x, y, SRCCOPY);
    SelectObject(mem, ob);
    ReleaseDC(NULL, dc);

    unsigned char *gray = (unsigned char *)malloc((size_t)w * h);
    for (int yy = 0; yy < h; yy++) {
        unsigned char *row = (unsigned char *)bits + (size_t)yy * stride;
        for (int xx = 0; xx < w; xx++) {
            unsigned char *p = row + xx * 3;
            gray[(size_t)yy * w + xx] =
                (unsigned char)((p[2] * 299 + p[1] * 587 + p[0] * 114) / 1000);
        }
    }
    DeleteObject(bmp);
    DeleteDC(mem);
    *ow = w; *oh = h;
    return gray;
}

/* Otsu 自适应阈值二值化;返回 1=前景(黑字) */
static void binarize(const unsigned char *gray, unsigned char *bin, int n)
{
    int hist[256] = {0};
    for (int i = 0; i < n; i++) hist[gray[i]]++;
    double sum = 0;
    for (int i = 0; i < 256; i++) sum += (double)i * hist[i];
    double sumB = 0;
    int wB = 0;
    double maxVar = -1;
    int thr = 128;
    for (int t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB == 0) continue;
        int wF = n - wB;
        if (wF == 0) break;
        sumB += (double)t * hist[t];
        double mB = sumB / wB;
        double mF = (sum - sumB) / wF;
        double var = (double)wB * wF * (mB - mF) * (mB - mF);
        if (var > maxVar) { maxVar = var; thr = t; }
    }
    for (int i = 0; i < n; i++)
        bin[i] = (gray[i] < thr) ? 1 : 0;        /* 暗=前景 */
}

/* ---------------- 模板生成(GDI 运行时渲染) ---------------- */

/* 把一个字符渲染成归一化网格;返回 1 成功 */
static int render_char_grid(wchar_t ch, const wchar_t *face, int px,
                            int bold, unsigned char grid[GH][GW])
{
    int w = px * 2 + 8, h = px * 2 + 8;
    int stride = (w * 3 + 3) & ~3;                 /* 24bpp 行按 4 字节对齐 */
    HDC dc = GetDC(NULL);
    HDC mem = CreateCompatibleDC(dc);
    BITMAPINFO bi;
    memset(&bi, 0, sizeof(bi));
    bi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bi.bmiHeader.biWidth = w;
    bi.bmiHeader.biHeight = -h;
    bi.bmiHeader.biPlanes = 1;
    bi.bmiHeader.biBitCount = 24;
    void *bits = NULL;
    HBITMAP bmp = CreateDIBSection(dc, &bi, DIB_RGB_COLORS, &bits, NULL, 0);
    if (!bmp || !bits) {
        DeleteDC(mem); ReleaseDC(NULL, dc);
        return 0;
    }
    HGDIOBJ ob = SelectObject(mem, bmp);
    RECT rc = { 0, 0, w, h };
    FillRect(mem, &rc, (HBRUSH)GetStockObject(WHITE_BRUSH));
    HFONT f = CreateFontW(-px, 0, 0, 0, bold ? FW_BOLD : FW_NORMAL, 0, 0, 0,
                          DEFAULT_CHARSET, 0, 0, CLEARTYPE_QUALITY,
                          DEFAULT_PITCH, face);
    if (!f) {
        SelectObject(mem, ob);
        DeleteObject(bmp); DeleteDC(mem); ReleaseDC(NULL, dc);
        return 0;
    }
    HGDIOBJ of = SelectObject(mem, f);
    SetTextColor(mem, RGB(0, 0, 0));
    SetBkColor(mem, RGB(255, 255, 255));
    TextOutW(mem, px / 2 + 2, px / 2 + 2, &ch, 1);
    SelectObject(mem, of);
    DeleteObject(f);

    /* 找字符包围盒 */
    int minX = w, minY = h, maxX = -1, maxY = -1;
    for (int yy = 0; yy < h; yy++) {
        unsigned char *row = (unsigned char *)bits + (size_t)yy * stride;
        for (int xx = 0; xx < w; xx++) {
            unsigned char *p = row + xx * 3;
            int g = (p[2] * 299 + p[1] * 587 + p[0] * 114) / 1000;
            if (g < 128) {
                if (xx < minX) minX = xx;
                if (xx > maxX) maxX = xx;
                if (yy < minY) minY = yy;
                if (yy > maxY) maxY = yy;
            }
        }
    }
    int ok = (maxX >= minX && maxY >= minY);
    if (ok) {
        int cw = maxX - minX + 1, chh = maxY - minY + 1;
        for (int gy = 0; gy < GH; gy++) {
            for (int gx = 0; gx < GW; gx++) {
                /* 与识别端一致的网格单元中心点采样 */
                int sx = minX + (gx * 2 + 1) * cw / (GW * 2);
                int sy = minY + (gy * 2 + 1) * chh / (GH * 2);
                if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
                    grid[gy][gx] = 0;
                } else {
                    unsigned char *p = (unsigned char *)bits + (size_t)sy * stride + sx * 3;
                    int g = (p[2] * 299 + p[1] * 587 + p[0] * 114) / 1000;
                    grid[gy][gx] = (g < 160) ? 1 : 0;
                }
            }
        }
    }
    SelectObject(mem, ob);
    DeleteObject(bmp);
    DeleteDC(mem);
    ReleaseDC(NULL, dc);
    return ok;
}

/* 模板条目 */
struct Tmpl { wchar_t ch; unsigned char g[GH][GW]; };

static struct Tmpl *g_tmpls = NULL;
static int g_tmplN = 0;
static CRITICAL_SECTION g_ocrLock;
static int g_ocrLockInit = 0;

/* 生成全部模板(首次调用时;~66字符×2字体×2字号) */
static void build_templates(void)
{
    if (g_tmpls) return;
    static const wchar_t *faces[] = { L"Segoe UI", L"宋体", L"Microsoft YaHei" };
    static const int sizes[] = { 16, 20, 26, 32 };
    int ncs = (int)wcslen(kCharset);
    g_tmpls = (struct Tmpl *)malloc((size_t)ncs * 24 * sizeof(struct Tmpl));
    g_tmplN = 0;
    for (int ci = 0; ci < ncs; ci++) {
        for (int fi = 0; fi < 3; fi++) {
            for (int si = 0; si < 4; si++) {
                struct Tmpl t;
                t.ch = kCharset[ci];
                if (render_char_grid(t.ch, faces[fi], sizes[si], 0, t.g))
                    g_tmpls[g_tmplN++] = t;
                if (render_char_grid(t.ch, faces[fi], sizes[si], 1, t.g))
                    g_tmpls[g_tmplN++] = t;
            }
        }
    }
}

/* ---------------- 切割与识别 ---------------- */

/* 单字符归一化网格与全部模板比对,返回最佳字符(失败 '?') */
static wchar_t match_cell(const unsigned char *bin, int bw, int bh,
                          int x0, int x1, int y0, int y1)
{
    int cw = x1 - x0 + 1, chh = y1 - y0 + 1;
    if (cw <= 0 || chh <= 0) return L'?';
    unsigned char g[GH][GW];
    for (int gy = 0; gy < GH; gy++) {
        for (int gx = 0; gx < GW; gx++) {
            /* 网格单元中心点采样(与模板生成同一坐标映射) */
            int sx = x0 + (gx * 2 + 1) * cw / (GW * 2);
            int sy = y0 + (gy * 2 + 1) * chh / (GH * 2);
            if (sx >= bw || sy >= bh || sx < 0 || sy < 0) {
                g[gy][gx] = 0;
            } else {
                g[gy][gx] = bin[(size_t)sy * bw + sx] ? 1 : 0;
            }
        }
    }
    int bestD = 1 << 30;
    wchar_t best = L'?';
    for (int t = 0; t < g_tmplN; t++) {
        int d = 0;
        for (int gy = 0; gy < GH; gy++)
            for (int gx = 0; gx < GW; gx++)
                if (g_tmpls[t].g[gy][gx] != g[gy][gx]) d++;
        if (d < bestD) { bestD = d; best = g_tmpls[t].ch; }
    }
    return (bestD <= GH * GW * 65 / 100) ? best : L'?';
}

/* 主入口:区域识别 */
int win_ocr_region(int x, int y, int w, int h, wchar_t *out, int cap)
{
    if (!g_ocrLockInit) {
        InitializeCriticalSection(&g_ocrLock);
        g_ocrLockInit = 1;
    }
    EnterCriticalSection(&g_ocrLock);
    build_templates();
    if (g_tmplN == 0) {
        LeaveCriticalSection(&g_ocrLock);
        return 0;
    }
    if (w > 600) w = 600;
    if (h > 200) h = 200;
    if (w < 8) w = 8;
    if (h < 8) h = 8;
    int iw, ih;
    unsigned char *gray = grab_gray(x, y, w, h, &iw, &ih);
    if (!gray) {
        LeaveCriticalSection(&g_ocrLock);
        return 0;
    }
    int n = iw * ih;
    unsigned char *bin = (unsigned char *)malloc((size_t)n);
    binarize(gray, bin, n);
    free(gray);

    /* 行切割:水平投影(前景计数),空隙>=3px 分行 */
    wchar_t result[512];
    int rn = 0;
    int inLine = 0, y0 = 0;
    for (int yy = 0; yy <= ih; yy++) {
        int cnt = 0;
        if (yy < ih)
            for (int xx = 0; xx < iw; xx++)
                if (bin[(size_t)yy * iw + xx]) cnt++;
        if (cnt > 0 && !inLine) { inLine = 1; y0 = yy; }
        else if (cnt == 0 && inLine) {
            inLine = 0;
            /* 该行 [y0, yy):字符切割 */
            int inCh = 0, x0 = 0;
            for (int xx = 0; xx <= iw; xx++) {
                int cc = 0;
                if (xx < iw)
                    for (int yy2 = y0; yy2 < yy; yy2++)
                        if (bin[(size_t)yy2 * iw + xx]) cc++;
                if (cc > 0 && !inCh) { inCh = 1; x0 = xx; }
                else if (cc == 0 && inCh) {
                    inCh = 0;
                    if (xx - x0 >= 3 && yy - y0 >= 6 && rn < 480)
                        result[rn++] = match_cell(bin, iw, ih, x0, xx - 1, y0, yy - 1);
                }
            }
            if (rn < 500) result[rn++] = L' ';
            if (rn >= 500) break;   /* 行循环防越界 */
        }
    }
    result[rn] = 0;
    /* 去尾空格 */
    while (rn > 0 && result[rn - 1] == L' ') result[--rn] = 0;
    free(bin);
    wcsncpy(out, result, cap - 1);
    out[cap - 1] = 0;
    LeaveCriticalSection(&g_ocrLock);
    if (rn > 0) {
        wchar_t shown[80];
        wcsncpy(shown, result, 79);
        shown[79] = 0;
        log_add(L"文本识别:%s", shown);
    }
    return rn > 0;
}
