/* ============================================================
 * main.c - 点击助手 Linux 版主界面(纯 Xlib / xui)
 * 与 Windows 版共享 src/core 全部核心逻辑,零第三方依赖
 * (仅 libX11 + libXtst,任何 X11 桌面自带)
 * ============================================================ */
#define _DEFAULT_SOURCE
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/keysym.h>
#include <X11/cursorfont.h>
#include <pthread.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <time.h>
#include <unistd.h>
#include <locale.h>
#include <wchar.h>
#include "ac_defs.h"
#include "engine.h"
#include "ac_keys.h"
#include "sheet.h"
#include "import.h"
#include "u8.h"
#include "platform_x11.h"
#include "findimg.h"
#include "xui.h"

#undef MIN
#undef MAX
#undef ABS
#define MIN(a,b) ((a)<(b)?(a):(b))
#define MAX(a,b) ((a)>(b)?(a):(b))
#define ABS(a)   ((a)<0?-(a):(a))

static XUi *g_ui;
static XuiWin *g_win;
static Task g_task;
static XuiWgt *g_list, *g_status;
static XuiWgt *g_ed_loops, *g_ed_gap, *g_ed_cd, *g_ed_jit;
static XuiWgt *g_btn_start, *g_btn_stop;
static int g_running = 0;
static pthread_t g_thread;

/* ================= 跨线程剪贴板通道 =================
 * 执行线程 -> 主线程:xui_wake 唤醒,主循环 clip_pump 写 selection */

static pthread_mutex_t g_clipMu = PTHREAD_MUTEX_INITIALIZER;
static char *g_clipPending = NULL;
static volatile int g_clipReq = 0, g_clipDone = 0;

int ac_x11_clipboard_set(const char *utf8)
{
    if (!g_ui) return 0;
    pthread_mutex_lock(&g_clipMu);
    free(g_clipPending);
    g_clipPending = strdup(utf8);
    g_clipReq = 1; g_clipDone = 0;
    pthread_mutex_unlock(&g_clipMu);
    xui_wake(g_ui);
    for (int i = 0; i < 500 && !g_clipDone; i++)   /* 最多 1s */
        usleep(2000);
    return g_clipDone;
}

static void clip_pump(void)
{
    if (!g_clipReq) return;
    pthread_mutex_lock(&g_clipMu);
    char *txt = g_clipPending; g_clipPending = NULL; g_clipReq = 0;
    pthread_mutex_unlock(&g_clipMu);
    if (txt) { xui_clip_set(g_ui, txt); free(txt); }
    g_clipDone = 1;
}

/* ================= 辅助 ================= */

static void show_err(const char *msg)
{ xui_alert(g_ui, g_win, 1, msg, 1, (const char *[]){ "\xe7\xa1\xae\xe5\xae\x9a" }); }

static void show_info(const char *msg)
{ xui_alert(g_ui, g_win, 0, msg, 1, (const char *[]){ "\xe7\xa1\xae\xe5\xae\x9a" }); }

/* Linux: char* 路径(UTF-8) -> 核心的 wchar_t 接口 */
static unsigned char *read_file_all_from_utf8(const char *path, size_t *outLen)
{
    if (!path) return NULL;
    wchar_t wpath[4096];
    u8_to_wcs(path, wpath, 4095);
    return read_file_all(wpath, outLen);
}

/* ================= 状态栏 / 列表 ================= */

static void set_status(const char *fmt, ...)
{
    char buf[512];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    xui_set_text(g_status, buf);
}

static void refresh_list(void)
{
    xui_list_set_rows(g_list, g_task.count);
    for (int i = 0; i < g_task.count; i++) {
        Step *s = &g_task.steps[i];
        char idx[16], typeU8[64], coordStr[96], cntStr[32], text[AC_TEXT_MAX * 3 + 64], delayStr[48];
        snprintf(idx, sizeof(idx), "%d", i + 1);
        wcs_to_u8(act_type_name(s->type), typeU8, sizeof(typeU8) - 1);
        switch (s->type) {
        case ACT_DRAG:
            snprintf(coordStr, sizeof(coordStr), "(%d,%d)\xe2\x86\x92(%d,%d)", s->x, s->y, s->x2, s->y2);
            break;
        case ACT_CLICK: case ACT_DBLCLICK: case ACT_MULTI:
        case ACT_RCLICK: case ACT_MCLICK: case ACT_SCROLL:
            snprintf(coordStr, sizeof(coordStr), "(%d,%d)", s->x, s->y);
            break;
        case ACT_FINDIMG:
            snprintf(coordStr, sizeof(coordStr), s->w > 0 ?
                     "\xe5\x8c\xba\xe5\x9f\x9f(%d,%d)" :          /* 区域(x,y) */
                     "\xe5\x85\xa8\xe5\xb1\x8f", s->x, s->y);      /* 全屏 */
            break;
        default:
            snprintf(coordStr, sizeof(coordStr), "\xe2\x80\x94");   /* — */
            break;
        }
        switch (s->type) {
        case ACT_MULTI:  snprintf(cntStr, sizeof(cntStr), "\xc3\x97%d", s->count > 0 ? s->count : 1); break;
        case ACT_SCROLL: snprintf(cntStr, sizeof(cntStr), "%d \xe6\xa0\xbc", s->scroll); break;
        default:         snprintf(cntStr, sizeof(cntStr), "\xe2\x80\x94"); break;
        }
        if (s->type == ACT_DRAG)
            snprintf(text, sizeof(text), "\xe2\x86\x92 \xe7\xbb\x88\xe7\x82\xb9(%d, %d)", s->x2, s->y2);
        else if (s->type == ACT_FINDIMG && s->imgB64 && s->imgB64[0]) {
            int tw2 = 0, th2 = 0;
            if (findimg_unpack(s->imgB64, NULL, NULL, NULL, NULL, &tw2, &th2))
                snprintf(text, sizeof(text),
                         "\xe6\xa8\xa1\xe6\x9d\xbf %dx%d", tw2, th2);   /* 模板 WxH */
            else
                text[0] = 0;
        }
        else
            wcs_to_u8(s->text, text, sizeof(text) - 1);
        snprintf(delayStr, sizeof(delayStr), "%d / %d", s->delayBefore, s->delayAfter);
        xui_list_set(g_list, i, 0, idx);
        xui_list_set(g_list, i, 1, typeU8);
        xui_list_set(g_list, i, 2, coordStr);
        xui_list_set(g_list, i, 3, cntStr);
        xui_list_set(g_list, i, 4, text);
        xui_list_set(g_list, i, 5, delayStr);
        xui_list_set(g_list, i, 6, (s->type == ACT_TEXT && s->clearFirst) ?
                     "\xe6\x98\xaf" : "");                          /* 是 */
    }
    if (!g_running)
        set_status("\xe5\x85\xb1 %d \xe4\xb8\xaa\xe6\xad\xa5\xe9\xaa\xa4", g_task.count);  /* 共 N 个步骤 */
}

static int selected_index(void) { return xui_list_sel(g_list); }

/* ================= 执行 ================= */

static volatile int g_progLoop = -1, g_progStep = -1;

static void engine_progress(int loop, int stepIdx, void *ud)
{
    (void)ud;
    g_progLoop = loop; g_progStep = stepIdx;   /* 主循环轮询读取 */
}

static void *run_thread(void *arg)
{
    (void)arg;
    static TaskBook book;            /* 单任务包装(Linux 版单列表) */
    book.tasks[0] = g_task;
    engine_run(&book, 0, x11_platform(), engine_progress, NULL);
    g_stop_flag = 2;                 /* 2=已完成,由 finish_check 收尾 */
    return NULL;
}

static void finish_check(void)
{
    static int lastLoop = -1, lastStep = -1;
    if (g_running) {
        if (g_progStep >= 0 && (g_progStep != lastStep || g_progLoop != lastLoop)) {
            lastStep = g_progStep; lastLoop = g_progLoop;
            set_status("\xe8\xbf\x90\xe8\xa1\x8c\xe4\xb8\xad:\xe7\xac\xac %d \xe8\xbd\xae,"
                       "\xe7\xac\xac %d \xe6\xad\xa5 / \xe5\x85\xb1 %d \xe6\xad\xa5 \xe2\x80\x94\xe2\x80\x94 "
                       "\xe5\x81\x9c\xe6\xad\xa2:Ctrl+F12",
                       g_progLoop, g_progStep + 1, g_task.count);
        }
        if (g_stop_flag == 1)
            set_status("\xe6\xad\xa3\xe5\x9c\xa8\xe5\x81\x9c\xe6\xad\xa2\xe2\x80\xa6"
                       "(\xe7\xad\x89\xe5\xbe\x85\xe5\xbd\x93\xe5\x89\x8d\xe5\x8a\xa8\xe4\xbd\x9c\xe5\xae\x8c\xe6\x88\x90)");
    }
    if (g_stop_flag == 2) {
        g_stop_flag = 0;
        g_running = 0;
        pthread_join(g_thread, NULL);
        xui_set_sensitive(g_btn_start, 1);
        xui_set_sensitive(g_btn_stop, 0);
        set_status("\xe6\x89\xa7\xe8\xa1\x8c\xe7\xbb\x93\xe6\x9d\x9f(\xe5\x8f\xaf\xe5\x86\x8d\xe6\x8c\x89 F6 \xe5\xbc\x80\xe5\xa7\x8b)");
        refresh_list();
        g_progLoop = g_progStep = -1;
        lastLoop = lastStep = -1;
    }
}

static int ed_val(XuiWgt *ed, int defVal)
{
    const char *s = xui_entry_text(ed);
    if (!s || !s[0]) return defVal;
    return atoi(s);
}

static void start_run(void)
{
    if (g_running) return;
    if (g_task.count == 0) {
        show_info("\xe6\xad\xa5\xe9\xaa\xa4\xe5\x88\x97\xe8\xa1\xa8\xe4\xb8\xba\xe7\xa9\xba,"
                  "\xe8\xaf\xb7\xe5\x85\x88\xe6\xb7\xbb\xe5\x8a\xa0\xe6\xad\xa5\xe9\xaa\xa4"
                  "\xe6\x88\x96\xe5\xaf\xbc\xe5\x85\xa5 Excel\xe3\x80\x82");
        return;
    }
    g_task.loops = ed_val(g_ed_loops, 1);
    g_task.loopGap = ed_val(g_ed_gap, 0);
    g_task.startCountdown = ed_val(g_ed_cd, 0);
    g_task.jitter = ed_val(g_ed_jit, 0);

    g_stop_flag = 0;
    g_running = 1;
    xui_set_sensitive(g_btn_start, 0);
    xui_set_sensitive(g_btn_stop, 1);
    if (pthread_create(&g_thread, NULL, run_thread, NULL) != 0) {
        g_running = 0;
        xui_set_sensitive(g_btn_start, 1);
        xui_set_sensitive(g_btn_stop, 0);
        show_err("\xe6\x97\xa0\xe6\xb3\x95\xe5\x88\x9b\xe5\xbb\xba\xe6\x89\xa7\xe8\xa1\x8c\xe7\xba\xbf\xe7\xa8\x8b\xe3\x80\x82");
        return;
    }
    set_status(g_task.startCountdown > 0 ?
               "\xe5\x80\x92\xe8\xae\xa1\xe6\x97\xb6\xe4\xb8\xad\xe2\x80\xa6" :
               "\xe8\xbf\x90\xe8\xa1\x8c\xe4\xb8\xad \xe2\x80\x94\xe2\x80\x94 \xe5\x81\x9c\xe6\xad\xa2:Ctrl+F12");
}

static void stop_run(void)
{
    if (!g_running) return;
    g_stop_flag = 1;
    set_status("\xe6\xad\xa3\xe5\x9c\xa8\xe5\x81\x9c\xe6\xad\xa2\xe2\x80\xa6");
}

/* ================= 取点覆盖窗(纯 X11) ================= */

typedef struct { int x, y, w, h; } PickRect;

static unsigned long pick_color(const char *hex)
{
    XColor c, s;
    Display *d = xui_dpy(g_ui);
    if (XAllocNamedColor(d, DefaultColormap(d, DefaultScreen(d)), hex, &c, &s))
        return c.pixel;
    return WhitePixel(d, DefaultScreen(d));
}

/* 进入全屏取点,返回 1=取到 0=取消 */
static int pick_screen_point(PickRect *out)
{
    Display *d = xui_dpy(g_ui);
    int scr = DefaultScreen(d);
    Window root = RootWindow(d, scr);
    int W = DisplayWidth(d, scr), H = DisplayHeight(d, scr);

    /* 抓屏并变暗(65% 亮度)作为覆盖窗背景 */
    Pixmap pm = None;
    XImage *im = XGetImage(d, root, 0, 0, (unsigned)W, (unsigned)H, AllPlanes, ZPixmap);
    if (im) {
        if (im->bits_per_pixel == 32 || im->bits_per_pixel == 24) {
            int bpp = im->bits_per_pixel / 8;
            unsigned char *p = (unsigned char *)im->data;
            for (long i = 0; i < (long)W * H; i++) {
                unsigned char *q = p + i * bpp;
                q[0] = (unsigned char)(q[0] * 13 / 20);
                q[1] = (unsigned char)(q[1] * 13 / 20);
                q[2] = (unsigned char)(q[2] * 13 / 20);
            }
        }
        pm = XCreatePixmap(d, root, (unsigned)W, (unsigned)H, (unsigned)im->depth);
        GC mgc = XCreateGC(d, root, 0, NULL);
        XPutImage(d, pm, mgc, im, 0, 0, 0, 0, (unsigned)W, (unsigned)H);
        XFreeGC(d, mgc);
        XDestroyImage(im);
    }

    XSetWindowAttributes wa;
    wa.override_redirect = True;
    wa.background_pixmap = pm != None ? pm : ParentRelative;
    wa.event_mask = ExposureMask | ButtonPressMask | ButtonReleaseMask |
                    PointerMotionMask | KeyPressMask;
    Window ov = XCreateWindow(d, root, 0, 0, (unsigned)W, (unsigned)H, 0,
                              CopyFromParent, InputOutput, CopyFromParent,
                              CWOverrideRedirect | CWBackPixmap | CWEventMask, &wa);
    XMapWindow(d, ov);
    XRaiseWindow(d, ov);
    XFlush(d);
    Cursor cur = XCreateFontCursor(d, XC_crosshair);
    XGrabPointer(d, ov, False,
                 ButtonPressMask | ButtonReleaseMask | PointerMotionMask,
                 GrabModeAsync, GrabModeAsync, None, cur, CurrentTime);
    XGrabKeyboard(d, ov, True, GrabModeAsync, GrabModeAsync, CurrentTime);

    unsigned long red = pick_color("#ff2020"), green = pick_color("#20e020"),
                  yellow = pick_color("#ffff20"), white = pick_color("#ffffff");
    int cx = W / 2, cy = H / 2, px = 0, py = 0, dragging = 0, done = 0, ok = 0;
    int rx = 0, ry = 0, rw = 0, rh = 0;

    while (!done) {
        XEvent ev;
        XNextEvent(d, &ev);
        if (ev.type == Expose) {
            GC gc = xui_gc(g_ui);
            XSetForeground(d, gc, red);
            XDrawLine(d, ov, gc, cx, 0, cx, H);
            XDrawLine(d, ov, gc, 0, cy, W, cy);
            if (dragging) {
                XSetForeground(d, gc, green);
                int x1 = MIN(px, cx), y1 = MIN(py, cy);
                XDrawRectangle(d, ov, gc, x1, y1,
                               (unsigned)ABS(cx - px), (unsigned)ABS(cy - py));
            }
            char buf[160];
            if (dragging)
                snprintf(buf, sizeof(buf),
                         "\xe8\xb5\xb7\xe7\x82\xb9(%d, %d)  \xe5\xa4\xa7\xe5\xb0\x8f %d x %d \xe2\x80\x94\xe2\x80\x94 \xe6\x9d\xbe\xe5\xbc\x80\xe7\xa1\xae\xe5\xae\x9a",
                         px, py, ABS(cx - px), ABS(cy - py));
            else
                snprintf(buf, sizeof(buf),
                         "\xe5\xbd\x93\xe5\x89\x8d\xe5\x9d\x90\xe6\xa0\x87:(%d, %d)", cx, cy);
            XSetForeground(d, gc, white);
            XFillRectangle(d, ov, gc, cx + 13, cy + 16,
                           (unsigned)xui_text_w(g_ui, buf) + 8, 24);
            xui_draw_text_c(g_ui, ov, cx + 17, cy + 20, buf, yellow);
            XSetForeground(d, gc, white);
            XFillRectangle(d, ov, gc, 8, 6, 420, 26);
            xui_draw_text_c(g_ui, ov, 12, 11,
                            "\xe5\x8d\x95\xe5\x87\xbb=\xe5\x8f\x96\xe7\x82\xb9   \xe6\x8b\x96\xe5\x8a\xa8=\xe5\x8f\x96\xe5\x8c\xba\xe5\x9f\x9f   Esc/\xe5\x8f\xb3\xe9\x94\xae=\xe5\x8f\x96\xe6\xb6\x88",
                            red);
            XFlush(d);
        } else if (ev.type == MotionNotify) {
            cx = ev.xmotion.x; cy = ev.xmotion.y;
            XClearArea(d, ov, 0, 0, 0, 0, True);   /* 触发 Expose 重绘 */
        } else if (ev.type == ButtonPress) {
            if (ev.xbutton.button == 3) { ok = 0; done = 1; }
            else if (ev.xbutton.button == 1) {
                px = ev.xbutton.x; py = ev.xbutton.y;
                dragging = 1;
            }
        } else if (ev.type == ButtonRelease) {
            if (ev.xbutton.button == 1 && dragging) {
                dragging = 0;
                int dx = ABS(ev.xbutton.x - px), dy = ABS(ev.xbutton.y - py);
                if (dx < 5 && dy < 5) {
                    rx = px; ry = py; rw = 0; rh = 0;
                } else {
                    rx = MIN(px, ev.xbutton.x); ry = MIN(py, ev.xbutton.y);
                    rw = dx; rh = dy;
                }
                ok = 1; done = 1;
            }
        } else if (ev.type == KeyPress) {
            KeySym ks;
            XLookupString(&ev.xkey, NULL, 0, &ks, NULL);
            if (ks == XK_Escape) { ok = 0; done = 1; }
        }
    }
    XUngrabKeyboard(d, CurrentTime);
    XUngrabPointer(d, CurrentTime);
    XDestroyWindow(d, ov);
    if (pm != None) XFreePixmap(d, pm);
    XFreeCursor(d, cur);
    XFlush(d);
    if (out) { out->x = rx; out->y = ry; out->w = rw; out->h = rh; }
    return ok;
}

/* ================= 步骤编辑对话框 ================= */

typedef struct {
    XuiWin *dlg;
    XuiWgt *type, *x, *y, *count, *interval, *text, *scroll;
    XuiWgt *x2, *y2, *db, *da, *clear;
    XuiWgt *lb_xy, *lb_cnt, *lb_text, *lb_scroll, *lb_xy2, *lb_delay;
    XuiWgt *lb_wh, *w, *h;              /* 找图:搜索区宽高 */
    XuiWgt *btn_tpl, *tplinfo;          /* 找图:框选模板 */
    XuiWgt *lb_miss, *miss;             /* 找图:未找到跳转 */
    char *tplB64;
    int tplW, tplH;
    Step *s;
} EditBox;

static const struct { int type; const char *cn; } EDIT_TYPES[] = {
    { ACT_CLICK,   "\xe5\x8d\x95\xe5\x87\xbb(\xe5\xb7\xa6\xe9\x94\xae)" },      /* 单击(左键) */
    { ACT_DBLCLICK,"\xe5\x8f\x8c\xe5\x87\xbb" },                                 /* 双击 */
    { ACT_MULTI,   "\xe5\xa4\x9a\xe5\x87\xbb(\xe8\x87\xaa\xe5\xae\x9a\xe4\xb9\x89\xe6\xac\xa1\xe6\x95\xb0)" }, /* 多击 */
    { ACT_RCLICK,  "\xe5\x8f\xb3\xe5\x87\xbb" },                                 /* 右击 */
    { ACT_MCLICK,  "\xe4\xb8\xad\xe5\x87\xbb(\xe6\xbb\x9a\xe8\xbd\xae\xe9\x94\xae)" }, /* 中击 */
    { ACT_TEXT,    "\xe6\x96\x87\xe6\x9c\xac\xe8\xbe\x93\xe5\x85\xa5" },         /* 文本输入 */
    { ACT_KEY,     "\xe6\x8c\x89\xe9\x94\xae / \xe7\xbb\x84\xe5\x90\x88\xe9\x94\xae" }, /* 按键/组合键 */
    { ACT_WAIT,    "\xe7\xad\x89\xe5\xbe\x85" },                                 /* 等待 */
    { ACT_SCROLL,  "\xe6\xbb\x9a\xe8\xbd\xae" },                                 /* 滚轮 */
    { ACT_DRAG,    "\xe9\xbc\xa0\xe6\xa0\x87\xe6\x8b\x96\xe5\x8a\xa8" },         /* 鼠标拖动 */
    { ACT_FINDIMG, "\xe6\x89\xbe\xe5\x9b\xbe" },                                 /* 找图 */
};
#define EDIT_TYPE_N ((int)(sizeof(EDIT_TYPES) / sizeof(EDIT_TYPES[0])))

static void edit_apply_type(EditBox *eb)
{
    int type = EDIT_TYPES[xui_combo_active(eb->type)].type;
    int isClick = (type == ACT_CLICK || type == ACT_DBLCLICK || type == ACT_MULTI ||
                   type == ACT_RCLICK || type == ACT_MCLICK);
    int multi = type == ACT_MULTI, scroll = type == ACT_SCROLL, drag = type == ACT_DRAG;
    int text = (type == ACT_TEXT || type == ACT_KEY);
    int findimg = (type == ACT_FINDIMG);
    xui_show(eb->lb_xy, isClick || scroll || drag || findimg);
    xui_show(eb->x, isClick || scroll || drag || findimg);
    xui_show(eb->y, isClick || scroll || drag || findimg);
    xui_show(eb->lb_cnt, multi || findimg);
    xui_show(eb->count, multi || findimg);
    xui_show(eb->interval, multi || findimg);
    xui_show(eb->lb_text, text);
    xui_show(eb->text, text);
    xui_show(eb->clear, type == ACT_TEXT);
    xui_show(eb->lb_scroll, scroll);
    xui_show(eb->scroll, scroll);
    xui_show(eb->lb_xy2, drag);
    xui_show(eb->x2, drag);
    xui_show(eb->y2, drag);
    /* 找图:搜索区/模板/未找到跳转 */
    xui_show(eb->lb_wh, findimg);
    xui_show(eb->w, findimg);
    xui_show(eb->h, findimg);
    xui_show(eb->btn_tpl, findimg);
    xui_show(eb->tplinfo, findimg);
    xui_show(eb->lb_miss, findimg);
    xui_show(eb->miss, findimg);
    xui_set_text(eb->lb_delay, type == ACT_WAIT ?
                 "\xe7\xad\x89\xe5\xbe\x85\xe6\x97\xb6\xe9\x95\xbf(\xe6\xaf\xab\xe7\xa7\x92):" :   /* 等待时长 */
                 "\xe5\x89\x8d\xe5\xbb\xb6\xe6\x97\xb6 / \xe5\x90\x8e\xe5\xbb\xb6\xe6\x97\xb6(ms):"); /* 前延时/后延时 */
}

static void edit_on_type(XuiWgt *w, void *ud) { (void)w; edit_apply_type((EditBox *)ud); }

typedef struct { EditBox *eb; XuiWgt *ex, *ey; } PickTarget;

static void edit_on_pick(XuiWgt *w, void *ud)
{
    PickTarget *t = (PickTarget *)ud; (void)w;
    PickRect r;
    if (pick_screen_point(&r)) {
        char b[32];
        snprintf(b, sizeof(b), "%d", r.x); xui_set_text(t->ex, b);
        snprintf(b, sizeof(b), "%d", r.y); xui_set_text(t->ey, b);
    }
}

/* 找图:全屏拖框截取模板图像(灰度打包) */
static void edit_on_picktpl(XuiWgt *w, void *ud)
{
    EditBox *eb = (EditBox *)ud; (void)w;
    PickRect r;
    if (!pick_screen_point(&r)) return;
    if (r.w < 2 || r.h < 2) {
        show_info("\xe8\xaf\xb7\xe6\x8b\x96\xe5\x8a\xa8\xe6\xa1\x86\xe9\x80\x89\xe4\xb8\x80\xe5\x9d\x97\xe5\x9b\xbe\xe5\x83\x8f\xe4\xbd\x9c\xe4\xb8\xba\xe6\xa8\xa1\xe6\x9d\xbf"
                  "(\xe5\x8d\x95\xe5\x87\xbb\xe6\x97\xa0\xe6\x95\x88)\xe3\x80\x82");   /* 请拖动框选一块图像作为模板(单击无效)。 */
        return;
    }
    int ow = 0, oh = 0;
    unsigned char *gray = x_grab_gray(r.x, r.y, r.w, r.h, &ow, &oh);
    if (!gray) {
        show_err("\xe6\x8a\x93\xe5\x8f\x96\xe5\xb1\x8f\xe5\xb9\x95\xe5\x9b\xbe\xe5\x83\x8f\xe5\xa4\xb1\xe8\xb4\xa5\xe3\x80\x82");   /* 抓取屏幕图像失败。 */
        return;
    }
    char *packed = findimg_pack(atoi(xui_entry_text(eb->w)),
                                atoi(xui_entry_text(eb->h)),
                                atoi(xui_entry_text(eb->miss)),
                                gray, ow, oh);
    free(gray);
    if (!packed) {
        show_err("\xe6\xa8\xa1\xe6\x9d\xbf\xe8\xbf\x87\xe5\xa4\xa7(\xe4\xb8\x8a\xe9\x99\x90\xe7\xba\xa6 128x128 \xe5\x83\x8f\xe7\xb4\xa0)\xe3\x80\x82");  /* 模板过大 */
        return;
    }
    free(eb->tplB64);
    eb->tplB64 = packed;
    eb->tplW = ow;
    eb->tplH = oh;
    char ti[48];
    snprintf(ti, sizeof(ti), "\xe5\xb7\xb2\xe6\xa1\x86\xe9\x80\x89 %dx%d", ow, oh);   /* 已框选 */
    xui_set_text(eb->tplinfo, ti);
}

static void edit_on_ok(XuiWgt *w, void *ud)
{
    EditBox *eb = (EditBox *)ud; (void)w;
    Step *s = eb->s;
    int t = xui_combo_active(eb->type);
    if (t < 0 || t >= EDIT_TYPE_N) t = 0;
    s->type = EDIT_TYPES[t].type;
    s->x = atoi(xui_entry_text(eb->x));
    s->y = atoi(xui_entry_text(eb->y));
    s->count = atoi(xui_entry_text(eb->count));
    s->interval = atoi(xui_entry_text(eb->interval));
    s->x2 = atoi(xui_entry_text(eb->x2));
    s->y2 = atoi(xui_entry_text(eb->y2));
    s->scroll = atoi(xui_entry_text(eb->scroll));
    s->delayBefore = atoi(xui_entry_text(eb->db));
    s->delayAfter = atoi(xui_entry_text(eb->da));
    s->clearFirst = xui_checked(eb->clear) ? 1 : 0;
    u8_to_wcs(xui_entry_text(eb->text), s->text, AC_TEXT_MAX - 1);
    if (s->type == ACT_FINDIMG) {
        s->w = atoi(xui_entry_text(eb->w));
        s->h = atoi(xui_entry_text(eb->h));
        if (s->w < 0) s->w = 0;
        if (s->h < 0) s->h = 0;
        s->ifColor = 0;
        s->ifTol = atoi(xui_entry_text(eb->interval));
        s->missJump = atoi(xui_entry_text(eb->miss));
        free(s->imgB64);
        s->imgB64 = eb->tplB64 ? strdup(eb->tplB64) : NULL;
        if (!s->imgB64) {
            show_info("\xe8\xaf\xb7\xe5\x85\x88\xe7\x82\xb9\xe3\x80\x8c\xe6\xa1\x86\xe9\x80\x89\xe6\xa8\xa1\xe6\x9d\xbf\xe3\x80\x8d"
                      "\xe6\x88\xaa\xe5\x8f\x96\xe8\xa6\x81\xe6\x9f\xa5\xe6\x89\xbe\xe7\x9a\x84\xe5\x9b\xbe\xe5\x83\x8f\xe3\x80\x82"); /* 请先点「框选模板」截取要查找的图像。 */
            return;                     /* 不关闭对话框 */
        }
    } else {
        s->missJump = 0;
    }
    xui_window_exit(eb->dlg, 1);
}
static void edit_on_cancel(XuiWgt *w, void *ud)
{
    EditBox *eb = (EditBox *)ud; (void)w;
    xui_window_exit(eb->dlg, 0);
}

/* 编辑步骤对话框,返回 1=确定 */
static int edit_step_dialog(Step *s, int isNew)
{
    XuiWin *dlg = xui_window_new(g_ui, 520, 470,
                                 isNew ? "\xe6\xb7\xbb\xe5\x8a\xa0\xe6\xad\xa5\xe9\xaa\xa4"
                                       : "\xe7\xbc\x96\xe8\xbe\x91\xe6\xad\xa5\xe9\xaa\xa4");
    if (!dlg) return 0;
    EditBox eb;
    memset(&eb, 0, sizeof(eb));
    eb.dlg = dlg; eb.s = s;

    char xs[32], ys[32], cs[32], is[32], ss[32], x2s[32], y2s[32], dbs[32], das[32];
    char ws[32], hs[32], missS[32];
    char textU8[AC_TEXT_MAX * 3 + 8];
    textU8[0] = 0;
    if (s->text[0]) wcs_to_u8(s->text, textU8, sizeof(textU8) - 1);
    snprintf(xs, sizeof(xs), "%d", s->x);
    snprintf(ys, sizeof(ys), "%d", s->y);
    snprintf(cs, sizeof(cs), "%d", s->count > 0 ? s->count : 1);
    snprintf(is, sizeof(is), "%d", s->interval > 0 ? s->interval : 20);
    snprintf(ss, sizeof(ss), "%d", s->scroll != 0 ? s->scroll : 3);
    snprintf(x2s, sizeof(x2s), "%d", s->x2);
    snprintf(y2s, sizeof(y2s), "%d", s->y2);
    snprintf(dbs, sizeof(dbs), "%d", s->delayBefore);
    snprintf(das, sizeof(das), "%d", s->delayAfter);
    snprintf(ws, sizeof(ws), "%d", s->w);
    snprintf(hs, sizeof(hs), "%d", s->h);
    snprintf(missS, sizeof(missS), "%d", s->missJump);
    char tplInit[48];
    tplInit[0] = 0;
    if (s->type == ACT_FINDIMG && s->imgB64 && s->imgB64[0]) {
        int tw2 = 0, th2 = 0;
        if (findimg_unpack(s->imgB64, NULL, NULL, NULL, NULL, &tw2, &th2)) {
            eb.tplB64 = strdup(s->imgB64);
            eb.tplW = tw2;
            eb.tplH = th2;
            snprintf(tplInit, sizeof(tplInit),
                     "\xe5\xb7\xb2\xe6\xa1\x86\xe9\x80\x89 %dx%d", tw2, th2);   /* 已框选 */
        }
    }
    if (!tplInit[0])
        snprintf(tplInit, sizeof(tplInit),
                 "\xe6\x9c\xaa\xe6\xa1\x86\xe9\x80\x89");                        /* 未框选 */

    int L = 8, W1 = 120, EH = 26;     /* 左标签x, 标签宽, 控件高 */
    xui_label(dlg, L, 14, W1, EH, "\xe5\x8a\xa8\xe4\xbd\x9c\xe7\xb1\xbb\xe5\x9e\x8b:");   /* 动作类型: */
    eb.type = xui_combo(dlg, L + W1 + 6, 12, 180, EH, edit_on_type, &eb);
    for (int i = 0; i < EDIT_TYPE_N; i++) xui_combo_add(eb.type, EDIT_TYPES[i].cn);
    for (int i = 0; i < EDIT_TYPE_N; i++)
        if (EDIT_TYPES[i].type == s->type) { xui_combo_set_active(eb.type, i); break; }

    static PickTarget txy, txy2;
    txy.eb = &eb; txy2.eb = &eb;
    xui_button(dlg, 434, 12, 80, EH, "\xe5\xb1\x8f\xe5\xb9\x95\xe5\x8f\x96\xe7\x82\xb9", edit_on_pick, &txy);  /* 屏幕取点 */

    int y = 48;
    eb.lb_xy = xui_label(dlg, L, y + 2, W1, EH, "\xe5\x9d\x90\xe6\xa0\x87 X / Y:");      /* 坐标 X/Y: */
    txy.ex = eb.x = xui_entry(dlg, L + W1 + 6, y, 70, EH, xs);
    txy.ey = eb.y = xui_entry(dlg, L + W1 + 82, y, 70, EH, ys);

    y += 36;
    eb.lb_wh = xui_label(dlg, L, y + 2, W1, EH,
                         "\xe6\x90\x9c\xe7\xb4\xa2\xe5\x8c\xba W/H(0=\xe5\x85\xa8\xe5\xb1\x8f):");  /* 搜索区 W/H(0=全屏): */
    eb.w = xui_entry(dlg, L + W1 + 6, y, 70, EH, ws);
    eb.h = xui_entry(dlg, L + W1 + 82, y, 70, EH, hs);

    y += 36;
    eb.btn_tpl = xui_button(dlg, L + W1 + 6, y, 108, EH,
                            "\xe2\x89\xa1 \xe6\xa1\x86\xe9\x80\x89\xe6\xa8\xa1\xe6\x9d\xbf",   /* ≡ 框选模板 */
                            edit_on_picktpl, &eb);
    eb.tplinfo = xui_label(dlg, L + W1 + 122, y + 2, 160, EH, tplInit);

    y += 36;
    eb.lb_cnt = xui_label(dlg, L, y + 2, W1, EH, "\xe6\xac\xa1\xe6\x95\xb0 / \xe9\x97\xb4\xe9\x9a\x94(ms):"); /* 次数/间隔 */
    eb.count = xui_entry(dlg, L + W1 + 6, y, 70, EH, cs);
    eb.interval = xui_entry(dlg, L + W1 + 82, y, 70, EH, is);

    y += 36;
    eb.lb_text = xui_label(dlg, L, y + 2, W1, EH, "\xe8\xbe\x93\xe5\x85\xa5\xe5\x86\x85\xe5\xae\xb9:");  /* 输入内容: */
    eb.text = xui_entry(dlg, L + W1 + 6, y, 320, EH, textU8);

    y += 34;
    eb.clear = xui_check(dlg, L + W1 + 6, y, 340, EH,
                         "\xe8\xbe\x93\xe5\x85\xa5\xe5\x89\x8d\xe6\xb8\x85\xe7\xa9\xba\xe5\x8e\x9f\xe5\x86\x85\xe5\xae\xb9(Ctrl+A \xe5\x90\x8e\xe5\x88\xa0\xe9\x99\xa4)",
                         s->clearFirst, NULL, NULL);

    y += 34;
    eb.lb_scroll = xui_label(dlg, L, y + 2, W1, EH, "\xe6\xbb\x9a\xe5\x8a\xa8\xe6\xa0\xbc\xe6\x95\xb0(\xe6\xad\xa3=\xe5\x90\x91\xe4\xb8\x8a):"); /* 滚动格数 */
    eb.scroll = xui_entry(dlg, L + W1 + 6, y, 70, EH, ss);

    y += 36;
    eb.lb_miss = xui_label(dlg, L, y + 2, W1, EH,
                           "\xe6\x9c\xaa\xe6\x89\xbe\xe5\x88\xb0\xe8\xb7\xb3\xe8\xbd\xac(0=\xe7\xbb\xa7\xe7\xbb\xad):");  /* 未找到跳转(0=继续): */
    eb.miss = xui_entry(dlg, L + W1 + 6, y, 70, EH, missS);

    y += 36;
    eb.lb_xy2 = xui_label(dlg, L, y + 2, W1, EH, "\xe6\x8b\x96\xe5\x8a\xa8\xe7\xbb\x88\xe7\x82\xb9 X / Y:"); /* 拖动终点 */
    txy2.ex = eb.x2 = xui_entry(dlg, L + W1 + 6, y, 70, EH, x2s);
    txy2.ey = eb.y2 = xui_entry(dlg, L + W1 + 82, y, 70, EH, y2s);
    xui_button(dlg, 354, y, 80, EH, "\xe5\x8f\x96\xe7\xbb\x88\xe7\x82\xb9", edit_on_pick, &txy2);   /* 取终点 */

    y += 36;
    eb.lb_delay = xui_label(dlg, L, y + 2, W1, EH, "\xe5\x89\x8d\xe5\xbb\xb6\xe6\x97\xb6 / \xe5\x90\x8e\xe5\xbb\xb6\xe6\x97\xb6(ms):");
    eb.db = xui_entry(dlg, L + W1 + 6, y, 70, EH, dbs);
    eb.da = xui_entry(dlg, L + W1 + 82, y, 70, EH, das);

    XuiWgt *bOk = xui_button(dlg, 344, 418, 78, 30, "\xe7\xa1\xae\xe5\xae\x9a", edit_on_ok, &eb);       /* 确定 */
    XuiWgt *bCancel = xui_button(dlg, 430, 418, 78, 30, "\xe5\x8f\x96\xe6\xb6\x88", edit_on_cancel, &eb); /* 取消 */
    xui_window_set_default(dlg, bOk, bCancel);

    edit_apply_type(&eb);
    int rr = xui_window_run(dlg);
    free(eb.tplB64);
    return rr;
}

/* ================= 文件操作 ================= */

/* 统一导入:替换并恢复设置(打开任务) 或 追加 */
static void on_import(XuiWgt *btn, void *data)
{
    (void)btn; (void)data;
    char *path = xui_filesel(g_ui, g_win, 0,
                             "\xe9\x80\x89\xe6\x8b\xa9\xe4\xbb\xbb\xe5\x8a\xa1 / Excel \xe6\x96\x87\xe4\xbb\xb6",  /* 选择任务/Excel 文件 */
                             "xlsx,csv,txt", NULL);
    if (!path) return;
    size_t len = 0;
    unsigned char *raw = read_file_all_from_utf8(path, &len);
    free(path);
    if (!raw) { show_err("\xe6\x97\xa0\xe6\xb3\x95\xe8\xaf\xbb\xe5\x8f\x96\xe6\x96\x87\xe4\xbb\xb6\xe3\x80\x82"); return; }

    /* 是(0)=替换并恢复设置  否(1)=追加  取消(2) */
    const char *btns[3] = {
        "\xe6\x9b\xbf\xe6\x8d\xa2(\xe6\x89\x93\xe5\xbc\x80\xe4\xbb\xbb\xe5\x8a\xa1)",     /* 替换(打开任务) */
        "\xe8\xbf\xbd\xe5\x8a\xa0\xe5\x88\xb0\xe5\x88\x97\xe8\xa1\xa8\xe5\xb0\xbe",       /* 追加到列表尾 */
        "\xe5\x8f\x96\xe6\xb6\x88",                                                       /* 取消 */
    };
    int mode = xui_alert(g_ui, g_win, 2,
                         "\xe9\x80\x89\xe6\x8b\xa9\xe5\xaf\xbc\xe5\x85\xa5\xe6\x96\xb9\xe5\xbc\x8f:", 3, btns);
    if (mode == 2) { free(raw); return; }

    int n = -1;
    if (len >= 4 && raw[0] == 'P' && raw[1] == 'K') {
        Sheet sh;
        memset(&sh, 0, sizeof(sh));
        if (xlsx_parse(raw, len, &sh) == 0)
            n = task_import_sheet(&g_task, &sh, mode == 1);
        sheet_free(&sh);
    } else {
        n = task_import_csv_text(&g_task, (const char *)raw, len, mode == 1);
    }
    free(raw);

    if (n < 0) {
        show_err("\xe8\xa7\xa3\xe6\x9e\x90\xe5\xa4\xb1\xe8\xb4\xa5:\xe8\xaf\xb7\xe4\xbd\xbf\xe7\x94\xa8 .xlsx"
                 "(Excel 2007+)\xe6\x88\x96 UTF-8 \xe7\xbc\x96\xe7\xa0\x81\xe7\x9a\x84 CSV\xe3\x80\x82");
        return;
    }
    if (n == 0) { show_info("\xe6\x9c\xaa\xe8\xaf\x86\xe5\x88\xab\xe5\x88\xb0\xe6\x9c\x89\xe6\x95\x88\xe6\xad\xa5\xe9\xaa\xa4\xe8\xa1\x8c\xe3\x80\x82"); return; }

    if (mode == 0) {   /* 替换模式回填设置控件 */
        char b[32];
        snprintf(b, sizeof(b), "%d", g_task.loops);        xui_set_text(g_ed_loops, b);
        snprintf(b, sizeof(b), "%d", g_task.loopGap);      xui_set_text(g_ed_gap, b);
        snprintf(b, sizeof(b), "%d", g_task.startCountdown); xui_set_text(g_ed_cd, b);
        snprintf(b, sizeof(b), "%d", g_task.jitter);       xui_set_text(g_ed_jit, b);
    }
    refresh_list();
    set_status("%s %d \xe4\xb8\xaa\xe6\xad\xa5\xe9\xaa\xa4",
               mode == 0 ? "\xe5\xb7\xb2\xe6\x89\x93\xe5\xbc\x80\xe4\xbb\xbb\xe5\x8a\xa1,\xe5\x85\xb1"
                         : "\xe5\xb7\xb2\xe8\xbf\xbd\xe5\x8a\xa0", n);
}

static void on_save(XuiWgt *btn, void *data)
{
    (void)btn; (void)data;
    g_task.loops = ed_val(g_ed_loops, 1);
    g_task.loopGap = ed_val(g_ed_gap, 0);
    g_task.startCountdown = ed_val(g_ed_cd, 0);
    g_task.jitter = ed_val(g_ed_jit, 0);
    char *path = xui_filesel(g_ui, g_win, 1, "\xe4\xbf\x9d\xe5\xad\x98\xe4\xbb\xbb\xe5\x8a\xa1",
                             "csv", "\xe4\xbb\xbb\xe5\x8a\xa11.csv");
    if (!path) return;
    size_t len = 0;
    char *csv = task_export_csv(&g_task, &len);
    if (csv) {
        FILE *f = fopen(path, "wb");
        if (f) { fwrite(csv, 1, len, f); fclose(f); set_status("\xe4\xbb\xbb\xe5\x8a\xa1\xe5\xb7\xb2\xe4\xbf\x9d\xe5\xad\x98"); }
        else show_err("\xe6\x97\xa0\xe6\xb3\x95\xe5\x86\x99\xe5\x85\xa5\xe6\x96\x87\xe4\xbb\xb6\xe3\x80\x82");
        free(csv);
    }
    free(path);
}

/* ================= 主界面回调 ================= */

static void on_add(XuiWgt *btn, void *data)
{
    (void)btn; (void)data;
    Step s;
    memset(&s, 0, sizeof(s));
    s.type = ACT_CLICK;
    s.delayAfter = 200;
    if (edit_step_dialog(&s, 1)) {
        task_add(&g_task, &s);
        refresh_list();
    }
}

static void on_edit(XuiWgt *btn, void *data)
{
    (void)btn; (void)data;
    int i = selected_index();
    if (i < 0 || i >= g_task.count) return;
    if (edit_step_dialog(&g_task.steps[i], 0)) refresh_list();
}

/* 列表双击 -> 编辑(XuiListFn 签名包装) */
static void on_list_activate(XuiWgt *l, int row, void *ud)
{
    (void)l; (void)row; (void)ud;
    on_edit(NULL, NULL);
}

static void on_del(XuiWgt *btn, void *data)
{
    (void)btn; (void)data;
    int i = selected_index();
    if (i >= 0) { task_remove(&g_task, i); refresh_list(); }
}

static void on_move(XuiWgt *btn, void *data)
{
    (void)btn;
    int delta = (int)(intptr_t)data;
    int i = selected_index();
    task_move(&g_task, i, delta);
    if (i >= 0) xui_list_sel_set(g_list, i + delta);
    refresh_list();
}

static void on_quick_pick(XuiWgt *btn, void *data)
{
    (void)btn; (void)data;
    PickRect r;
    if (pick_screen_point(&r)) {
        char msg[160];
        if (r.w > 0)
            snprintf(msg, sizeof(msg),
                     "\xe5\x8f\x96\xe7\x82\xb9\xe7\xbb\x93\xe6\x9e\x9c:\n\n"
                     "\xe7\x9f\xa9\xe5\xbd\xa2\xe5\xb7\xa6\xe4\xb8\x8a\xe8\xa7\x92:(%d, %d)\n"
                     "\xe5\xa4\xa7\xe5\xb0\x8f:%d \xc3\x97 %d", r.x, r.y, r.w, r.h);
        else
            snprintf(msg, sizeof(msg), "\xe5\x8f\x96\xe7\x82\xb9\xe7\xbb\x93\xe6\x9e\x9c:(%d, %d)", r.x, r.y);
        show_info(msg);
    }
}

static void on_start(XuiWgt *btn, void *data) { (void)btn; (void)data; start_run(); }
static void on_stop(XuiWgt *btn, void *data) { (void)btn; (void)data; stop_run(); }

/* 全局热键(XGrabKey 事件驱动) */
static void on_hotkey(XUi *ui, KeySym ks, unsigned state, void *ud)
{
    (void)ui; (void)ud;
    if (ks == XK_F6) start_run();
    else if (ks == XK_F12 && (state & ControlMask)) stop_run();
}

static int on_close(XuiWin *w, void *ud)
{
    (void)w; (void)ud;
    if (g_running) {
        g_stop_flag = 1;
        pthread_join(g_thread, NULL);   /* sleep 可中断,通常几十毫秒内结束 */
        g_running = 0;
    }
    return 1;   /* 允许关闭 -> 退出主循环 */
}

/* ================= 主界面构建 ================= */

static XuiWgt *mk_btn(XuiWin *p, int *px, const char *label, XuiFn cb, void *ud, int gap)
{
    int w = xui_text_w(g_ui, label) + 24;
    XuiWgt *b = xui_button(p, *px, 44, w, 30, label, cb, ud);
    *px += w + gap;
    return b;
}

int main(int argc, char **argv)
{
    (void)argc; (void)argv;
    setlocale(LC_ALL, "");
    task_init(&g_task);
    ac_srand((uint32_t)time(NULL));

    g_ui = xui_open();
    if (!g_ui) {
        fprintf(stderr, "\xe6\x97\xa0\xe6\xb3\x95\xe6\x89\x93\xe5\xbc\x80 X11 \xe6\x98\xbe\xe7\xa4\xba"
                        "(\xe8\xaf\xb7\xe6\xa3\x80\xe6\x9f\xa5 DISPLAY \xe7\x8e\xaf\xe5\xa2\x83\xe5\x8f\x98\xe9\x87\x8f"
                        "/\xe6\x98\xaf\xe5\x90\xa6\xe5\x9c\xa8 X11 \xe4\xbc\x9a\xe8\xaf\x9d\xe4\xb8\xad\xe8\xbf\x90\xe8\xa1\x8c)\n");
        return 1;
    }

    g_win = xui_window_new(g_ui, 1020, 660,
                           "\xe7\x82\xb9\xe5\x87\xbb\xe5\x8a\xa9\xe6\x89\x8b(Linux)"
                           " - Excel \xe5\xaf\xbc\xe5\x85\xa5 \xc2\xb7 \xe8\xbe\x93\xe5\x85\xa5\xe5\x89\x8d\xe6\xb8\x85\xe7\xa9\xba");
    xui_window_set_close(g_win, on_close, NULL);

    /* 设置区 */
    xui_label(g_win, 10, 14, 128, 24, "\xe5\xbe\xaa\xe7\x8e\xaf\xe6\xac\xa1\xe6\x95\xb0(0=\xe6\x97\xa0\xe9\x99\x90):");
    g_ed_loops = xui_entry(g_win, 140, 12, 52, 26, "1");
    xui_label(g_win, 200, 14, 98, 24, "\xe5\xbe\xaa\xe7\x8e\xaf\xe9\x97\xb4\xe9\x9a\x94(ms):");
    g_ed_gap = xui_entry(g_win, 300, 12, 56, 26, "500");
    xui_label(g_win, 364, 14, 112, 24, "\xe5\xbc\x80\xe5\xa7\x8b\xe5\x80\x92\xe8\xae\xa1\xe6\x97\xb6(ms):");
    g_ed_cd = xui_entry(g_win, 478, 12, 56, 26, "0");
    xui_label(g_win, 542, 14, 98, 24, "\xe9\x9a\x8f\xe6\x9c\xba\xe6\x8a\x96\xe5\x8a\xa8(ms):");
    g_ed_jit = xui_entry(g_win, 642, 12, 56, 26, "0");
    xui_label(g_win, 708, 14, 300, 24,
              "  \xe5\xbc\x80\xe5\xa7\x8b:F6    \xe5\x81\x9c\xe6\xad\xa2:Ctrl+F12(\xe5\x85\xa8\xe5\xb1\x80)");

    /* 按钮区 */
    int bx = 10;
    mk_btn(g_win, &bx, "\xe6\xb7\xbb\xe5\x8a\xa0", on_add, NULL, 6);       /* 添加 */
    mk_btn(g_win, &bx, "\xe7\xbc\x96\xe8\xbe\x91", on_edit, NULL, 6);      /* 编辑 */
    mk_btn(g_win, &bx, "\xe5\x88\xa0\xe9\x99\xa4", on_del, NULL, 6);       /* 删除 */
    mk_btn(g_win, &bx, "\xe2\x86\x91", on_move, (void *)(intptr_t)-1, 6);  /* ↑ */
    mk_btn(g_win, &bx, "\xe2\x86\x93", on_move, (void *)(intptr_t)1, 6);   /* ↓ */
    mk_btn(g_win, &bx, "\xe5\x8f\x96\xe7\x82\xb9", on_quick_pick, NULL, 6); /* 取点 */
    mk_btn(g_win, &bx, "\xe5\xaf\xbc\xe5\x85\xa5", on_import, NULL, 6);    /* 导入 */
    mk_btn(g_win, &bx, "\xe4\xbf\x9d\xe5\xad\x98\xe4\xbb\xbb\xe5\x8a\xa1", on_save, NULL, 18); /* 保存任务 */
    g_btn_start = mk_btn(g_win, &bx, "\xe5\xbc\x80\xe5\xa7\x8b\xe6\x89\xa7\xe8\xa1\x8c(F6)", on_start, NULL, 8);
    g_btn_stop = mk_btn(g_win, &bx, "\xe5\x81\x9c\xe6\xad\xa2(Ctrl+F12)", on_stop, NULL, 0);
    xui_set_sensitive(g_btn_stop, 0);

    /* 列表 */
    static const int cols[7] = { 52, 96, 150, 96, 300, 120, 86 };
    g_list = xui_list_new(g_win, 10, 82, 1000, 520, 7, cols);
    xui_list_set_header(g_list, 0, "\xe5\xba\x8f\xe5\x8f\xb7");
    xui_list_set_header(g_list, 1, "\xe7\xb1\xbb\xe5\x9e\x8b");
    xui_list_set_header(g_list, 2, "\xe5\x9d\x90\xe6\xa0\x87");
    xui_list_set_header(g_list, 3, "\xe6\xac\xa1\xe6\x95\xb0/\xe6\xa0\xbc\xe6\x95\xb0");
    xui_list_set_header(g_list, 4, "\xe6\x96\x87\xe6\x9c\xac / \xe6\x8c\x89\xe9\x94\xae");
    xui_list_set_header(g_list, 5, "\xe5\xbb\xb6\xe8\xbf\x9f \xe5\x89\x8d/\xe5\x90\x8ems");
    xui_list_set_header(g_list, 6, "\xe5\xa4\x87\xe6\xb3\xa8");
    xui_list_cb(g_list, NULL, on_list_activate, NULL);

    /* 状态栏 */
    g_status = xui_statusbar(g_win, 10, 612, 1000, 28);

    refresh_list();

    /* 全局热键:F6 开始 / Ctrl+F12 停止 */
    xui_set_hotkey_fn(g_ui, on_hotkey, NULL);
    if (xui_grab_keys(g_ui, XK_F6, 0) != 0)
        set_status("\xe6\xb3\xa8\xe6\x84\x8f:F6 \xe5\x85\xa8\xe5\xb1\x80\xe7\x83\xad\xe9\x94\xae\xe6\xb3\xa8\xe5\x86\x8c\xe5\xa4\xb1\xe8\xb4\xa5"
                   "(\xe5\x8f\xaf\xe7\x94\xa8\xe7\x95\x8c\xe9\x9d\xa2\xe6\x8c\x89\xe9\x92\xae\xe5\xbc\x80\xe5\xa7\x8b)");
    xui_grab_keys(g_ui, XK_F12, ControlMask);

    xui_window_show(g_win);

    /* 主循环:事件 + 50ms 周期任务(剪贴板通道/完成检测) */
    while (!xui_should_quit(g_ui)) {
        xui_pump(g_ui, 50);
        if (xui_should_quit(g_ui)) break;
        clip_pump();
        finish_check();
    }

    xui_close(g_ui);
    return 0;
}
