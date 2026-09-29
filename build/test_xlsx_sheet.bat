@echo off
cd /d "%~dp0.."
set PATH=C:\msys64\mingw32\bin;%PATH%
C:\msys64\mingw32\bin\gcc.exe -std=c99 -O2 -Wall -DUNICODE -D_UNICODE -Isrc/core tests\test_xlsx_sheet.c src\core\u8.c src\core\inflate.c src\core\zip.c src\core\sheet.c src\core\engine.c src\core\ac_keys.c src\core\import.c -o build\test_xlsx_sheet.exe
if errorlevel 1 ( echo COMPILE FAILED & exit /b 1 )
build\test_xlsx_sheet.exe
