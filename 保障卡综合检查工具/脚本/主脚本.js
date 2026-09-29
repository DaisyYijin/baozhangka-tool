/**
 * 主脚本 - 数据检查工具核心逻辑
 * 
 * 功能概述：
 * 1. 管理检查规则的选择和显示
 * 2. 处理Excel文件上传和解析
 * 3. 执行数据检查并显示结果
 * 4. 提供结果导出功能
 * 5. 管理用户偏好设置（localStorage）
 * 
 * 主要模块：
 * - RULES_MAPPING: 规则分类映射
 * - StorageManager: 本地存储管理
 * - PaginationManager: 分页管理
 * - UI交互: 文件上传、规则选择、结果展示
 *
 * 作者：未知
 * 创建时间：未知
 * 最后修改时间：未知
 */

/**
 * 规则映射表
 * 按类别组织所有检查规则，每个规则包含：
 * - key: 唯一标识
 * - name: 显示名称
 * - func: 对应的检查函数名
 *
 * 规则分类包括：
 * - 个人信息：身份证、证件、联系电话、血型等个人基本信息检查
 * - 教育信息：学历、学位、毕业院校等相关信息检查
 * - 工作信息：人员类别、职务、单位等职业信息检查
 * - 家庭信息：婚姻状况、配偶、子女等家庭情况检查
 * - 政治信息：政治面貌、组织关系等政治背景检查
 * - 发放单位：工资、被装、医疗等发放单位信息检查
 * - 单位信息：入伍地、驻地等单位相关信息检查
 */
var RULES_MAPPING = {
    "个人信息": [
        { key: "身份证日期检查", name: "身份证日期检查", func: "checkShenfenzhengRiqi" },
        { key: "证件类型检查", name: "证件类型检查", func: "checkZhengjianLeixing" },
        { key: "证件编号检查", name: "证件编号检查", func: "checkZhengjianBianhao" },
        { key: "联系电话检查", name: "联系电话检查", func: "checkLianxiDianhua" },
        { key: "血型检查", name: "血型检查", func: "checkXuexing" },
        { key: "体型数据检查", name: "体型数据检查", func: "checkTixing" },
        { key: "固化注册码检查", name: "固化注册码检查", func: "checkGuhuaZhucema" },
        { key: "服装登记表号检查", name: "服装登记表号检查", func: "checkFuzhuangDengjibiaohao" },
        { key: "现居住地址检查", name: "现居住地址检查", func: "checkXianjuzhudizhi" },
        { key: "士兵注册码检查", name: "士兵注册码检查", func: "checkShibingZhucema" },
        { key: "籍贯检查", name: "籍贯检查", func: "checkJiguan" },
        { key: "出生地检查", name: "出生地检查", func: "checkChushengdi" }
    ],
    "教育信息": [
        { key: "文化程度检查", name: "文化程度检查", func: "checkWenhuaChengdu" },
        { key: "学位检查", name: "学位检查", func: "checkXuewei" },
        { key: "毕业院校检查", name: "毕业院校检查", func: "checkBiyeYuanxiao" },
        { key: "毕业专业检查", name: "毕业专业检查", func: "checkBiyeZhuanye" },
        { key: "入学日期合理性检查", name: "入学日期合理性检查", func: "checkRuxueRiqi" },
        { key: "毕业日期合理性检查", name: "毕业日期合理性检查", func: "checkBiyeRiqi" }
    ],
    "工作信息": [
        { key: "人员类别检查", name: "人员类别检查", func: "checkRenyuanLeibie" },
        { key: "行政职务检查", name: "行政职务检查", func: "checkXingzhengZhiwu" },
        { key: "行政职务日期检查", name: "行政职务日期检查", func: "checkXingzhengZhiwuRiqi" },
        { key: "财务待遇类别一致性检查", name: "财务待遇类别一致性检查", func: "checkCaiwuDaiyuRenyuanLeibie" },
        { key: "体系医院一致性检查", name: "体系医院一致性检查", func: "checkTixiYiyuan" },
        { key: "基层医疗机构一致性检查", name: "基层医疗机构一致性检查", func: "checkJicengYiliaoJigou" },
        { key: "工作日期检查", name: "工作日期检查", func: "checkGongzuoRiqi" },
        { key: "工作时间检查", name: "工作时间检查", func: "checkGongzuoShijian" },
        { key: "选改士官日期检查", name: "选改士官日期检查", func: "checkXuangaiShiguanRiqi" }
    ],
    "家庭信息": [
        { key: "婚姻状况检查", name: "婚姻状况检查", func: "checkHunyin" },
        { key: "爱人信息完整性检查", name: "爱人信息完整性检查", func: "checkAirenQingkuang" },
        { key: "独生子女信息检查", name: "独生子女信息检查", func: "checkDushengZinv" }
    ],
    "政治信息": [
        { key: "政治面貌检查", name: "政治面貌检查", func: "checkZhengzhiMianmao" },
        { key: "超预备党员时间检查", name: "超预备党员时间检查", func: "checkChaoYubeiDangyuanShijian" },
        { key: "组织关系机构名称检查", name: "组织关系机构名称检查", func: "checkZuzhiGuanxiJigouMingcheng" }
    ],
    "发放单位": [
        { key: "工薪发放单位", name: "工薪发放单位", func: "checkGongxinFafang" },
        { key: "被装发放单位", name: "被装发放单位", func: "checkBeizhuangFafang" },
        { key: "医疗保障单位", name: "医疗保障单位", func: "checkYiliaoBaozhang" },
        { key: "对应营房单位名称检查", name: "对应营房单位名称检查", func: "checkDuiyingYingfangDanwei" },
        { key: "对应财务单位名称检查", name: "对应财务单位名称检查", func: "checkDuiyingCaiwuDanwei" },
        { key: "对应被装单位名称检查", name: "对应被装单位名称检查", func: "checkDuiyingBeizhuangDanwei" }
    ],
    "单位信息": [
        { key: "入伍地检查", name: "入伍地检查", func: "checkRuwudi" },
        { key: "单位驻地检查", name: "单位驻地检查", func: "checkDanweizhudi" },
        { key: "单位驻地行政区划代码检查", name: "单位驻地行政区划代码检查", func: "checkDanweizhudiXingzhengquhudaima" }
    ]
};

// DOM元素引用
// 文件上传区域元素
var uploadArea = document.getElementById('uploadArea');
// 文件输入框元素
var fileInput = document.getElementById('fileInput');
// 文件列表容器元素
var fileListContainer = document.getElementById('fileListContainer');
// 数据验证按钮元素
var validateBtn = document.getElementById('validateBtn');
// 检查结果容器元素
var resultsContainer = document.getElementById('resultsContainer');
// 规则网格容器元素
var rulesGrid = document.getElementById('rulesGrid');
// 右侧面板元素
var rightPanel = document.getElementById('rightPanel');
// 左侧面板元素
var leftPanel = document.getElementById('leftPanel');

// 全局状态变量
// 数据检查工具 - 当前选中的文件
var checkerFileData = null;
// 向后兼容别名，与 checkerFileData 同步
var selectedFile = null;
// 已选中的检查规则
var selectedRules = {};
// 检查结果数据
var checkResults = null;

/**
 * 本地存储管理器
 * 负责保存和加载用户的选择偏好
 * 使用localStorage实现持久化存储
 *
 * 存储的键值包括：
 * - SELECTED_RULES: 用户选择的检查规则
 * - LAST_CATEGORY: 上次选择的分类
 * - PAGE_SIZE: 分页大小设置
 */
var StorageManager = {
    // 本地存储的键名定义
    keys: {
        // 已选中的检查规则
        SELECTED_RULES: 'dataCheck_selectedRules',
        // 上次选择的分类
        LAST_CATEGORY: 'dataCheck_lastCategory',
        // 分页大小
        PAGE_SIZE: 'dataCheck_pageSize'
    },
    
    /**
     * 保存选中的规则到本地存储
     * @param {Object} rules - 规则对象
     */
    saveSelectedRules: function(rules) {
        try {
            // 将规则对象转换为数组格式
            var rulesArray = [];
            for (var key in rules) {
                if (rules.hasOwnProperty(key) && rules[key]) {
                    rulesArray.push(key);
                }
            }
            // 保存到本地存储
            localStorage.setItem(this.keys.SELECTED_RULES, JSON.stringify(rulesArray));
        } catch (e) {
            console.warn('无法保存规则选择：', e);
        }
    },
    
    /**
     * 从本地存储加载选中的规则
     * @returns {Object} 规则对象
     */
    loadSelectedRules: function() {
        try {
            // 从本地存储获取已保存的规则
            var saved = localStorage.getItem(this.keys.SELECTED_RULES);
            if (saved) {
                // 将数组格式转换为对象格式
                var rulesArray = JSON.parse(saved);
                var rulesObj = {};
                for (var i = 0; i < rulesArray.length; i++) {
                    rulesObj[rulesArray[i]] = true;
                }
                return rulesObj;
            }
        } catch (e) {
            console.warn('无法加载规则选择：', e);
        }
        // 默认返回空对象
        return {};
    },
    
    /**
     * 保存分页大小到本地存储
     * @param {Number} size - 分页大小
     */
    savePageSize: function(size) {
        try {
            localStorage.setItem(this.keys.PAGE_SIZE, size);
        } catch (e) {
            console.warn('无法保存页面大小：', e);
        }
    },
    
    /**
     * 从本地存储加载分页大小
     * @returns {Number} 分页大小，默认为10
     */
    loadPageSize: function() {
        try {
            var saved = localStorage.getItem(this.keys.PAGE_SIZE);
            if (saved) {
                return parseInt(saved, 10);
            }
        } catch (e) {
            console.warn('无法加载页面大小：', e);
        }
        // 默认分页大小为10
        return 10;
    },
    
    /**
     * 清除所有本地存储数据
     */
    clear: function() {
        try {
            // 遍历所有键名并清除对应的存储数据
            for (var key in this.keys) {
                if (this.keys.hasOwnProperty(key)) {
                    localStorage.removeItem(this.keys[key]);
                }
            }
        } catch (e) {
            console.warn('无法清除存储数据：', e);
        }
    }
};

var isResizing = false;
var lastDownX = 0;

function handleError(error, context) {
    var errorMsg = '';
    var errorDetails = '';
    
    if (error instanceof Error) {
        errorMsg = error.message || '未知错误';
        errorDetails = error.stack || '';
    } else {
        errorMsg = String(error);
    }
    
    errorMsg = translateErrorMessage(errorMsg);
    var fullMessage = context ? (context + '失败：' + errorMsg) : errorMsg;
    
    console.error('[错误] ' + fullMessage);
    if (errorDetails) {
        console.error('详细信息：', errorDetails);
    }
    
    return fullMessage;
}

function showMessage(container, message, type) {
    type = type || 'error';
    
    var className = type + '-message';
    var icon = '';
    
    switch(type) {
        case 'error':
            icon = '<i class="fa fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fa fa-exclamation-triangle"></i>';
            break;
        case 'info':
            icon = '<i class="fa fa-info-circle"></i>';
            break;
        case 'success':
            icon = '<i class="fa fa-check-circle"></i>';
            break;
    }
    
    var safeMessage = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
    
    container.innerHTML = '<div class="' + className + '">' + 
                         icon + ' ' + safeMessage + 
                         '</div>';
}

function showLoading(container, message) {
    message = message || '处理中...';
    container.innerHTML = '<div class="loading-message">' +
                         '<i class="fa fa-spinner fa-spin"></i> ' +
                         message +
                         '</div>';
}

function translateErrorMessage(errorMsg) {
    if (!errorMsg) return '未知错误';
    
    var msg = String(errorMsg);
    
    var translations = {
        'out of memory': '内存不足，文件可能过大',
        'stack overflow': '堆栈溢出，数据可能过于复杂',
        'invalid argument': '无效参数',
        'permission denied': '权限被拒绝',
        'access denied': '访问被拒绝',
        'file not found': '文件未找到',
        'network error': '网络错误',
        'timeout': '操作超时',
        'abort': '操作已中止',
        'invalid': '无效',
        'failed': '失败',
        'cannot': '无法',
        'error': '错误',
        'undefined': '未定义',
        'null': '空值',
        'not found': '未找到',
        'not supported': '不支持',
        'not allowed': '不允许',
        'is not a function': '不是一个函数',
        'is not defined': '未定义',
        'unexpected token': '意外的标记',
        'unexpected end': '意外的结束',
        'syntax error': '语法错误',
        'reference error': '引用错误',
        'type error': '类型错误',
        'range error': '范围错误'
    };
    
    var lowerMsg = msg.toLowerCase();
    for (var key in translations) {
        if (lowerMsg.indexOf(key) !== -1) {
            msg = msg.replace(new RegExp(key, 'gi'), translations[key]);
        }
    }
    
    return msg;
}

function initRuleSelector() {
    var html = '';
    
    for (var category in RULES_MAPPING) {
        if (RULES_MAPPING.hasOwnProperty(category)) {
            var rules = RULES_MAPPING[category];
            html += '<div class="rule-category">';
            html += '<div class="category-header-with-select">';
            html += '<div class="category-title">' + category + '</div>';
            html += '<button class="category-select-btn" data-category="' + category + '" onclick="toggleCategoryRules(\'' + category + '\')" title="全选/全不选 ' + category + '">全选</button>';
            html += '</div>';
            html += '<div class="category-buttons">';
            
            for (var i = 0; i < rules.length; i++) {
                var rule = rules[i];
                html += '<button class="rule-btn" data-key="' + rule.key + '" onclick="toggleRule(\'' + rule.key + '\')">';
                html += rule.name;
                html += '</button>';
            }
            
            html += '</div>';
            html += '</div>';
        }
    }
    
    rulesGrid.innerHTML = html;
    rulesGrid.className = 'rules-container';
}

function toggleRule(ruleKey) {
    var btn = document.querySelector('button[data-key="' + ruleKey + '"]');
    
    if (selectedRules[ruleKey]) {
        delete selectedRules[ruleKey];
        btn.className = btn.className.replace(' selected', '');
    } else {
        selectedRules[ruleKey] = true;
        if (btn.className.indexOf(' selected') === -1) {
            btn.className += ' selected';
        }
    }
    
    StorageManager.saveSelectedRules(selectedRules);
    
    updateValidateButton();
    updateCategoryButtonStates();
}

function updateCategoryButtonStates() {
    for (var category in RULES_MAPPING) {
        if (!RULES_MAPPING.hasOwnProperty(category)) continue;
        
        var rules = RULES_MAPPING[category];
        var allSelected = true;
        
        for (var i = 0; i < rules.length; i++) {
            if (!selectedRules[rules[i].key]) {
                allSelected = false;
                break;
            }
        }
        
        var categoryBtn = document.querySelector('button[data-category="' + category + '"]');
        
        if (categoryBtn) {
            if (allSelected) {
                categoryBtn.textContent = '全不选';
                if (categoryBtn.className.indexOf(' selected') === -1) {
                    categoryBtn.className += ' selected';
                }
            } else {
                categoryBtn.textContent = '全选';
                categoryBtn.className = categoryBtn.className.replace(' selected', '');
            }
        }
    }
}

function toggleCategoryRules(category) {
    var rules = RULES_MAPPING[category];
    if (!rules) return;
    
    var allSelected = true;
    for (var i = 0; i < rules.length; i++) {
        if (!selectedRules[rules[i].key]) {
            allSelected = false;
            break;
        }
    }
    
    var categoryBtn = document.querySelector('button[data-category="' + category + '"]');
    
    if (allSelected) {
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            delete selectedRules[rule.key];
            var btn = document.querySelector('button[data-key="' + rule.key + '"]');
            if (btn) {
                btn.className = btn.className.replace(' selected', '');
            }
        }
        if (categoryBtn) {
            categoryBtn.textContent = '全选';
            categoryBtn.className = categoryBtn.className.replace(' selected', '');
        }
    } else {
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            selectedRules[rule.key] = true;
            var btn = document.querySelector('button[data-key="' + rule.key + '"]');
            if (btn && btn.className.indexOf(' selected') === -1) {
                btn.className += ' selected';
            }
        }
        if (categoryBtn) {
            categoryBtn.textContent = '全不选';
            if (categoryBtn.className.indexOf(' selected') === -1) {
                categoryBtn.className += ' selected';
            }
        }
    }
    
    updateValidateButton();
    updateCategoryButtonStates();
}

function selectCategoryRules(category) {
    toggleCategoryRules(category);
}

function toggleAllRules() {
    var toggleBtn = document.getElementById('toggleAllBtn');
    var hasAnySelected = false;
    
    for (var key in selectedRules) {
        if (selectedRules.hasOwnProperty(key)) {
            hasAnySelected = true;
            break;
        }
    }
    
    if (hasAnySelected) {
        selectedRules = {};
        
        var allBtns = document.querySelectorAll('.rule-btn');
        for (var i = 0; i < allBtns.length; i++) {
            allBtns[i].className = allBtns[i].className.replace(' selected', '');
        }
        
        if (toggleBtn) {
            toggleBtn.textContent = '全选';
            toggleBtn.className = toggleBtn.className.replace(' active', '');
        }
    } else {
        selectedRules = {};
        
        for (var category in RULES_MAPPING) {
            if (RULES_MAPPING.hasOwnProperty(category)) {
                var rules = RULES_MAPPING[category];
                for (var i = 0; i < rules.length; i++) {
                    selectedRules[rules[i].key] = true;
                }
            }
        }
        
        var allBtns = document.querySelectorAll('.rule-btn');
        for (var i = 0; i < allBtns.length; i++) {
            if (allBtns[i].className.indexOf(' selected') === -1) {
                allBtns[i].className += ' selected';
            }
        }
        
        if (toggleBtn) {
            toggleBtn.textContent = '全不选';
            if (toggleBtn.className.indexOf(' active') === -1) {
                toggleBtn.className += ' active';
            }
        }
    }
    
    updateValidateButton();
    updateCategoryButtonStates();
}

function selectAllRules() {
    toggleAllRules();
}

function deselectAllRules() {
    toggleAllRules();
}

function updateValidateButton() {
    var hasRules = false;
    for (var key in selectedRules) {
        if (selectedRules.hasOwnProperty(key)) {
            hasRules = true;
            break;
        }
    }
    validateBtn.disabled = !(selectedFile && hasRules);
}

function hideResults() {
    rightPanel.style.display = 'none';
    leftPanel.className = leftPanel.className.replace(' checking', '') + ' centered';
}

function showResults() {
    rightPanel.style.display = 'flex';
}

function initResizer() {
    var resizer = document.getElementById('panelResizer');
    if (!resizer) {
        resizer = document.createElement('div');
        resizer.id = 'panelResizer';
        resizer.className = 'panel-resizer';
        resizer.title = '拖拽调整宽度';
        leftPanel.appendChild(resizer);
    }
    
    resizer.addEventListener('mousedown', function(e) {
        isResizing = true;
        lastDownX = e.clientX;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        var offsetX = e.clientX - lastDownX;
        var currentWidth = leftPanel.offsetWidth;
        var newWidth = currentWidth + offsetX;
        
        if (newWidth >= 400 && newWidth <= 900) {
            leftPanel.style.width = newWidth + 'px';
            lastDownX = e.clientX;
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
        }
    });
}

/**
 * 显示使用说明 - 根据工具类型显示不同内容
 */
function showUsageHelp(toolType) {
    var modal = document.getElementById('usageHelpModal');
    var modalTitle = modal.querySelector('.modal-header h2');
    var modalBody = modal.querySelector('.modal-body');
    
    // 根据工具类型设置标题和内容
    var content = getUsageContent(toolType || 'checker');
    modalTitle.textContent = content.title;
    modalBody.innerHTML = content.body;
    
    modal.style.display = 'flex';
}

/**
 * 获取不同工具的使用说明内容
 */
function getUsageContent(toolType) {
    var contents = {
        'checker': {
            title: '数据检查工具使用方法',
            body: `
                <div style="font-size: 16px; line-height: 2; color: #333;">
                    <p style="margin-bottom: 15px;">请按以下步骤操作：</p>
                    <ol style="padding-left: 25px; margin: 0;">
                        <li>人员基本信息查询</li>
                        <li>自定义输出</li>
                        <li>全选</li>
                        <li>按Excel格式输出</li>
                        <li style="color: #e74c3c; font-weight: bold; font-size: 18px; margin-top: 10px;">
                            <span style="background: #ffe6e6; padding: 5px 10px; border-radius: 4px; display: inline-block;">
                                <i class="fa fa-exclamation-triangle"></i> 打开Excel并保存
                            </span>
                        </li>
                    </ol>
                    <div style="margin-top: 25px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 14px; color: #856404;">
                        <strong>重要提示：</strong>第5步"打开Excel并保存"非常重要，直接影响后续数据处理！
                    </div>
                </div>
            `
        },
        'generator': {
            title: '数据生成工具使用方法',
            body: `
                <div style="font-size: 15px; line-height: 1.8; color: #333;">
                    <p style="margin-bottom: 15px; font-weight: 600; color: #667eea;">[使用步骤]</p>
                    <ol style="padding-left: 25px; margin: 0 0 20px 0;">
                        <li style="margin-bottom: 10px;">选择需要生成的数据类型（可多选）</li>
                        <li style="margin-bottom: 10px;">上传包含人员基本信息的Excel文件</li>
                        <li style="margin-bottom: 10px;">点击"开始生成"按钮</li>
                        <li style="margin-bottom: 10px;">等待处理完成，查看结果</li>
                        <li style="margin-bottom: 10px;">点击"下载生成后的文件"保存结果</li>
                    </ol>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-left: 4px solid #17a2b8; border-radius: 4px; font-size: 14px;">
                        <p style="margin: 0 0 10px 0;"><strong><i class="fa fa-lightbulb-o"></i> 提示：</strong></p>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>工具会自动识别Excel中的字段名称</li>
                            <li>只会填充空白的单元格，已有数据不会被覆盖</li>
                            <li>生成的数据会标记为黄色背景</li>
                        </ul>
                    </div>
                </div>
            `
        },
        'notification': {
            title: '通知单处理工具使用方法',
            body: `
                <div style="font-size: 15px; line-height: 1.8; color: #333;">
                    <p style="margin-bottom: 15px; font-weight: 600; color: #667eea;">[使用步骤]</p>
                    <ol style="padding-left: 25px; margin: 0 0 20px 0;">
                        <li style="margin-bottom: 10px;">上传包含通知单数据的Excel文件</li>
                        <li style="margin-bottom: 10px;">点击"开始处理"按钮</li>
                        <li style="margin-bottom: 10px;">查看处理结果和统计信息</li>
                        <li style="margin-bottom: 10px;">点击"导出清理后的Excel"下载整理好的文件</li>
                    </ol>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px; font-size: 14px;">
                        <p style="margin: 0 0 10px 0;"><strong><i class="fa fa-check-circle"></i> 功能说明：</strong></p>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>自动识别单元格中"<strong>字段名：值</strong>"格式的数据</li>
                            <li>例如："姓名：张三"会自动创建"姓名"列，值为"张三"</li>
                            <li>不同记录可以有不同字段，自动合并为统一表格</li>
                            <li>支持中文冒号（：）和英文冒号（:）</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 14px; color: #856404;">
                        <strong><i class="fa fa-exclamation-triangle"></i> 注意：</strong>数据必须包含冒号分隔的字段格式才能正确解析
                    </div>
                </div>
            `
        },
        'audit': {
            title: '数据联审工具使用方法',
            body: `
                <div style="font-size: 15px; line-height: 1.8; color: #333;">
                    <p style="margin-bottom: 15px; font-weight: 600; color: #667eea;">[可用工具]</p>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                        <h4 style="margin: 0 0 10px 0; color: #667eea;">
                            <i class="fa fa-minus-circle"></i> 保障卡与人资差额
                        </h4>
                        <p style="margin: 0 0 10px 0; font-size: 14px;">比对保障卡与人资数据，输出差额明细表</p>
                        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                            <li>需上传：后勤供应实力、人力资源实力</li>
                            <li>可选：通知单查询列表（用于自动填写差额原因）</li>
                        </ul>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                        <h4 style="margin: 0 0 10px 0; color: #667eea;">
                            <i class="fa fa-th"></i> 保障卡综合数据检查
                        </h4>
                        <p style="margin: 0 0 10px 0; font-size: 14px;">进行全面数据一致性检查</p>
                        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                            <li>需上传：保障卡、人资、财务、被装四个数据表</li>
                            <li>检查各系统间数据的一致性</li>
                        </ul>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                        <h4 style="margin: 0 0 10px 0; color: #667eea;">
                            <i class="fa fa-users"></i> 军人已注销家属状况正常
                        </h4>
                        <p style="margin: 0 0 10px 0; font-size: 14px;">核查已注销军人的家属信息</p>
                        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                            <li>需上传：本单位人员、临时供应人员、家属</li>
                            <li>筛选出需要处理的家属记录</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #d1ecf1; border-left: 4px solid #17a2b8; border-radius: 4px; font-size: 14px;">
                        <strong><i class="fa fa-info-circle"></i> 提示：</strong>所有工具都支持导出Excel检查报告
                    </div>
                </div>
            `
        },
        'card': {
            title: '发卡工具使用方法',
            body: `
                <div style="font-size: 15px; line-height: 1.8; color: #333;">
                    <p style="margin-bottom: 15px; font-weight: 600; color: #667eea;">🎴 使用步骤：</p>
                    <ol style="padding-left: 25px; margin: 0 0 20px 0;">
                        <li style="margin-bottom: 10px;">发卡后，下载发卡登记表</li>
                        <li style="margin-bottom: 10px;">全选Word内容或者复制Word中表格</li>
                        <li style="margin-bottom: 10px;">粘贴在复制框中</li>
                        <li style="margin-bottom: 10px;">点击"解析并预览"查看结果</li>
                        <li style="margin-bottom: 10px;">点击"下载Excel文件"保存转换后的文件</li>
                    </ol>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px; font-size: 14px;">
                        <p style="margin: 0 0 10px 0;"><strong><i class="fa fa-check-circle"></i> 功能特点：</strong></p>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>自动提取文档信息（标题、单位名称、日期）</li>
                            <li>智能识别卡类型（Ⅰ、Ⅱ、Ⅲ、Ⅳ型卡等）</li>
                            <li>自动分类到不同Sheet表</li>
                            <li>自动过滤非表格内容</li>
                            <li>智能处理跨行表头</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 14px; color: #856404;">
                        <strong><i class="fa fa-lightbulb-o"></i> 提示：</strong>复制时建议使用Ctrl+A全选整个Word文档内容，系统会自动识别并提取表格
                    </div>
                </div>
            `
        }
    };
    
    return contents[toolType] || contents['checker'];
}

function closeUsageHelp() {
    document.getElementById('usageHelpModal').style.display = 'none';
}

function showChangelog() {
    var contentElement = document.getElementById('changelogContent');
    if (contentElement && typeof getChangelogContent === 'function') {
        contentElement.innerHTML = getChangelogContent();
    }
    document.getElementById('changelogModal').style.display = 'flex';
}

function closeChangelog() {
    document.getElementById('changelogModal').style.display = 'none';
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function setupDragAndDrop(uploadAreaElement, fileHandlerCallback) {
    if (!uploadAreaElement) return;
    
    var dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
    for (var i = 0; i < dragEvents.length; i++) {
        uploadAreaElement.addEventListener(dragEvents[i], preventDefaults, false);
    }
    
    uploadAreaElement.addEventListener('dragenter', function() {
        if (uploadAreaElement.className.indexOf(' dragover') === -1) {
            uploadAreaElement.className += ' dragover';
        }
    });
    
    uploadAreaElement.addEventListener('dragover', function() {
        if (uploadAreaElement.className.indexOf(' dragover') === -1) {
            uploadAreaElement.className += ' dragover';
        }
    });
    
    uploadAreaElement.addEventListener('dragleave', function(e) {
        var rect = uploadAreaElement.getBoundingClientRect();
        if (e.clientX <= rect.left || e.clientX >= rect.right ||
            e.clientY <= rect.top || e.clientY >= rect.bottom) {
            uploadAreaElement.className = uploadAreaElement.className.replace(' dragover', '');
        }
    });
    
    uploadAreaElement.addEventListener('drop', function(e) {
        uploadAreaElement.className = uploadAreaElement.className.replace(' dragover', '');
        var files = e.dataTransfer.files;
        if (files.length > 0 && fileHandlerCallback) {
            fileHandlerCallback(files[0]);
        }
    });
}

/**
 * 设置拖放区域（支持多文件）
 * @param {HTMLElement} uploadAreaElement - 上传区域元素
 * @param {Function} filesHandlerCallback - 文件处理回调函数（接收FileList）
 */
function setupMultiFileDragAndDrop(uploadAreaElement, filesHandlerCallback) {
    if (!uploadAreaElement) return;
    
    var dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
    for (var i = 0; i < dragEvents.length; i++) {
        uploadAreaElement.addEventListener(dragEvents[i], preventDefaults, false);
    }
    
    uploadAreaElement.addEventListener('dragenter', function() {
        if (uploadAreaElement.className.indexOf(' dragover') === -1) {
            uploadAreaElement.className += ' dragover';
        }
    });
    
    uploadAreaElement.addEventListener('dragover', function() {
        if (uploadAreaElement.className.indexOf(' dragover') === -1) {
            uploadAreaElement.className += ' dragover';
        }
    });
    
    uploadAreaElement.addEventListener('dragleave', function(e) {
        var rect = uploadAreaElement.getBoundingClientRect();
        if (e.clientX <= rect.left || e.clientX >= rect.right ||
            e.clientY <= rect.top || e.clientY >= rect.bottom) {
            uploadAreaElement.className = uploadAreaElement.className.replace(' dragover', '');
        }
    });
    
    uploadAreaElement.addEventListener('drop', function(e) {
        uploadAreaElement.className = uploadAreaElement.className.replace(' dragover', '');
        var files = e.dataTransfer.files;
        if (files.length > 0 && filesHandlerCallback) {
            // 传递所有文件（FileList）而不是单个文件
            filesHandlerCallback(files);
        }
    });
}

setupDragAndDrop(uploadArea, handleFile);

// 点击上传区域触发文件选择
uploadArea.addEventListener('click', function() {
    fileInput.click();
});

var dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
for (var i = 0; i < dragEvents.length; i++) {
    document.body.addEventListener(dragEvents[i], preventDefaults, false);
}

fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
    // 重置value，否则删除文件后重新选择同一个文件不会触发change事件
    e.target.value = '';
});

function handleFile(file) {
    var fileName = file.name.toLowerCase();
    var isExcel = fileName.indexOf('.xlsx') > -1 || fileName.indexOf('.xls') > -1;
    
    if (!isExcel) {
        alert('文件 "' + file.name + '" 不是支持的Excel格式');
        return;
    }
    
    checkerFileData = file;
    selectedFile = checkerFileData;  // 向后兼容
    updateFileList();
    updateValidateButton();
}

function updateFileList() {
    if (!selectedFile) {
        fileListContainer.innerHTML = '<div class="empty-state">暂无文件</div>';
        return;
    }

    fileListContainer.innerHTML = 
        '<div class="file-item">' +
            '<div class="file-info">' +
                '<div class="file-icon"><i class="fa fa-file-excel-o"></i></div>' +
                '<div class="file-details">' +
                    '<div class="file-name">' + escapeHtml(selectedFile.name) + '</div>' +
                    '<div class="file-size">' + formatFileSize(selectedFile.size) + '</div>' +
                '</div>' +
            '</div>' +
            '<button class="remove-btn" onclick="removeFile()">删除</button>' +
        '</div>';
}

function removeFile() {
    checkerFileData = null;
    selectedFile = checkerFileData;  // 向后兼容
    updateFileList();
    updateValidateButton();
    hideResults();
    
    leftPanel.className = leftPanel.className.replace(' checking', '') + ' centered';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// escapeHtml 函数已移至 DataCheckUtils，统一引用
// 为保持向后兼容，提供别名（同时校验escapeHtml方法确实存在，避免绑定到undefined）
var escapeHtml = (window.DataCheckUtils && typeof window.DataCheckUtils.escapeHtml === 'function') ? window.DataCheckUtils.escapeHtml : function(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
};

// selectFiles函数已移除，现在使用点击上传区域或拖拽文件

var isCheckingFiles = false; // 检查执行中的重入保护标志

function validateFiles() {
    if (isCheckingFiles) {
        return;
    }
    
    if (!selectedFile) {
        alert('请先选择要验证的文件');
        return;
    }
    
    var hasRules = false;
    for (var key in selectedRules) {
        if (selectedRules.hasOwnProperty(key)) {
            hasRules = true;
            break;
        }
    }
    
    if (!hasRules) {
        alert('请至少选择一个检查规则');
        return;
    }
    
    leftPanel.className = leftPanel.className.replace(' centered', '') + ' checking';
    
    setTimeout(function() {
        showResults();
        leftPanel.className = leftPanel.className.replace(' checking', '');
    }, 400);
    
    resultsContainer.innerHTML = '<div class="loading">正在检查数据，请稍候...</div>';
    
    if (window.PM) PM.start('Excel文件读取');
    
    isCheckingFiles = true;
    validateBtn.disabled = true;
    
    readExcelFile(selectedFile).then(function(data) {
        if (window.PM) PM.end('Excel文件读取');
        return runSelectedRules(data);
    }).then(function(results) {
        isCheckingFiles = false;
        updateValidateButton();
        checkResults = results;
        displayResults(checkResults);
    }).catch(function(error) {
        isCheckingFiles = false;
        updateValidateButton();
        if (window.PM) PM.end('Excel文件读取');
        resultsContainer.innerHTML = '<div class="error-message">检查失败: ' + escapeHtml(translateErrorMessage(error.message)) + '</div>';
    });
}

function validateExcelHeaders(data) {
    if (!data || data.length === 0) {
        return {
            valid: false,
            missingColumns: [],
            message: 'Excel文件为空或没有数据'
        };
    }
    
    var requiredColumns = ['姓名', '公民身份号码'];
    
    var recommendedColumns = [
        '人员类别', '联系电话', '血型', '婚姻状况',
        '文化程度', '学位', '政治面貌'
    ];
    
    var firstRow = data[0];
    var actualColumns = Object.keys(firstRow);
    
    var missingRequired = [];
    for (var i = 0; i < requiredColumns.length; i++) {
        var col = requiredColumns[i];
        var found = false;
        for (var j = 0; j < actualColumns.length; j++) {
            // 表头去空格后全等或以列名开头才算命中（前缀匹配），避免"姓名"误命中"曾用姓名"这类列
            var headerName = String(actualColumns[j]).trim();
            if (headerName === col || headerName.indexOf(col) === 0) {
                found = true;
                break;
            }
        }
        if (!found) {
            missingRequired.push(col);
        }
    }
    
    var missingRecommended = [];
    for (var i = 0; i < recommendedColumns.length; i++) {
        var col = recommendedColumns[i];
        var found = false;
        for (var j = 0; j < actualColumns.length; j++) {
            if (actualColumns[j] === col) {
                found = true;
                break;
            }
        }
        if (!found) {
            missingRecommended.push(col);
        }
    }
    
    var message = '';
    if (missingRequired.length > 0) {
        message = '缺少必填列：' + missingRequired.join('、');
        return {
            valid: false,
            missingColumns: missingRequired,
            message: message
        };
    }
    
    if (missingRecommended.length > 0) {
        message = '提示：文件中缺少以下建议列，可能影响部分检查功能：\n' + missingRecommended.join('、');
        console.warn(message);
    }
    
    return {
        valid: true,
        missingColumns: [],
        recommendedMissing: missingRecommended,
        message: '表头验证通过' + (missingRecommended.length > 0 ? '（有' + missingRecommended.length + '个建议列缺失）' : '')
    };
}

function readExcelFile(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, { type: 'array' });

                // 自动探测包含必填列（姓名+公民身份号码）的数据表，跳过"说明"等前置sheet；找不到时回退第一个sheet
                var jsonData = null;
                for (var s = 0; s < workbook.SheetNames.length; s++) {
                    var sheetName = workbook.SheetNames[s];
                    var sheetJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    if (sheetJson.length > 0 && validateExcelHeaders(sheetJson).valid) {
                        jsonData = sheetJson;
                        break;
                    }
                }
                if (!jsonData) {
                    jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                }
                
                var validation = validateExcelHeaders(jsonData);
                if (!validation.valid) {
                    reject(new Error(validation.message + '\n\n请确保Excel文件包含正确的列名。'));
                    return;
                }
                
                if (validation.recommendedMissing && validation.recommendedMissing.length > 0) {
                    console.info('表头提示：', validation.message);
                }
                
                resolve(jsonData);
            } catch (error) {
                reject(new Error('读取文件失败: ' + translateErrorMessage(error.message)));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('文件读取错误'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

function createProgressIndicator(message, current, total, estimatedSeconds) {
    var percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    var timeText = '';
    
    if (estimatedSeconds && estimatedSeconds > 0) {
        if (estimatedSeconds < 60) {
            timeText = '<span style="color: #999; font-size: 12px; margin-left: 12px;">预计剩余: ' + Math.ceil(estimatedSeconds) + '秒</span>';
        } else {
            var minutes = Math.floor(estimatedSeconds / 60);
            var seconds = Math.ceil(estimatedSeconds % 60);
            timeText = '<span style="color: #999; font-size: 12px; margin-left: 12px;">预计剩余: ' + minutes + '分' + seconds + '秒</span>';
        }
    }
    
    return '<div class="progress-container">' +
           '<div class="progress-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
           '<div class="progress-message" style="font-size: 16px; color: #333;">' +
           '<i class="fa fa-spinner fa-spin" style="margin-right: 8px; color: #4CAF50;"></i>' +
           message + 
           '</div>' +
           '<div class="progress-stats" style="font-size: 14px;">' +
           '<span style="color: #666;">' + current + ' / ' + total + '</span>' +
           '<span style="color: #4CAF50; font-weight: bold; font-size: 18px; margin-left: 12px;">' + percentage + '%</span>' +
           timeText +
           '</div>' +
           '</div>' +
           '<div class="progress-bar">' +
           '<div class="progress-fill" style="width: ' + percentage + '%"></div>' +
           '</div>' +
           '</div>';
}

function runSelectedRules(data) {
    if (window.PM) PM.start('规则检查总耗时');
    
    return new Promise(function(resolve, reject) {
        try {
            var results = {};
            var totalRules = 0;
            var completedRules = 0;
            var startTime = Date.now(); // 记录开始时间
            // 收集未执行/执行失败的规则，检查完成后向用户显式提示
            window.ruleRunWarnings = [];
            
            for (var category in RULES_MAPPING) {
                if (!RULES_MAPPING.hasOwnProperty(category)) continue;
                var rules = RULES_MAPPING[category];
                for (var i = 0; i < rules.length; i++) {
                    if (selectedRules[rules[i].key]) {
                        totalRules++;
                    }
                }
            }
            
            if (totalRules === 0) {
                resolve(results);
                return;
            }
            
            resultsContainer.innerHTML = createProgressIndicator('正在检查数据...', 0, totalRules, 0);
            
            var categoryKeys = [];
            for (var cat in RULES_MAPPING) {
                if (RULES_MAPPING.hasOwnProperty(cat)) {
                    categoryKeys.push(cat);
                }
            }
            
            var categoryIndex = 0;
            var ruleIndex = 0;
            
            function processNextRule() {
                if (categoryIndex >= categoryKeys.length) {
                    if (window.PM) {
                        PM.end('规则检查总耗时');
                        setTimeout(function() {
                            PM.printReport();
                        }, 100);
                    }
                    resolve(results);
                    return;
                }
                
                var category = categoryKeys[categoryIndex];
                var rules = RULES_MAPPING[category];
                
                if (ruleIndex >= rules.length) {
                    categoryIndex++;
                    ruleIndex = 0;
                    setTimeout(processNextRule, 0);
                    return;
                }
                
                var rule = rules[ruleIndex];
                ruleIndex++;
                
                if (selectedRules[rule.key]) {
                    try {
                        var funcName = rule.func;
                        if (typeof window[funcName] === 'function') {
                            completedRules++;
                            
                            // 计算预估剩余时间
                            var elapsed = (Date.now() - startTime) / 1000; // 已用时间（秒）
                            var avgTimePerRule = elapsed / completedRules; // 每个规则平均时间
                            var remainingRules = totalRules - completedRules;
                            var estimatedRemaining = avgTimePerRule * remainingRules;
                            
                            resultsContainer.innerHTML = createProgressIndicator(
                                '正在检查：' + rule.name,
                                completedRules,
                                totalRules,
                                estimatedRemaining
                            );
                            
                            if (window.PM) PM.start(rule.name);
                            
                            var errors = window[funcName](data);
                            
                            if (window.PM) PM.end(rule.name);
                            
                            if (errors && errors.length > 0) {
                                if (!results[category]) {
                                    results[category] = {};
                                }
                                results[category][rule.name] = errors;
                            }
                        } else {
                            console.warn('规则函数未定义: ' + funcName);
                            window.ruleRunWarnings.push('「' + rule.name + '」的检查函数未定义（' + funcName + '），该规则已被跳过');
                        }
                    } catch (error) {
                        console.error('规则执行错误: ' + rule.name, error);
                        window.ruleRunWarnings.push('「' + rule.name + '」执行时出错（' + (error && error.message ? translateErrorMessage(error.message) : String(error)) + '），该规则已被跳过');
                    }
                }
                
                setTimeout(processNextRule, 10);
            }
            
            processNextRule();
            
        } catch (error) {
            reject(error);
        }
    });
}

function createRuleWarningBanner() {
    var warnings = window.ruleRunWarnings;
    if (!warnings || warnings.length === 0) return '';
    
    var items = '';
    for (var i = 0; i < warnings.length; i++) {
        items += '<li>' + escapeHtml(warnings[i]) + '</li>';
    }
    
    return '<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px 16px; margin-bottom: 12px;">' +
        '<div style="color: #856404; font-weight: bold; margin-bottom: 6px;"><i class="fa fa-exclamation-triangle"></i> 以下规则未能执行，本次检查结果不完整：</div>' +
        '<ul style="color: #856404; margin: 0; padding-left: 20px;">' + items + '</ul>' +
    '</div>';
}

function displayResults(results) {
    var totalErrors = 0;
    for (var category in results) {
        if (results.hasOwnProperty(category)) {
            for (var ruleName in results[category]) {
                if (results[category].hasOwnProperty(ruleName)) {
                    totalErrors += results[category][ruleName].length;
                }
            }
        }
    }
    
    if (totalErrors === 0) {
        resultsContainer.innerHTML = createRuleWarningBanner() +
            '<div class="success-message">' +
                '<div class="success-icon"><i class="fa fa-check-circle"></i></div>' +
                '<div class="success-text">数据检查通过！未发现错误。</div>' +
            '</div>';
        return;
    }
    
    var html = createRuleWarningBanner() + '<div class="report-container">' +
        '<div class="summary-section">' +
            '<h3><i class="fa fa-search"></i> 错误分类</h3>' +
            '<div class="summary-buttons">' +
                '<button class="summary-btn active" onclick="showAllErrors(event)">' +
                    '<div class="summary-category">全部</div>' +
                    '<div class="summary-rule">显示所有错误</div>' +
                    '<div class="summary-count">' + totalErrors + '个错误</div>' +
                '</button>';
    
    for (var category in results) {
        if (!results.hasOwnProperty(category)) continue;
        
        for (var ruleName in results[category]) {
            if (!results[category].hasOwnProperty(ruleName)) continue;
            
            var errors = results[category][ruleName];
            var categoryKey = category + '-' + ruleName;
            
            var categoryDisplay = category || '未分类';
            var ruleNameDisplay = ruleName || '未知规则';
            if (String(categoryDisplay).toLowerCase() === 'undefined') categoryDisplay = '未分类';
            if (String(ruleNameDisplay).toLowerCase() === 'undefined') ruleNameDisplay = '未知规则';
            
            html += '<button class="summary-btn" onclick="showCategoryErrors(\'' + categoryKey + '\', event)">' +
                    '<div class="summary-category">' + escapeHtml(categoryDisplay) + '</div>' +
                    '<div class="summary-rule">' + escapeHtml(ruleNameDisplay) + '</div>' +
                    '<div class="summary-count">' + errors.length + '个错误</div>' +
                '</button>';
        }
    }
    
    html += '</div></div>' +
            '<div class="details-section">' +
                '<div class="details-header">' +
                    '<h3><i class="fa fa-list-alt"></i> 错误详情</h3>' +
                    '<span class="error-count-badge" id="errorCountBadge">共 ' + (totalErrors || 0) + ' 条错误</span>' +
                '</div>' +
                '<div id="errorDetailsContent"></div>' +
            '</div>' +
            '<div class="export-section">' +
                '<button class="export-btn" onclick="exportToExcel(false)">导出全部数据</button>' +
                '<button class="export-btn" id="exportFilteredBtn" onclick="exportToExcel(true)" style="margin-left: 10px; display: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">导出筛选数据</button>' +
                '<button class="export-btn" onclick="exportToWord()" style="margin-left: 10px;">导出Word报告</button>' +
            '</div>' +
        '</div>';
    
    resultsContainer.innerHTML = html;
    window.currentResults = results;
    showAllErrors();
}

function showAllErrors(event) {
    if (!window.currentResults) return;
    
    // 重置筛选状态
    currentFilterCategory = '';
    currentFilterRuleName = '';
    
    var allBtns = document.querySelectorAll('.summary-btn');
    for (var i = 0; i < allBtns.length; i++) {
        allBtns[i].className = allBtns[i].className.replace(' active', '');
    }
    
    if (event && event.target) {
        var btn = event.target;
        while (btn && btn.className.indexOf('summary-btn') === -1) {
            btn = btn.parentNode;
        }
        if (btn) {
            btn.className += ' active';
        }
    } else {
        var firstBtn = document.querySelector('.summary-btn');
        if (firstBtn) firstBtn.className += ' active';
    }
    
    // 统计每个"当前值"的出现次数
    var currentValueCounts = {};
    var allErrors = [];
    
    for (var category in window.currentResults) {
        if (!window.currentResults.hasOwnProperty(category)) continue;
        
        for (var ruleName in window.currentResults[category]) {
            if (!window.currentResults[category].hasOwnProperty(ruleName)) continue;
            
            var errors = window.currentResults[category][ruleName];
            for (var i = 0; i < errors.length; i++) {
                var error = {};
                for (var key in errors[i]) {
                    if (errors[i].hasOwnProperty(key)) {
                        error[key] = errors[i][key];
                    }
                }
                error._category = category;
                error._ruleName = ruleName;
                error['规则名称'] = ruleName;
                
                // 统计当前值出现次数
                var currentValue = String(error['当前值'] || '').trim();
                if (!currentValueCounts[currentValue]) {
                    currentValueCounts[currentValue] = 0;
                }
                currentValueCounts[currentValue]++;
                
                allErrors.push(error);
            }
        }
    }
    
    // 为每条错误添加其"当前值"的出现次数（用于排序）
    for (var i = 0; i < allErrors.length; i++) {
        var currentValue = String(allErrors[i]['当前值'] || '').trim();
        allErrors[i]._currentValueCount = currentValueCounts[currentValue];
    }
    
    // 按当前值的出现次数排序（少的在前）
    allErrors.sort(function(a, b) {
        // 首先按当前值的出现次数排序
        if (a._currentValueCount !== b._currentValueCount) {
            return a._currentValueCount - b._currentValueCount;
        }
        
        // 出现次数相同，按当前值内容排序
        var valueA = String(a['当前值'] || '').trim();
        var valueB = String(b['当前值'] || '').trim();
        if (valueA < valueB) return -1;
        if (valueA > valueB) return 1;
        
        // 当前值也相同，按规则名称排序
        var ruleA = String(a._ruleName || '');
        var ruleB = String(b._ruleName || '');
        if (ruleA < ruleB) return -1;
        if (ruleA > ruleB) return 1;
        
        // 规则名称也相同，按行号排序
        return (a['行号'] || 0) - (b['行号'] || 0);
    });
    
    document.getElementById('errorCountBadge').textContent = '共 ' + allErrors.length + ' 条错误';
    
    // 隐藏筛选导出按钮
    var filterBtn = document.getElementById('exportFilteredBtn');
    if (filterBtn) {
        filterBtn.style.display = 'none';
    }
    
    displayErrorsWithPagination(allErrors);
}

function showCategoryErrors(categoryKey, event) {
    var parts = categoryKey.split('-');
    var category = parts[0];
    var ruleName = parts.slice(1).join('-');
    var errors = window.currentResults[category][ruleName];
    
    // 设置筛选状态
    currentFilterCategory = category;
    currentFilterRuleName = ruleName;
    
    var allBtns = document.querySelectorAll('.summary-btn');
    for (var i = 0; i < allBtns.length; i++) {
        allBtns[i].className = allBtns[i].className.replace(' active', '');
    }
    
    if (event && event.target) {
        var btn = event.target;
        while (btn && btn.className.indexOf('summary-btn') === -1) {
            btn = btn.parentNode;
        }
        if (btn) {
            btn.className += ' active';
        }
    }
    
    var errorCount = errors ? errors.length : 0;
    document.getElementById('errorCountBadge').textContent = errorCount + ' 条错误';
    
    // 显示并更新筛选导出按钮
    var filterBtn = document.getElementById('exportFilteredBtn');
    if (filterBtn) {
        filterBtn.style.display = 'inline-block';
        var displayRuleName = ruleName || '未知规则';
        if (String(displayRuleName).toLowerCase() === 'undefined') displayRuleName = '未知规则';
        filterBtn.textContent = '导出筛选数据（' + displayRuleName + '）';
    }
    
    // 统计该规则下每个"当前值"的出现次数
    var currentValueCounts = {};
    for (var i = 0; i < errors.length; i++) {
        var currentValue = String(errors[i]['当前值'] || '').trim();
        if (!currentValueCounts[currentValue]) {
            currentValueCounts[currentValue] = 0;
        }
        currentValueCounts[currentValue]++;
    }
    
    var errorsWithRule = [];
    for (var i = 0; i < errors.length; i++) {
        var error = {};
        for (var key in errors[i]) {
            if (errors[i].hasOwnProperty(key)) {
                error[key] = errors[i][key];
            }
        }
        var ruleNameDisplay = ruleName || '未知规则';
        if (String(ruleNameDisplay).toLowerCase() === 'undefined') ruleNameDisplay = '未知规则';
        error['规则名称'] = ruleNameDisplay;
        
        // 添加当前值的出现次数
        var currentValue = String(error['当前值'] || '').trim();
        error._currentValueCount = currentValueCounts[currentValue];
        
        errorsWithRule.push(error);
    }
    
    // 按当前值的出现次数排序（少的在前）
    errorsWithRule.sort(function(a, b) {
        // 首先按当前值的出现次数排序
        if (a._currentValueCount !== b._currentValueCount) {
            return a._currentValueCount - b._currentValueCount;
        }
        
        // 出现次数相同，按当前值内容排序
        var valueA = String(a['当前值'] || '').trim();
        var valueB = String(b['当前值'] || '').trim();
        if (valueA < valueB) return -1;
        if (valueA > valueB) return 1;
        
        // 当前值也相同，按行号排序
        return (a['行号'] || 0) - (b['行号'] || 0);
    });
    
    displayErrorsWithPagination(errorsWithRule);
}

var currentPage = 1;
var pageSize = 10;
var totalPages = 0;
var allErrorsData = [];
var currentFilterCategory = ''; // 当前筛选的类别
var currentFilterRuleName = ''; // 当前筛选的规则名称

function displayErrorsWithPagination(errors) {
    var totalErrors = errors.length;
    
    allErrorsData = errors;
    window.currentDisplayErrors = errors;
    
    // 智能调整分页大小
    // 如果错误数量很少，强制全部显示
    if (totalErrors <= 20) {
        pageSize = totalErrors; // 20条以内直接全部显示
    } else if (pageSize < 10 || pageSize > totalErrors) {
        // 如果当前分页大小不合理，重新智能调整
        if (totalErrors <= 50) {
            pageSize = 20;
        } else if (totalErrors <= 100) {
            pageSize = 50;
        } else {
            pageSize = 100;
        }
    }
    // 否则保持用户上次选择的分页大小
    
    currentPage = 1;
    totalPages = Math.ceil(totalErrors / pageSize);
    
    var html = '';
    
    html += '<div class="pagination-controls">' +
                '<div class="pagination-info">' +
                    '<span>共 <strong>' + totalErrors + '</strong> 条错误</span>' +
                '</div>' +
                '<div class="pagination-size-selector">' +
                    '<label>每页显示：</label>' +
                    '<select id="pageSizeSelector" onchange="changePageSize(this.value)">' +
                        '<option value="10"' + (pageSize === 10 ? ' selected' : '') + '>10条</option>' +
                        '<option value="20"' + (pageSize === 20 ? ' selected' : '') + '>20条</option>' +
                        '<option value="50"' + (pageSize === 50 ? ' selected' : '') + '>50条</option>' +
                        '<option value="100"' + (pageSize === 100 ? ' selected' : '') + '>100条</option>' +
                        '<option value="200"' + (pageSize === 200 ? ' selected' : '') + '>200条</option>' +
                        '<option value="500"' + (pageSize === 500 ? ' selected' : '') + '>500条</option>' +
                        '<option value="' + totalErrors + '"' + (pageSize === totalErrors ? ' selected' : '') + '>全部(' + totalErrors + '条)</option>' +
                    '</select>' +
                '</div>' +
            '</div>';
    
    html += '<div class="error-table-container">' +
                '<table class="error-table">' +
                    '<thead>' +
                        '<tr>' +
                            '<th>序号</th>' +
                            '<th>规则名称</th>' +
                            '<th>姓名</th>' +
                            '<th>人员类别</th>' +
                            '<th>身份证号码</th>' +
                            '<th>当前值</th>' +
                            '<th>错误详情</th>' +
                            '<th>行号</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody id="errorTableBody">' +
                    '</tbody>' +
                '</table>' +
            '</div>';
    
    html += '<div id="paginationNav"></div>';
    
    document.getElementById('errorDetailsContent').innerHTML = html;
    
    renderPage(currentPage);
    
    initScrollButtons();
}

function initScrollButtons() {
    var existingControls = document.getElementById('floatingScrollControls');
    if (existingControls) {
        existingControls.remove();
    }
    
    var scrollControls = document.createElement('div');
    scrollControls.id = 'floatingScrollControls';
    scrollControls.className = 'scroll-controls';
    scrollControls.innerHTML = 
        '<button class="scroll-btn" id="scrollToTopBtn" onclick="scrollToTop()" title="回到顶部">' +
            '⬆' +
        '</button>' +
        '<button class="scroll-btn" id="scrollToBottomBtn" onclick="scrollToBottom()" title="到底部">' +
            '⬇' +
        '</button>';
    
    document.body.appendChild(scrollControls);
    
    var resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.addEventListener('scroll', updateScrollButtons);
        updateScrollButtons();
    }
}

function updateScrollButtons() {
    var resultsContainer = document.getElementById('resultsContainer');
    var scrollToTopBtn = document.getElementById('scrollToTopBtn');
    var scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
    
    if (!resultsContainer || !scrollToTopBtn || !scrollToBottomBtn) return;
    
    var scrollTop = resultsContainer.scrollTop;
    var scrollHeight = resultsContainer.scrollHeight;
    var clientHeight = resultsContainer.clientHeight;
    
    if (scrollTop > 100) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
    
    if (scrollHeight - scrollTop - clientHeight > 100) {
        scrollToBottomBtn.classList.add('visible');
    } else {
        scrollToBottomBtn.classList.remove('visible');
    }
}

function scrollToTop() {
    var resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

function scrollToBottom() {
    var resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.scrollTo({
            top: resultsContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
}

function renderPage(pageNum) {
    currentPage = pageNum;
    
    /**
     * 格式化显示值
     */
    function formatValue(val) {
        if (val === null || val === undefined) {
            return '空';
        }
        
        var strVal = String(val).trim();
        
        if (strVal === '') {
            return '空';
        }
        
        var lowerVal = strVal.toLowerCase();
        if (lowerVal === 'undefined' || lowerVal === 'null' || lowerVal === 'nan' || lowerVal === 'none') {
            return '空';
        }
        
        return strVal;
    }
    
    /**
     * 格式化可复制的值（姓名和身份证号）
     * 添加点击复制功能
     */
    function formatCopyableValue(val) {
        var formattedVal = formatValue(val);
        if (formattedVal === '空') {
            return '<span style="color: #999; font-style: italic;">空</span>';
        }
        var escapedVal = escapeHtml(formattedVal);
        return '<span class="copyable-text" data-copy-text="' + escapedVal + '" title="点击复制">' + 
               escapedVal + 
               '</span>';
    }
    
    var startIndex = (pageNum - 1) * pageSize;
    var endIndex = Math.min(startIndex + pageSize, allErrorsData.length);
    var renderCount = endIndex - startIndex;
    
    var tbody = document.getElementById('errorTableBody');
    
    // 性能优化：对于大数据量使用分批渲染
    if (renderCount > 200) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">正在渲染 ' + renderCount + ' 条记录，请稍候...</td></tr>';
        
        // 使用 setTimeout 让浏览器有时间更新UI
        setTimeout(function() {
            renderTableRows(startIndex, endIndex, tbody, formatValue, formatCopyableValue);
        }, 10);
    } else {
        renderTableRows(startIndex, endIndex, tbody, formatValue, formatCopyableValue);
    }
    
    updatePaginationNav();
}

function renderTableRows(startIndex, endIndex, tbody, formatValue, formatCopyableValue) {
    var html = '';
    
    for (var i = startIndex; i < endIndex; i++) {
        var error = allErrorsData[i];
        
        var serialNumber = i + 1;
        var ruleName = error['规则名称'] || error._ruleName || '';
        var name = error['姓名'] || error.姓名 || '';
        var personType = error['人员类别'] || error.人员类别 || '';
        var idNumber = error['身份证号码'] || error.身份证号码 || '';
        var currentValue = error['当前值'] || error.当前值 || '';
        var errorDetail = error['错误详情'] || error.错误详情 || '';
        var rowNumber = error['行号'] || error.行号 || '';
        var valueCount = error._currentValueCount || 0;
        
        // 在当前值后面显示出现次数
        var currentValueDisplay = escapeHtml(formatValue(currentValue));
        if (valueCount > 1) {
            currentValueDisplay += ' <span style="color: #999; font-size: 0.85em; font-weight: normal;">(' + valueCount + '个)</span>';
        }
        
        html += '<tr>' +
                    '<td>' + serialNumber + '</td>' +
                    '<td><span style="color: #666; font-weight: 500;">' + escapeHtml(ruleName) + '</span></td>' +
                    '<td>' + formatCopyableValue(name) + '</td>' +
                    '<td>' + formatCopyableValue(personType) + '</td>' +
                    '<td>' + formatCopyableValue(idNumber) + '</td>' +
                    '<td>' + currentValueDisplay + '</td>' +
                    '<td class="error-detail">' + escapeHtml(formatValue(errorDetail)) + '</td>' +
                    '<td>' + escapeHtml(formatValue(rowNumber)) + '</td>' +
                '</tr>';
    }
    
    tbody.innerHTML = html;
    
    // 为所有可复制元素添加点击事件
    var copyableElements = tbody.querySelectorAll('.copyable-text');
    for (var i = 0; i < copyableElements.length; i++) {
        copyableElements[i].addEventListener('click', function() {
            copyTextFromData(this);
        });
    }
    
    updatePaginationNav();
}

function updatePaginationNav() {
    var nav = document.getElementById('paginationNav');
    if (!nav) return;
    
    var html = '<div class="pagination-nav">';
    
    if (currentPage > 1) {
        html += '<button class="page-btn" onclick="goToPage(' + (currentPage - 1) + ')">上一页</button>';
    } else {
        html += '<button class="page-btn disabled" disabled>上一页</button>';
    }
    
    var maxPagesToShow = 7;
    var startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    var endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (startPage > 1) {
        html += '<button class="page-btn" onclick="goToPage(1)">1</button>';
        if (startPage > 2) {
            html += '<span class="page-ellipsis">...</span>';
        }
    }
    
    for (var i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += '<button class="page-btn active">' + i + '</button>';
        } else {
            html += '<button class="page-btn" onclick="goToPage(' + i + ')">' + i + '</button>';
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="page-ellipsis">...</span>';
        }
        html += '<button class="page-btn" onclick="goToPage(' + totalPages + ')">' + totalPages + '</button>';
    }
    
    if (currentPage < totalPages) {
        html += '<button class="page-btn" onclick="goToPage(' + (currentPage + 1) + ')">下一页</button>';
    } else {
        html += '<button class="page-btn disabled" disabled>下一页</button>';
    }
    
    html += '<span class="page-jump">' +
                '跳转到 ' +
                '<input type="number" id="pageJumpInput" min="1" max="' + totalPages + '" value="' + currentPage + '" ' +
                    'onkeypress="if(event.keyCode===13) jumpToPage()">' +
                '页' +
                '<button class="page-btn small" onclick="jumpToPage()">GO</button>' +
            '</span>';
    
    html += '</div>';
    
    nav.innerHTML = html;
}

function goToPage(pageNum) {
    if (pageNum < 1 || pageNum > totalPages) return;
    renderPage(pageNum);
}

function jumpToPage() {
    var input = document.getElementById('pageJumpInput');
    var pageNum = parseInt(input.value);
    if (pageNum >= 1 && pageNum <= totalPages) {
        goToPage(pageNum);
    } else {
        alert('请输入有效的页码（1-' + totalPages + '）');
        input.value = currentPage;
    }
}

function changePageSize(newSize) {
    pageSize = parseInt(newSize);
    currentPage = 1;
    totalPages = Math.ceil(allErrorsData.length / pageSize);
    renderPage(1);
}

function exportToExcel(exportFiltered) {
    if (!window.currentResults) return;
    
    var wb = XLSX.utils.book_new();
    var fileNameSuffix = '';
    
    // 确定要导出的数据范围
    var categoriesToExport = {};
    
    if (exportFiltered && currentFilterCategory && currentFilterRuleName) {
        // 导出筛选后的数据
        if (window.currentResults[currentFilterCategory] && 
            window.currentResults[currentFilterCategory][currentFilterRuleName]) {
            categoriesToExport[currentFilterCategory] = {};
            categoriesToExport[currentFilterCategory][currentFilterRuleName] = 
                window.currentResults[currentFilterCategory][currentFilterRuleName];
            fileNameSuffix = '_' + currentFilterRuleName;
        }
    } else {
        // 导出全部数据
        categoriesToExport = window.currentResults;
    }
    
    // 生成汇总数据
    var summaryData = [];
    for (var category in categoriesToExport) {
        if (!categoriesToExport.hasOwnProperty(category)) continue;
        
        for (var ruleName in categoriesToExport[category]) {
            if (!categoriesToExport[category].hasOwnProperty(ruleName)) continue;
            
            var errors = categoriesToExport[category][ruleName];
            summaryData.push({
                '规则类别': category,
                '规则名称': ruleName,
                '错误数量': errors.length
            });
        }
    }
    
    var ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, "错误汇总");
    
    // 生成详情数据
    var detailsData = [];
    for (var category in categoriesToExport) {
        if (!categoriesToExport.hasOwnProperty(category)) continue;
        
        for (var ruleName in categoriesToExport[category]) {
            if (!categoriesToExport[category].hasOwnProperty(ruleName)) continue;
            
            var errors = categoriesToExport[category][ruleName];
            for (var i = 0; i < errors.length; i++) {
                var error = errors[i];
                detailsData.push({
                    '序号': detailsData.length + 1,
                    '规则类别': category,
                    '规则名称': ruleName,
                    '姓名': error['姓名'] || '-',
                    '人员类别': error['人员类别'] || '-',
                    '身份证号码': error['身份证号码'] || '-',
                    '当前值': error['当前值'] || '-',
                    '错误详情': error['错误详情'] || '-',
                    '行号': error['行号'] || '-'
                });
            }
        }
    }
    
    if (detailsData.length === 0) {
        alert('没有数据可导出');
        return;
    }
    
    var ws2 = XLSX.utils.json_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, ws2, "错误详情");
    
    var fileName = selectedFile.name.replace(/\.[^/.]+$/, '') + fileNameSuffix + '_检查报告_' + 
                   new Date().toLocaleDateString().replace(/\//g, '') + '.xlsx';
    XLSX.writeFile(wb, fileName);
    
    debugLog('成功导出 ' + detailsData.length + ' 条错误记录');
}

function restoreSavedRules() {
    var savedRules = StorageManager.loadSelectedRules();
    
    for (var ruleKey in savedRules) {
        if (savedRules.hasOwnProperty(ruleKey) && savedRules[ruleKey]) {
            var btn = document.querySelector('button[data-key="' + ruleKey + '"]');
            if (btn) {
                selectedRules[ruleKey] = true;
                if (btn.className.indexOf(' selected') === -1) {
                    btn.className += ' selected';
                }
            }
        }
    }
    
    updateValidateButton();
    updateCategoryButtonStates();
    
    var count = 0;
    for (var key in selectedRules) {
        if (selectedRules.hasOwnProperty(key)) count++;
    }
    
    if (count > 0) {
        console.info('已恢复 ' + count + ' 个规则选择');
    }
}

// 剪贴板复制函数（copyTextFromData/copyToClipboard/fallbackCopyToClipboard/showCopyFeedback）
// 统一由 脚本/数据生成工具.js 提供唯一实现，此处不再重复定义，
// 避免两份实现因加载顺序不同而互相覆盖、行为分叉

window.addEventListener('DOMContentLoaded', function() {
    initRuleSelector();
    restoreSavedRules();
    initResizer();
    
    // 恢复上次的页面状态
    try {
        var savedPage = localStorage.getItem('currentToolPage');
        if (savedPage) {
            // 根据保存的状态切换到对应页面
            if (savedPage === 'cardTool') {
                switchToCardTool();
            } else if (savedPage === 'generator') {
                switchToGenerator();
            } else if (savedPage === 'audit') {
                switchToAudit();
            } else if (savedPage === 'notification') {
                openNotificationHandler();
            } else {
                // 默认显示检查工具
                switchToChecker();
            }
        } else {
            // 如果没有保存的页面状态，默认显示检查工具
            switchToChecker();
        }
    } catch (e) {
        console.warn('无法初始化页面状态:', e);
        // 如果出错，默认显示检查工具
        switchToChecker();
    }
    
    window.onclick = function(event) {
        var usageHelpModal = document.getElementById('usageHelpModal');
        var changelogModal = document.getElementById('changelogModal');
        
        if (event.target == usageHelpModal) {
            closeUsageHelp();
        }
        if (event.target == changelogModal) {
            closeChangelog();
        }
    };
});
