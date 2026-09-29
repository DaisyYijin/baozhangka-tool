#!/bin/sh
# ============================================================
# Linux 构建脚本(x86_64 / ARM64 / ARM32 通用)
# 依赖:GTK3 + X11 + XTest(各发行版均可直接安装)
#
#   Debian/Ubuntu:  sudo apt install gcc pkg-config libgtk-3-dev libxtst-dev
#   树莓派:         sudo apt install gcc pkg-config libgtk-3-dev libxtst-dev
#   Fedora:         sudo dnf install gcc pkgconf-pkg-config gtk3-devel libXtst-devel
#   Arch:           sudo pacman -S gtk3 libxtst
# ============================================================
set -e
cd "$(dirname "$0")/.."

echo "检查依赖..."
pkg-config --exists gtk+-3.0 x11 xtst || {
    echo "缺少 GTK3/X11/XTest 开发库,请先安装(见脚本头部注释)"
    exit 1
}

CFLAGS="-std=c99 -O2 -Wall -Isrc/core -Isrc/gtk $(pkg-config --cflags gtk+-3.0 x11 xtst)"
LIBS="$(pkg-config --libs gtk+-3.0 x11 xtst) -lm"

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
    src/gtk/platform_x11.c \
    src/gtk/main.c \
    $LIBS

echo ""
echo "构建成功: dist/baozhangka-tool"
echo "运行: ./dist/baozhangka-tool"
uname -m | grep -q arm && echo "(当前架构: $(uname -m))"
