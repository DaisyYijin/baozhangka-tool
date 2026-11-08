/* ============================================================
 * xui.c - 纯 Xlib 轻量控件层实现(仅依赖 libX11 + core/u8)
 * 线程模型:XUi 及其 Display 仅 GUI 主线程使用;
 *          执行线程通过 xui_wake() + 剪贴板通道交互(见 main.c)
 * ============================================================ */
#define _DEFAULT_SOURCE
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/Xlocale.h>
#include <X11/keysym.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <time.h>
#include <dirent.h>
#include <limits.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include "xui.h"
#include "u8.h"

#undef MIN
#undef MAX
#undef ABS
#define MIN(a,b) ((a)<(b)?(a):(b))
#define MAX(a,b) ((a)>(b)?(a):(b))
#define ABS(a)   ((a)<0?-(a):(a))

#define XUI_MAX_WINS   16
#define XUI_MAX_WGTS   96

enum {
    XUI_LABEL, XUI_BUTTON, XUI_ENTRY, XUI_CHECK, XUI_COMBO,
    XUI_LIST, XUI_STATUS
};

struct XuiWgt {
    int type;
    Window win;
    XuiWin *parent;
    int x, y, w, h;
    char *text;                 /* label/button/check/combo 当前项/status */
    int sensitive, visible;
    XuiFn onClick; void *ud;
    /* entry */
    wchar_t *eb; int ecap, elen, ecur, escr; int focused;
    XIC ic;
    /* check */
    int checked;
    /* combo */
    char **items; int nItems, active;
    /* list */
    int rows, cols, *colW;
    char **hdr;                 /* 每列表头文字 */
    char ***cells;
    int sel, top, dragBar, checkMode;
    unsigned char *listChecked;       /* 列表勾选状态(行数变化时重建清零) */
    int lastClickRow; Time lastClickTime;
    XuiListFn onSel, onAct; void *lud;
    /* button */
    int pressed;
    unsigned long bgCol; int useBg;       /* 彩色按钮(色板块) */
};

struct XuiWin {
    Window win;
    XUi *ui;
    XuiWgt *wgts[XUI_MAX_WGTS]; int n;
    XuiWgt *focus;
    XuiKeyFn keyFn; void *keyUd;
    XuiCloseFn closeFn; void *closeUd;
    XuiWgt *defBtn, *cancelBtn;
    int running, modalResult;
    int shown, mapped;
};

struct XUi {
    Display *dpy;
    int scr; Window root;
    XFontSet fs; XFontSetExtents *fse;
    GC gc;
    Colormap cmap;
    unsigned long cFace, cWhite, cGray, cDark, cBlack, cSel, cSelText, cDis, cBar;
    unsigned long cTheme;                 /* 主题色(与 cSel 联动) */
    Atom aDelWin, aUtf8, aClip, aPrim, aTargets, aIncr, aText, aCompound, aTextPlain;
    XIM im;
    int fdWake[2];
    XuiWin *wins[XUI_MAX_WINS]; int nWins;
    XuiWin *modalWin;           /* 模态期间其它窗口的输入事件被丢弃 */
    int quitAll;
    Window clipWin, hotWin;     /* 隐藏服务窗口(不 map) */
    char *clipText;
    char *clipRecv; int clipDone;
    XuiHotFn hotFn; void *hotUd;
};

/* ==================== 工具 ==================== */

static XuiWin *find_win(XUi *ui, Window w)
{
    for (int i = 0; i < ui->nWins; i++)
        if (ui->wins[i]->win == w) return ui->wins[i];
    return NULL;
}

static XuiWgt *find_wgt(XUi *ui, Window w, XuiWin **outWin)
{
    for (int i = 0; i < ui->nWins; i++) {
        XuiWin *wn = ui->wins[i];
        for (int j = 0; j < wn->n; j++)
            if (wn->wgts[j]->win == w) { if (outWin) *outWin = wn; return wn->wgts[j]; }
    }
    return NULL;
}

static unsigned long named_color(XUi *ui, const char *hex)
{
    XColor c, s;
    if (XAllocNamedColor(ui->dpy, ui->cmap, hex, &c, &s)) return c.pixel;
    return BlackPixel(ui->dpy, ui->scr);
}

static void now_ms(struct timespec *t) { clock_gettime(CLOCK_MONOTONIC, t); }
static long ms_between(const struct timespec *a, const struct timespec *b)
{ return (b->tv_sec - a->tv_sec) * 1000L + (b->tv_nsec - a->tv_nsec) / 1000000L; }

static int xui_err_handler(Display *d, XErrorEvent *e)
{
    (void)d; (void)e;
    return 0;   /* 忽略 BadMatch 等竞态错误,不退出进程 */
}

static void set_title_utf8(Display *d, Window w, const char *utf8)
{
    XTextProperty tp;
    char *lst[2]; lst[0] = (char *)utf8;
    if (utf8 && XmbTextListToTextProperty(d, lst, 1, XUTF8StringStyle, &tp) == Success) {
        XSetTextProperty(d, w, &tp, XA_WM_NAME);
        XFree(tp.value);
    } else if (utf8) {
        XStoreName(d, w, utf8);
    }
}

/* ==================== 文本绘制 ==================== */

int xui_text_w(XUi *ui, const char *utf8)
{
    if (!utf8 || !utf8[0]) return 0;
    XRectangle ink, log;
    XmbTextExtents(ui->fs, utf8, (int)strlen(utf8), &ink, &log);
    return log.width;
}
int xui_font_h(XUi *ui)      { return ui->fse->max_ink_extent.height + 2; }
int xui_font_ascent(XUi *ui) { return -ui->fse->max_ink_extent.y; }

void xui_draw_text(XUi *ui, Drawable d, int x, int yTop, const char *utf8)
{
    if (!utf8 || !utf8[0]) return;
    XSetForeground(ui->dpy, ui->gc, ui->cBlack);
    XmbDrawString(ui->dpy, d, ui->fs, ui->gc, x, yTop + xui_font_ascent(ui),
                  utf8, (int)strlen(utf8));
}
int xui_draw_text_c(XUi *ui, Drawable d, int x, int yTop, const char *utf8, unsigned long pix)
{
    if (!utf8 || !utf8[0]) return 0;
    XSetForeground(ui->dpy, ui->gc, pix);
    XmbDrawString(ui->dpy, d, ui->fs, ui->gc, x, yTop + xui_font_ascent(ui),
                  utf8, (int)strlen(utf8));
    return xui_text_w(ui, utf8);
}

static void clip_rect(XUi *ui, int x, int y, int w, int h)
{
    XRectangle r; r.x = (short)x; r.y = (short)y;
    r.width = (unsigned short)MAX(0, w); r.height = (unsigned short)MAX(0, h);
    XSetClipRectangles(ui->dpy, ui->gc, 0, 0, &r, 1, Unsorted);
}
static void clip_off(XUi *ui) { XSetClipMask(ui->dpy, ui->gc, None); }

/* ==================== 边框 ==================== */

static void box_raised(XUi *ui, Drawable w, int x, int y, int wd, int ht)
{
    GC gc = ui->gc; Display *d = ui->dpy;
    XSetForeground(d, gc, ui->cWhite);
    XDrawLine(d, w, gc, x, y, x + wd - 1, y);
    XDrawLine(d, w, gc, x, y, x, y + ht - 1);
    XSetForeground(d, gc, ui->cDark);
    XDrawLine(d, w, gc, x, y + ht - 1, x + wd - 1, y + ht - 1);
    XDrawLine(d, w, gc, x + wd - 1, y, x + wd - 1, y + ht - 1);
}
static void box_sunken(XUi *ui, Drawable w, int x, int y, int wd, int ht)
{
    GC gc = ui->gc; Display *d = ui->dpy;
    XSetForeground(d, gc, ui->cDark);
    XDrawLine(d, w, gc, x, y, x + wd - 1, y);
    XDrawLine(d, w, gc, x, y, x, y + ht - 1);
    XSetForeground(d, gc, ui->cWhite);
    XDrawLine(d, w, gc, x, y + ht - 1, x + wd - 1, y + ht - 1);
    XDrawLine(d, w, gc, x + wd - 1, y, x + wd - 1, y + ht - 1);
}

/* ==================== 剪贴板(owner 应答/请求方) ==================== */

static void clip_send_notify(XUi *ui, const XSelectionRequestEvent *req, Atom property)
{
    XEvent resp;
    memset(&resp, 0, sizeof(resp));
    resp.xselection.type = SelectionNotify;
    resp.xselection.display = ui->dpy;
    resp.xselection.requestor = req->requestor;
    resp.xselection.selection = req->selection;
    resp.xselection.target = req->target;
    resp.xselection.property = property;
    resp.xselection.time = req->time;
    XSendEvent(ui->dpy, req->requestor, False, 0, &resp);
}

static void clip_on_request(XUi *ui, const XSelectionRequestEvent *req)
{
    Display *d = ui->dpy;
    Atom prop = req->property ? req->property : req->target;
    if (!ui->clipText) { clip_send_notify(ui, req, None); return; }
    if (req->target == ui->aTargets) {
        Atom t[5] = { ui->aUtf8, ui->aCompound, ui->aText, ui->aTextPlain, XA_STRING };
        XChangeProperty(d, req->requestor, prop, XA_ATOM, 32, PropModeReplace,
                        (const unsigned char *)t, 5);
    } else if (req->target == ui->aUtf8 || req->target == ui->aTextPlain) {
        XChangeProperty(d, req->requestor, prop, req->target, 8, PropModeReplace,
                        (const unsigned char *)ui->clipText, (int)strlen(ui->clipText));
    } else if (req->target == ui->aCompound) {
        XTextProperty tp;
        char *lst[2]; lst[0] = ui->clipText;
        if (XmbTextListToTextProperty(d, lst, 1, XCompoundTextStyle, &tp) == Success) {
            XChangeProperty(d, req->requestor, prop, req->target, 8, PropModeReplace,
                            tp.value, (int)tp.nitems);
            XFree(tp.value);
        } else { clip_send_notify(ui, req, None); return; }
    } else if (req->target == XA_STRING || req->target == ui->aText) {
        size_t n = strlen(ui->clipText);
        char *asc = (char *)malloc(n + 1);
        if (!asc) { clip_send_notify(ui, req, None); return; }
        for (size_t i = 0; i < n; i++)
            asc[i] = ((unsigned char)ui->clipText[i] < 128) ? ui->clipText[i] : '?';
        asc[n] = 0;
        XChangeProperty(d, req->requestor, prop, XA_STRING, 8, PropModeReplace,
                        (const unsigned char *)asc, (int)n);
        free(asc);
    } else { clip_send_notify(ui, req, None); return; }
    clip_send_notify(ui, req, prop);
}

void xui_clip_set(XUi *ui, const char *utf8)
{
    free(ui->clipText);
    ui->clipText = utf8 ? strdup(utf8) : NULL;
    XSetSelectionOwner(ui->dpy, ui->aClip, ui->clipWin, CurrentTime);
    XSetSelectionOwner(ui->dpy, ui->aPrim, ui->clipWin, CurrentTime);
    XStoreBytes(ui->dpy, utf8 ? utf8 : "", (int)(utf8 ? strlen(utf8) : 0));
    XFlush(ui->dpy);
}

char *xui_clip_get(XUi *ui)
{
    Display *d = ui->dpy;
    Window own = XGetSelectionOwner(d, ui->aClip);
    if (own == ui->clipWin && ui->clipText) return strdup(ui->clipText);
    Atom targets[3] = { ui->aUtf8, ui->aCompound, XA_STRING };
    for (int ti = 0; ti < 3; ti++) {
        free(ui->clipRecv); ui->clipRecv = NULL;
        ui->clipDone = 0;
        XDeleteProperty(d, ui->clipWin, ui->aUtf8);
        XConvertSelection(d, ui->aClip, targets[ti], ui->aUtf8, ui->clipWin, CurrentTime);
        XFlush(d);
        struct timespec t0; now_ms(&t0);
        while (!ui->clipDone) {
            xui_pump(ui, 20);
            struct timespec t1; now_ms(&t1);
            if (ms_between(&t0, &t1) > 600) break;
        }
        if (!ui->clipDone) continue;
        Atom actType = None; int fmt = 0; unsigned long n = 0, left = 0;
        unsigned char *data = NULL;
        if (XGetWindowProperty(d, ui->clipWin, ui->aUtf8, 0, 1 << 16, True, AnyPropertyType,
                               &actType, &fmt, &n, &left, &data) != Success || !data || !n) {
            XFree(data); continue;
        }
        if (actType == ui->aIncr) { XFree(data); continue; }
        char *out = NULL;
        if (actType == ui->aCompound || actType == ui->aText) {
            XTextProperty tp;
            tp.value = data; tp.encoding = actType; tp.format = fmt; tp.nitems = n;
            char **lst = NULL; int cnt = 0;
            if (XmbTextPropertyToTextList(d, &tp, &lst, &cnt) == Success && cnt > 0 && lst[0])
                out = strdup(lst[0]);
            if (cnt > 0) XFreeStringList(lst);
        } else {
            out = strndup((const char *)data, n);
        }
        XFree(data);
        if (out) return out;
    }
    return NULL;
}

/* ==================== 控件绘制 ==================== */

static void draw_wgt(XUi *ui, XuiWgt *g)
{
    if (!g->visible) return;
    Display *d = ui->dpy; Window w = g->win;
    int fh = xui_font_h(ui);
    switch (g->type) {
    case XUI_LABEL:
        clip_rect(ui, 0, 0, g->w, g->h);
        xui_draw_text(ui, w, 2, (g->h - fh) / 2, g->text);
        clip_off(ui);
        break;
    case XUI_BUTTON: {
        if (g->useBg) {                   /* 彩色按钮(色板块) */
            XSetForeground(d, ui->gc, g->bgCol);
            XFillRectangle(d, w, ui->gc, 0, 0, g->w, g->h);
            box_raised(ui, w, 0, 0, g->w, g->h);
            break;
        }
        if (g->pressed) {
            XSetForeground(d, ui->gc, ui->cBar);
            XFillRectangle(d, w, ui->gc, 0, 0, g->w, g->h);
            box_sunken(ui, w, 0, 0, g->w, g->h);
        } else {
            XSetForeground(d, ui->gc, ui->cFace);
            XFillRectangle(d, w, ui->gc, 0, 0, g->w, g->h);
            box_raised(ui, w, 0, 0, g->w, g->h);
        }
        int tw = xui_text_w(ui, g->text);
        clip_rect(ui, 3, 3, g->w - 6, g->h - 6);
        xui_draw_text_c(ui, w, MAX(4, (g->w - tw) / 2), (g->h - fh) / 2 + 1,
                        g->text, g->sensitive ? ui->cBlack : ui->cDis);
        clip_off(ui);
        break;
    }
    case XUI_CHECK: {
        int bx = 2, by = (g->h - 13) / 2;
        XSetForeground(d, ui->gc, ui->cWhite);
        XFillRectangle(d, w, ui->gc, bx, by, 13, 13);
        box_sunken(ui, w, bx, by, 13, 13);
        if (g->checked) {
            XSetForeground(d, ui->gc, ui->cBlack);
            XDrawLine(d, w, ui->gc, bx + 3, by + 6, bx + 5, by + 9);
            XDrawLine(d, w, ui->gc, bx + 5, by + 9, bx + 10, by + 3);
            XDrawLine(d, w, ui->gc, bx + 3, by + 7, bx + 5, by + 10);
            XDrawLine(d, w, ui->gc, bx + 5, by + 10, bx + 10, by + 4);
        }
        clip_rect(ui, 18, 0, g->w - 18, g->h);
        xui_draw_text(ui, w, 18, (g->h - fh) / 2, g->text);
        clip_off(ui);
        break;
    }
    case XUI_COMBO: {
        XSetForeground(d, ui->gc, ui->cFace);
        XFillRectangle(d, w, ui->gc, 0, 0, g->w, g->h);
        box_raised(ui, w, 0, 0, g->w, g->h);
        clip_rect(ui, 4, 3, g->w - 20, g->h - 6);
        xui_draw_text_c(ui, w, 5, (g->h - fh) / 2, g->text,
                        g->sensitive ? ui->cBlack : ui->cDis);
        clip_off(ui);
        int cx = g->w - 12, cy = g->h / 2;
        XSetForeground(d, ui->gc, g->sensitive ? ui->cBlack : ui->cDis);
        XDrawLine(d, w, ui->gc, cx - 4, cy - 2, cx, cy + 2);
        XDrawLine(d, w, ui->gc, cx, cy + 2, cx + 4, cy - 2);
        break;
    }
    case XUI_ENTRY: {
        XSetForeground(d, ui->gc, ui->cWhite);
        XFillRectangle(d, w, ui->gc, 0, 0, g->w, g->h);
        XSetForeground(d, ui->gc, g->focused ? ui->cSel : ui->cGray);
        XDrawRectangle(d, w, ui->gc, 0, 0, g->w - 1, g->h - 1);
        /* 可见文本 */
        char u8buf[4096];
        int pos = 0;
        for (int i = g->escr; i < g->elen && pos < (int)sizeof(u8buf) - 8; i++)
            pos += (int)wcs_to_u8(&g->eb[i], u8buf + pos, 8);
        u8buf[pos] = 0;
        clip_rect(ui, 4, 2, g->w - 8, g->h - 4);
        xui_draw_text(ui, w, 4, (g->h - fh) / 2, u8buf);
        if (g->focused) {
            char pre[256]; char *p = pre;
            int n = MIN(g->ecur - g->escr, 60);
            for (int i = 0; i < n && p - pre < 240; i++)
                p += wcs_to_u8(&g->eb[g->escr + i], p, 8);
            *p = 0;
            int pw = xui_text_w(ui, pre);
            XSetForeground(d, ui->gc, ui->cBlack);
            XDrawLine(d, w, ui->gc, 4 + pw, 3, 4 + pw, g->h - 4);
        }
        clip_off(ui);
        break;
    }
    case XUI_STATUS: {
        XSetForeground(d, ui->gc, ui->cFace);
        XFillRectangle(d, w, ui->gc, 0, 0, g->w, g->h);
        box_sunken(ui, w, 0, 0, g->w, g->h);
        clip_rect(ui, 5, 2, g->w - 10, g->h - 4);
        xui_draw_text(ui, w, 5, (g->h - fh) / 2, g->text);
        clip_off(ui);
        break;
    }
    case XUI_LIST: {
        int rowH = fh + 4;
        int vis = MAX(1, (g->h - rowH) / rowH);
        if (g->top > g->rows - vis) g->top = MAX(0, g->rows - vis);
        int needBar = g->rows > vis;
        int barX = g->w - 12;
        int bodyW = needBar ? g->w - 12 : g->w;
        /* 表头 */
        int cx2 = g->checkMode ? 20 : 0;   /* 勾选模式:行首留 20px 勾选框区 */
        for (int c = 0; c < g->cols; c++) {
            int cwd = needBar && c == g->cols - 1 ? g->colW[c] - 12 : g->colW[c];
            XSetForeground(d, ui->gc, ui->cFace);
            XFillRectangle(d, w, ui->gc, cx2, 0, cwd, rowH);
            box_raised(ui, w, cx2, 0, cwd, rowH);
            if (g->hdr && g->hdr[c]) {
                clip_rect(ui, cx2 + 4, 0, cwd - 6, rowH);
                xui_draw_text(ui, w, cx2 + 4, (rowH - fh) / 2, g->hdr[c]);
                clip_off(ui);
            }
            cx2 += g->colW[c];
        }
        /* 行 */
        XSetForeground(d, ui->gc, ui->cWhite);
        XFillRectangle(d, w, ui->gc, 0, rowH, bodyW, g->h - rowH);
        for (int r = 0; r < vis; r++) {
            int row = g->top + r;
            if (row >= g->rows) break;
            int yy = rowH + r * rowH;
            int selRow = (row == g->sel);
            if (selRow) {
                XSetForeground(d, ui->gc, ui->cSel);
                XFillRectangle(d, w, ui->gc, 0, yy, bodyW, rowH);
            }
            cx2 = g->checkMode ? 20 : 0;
            if (g->checkMode) {        /* 行首勾选框 */
                int bx = 4, by = yy + (rowH - 12) / 2;
                XSetForeground(d, ui->gc, ui->cBlack);
                XDrawRectangle(d, w, ui->gc, bx, by, 12, 12);
                if (g->listChecked && g->listChecked[row]) {
                    XDrawLine(d, w, ui->gc, bx + 2, by + 6, bx + 5, by + 9);
                    XDrawLine(d, w, ui->gc, bx + 5, by + 9, bx + 10, by + 2);
                }
            }
            for (int c = 0; c < g->cols; c++) {
                const char *txt = g->cells[row][c];
                if (txt && txt[0]) {
                    clip_rect(ui, cx2 + 4, yy, g->colW[c] - 6, rowH);
                    xui_draw_text_c(ui, w, cx2 + 4, yy + (rowH - fh) / 2,
                                    txt, selRow ? ui->cSelText : ui->cBlack);
                    clip_off(ui);
                }
                cx2 += g->colW[c];
            }
        }
        /* 滚动条 */
        if (needBar) {
            XSetForeground(d, ui->gc, ui->cBar);
            XFillRectangle(d, w, ui->gc, barX, 0, 12, g->h);
            box_sunken(ui, w, barX, 0, 12, g->h);
            int barH = MAX(20, (g->h - rowH) * vis / g->rows);
            int barY = rowH + (g->h - rowH - barH) * g->top / MAX(1, g->rows - vis);
            XSetForeground(d, ui->gc, ui->cFace);
            XFillRectangle(d, w, ui->gc, barX + 2, barY + 2, 8, barH - 4);
            box_raised(ui, w, barX + 2, barY + 2, 8, barH - 4);
        }
        break;
    }
    }
    XFlush(d);
}

static void wgt_redraw(XuiWgt *g) { if (g->visible) draw_wgt(g->parent->ui, g); }

/* ==================== 创建/通用 API ==================== */

static XuiWgt *wgt_new(XuiWin *p, int type, int x, int y, int w, int h, long evMask)
{
    XUi *ui = p->ui;
    XuiWgt *g = (XuiWgt *)calloc(1, sizeof(XuiWgt));
    if (!g || p->n >= XUI_MAX_WGTS) { free(g); return NULL; }
    g->type = type;
    g->win = XCreateSimpleWindow(ui->dpy, p->win, x, y, (unsigned)w, (unsigned)h,
                                 0, 0, ui->cFace);
    g->parent = p;
    g->x = x; g->y = y; g->w = w; g->h = h;
    g->sensitive = 1; g->visible = 1;
    g->sel = -1;
    if (evMask) XSelectInput(ui->dpy, g->win, evMask);
    p->wgts[p->n++] = g;
    return g;
}

static void wgt_text_set(XuiWgt *g, const char *utf8)
{
    free(g->text);
    g->text = utf8 ? strdup(utf8) : strdup("");
    wgt_redraw(g);
}

XuiWgt *xui_label(XuiWin *p, int x,int y,int w,int h, const char *utf8)
{
    XuiWgt *g = wgt_new(p, XUI_LABEL, x, y, w, h, ExposureMask);
    if (g) g->text = utf8 ? strdup(utf8) : strdup("");
    return g;
}
XuiWgt *xui_button(XuiWin *p, int x,int y,int w,int h, const char *utf8, XuiFn cb, void *ud)
{
    XuiWgt *g = wgt_new(p, XUI_BUTTON, x, y, w, h,
                        ExposureMask | ButtonPressMask | ButtonReleaseMask);
    if (g) { g->text = utf8 ? strdup(utf8) : strdup(""); g->onClick = cb; g->ud = ud; }
    return g;
}
XuiWgt *xui_statusbar(XuiWin *p, int x,int y,int w,int h)
{
    XuiWgt *g = wgt_new(p, XUI_STATUS, x, y, w, h, ExposureMask);
    if (g) g->text = strdup("");
    return g;
}
XuiWgt *xui_check(XuiWin *p, int x,int y,int w,int h, const char *utf8, int checked, XuiFn cb, void *ud)
{
    XuiWgt *g = wgt_new(p, XUI_CHECK, x, y, w, h,
                        ExposureMask | ButtonPressMask | ButtonReleaseMask);
    if (g) { g->text = utf8 ? strdup(utf8) : strdup(""); g->checked = checked; g->onClick = cb; g->ud = ud; }
    return g;
}
XuiWgt *xui_combo(XuiWin *p, int x,int y,int w,int h, XuiFn onPick, void *ud)
{
    XuiWgt *g = wgt_new(p, XUI_COMBO, x, y, w, h,
                        ExposureMask | ButtonPressMask | ButtonReleaseMask);
    if (g) { g->text = strdup(""); g->onClick = onPick; g->ud = ud; g->active = -1; }
    return g;
}
void xui_combo_add(XuiWgt *c, const char *utf8)
{
    char **ni = (char **)realloc(c->items, (size_t)(c->nItems + 1) * sizeof(char *));
    if (!ni) return;
    c->items = ni;
    c->items[c->nItems] = utf8 ? strdup(utf8) : strdup("");
    if (c->active < 0) { c->active = 0; wgt_text_set(c, c->items[0]); }
    c->nItems++;
}
int  xui_combo_active(XuiWgt *c) { return c->active; }
void xui_combo_set_active(XuiWgt *c, int idx)
{
    if (idx < 0 || idx >= c->nItems) return;
    c->active = idx;
    wgt_text_set(c, c->items[idx]);
}

XuiWgt *xui_entry(XuiWin *p, int x,int y,int w,int h, const char *initUtf8)
{
    XuiWgt *g = wgt_new(p, XUI_ENTRY, x, y, w, h,
                        ExposureMask | ButtonPressMask | KeyPressMask | FocusChangeMask);
    if (!g) return NULL;
    g->ecap = 1024;
    g->eb = (wchar_t *)calloc((size_t)g->ecap, sizeof(wchar_t));
    if (initUtf8 && initUtf8[0]) {
        g->elen = (int)u8_to_wcs(initUtf8, g->eb, (size_t)g->ecap - 1);
        g->ecur = g->elen;
    }
    XSetWindowBackground(p->ui->dpy, g->win, 0xFFFFFF);
    if (p->ui->im) {
        g->ic = XCreateIC(p->ui->im, XNInputStyle, XIMPreeditNothing | XIMStatusNothing,
                          XNClientWindow, g->win, XNFocusWindow, g->win, NULL);
    }
    return g;
}

XuiWgt *xui_list_new(XuiWin *p, int x,int y,int w,int h, int nCols, const int *colW)
{
    XuiWgt *g = wgt_new(p, XUI_LIST, x, y, w, h,
                        ExposureMask | ButtonPressMask | ButtonReleaseMask |
                        PointerMotionMask | LeaveWindowMask);
    if (!g) return NULL;
    g->cols = nCols;
    g->colW = (int *)calloc((size_t)nCols, sizeof(int));
    g->hdr  = (char **)calloc((size_t)nCols, sizeof(char *));
    for (int i = 0; i < nCols; i++) g->colW[i] = colW[i];
    g->rows = 0;
    XSetWindowBackground(p->ui->dpy, g->win, 0xFFFFFF);
    return g;
}
void xui_list_cb(XuiWgt *l, XuiListFn onSel, XuiListFn onAct, void *ud)
{ l->onSel = onSel; l->onAct = onAct; l->lud = ud; }

static void list_free_cells(XuiWgt *l)
{
    for (int r = 0; r < l->rows; r++) {
        for (int c = 0; c < l->cols; c++) free(l->cells[r][c]);
        free(l->cells[r]);
    }
    free(l->cells);
    l->cells = NULL;
    l->rows = 0; l->sel = -1; l->top = 0;
}
void xui_list_set_rows(XuiWgt *l, int nRows)
{
    list_free_cells(l);
    free(l->listChecked);             /* 数据重建:勾选清零 */
    l->listChecked = nRows > 0 ? (unsigned char *)calloc((size_t)nRows, 1) : NULL;
    if (nRows > 0) {
        l->cells = (char ***)calloc((size_t)nRows, sizeof(char **));
        for (int r = 0; r < nRows; r++) {
            l->cells[r] = (char **)calloc((size_t)l->cols, sizeof(char *));
            for (int c = 0; c < l->cols; c++) l->cells[r][c] = strdup("");
        }
        l->rows = nRows;
    }
    wgt_redraw(l);
}
void xui_list_set(XuiWgt *l, int row, int col, const char *utf8)
{
    if (row < 0 || row >= l->rows || col < 0 || col >= l->cols) return;
    free(l->cells[row][col]);
    l->cells[row][col] = utf8 ? strdup(utf8) : strdup("");
}

void xui_list_enable_check(XuiWgt *l, int on)
{
    if (l && l->type == XUI_LIST) {
        l->checkMode = on;
        wgt_redraw(l);
    }
}

int xui_list_checked(XuiWgt *l, int row)
{
    return (l && l->type == XUI_LIST && l->listChecked &&
            row >= 0 && row < l->rows) ? l->listChecked[row] : 0;
}
void xui_list_set_header(XuiWgt *l, int col, const char *utf8)
{
    if (col < 0 || col >= l->cols) return;
    free(l->hdr[col]);
    l->hdr[col] = utf8 ? strdup(utf8) : strdup("");
    wgt_redraw(l);
}
int  xui_list_sel(XuiWgt *l) { return l->sel; }
void xui_list_sel_set(XuiWgt *l, int row)
{
    if (row >= l->rows) row = l->rows - 1;
    l->sel = row;
    if (row >= 0) {
        int rowH = xui_font_h(l->parent->ui) + 4;
        int vis = MAX(1, (l->h - rowH) / rowH);
        if (row < l->top) l->top = row;
        if (row >= l->top + vis) l->top = row - vis + 1;
    }
    wgt_redraw(l);
}

void xui_set_text(XuiWgt *w, const char *utf8)
{
    if (w->type == XUI_ENTRY) {
        w->elen = 0; w->ecur = 0; w->escr = 0;
        if (utf8 && utf8[0] && w->eb) {
            w->elen = (int)u8_to_wcs(utf8, w->eb, (size_t)w->ecap - 1);
            w->ecur = w->elen;
        }
        wgt_redraw(w);
    } else wgt_text_set(w, utf8);
}
const char *xui_entry_text(XuiWgt *e)
{
    static char buf[4096];
    int pos = 0;
    for (int i = 0; i < e->elen && pos < (int)sizeof(buf) - 8; i++)
        pos += (int)wcs_to_u8(&e->eb[i], buf + pos, 8);
    buf[pos] = 0;
    return buf;
}
int  xui_checked(XuiWgt *c) { return c->checked; }
void xui_set_sensitive(XuiWgt *w, int on) { w->sensitive = on; wgt_redraw(w); }
void xui_show(XuiWgt *w, int on)
{
    w->visible = on;
    if (on) XMapWindow(w->parent->ui->dpy, w->win);
    else    XUnmapWindow(w->parent->ui->dpy, w->win);
}
void xui_set_focus(XuiWgt *e)
{
    XuiWin *p = e->parent;
    if (p->focus && p->focus != e && p->focus->type == XUI_ENTRY) {
        p->focus->focused = 0;
        if (p->focus->ic) XUnsetICFocus(p->focus->ic);
        wgt_redraw(p->focus);
    }
    p->focus = e;
    if (e->type == XUI_ENTRY) {
        e->focused = 1;
        if (e->ic) XSetICFocus(e->ic);
        XSetInputFocus(p->ui->dpy, e->win, RevertToParent, CurrentTime);
        wgt_redraw(e);
    }
}

/* ==================== 窗口 ==================== */

XuiWin *xui_window_new(XUi *ui, int w, int h, const char *titleUtf8)
{
    if (ui->nWins >= XUI_MAX_WINS) return NULL;
    XuiWin *wn = (XuiWin *)calloc(1, sizeof(XuiWin));
    if (!wn) return NULL;
    wn->ui = ui;
    int x = MAX(0, (DisplayWidth(ui->dpy, ui->scr) - w) / 2);
    int y = MAX(0, (DisplayHeight(ui->dpy, ui->scr) - h) / 3);
    XSetWindowAttributes wa;
    wa.background_pixel = ui->cFace;
    wa.event_mask = ExposureMask | StructureNotifyMask | KeyPressMask |
                    ButtonPressMask | ButtonReleaseMask;
    wn->win = XCreateWindow(ui->dpy, ui->root, x, y, (unsigned)w, (unsigned)h, 1,
                            CopyFromParent, InputOutput, CopyFromParent,
                            CWBackPixel | CWEventMask, &wa);
    set_title_utf8(ui->dpy, wn->win, titleUtf8 ? titleUtf8 : "xui");
    Atom prot = ui->aDelWin;
    XSetWMProtocols(ui->dpy, wn->win, &prot, 1);
    XSizeHints sh;
    memset(&sh, 0, sizeof(sh));
    sh.flags = PMinSize | PMaxSize | USPosition;
    sh.min_width = sh.max_width = w;
    sh.min_height = sh.max_height = h;
    sh.x = x; sh.y = y;
    XSetWMNormalHints(ui->dpy, wn->win, &sh);
    ui->wins[ui->nWins++] = wn;
    return wn;
}
void xui_window_show(XuiWin *w)
{
    XMapWindow(w->ui->dpy, w->win);
    XFlush(w->ui->dpy);
    w->shown = 1;
}
void xui_window_set_key(XuiWin *w, XuiKeyFn fn, void *ud) { w->keyFn = fn; w->keyUd = ud; }
void xui_window_set_close(XuiWin *w, XuiCloseFn fn, void *ud) { w->closeFn = fn; w->closeUd = ud; }
void xui_window_set_default(XuiWin *w, XuiWgt *okBtn, XuiWgt *cancelBtn)
{ w->defBtn = okBtn; w->cancelBtn = cancelBtn; }
void xui_window_exit(XuiWin *w, int result) { w->modalResult = result; w->running = 0; }

static void win_free(XUi *ui, XuiWin *w)
{
    XDestroyWindow(ui->dpy, w->win);
    for (int i = 0; i < ui->nWins; i++)
        if (ui->wins[i] == w) {
            memmove(&ui->wins[i], &ui->wins[i + 1],
                    (size_t)(ui->nWins - i - 1) * sizeof(XuiWin *));
            ui->nWins--;
            break;
        }
    for (int j = 0; j < w->n; j++) {
        if (w->wgts[j]->ic) XDestroyIC(w->wgts[j]->ic);
        free(w->wgts[j]->text);
        free(w->wgts[j]->hdr);
        if (w->wgts[j]->type == XUI_ENTRY) free(w->wgts[j]->eb);
        if (w->wgts[j]->items) {
            for (int k = 0; k < w->wgts[j]->nItems; k++) free(w->wgts[j]->items[k]);
            free(w->wgts[j]->items);
        }
        free(w->wgts[j]->colW);
        free(w->wgts[j]);
    }
    free(w);
    XFlush(ui->dpy);
}

/* ==================== Entry 键盘 ==================== */

static void entry_insert(XuiWgt *e, const char *utf8)
{
    wchar_t tmp[128];
    size_t n = u8_to_wcs(utf8, tmp, 127);
    if ((size_t)e->elen + n >= (size_t)e->ecap) {
        int nc = e->ecap * 2 + 64;
        wchar_t *nb = (wchar_t *)realloc(e->eb, (size_t)nc * sizeof(wchar_t));
        if (!nb) return;
        e->eb = nb; e->ecap = nc;
    }
    memmove(&e->eb[e->ecur + (int)n], &e->eb[e->ecur],
            (size_t)(e->elen - e->ecur) * sizeof(wchar_t));
    for (size_t i = 0; i < n; i++) e->eb[e->ecur + (int)i] = tmp[i];
    e->ecur += (int)n; e->elen += (int)n;
    e->eb[e->elen] = 0;
}
static void entry_del(XuiWgt *e, int at)
{
    if (at < 0 || at >= e->elen) return;
    memmove(&e->eb[at], &e->eb[at + 1], (size_t)(e->elen - at - 1) * sizeof(wchar_t));
    e->elen--;
    if (e->ecur > at) e->ecur--;
    e->eb[e->elen] = 0;
}
static void entry_adjust(XuiWgt *e)
{
    XUi *ui = e->parent->ui;
    if (e->ecur < e->escr) e->escr = e->ecur;
    for (;;) {
        if (e->ecur <= e->escr) break;
        char pre[256]; char *p = pre;
        int n = MIN(e->ecur - e->escr, 60);
        for (int i = 0; i < n && p - pre < 240; i++)
            p += wcs_to_u8(&e->eb[e->escr + i], p, 8);
        *p = 0;
        if (xui_text_w(ui, pre) <= e->w - 12) break;
        e->escr++;
    }
    wgt_redraw(e);
}
/* 返回1=已处理;Enter/Esc/Tab 返回0交给窗口层 */
static int entry_key(XUi *ui, XuiWgt *e, KeySym ks, const char *chars, unsigned state)
{
    if (ks == XK_BackSpace) { if (e->ecur > 0) { entry_del(e, e->ecur - 1); entry_adjust(e); } return 1; }
    if (ks == XK_Delete)    { entry_del(e, e->ecur); entry_adjust(e); return 1; }
    if (ks == XK_Left)      { if (e->ecur > 0) e->ecur--; entry_adjust(e); return 1; }
    if (ks == XK_Right)     { if (e->ecur < e->elen) e->ecur++; entry_adjust(e); return 1; }
    if (ks == XK_Home)      { e->ecur = 0; entry_adjust(e); return 1; }
    if (ks == XK_End)       { e->ecur = e->elen; entry_adjust(e); return 1; }
    if ((state & ControlMask) && (ks == XK_v || ks == XK_V)) {
        char *clip = xui_clip_get(ui);
        if (clip) { entry_insert(e, clip); free(clip); entry_adjust(e); }
        return 1;
    }
    if ((state & ControlMask) && (ks == XK_a || ks == XK_A)) { e->ecur = 0; entry_adjust(e); return 1; }
    if (chars && chars[0] && !(state & (ControlMask | Mod1Mask))) {
        entry_insert(e, chars);
        entry_adjust(e);
        return 1;
    }
    return 0;
}

/* ==================== 键盘分发 ==================== */

static void fire_click(XuiWgt *g)
{
    if (g && g->sensitive && g->onClick) g->onClick(g, g->ud);
}

static void on_keypress(XUi *ui, XEvent *ev)
{
    KeySym ks = 0; char buf[64]; int n = 0;
    XuiWin *win = find_win(ui, ev->xkey.window);
    if (!win && ev->xkey.window == ui->hotWin) {
        XLookupString(&ev->xkey, buf, sizeof(buf) - 1, &ks, NULL);
        if (ui->hotFn) ui->hotFn(ui, ks, ev->xkey.state, ui->hotUd);
        return;
    }
    if (!win) return;
    XuiWgt *f = win->focus;
    if (f && f->type == XUI_ENTRY && f->ic) {
        Status st = 0;
        n = XmbLookupString(f->ic, &ev->xkey, buf, sizeof(buf) - 1, &ks, &st);
        if (n > 0) buf[n] = 0; else buf[0] = 0;
    } else {
        n = XLookupString(&ev->xkey, buf, sizeof(buf) - 1, &ks, NULL);
        if (n > 0) buf[n] = 0; else buf[0] = 0;
    }
    if (f && f->type == XUI_ENTRY) {
        if (entry_key(ui, f, ks, buf, ev->xkey.state)) return;
    }
    if (ks == XK_Return && win->defBtn) { fire_click(win->defBtn); return; }
    if (ks == XK_Escape) {
        if (win->cancelBtn) fire_click(win->cancelBtn);
        else if (win->running) xui_window_exit(win, -1);
        return;
    }
    if (ks == XK_Tab) {
        int start = 0;
        for (int k = 0; k < win->n; k++)
            if (win->wgts[k] == win->focus) start = k;
        for (int i = 1; i <= win->n; i++) {
            XuiWgt *c = win->wgts[(start + i) % win->n];
            if (c->visible && c->sensitive && c->type == XUI_ENTRY) { xui_set_focus(c); return; }
        }
        return;
    }
    if (win->keyFn) win->keyFn(win, ks, ev->xkey.state, win->keyUd);
}

/* ==================== combo 弹出 ==================== */

static void combo_popup(XuiWgt *g)
{
    XUi *ui = g->parent->ui;
    Display *d = ui->dpy;
    int rowH = xui_font_h(ui) + 6;
    int visN = MIN(g->nItems, 16);
    if (g->nItems <= 0) return;
    int ph = visN * rowH + 2;
    int px = g->x, py = g->y + g->h;
    Window child;
    XTranslateCoordinates(d, g->parent->win, ui->root, px, py, &px, &py, &child);
    if (py + ph > DisplayHeight(d, ui->scr)) py = MAX(0, py - g->h - ph);
    XSetWindowAttributes wa;
    wa.override_redirect = True;
    wa.background_pixel = ui->cFace;
    wa.event_mask = ExposureMask | ButtonPressMask | ButtonReleaseMask | KeyPressMask;
    Window pop = XCreateWindow(d, ui->root, px, py, (unsigned)g->w, (unsigned)ph, 1,
                               CopyFromParent, InputOutput, CopyFromParent,
                               CWOverrideRedirect | CWBackPixel | CWEventMask, &wa);
    XMapWindow(d, pop);
    XRaiseWindow(d, pop);
    XFlush(d);
    XGrabPointer(d, pop, False, ButtonPressMask | ButtonReleaseMask,
                 GrabModeAsync, GrabModeAsync, None, None, CurrentTime);
    XGrabKeyboard(d, pop, True, GrabModeAsync, GrabModeAsync, CurrentTime);
    int done = 0, pick = -1;
    while (!done && !ui->quitAll) {
        XEvent ev;
        XNextEvent(d, &ev);
        if (XFilterEvent(&ev, None)) continue;
        if (ev.xany.window != pop) continue;   /* 短命弹窗:其余事件丢弃 */
        if (ev.type == Expose) {
            XSetForeground(d, ui->gc, ui->cFace);
            XFillRectangle(d, pop, ui->gc, 0, 0, g->w, ph);
            for (int i = 0; i < visN; i++) {
                int yy = i * rowH;
                if (i == g->active) {
                    XSetForeground(d, ui->gc, ui->cSel);
                    XFillRectangle(d, pop, ui->gc, 0, yy, g->w, rowH);
                }
                clip_rect(ui, 2, yy, g->w - 4, rowH);
                xui_draw_text_c(ui, pop, 6, yy + (rowH - xui_font_h(ui)) / 2, g->items[i],
                                i == g->active ? ui->cSelText : ui->cBlack);
                clip_off(ui);
            }
            XSetForeground(d, ui->gc, ui->cGray);
            XDrawRectangle(d, pop, ui->gc, 0, 0, (unsigned)g->w - 1, (unsigned)ph - 1);
            XFlush(d);
        } else if (ev.type == ButtonPress) {
            if (ev.xbutton.x < 0 || ev.xbutton.x >= g->w ||
                ev.xbutton.y < 0 || ev.xbutton.y >= visN * rowH)
                done = 1;
        } else if (ev.type == ButtonRelease) {
            int row = ev.xbutton.y / rowH;
            if (ev.xbutton.x >= 0 && ev.xbutton.x < g->w && row >= 0 && row < visN)
                pick = row;
            done = 1;
        } else if (ev.type == KeyPress) {
            KeySym ks;
            XLookupString(&ev.xkey, NULL, 0, &ks, NULL);
            if (ks == XK_Escape) done = 1;
        }
    }
    XUngrabKeyboard(d, CurrentTime);
    XUngrabPointer(d, CurrentTime);
    XDestroyWindow(d, pop);
    XFlush(d);
    if (pick >= 0 && pick != g->active) {
        g->active = pick;
        wgt_text_set(g, g->items[pick]);
        if (g->onClick) g->onClick(g, g->ud);
    }
}

/* ==================== 指针分发 ==================== */

static void on_button(XUi *ui, XEvent *ev)
{
    int press = (ev->type == ButtonPress);
    XuiWin *win = NULL;
    XuiWgt *g = find_wgt(ui, ev->xany.window, &win);
    if (!g) return;
    if (!g->sensitive) return;
    int x = ev->xbutton.x, y = ev->xbutton.y;
    switch (g->type) {
    case XUI_BUTTON:
        if (press) {
            g->pressed = 1; wgt_redraw(g);
            XGrabPointer(ui->dpy, g->win, False, ButtonReleaseMask,
                         GrabModeAsync, GrabModeAsync, None, None, CurrentTime);
        } else {
            g->pressed = 0; wgt_redraw(g);
            XUngrabPointer(ui->dpy, CurrentTime);
            if (x >= 0 && x < g->w && y >= 0 && y < g->h) fire_click(g);
        }
        break;
    case XUI_CHECK:
        if (press) { g->checked = !g->checked; wgt_redraw(g); fire_click(g); }
        break;
    case XUI_COMBO:
        if (press) combo_popup(g);
        break;
    case XUI_ENTRY:
        if (press) {
            xui_set_focus(g);
            int best = g->escr, bx = 4;
            for (int i = g->escr; i <= g->elen; i++) {
                char pre[128]; char *p = pre;
                for (int k = g->escr; k < i && p - pre < 110; k++)
                    p += wcs_to_u8(&g->eb[k], p, 8);
                *p = 0;
                int wpx = 4 + xui_text_w(ui, pre);
                if (ABS(wpx - x) < ABS(bx - x)) { best = i; bx = wpx; }
            }
            g->ecur = best;
            entry_adjust(g);
        }
        break;
    case XUI_LIST: {
        int rowH = xui_font_h(ui) + 4;
        int vis = MAX(1, (g->h - rowH) / rowH);
        int needBar = g->rows > vis;
        if (press && needBar && x >= g->w - 12) {
            g->dragBar = 1;
            XGrabPointer(ui->dpy, g->win, False, ButtonReleaseMask | PointerMotionMask,
                         GrabModeAsync, GrabModeAsync, None, None, CurrentTime);
            int yy = MAX(0, y - rowH);
            g->top = yy * g->rows / MAX(1, g->h - rowH);
            if (g->top > g->rows - vis) g->top = MAX(0, g->rows - vis);
            wgt_redraw(g);
            return;
        }
        if (ev->type == MotionNotify && g->dragBar) {
            int yy = MAX(0, y - rowH);
            g->top = yy * g->rows / MAX(1, g->h - rowH);
            if (g->top > g->rows - vis) g->top = MAX(0, g->rows - vis);
            wgt_redraw(g);
            return;
        }
        if (!press) {
            if (g->dragBar) { g->dragBar = 0; XUngrabPointer(ui->dpy, CurrentTime); }
            return;
        }
        int btn = ev->xbutton.button;
        if (btn == 4 || btn == 5) {
            g->top += (btn == 4 ? -3 : 3);
            if (g->top > g->rows - vis) g->top = MAX(0, g->rows - vis);
            if (g->top < 0) g->top = 0;
            wgt_redraw(g);
            return;
        }
        int row = (y - rowH) / rowH + g->top;
        if (row >= 0 && row < g->rows && y >= rowH) {
            if (g->checkMode && x >= 0 && x < 20) {   /* 点勾选框=切换选区 */
                if (g->listChecked) g->listChecked[row] = !g->listChecked[row];
                wgt_redraw(g);
                return;
            }
            int dbl = (row == g->lastClickRow &&
                       ev->xbutton.time - g->lastClickTime < 400);
            g->lastClickRow = row; g->lastClickTime = ev->xbutton.time;
            g->sel = row;
            wgt_redraw(g);
            if (g->onSel) g->onSel(g, row, g->lud);
            if (dbl && g->onAct) g->onAct(g, row, g->lud);
        }
        break;
    }
    default: break;
    }
}

/* ==================== 主分发/循环 ==================== */

static int is_input_event(int type)
{
    return type == ButtonPress || type == ButtonRelease ||
           type == KeyPress || type == KeyRelease || type == MotionNotify;
}

static void dispatch(XUi *ui, XEvent *ev)
{
    if (XFilterEvent(ev, None)) return;
    int t = ev->type;
    /* 模态期间:其它窗口的输入被丢弃(Expose 等非输入事件照常处理) */
    if (ui->modalWin && is_input_event(t)) {
        XuiWin *evWin = find_win(ui, ev->xany.window);
        if (!evWin) {
            XuiWin *w2 = NULL;
            if (find_wgt(ui, ev->xany.window, &w2)) evWin = w2;
        }
        if (evWin && evWin != ui->modalWin) return;
    }
    switch (t) {
    case Expose: {
        if (ev->xexpose.count > 0) break;
        XuiWin *win = NULL;
        XuiWgt *g = find_wgt(ui, ev->xexpose.window, &win);
        if (g) draw_wgt(ui, g);
        break;
    }
    case MapNotify: {
        XuiWin *w = find_win(ui, ev->xmap.window);
        if (w) w->mapped = 1;
        break;
    }
    case ButtonPress:
    case ButtonRelease:
    case MotionNotify:
        on_button(ui, ev);
        break;
    case KeyPress:
        on_keypress(ui, ev);
        break;
    case ClientMessage: {
        if (ev->xclient.message_type == ui->aDelWin &&
            ev->xclient.data.l[0] == (long)ui->aDelWin) {
            XuiWin *win = find_win(ui, ev->xclient.window);
            if (!win) {
                XuiWin *w2 = NULL;
                find_wgt(ui, ev->xclient.window, &w2);
                win = w2;
            }
            if (win) {
                if (win->running) { xui_window_exit(win, -1); break; }
                if (win->closeFn) { if (win->closeFn(win, win->closeUd)) xui_quit(ui); }
                else xui_quit(ui);
            }
        } else if (ev->xclient.message_type == ui->aClip ||
                   ev->xclient.message_type == ui->aPrim) {
            if (ev->xclient.type == SelectionRequest)   /* 恒真,类型即结构 */
                clip_on_request(ui, &ev->xselectionrequest);
        }
        break;
    }
    case SelectionClear:
        free(ui->clipText); ui->clipText = NULL;
        break;
    case SelectionNotify:
        ui->clipDone = 1;
        break;
    case MappingNotify:
        XRefreshKeyboardMapping(&ev->xmapping);
        break;
    default: break;
    }
}

void xui_pump(XUi *ui, int timeoutMs)
{
    struct timespec t0; now_ms(&t0);
    for (;;) {
        while (XPending(ui->dpy)) {
            XEvent ev;
            XNextEvent(ui->dpy, &ev);
            dispatch(ui, &ev);
            if (ui->quitAll) return;
        }
        if (timeoutMs >= 0) {
            struct timespec t1; now_ms(&t1);
            if (ms_between(&t0, &t1) >= timeoutMs) return;
        }
        fd_set rf;
        FD_ZERO(&rf);
        int xfd = ConnectionNumber(ui->dpy);
        int maxfd = xfd;
        FD_SET(xfd, &rf);
        if (ui->fdWake[0] >= 0) {
            FD_SET(ui->fdWake[0], &rf);
            if (ui->fdWake[0] > maxfd) maxfd = ui->fdWake[0];
        }
        struct timeval tv;
        tv.tv_sec = 0; tv.tv_usec = 20000;
        int r = select(maxfd + 1, &rf, NULL, NULL, timeoutMs < 0 ? NULL : &tv);
        if (r > 0 && ui->fdWake[0] >= 0 && FD_ISSET(ui->fdWake[0], &rf)) {
            char tmp[64];
            while (read(ui->fdWake[0], tmp, sizeof(tmp)) > 0) {}
        }
        if (timeoutMs >= 0) {
            struct timespec t1; now_ms(&t1);
            if (ms_between(&t0, &t1) >= timeoutMs) return;
        }
    }
}

int xui_window_run(XuiWin *w)
{
    XUi *ui = w->ui;
    Display *d = ui->dpy;
    if (!w->shown) xui_window_show(w);
    /* 等 map 完成(窗口必须 viewable 才能 SetInputFocus) */
    struct timespec t0; now_ms(&t0);
    while (!w->mapped && !ui->quitAll) {
        xui_pump(ui, 20);
        struct timespec t1; now_ms(&t1);
        if (ms_between(&t0, &t1) > 1000) break;   /* WM 未响应也继续 */
    }
    XuiWin *prevModal = ui->modalWin;
    ui->modalWin = w;
    w->running = 1;
    w->modalResult = -1;
    if (w->focus && w->focus->type == XUI_ENTRY)
        XSetInputFocus(d, w->focus->win, RevertToParent, CurrentTime);
    else
        XSetInputFocus(d, w->win, RevertToParent, CurrentTime);
    while (w->running && !ui->quitAll)
        xui_pump(ui, -1);
    int result = w->modalResult;
    ui->modalWin = prevModal;
    win_free(ui, w);
    /* 焦点还给上一个模态或主窗口 */
    XuiWin *top = ui->modalWin ? ui->modalWin :
                  (ui->nWins > 0 ? ui->wins[ui->nWins - 1] : NULL);
    if (top) {
        if (top->focus && top->focus->type == XUI_ENTRY)
            XSetInputFocus(d, top->focus->win, RevertToParent, CurrentTime);
        else
            XSetInputFocus(d, top->win, RevertToParent, CurrentTime);
    }
    XFlush(d);
    return result;
}

/* ==================== 全局热键 ==================== */

int xui_grab_keys(XUi *ui, KeySym ks, unsigned mods)
{
    KeyCode kc = XKeysymToKeycode(ui->dpy, ks);
    if (!kc) return -1;
    unsigned variants[4] = { mods, mods | LockMask, mods | Mod2Mask, mods | LockMask | Mod2Mask };
    int ok = 0;
    for (int i = 0; i < 4; i++) {
        XGrabKey(ui->dpy, kc, variants[i], ui->hotWin, False,
                 GrabModeAsync, GrabModeAsync);
        ok++;
    }
    XFlush(ui->dpy);
    return 0;
}
void xui_set_hotkey_fn(XUi *ui, XuiHotFn fn, void *ud) { ui->hotFn = fn; ui->hotUd = ud; }

void xui_ungrab_keys(XUi *ui, KeySym ks, unsigned mods)
{
    KeyCode kc = XKeysymToKeycode(ui->dpy, ks);
    if (!kc) return;
    unsigned variants[4] = { mods, mods | LockMask, mods | Mod2Mask, mods | LockMask | Mod2Mask };
    for (int i = 0; i < 4; i++)
        XUngrabKey(ui->dpy, kc, variants[i], ui->hotWin);
    XFlush(ui->dpy);
}

void xui_set_theme(XUi *ui, unsigned long rgb)
{
    char spec[16];
    snprintf(spec, sizeof(spec), "#%06lx", rgb & 0xFFFFFF);
    ui->cTheme = named_color(ui, spec);
    ui->cSel = ui->cTheme;                /* 列表选中/焦点框随主题 */
    XFlush(ui->dpy);
    for (int i = 0; i < ui->nWins; i++)
        if (ui->wins[i] && ui->wins[i]->win)
            XClearArea(ui->dpy, ui->wins[i]->win, 0, 0, 0, 0, True);
    XFlush(ui->dpy);
}

XuiWgt *xui_button_col(XuiWin *p, int x,int y,int w,int h,
                       unsigned long rgb, XuiFn cb, void *ud)
{
    XuiWgt *g = xui_button(p, x, y, w, h, "", cb, ud);
    if (g) { g->useBg = 1; g->bgCol = rgb; }
    return g;
}

/* ==================== 消息框 ==================== */

typedef struct { XuiWin *w; int result; } AlertCtx;

static void alert_btn_cb(XuiWgt *g, void *ud)
{
    AlertCtx *c = (AlertCtx *)ud;
    (void)g;
    xui_window_exit(c->w, c->result);
}

int xui_alert(XUi *ui, XuiWin *parent, int icon, const char *textUtf8,
              int nBtns, const char *const *btnUtf8)
{
    (void)parent;
    if (nBtns < 1) nBtns = 1;
    if (nBtns > 8) nBtns = 8;
    /* 计算尺寸 */
    int maxW = 0, lines = 1;
    for (const char *p = textUtf8 ? textUtf8 : ""; *p; p++)
        if (*p == '\n') lines++;
    char *txt = strdup(textUtf8 ? textUtf8 : "");
    char *save = NULL;
    for (char *line = strtok_r(txt, "\n", &save); line; line = strtok_r(NULL, "\n", &save)) {
        int w = xui_text_w(ui, line);
        if (w > maxW) maxW = w;
    }
    free(txt);
    int btnW = 0;
    for (int i = 0; i < nBtns; i++) btnW += xui_text_w(ui, btnUtf8[i]) + 34;
    int tw = MAX(360, MAX(maxW + 60, btnW + 40));
    int th = 32 + lines * (xui_font_h(ui) + 8) + 58;
    XuiWin *w = xui_window_new(ui, tw, th,
                               icon == 1 ? "\xe9\x94\x99\xe8\xaf\xaf" : "\xe6\x8f\x90\xe7\xa4\xba");
    if (!w) return -1;
    /* 文本 */
    char *txt2 = strdup(textUtf8 ? textUtf8 : "");
    char *save2 = NULL;
    int yy = 22;
    for (char *line = strtok_r(txt2, "\n", &save2); line; line = strtok_r(NULL, "\n", &save2)) {
        xui_label(w, 28, yy, tw - 40, xui_font_h(ui) + 6, line);
        yy += xui_font_h(ui) + 8;
    }
    free(txt2);
    /* 按钮 */
    AlertCtx ctx[8];
    int bx = (tw - btnW) / 2;
    XuiWgt *defB = NULL, *cancelB = NULL;
    for (int i = 0; i < nBtns; i++) {
        ctx[i].w = w; ctx[i].result = i;
        int bw = xui_text_w(ui, btnUtf8[i]) + 28;
        XuiWgt *b = xui_button(w, bx, th - 46, bw, 32, btnUtf8[i], alert_btn_cb, &ctx[i]);
        if (i == 0) defB = b;
        if (i == nBtns - 1 && nBtns > 1) cancelB = b;
        bx += bw + 6;
    }
    xui_window_set_default(w, defB, cancelB);
    int r = xui_window_run(w);
    return r;
}

/* ==================== 文件选择 ==================== */

typedef struct {
    XuiWin *w;
    XUi *ui;
    int isSave;
    char cur[PATH_MAX];
    const char *filter;
    char *outPath;              /* 确定按钮回调中组装 */
    XuiWgt *list, *name, *pathLbl;
} FileDlg;

static int ext_match(const char *filter, const char *name)
{
    if (!filter) return 1;
    const char *dot = strrchr(name, '.');
    if (!dot) return 0;
    dot++;
    char tmp[128];
    snprintf(tmp, sizeof(tmp), "%s", filter);
    char *save = NULL;
    for (char *t = strtok_r(tmp, ",", &save); t; t = strtok_r(NULL, ",", &save)) {
        while (*t == ' ' || *t == '.') t++;
        if (t[0] && strcasecmp(t, dot) == 0) return 1;
    }
    return 0;
}

static void fdlg_refresh(FileDlg *fd)
{
    struct dirent **eps = NULL;
    int n = scandir(fd->cur, &eps, NULL, alphasort);
    int cap = n > 0 ? n : 0, cnt = 0;
    char (*rows)[NAME_MAX + 16] = cap ? malloc((size_t)cap * sizeof(*rows)) : NULL;
    if (n >= 0 && rows) {
        for (int i = 0; i < n; i++) {
            const char *nm = eps[i]->d_name;
            if (nm[0] == '.' && nm[1] == 0) continue;
            if (nm[0] == '.' && strcmp(nm, "..") != 0) continue;
            char full[PATH_MAX + NAME_MAX + 4];
            snprintf(full, sizeof(full), "%s/%s", fd->cur, nm);
            struct stat st;
            int isDir = (stat(full, &st) == 0 && S_ISDIR(st.st_mode));
            if (!isDir && !ext_match(fd->filter, nm)) continue;
            snprintf(rows[cnt], sizeof(rows[0]), "%s%s", nm, isDir ? "/" : "");
            cnt++;
        }
    }
    for (int i = 0; i < n; i++) free(eps[i]);
    free(eps);
    xui_list_set_rows(fd->list, cnt);
    for (int i = 0; i < cnt; i++) xui_list_set(fd->list, i, 0, rows[i]);
    free(rows);
    char shown[PATH_MAX + 32];
    snprintf(shown, sizeof(shown), "\xe7\x9b\xae\xe5\xbd\x95: %s", fd->cur);   /* 目录: */
    xui_set_text(fd->pathLbl, shown);
}

static void fdlg_enter(FileDlg *fd, const char *name)
{
    /* name 形如 "dir/" 或 "file";组装或进入目录 */
    char clean[NAME_MAX + 16];
    snprintf(clean, sizeof(clean), "%s", name && name[0] ? name : "");
    size_t n = strlen(clean);
    if (n && clean[n - 1] == '/') clean[n - 1] = 0;
    if (!clean[0]) return;
    if (strcmp(clean, "..") == 0) {
        char *slash = strrchr(fd->cur, '/');
        if (slash && slash != fd->cur) *slash = 0;
        xui_set_text(fd->name, "");
        fdlg_refresh(fd);
        return;
    }
    char full[PATH_MAX + NAME_MAX + 4];
    snprintf(full, sizeof(full), "%s/%s", fd->cur, clean);
    struct stat st;
    if (stat(full, &st) == 0 && S_ISDIR(st.st_mode)) {
        snprintf(fd->cur, sizeof(fd->cur), "%s", full);
        xui_set_text(fd->name, "");
        fdlg_refresh(fd);
        return;
    }
    free(fd->outPath);
    fd->outPath = strdup(full);
    xui_window_exit(fd->w, 1);
}

static void fdlg_on_sel(XuiWgt *l, int row, void *ud)
{
    FileDlg *fd = (FileDlg *)ud;
    if (row >= 0 && row < l->rows && l->cells[row][0]) {
        size_t n = strlen(l->cells[row][0]);
        char nm[NAME_MAX + 16];
        snprintf(nm, sizeof(nm), "%s", l->cells[row][0]);
        if (n && nm[n - 1] == '/') nm[n - 1] = 0;
        xui_set_text(fd->name, nm);
    }
}
static void fdlg_on_act(XuiWgt *l, int row, void *ud)
{
    FileDlg *fd = (FileDlg *)ud;
    if (row >= 0 && row < l->rows && l->cells[row][0])
        fdlg_enter(fd, l->cells[row][0]);
}
static void fdlg_btn_ok(XuiWgt *g, void *ud)
{
    FileDlg *fd = (FileDlg *)ud; (void)g;
    fdlg_enter(fd, xui_entry_text(fd->name));
}
static void fdlg_btn_up(XuiWgt *g, void *ud)
{
    FileDlg *fd = (FileDlg *)ud; (void)g;
    char *slash = strrchr(fd->cur, '/');
    if (slash && slash != fd->cur) *slash = 0;
    xui_set_text(fd->name, "");
    fdlg_refresh(fd);
}
static void fdlg_btn_cancel(XuiWgt *g, void *ud)
{
    FileDlg *fd = (FileDlg *)ud; (void)g;
    xui_window_exit(fd->w, 0);
}

char *xui_filesel(XUi *ui, XuiWin *parent, int isSave, const char *titleUtf8,
                  const char *filterCsv, const char *defNameUtf8)
{
    (void)parent;
    FileDlg fd;
    memset(&fd, 0, sizeof(fd));
    fd.ui = ui; fd.isSave = isSave; fd.filter = filterCsv;
    if (!getcwd(fd.cur, sizeof(fd.cur))) snprintf(fd.cur, sizeof(fd.cur), "/");
    XuiWin *w = xui_window_new(ui, 620, 460, titleUtf8 ? titleUtf8 : "");
    if (!w) return NULL;
    fd.w = w;
    fd.pathLbl = xui_label(w, 10, 8, 600, 24, "");
    fd.list = xui_list_new(w, 10, 36, 600, 330, 1, (int[]){598});
    xui_list_set_header(fd.list, 0, "\xe6\x96\x87\xe4\xbb\xb6");     /* 文件 */
    xui_list_cb(fd.list, fdlg_on_sel, fdlg_on_act, &fd);
    xui_label(w, 10, 374, 70, 24, "\xe6\x96\x87\xe4\xbb\xb6\xe5\x90\x8d:");  /* 文件名: */
    fd.name = xui_entry(w, 84, 372, 526, 26, defNameUtf8 ? defNameUtf8 : "");
    XuiWgt *bOk = xui_button(w, 388, 410, 96, 32,
                             isSave ? "\xe4\xbf\x9d\xe5\xad\x98" : "\xe6\x89\x93\xe5\xbc\x80",
                             fdlg_btn_ok, &fd);
    xui_button(w, 492, 410, 60, 32, "\xe4\xb8\x8a\xe7\xba\xa7", fdlg_btn_up, &fd);
    XuiWgt *bCancel = xui_button(w, 558, 410, 52, 32,
                                 "\xe5\x8f\x96\xe6\xb6\x88", fdlg_btn_cancel, &fd);
    xui_window_set_default(w, bOk, bCancel);
    xui_set_focus(fd.name);
    fdlg_refresh(&fd);
    int r = xui_window_run(w);      /* 窗口及控件在此销毁 */
    if (r == 1 && fd.outPath) return fd.outPath;
    free(fd.outPath);
    return NULL;
}

/* ==================== 生命周期 ==================== */

Display *xui_dpy(XUi *ui) { return ui->dpy; }
int xui_should_quit(XUi *ui) { return ui->quitAll; }
XFontSet xui_fs(XUi *ui) { return ui->fs; }
GC       xui_gc(XUi *ui) { return ui->gc; }
unsigned long xui_black(XUi *ui) { return ui->cBlack; }
void xui_quit(XUi *ui) { ui->quitAll = 1; xui_wake(ui); }
void xui_wake(XUi *ui)
{
    if (ui->fdWake[1] >= 0) {
        char c = 1;
        ssize_t r = write(ui->fdWake[1], &c, 1);
        (void)r;
    }
}

XUi *xui_open(void)
{
    setlocale(LC_ALL, "");
    if (!XSupportsLocale()) setlocale(LC_ALL, "C");
    XSetLocaleModifiers("");
    XUi *ui = (XUi *)calloc(1, sizeof(XUi));
    if (!ui) return NULL;
    ui->fdWake[0] = ui->fdWake[1] = -1;
    ui->dpy = XOpenDisplay(NULL);
    if (!ui->dpy) { free(ui); return NULL; }
    XSetErrorHandler(xui_err_handler);
    ui->scr = DefaultScreen(ui->dpy);
    ui->root = RootWindow(ui->dpy, ui->scr);
    ui->cmap = DefaultColormap(ui->dpy, ui->scr);
    char **miss = NULL; int nMiss = 0; char *def = NULL;
    ui->fs = XCreateFontSet(ui->dpy, "-*-*-medium-r-normal--14-*-*-*-*-*-*-*",
                            &miss, &nMiss, &def);
    if (!ui->fs)
        ui->fs = XCreateFontSet(ui->dpy, "fixed", &miss, &nMiss, &def);
    if (miss) XFreeStringList(miss);
    if (!ui->fs) { XCloseDisplay(ui->dpy); free(ui); return NULL; }
    ui->fse = XExtentsOfFontSet(ui->fs);
    ui->gc = XCreateGC(ui->dpy, ui->root, 0, NULL);
    ui->cBlack = BlackPixel(ui->dpy, ui->scr);
    ui->cWhite = WhitePixel(ui->dpy, ui->scr);
    ui->cFace  = named_color(ui, "#d6d2ca");
    ui->cGray  = named_color(ui, "#84827e");
    ui->cDark  = named_color(ui, "#6e6c68");
    ui->cDis   = named_color(ui, "#9c9a96");
    ui->cSel   = named_color(ui, "#316ac5");
    ui->cTheme = ui->cSel;                /* 默认主题=选中蓝 */
    ui->cSelText = named_color(ui, "#ffffff");
    ui->cBar   = named_color(ui, "#c8c4bc");
    ui->aDelWin   = XInternAtom(ui->dpy, "WM_DELETE_WINDOW", False);
    ui->aUtf8     = XInternAtom(ui->dpy, "UTF8_STRING", False);
    ui->aClip     = XInternAtom(ui->dpy, "CLIPBOARD", False);
    ui->aPrim     = XA_PRIMARY;
    ui->aTargets  = XInternAtom(ui->dpy, "TARGETS", False);
    ui->aIncr     = XInternAtom(ui->dpy, "INCR", False);
    ui->aText     = XInternAtom(ui->dpy, "TEXT", False);
    ui->aCompound = XInternAtom(ui->dpy, "COMPOUND_TEXT", False);
    ui->aTextPlain= XInternAtom(ui->dpy, "text/plain;charset=utf-8", False);
    ui->im = XOpenIM(ui->dpy, NULL, NULL, NULL);
    if (pipe(ui->fdWake) == 0) {
        for (int i = 0; i < 2; i++) {
            int fl = fcntl(ui->fdWake[i], F_GETFL, 0);
            if (fl >= 0) fcntl(ui->fdWake[i], F_SETFL, fl | O_NONBLOCK);
        }
    } else {
        ui->fdWake[0] = ui->fdWake[1] = -1;
    }
    /* 隐藏服务窗口(不 map):剪贴板 owner + 热键接收 */
    XSetWindowAttributes wa;
    wa.override_redirect = True;
    wa.event_mask = 0;
    ui->clipWin = XCreateWindow(ui->dpy, ui->root, -10, -10, 1, 1, 0,
                                CopyFromParent, InputOutput, CopyFromParent,
                                CWOverrideRedirect, &wa);
    XSelectInput(ui->dpy, ui->clipWin, PropertyChangeMask);
    ui->hotWin = XCreateWindow(ui->dpy, ui->root, -10, -10, 1, 1, 0,
                               CopyFromParent, InputOutput, CopyFromParent,
                               CWOverrideRedirect, &wa);
    XSelectInput(ui->dpy, ui->hotWin, KeyPressMask);
    XFlush(ui->dpy);
    return ui;
}

void xui_close(XUi *ui)
{
    if (!ui) return;
    while (ui->nWins > 0)
        win_free(ui, ui->wins[ui->nWins - 1]);
    if (ui->fdWake[0] >= 0) close(ui->fdWake[0]);
    if (ui->fdWake[1] >= 0) close(ui->fdWake[1]);
    free(ui->clipText);
    free(ui->clipRecv);
    if (ui->im) XCloseIM(ui->im);
    if (ui->gc) XFreeGC(ui->dpy, ui->gc);
    if (ui->fs) XFreeFontSet(ui->dpy, ui->fs);
    XCloseDisplay(ui->dpy);
    free(ui);
}
