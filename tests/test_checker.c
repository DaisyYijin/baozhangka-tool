/* test_checker.c - 四表联审核心逻辑测试 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/core/import.h"
#include "../src/core/checker.h"
#include "../src/core/u8.h"

static int fails = 0;
#define CHECK(cond, msg) do { if (!(cond)) { printf("FAIL: %s\n", msg); fails++; } } while (0)

static const char *csv_card =
    "公民身份号码,姓名,部门,人员类别,军衔文职级,岗位职务层级,待遇级别\n"
    "110101199001011234,张三,一部,现役军官,中校,正营职,正营职（十八级）\n"
    "110101199002022345,李四,二部,文职人员,专业技术九级,初职（助理级）,专业技术九级\n"
    "110101199003033456,王五,一部,现役军官,少校,副营职,副营职（十九级）\n";

static const char *csv_hr =
    "身份证号码,姓名,军衔文职级,岗位职务层级\n"
    "110101199001011234,张三,中校,正营职\n"
    "110101199002022345,李四,专业技术九级,初职助理级\n"     /* 与 card 的 初职（助理级） 应等价 */
    "110101199003033456,王五,少校,正连职\n"                   /* 不一致:副营职 vs 正连职 */
    "110101199909099999,赵六,上尉,正连职\n";                  /* 保障卡缺此人 */

static const char *csv_fin =
    "身份证号,姓名,人员类别,待遇级别,岗位职务层级\n"
    "110101199001011234,张三,现役军官,正营职十八级,正营职\n"  /* 括号差异应等价 */
    "110101199002022345,李四,文职人员,专业技术九级,初职(助理级)\n"
    "110101199003033456,王五,现役士兵,副营职（十九级）,副营职\n"; /* 人员类别不一致 */

static const char *csv_uni =
    "公民身份号码,姓名,人员类别\n"
    "110101199001011234,张三,现役军官\n"
    "110101199002022345,李四,文职人员\n";                       /* 被装缺王五 */

static void parse(const char *csv, Sheet *sh)
{
    csv_parse((const uint8_t *)csv, strlen(csv), NULL, sh);
}

int main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);

    /* 字段等价 */
    CHECK(checker_field_equal(L"初职（助理级）", L"初职助理级", CHK_POS), "岗位层级等价");
    CHECK(checker_field_equal(L"正营职（十八级）", L"正营职十八级", CHK_TREAT), "待遇级别等价");
    CHECK(!checker_field_equal(L"正营职", L"副营职", CHK_POS), "岗位层级不等");
    CHECK(checker_field_equal(L"张 三", L"张三", CHK_NORMAL), "普通字段去空格");

    /* 身份证归一化 */
    wchar_t id[24];
    checker_norm_id(L" 11010119900101123x ", id, 24);
    CHECK(wcscmp(id, L"11010119900101123X") == 0, "身份证归一化(大写/trim)");

    /* 四表联审 */
    Sheet sc, sh, sf, su;
    parse(csv_card, &sc);
    parse(csv_hr, &sh);
    parse(csv_fin, &sf);
    parse(csv_uni, &su);

    CheckResult r;
    int rc = checker_run(&sc, &sh, &sf, &su, &r);
    CHECK(rc == 0, "联审应成功");
    if (rc == 0) {
        printf("total=%d issuePersons=%d issues=%d (card=%d hr=%d fin=%d uni=%d)\n",
               r.total, r.issuePersons, r.issueCount,
               r.cardCount, r.hrCount, r.finCount, r.uniCount);
        for (int i = 0; i < r.issueCount; i++) {
            char t8[16], n8[40], i8[32], s8[48], d8[200];
            wcs_to_u8(r.issues[i].type, t8, 15);
            wcs_to_u8(r.issues[i].name, n8, 39);
            wcs_to_u8(r.issues[i].idcard, i8, 31);
            wcs_to_u8(r.issues[i].source, s8, 47);
            wcs_to_u8(r.issues[i].desc, d8, 199);
            printf("  [%s] %s %s %s: %s\n", t8, n8, i8, s8, d8);
        }

        CHECK(r.total == 4, "并集应 4 人");
        CHECK(r.issuePersons == 2, "问题人数应 2(张三/李四全一致)");
        int missCard = 0, missUni = 0, posBad = 0, catBad = 0;
        for (int i = 0; i < r.issueCount; i++) {
            if (wcscmp(r.issues[i].source, L"保障卡") == 0) missCard++;
            if (wcscmp(r.issues[i].source, L"被装") == 0) missUni++;
            if (wcscmp(r.issues[i].source, L"人资-岗位职务层级") == 0) posBad++;
            if (wcscmp(r.issues[i].source, L"财务-人员类别") == 0) catBad++;
        }
        CHECK(missCard == 1, "保障卡缺失1(赵六)");
        CHECK(missUni == 1, "被装缺失1(王五)");
        CHECK(posBad == 1, "岗位层级不一致1(王五)");
        CHECK(catBad == 1, "人员类别不一致1(王五)");
        checker_free(&r);
    }

    /* 主键列缺失 */
    Sheet bad;
    parse("姓名,部门\n张三,一部\n", &bad);
    rc = checker_run(&bad, NULL, NULL, NULL, &r);
    CHECK(rc == -1 && r.err[0], "主键缺失应报错");
    if (rc == -1) printf("err=%ls\n", r.err);

    sheet_free(&sc); sheet_free(&sh); sheet_free(&sf); sheet_free(&su); sheet_free(&bad);
    printf(fails ? "RESULT: FAIL (%d)\n" : "RESULT: PASS\n", fails);
    return fails ? 1 : 0;
}
