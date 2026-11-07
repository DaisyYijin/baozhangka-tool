#!/bin/sh
# ============================================================
# Linux 构建脚本(x86_64 / ARM64 / ARM32 通用)
# 依赖:仅 X11 + XTest(任何 X11 桌面系统自带,运行时零安装)
#
#   构建环境(仅开发者编译时需要):
#     Debian/Ubuntu/树莓派: sudo apt install gcc pkg-config libx11-dev libxtst-dev
#     Fedora:               sudo dnf install gcc pkgconf-pkg-config libX11-devel libXtst-devel
#     Arch:                 sudo pacman -S libx11 libxtst
# ============================================================
set -e
cd "$(dirname "$0")/.."

echo "检查依赖..."
pkg-config --exists x11 xtst || {
    echo "缺少 X11/XTest 开发库,请先安装(见脚本头部注释)"
    exit 1
}

CFLAGS="-std=c99 -O2 -Wall -Isrc/core -Isrc/linux $(pkg-config --cflags x11 xtst)"
LIBS="$(pkg-config --libs x11 xtst) -lm -lpthread"

mkdir -p dist
echo "编译中..."
gcc $CFLAGS -o dist/baozhangka-tool \
    src/core/u8.c \
    src/core/inflate.c \
    src/core/zip.c \
    src/core/sheet.c \
    src/core/engine.c \
    src/core/ac_keys.c \
    src/core/import.c \
    src/linux/platform_x11.c \
    src/linux/xui.c \
    src/linux/main.c \
    $LIBS

echo ""
echo "构建成功: dist/baozhangka-tool"
echo "运行: ./dist/baozhangka-tool"
echo "(当前架构: $(uname -m))"
echo "运行时依赖:仅 libX11 + libXtst(X11 桌面自带,无需安装任何东西)"
