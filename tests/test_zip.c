/* test_zip.c - 最小化定位:读 xlsx,列条目,解压 sharedStrings */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../core/zip.h"

static unsigned char *readall(const wchar_t *path, size_t *len)
{
    FILE *f = _wfopen(path, L"rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    unsigned char *buf = (unsigned char *)malloc((size_t)sz);
    if (fread(buf, 1, (size_t)sz, f) != (size_t)sz) { free(buf); fclose(f); return NULL; }
    fclose(f);
    *len = (size_t)sz;
    return buf;
}

static int list_cb(const char *name, void *ud)
{
    (void)ud;
    printf("  entry: %s\n", name);
    fflush(stdout);
    return 0;
}

int main(void)
{
    size_t len = 0;
    printf("step1: read file...\n"); fflush(stdout);
    unsigned char *data = readall(L"examples/test.xlsx", &len);
    if (!data) { printf("read FAIL\n"); return 1; }
    printf("step1 ok: %zu bytes, sig=%02x%02x\n", len, data[0], data[1]); fflush(stdout);

    printf("step2: zip_list...\n"); fflush(stdout);
    int n = zip_list(data, len, list_cb, NULL);
    printf("step2 done: %d\n", n); fflush(stdout);

    printf("step3: zip_read sharedStrings...\n"); fflush(stdout);
    size_t outLen = 0;
    uint8_t *xml = zip_read(data, len, "xl/sharedStrings.xml", 0, NULL, 0, &outLen);
    if (!xml) { printf("step3 FAIL\n"); return 1; }
    printf("step3 ok: %zu bytes\n", outLen);
    fwrite(xml, 1, outLen < 300 ? outLen : 300, stdout);
    printf("\n");
    fflush(stdout);

    printf("step4: zip_read sheet1...\n"); fflush(stdout);
    char actual[256];
    uint8_t *sh = zip_read(data, len, "xl/worksheets/sheet", 1, actual, sizeof(actual), &outLen);
    if (!sh) { printf("step4 FAIL\n"); return 1; }
    printf("step4 ok: %s -> %zu bytes\n", actual, outLen);
    fwrite(sh, 1, outLen < 300 ? outLen : 300, stdout);
    printf("\n");
    fflush(stdout);

    free(xml); free(sh); free(data);
    printf("ALL OK\n");
    return 0;
}
