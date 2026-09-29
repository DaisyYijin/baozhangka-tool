# 保障卡全能工具(BaoZhangKa Tool)

一个**单文件、免安装、跨平台**的自动点击 / 自动输入工具。

## 下载(按系统 / 架构选择)

到 [**Releases**](../../releases) 页面选择对应版本:

| Release 产物 | 系统 | 架构 | 说明 |
|---|---|---|---|
| `baozhangka-tool-windows-xp-x86.zip` | **Windows XP SP3** ~ Win11 | x86(32 位) | 零依赖单文件 exe,Win7/10/11 的 32/64 位通用 |
| `baozhangka-tool-linux-x86_64.tar.gz` | Linux(桌面发行版) | x86_64 / AMD64 | 依赖系统 GTK3 + X11 |
| `baozhangka-tool-linux-arm64.tar.gz` | Linux | **ARM64 / aarch64**(树莓派 4/5、ARM 小主机、国产 ARM 平台) | 原生编译 |
| `baozhangka-tool-linux-armhf.tar.gz` | Linux | ARM32 / armhf(树莓派 3 等 32 位系统) | 原生编译 |
| `baozhangka-checker-web.zip` | 任意(浏览器) | — | **网页版保障卡综合检查工具**(数据校验/联审/字段生成),解压后双击 `主程序.html` 使用;**Windows 主程序已内置**(exe 单文件含全部工具文件,侧栏「综合检查」一键打开,自动解压到用户目录) |

> **Windows on ARM(Surface Pro X /骁龙本)**:直接使用 `windows-xp-x86` 版,
> Win11 ARM 的内置 x86 模拟即可运行,无需单独的 ARM64 版本。
>
> **Windows XP**:本项目自诞生起就保持 XP 兼容(32 位、静态链接、
> 仅使用 XP 自带系统库),`windows-xp-x86` 即 XP 版,无需单独下载。

Windows 版与 Linux 版共享同一套核心引擎(纯 C 编写,见 `src/core`)。

---

## 功能一览

- **屏幕取点**:全屏半透明覆盖 + 十字线;**点哪里就取哪里的精确坐标**
- **点击类动作**:单击、双击、多击(次数/间隔可设)、右击、中击
- **文本输入**:支持中文(剪贴板粘贴方式,任何程序可用);**支持"输入前清空"**(自动 Ctrl+A → 删除 → 输入)
- **按键 / 组合键**:`ctrl+s`、`alt+tab`、`win+r`、`F5`、`enter` …
- **其它动作**:等待、滚轮(可正可负)、鼠标拖动(起点→终点平滑移动)
- **Excel 导入**:
  - **导入步骤**:`.xlsx`(Excel 2007+)或 `.csv`,一键生成全部步骤
  - **导入输入列**:Excel 第一列每行文本 → 自动生成一串输入步骤
- **任务文件 = 标准 CSV**:保存的任务可用 Excel 直接打开编辑,再导回来
- **循环执行**:次数(0=无限)、循环间隔、开始倒计时、随机抖动
- **全局热键**:**F6 开始 / Ctrl+F12 停止**(任何界面下生效)

## 快速开始

### Windows

1. 双击 `dist\BaoZhangKaTool.exe` 即可运行,无需安装任何东西。
2. 自己编译:

```bat
build\windows_build.bat
```

(需要 [MSYS2](https://www.msys2.org/) 的 MinGW-w64 i686 工具链:
`pacman -S mingw-w64-i686-gcc`,脚本默认使用 `C:\msys64`)

### Linux

```sh
# 安装依赖(Debian/Ubuntu/树莓派示例)
sudo apt install gcc pkg-config libgtk-3-dev libxtst-dev

# 编译(自动识别架构:x86_64 / aarch64 / armhf 均可)
sh build/linux_build.sh

# 运行
./dist/baozhangka-tool
```

> 提示:Linux 下输入合成依赖 X11 桌面(XTest 扩展)。Wayland 用户请在登录界面选择
> "XX on X11" 会话运行。

## 使用说明

### 界面操作

1. **添加步骤**:点【添加】→ 选择步骤类型(卡片)→ 填写参数,点【≡ 屏幕取点】在屏幕上点一下即取该处精确坐标 → 确定
2. **修改步骤**:双击列表行,或选中后点【编辑】
3. **调整顺序**:选中步骤后【↑ 上移】【↓ 下移】,或右键菜单
4. **开始 / 停止**:【▶ 开始执行】或按 `F6`;**任何时刻按 `Ctrl+F12` 立即停止**
5. **执行前设置**:
   - 循环次数:`0` 表示无限循环
   - 循环间隔:每轮之间等待的毫秒数
   - 开始倒计时:点击开始后预留的反应时间(建议 ≥3000ms,把鼠标移到目标窗口)
   - 随机抖动:每个延时附加 0~N 毫秒随机量(更拟人)

### 各动作说明

| 动作 | 需要填写的字段 | 说明 |
|---|---|---|
| 单击 / 双击 / 右击 / 中击 | X、Y | 点哪里就点哪里,坐标精确 |
| 多击 | X、Y、次数、间隔 | 连续 N 次单击 |
| 文本输入 | 文本内容(支持中文) | 剪贴板方式输入;勾选"输入前清空"会先 Ctrl+A 删除原内容 |
| 按键 | 文本列填组合键 | 如 `ctrl+s`、`alt+F4`、`win+r`、`enter`、`ctrl+shift+t` |
| 等待 | 前延时 | 停留指定毫秒数 |
| 滚轮 | 次数列填格数 | 正=向上,负=向下 |
| 拖动 | 起点坐标 + 终点 | 从起点平滑拖到终点 |
| 所有动作 | 前延时 / 后延时 | 执行前/后各等待多久 |

### Excel 导入格式

第一行是**表头**(可省略,列顺序可打乱,按表头名识别):

| 动作 | X | Y | 次数 | 间隔毫秒 | 文本或按键 | 前延时毫秒 | 后延时毫秒 | 输入前清空 | 启用 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| 单击 | 100 | 200 | | | | 0 | 200 | | 是 | |
| 输入 | | | | | 你好,世界 | 0 | 300 | 是 | 是 | 先清空 |
| 按键 | | | | | | | ctrl+s | 0 | 300 | | 是 | |
| 等待 | | | | | | | | 1500 | 0 | | 是 | |
| 滚动 | | | | | -3 | | | 0 | 200 | | 是 | |
| 拖动 | 100 | 100 | | | | | 500,400 | 0 | 200 | | 是 | 终点写在文本列 |

- **动作** 可写中文(单击/双击/多击/右击/中击/输入/按键/等待/滚动/拖动)或英文(click/double/multi/rclick/mclick/text/key/wait/scroll/drag)
- **拖动** 的终点以 `x2,y2` 写在"文本或按键"列
- **滚动** 的格数写在"次数"列(正=向上,负=向下)
- **是/否** 也可写 1/0、true/false
- 保存的任务文件(`.csv`)就是这个格式,可直接用 Excel 编辑后再打开

> `.csv` 编码支持:UTF-8(推荐)、ANSI/GBK、UTF-16。
> `.xls` 老格式请先在 Excel 中另存为 `.xlsx` 或 `.csv`。

## 常见问题

**Q:为什么点击没反应 / 点错位置?**
执行期间不要移动鼠标;先在目标窗口上点一次让它获得焦点(可加一个"单击"步骤);多显示器下坐标基于虚拟屏幕,取点功能取到的就是实际坐标。

**Q:输入中文没反应?**
中文通过剪贴板输入(Ctrl+V),目标程序必须支持粘贴。部分游戏屏蔽粘贴,此时改用"按键"动作输入英文。

**Q:XP 上能跑吗?**
能。程序按 32 位 + 子系统 5.01(Windows XP)编译,不依赖任何运行库,DLL 仅使用 XP 自带的系统库(kernel32/user32/gdi32/comctl32/comdlg32/msvcrt)。

**Q:怎么停止?**
任何界面按 **Ctrl+F12**(全局热键)。当前动作完成后立即停止。

## 项目结构

```
├── src/
│   ├── core/               跨平台核心(Windows/Linux 共用)
│   │   ├── ac_defs.h       数据结构与平台抽象接口
│   │   ├── engine.c        执行引擎与任务管理
│   │   ├── ac_keys.c       统一键码与组合键解析
│   │   ├── u8.c            UTF-8/UTF-16/UCS-4 转换
│   │   ├── inflate.c       DEFLATE 解压(读 xlsx)
│   │   ├── zip.c           ZIP 读取(读 xlsx)
│   │   ├── sheet.c         xlsx / CSV 解析为表格
│   │   └── import.c        Excel↔步骤、任务存取
│   ├── win/                Windows 后端(Win32 API,XP~Win11)
│   │   ├── gui.c           主界面
│   │   ├── dlg_edit.c      步骤编辑对话框
│   │   ├── picker.c        全屏取点
│   │   ├── platform_win.c  SendInput/剪贴板/热键
│   │   └── app.rc/.manifest 资源与 comctl32 v6 清单
│   └── gtk/                Linux 后端(GTK3 + X11/XTest)
│       ├── main.c          主界面
│       └── platform_x11.c  XTest 输入合成/剪贴板/热键
├── build/
│   ├── windows_build.bat   Windows 构建
│   ├── linux_build.sh      Linux 构建(x86/ARM 通用)
│   └── make_test_xlsx.ps1  生成测试用 xlsx
├── tests/                  单元测试(解析/导入/按键)
├── examples/
│   ├── 示例任务.csv         可直接打开的示例任务
│   └── test.xlsx           测试用 Excel
└── dist/                   构建产物
```

## 构建(开发者)

Windows(32 位,XP 兼容):

```bat
build\windows_build.bat
```

关键参数:`-municode -mwindows -static -Wl,--subsystem,windows:5.01`

Linux(任意架构):

```sh
sh build/linux_build.sh
```

运行测试:

```sh
gcc -std=c99 -O2 -Wall -Isrc/core -DUNICODE tests/test_sheet.c src/core/*.c src/win/platform_win.c -o build/test_sheet.exe -lgdi32 -luser32 && build/test_sheet.exe
```
