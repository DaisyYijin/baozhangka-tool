/* ============================================================
 * findimg.h - 找图:模板图像匹配(平台无关)
 * 模板序列化为 CSV 单元格字符串,匹配在灰度 4bit 域进行
 * ============================================================ */
#ifndef AC_FINDIMG_H
#define AC_FINDIMG_H

#ifdef __cplusplus
extern "C" {
#endif

/* 打包:搜索区(sw,sh,0=全屏) + missJump(未找到跳转,0=继续) + 模板灰度图
   (tplGray: tw*th 字节,每字节 0-255)。
   格式:"sw,sh,missJump,<base64>",base64 内容=[u16le tw][u16le th][4bit 打包像素]。
   返回 malloc 字符串(NULL 失败)。尺寸限制:2<=tw,th<=256 且 tw*th<=16384 */
char *findimg_pack(int sw, int sh, int missJump,
                   const unsigned char *tplGray, int tw, int th);

/* 解包 findimg_pack 格式。返回 1 成功(*tpl 为 malloc 的 tw*th 灰度图),
   0 失败(不分配) */
int findimg_unpack(const char *cell, int *sw, int *sh, int *missJump,
                   unsigned char **tpl, int *tw, int *th);

/* 在屏灰度图(scr: sw*sh 字节,0-255)的搜索窗(rx,ry,rw,rh)内查找模板
   (tpl: tw*th)。tol4 为 4bit 域容差(0-15)。
   找到返回 1 并输出匹配中心坐标(相对 scr 原点)*fx,*fy;否则 0 */
int findimg_search(const unsigned char *scr, int sw, int sh,
                   const unsigned char *tpl, int tw, int th, int tol4,
                   int rx, int ry, int rw, int rh, int *fx, int *fy);

#ifdef __cplusplus
}
#endif
#endif /* AC_FINDIMG_H */
