@echo off
rem ============================================================
rem Windows build (XP~Win11, 32-bit, static, single exe)
rem Toolchain: MSYS2 MinGW-w64 i686
rem ============================================================
setlocal
if not defined MSYS2_ROOT set MSYS2_ROOT=C:\msys64
set PATH=%MSYS2_ROOT%\mingw32\bin;%PATH%
set GCC=%MSYS2_ROOT%\mingw32\bin\gcc.exe
set WINDRES=%MSYS2_ROOT%\mingw32\bin\windres.exe

if not exist build mkdir build
if not exist dist  mkdir dist

echo [1/2] windres ...
%WINDRES% src\win\app.rc -O coff -o build\app_res.o
if errorlevel 1 goto :err

echo [2/2] gcc ...
%GCC% -std=c99 -O2 -Wall -municode -mwindows -DUNICODE -D_UNICODE -Isrc/core -Isrc/win -Wl,--subsystem,windows:5.01 -Wl,--major-os-version=5 -Wl,--minor-os-version=1 -static -o dist\BaoZhangKaTool.exe src\core\u8.c src\core\inflate.c src\core\zip.c src\core\sheet.c src\core\engine.c src\core\ac_keys.c src\core\import.c src\win\platform_win.c src\win\picker.c src\win\dlg_edit.c src\win\gui.c build\app_res.o -lcomctl32 -lcomdlg32 -lgdi32 -luser32 -lshell32 -limm32
if errorlevel 1 goto :err

echo.
echo BUILD OK: dist\BaoZhangKaTool.exe
exit /b 0

:err
echo.
echo BUILD FAILED!
exit /b 1
