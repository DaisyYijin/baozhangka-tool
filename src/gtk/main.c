/* ============================================================
 * main.c - 自动点击器 Linux 版主界面(GTK3)
 * 与 Windows 版共享 src/core 全部核心逻辑
 * ============================================================ */
#include <gtk/gtk.h>
#include <gdk/gdkkeysyms.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include "ac_defs.h"
#include "engine.h"
#include "ac_keys.h"
#include "sheet.h"
#include "import.h"
#include "u8.h"
#include "platform_x11.h"

static Task g_task;
static GtkWidget *g_win, *g_view, *g_status;
static GtkListStore *g_store;
static GtkWidget *g_ed_loops, *g_ed_gap, *g_ed_cd, *g_ed_jit;
static GtkWidget *g_btn_start, *g_btn_stop;
static int g_running = 0;
static GThread *g_thread = NULL;

/* ================= 辅助 ================= */

static void show_err(const char *msg)
{
    if (!g_win) { fprintf(stderr, "%s\n", msg); return; }
    GtkWidget *d = gtk_message_dialog_new(GTK_WINDOW(g_win), GTK_DIALOG_MODAL,
                    GTK_MESSAGE_ERROR, GTK_BUTTONS_OK, "%s", msg);
    gtk_dialog_run(GTK_DIALOG(d));
    gtk_widget_destroy(d);
}

static void show_info(const char *msg)
{
    if (!g_win) { fprintf(stderr, "%s\n", msg); return; }
    GtkWidget *d = gtk_message_dialog_new(GTK_WINDOW(g_win), GTK_DIALOG_MODAL,
                    GTK_MESSAGE_INFO, GTK_BUTTONS_OK, "%s", msg);
    gtk_dialog_run(GTK_DIALOG(d));
    gtk_widget_destroy(d);
}

/* Linux:char* 路径(UTF-8)-> 核心的 wchar_t 接口 */
static unsigned char *read_file_all_from_utf8(const char *path, size_t *outLen)
{
    if (!path) return NULL;
    wchar_t wpath[4096];
    u8_to_wcs(path, wpath, 4095);
    return read_file_all(wpath, outLen);
}

/* ================= 剪贴板(转 GTK 主线程) ================= */

typedef struct {
    char   *text;
    GCond   cond;
    GMutex  mutex;
    gboolean done;
    gboolean ok;
} ClipJob;

static gboolean clip_idle(gpointer data)
{
    ClipJob *job = (ClipJob *)data;
    GtkClipboard *cb = gtk_clipboard_get(GDK_SELECTION_CLIPBOARD);
    gtk_clipboard_set_text(cb, job->text, -1);
    gtk_clipboard_store(cb);                       /* 尽力持久化 */
    g_mutex_lock(&job->mutex);
    job->ok = TRUE;
    job->done = TRUE;
    g_cond_signal(&job->cond);
    g_mutex_unlock(&job->mutex);
    return G_SOURCE_REMOVE;
}

int ac_gtk_clipboard_set(const char *utf8)
{
    ClipJob job;
    memset(&job, 0, sizeof(job));
    job.text = (char *)utf8;
    g_cond_init(&job.cond);
    g_mutex_init(&job.mutex);
    g_idle_add(clip_idle, &job);
    g_mutex_lock(&job.mutex);
    while (!job.done) g_cond_wait(&job.cond, &job.mutex);
    g_mutex_unlock(&job.mutex);
    g_cond_clear(&job.cond);
    g_mutex_clear(&job.mutex);
    return job.ok;
}

/* ================= 状态栏/列表 ================= */

static void set_status(const char *fmt, ...)
{
    char buf[512];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    gtk_statusbar_push(GTK_STATUSBAR(g_status), 0, buf);
}

static void refresh_list(void)
{
    gtk_list_store_clear(g_store);
    GtkTreeIter it;
    for (int i = 0; i < g_task.count; i++) {
        Step *s = &g_task.steps[i];
        char x[32], y[32], cnt[32], gap[32], db[32], da[32], idx[16];
        char text[AC_TEXT_MAX * 3 + 64];        snprintf(idx, sizeof(idx), "%d", i + 1);
        snprintf(x, sizeof(x), "%d", s->x);
        snprintf(y, sizeof(y), "%d", s->y);
        snprintf(cnt, sizeof(cnt), "%d", s->type == ACT_SCROLL ? s->scroll : s->count);
        snprintf(gap, sizeof(gap), "%d", s->interval);
        snprintf(db, sizeof(db), "%d", s->delayBefore);
        snprintf(da, sizeof(da), "%d", s->delayAfter);
        if (s->type == ACT_DRAG)
            snprintf(text, sizeof(text), "→ 终点(%d, %d)", s->x2, s->y2);
        else
            wcs_to_u8(s->text, text, sizeof(text) - 1);

        char typeU8[64];
        wcs_to_u8(act_type_name(s->type), typeU8, sizeof(typeU8) - 1);

        char coordStr[96], cntStr[32], delayStr[48];
        switch (s->type) {
        case ACT_DRAG:
            snprintf(coordStr, sizeof(coordStr), "(%d,%d)→(%d,%d)", s->x, s->y, s->x2, s->y2);
            break;
        case ACT_CLICK: case ACT_DBLCLICK: case ACT_MULTI:
        case ACT_RCLICK: case ACT_MCLICK: case ACT_SCROLL:
            snprintf(coordStr, sizeof(coordStr), "(%d,%d)", s->x, s->y);
            break;
        default:
            snprintf(coordStr, sizeof(coordStr), "—");
            break;
        }
        switch (s->type) {
        case ACT_MULTI:  snprintf(cntStr, sizeof(cntStr), "×%d", s->count > 0 ? s->count : 1); break;
        case ACT_SCROLL: snprintf(cntStr, sizeof(cntStr), "%d 格", s->scroll); break;
        default:         snprintf(cntStr, sizeof(cntStr), "—"); break;
        }
        snprintf(delayStr, sizeof(delayStr), "%d / %d", s->delayBefore, s->delayAfter);

        gtk_list_store_append(g_store, &it);
        gtk_list_store_set(g_store, &it,
            0, idx, 1, typeU8, 2, coordStr, 3, cntStr,
            4, text, 5, delayStr,
            6, (s->type == ACT_TEXT && s->clearFirst) ? "是" : "",
            7, "", -1);
    }
    char msg[64];
    snprintf(msg, sizeof(msg), "共 %d 个步骤", g_task.count);
    if (!g_running) set_status("%s", msg);
}

static int selected_index(void)
{
    GtkTreeSelection *sel = gtk_tree_view_get_selection(GTK_TREE_VIEW(g_view));
    GtkTreeIter it;
    GtkTreeModel *model;
    if (!gtk_tree_selection_get_selected(sel, &model, &it)) return -1;
    GtkTreePath *path = gtk_tree_model_get_path(model, &it);
    int idx = gtk_tree_path_get_indices(path)[0];
    gtk_tree_path_free(path);
    return idx;
}

/* ================= 执行 ================= */

typedef struct { int loop, step; } ProgMsg;

static gboolean progress_cb_ui(gpointer data)
{
    ProgMsg *m = (ProgMsg *)data;
    char buf[160];
    snprintf(buf, sizeof(buf), "运行中:第 %d 轮,第 %d 步 / 共 %d 步 —— 停止:Ctrl+F12",
             m->loop, m->step + 1, g_task.count);
    gtk_statusbar_push(GTK_STATUSBAR(g_status), 0, buf);
    g_free(m);
    return G_SOURCE_REMOVE;
}

static void engine_progress(int loop, int stepIdx, void *ud)
{
    (void)ud;
    ProgMsg *m = g_new(ProgMsg, 1);
    m->loop = loop; m->step = stepIdx;
    g_idle_add(progress_cb_ui, m);
}

static gpointer run_thread(gpointer data)
{
    (void)data;
    {
        static TaskBook gtkBook;            /* 单任务包装(GTK版无多TAB) */
        gtkBook.tasks[0] = g_task;
        engine_run(&gtkBook, 0, x11_platform(), engine_progress, NULL);
    }
    g_stop_flag = 2;                        /* 2=已完成,由 finish_check 收尾 */
    return NULL;
}

static gboolean finish_check(gpointer data)
{
    (void)data;
    x11_hotkey_poll();                      /* 全局 Ctrl+F12 */
    if (g_stop_flag == 2) {                 /* 执行完成 */
        g_stop_flag = 0;
        g_running = 0;
        if (g_thread) { g_thread_join(g_thread); g_thread = NULL; }
        gtk_widget_set_sensitive(g_btn_start, TRUE);
        gtk_widget_set_sensitive(g_btn_stop, FALSE);
        set_status("执行结束(可再按 F6 开始)");
        refresh_list();
    } else if (g_stop_flag == 1) {
        set_status("正在停止…(等待当前动作完成)");
    }
    return G_SOURCE_CONTINUE;               /* 继续轮询 */
}

static int ed_val(GtkWidget *ed, int defVal)
{
    const char *s = gtk_entry_get_text(GTK_ENTRY(ed));
    if (!s || !s[0]) return defVal;
    return atoi(s);
}

static void start_run(void)
{
    if (g_running) return;
    if (g_task.count == 0) {
        GtkWidget *d = gtk_message_dialog_new(GTK_WINDOW(g_win), GTK_DIALOG_MODAL,
                        GTK_MESSAGE_INFO, GTK_BUTTONS_OK, "步骤列表为空,请先添加步骤或导入 Excel。");
        gtk_dialog_run(GTK_DIALOG(d));
        gtk_widget_destroy(d);
        return;
    }
    g_task.loops = ed_val(g_ed_loops, 1);
    g_task.loopGap = ed_val(g_ed_gap, 0);
    g_task.startCountdown = ed_val(g_ed_cd, 0);
    g_task.jitter = ed_val(g_ed_jit, 0);

    g_stop_flag = 0;
    g_running = 1;
    gtk_widget_set_sensitive(g_btn_start, FALSE);
    gtk_widget_set_sensitive(g_btn_stop, TRUE);
    g_thread = g_thread_new("runner", run_thread, NULL);
    set_status(g_task.startCountdown > 0 ? "倒计时中…" : "运行中 —— 停止:Ctrl+F12");
}

static void stop_run(void)
{
    g_stop_flag = 1;
    set_status("正在停止…");
}

/* ================= 取点窗口 ================= */

typedef struct {
    GtkWidget *win;
    gdouble px, py;            /* 按下点 */
    gdouble cx, cy;            /* 当前点 */
    gboolean dragging;
    int done, ok;
    int rx, ry, rw, rh;        /* 结果(root 坐标) */
} PickerX;

static PickerX g_pick;

static gboolean pick_draw(GtkWidget *w, cairo_t *cr, gpointer data)
{
    (void)w; (void)data;
    GtkAllocation al;
    gtk_widget_get_allocation(g_pick.win, &al);

    GdkRGBA color;
    /* 覆盖底色 */
    gdk_rgba_parse(&color, "rgba(0,0,0,0.35)");
    cairo_set_source_rgba(cr, color.red, color.green, color.blue, color.alpha);
    cairo_paint(cr);

    /* 十字线 */
    gdk_rgba_parse(&color, "red");
    cairo_set_source_rgb(cr, color.red, color.green, color.blue);
    cairo_set_line_width(cr, 1);
    cairo_move_to(cr, g_pick.cx, 0); cairo_line_to(cr, g_pick.cx, al.height);
    cairo_move_to(cr, 0, g_pick.cy); cairo_line_to(cr, al.width, g_pick.cy);
    cairo_stroke(cr);

    if (g_pick.dragging) {
        gdk_rgba_parse(&color, "green");
        cairo_set_source_rgb(cr, color.red, color.green, color.blue);
        cairo_set_line_width(cr, 2);
        double x1 = g_pick.px, y1 = g_pick.py, x2 = g_pick.cx, y2 = g_pick.cy;
        cairo_rectangle(cr, MIN(x1,x2), MIN(y1,y2), ABS(x2-x1), ABS(y2-y1));
        cairo_stroke(cr);
    }

    /* 坐标文字 */
    gdk_rgba_parse(&color, "yellow");
    cairo_set_source_rgb(cr, color.red, color.green, color.blue);
    cairo_select_font_face(cr, "Sans", CAIRO_FONT_SLANT_NORMAL, CAIRO_FONT_WEIGHT_BOLD);
    cairo_set_font_size(cr, 14);
    char buf[160];
    if (g_pick.dragging) {
        int rw = (int)ABS(g_pick.cx - g_pick.px), rh = (int)ABS(g_pick.cy - g_pick.py);
        snprintf(buf, sizeof(buf), "起点(%.0f, %.0f)  大小 %d x %d —— 松开确定",
                 g_pick.px, g_pick.py, rw, rh);
    } else {
        snprintf(buf, sizeof(buf), "当前坐标:(%.0f, %.0f)", g_pick.cx, g_pick.cy);
    }
    cairo_move_to(cr, g_pick.cx + 15, g_pick.cy + 25);
    cairo_show_text(cr, buf);
    cairo_move_to(cr, 10, 24);
    cairo_show_text(cr, "单击=取点   Esc=取消");
    return FALSE;
}

static gboolean pick_motion(GtkWidget *w, GdkEventMotion *e, gpointer data)
{
    (void)w; (void)data;
    g_pick.cx = e->x_root;
    g_pick.cy = e->y_root;
    gtk_widget_queue_draw(g_pick.win);
    return TRUE;
}

static gboolean pick_press(GtkWidget *w, GdkEventButton *e, gpointer data)
{
    (void)w; (void)data;
    if (e->button == 3) {                 /* 右键取消 */
        g_pick.ok = 0; g_pick.done = 1;
        return TRUE;
    }
    if (e->button == 1) {
        g_pick.px = e->x_root; g_pick.py = e->y_root;
        g_pick.cx = e->x_root; g_pick.cy = e->y_root;
        g_pick.dragging = TRUE;
    }
    return TRUE;
}

static gboolean pick_release(GtkWidget *w, GdkEventButton *e, gpointer data)
{
    (void)w; (void)data;
    if (e->button == 1 && g_pick.dragging) {
        g_pick.dragging = FALSE;
        double dx = e->x_root - g_pick.px, dy = e->y_root - g_pick.py;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;
        if (dx < 5 && dy < 5) {
            g_pick.rx = (int)g_pick.px; g_pick.ry = (int)g_pick.py;
            g_pick.rw = 0; g_pick.rh = 0;
        } else {
            double x1 = MIN(g_pick.px, e->x_root), y1 = MIN(g_pick.py, e->y_root);
            double x2 = MAX(g_pick.px, e->x_root), y2 = MAX(g_pick.py, e->y_root);
            g_pick.rx = (int)x1; g_pick.ry = (int)y1;
            g_pick.rw = (int)(x2 - x1); g_pick.rh = (int)(y2 - y1);
        }
        g_pick.ok = 1; g_pick.done = 1;
    }
    return TRUE;
}

static gboolean pick_key(GtkWidget *w, GdkEventKey *e, gpointer data)
{
    (void)w; (void)data;
    if (e->keyval == GDK_KEY_Escape) {
        g_pick.ok = 0; g_pick.done = 1;
        return TRUE;
    }
    return FALSE;
}

typedef struct { int x, y, w, h; } PickRect;

/* 进入全屏取点,返回 1=取到 0=取消 */
static int pick_screen_point(PickRect *out)
{
    memset(&g_pick, 0, sizeof(g_pick));

    GtkWidget *win = gtk_window_new(GTK_WINDOW_POPUP);
    gtk_window_set_type_hint(GTK_WINDOW(win), GDK_WINDOW_TYPE_HINT_DOCK);
    gtk_window_set_skip_taskbar_hint(GTK_WINDOW(win), TRUE);
    gtk_window_set_keep_above(GTK_WINDOW(win), TRUE);
    gtk_window_fullscreen(GTK_WINDOW(win));
    gtk_widget_set_app_paintable(win, TRUE);
    gtk_widget_add_events(win, GDK_BUTTON_PRESS_MASK | GDK_BUTTON_RELEASE_MASK |
                              GDK_POINTER_MOTION_MASK | GDK_KEY_PRESS_MASK);

    GdkScreen *screen = gdk_screen_get_default();
    GdkVisual *visual = gdk_screen_get_rgba_visual(screen);
    if (visual) gtk_widget_set_visual(win, visual);

    g_signal_connect(win, "draw", G_CALLBACK(pick_draw), NULL);
    g_signal_connect(win, "motion-notify-event", G_CALLBACK(pick_motion), NULL);
    g_signal_connect(win, "button-press-event", G_CALLBACK(pick_press), NULL);
    g_signal_connect(win, "button-release-event", G_CALLBACK(pick_release), NULL);
    g_signal_connect(win, "key-press-event", G_CALLBACK(pick_key), NULL);

    g_pick.win = win;
    gtk_widget_show_all(win);
    gtk_window_present(GTK_WINDOW(win));
    /* 抓取指针与键盘 */
    GdkGrabStatus st = gdk_pointer_grab(gtk_widget_get_window(win), TRUE,
        (GdkEventMask)(GDK_BUTTON_PRESS_MASK | GDK_BUTTON_RELEASE_MASK | GDK_POINTER_MOTION_MASK),
        NULL, gdk_cursor_new(GDK_CROSSHAIR), GDK_CURRENT_TIME);
    gdk_keyboard_grab(gtk_widget_get_window(win), TRUE, GDK_CURRENT_TIME);
    (void)st;

    while (!g_pick.done)
        gtk_main_iteration_do(TRUE);

    gdk_pointer_ungrab(GDK_CURRENT_TIME);
    gdk_keyboard_ungrab(GDK_CURRENT_TIME);
    gtk_widget_destroy(win);
    while (gtk_events_pending()) gtk_main_iteration_do(FALSE);

    if (out) {
        out->x = g_pick.rx; out->y = g_pick.ry;
        out->w = g_pick.rw; out->h = g_pick.rh;
    }
    return g_pick.ok;
}

/* ================= 步骤编辑对话框 ================= */

typedef struct {
    GtkWidget *dlg, *grid;
    GtkWidget *type, *x, *y, *w, *h, *count, *interval, *text, *scroll;
    GtkWidget *x2, *y2, *db, *da, *clear, *enable, *note;
    GtkWidget *lb_xy, *lb_cnt, *lb_text, *lb_scroll, *lb_xy2, *lb_delay;
    GtkWidget *lb_dummy;
} EditBox;

static const struct { int type; const char *cn; } EDIT_TYPES[] = {
    { ACT_CLICK, "单击(左键)" }, { ACT_DBLCLICK, "双击" },
    { ACT_MULTI, "多击(自定义次数)" }, { ACT_RCLICK, "右击" },
    { ACT_MCLICK, "中击(滚轮键)" },
    { ACT_TEXT, "文本输入" }, { ACT_KEY, "按键 / 组合键" },
    { ACT_WAIT, "等待" }, { ACT_SCROLL, "滚轮" }, { ACT_DRAG, "鼠标拖动" },
};

static void edit_apply_type(EditBox *eb)
{
    int type = gtk_combo_box_get_active(GTK_COMBO_BOX(eb->type));
    if (type < 0) return;
    int isClick = (type == ACT_CLICK || type == ACT_DBLCLICK || type == ACT_MULTI ||
                   type == ACT_RCLICK || type == ACT_MCLICK);
    int multi = type == ACT_MULTI, scroll = type == ACT_SCROLL, drag = type == ACT_DRAG;
    int text = (type == ACT_TEXT || type == ACT_KEY);

    gtk_widget_set_visible(eb->lb_xy, isClick || scroll || drag);
    gtk_widget_set_visible(eb->x, isClick || scroll || drag);
    gtk_widget_set_visible(eb->y, isClick || scroll || drag);
    gtk_widget_set_visible(eb->lb_cnt, multi);
    gtk_widget_set_visible(eb->count, multi);
    gtk_widget_set_visible(eb->interval, multi);
    gtk_widget_set_visible(eb->lb_text, text);
    gtk_widget_set_visible(eb->text, text);
    gtk_widget_set_visible(eb->clear, type == ACT_TEXT);
    gtk_widget_set_visible(eb->lb_scroll, scroll);
    gtk_widget_set_visible(eb->scroll, scroll);
    gtk_widget_set_visible(eb->lb_xy2, drag);
    gtk_widget_set_visible(eb->x2, drag);
    gtk_widget_set_visible(eb->y2, drag);
    gtk_widget_set_visible(eb->lb_delay, TRUE);
    gtk_widget_set_visible(eb->db, TRUE);
    gtk_widget_set_visible(eb->da, TRUE);

    const char *delayTxt = (type == ACT_WAIT) ? "等待时长(毫秒)" : "前延时(毫秒)";
    gtk_label_set_text(GTK_LABEL(eb->lb_delay), delayTxt);
}

static void edit_on_pick_xy(GtkWidget *btn, gpointer data)
{
    (void)btn;
    EditBox *eb = (EditBox *)data;
    gtk_widget_hide(eb->dlg);
    PickRect r;
    if (pick_screen_point(&r)) {
        char b[32];
        snprintf(b, sizeof(b), "%d", r.x); gtk_entry_set_text(GTK_ENTRY(eb->x), b);
        snprintf(b, sizeof(b), "%d", r.y); gtk_entry_set_text(GTK_ENTRY(eb->y), b);
    }
    gtk_widget_show(eb->dlg);
}

static void edit_on_pick_xy2(GtkWidget *btn, gpointer data)
{
    (void)btn;
    EditBox *eb = (EditBox *)data;
    gtk_widget_hide(eb->dlg);
    PickRect r;
    if (pick_screen_point(&r)) {
        char b[32];
        snprintf(b, sizeof(b), "%d", r.x); gtk_entry_set_text(GTK_ENTRY(eb->x2), b);
        snprintf(b, sizeof(b), "%d", r.y); gtk_entry_set_text(GTK_ENTRY(eb->y2), b);
    }
    gtk_widget_show(eb->dlg);
}

static GtkWidget *mk_row_label(GtkWidget *grid, const char *txt, int row)
{
    GtkWidget *l = gtk_label_new(txt);
    gtk_widget_set_halign(l, GTK_ALIGN_START);
    gtk_grid_attach(GTK_GRID(grid), l, 0, row, 1, 1);
    return l;
}

static GtkWidget *mk_row_entry(GtkWidget *grid, int row, int col, const char *val)
{
    GtkWidget *e = gtk_entry_new();
    gtk_entry_set_width_chars(GTK_ENTRY(e), 8);
    if (val) gtk_entry_set_text(GTK_ENTRY(e), val);
    gtk_grid_attach(GTK_GRID(grid), e, col, row, 1, 1);
    return e;
}

/* 编辑步骤对话框,返回1=确定 */
static int edit_step_dialog(Step *s, int isNew)
{
    GtkWidget *dlg = gtk_dialog_new_with_buttons(
        isNew ? "添加步骤" : "编辑步骤",
        GTK_WINDOW(g_win),
        GTK_DIALOG_MODAL,
        "_取消", GTK_RESPONSE_CANCEL,
        "_确定", GTK_RESPONSE_OK, NULL);
    gtk_window_set_default_size(GTK_WINDOW(dlg), 460, 420);

    GtkWidget *content = gtk_dialog_get_content_area(GTK_DIALOG(dlg));
    GtkWidget *grid = gtk_grid_new();
    gtk_grid_set_row_spacing(GTK_GRID(grid), 8);
    gtk_grid_set_column_spacing(GTK_GRID(grid), 8);
    gtk_container_set_border_width(GTK_CONTAINER(grid), 12);
    gtk_box_pack_start(GTK_BOX(content), grid, FALSE, FALSE, 0);

    EditBox eb;
    memset(&eb, 0, sizeof(eb));
    eb.dlg = dlg; eb.grid = grid;

    char xs[32], ys[32], cs[32], is[32], ss[32];
    char x2s[32], y2s[32], dbs[32], das[32];
    char textU8[AC_TEXT_MAX * 3 + 8];
    textU8[0] = 0;
    if (s->text[0]) wcs_to_u8(s->text, textU8, sizeof(textU8) - 1);

    int row = 0;
    eb.lb_dummy = mk_row_label(grid, "动作类型:", row);
    eb.type = gtk_combo_box_text_new();
    for (int i = 0; i < 11; i++) gtk_combo_box_text_append_text(GTK_COMBO_BOX_TEXT(eb.type), EDIT_TYPES[i].cn);
    for (int i = 0; i < 11; i++) if (EDIT_TYPES[i].type == s->type) gtk_combo_box_set_active(GTK_COMBO_BOX(eb.type), i);
    gtk_grid_attach(GTK_GRID(grid), eb.type, 1, row, 1, 1);
    GtkWidget *btnPick = gtk_button_new_with_label("≡ 屏幕取点");
    g_signal_connect(btnPick, "clicked", G_CALLBACK(edit_on_pick_xy), &eb);
    gtk_grid_attach(GTK_GRID(grid), btnPick, 2, row, 1, 1);

    row++;
    snprintf(xs, sizeof(xs), "%d", s->x);
    snprintf(ys, sizeof(ys), "%d", s->y);
    eb.lb_xy = mk_row_label(grid, "坐标 X / Y:", row);
    eb.x = mk_row_entry(grid, row, 1, xs);
    eb.y = mk_row_entry(grid, row, 2, ys);

    row++;
    snprintf(cs, sizeof(cs), "%d", s->count > 0 ? s->count : 3);
    snprintf(is, sizeof(is), "%d", s->interval > 0 ? s->interval : 100);
    eb.lb_cnt = mk_row_label(grid, "次数 / 间隔(ms):", row);
    eb.count = mk_row_entry(grid, row, 1, cs);
    eb.interval = mk_row_entry(grid, row, 2, is);

    row++;
    eb.lb_text = mk_row_label(grid, "输入内容(支持中文):", row);
    eb.text = gtk_entry_new();
    gtk_entry_set_width_chars(GTK_ENTRY(eb.text), 30);
    gtk_entry_set_text(GTK_ENTRY(eb.text), textU8);
    gtk_grid_attach(GTK_GRID(grid), eb.text, 1, row, 2, 1);
    row++;
    eb.clear = gtk_check_button_new_with_label("输入前清空原内容(Ctrl+A 后删除)");
    gtk_grid_attach(GTK_GRID(grid), eb.clear, 1, row, 2, 1);

    row++;
    snprintf(ss, sizeof(ss), "%d", s->scroll != 0 ? s->scroll : 3);
    eb.lb_scroll = mk_row_label(grid, "滚动格数(正=向上):", row);
    eb.scroll = mk_row_entry(grid, row, 1, ss);

    row++;
    snprintf(x2s, sizeof(x2s), "%d", s->x2);
    snprintf(y2s, sizeof(y2s), "%d", s->y2);
    eb.lb_xy2 = mk_row_label(grid, "拖动终点 X / Y:", row);
    eb.x2 = mk_row_entry(grid, row, 1, x2s);
    eb.y2 = mk_row_entry(grid, row, 2, y2s);
    GtkWidget *btn2 = gtk_button_new_with_label("≡ 取终点");
    g_signal_connect(btn2, "clicked", G_CALLBACK(edit_on_pick_xy2), &eb);
    gtk_grid_attach(GTK_GRID(grid), btn2, 3, row, 1, 1);

    row++;
    snprintf(dbs, sizeof(dbs), "%d", s->delayBefore);
    snprintf(das, sizeof(das), "%d", s->delayAfter);
    eb.lb_delay = mk_row_label(grid, "前延时 / 后延时(ms):", row);
    eb.db = mk_row_entry(grid, row, 1, dbs);
    eb.da = mk_row_entry(grid, row, 2, das);

    row++;
    g_signal_connect(eb.type, "changed", G_CALLBACK(edit_apply_type), &eb);

    gtk_widget_show_all(grid);
    edit_apply_type(&eb);

    int resp = gtk_dialog_run(GTK_DIALOG(dlg));
    int ok = 0;
    if (resp == GTK_RESPONSE_OK) {
        int t = gtk_combo_box_get_active(GTK_COMBO_BOX(eb.type));
        if (t < 0) t = 0;
        s->type = EDIT_TYPES[t].type;
        s->x = atoi(gtk_entry_get_text(GTK_ENTRY(eb.x)));
        s->y = atoi(gtk_entry_get_text(GTK_ENTRY(eb.y)));
        s->count = atoi(gtk_entry_get_text(GTK_ENTRY(eb.count)));
        s->interval = atoi(gtk_entry_get_text(GTK_ENTRY(eb.interval)));
        s->x2 = atoi(gtk_entry_get_text(GTK_ENTRY(eb.x2)));
        s->y2 = atoi(gtk_entry_get_text(GTK_ENTRY(eb.y2)));
        s->scroll = atoi(gtk_entry_get_text(GTK_ENTRY(eb.scroll)));
        s->delayBefore = atoi(gtk_entry_get_text(GTK_ENTRY(eb.db)));
        s->delayAfter = atoi(gtk_entry_get_text(GTK_ENTRY(eb.da)));
        s->clearFirst = gtk_toggle_button_get_active(GTK_TOGGLE_BUTTON(eb.clear)) ? 1 : 0;
        const char *txt = gtk_entry_get_text(GTK_ENTRY(eb.text));
        u8_to_wcs(txt ? txt : "", s->text, AC_TEXT_MAX - 1);
        ok = 1;
    }
    gtk_widget_destroy(dlg);
    return ok;
}

/* ================= 文件操作 ================= */

/* 统一导入:是=替换并恢复设置(打开任务),否=追加 */
static void on_import(GtkWidget *btn, gpointer data)
{
    (void)btn; (void)data;
    GtkWidget *dlg = gtk_file_chooser_dialog_new("选择任务 / Excel 文件",
        GTK_WINDOW(g_win), GTK_FILE_CHOOSER_ACTION_OPEN,
        "_取消", GTK_RESPONSE_CANCEL, "_打开", GTK_RESPONSE_ACCEPT, NULL);
    GtkFileFilter *f = gtk_file_filter_new();
    gtk_file_filter_set_name(f, "任务 / Excel (*.xlsx;*.csv;*.txt)");
    gtk_file_filter_add_pattern(f, "*.xlsx");
    gtk_file_filter_add_pattern(f, "*.csv");
    gtk_file_filter_add_pattern(f, "*.txt");
    gtk_file_chooser_add_filter(GTK_FILE_CHOOSER(dlg), f);

    if (gtk_dialog_run(GTK_DIALOG(dlg)) != GTK_RESPONSE_ACCEPT) {
        gtk_widget_destroy(dlg);
        return;
    }
    char *path = gtk_file_chooser_get_filename(GTK_FILE_CHOOSER(dlg));
    size_t len = 0;
    unsigned char *raw = read_file_all_from_utf8(path, &len);
    g_free(path);
    gtk_widget_destroy(dlg);
    if (!raw) { show_err("无法读取文件。"); return; }

    GtkWidget *ask = gtk_message_dialog_new(GTK_WINDOW(g_win), GTK_DIALOG_MODAL,
                    GTK_MESSAGE_QUESTION, GTK_BUTTONS_NONE,
                    "选择导入方式:\n【是】 替换全部并恢复设置(打开任务)\n【否】 追加到列表尾\n【取消】 放弃");
    gtk_dialog_add_buttons(GTK_DIALOG(ask),
                           "_是", GTK_RESPONSE_YES,
                           "_否", GTK_RESPONSE_NO,
                           "_取消", GTK_RESPONSE_CANCEL, NULL);
    int mode = gtk_dialog_run(GTK_DIALOG(ask));
    gtk_widget_destroy(ask);
    if (mode == GTK_RESPONSE_CANCEL || mode == GTK_RESPONSE_DELETE_EVENT) {
        free(raw);
        return;
    }

    int n = -1;
    if (len >= 4 && raw[0] == 'P' && raw[1] == 'K') {
        Sheet sh;
        memset(&sh, 0, sizeof(sh));
        if (xlsx_parse(raw, len, &sh) == 0)
            n = task_import_sheet(&g_task, &sh, mode == GTK_RESPONSE_NO);
        sheet_free(&sh);
    } else {
        n = task_import_csv_text(&g_task, (const char *)raw, len, mode == GTK_RESPONSE_NO);
    }
    free(raw);

    if (n < 0) { show_err("解析失败:请使用 .xlsx(Excel 2007+)或 UTF-8 编码的 CSV。"); return; }
    if (n == 0) { show_info("未识别到有效步骤行。"); return; }

    /* 替换模式回填设置控件 */
    if (mode == GTK_RESPONSE_YES) {
        char b[32];
        snprintf(b, sizeof(b), "%d", g_task.loops);
        gtk_entry_set_text(GTK_ENTRY(g_ed_loops), b);
        snprintf(b, sizeof(b), "%d", g_task.loopGap);
        gtk_entry_set_text(GTK_ENTRY(g_ed_gap), b);
        snprintf(b, sizeof(b), "%d", g_task.startCountdown);
        gtk_entry_set_text(GTK_ENTRY(g_ed_cd), b);
        snprintf(b, sizeof(b), "%d", g_task.jitter);
        gtk_entry_set_text(GTK_ENTRY(g_ed_jit), b);
    }
    refresh_list();
    char msg[96];
    snprintf(msg, sizeof(msg), "%s %d 个步骤",
             mode == GTK_RESPONSE_YES ? "已打开任务,共" : "已追加", n);
    set_status("%s", msg);
}

static void on_save(GtkWidget *btn, gpointer data)
{
    (void)btn; (void)data;
    g_task.loops = ed_val(g_ed_loops, 1);
    g_task.loopGap = ed_val(g_ed_gap, 0);
    g_task.startCountdown = ed_val(g_ed_cd, 0);
    g_task.jitter = ed_val(g_ed_jit, 0);

    GtkWidget *dlg = gtk_file_chooser_dialog_new("保存任务",
        GTK_WINDOW(g_win), GTK_FILE_CHOOSER_ACTION_SAVE,
        "_取消", GTK_RESPONSE_CANCEL, "_保存", GTK_RESPONSE_ACCEPT, NULL);
    gtk_file_chooser_set_do_overwrite_confirmation(GTK_FILE_CHOOSER(dlg), TRUE);
    gtk_file_chooser_set_current_name(GTK_FILE_CHOOSER(dlg), "任务1.csv");
    if (gtk_dialog_run(GTK_DIALOG(dlg)) == GTK_RESPONSE_ACCEPT) {
        char *path = gtk_file_chooser_get_filename(GTK_FILE_CHOOSER(dlg));
        size_t len = 0;
        char *csv = task_export_csv(&g_task, &len);
        if (csv) {
            FILE *f = fopen(path, "wb");
            if (f) { fwrite(csv, 1, len, f); fclose(f); set_status("任务已保存"); }
            else show_err("无法写入文件。");
            free(csv);
        }
        g_free(path);
    }
    gtk_widget_destroy(dlg);
}

/* ================= 主界面回调 ================= */

static void on_add(GtkWidget *btn, gpointer data)
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

static void on_edit(GtkWidget *btn, gpointer data)
{
    (void)btn; (void)data;
    int i = selected_index();
    if (i < 0 || i >= g_task.count) return;
    if (edit_step_dialog(&g_task.steps[i], 0)) refresh_list();
}

static void on_del(GtkWidget *btn, gpointer data)
{
    (void)btn; (void)data;
    int i = selected_index();
    if (i >= 0) { task_remove(&g_task, i); refresh_list(); }
}

static void on_move(GtkWidget *btn, gpointer data)
{
    (void)btn;
    int delta = GPOINTER_TO_INT(data);
    int i = selected_index();
    task_move(&g_task, i, delta);
    refresh_list();
}

static void on_quick_pick(GtkWidget *btn, gpointer data)
{
    (void)btn; (void)data;
    PickRect r;
    if (pick_screen_point(&r)) {
        char msg[160];
        if (r.w > 0)
            snprintf(msg, sizeof(msg), "取点结果:\n\n矩形左上角:(%d, %d)\n大小:%d × %d",
                     r.x, r.y, r.w, r.h);
        else
            snprintf(msg, sizeof(msg), "取点结果:(%d, %d)", r.x, r.y);
        GtkWidget *d = gtk_message_dialog_new(GTK_WINDOW(g_win), GTK_DIALOG_MODAL,
                        GTK_MESSAGE_INFO, GTK_BUTTONS_OK, "%s", msg);
        gtk_dialog_run(GTK_DIALOG(d));
        gtk_widget_destroy(d);
    }
}

static gboolean on_key(GtkWidget *w, GdkEventKey *e, gpointer data)
{
    (void)w; (void)data;
    if (e->keyval == GDK_KEY_F6) { start_run(); return TRUE; }
    return FALSE;
}

static void on_start(GtkWidget *btn, gpointer data) { (void)btn; (void)data; start_run(); }
static void on_stop(GtkWidget *btn, gpointer data) { (void)btn; (void)data; stop_run(); }

static void on_destroy(GtkWidget *w, gpointer data)
{
    (void)w; (void)data;
    g_stop_flag = 1;
    gtk_main_quit();
}

/* ================= 界面构建 ================= */

static GtkWidget *mk_btn(const char *label, GCallback cb, gpointer data)
{
    GtkWidget *b = gtk_button_new_with_label(label);
    g_signal_connect(b, "clicked", cb, data);
    return b;
}

int main(int argc, char **argv)
{
    gtk_init(&argc, &argv);

    task_init(&g_task);
    ac_srand((uint32_t)time(NULL));

    g_win = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(g_win), "保障卡全能工具(Linux)- Excel 导入 · 输入前清空");
    gtk_window_set_default_size(GTK_WINDOW(g_win), 1020, 660);
    g_signal_connect(g_win, "destroy", G_CALLBACK(on_destroy), NULL);
    g_signal_connect(g_win, "key-press-event", G_CALLBACK(on_key), NULL);

    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);
    gtk_container_add(GTK_CONTAINER(g_win), vbox);

    /* 设置区 */
    GtkWidget *hbox1 = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 6);
    gtk_container_set_border_width(GTK_CONTAINER(hbox1), 6);
    gtk_box_pack_start(GTK_BOX(vbox), hbox1, FALSE, FALSE, 0);

    GtkWidget *l1 = gtk_label_new("循环次数(0=无限):");
    gtk_box_pack_start(GTK_BOX(hbox1), l1, FALSE, FALSE, 0);
    g_ed_loops = gtk_entry_new(); gtk_entry_set_width_chars(GTK_ENTRY(g_ed_loops), 5);
    gtk_entry_set_text(GTK_ENTRY(g_ed_loops), "1");
    gtk_box_pack_start(GTK_BOX(hbox1), g_ed_loops, FALSE, FALSE, 0);

    GtkWidget *l2 = gtk_label_new("循环间隔(ms):");
    gtk_box_pack_start(GTK_BOX(hbox1), l2, FALSE, FALSE, 0);
    g_ed_gap = gtk_entry_new(); gtk_entry_set_width_chars(GTK_ENTRY(g_ed_gap), 6);
    gtk_entry_set_text(GTK_ENTRY(g_ed_gap), "500");
    gtk_box_pack_start(GTK_BOX(hbox1), g_ed_gap, FALSE, FALSE, 0);

    GtkWidget *l3 = gtk_label_new("开始倒计时(ms):");
    gtk_box_pack_start(GTK_BOX(hbox1), l3, FALSE, FALSE, 0);
    g_ed_cd = gtk_entry_new(); gtk_entry_set_width_chars(GTK_ENTRY(g_ed_cd), 6);
    gtk_entry_set_text(GTK_ENTRY(g_ed_cd), "0");
    gtk_box_pack_start(GTK_BOX(hbox1), g_ed_cd, FALSE, FALSE, 0);

    GtkWidget *l4 = gtk_label_new("随机抖动(ms):");
    gtk_box_pack_start(GTK_BOX(hbox1), l4, FALSE, FALSE, 0);
    g_ed_jit = gtk_entry_new(); gtk_entry_set_width_chars(GTK_ENTRY(g_ed_jit), 6);
    gtk_entry_set_text(GTK_ENTRY(g_ed_jit), "0");
    gtk_box_pack_start(GTK_BOX(hbox1), g_ed_jit, FALSE, FALSE, 0);

    GtkWidget *lhot = gtk_label_new("   开始:F6    停止:Ctrl+F12(全局)");
    gtk_box_pack_start(GTK_BOX(hbox1), lhot, FALSE, FALSE, 12);

    /* 按钮区 */
    GtkWidget *hbox2 = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 4);
    gtk_container_set_border_width(GTK_CONTAINER(hbox2), 4);
    gtk_box_pack_start(GTK_BOX(vbox), hbox2, FALSE, FALSE, 0);

    gtk_box_pack_start(GTK_BOX(hbox2), mk_btn("添加", G_CALLBACK(on_add), NULL), FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(hbox2), mk_btn("编辑", G_CALLBACK(on_edit), NULL), FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(hbox2), mk_btn("删除", G_CALLBACK(on_del), NULL), FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(hbox2), mk_btn("↑", G_CALLBACK(on_move), GINT_TO_POINTER(-1)), FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(hbox2), mk_btn("↓", G_CALLBACK(on_move), GINT_TO_POINTER(1)), FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(hbox2), mk_btn("≡ 取点", G_CALLBACK(on_quick_pick), NULL), FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(hbox2), mk_btn("导入", G_CALLBACK(on_import), NULL), FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(hbox2), mk_btn("保存任务", G_CALLBACK(on_save), NULL), FALSE, FALSE, 0);
    g_btn_start = mk_btn("▶ 开始执行(F6)", G_CALLBACK(on_start), NULL);
    g_btn_stop = mk_btn("■ 停止(Ctrl+F12)", G_CALLBACK(on_stop), NULL);
    gtk_box_pack_start(GTK_BOX(hbox2), g_btn_start, FALSE, FALSE, 8);
    gtk_box_pack_start(GTK_BOX(hbox2), g_btn_stop, FALSE, FALSE, 0);
    gtk_widget_set_sensitive(g_btn_stop, FALSE);

        /* 列表 */
    g_store = gtk_list_store_new(8,
        G_TYPE_STRING, G_TYPE_STRING, G_TYPE_STRING, G_TYPE_STRING,
        G_TYPE_STRING, G_TYPE_STRING, G_TYPE_STRING, G_TYPE_STRING);
    g_view = gtk_tree_view_new_with_model(GTK_TREE_MODEL(g_store));
    GtkCellRenderer *rend = gtk_cell_renderer_text_new();
    struct { const char *name; } cols[8] = {
        "序号", "类型", "坐标", "次数/格数", "文本 / 按键", "延迟 前/后ms", "备注",
    };
    for (int i = 0; i < 7; i++) {
        GtkTreeViewColumn *col = gtk_tree_view_column_new_with_attributes(cols[i].name, rend, "text", i, NULL);
        gtk_tree_view_column_set_resizable(col, TRUE);
        gtk_tree_view_append_column(GTK_TREE_VIEW(g_view), col);
    }
    GtkTreeSelection *sel = gtk_tree_view_get_selection(GTK_TREE_VIEW(g_view));
    gtk_tree_selection_set_mode(sel, GTK_SELECTION_SINGLE);
    g_signal_connect(g_view, "row-activated", G_CALLBACK(on_edit), NULL);

    GtkWidget *scroll = gtk_scrolled_window_new(NULL, NULL);
    gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(scroll), GTK_POLICY_AUTOMATIC, GTK_POLICY_AUTOMATIC);
    gtk_container_add(GTK_CONTAINER(scroll), g_view);
    gtk_box_pack_start(GTK_BOX(vbox), scroll, TRUE, TRUE, 0);

    /* 状态栏 */
    g_status = gtk_statusbar_new();
    gtk_box_pack_start(GTK_BOX(vbox), g_status, FALSE, FALSE, 0);

    refresh_list();

    /* 全局热键/完成轮询 */
    g_timeout_add(60, finish_check, NULL);

    gtk_widget_show_all(g_win);
    gtk_main();
    return 0;
}
