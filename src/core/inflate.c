/* ============================================================
 * inflate.c - DEFLATE 解压实现
 * 算法遵循 RFC 1951,实现参考 zlib 的 puff 参考实现思路
 * (canonical Huffman 解码 + stored/fixed/dynamic 三种块)
 * ============================================================ */
#include "inflate.h"

#define MAXBITS   15      /* Huffman 码最长位数 */
#define MAXLCODES 286     /* 最大字面量/长度码数 */
#define MAXDCODES 30      /* 最大距离码数 */
#define MAXCODES  (MAXLCODES + MAXDCODES)
#define E_FULL    (-100)  /* 内部:输出缓冲满 */

/* 长度码基值与附加位数(RFC1951 3.2.5) */
static const short LENS[29] = {
    3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258
};
static const short LEXT[29] = {
    0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0
};
/* 距离码基值与附加位数 */
static const short DISTS[30] = {
    1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577
};
static const short DEXT[30] = {
    0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13
};

struct state {
    const unsigned char *in;
    size_t inLen, inCnt;
    unsigned char *out;
    size_t outCap, outCnt;
    int bitbuf, bitcnt;
};

struct huffman {
    short count[MAXBITS + 1];
    short symbol[MAXLCODES + 2];
};

/* 读 need 个比特(need <= 15) */
static int getbits(struct state *s, int need)
{
    long val = (long)s->bitbuf;
    while (s->bitcnt < need) {
        if (s->inCnt == s->inLen) return -1;
        val |= (long)(s->in[s->inCnt++]) << s->bitcnt;
        s->bitcnt += 8;
    }
    s->bitbuf = (int)(val >> need);
    s->bitcnt -= need;
    return (int)(val & ((1L << need) - 1));
}

/* canonical Huffman 解码一个符号 */
static int decode_sym(struct state *s, const struct huffman *h)
{
    int code = 0, first = 0, index = 0, len, count;
    for (len = 1; len <= MAXBITS; len++) {
        int b = getbits(s, 1);
        if (b < 0) return -1;
        code |= b;
        count = h->count[len];
        if (code - count < first)
            return h->symbol[index + (code - first)];
        index += count;
        first += count;
        first <<= 1;
        code <<= 1;
    }
    return -9;
}

/* 由码长数组构建解码表,返回剩余可能的码数(<0 表示码长非法) */
static int build_huffman(struct huffman *h, const short *length, int n)
{
    int symbol, len, left;
    short offs[MAXBITS + 1];

    for (len = 0; len <= MAXBITS; len++) h->count[len] = 0;
    for (symbol = 0; symbol < n; symbol++) h->count[length[symbol]]++;
    if (h->count[0] == n) return 0;

    left = 1;
    for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= h->count[len];
        if (left < 0) return left;
    }
    offs[1] = 0;
    for (len = 1; len < MAXBITS; len++)
        offs[len + 1] = (short)(offs[len] + h->count[len]);
    for (symbol = 0; symbol < n; symbol++)
        if (length[symbol] != 0)
            h->symbol[offs[length[symbol]]++] = (short)symbol;
    return left;
}

/* 解压数据块(lit/len + distance 两棵树) */
static int inflate_codes(struct state *s,
                         const struct huffman *lencode,
                         const struct huffman *distcode)
{
    int symbol, len;
    for (;;) {
        symbol = decode_sym(s, lencode);
        if (symbol < 0) return symbol;
        if (symbol < 256) {                        /* 字面量 */
            if (s->outCnt == s->outCap) return E_FULL;
            s->out[s->outCnt++] = (unsigned char)symbol;
        } else if (symbol == 256) {                /* 块结束 */
            break;
        } else {                                   /* 长度/距离匹配 */
            int dist, d;
            symbol -= 257;
            if (symbol >= 29) return -10;
            len = LENS[symbol];
            {
                int e = getbits(s, LEXT[symbol]);
                if (e < 0) return -1;
                len += e;
            }
            dist = decode_sym(s, distcode);
            if (dist < 0) return dist;
            if (dist >= 30) return -11;
            d = DISTS[dist];
            {
                int e = getbits(s, DEXT[dist]);
                if (e < 0) return -1;
                d += e;
            }
            if ((size_t)d > s->outCnt) return -12; /* 距离越过已输出数据 */
            if ((size_t)len > s->outCap - s->outCnt) return E_FULL;
            while (len--) {
                s->out[s->outCnt] = s->out[s->outCnt - (size_t)d];
                s->outCnt++;
            }
        }
    }
    return 0;
}

/* stored(未压缩)块 */
static int inflate_stored(struct state *s)
{
    unsigned len, nlen;

    s->bitbuf = 0;
    s->bitcnt = 0;
    if (s->inCnt + 4 > s->inLen) return -1;
    len  = s->in[s->inCnt] | ((unsigned)s->in[s->inCnt + 1] << 8);
    nlen = s->in[s->inCnt + 2] | ((unsigned)s->in[s->inCnt + 3] << 8);
    s->inCnt += 4;
    if (len != (~nlen & 0xFFFF)) return -2;

    if (len) {
        if (s->inCnt + len > s->inLen) return -1;
        if ((size_t)len > s->outCap - s->outCnt) return E_FULL;
        for (unsigned i = 0; i < len; i++)
            s->out[s->outCnt++] = s->in[s->inCnt++];
    }
    return 0;
}

/* fixed(固定码表)块 */
static int inflate_fixed(struct state *s)
{
    static int built = 0;
    static struct huffman lencode, distcode;
    if (!built) {
        short lengths[MAXLCODES + 2];      /* fixed 需要 288 个 */
        int symbol;
        for (symbol = 0; symbol < 144; symbol++) lengths[symbol] = 8;
        for (; symbol < 256; symbol++) lengths[symbol] = 9;
        for (; symbol < 280; symbol++) lengths[symbol] = 7;
        for (; symbol < 288; symbol++) lengths[symbol] = 8;
        build_huffman(&lencode, lengths, 288);
        for (symbol = 0; symbol < MAXDCODES; symbol++) lengths[symbol] = 5;
        build_huffman(&distcode, lengths, MAXDCODES);
        built = 1;
    }
    return inflate_codes(s, &lencode, &distcode);
}

/* dynamic(动态码表)块 */
static int inflate_dynamic(struct state *s)
{
    static const short order[19] = {
        16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15
    };
    int nlen, ndist, ncode, index, err;
    short lengths[MAXCODES];
    struct huffman lencode, distcode;

    {
        int v = getbits(s, 5); if (v < 0) return -1; nlen = v + 257;
        v = getbits(s, 5);     if (v < 0) return -1; ndist = v + 1;
        v = getbits(s, 4);     if (v < 0) return -1; ncode = v + 4;
    }
    if (nlen > MAXLCODES || ndist > MAXDCODES) return -3;

    for (index = 0; index < ncode; index++) {
        int v = getbits(s, 3); if (v < 0) return -1;
        lengths[order[index]] = (short)v;
    }
    for (; index < 19; index++) lengths[order[index]] = 0;

    err = build_huffman(&lencode, lengths, 19);
    if (err) return -4;

    index = 0;
    while (index < nlen + ndist) {
        int symbol = decode_sym(s, &lencode);
        if (symbol < 0) return symbol;
        if (symbol < 16) {
            lengths[index++] = (short)symbol;
        } else {
            int len = 0, rep;
            if (symbol == 16) {
                if (index == 0) return -5;
                len = lengths[index - 1];
                symbol = getbits(s, 2); if (symbol < 0) return -1;
                symbol += 3;
            } else if (symbol == 17) {
                symbol = getbits(s, 3); if (symbol < 0) return -1;
                symbol += 3;
            } else {
                symbol = getbits(s, 7); if (symbol < 0) return -1;
                symbol += 11;
            }
            if (index + symbol > nlen + ndist) return -6;
            rep = symbol;
            while (rep--) lengths[index++] = (short)len;
        }
    }
    if (lengths[256] == 0) return -9;

    err = build_huffman(&lencode, lengths, nlen);
    if (err && (err < 0 || nlen != lencode.count[0] + lencode.count[1]))
        return -7;
    err = build_huffman(&distcode, lengths + nlen, ndist);
    if (err && (err < 0 || ndist != distcode.count[0] + distcode.count[1]))
        return -8;
    return inflate_codes(s, &lencode, &distcode);
}

int inflate_raw(const unsigned char *in, size_t inLen,
                unsigned char *out, size_t outCap, size_t *outUsed)
{
    struct state s;
    int last, type, err = 0;

    s.in = in;  s.inLen = inLen;  s.inCnt = 0;
    s.out = out; s.outCap = outCap; s.outCnt = 0;
    s.bitbuf = 0; s.bitcnt = 0;

    if (outUsed) *outUsed = 0;
    if (!in || !out) return INFLATE_ERR;

    do {
        last = getbits(&s, 1); if (last < 0) return INFLATE_ERR;
        type = getbits(&s, 2); if (type < 0) return INFLATE_ERR;
        err = (type == 0) ? inflate_stored(&s)
            : (type == 1) ? inflate_fixed(&s)
            : (type == 2) ? inflate_dynamic(&s)
            : -13;
        if (err == E_FULL) { if (outUsed) *outUsed = s.outCnt; return INFLATE_NEED_MEM; }
        if (err) return INFLATE_ERR;
    } while (!last && s.inCnt < s.inLen);

    if (outUsed) *outUsed = s.outCnt;
    return INFLATE_OK;
}
