/* ============================================================
 * checker.h - 保障卡四表联审(保障卡/人资/财务/被装 数据一致性检查)
 * 由网页版「保障卡综合检查工具」的核心逻辑移植(字段标准化.js +
 * 保障卡综合检查.js),平台无关。
 * ============================================================ */
#ifndef AC_CHECKER_H
#define AC_CHECKER_H

#include "sheet.h"

#ifdef __cplusplus
extern "C" {
#endif

/* 字段类型(标准化比对模式) */
#define CHK_POS      0   /* 岗位职务层级 */
#define CHK_RANK     1   /* 军衔文职级 */
#define CHK_TREAT    2   /* 待遇级别 */
#define CHK_NORMAL   3   /* 普通字段 */

/* 一条问题记录 */
typedef struct {
    wchar_t idcard[24];
    wchar_t name[32];
    wchar_t dept[48];
    wchar_t type[8];       /* 缺失 / 不一致 */
    wchar_t source[24];    /* 如 人资-姓名 */
    wchar_t desc[160];     /* 说明 */
} CheckIssue;

/* 联审结果 */
typedef struct {
    int total;             /* 参与比对的人数(主键并集) */
    int issuePersons;      /* 有问题的人数 */
    int cardCount, hrCount, finCount, uniCount;
    CheckIssue *issues;
    int issueCount, issueCap;
    wchar_t err[160];      /* 预检错误信息(空=无错) */
} CheckResult;

/* 字段标准化比对:两值按类型归一化后是否相等 */
int checker_field_equal(const wchar_t *a, const wchar_t *b, int fieldType);

/* 身份证主键归一化(全角转半角/去空格/大写),写入 out(cap 字符) */
void checker_norm_id(const wchar_t *v, wchar_t *out, int cap);

/* 四表联审。四张表传 Sheet(首行为表头;主键列支持
   公民身份号码/身份证号码/身份证号),未选择的表传 NULL。
   成功返回 0(out->issues 由调用方用 checker_free 释放);
   预检失败(主键列缺失等)返回 -1,错误写 out->err。 */
int checker_run(const Sheet *card, const Sheet *hr,
                const Sheet *fin, const Sheet *uni, CheckResult *out);

void checker_free(CheckResult *r);

#ifdef __cplusplus
}
#endif
#endif
