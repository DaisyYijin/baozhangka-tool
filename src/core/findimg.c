/* ============================================================
 * findimg.c - 找图:模板图像匹配实现(平台无关,纯 C99)
 * 匹配策略:锚点像素预筛 -> 模板首行验证 -> 全模板验证(早退),
 *          灰度 4bit 域比较(抗渲染微差,容差由调用方指定)
 * ============================================================ */
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "findimg.h"

/* ---------------- Base64 ---------------- */

static const char B64T[65] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static int b64_val(int c)
{
    if (c >= 'A' && c <= 'Z') return c - 'A';
    if (c >= 'a' && c <= 'z') return c - 'a' + 26;
    if (c >= '0' && c <= '9') return c - '0' + 52;
    if (c == '+') return 62;
    if (c == '/') return 63;
    if (c == '=') return 0;          /* padding:值忽略(长度由 pad 扣减) */
    return -1;
}

static char *b64_encode(const unsigned char *d, size_t n)
{
    size_t ol = ((n + 2) / 3) * 4;
    char *out = (char *)malloc(ol + 1);
    if (!out) return NULL;
    size_t o = 0;
    for (size_t i = 0; i < n; i += 3) {
        unsigned v = d[i] << 16;
        if (i + 1 < n) v |= d[i + 1] << 8;
        if (i + 2 < n) v |= d[i + 2];
        out[o++] = B64T[(v >> 18) & 63];
        out[o++] = B64T[(v >> 12) & 63];
        out[o++] = (i + 1 < n) ? B64T[(v >> 6) & 63] : '=';
        out[o++] = (i + 2 < n) ? B64T[v & 63] : '=';
    }
    out[o] = 0;
    return out;
}

static unsigned char *b64_decode(const char *s, size_t *outN)
{
    size_t n = strlen(s);
    size_t pad = 0;
    if (n >= 1 && s[n - 1] == '=') pad++;
    if (n >= 2 && s[n - 2] == '=') pad++;
    if (n < 4 || (n & 3)) return NULL;
    unsigned char *out = (unsigned char *)malloc(n / 4 * 3 + 1);
    if (!out) return NULL;
    size_t o = 0;
    for (size_t i = 0; i < n; i += 4) {
        int a = b64_val(s[i]), b = b64_val(s[i + 1]);
        int c = b64_val(s[i + 2]), d = b64_val(s[i + 3]);
        if (a < 0 || b < 0 || c < 0 || d < 0) { free(out); return NULL; }
        unsigned v = ((unsigned)a << 18) | ((unsigned)b << 12) |
                     ((unsigned)c << 6) | (unsigned)d;
        out[o++] = (unsigned char)(v >> 16);
        out[o++] = (unsigned char)(v >> 8);
        out[o++] = (unsigned char)v;
    }
    *outN = n / 4 * 3 - pad;
    return out;
}

/* ---------------- 打包 / 解包 ---------------- */

char *findimg_pack(int sw, int sh, int missJump,
                   const unsigned char *tplGray, int tw, int th)
{
    if (!tplGray || tw < 2 || th < 2 || tw > 256 || th > 256 ||
        tw * th > 16384) return NULL;
    size_t raw = 4 + (size_t)((tw * (size_t)th + 1) / 2);
    unsigned char *d = (unsigned char *)malloc(raw);
    if (!d) return NULL;
    d[0] = (unsigned char)(tw & 255);
    d[1] = (unsigned char)((tw >> 8) & 255);
    d[2] = (unsigned char)(th & 255);
    d[3] = (unsigned char)((th >> 8) & 255);
    size_t pi = 4, acc = 0;
    int nb = 0;
    for (int i = 0; i < tw * th; i++) {
        unsigned v = tplGray[i] >> 4;             /* 4bit 灰度 */
        if (nb == 0) { acc = v << 4; nb = 1; }
        else { d[pi++] = (unsigned char)(acc | v); nb = 0; }
    }
    if (nb) d[pi++] = (unsigned char)acc;
    char *b = b64_encode(d, pi);
    free(d);
    if (!b) return NULL;
    size_t cap = strlen(b) + 96;
    char *out = (char *)malloc(cap);
    if (out) snprintf(out, cap, "%d;%d;%d;%s", sw, sh, missJump, b);
    free(b);
    return out;
}

int findimg_unpack(const char *cell, int *sw, int *sh, int *missJump,
                   unsigned char **tpl, int *tw, int *th)
{
    if (!cell) return 0;
    int a = 0, b = 0, m = 0;
    /* 手动解析 "sw;sh;missJump;" 前缀(分号分隔,避免破坏 CSV 字段) */
    char *e = NULL;
    long v1 = strtol(cell, &e, 10);
    if (e == cell || *e != ';') return 0;
    long v2 = strtol(e + 1, &e, 10);
    if (*e != ';') return 0;
    long v3 = strtol(e + 1, &e, 10);
    if (*e != ';') return 0;
    const char *p = e + 1;                 /* base64 起点 */
    a = (int)v1; b = (int)v2; m = (int)v3;
    size_t n = 0;
    unsigned char *d = b64_decode(p, &n);
    if (!d || n < 5) { free(d); return 0; }
    int W = d[0] | (d[1] << 8);
    int H = d[2] | (d[3] << 8);
    if (W < 2 || H < 2 || W > 256 || H > 256 || W * H > 16384 ||
        (size_t)4 + (size_t)((W * H + 1) / 2) != n) {
        free(d);
        return 0;
    }
    unsigned char *g = (unsigned char *)malloc((size_t)W * H);
    if (!g) { free(d); return 0; }
    for (int i = 0; i < W * H; i++) {
        unsigned byte = d[4 + i / 2];
        g[i] = (unsigned char)((i & 1) ? (byte & 0x0F) : (byte >> 4));
    }
    free(d);
    if (tpl) *tpl = g;
    else free(g);                 /* 仅取尺寸/参数时不必分配 */
    if (sw) *sw = a;
    if (sh) *sh = b;
    if (missJump) *missJump = m;
    if (tw) *tw = W;
    if (th) *th = H;
    return 1;
}

/* ---------------- 搜索 ---------------- */

int findimg_search(const unsigned char *scr, int sw, int sh,
                   const unsigned char *tpl, int tw, int th, int tol4,
                   int rx, int ry, int rw, int rh, int *fx, int *fy)
{
    if (!scr || !tpl || !fx || !fy) return 0;
    if (tw < 1 || th < 1 || tw > sw || th > sh) return 0;
    if (rx < 0) rx = 0;
    if (ry < 0) ry = 0;
    if (rx + rw > sw) rw = sw - rx;
    if (ry + rh > sh) rh = sh - ry;
    if (rw < tw || rh < th) return 0;
    int maxX = rx + rw - tw;
    int maxY = ry + rh - th;

    int t00 = tpl[0] >> 4;                     /* 锚点像素(4bit 域) */
    const unsigned char *trow = tpl;           /* 锚行 = 模板第 0 行 */

    for (int y = ry; y <= maxY; y++) {
        const unsigned char *srow = scr + (size_t)y * sw;
        for (int x = rx; x <= maxX; x++) {
            int d = (srow[x] >> 4) - t00;
            if (d < -tol4 || d > tol4) continue;          /* 预筛 */
            int ok = 1;                                    /* 锚行 */
            for (int i = 1; i < tw; i++) {
                d = (srow[x + i] >> 4) - (trow[i] >> 4);
                if (d < -tol4 || d > tol4) { ok = 0; break; }
            }
            if (!ok) continue;
            for (int yy = 1; yy < th; yy++) {              /* 全模板 */
                const unsigned char *s2 = scr + (size_t)(y + yy) * sw + x;
                const unsigned char *t2 = tpl + (size_t)yy * tw;
                for (int i = 0; i < tw; i++) {
                    d = (s2[i] >> 4) - (t2[i] >> 4);
                    if (d < -tol4 || d > tol4) { ok = 0; break; }
                }
                if (!ok) break;
            }
            if (ok) {
                *fx = x + tw / 2;
                *fy = y + th / 2;
                return 1;
            }
        }
    }
    return 0;
}
