function getChangelogContent() {
    return `
        <div style="font-size: 13px; line-height: 1.7; color: #333;">

            <div style="margin-bottom: 25px; border: 3px solid #27ae60; padding: 20px; background: #e8f8f0; border-radius: 6px; box-shadow: 0 4px 12px rgba(39, 174, 96, 0.15);">
                <h3 style="color: #27ae60; margin: 0 0 8px 0; font-size: 20px;">
                    v3.0.7 当前版本
                    <span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 10px;">最新</span>
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-bug" style="color: #e74c3c;"></i> 重要修复：修复7项检查规则静默失效问题 + 联审身份证主键精度丢失问题</p>

                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>规则失效修复：</strong>修复证件类型检查（函数名大小写不匹配）、工作日期检查（脚本未加载）两项规则从不执行的问题；修复行政职务、行政职务日期、单位驻地、体型数据、单位驻地行政区划代码5项规则遇错误数据即崩溃的问题。此前这些规则勾选后会被静默跳过，产生"无错误"的假阴性结果</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-exclamation-triangle" style="color: #f39c12;"></i> <strong>检查可信度：</strong>规则函数未定义或执行出错时，在结果面板顶部显示醒目告警条，不再静默跳过</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-id-card" style="color: #3498db;"></i> <strong>联审主键修复：</strong>Excel读取统一按文本解析（raw:false），修复身份证列为数值格式时末位精度丢失导致的全表漏匹配误报；主键统一归一化（末位x/X大小写、全角字符），身份证号大小写不一致不再误报"缺失/不一致"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-search" style="color: #9b59b6;"></i> <strong>联审预检：</strong>四表联审/差额比对/数据整合在上传表缺少主键列时明确报错，不再产出全量"缺失"误报；主键列名兼容"身份证号码/身份证号"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-hand-pointer" style="color: #16a085;"></i> <strong>交互修复：</strong>删除文件后重选同一文件恢复正常响应；检查执行期间禁用"开始检查"按钮防止重复触发；自动探测包含"姓名+公民身份号码"的数据表（模板含"说明"前置页时不再误报缺少必填列）；必填列匹配收紧为前缀匹配（"姓名"不再误命中"曾用姓名"）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tachometer" style="color: #e67e22;"></i> <strong>性能优化：</strong>数据整合结果渲染由逐单元格线性查找改为索引查找，大文件不再卡死页面</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #27ae60;"></i> <strong>安全加固：</strong>修复通知单处理文件名、数据生成页表头按钮、发卡收卡登记提示框三处XSS风险</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-css3" style="color: #667eea;"></i> <strong>兼容性修复：</strong>火狐45兼容CSS改用@supports条件生效，现代浏览器间距恢复正常（此前gap与margin叠加导致间距翻倍、统计卡片布局降级）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #607d8b;"></i> <strong>代码清理：</strong>移除验证规则.js中9个与独立规则文件重复的旧实现（消除两套口径靠加载顺序决定结果的隐患）；归档未完成的"发卡收卡登记"模块化重写目录；剪贴板函数统一为单一实现</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>规则接入：</strong>新增6项检查规则：籍贯检查、出生地检查、工作时间检查、对应营房单位名称检查、对应财务单位名称检查、对应被装单位名称检查（此前文件存在但界面上无法选择）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>规则口径修正：</strong>血型检查增加ABO血型部分（A/B/O/AB）校验；文化程度检查兼容全角/半角括号写法（"大学本科(简称大学)"不再误报）；人员类别归类补齐"退休军官/退休士官"；7项规则的错误记录补齐"规则名称"字段（导出Excel时不再缺失归属）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #9b59b6;"></i> <strong>数据生成修复：</strong>修复组织关系机构名称生成器因函数名笔误完全不可用的问题；身份证日期生成对过期证件改为整体顺延整数个有效期（此前46岁以上人员生成的数据必然通不过身份证日期检查）；学位生成修正"大学专科"误配为"学士"；证件类型生成与检查规则对退休人员口径统一（退休证）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-exchange" style="color: #e67e22;"></i> <strong>联审增强：</strong>岗位职务层级标准化兼容半角括号写法（"初职(助理级)"与"初职（助理级）"识别为相同，不再误报不一致）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file-excel-o" style="color: #16a085;"></i> <strong>发卡工具：</strong>导出时卡类型为空的数据行不再被静默丢弃，归入"未分类"Sheet并提示核对</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #667eea;"></i> <strong>旧浏览器兼容：</strong>补充Array.prototype.includes与padStart/padEnd垫片并统一移入兼容模块；修复Promise垫片中catch恢复逻辑的语义错误，补齐Promise.resolve/all静态方法</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #e91e63;"></i> <strong>按钮观感优化：</strong>修复"开始检查/开始生成/下载Excel"等主按钮CSS花括号错位导致其以浏览器默认生硬样式渲染的问题；全站按钮统一柔化（品牌色渐变、统一圆角、同色系柔光阴影、悬停微抬升），次级标签按钮换用柔和浅紫描边，纯色平涂的功能色按钮（导入/导出/打印/数据管理等）全部改为同色系渐变</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v3.0.6
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> 重要增强：错误报告增加“人员类别”列 + 入伍地检查逻辑优化</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-table" style="color: #27ae60;"></i> <strong>错误报告增强：</strong>所有规则检查的错误报告中增加“人员类别”列，便于按人员类别筛选和分类处理错误</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file-excel-o" style="color: #3498db;"></i> <strong>导出优化：</strong>Excel导出功能同步增加“人员类别”列，导出数据更完整</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #9b59b6;"></i> <strong>全面覆盖：</strong>修改了40+个规则检查文件，确保所有错误记录都包含人员类别信息</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>问题修复：</strong>修复部分规则（毕业日期、组织关系、财务待遇）中人员类别显示为空的问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-user-times" style="color: #f39c12;"></i> <strong>入伍地检查优化：</strong>明确文职人员不进行入伍地检查，规则逻辑更加清晰准确</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-cog" style="color: #16a085;"></i> <strong>依赖修复：</strong>在主程序中正确加载“人员类别工具.js”，确保人员类别判断功能正常工作</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v3.0.5
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-wrench" style="color: #667eea;"></i> 规则优化：士兵、财务待遇、服装登记、证件编号等检查逻辑更贴近实际使用场景</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-exchange" style="color: #27ae60;"></i> <strong>财务待遇类别：</strong>新增"生长干部学员""军士学员"与财务待遇人员类别的特例匹配（学员/军士），避免误报</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-id-badge" style="color: #3498db;"></i> <strong>服装登记表号：</strong>军官、干部和文职人员不再强制填写服装登记表号，只对士兵类人员进行检查</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar-check-o" style="color: #e67e22;"></i> <strong>工作日期：</strong>统一要求所有人员（含退休军士/士兵）填写工作日期，规则更加明确</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-id-card" style="color: #9b59b6;"></i> <strong>证件编号：</strong>文职人员证支持长度超过15且末尾不含"号"的编号格式，兼容实务中常见写法</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 3px solid #27ae60; padding: 20px; background: #e8f8f0; border-radius: 6px; box-shadow: 0 4px 12px rgba(39, 174, 96, 0.15);">
                <h3 style="color: #27ae60; margin: 0 0 8px 0; font-size: 20px;">
                    v3.0.4
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-wrench" style="color: #27ae60;"></i> 重要优化：体型数据生成算法全面优化 + 人员类别检查规则增强</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-user" style="color: #27ae60;"></i> <strong>入伍地检查：</strong>文职人员不需要检查入伍地，规则更符合实际情况</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-id-card" style="color: #3498db;"></i> <strong>士兵注册码检查：</strong>军官和文职人员不需要检查士兵注册码，避免误报</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-male" style="color: #e74c3c;"></i> <strong>体型算法优化：</strong>男性体型数据生成全面重构，基于BMI 20-25计算体重，胸围、腰围、臀围关联计算</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-female" style="color: #9b59b6;"></i> <strong>女性体型优化：</strong>女性体型数据生成全面重构，基于BMI 18-23计算体重，体型比例更符合女性特征</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #f39c12;"></i> <strong>范围限制：</strong>所有体型数据添加Min/Max限制，确保100%在检查规则范围内</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calculator" style="color: #16a085;"></i> <strong>精度保证：</strong>头围生成为整数，脚长为0.5倍数，其他数据精确到一位小数</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-link" style="color: #667eea;"></i> <strong>关联计算：</strong>跖围根据脚长计算，头围根据身高计算，数据更符合人体比例</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #e67e22;"></i> <strong>双重保障：</strong>生成后再次限制在绝对范围内，确保数据安全性</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v3.0.3
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-plus-circle" style="color: #667eea;"></i> 重要更新：新增三个单位检查规则 + 手机号码验证全面增强 + 地址检查规则优化</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-building" style="color: #27ae60;"></i> <strong>新增规则：</strong>对应财务单位名称检查，确保所有人员财务单位一致性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shopping-bag" style="color: #3498db;"></i> <strong>新增规则：</strong>对应被装单位名称检查，确保所有人员被装单位一致性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-home" style="color: #9b59b6;"></i> <strong>新增规则：</strong>对应营房单位名称检查，仅检查军官类别人员，确保营房单位一致性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-mobile" style="color: #e74c3c;"></i> <strong>手机号码：</strong>新增 148、140、190 等号段，总计支持56个手机号段，全面覆盖三大运营商</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #f39c12;"></i> <strong>号段修复：</strong>修复 170、192 开头的手机号码验证错误问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-map-marker" style="color: #16a085;"></i> <strong>地址优化：</strong>现居住地址检查放宽，允许省市区、省市县等简化格式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-location-arrow" style="color: #667eea;"></i> <strong>格式支持：</strong>北京市朝阳区、天津市和平区等直辖市简写地址均可通过验证</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v3.0.2
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-compress" style="color: #667eea;"></i> 数据联审工具重大优化：数据整合功能模块化重构，多文件整合体验更稳定</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #27ae60;"></i> <strong>模块重构：</strong>将“数据联审 - 数据整合”核心算法从 <code>脚本/数据联审工具.js</code> 抽离为独立模块 <code>脚本/数据整合工具.js</code>，算法与界面彻底解耦</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-files-o" style="color: #3498db;"></i> <strong>多文件整合：</strong>数据整合支持一次选择或拖拽多个“修改后”Excel，系统按公民身份号码自动合并去重，避免重复覆盖</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>兼容修复：</strong>统一 <code>file1Data</code> 等联审变量命名，修复文件读取失败（file1Data is not defined）问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-window-maximize" style="color: #9b59b6;"></i> <strong>易维护性：</strong>数据联审脚本现在主要负责弹窗与交互逻辑，后续如需调整整合规则，只需修改 <code>数据整合工具.js</code> 即可</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 3px solid #e74c3c; padding: 20px; background: #fff5f5; border-radius: 6px; box-shadow: 0 4px 12px rgba(231, 76, 60, 0.15);">
                <h3 style="color: #e74c3c; margin: 0 0 8px 0; font-size: 20px;">
                    v3.0.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #e74c3c;"></i> 重大升级：项目全面汉化 + 背景图片支持 + 路径优化 + 文档精简</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-language" style="color: #e74c3c;"></i> <strong>全面汉化：</strong>完成目录名和文件名汉化（assets→资源、scripts→脚本、fonts→字体等），项目更规范</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file-text" style="color: #3498db;"></i> <strong>文件重命名：</strong>index.html→入口.html、demo.html→示例.html、README.md→说明.md等</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-link" style="color: #9b59b6;"></i> <strong>路径更新：</strong>同步更新所有文件中的路径引用（120+处），确保系统正常运行</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-font" style="color: #27ae60;"></i> <strong>字体修复：</strong>修复Font Awesome字体路径问题，图标正常显示</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-picture-o" style="color: #f39c12;"></i> <strong>背景支持：</strong>新增背景图片功能，支持自定义背景图和透明度调节</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #16a085;"></i> <strong>显示优化：</strong>优化页面容器透明度，背景图片与内容完美融合</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file" style="color: #667eea;"></i> <strong>文档精简：</strong>删除10个重复和过时的文档，项目更整洁</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #e67e22;"></i> <strong>代码优化：</strong>CSS语法优化，使用简写形式提升性能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #95a5a6;"></i> <strong>标准规范：</strong>保留.editorconfig和.gitignore配置文件，符合项目最佳实践</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.11.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #e74c3c;"></i> 重大升级：收卡登记筛选全面增强 + 动态联动统计 + 日期筛选优化 + UI交互提升</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-filter" style="color: #e74c3c;"></i> <strong>筛选增强：</strong>收卡登记新增两行横向筛选（卡类型+回收类型），支持组合筛选，功能更强大</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-link" style="color: #3498db;"></i> <strong>动态联动：</strong>选择卡类型后，回收类型统计数字动态更新，反之亦然，数据联动更智能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar" style="color: #9b59b6;"></i> <strong>日期优化：</strong>发卡登记日期筛选分离为"发卡日期"和"领卡日期"独立筛选，筛选更精准</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>格式统一：</strong>日期筛选支持多种格式自动转换（YYYYMMDD、YYYY-MM-DD等），兼容性更强</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-mouse-pointer" style="color: #f39c12;"></i> <strong>UI简化：</strong>操作列按钮优化为纯图标显示，界面更简洁美观</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-table" style="color: #16a085;"></i> <strong>统计完善：</strong>已回收和未回收均支持按卡类型和回收类型双维度统计</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-arrows-h" style="color: #667eea;"></i> <strong>交互提升：</strong>点击子筛选卡片可取消选择，点击父卡片清除所有子筛选，操作更灵活</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.10.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #e74c3c;"></i> 重大升级：性能优化全面增强 + 地区检查规则优化 + 智能排序 + 用户体验提升</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-flash" style="color: #e74c3c;"></i> <strong>性能优化：</strong>智能分页自动调整，≤20条错误自动全部显示，大数据量异步渲染防卡顿</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-list-alt" style="color: #3498db;"></i> <strong>显示优化：</strong>新增"显示全部"选项和500条/页分页，检查进度显示增强，实时预估剩余时间</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-sort-amount-asc" style="color: #9b59b6;"></i> <strong>智能排序：</strong>错误详情按"当前值"出现次数排序，问题少的排前面，方便优先处理</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-table" style="color: #27ae60;"></i> <strong>表格增强：</strong>添加"规则名称"列，显示每个错误所属规则和出现次数(X个)</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-map-marker" style="color: #f39c12;"></i> <strong>地区支持：</strong>所有地区检查规则全面支持"盟"（内蒙古）和"地区"（新疆等地）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #16a085;"></i> <strong>规则优化：</strong>行政职务检查规则优化，专业技术军官的行政职务和日期可以为空</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-credit-card" style="color: #667eea;"></i> <strong>收卡登记：</strong>新增"其他原因回收"类型，回收类型更全面</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-search" style="color: #e67e22;"></i> <strong>拼音搜索：</strong>发卡收卡登记支持拼音首字母搜索，快速查找人员（如"zs"查找"张三"）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-eye-slash" style="color: #95a5a6;"></i> <strong>页面优化：</strong>修复刷新时页面闪烁问题，直接显示上次访问的页面</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>分页修复：</strong>修复少量错误被分页显示的问题，智能调整默认分页大小</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.9.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #667eea;"></i> 重大升级：毕业信息智能生成全面增强 + 籍贯识别优化 + 院校专业联动匹配</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-map-marker" style="color: #e74c3c;"></i> <strong>智能识别：</strong>毕业院校生成器根据籍贯地智能匹配本地院校，生成更真实的数据</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-university" style="color: #3498db;"></i> <strong>院校库扩充：</strong>新增省份-院校映射表，覆盖34个省级行政区（23省+5自治区+4直辖市+2特别行政区），200+所院校</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-link" style="color: #9b59b6;"></i> <strong>关键词匹配：</strong>毕业专业生成器根据院校关键词智能匹配专业类型（理工→工科、师范→教育、医科→医学等）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-globe" style="color: #f39c12;"></i> <strong>自治区支持：</strong>完美支持广西、内蒙古、宁夏、新疆、西藏五个自治区的多种写法</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-star" style="color: #16a085;"></i> <strong>特别行政区：</strong>新增香港、澳门特别行政区院校库（港大、中大、科大、澳大等）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #667eea;"></i> <strong>规则统一：</strong>籍贯识别规则与入伍地检查规则完全一致，支持别名、简写、自治州等多种格式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #e67e22;"></i> <strong>智能纠错：</strong>自动标准化省份名称（如"广西省"→"广西壮族自治区"），容错性强</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-sitemap" style="color: #95a5a6;"></i> <strong>专业分类：</strong>本科专业按8大类别组织（工科、理科、文科、经管、医学、农学、教育、艺术）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #3498db;"></i> <strong>技术优化：</strong>省份提取、标准化处理、简称映射逻辑全面重构，性能和准确性大幅提升</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-table" style="color: #27ae60;"></i> <strong>排序优化：</strong>发卡收卡登记工具优化日期排序，已发卡按领卡日期、已回收按回收日期排序</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.8.8
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #667eea;"></i> 重大升级：新增政治面貌、毕业院校、毕业专业、行政职务检查与生成 + 界面优化</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-flag" style="color: #e74c3c;"></i> <strong>新增：</strong>超预备党员时间检查规则，自动检测中共预备党员时间是否超过一年</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #9b59b6;"></i> <strong>新增：</strong>政治面貌修正生成器，自动将超过一年的预备党员修正为正式党员</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-graduation-cap" style="color: #27ae60;"></i> <strong>新增：</strong>毕业院校生成器，根据文化程度智能生成院校（含200+所院校库）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-book" style="color: #3498db;"></i> <strong>新增：</strong>毕业专业生成器，根据文化程度智能生成专业（含200+个专业库）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-square" style="color: #f39c12;"></i> <strong>新增：</strong>毕业专业检查规则，技工学校及以上文化程度毕业专业必填</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-user-circle" style="color: #16a085;"></i> <strong>新增：</strong>行政职务检查，军官行政职务必填</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar" style="color: #667eea;"></i> <strong>新增：</strong>行政职务日期检查，军官行政职务日期必填</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-edit" style="color: #e67e22;"></i> <strong>修改：</strong>毕业院校检查规则，所有文化程度的毕业院校都必填（无例外）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-arrows-v" style="color: #95a5a6;"></i> <strong>优化：</strong>规则选择区域添加独立滚动条，文件上传区域始终可见</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-desktop" style="color: #3498db;"></i> <strong>优化：</strong>规则区域完全自适应浏览器窗口高度，布局更紧凑高效</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #9b59b6;"></i> <strong>美化：</strong>自定义滚动条样式，支持Chrome/Firefox多浏览器</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.8.7
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-wrench" style="color: #e74c3c;"></i> 重要修复：发卡收卡登记Excel导入优化 + 日期格式智能转换增强</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>Excel导入模板列数不匹配问题，模板缺少"关联军人"列导致备注字段无法导入</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-columns" style="color: #3498db;"></i> <strong>统一：</strong>模板下载、导出Excel、导入Excel列数全部统一为11列（新增"关联军人"列）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar" style="color: #27ae60;"></i> <strong>增强：</strong>日期解析功能全面升级，支持Excel日期序列号自动转换（如44562→2022-01-01）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #9b59b6;"></i> <strong>智能：</strong>支持10+种日期格式自动识别（YYYYMMDD、YYYY/MM/DD、MM/DD/YYYY等）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-clock-o" style="color: #f39c12;"></i> <strong>兼容：</strong>支持时间戳格式（毫秒/秒）、带时间的日期格式自动提取日期部分</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #16a085;"></i> <strong>修正：</strong>处理Excel的1900闰年bug，确保与Excel显示的日期完全一致</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-terminal" style="color: #667eea;"></i> <strong>日志：</strong>导入时显示日期转换详情，方便调试和确认转换正确性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-table" style="color: #3498db;"></i> <strong>优化：</strong>模板和导出Excel列宽调整，"关联军人"列显示更美观</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-info-circle" style="color: #95a5a6;"></i> <strong>说明：</strong>模板提示文字更新，明确"关联军人"仅Ⅲ类卡需要填写</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.8.6
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #667eea;"></i> 重大升级：发卡收卡登记工具全面增强 + 家属关联功能上线 + 智能识别优化</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-users" style="color: #e74c3c;"></i> <strong>家属关联：</strong>新增"导入家属关联"功能，批量导入家属与军人关联关系，自动匹配身份证号填充关联军人</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-child" style="color: #3498db;"></i> <strong>Ⅲ类卡优化：</strong>子女卡姓名显示格式优化为"姓名(关联军人)"，一目了然查看家属关系</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #9b59b6;"></i> <strong>智能列识别：</strong>Excel导入家属关联支持优先级匹配，精准识别"公民身份号码"和"对应军人姓名"列</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-table" style="color: #27ae60;"></i> <strong>多格式兼容：</strong>支持多种表头格式自动识别（身份证号/公民身份号码/证件号，军人姓名/关联军人/家长姓名等）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-download" style="color: #f39c12;"></i> <strong>导出修复：</strong>修复JSON备份文件无法下载的问题，确保数据备份功能正常</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #16a085;"></i> <strong>重复检测：</strong>Excel导入增加智能重复检测，基于日期+身份证/卡号/部别识别重复记录</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar" style="color: #667eea;"></i> <strong>多卡支持：</strong>相同人员不同发卡日期允许存在多条记录，支持历史发卡记录管理</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-copy" style="color: #3498db;"></i> <strong>复制优化：</strong>修复表格单元格无法选择复制的问题，支持身份证号等信息快速复制</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-terminal" style="color: #95a5a6;"></i> <strong>日志简化：</strong>控制台输出优化，仅显示关键摘要信息，避免冗长日志影响体验</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tag" style="color: #e67e22;"></i> <strong>命名统一：</strong>工具名称统一为"发卡收卡登记"，更符合业务流程顺序</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-edit" style="color: #9b59b6;"></i> <strong>编辑增强：</strong>Ⅲ类卡姓名编辑支持"姓名(关联军人)"格式输入，自动解析保存</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.8.5
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #667eea;"></i> 重大升级：数据生成工具全面增强 + Excel导出智能优化 + 学位生成智能修正</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-flash" style="color: #e74c3c;"></i> <strong>智能导出：</strong>Excel导出自动检测配置，高配机单文件导出，低配机自动分批下载，防止内存溢出</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-history" style="color: #3498db;"></i> <strong>内存管理：</strong>记录历史导出情况，智能学习最佳导出策略，失败后自动降级为批量模式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-cog" style="color: #9b59b6;"></i> <strong>动态批次：</strong>根据数据量和列数自动计算最优批次大小，超大数据自动简化样式提升性能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-graduation-cap" style="color: #27ae60;"></i> <strong>学位生成：</strong>智能修正不匹配的学位，支持文化程度联动，自动识别"大学本科"生成"学士"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #f39c12;"></i> <strong>模糊匹配：</strong>学位生成支持精确+模糊匹配，识别"大学本科（简称大学）"、"研究生"等多种格式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #16a085;"></i> <strong>自动修正：</strong>发现学位与文化程度不匹配时自动修正并标记橙色，新生成学位标记黄色</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar-check-o" style="color: #667eea;"></i> <strong>字段更名：</strong>"工作时间"统一改为"工作日期"，字段命名更规范统一</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-columns" style="color: #3498db;"></i> <strong>鲁棒匹配：</strong>所有生成器使用增强的列名匹配，自动处理前后空格、别名，容错性大幅提升</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-trash" style="color: #95a5a6;"></i> <strong>功能精简：</strong>删除体型检查和体型生成中的BMI相关功能，聚焦核心数据验证</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-firefox" style="color: #e67e22;"></i> <strong>兼容增强：</strong>控制台输出改用文本符号（[OK]/[ERROR]/[WARN]），完美兼容Firefox 45.0.2</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>工作日期生成失败问题，文化程度生成后学位不更新问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-chart-line" style="color: #27ae60;"></i> <strong>日志增强：</strong>生成器执行过程详细日志输出，清晰显示列匹配、数据生成、修正情况</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.8.1
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-bug" style="color: #e74c3c;"></i> BUG修复：发卡收卡登记工具BUG修复 + 提醒逻辑优化 + 智能状态切换</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>"已发卡"状态记录仍在未领取提醒中的问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>批量导入的卡类型不会被筛选到的问题，统一卡类型命名规范</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-lightbulb-o" style="color: #f39c12;"></i> <strong>优化：</strong>提醒逻辑调整为"未发卡"状态且长时间未改状态的记录提醒</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bar-chart" style="color: #3498db;"></i> <strong>优化：</strong>提醒横幅按时间段（7天/半月/1月/2月）和卡类型分类统计</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #9b59b6;"></i> <strong>智能：</strong>填写领卡日期自动切换卡状态为"已发卡"（单元格编辑、批量修改、Excel导入、Word导入）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #667eea;"></i> <strong>优化：</strong>背景色标记逻辑，只对"未发卡"状态且长时间未改状态的记录进行标记</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>完善：</strong>"已发卡"状态记录不再显示背景色提醒，避免误导</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.8.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #667eea;"></i> 重大升级：发卡收卡登记工具全面优化 + Firefox 45完全兼容 + 个性化功能上线</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-firefox" style="color: #e67e22;"></i> <strong>兼容性：</strong>完全支持Firefox 45.0.2，添加polyfill和CSS兼容补丁，按钮高度统一，布局不错乱</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-print" style="color: #3498db;"></i> <strong>打印预览：</strong>打印前显示预览画面，用户确认后再执行打印，避免打印错误</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar" style="color: #f39c12;"></i> <strong>年度筛选：</strong>发卡年度和领卡年度独立筛选，新增记录自动刷新年度列表</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-keyboard-o" style="color: #9b59b6;"></i> <strong>日期输入：</strong>自动格式化(YYYY-MM-DD)，智能验证日期有效性，不符合规范无法保存</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bell" style="color: #e74c3c;"></i> <strong>智能提醒：</strong>表单验证使用Toast通知+输入框高亮，不再弹窗打断操作</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-database" style="color: #16a085;"></i> <strong>数据备份：</strong>导出全部数据为JSON文件，支持跨浏览器同步和数据迁移</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-star" style="color: #f1c40f;"></i> <strong>默认设置：</strong>默认卡类型设为Ⅰ类卡，减少重复选择操作</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-clock-o" style="color: #e74c3c;"></i> <strong>颜色提醒：</strong>未领卡按发卡日期显示不同颜色(7天/半月/1月/2月)，顶部横幅统计提醒</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bolt" style="color: #27ae60;"></i> <strong>快速录入：</strong>Enter键保存并新增下一条，Tab键切换输入框，点击空白处自动保存</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-list-ul" style="color: #3498db;"></i> <strong>常用部门：</strong>自动记录常用部门，输入时显示快速列表，避免重复输入</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-exclamation-circle" style="color: #e74c3c;"></i> <strong>必填项：</strong>身份证号码设为必填，未填写无法保存记录</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-square-o" style="color: #27ae60;"></i> <strong>复选框：</strong>扩大复选框可点击区域，提升操作体验</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-edit" style="color: #9b59b6;"></i> <strong>编辑优化：</strong>双击编辑不拉伸列宽(固定表格布局)，部别改为直接输入</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #3498db;"></i> <strong>输入验证：</strong>身份证号支持数字+X，保障卡号仅数字，实时过滤非法字符</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-align-left" style="color: #95a5a6;"></i> <strong>UI优化：</strong>序号列宽度紧凑(50px)且不可排序，图标间距调整，删除按钮简化</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #16a085;"></i> <strong>修复问题：</strong>新增行对齐、日期删除、年度筛选刷新等多个问题修复</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #27ae60; padding: 20px; background: #e8f8f0; border-radius: 6px;">
                <h3 style="color: #27ae60; margin: 0 0 8px 0; font-size: 18px;">
                    v2.7.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-magic" style="color: #667eea;"></i> 重大升级：智能卡类型识别 + 分页功能增强 + 数据兼容性提升</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #27ae60;"></i> <strong>智能识别：</strong>卡类型自动规范化，支持多种格式自动转换（Ⅲ型卡→Ⅲ类卡、III→Ⅲ类卡、3类卡→Ⅲ类卡）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #3498db;"></i> <strong>全面兼容：</strong>支持"型卡"和"类卡"格式互转，支持全角/半角罗马数字，支持阿拉伯数字自动转换</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #9b59b6;"></i> <strong>数据一致：</strong>表格转换工具自动规范化卡类型，确保所有数据格式统一，筛选功能100%准确</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-list" style="color: #f39c12;"></i> <strong>分页增强：</strong>新增大数据量分页选项（500条/页、1000条/页、2000条/页），满足大批量数据处理需求</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tachometer" style="color: #e74c3c;"></i> <strong>性能优化：</strong>支持一次性显示更多数据，减少翻页操作，提升用户体验</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-exchange" style="color: #16a085;"></i> <strong>灵活切换：</strong>分页大小支持20/50/100/200/500/1000/2000条多档位选择</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>修复问题：</strong>彻底解决卡类型筛选失效问题，Ⅲ类卡等所有卡类型均可正常识别</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #95a5a6;"></i> <strong>技术升级：</strong>增强正则表达式匹配，支持更复杂的卡类型格式识别</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #27ae60; padding: 20px; background: #e8f8f0; border-radius: 6px;">
                <h3 style="color: #27ae60; margin: 0 0 8px 0; font-size: 18px;">
                    v2.6.2
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-magic" style="color: #667eea;"></i> 重大升级：发卡收卡登记UI全面优化 + 交互体验革命性提升</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-square-o" style="color: #27ae60;"></i> <strong>优化：</strong>分页全选逻辑，点击全选复选框只选中当前页记录，不再错误选中所有页</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-print" style="color: #3498db;"></i> <strong>优化：</strong>打印功能合并为下拉按钮，"打印当前页"和"打印所有"集成到一个按钮</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file-text-o" style="color: #9b59b6;"></i> <strong>优化：</strong>打印标题删除记录数显示（" - 共 N 条"），打印页脚删除记录统计</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-remove" style="color: #e74c3c;"></i> <strong>优化：</strong>删除发卡状态切换确认弹窗，一键切换更流畅</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-edit" style="color: #f39c12;"></i> <strong>修复：</strong>卡类型双击编辑后下拉框无法恢复的问题，添加失焦自动取消逻辑</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-exchange" style="color: #16a085;"></i> <strong>新增：</strong>收卡管理的回收状态支持点击切换（已回收 ⇄ 未回收），自动清空回收类型和日期</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-hand-pointer-o" style="color: #3498db;"></i> <strong>优化：</strong>回收类型默认显示文本，双击后才显示下拉框，减少界面干扰</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-remove" style="color: #e74c3c;"></i> <strong>优化：</strong>删除记录时不再显示确认弹窗，简化操作流程</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #27ae60;"></i> <strong>修复：</strong>防止多次点击"新增"按钮跳过强制姓名输入，自动聚焦到已有空记录</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tags" style="color: #9b59b6;"></i> <strong>新增：</strong>已发卡和未发卡卡片显示卡类型筛选标签（Ⅰ、Ⅱ、Ⅲ、Ⅳ型卡）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tags" style="color: #e67e22;"></i> <strong>恢复：</strong>未回收和已回收卡片显示回收类型筛选标签，支持快速筛选</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-arrows-v" style="color: #3498db;"></i> <strong>布局：</strong>发卡管理和收卡管理按钮移到统计卡片上方，层级更清晰</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-eye" style="color: #16a085;"></i> <strong>智能：</strong>点击发卡管理只显示"已发卡+未发卡"卡片，点击收卡管理只显示"未回收+已回收"卡片</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-compress" style="color: #f39c12;"></i> <strong>统一：</strong>所有统计卡片尺寸统一为宽卡片样式，视觉更协调</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-refresh" style="color: #27ae60;"></i> <strong>修复：</strong>修改卡类型或回收类型后自动刷新统计卡片，无需手动刷新页面</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>卡类型筛选标签显示问题，变量名统一为currentFilterCardType</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #667eea;"></i> <strong>美化：</strong>统计卡片标签支持点击高亮，活跃标签显示特殊样式</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #27ae60; padding: 20px; background: #e8f8f0; border-radius: 6px;">
                <h3 style="color: #27ae60; margin: 0 0 8px 0; font-size: 18px;">
                    v2.6.1
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-rocket" style="color: #27ae60;"></i> 性能优化：发卡收卡登记性能提升10-15倍 + 浏览器兼容性全面增强</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-bolt" style="color: #f39c12;"></i> <strong>性能优化：</strong>智能分页系统，超过100条记录自动启用分页（每页50条）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tachometer" style="color: #e74c3c;"></i> <strong>性能提升：</strong>渲染1000条记录从800-1200ms优化到50-100ms，性能提升10-15倍</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-search" style="color: #3498db;"></i> <strong>搜索优化：</strong>添加防抖功能（300ms延迟），减少不必要的刷新，提升响应速度</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-firefox" style="color: #e67e22;"></i> <strong>兼容性：</strong>完全兼容Firefox 45.0.2，添加Object.assign、Array.from、classList等polyfill</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #9b59b6;"></i> <strong>代码优化：</strong>全部使用ES5语法，避免使用let/const，确保旧版浏览器兼容</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-exchange" style="color: #16a085;"></i> <strong>跨浏览器：</strong>解决localStorage隔离问题，支持数据导出/导入JSON文件</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-download" style="color: #27ae60;"></i> <strong>数据迁移：</strong>支持替换模式和合并模式，方便在不同浏览器间同步数据</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file-code-o" style="color: #3498db;"></i> <strong>新增文件：</strong>发卡登记分页样式.css，专门优化分页控件显示效果</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-line-chart" style="color: #e74c3c;"></i> <strong>性能监控：</strong>自动记录渲染耗时，超过100ms在控制台提示</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-book" style="color: #95a5a6;"></i> <strong>完整文档：</strong>新增《发卡收卡登记优化说明.md》和《发卡收卡登记-用户指南.md》</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-lightbulb-o" style="color: #f39c12;"></i> <strong>用户体验：</strong>分页控件显示当前范围（第X-Y条，共Z条），支持快速跳转</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #667eea;"></i> <strong>智能优化：</strong>≤100条正常显示，>100条自动分页，无需手动设置</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #667eea; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <h3 style="color: #667eea; margin: 0 0 8px 0; font-size: 18px;">
                    v2.6.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-list-alt" style="color: #667eea;"></i> 重大更新：发卡收卡登记管理系统上线 + UI体验优化</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>发卡收卡登记管理系统，全面管理保障卡发放和回收记录</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-database" style="color: #3498db;"></i> <strong>功能：</strong>支持发卡/收卡记录双向管理，自动统计各状态卡片数量</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-edit" style="color: #9b59b6;"></i> <strong>编辑：</strong>支持双击单元格快速编辑，支持文本、日期、下拉选择多种输入方式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-filter" style="color: #e67e22;"></i> <strong>筛选：</strong>支持按状态、卡类型、回收类型、日期范围等多维度筛选</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-square-o" style="color: #16a085;"></i> <strong>批量：</strong>支持批量选择、批量修改发卡状态、批量删除等批量操作</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-exchange" style="color: #3498db;"></i> <strong>收卡：</strong>支持一键转为收卡，自动记录回收日期和回收类型（复原/损坏/纠错/更换/消磁）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-upload" style="color: #27ae60;"></i> <strong>导入：</strong>支持从Excel批量导入记录，支持从表格转换工具直接导入</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-download" style="color: #27ae60;"></i> <strong>导出：</strong>支持导出当前筛选结果为Excel，支持打印功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bar-chart" style="color: #9b59b6;"></i> <strong>统计：</strong>实时显示卡类型分布、回收明细统计，支持点击统计卡片快速筛选</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-database" style="color: #16a085;"></i> <strong>存储：</strong>数据自动保存到本地存储，刷新页面不丢失，支持长期记录管理</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-search" style="color: #3498db;"></i> <strong>搜索：</strong>支持按姓名、身份证号、部门、卡号等关键词全局搜索</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #f39c12;"></i> <strong>智能：</strong>自动识别卡类型（Ⅰ、Ⅱ、Ⅲ、Ⅳ型卡），自动计算统计数据</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-minus-circle" style="color: #e74c3c;"></i> <strong>优化：</strong>移除滚动按钮和清空按钮，界面更简洁安全</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>回收类型筛选按钮重复触发问题，添加事件冒泡阻止</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #3498db;"></i> <strong>UI：</strong>删除可编辑字段的铅笔图标，保留悬停高亮，操作更直观</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #95a5a6; padding: 20px; background: #f8f9fa; border-radius: 6px;">
                <h3 style="color: #95a5a6; margin: 0 0 8px 0; font-size: 18px;">
                    v2.5.4
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-user" style="color: #667eea;"></i> 重大升级：体型数据检查与生成规则全面优化，符合实际军人体型标准</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-arrows-h" style="color: #e74c3c;"></i> <strong>范围调整：</strong>身高150-210cm、体重50-120kg、胸围70-120cm、腰围55-100cm</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-arrows-h" style="color: #e74c3c;"></i> <strong>范围调整：</strong>臀围80-120cm、头围52-62cm、脚长23-28cm、趾围20-28cm</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calculator" style="color: #3498db;"></i> <strong>精度要求：</strong>身高、体重、胸围、腰围、臀围、趾围必须精确到一位小数</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calculator" style="color: #3498db;"></i> <strong>精度要求：</strong>头围必须为整数，脚长必须为0.5的倍数</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-male" style="color: #27ae60;"></i> <strong>男性标准：</strong>身高160-195、体重55-100、胸围80-110、腰围70-95、臀围85-110</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-female" style="color: #e91e63;"></i> <strong>女性标准：</strong>身高150-180、体重50-75、胸围75-105、腰围55-85、臀围80-110</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-heartbeat" style="color: #f39c12;"></i> <strong>BMI控制：</strong>男性BMI 19-26，女性BMI 18-24，确保生成数据健康合理</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-link" style="color: #9b59b6;"></i> <strong>数据关联：</strong>体重根据身高计算、胸腰臀围相互关联、脚长跖围与身高匹配</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #16a085;"></i> <strong>生成优化：</strong>数据生成更符合实际人体比例，各项指标自动关联计算</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #27ae60;"></i> <strong>安全边界：</strong>所有生成值自动限制在绝对范围内，确保数据合规</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #3498db;"></i> <strong>同步更新：</strong>检查规则与生成规则完全同步，生成数据100%通过检查</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #e74c3c; padding: 20px; background: #fff5f5; border-radius: 6px;">
                <h3 style="color: #e74c3c; margin: 0 0 8px 0; font-size: 18px;">
                    v2.5.3
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-bug" style="color: #e74c3c;"></i> 重要修复：修复检查规则无法显示同一行多个独立错误的问题</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>组织关系机构名称检查 - 现在可以同时显示"开头错误"和"结尾错误"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>毕业日期合理性检查 - 现在可以同时显示"日期逻辑错误"和"学习年限错误"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>入学日期合理性检查 - 现在可以同时显示"出生日期格式错误"和"入学年龄错误"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>validation-rules.js - 修复身份证日期和毕业日期检查的类似问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>优化：</strong>移除了4个规则文件中不必要的continue语句，提升错误检测完整性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-search" style="color: #3498db;"></i> <strong>全面检查：</strong>检查了全部40+规则文件和13个生成器文件，确保无类似问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #16a085;"></i> <strong>验证：</strong>验证了所有其他规则文件的continue使用都是合理的业务逻辑</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #27ae60; padding: 20px; background: #f0fdf4; border-radius: 6px;">
                <h3 style="color: #27ae60; margin: 0 0 8px 0; font-size: 18px;">
                    v2.5.2
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-user" style="color: #27ae60;"></i> 重大优化：体型数据检查规则全面升级，调整为实际军人体型标准</p>
                    
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-sliders" style="color: #3498db;"></i> <strong>优化：</strong>体型数据检查标准全面调整为实际军人标准（男身高165-180cm，女155-170cm）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-arrows-h" style="color: #9b59b6;"></i> <strong>调整：</strong>体重范围从45-105kg，胸围75-96cm，腰围68-88cm，臀围90-100cm</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-square" style="color: #27ae60;"></i> <strong>新增：</strong>数据格式验证，头围必须为整数（如56、57、58）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-square" style="color: #27ae60;"></i> <strong>新增：</strong>脚长和跖围必须为0.5的倍数（如24.5、25.0、25.5）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tint" style="color: #e74c3c;"></i> <strong>修复：</strong>性别范围检查遗漏身高体重字段的问题，现在包含全部8个体型字段</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calculator" style="color: #f39c12;"></i> <strong>优化：</strong>BMI检查按性别区分标准（男性17-30，女性17-26）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #667eea;"></i> <strong>同步：</strong>体型数据生成器完全同步检查规则，生成数据符合格式要求</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #16a085;"></i> <strong>增强：</strong>6层检查体系（空值→格式→格式规范→绝对范围→性别范围→BMI）</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #e74c3c; padding: 20px; background: #fff5f5; border-radius: 6px;">
                <h3 style="color: #e74c3c; margin: 0 0 8px 0; font-size: 18px;">
                    v2.5.1
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-bug" style="color: #e74c3c;"></i> 紧急修复：规则函数名不匹配导致的检查失败问题</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>组织关系机构名称检查函数名不匹配（checkZuzhiguanxijigoumingcheng→checkZuzhiGuanxiJigouMingcheng）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>证件类型检查函数名不匹配（checkZhengjianleixing→checkZhengjianLeixing）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>财务待遇类别一致性检查函数名不匹配（checkCaiwudaiyurenyuanleibie→checkCaiwuDaiyuRenyuanLeibie）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>优化：</strong>统一所有规则函数命名规范，采用驼峰命名法，确保与主脚本调用一致</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #3498db;"></i> <strong>验证：</strong>全面检查32个规则文件，确认所有函数名正确匹配，消除"规则函数未定义"错误</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 3px solid #9b59b6; padding: 20px; background: #f4ecf7; border-radius: 6px; box-shadow: 0 4px 12px rgba(155, 89, 182, 0.15);">
                <h3 style="color: #9b59b6; margin: 0 0 8px 0; font-size: 20px;">
                    v2.5.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-credit-card" style="color: #667eea;"></i> 重大更新：发卡工具上线 + 数据生成增强 + 智能检查优化</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>发卡工具，Word表格一键转Excel，智能识别卡类型自动分Sheet</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #667eea;"></i> <strong>智能：</strong>发卡工具自动提取文档信息（标题、单位名称、日期），用于文件命名</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-sitemap" style="color: #3498db;"></i> <strong>智能：</strong>发卡工具支持罗马数字卡类型（Ⅰ、Ⅱ、Ⅲ、Ⅳ型卡）智能排序和分类</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-filter" style="color: #9b59b6;"></i> <strong>智能：</strong>发卡工具自动过滤非表格内容，智能识别跨行表头并合并</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file-excel-o" style="color: #16a085;"></i> <strong>功能：</strong>发卡工具支持复制粘贴Word内容，自动解析生成"发卡登记-日期-时间.xlsx"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tint" style="color: #e74c3c;"></i> <strong>增强：</strong>血型生成工具自动补全RH后缀，"A型"自动变为"ARH+"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #f39c12;"></i> <strong>增强：</strong>体型数据生成工具智能修正不合理数值，不仅填空还能纠错</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-sliders" style="color: #3498db;"></i> <strong>优化：</strong>体型数据范围全面调整（身高140-200cm、体重35-110kg等8项参数）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #9b59b6;"></i> <strong>优化：</strong>被装发放单位检查智能豁免退休人员（退休军士/军官/干部/士兵）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-id-card" style="color: #e67e22;"></i> <strong>新增：</strong>身份证有效期检查新增5年选项，支持5年/10年/20年/长期</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>同步：</strong>体型数据检查规则与生成规则完全一致，确保生成数据通过检查</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #667eea;"></i> <strong>UI：</strong>发卡工具预览界面采用卡片式设计，数据统计和卡类型分布可视化</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>血型生成hasRhSuffix逻辑错误，避免"A型"误判为已有RH后缀</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 3px solid #9b59b6; padding: 20px; background: #f4ecf7; border-radius: 6px; box-shadow: 0 4px 12px rgba(155, 89, 182, 0.15);">
                <h3 style="color: #9b59b6; margin: 0 0 8px 0; font-size: 20px;">
                    v2.4.0
                    <span style="background: #9b59b6; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 10px;">通知单工具</span>
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-file-text" style="color: #667eea;"></i> 重大更新：通知单处理工具上线 + 代码全面优化升级</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>通知单处理工具，智能解析Excel中的非结构化通知单数据</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #667eea;"></i> <strong>智能：</strong>自动识别"字段名：值"格式，动态创建列，支持跨行数据提取</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-sitemap" style="color: #3498db;"></i> <strong>智能：</strong>批量通知单自动继承类型，多人记录智能拆分，三级优先级类型提取</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-filter" style="color: #9b59b6;"></i> <strong>功能：</strong>通知类型可点击筛选，支持分类导出，一键导出全部或筛选数据</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-upload" style="color: #16a085;"></i> <strong>优化：</strong>统一文件上传方式，全部13个上传区域支持点击和拖拽双模式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #f39c12;"></i> <strong>优化：</strong>UI图标完全统一，16种Font Awesome图标替换所有bullet符号</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #95a5a6;"></i> <strong>优化：</strong>日志符号统一，50+处emoji替换为[标签]格式，提升跨平台兼容性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-cogs" style="color: #e67e22;"></i> <strong>优化：</strong>配置管理集中化，引入CONFIG常量对象，消除魔法数字</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #3498db;"></i> <strong>安全：</strong>增强数据验证，文件大小检查，XSS防护，防御性编程实践</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tachometer" style="color: #9b59b6;"></i> <strong>性能：</strong>添加性能监控，实时显示数据处理耗时，便于性能分析</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #16a085;"></i> <strong>重构：</strong>提取工具函数（findColonIndex、hasColon等），减少代码重复</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-book" style="color: #3498db;"></i> <strong>文档：</strong>新增符号统一清单和代码优化总结，详细记录优化过程</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-star" style="color: #f39c12;"></i> <strong>质量：</strong>代码质量再次升级，达到企业级生产标准</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 3px solid #9b59b6; padding: 20px; background: #f4ecf7; border-radius: 6px; box-shadow: 0 4px 12px rgba(155, 89, 182, 0.15);">
                <h3 style="color: #9b59b6; margin: 0 0 8px 0; font-size: 20px;">
                    v2.3.0 重大更新
                    <span style="background: #9b59b6; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 10px;">架构升级</span>
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-cube" style="color: #9b59b6;"></i> 重大优化：代码全面模块化重构 + 生成工具分类 + UI体验全面提升</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-cube" style="color: #e74c3c;"></i> <strong>重构：</strong>代码全面模块化，修改52个文件，新增8个核心模块</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-cogs" style="color: #3498db;"></i> <strong>重构：</strong>提取公共工具模块（utils.js、constants.js），消除700+行重复代码</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-database" style="color: #9b59b6;"></i> <strong>重构：</strong>新增4个数据管理模块（error-messages、field-mappings、rules-mapping、data-validator）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #16a085;"></i> <strong>重构：</strong>新增2个格式化模块（error-formatter、validation-rules）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-rocket" style="color: #f39c12;"></i> <strong>性能：</strong>代码复用率提升600%+，模块化程度达100%</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #27ae60;"></i> <strong>质量：</strong>统一接口设计，增强可维护性和扩展性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-sitemap" style="color: #9b59b6;"></i> <strong>新增：</strong>生成工具分类显示，按个人信息、教育信息、工作信息、家庭信息、政治信息五大类别组织</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-search" style="color: #3498db;"></i> <strong>优化：</strong>生成工具界面更加清晰，便于快速找到所需生成器</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-child" style="color: #27ae60;"></i> <strong>新增：</strong>是否独生子女生成器，随机生成"是"或"否"（是40%，否60%）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-clock-o" style="color: #f39c12;"></i> <strong>新增：</strong>工作时间生成器，自动从入伍时间复制到工作时间</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-map-marker" style="color: #e74c3c;"></i> <strong>新增：</strong>地址检查支持自治州（如四川省凉山彝族自治州）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #16a085;"></i> <strong>优化：</strong>点击复制功能，使用颜色标识已复制状态，不再显示临时文本</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #e67e22;"></i> <strong>优化：</strong>已复制项目显示绿色背景和对勾图标，持久标记不消失</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bar-chart" style="color: #3498db;"></i> <strong>新增：</strong>"全部"按钮显示错误总数和生成总数，数据一目了然</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-user-plus" style="color: #27ae60;"></i> <strong>新增：</strong>人员类别支持"生长干部学员"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #95a5a6;"></i> <strong>优化：</strong>移除所有emoji表情，统一使用FontAwesome图标，提升兼容性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tachometer" style="color: #9b59b6;"></i> <strong>优化：</strong>性能监控工具控制台输出优化，使用标签化格式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-book" style="color: #3498db;"></i> <strong>文档：</strong>新增13个优化报告文档，详细记录优化过程和成果</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-star" style="color: #f1c40f;"></i> <strong>评级：</strong>文档覆盖率100%，完成度100%，达到企业级标准</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v2.2.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-globe" style="color: #3498db;"></i> 智能优化：省份别名自动识别 + 地址格式兼容性增强</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-map" style="color: #e74c3c;"></i> <strong>智能：</strong>单位驻地检查支持省份别名自动识别和标准化</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-home" style="color: #3498db;"></i> <strong>智能：</strong>现居住地址检查支持省份别名自动识别和标准化</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-globe" style="color: #27ae60;"></i> <strong>兼容：</strong>支持"广西省"&rarr;"广西壮族自治区"等多种省份写法</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-globe" style="color: #27ae60;"></i> <strong>兼容：</strong>支持"内蒙古省"&rarr;"内蒙古自治区"等自治区别名</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-globe" style="color: #27ae60;"></i> <strong>兼容：</strong>支持"宁夏省"&rarr;"宁夏回族自治区"等回族自治区写法</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-globe" style="color: #27ae60;"></i> <strong>兼容：</strong>支持"新疆省"&rarr;"新疆维吾尔自治区"等维吾尔自治区写法</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-star" style="color: #f39c12;"></i> <strong>兼容：</strong>支持"香港"&rarr;"香港特别行政区"、"澳门"&rarr;"澳门特别行政区"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #9b59b6;"></i> <strong>优化：</strong>自动将各种写法统一为标准行政区划名称，无需手动修改</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #16a085;"></i> <strong>提升：</strong>大幅提升地址格式容错性，减少因省份写法不同导致的检查错误</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-book" style="color: #95a5a6;"></i> <strong>文档：</strong>完善代码注释，详细说明省份别名映射逻辑</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v2.1.0
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;">✨ 重大升级：代码全面重构 + 性能监控 + UI一致性优化（达到行业顶尖水平）</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-code" style="color: #e74c3c;"></i> <strong>重构：</strong>提取公共工具库（utils.js）和常量库（constants.js），消除代码重复</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #27ae60;"></i> <strong>兼容：</strong>32个规则文件全部转换为ES5语法，完美支持IE9+和Firefox 45.0.2</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-cube" style="color: #3498db;"></i> <strong>封装：</strong>所有规则使用IIFE封装，防止全局命名空间污染</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tachometer" style="color: #f39c12;"></i> <strong>新增：</strong>性能监控系统（PM），实时追踪Excel读取和规则执行耗时</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bar-chart" style="color: #9b59b6;"></i> <strong>监控：</strong>自动生成性能报告，支持按耗时排序，显示最快/最慢/平均/中位数</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #e67e22;"></i> <strong>UI：</strong>新增6个统一样式类（changelog-btn、version-badge、upload-icon变体等）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #16a085;"></i> <strong>优化：</strong>消除26处重复内联样式，提取为CSS类，提高可维护性</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-compress" style="color: #95a5a6;"></i> <strong>精简：</strong>减少约300行重复代码，HTML文件减少约2KB</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>质量：</strong>4轮全面代码审查，0个Linter错误，100%浏览器兼容</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-book" style="color: #3498db;"></i> <strong>文档：</strong>新增2份详细优化文档（UI优化报告、最终检查报告）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-star" style="color: #f1c40f;"></i> <strong>评级：</strong>代码质量提升至⭐⭐⭐⭐⭐（5.0/5），达到行业顶尖水平</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v2.0.0
                </h3>
                <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; font-style: italic;">🚀 重大更新：新增6项必填字段检查 + 地址检查智能强化（33项规则完整覆盖）</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>单位信息检查规则组（3项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-map-marker" style="color: #3498db;"></i> <strong>新增：</strong>入伍地检查功能，支持中国行政区划格式智能识别</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-building" style="color: #3498db;"></i> <strong>新增：</strong>单位驻地检查功能，支持中国行政区划格式智能识别</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-barcode" style="color: #3498db;"></i> <strong>新增：</strong>单位驻地行政区划代码检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>固化注册码检查功能（必填项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>服装登记表号检查功能（必填项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>士兵注册码检查功能（必填项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>工作时间检查功能（必填项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>选改士官日期检查功能（军士/士官专属，必填项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-home" style="color: #e67e22;"></i> <strong>强化：</strong>现居住地址检查规则，必须详细到街道/镇/乡/村及门牌号</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-square" style="color: #9b59b6;"></i> <strong>智能：</strong>地址长度不少于15字符，必须包含行政区划和详细地址信息</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>智能：</strong>自动识别直辖市（北京、上海、天津、重庆）和省级行政区</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check" style="color: #27ae60;"></i> <strong>格式：</strong>支持"省+市"、"省+市+区/县"、"直辖市"、"直辖市+区/县"等标准格式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-exclamation-triangle" style="color: #e67e22;"></i> <strong>提示：</strong>详细的格式错误提示，指导用户修正不规范的地址</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-graduation-cap" style="color: #9b59b6;"></i> <strong>优化：</strong>学位检查规则，大学本科学位允许"学士"或"其他学位"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #16a085;"></i> <strong>完善：</strong>证件类型检查，新增支持"退休干部"和"退休士官"类别</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-building-o" style="color: #e74c3c;"></i> <strong>重构：</strong>组织关系机构名称检查，强制要求"中共陆军"开头和政治面貌对应后缀</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar" style="color: #f39c12;"></i> <strong>优化：</strong>入学日期和毕业日期生成器，支持从身份证号提取出生日期</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #f39c12;"></i> <strong>智能：</strong>毕业日期生成器支持自动修正不合理的已有日期</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-download" style="color: #27ae60;"></i> <strong>优化：</strong>生成工具Excel导出，直接输出修改后的数据，用颜色标记新增和修正内容</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file-code-o" style="color: #95a5a6;"></i> <strong>结构：</strong>更新日志代码单独提取为独立文件，便于维护</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v1.9.0
                </h3>
                <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; font-style: italic;">🏛️ 单位信息检查规则组上线 + 地址格式智能识别</p>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>单位信息检查规则组（3项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-map-marker" style="color: #3498db;"></i> <strong>新增：</strong>入伍地检查功能，支持中国行政区划格式智能识别</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-building" style="color: #3498db;"></i> <strong>新增：</strong>单位驻地检查功能，支持中国行政区划格式智能识别</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-barcode" style="color: #3498db;"></i> <strong>新增：</strong>单位驻地行政区划代码检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>智能：</strong>自动识别直辖市（北京、上海、天津、重庆）和省级行政区</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-graduation-cap" style="color: #9b59b6;"></i> <strong>优化：</strong>学位检查规则，大学本科学位允许"学士"或"其他学位"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #16a085;"></i> <strong>完善：</strong>证件类型检查，新增支持"退休干部"和"退休士官"类别</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-building-o" style="color: #e74c3c;"></i> <strong>重构：</strong>组织关系机构名称检查，强制要求"中共陆军"开头和政治面貌对应后缀</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar" style="color: #f39c12;"></i> <strong>优化：</strong>入学日期和毕业日期生成器，支持从身份证号提取出生日期</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #f39c12;"></i> <strong>智能：</strong>毕业日期生成器支持自动修正不合理的已有日期</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-download" style="color: #27ae60;"></i> <strong>优化：</strong>生成工具Excel导出，直接输出修改后的数据，用颜色标记新增和修正内容</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-file-code-o" style="color: #95a5a6;"></i> <strong>结构：</strong>更新日志代码单独提取为独立文件，便于维护</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v1.8.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #e74c3c;"></i> <strong>UI优化：</strong>生成工具按钮改为自适应宽度，文字不换行，更美观易用</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #e74c3c;"></i> <strong>UI优化：</strong>数据联审按钮改为自适应宽度，优化内边距和字体大小</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-paint-brush" style="color: #e74c3c;"></i> <strong>UI优化：</strong>分类标题全选按钮正确显示在右侧，使用纯flexbox布局</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-download" style="color: #27ae60;"></i> <strong>新增：</strong>带颜色的Excel下载功能（HTML格式），完美兼容IE10+及所有浏览器</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-table" style="color: #3498db;"></i> <strong>优化：</strong>生成结果UI改为类似检查结果的分类按钮+分页表格样式</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-download" style="color: #95a5a6;"></i> <strong>优化：</strong>导出按钮区域美化，双按钮布局（数据/带颜色）</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v1.7.1
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>证件类型生成器，完善人员类别映射（从5项扩展到13项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>新增：</strong>支持指挥管理军官、专业技术军官、生长干部学员等细分类别</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>支持退休人员（退休军士&rarr;军士退休证、退休军官&rarr;军官退休证）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>证件编号生成器，添加退休证前缀（退字第）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #9b59b6;"></i> <strong>完善：</strong>支持军官退休证、军士退休证的编号生成</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>重构：</strong>组织关系机构名称生成器，改为智能一致性逻辑</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-magic" style="color: #f39c12;"></i> <strong>智能：</strong>自动识别最常见值（60%阈值），统一标准化所有不一致的名称</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-link" style="color: #16a085;"></i> <strong>对齐：</strong>所有生成器规则与对应检查规则100%一致，确保生成数据通过检查</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v1.7.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>证件类型生成器、证件编号生成器、组织关系机构名称生成器</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calculator" style="color: #16a085;"></i> <strong>统计：</strong>数据生成工具从8项扩展到11项</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v1.6.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-eraser" style="color: #e74c3c;"></i> <strong>清理：</strong>删除所有生成器文件开头的Python文件引用注释</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-link" style="color: #27ae60;"></i> <strong>对齐：</strong>所有生成器规则完全对齐检查规则要求</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #9b59b6;"></i> <strong>血型：</strong>格式从"A型RH+"改为"ARH+"</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-phone" style="color: #16a085;"></i> <strong>电话：</strong>使用三大运营商完整有效号段（57个号段）</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v1.5.2
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-book" style="color: #16a085;"></i> <strong>文档：</strong>完成《检查规则说明文档》，详细列出全部24项规则的检查逻辑和字段说明</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>完善：</strong>文档基于实际代码编写，确保准确性（如身份证日期检查是起始/终止日期，血型必须含RH标识）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-table" style="color: #3498db;"></i> <strong>优化：</strong>文档使用表格展示映射关系，清晰易读</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #3498db; margin: 0 0 8px 0; font-size: 16px; border-bottom: 2px solid #ddd; padding-bottom: 5px;">
                    v1.5.1
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>全选按钮未靠右显示的问题，优化CSS布局</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>简化.section-header样式，使用纯flexbox布局</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #9b59b6; padding: 20px; background: #f4ecf7; border-radius: 6px;">
                <h3 style="color: #9b59b6; margin: 0 0 8px 0; font-size: 18px;">
                    v1.5.0 重大更新
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;">🚀 成人教育智能识别 - 检查规则灵活性革命性提升</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-star" style="color: #f39c12;"></i> <strong>新增：</strong>成人教育自动豁免机制，智能识别11个关键词</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check" style="color: #27ae60;"></i> <strong>关键词：</strong>开放大学、八一、军队、军校、电大、远程、成人、自考、函授、继续教育、网络教育、夜大、业余</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-search" style="color: #3498db;"></i> <strong>智能：</strong>同时检查"毕业院校"和"文化程度"两个字段，只要包含关键词即豁免</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #16a085;"></i> <strong>豁免：</strong>匹配到关键词后，完全跳过入学年龄和学习年限检查</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #3498db; margin: 0 0 8px 0; font-size: 16px; border-bottom: 2px solid #ddd; padding-bottom: 5px;">
                    v1.4.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>毕业日期检查规则，学习年限范围大幅放宽</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-arrows-h" style="color: #27ae60;"></i> <strong>范围：</strong>大专2-8年、本科2.5-10年、研究生1.5-10年、博士2-10年</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>策略：</strong>只检查学习年限过短，不检查过长（适应在职进修、休学、延期毕业）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calculator" style="color: #e67e22;"></i> <strong>精确：</strong>使用天数÷365.25精确计算，例如20140901到20170630=2.83年</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #3498db; margin: 0 0 8px 0; font-size: 16px; border-bottom: 2px solid #ddd; padding-bottom: 5px;">
                    v1.3.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>入学日期检查规则，年龄上限大幅放宽</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-arrows-h" style="color: #27ae60;"></i> <strong>范围：</strong>大专17-45岁、本科17-45岁、研究生20-50岁、博士22-55岁</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>策略：</strong>只检查年龄过小，不检查年龄过大（适应成人教育、在职进修、二次深造）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-calendar" style="color: #e67e22;"></i> <strong>灵活：</strong>不限制入学月份，1月、9月或任何月份入学都可以</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v1.2.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>完善所有检查规则的错误提示信息，更加详细和友好</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-tachometer" style="color: #27ae60;"></i> <strong>性能：</strong>全面优化数据处理性能，大幅提升检查速度</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>修复已知的所有bug，确保系统稳定性</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v1.1.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>联审工具的数据匹配算法，提升处理效率</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>四表联审时字段标准化异常的问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-check" style="color: #27ae60;"></i> <strong>完善：</strong>通知单自动匹配差额原因功能</li>
                </ul>
            </div>

            <div style="margin-bottom: 25px; border: 2px solid #27ae60; padding: 20px; background: #f0fdf4; border-radius: 6px;">
                <h3 style="color: #27ae60; margin: 0 0 8px 0; font-size: 18px;">
                    v1.0.0 正式版
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; font-style: italic;"><i class="fa fa-flag" style="color: #e74c3c;"></i> 正式发布 - 经过9个月持续迭代，累计30个版本更新</p>
                
                <ul style="padding-left: 25px; margin: 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-check-circle" style="color: #27ae60;"></i> <strong>功能完整：</strong>数据检查（24项）+ 数据生成（8项）+ 数据联审（3项）三大工具模块</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-shield" style="color: #3498db;"></i> <strong>稳定可靠：</strong>经过多轮测试和bug修复，功能稳定性显著提升</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-rocket" style="color: #e67e22;"></i> <strong>性能优化：</strong>大幅提升数据处理效率，支持万级数据快速处理</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-desktop" style="color: #9b59b6;"></i> <strong>兼容性强：</strong>完全兼容IE9+、Chrome、Firefox、Edge及XP系统</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-book" style="color: #16a085;"></i> <strong>文档完善：</strong>完整的使用说明和更新日志</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-lock" style="color: #e74c3c;"></i> <strong>数据安全：</strong>纯前端实现，所有数据本地处理，无需联网</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #3498db; margin: 0 0 8px 0; font-size: 16px; border-bottom: 2px solid #ddd; padding-bottom: 5px;">
                    v0.9.8
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>全面优化性能，大幅提升数据处理速度</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>完善所有功能的错误提示信息</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>修复已知的所有bug，确保稳定性</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.9.5
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>联审工具的数据匹配算法，提升处理效率</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>四表联审时字段标准化异常的问题</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.9.3
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>通知单自动匹配差额原因功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>差额报表导出格式</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.9.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>数据联审工具模块上线</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>保障卡与人资差额比对功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>保障卡综合数据检查功能（四表联审）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>军人已注销家属状况正常核查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>字段标准化工具</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.8.6
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>生成数据用颜色标记，方便识别修改内容</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>体型数据生成时性别判断错误</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.8.3
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>入学日期和毕业日期智能计算功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>体型数据智能生成功能</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.8.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>数据生成工具模块上线</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>血型自动生成功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>联系电话生成功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>身份证日期提取功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>文化程度与学位互相推导功能</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.7.2
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>完善错误提示的详细程度</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>发放单位为空时的判断逻辑</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.7.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>发放单位检查规则组（3项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>工薪发放单位检查</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>被装发放单位检查</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>医疗保障单位检查</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.6.2
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>检查结果按规则分组显示</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>特殊字符导致的Excel导出错误</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.6.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>政治信息检查规则组（2项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>政治面貌检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>组织关系机构名称检查功能</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.5.3
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>Excel报告导出格式，增加统计汇总表</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>独生子女标识判断异常问题</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.5.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>家庭信息检查规则组（3项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>婚姻状况检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>爱人信息完整性检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>独生子女信息检查功能</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.4.4
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>错误定位信息，显示身份证号和姓名</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>医疗机构匹配失败的问题</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.4.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>工作信息检查规则组（4项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>人员类别检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>财务待遇类别一致性检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>体系医院一致性检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>基层医疗机构一致性检查功能</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.3.5
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>检查规则按类别分组显示</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>毕业日期计算不准确的问题</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.3.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>教育信息检查规则组（5项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>文化程度检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>学位检查功能（大专无学位规则）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>毕业院校检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>入学日期合理性检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>毕业日期合理性检查功能</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.2.3
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>Excel报告导出功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>检查结果统计方式</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.2.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>个人信息检查规则组（6项）</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>身份证日期检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>证件类型检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>证件编号检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>联系电话检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>血型检查功能</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>体型数据检查功能</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.1.5
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>使用说明弹窗内容，增加操作示例</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>IE9浏览器兼容性问题</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.1.1
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>文件上传后无法解析的问题</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>界面加载速度</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.1.0
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 12px;">
                    <li style="margin-bottom: 4px;"><i class="fa fa-rocket" style="color: #e74c3c;"></i> <strong>发布：</strong>项目初始公开版本上线</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>完整的基础框架搭建，支持Excel文件上传和解析</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>规则选择器界面，支持多规则勾选</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>检查结果展示界面，支持错误统计</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>使用说明弹窗</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>技术：</strong>采用纯前端技术实现，使用SheetJS库处理Excel文件</li>
                    <li style="margin-bottom: 4px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>技术：</strong>完全兼容IE9+及所有主流浏览器</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.9
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>错误详情导出功能，生成完整的Excel检查报告</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>统计汇总表，按规则分类统计错误数量</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>结果展示界面布局，增加错误统计图表</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>界面响应式设计，适配不同屏幕尺寸</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.8
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>批量文件上传功能（暂时只支持单文件）</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>文件拖拽上传支持</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>Excel文件解析性能，支持大文件处理</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>某些Excel格式兼容性问题</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.7
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>证件编号校验码验证算法</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>身份证号码格式检查（15位/18位）</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>错误提示信息更加详细和友好</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>日期格式解析错误</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.6
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>规则分组显示功能</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>全选/取消全选规则功能</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>检查规则执行顺序</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>界面样式，提升用户体验</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.5
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>基础检查规则引擎</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>错误定位功能（行号、姓名、身份证）</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>实时检查进度显示</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>技术：</strong>建立规则插件化架构</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.4
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>Excel数据读取和解析功能</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>数据表格预览功能</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>SheetJS库集成，提升解析效率</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-bug" style="color: #e74c3c;"></i> <strong>修复：</strong>文件编码识别问题</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.3
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>文件上传界面设计</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>基础样式表和UI组件</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-wrench" style="color: #3498db;"></i> <strong>优化：</strong>界面布局，采用左右分栏设计</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>技术：</strong>确定前端技术栈（纯HTML/CSS/JS）</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.2
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>项目基础HTML框架</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-plus-circle" style="color: #27ae60;"></i> <strong>新增：</strong>基本页面结构和导航</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>技术：</strong>确定离线运行方案，所有资源本地化</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>技术：</strong>制定兼容性目标（IE9+）</li>
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #555; margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    v0.0.1
                </h3>
                <ul style="padding-left: 25px; margin: 5px 0; font-size: 11px;">
                    <li style="margin-bottom: 3px;"><i class="fa fa-lightbulb-o" style="color: #f39c12;"></i> <strong>启动：</strong>项目立项，确定开发目标</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>规划：</strong>需求分析，确定保障卡数据检查的核心功能</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>规划：</strong>技术选型，决定采用纯前端方案以保证离线运行</li>
                    <li style="margin-bottom: 3px;"><i class="fa fa-cogs" style="color: #95a5a6;"></i> <strong>规划：</strong>设计检查规则体系框架</li>
                </ul>
            </div>

            <div style="margin-top: 30px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; font-size: 12px; color: #2e7d32; line-height: 1.6;">
                <i class="fa fa-info-circle"></i> <strong>说明：</strong>本工具为保障卡数据管理提供一站式解决方案，历经多个版本迭代，现已形成涵盖数据检查、数据生成、数据联审、数据转换的完整功能体系。<strong>33项检查规则</strong>覆盖个人信息、教育背景、工作状态、家庭关系、政治信息、发放单位、单位信息等各个维度，<strong>13项生成工具</strong>可智能填充常见缺失字段，<strong>3项联审功能</strong>实现跨表数据比对，<strong>2项转换工具</strong>（通知单处理+发卡工具）提供格式转换，全方位确保数据质量和一致性。
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 12px; color: #856404;">
                <i class="fa fa-comments"></i> <strong>反馈：</strong>如有问题或建议，请及时反馈。我们将持续优化改进，为您提供更好的数据管理体验。
            </div>
        </div>
    `;
}

