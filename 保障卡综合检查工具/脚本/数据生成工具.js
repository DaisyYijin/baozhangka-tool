/**
 * 数据生成工具
 * 功能：为Excel文件中的缺失字段自动生成合理数据
 * 
 * 主要功能：
 * 1. 支持多种字段类型的智能生成（身份证、手机号、学位、血型等）
 * 2. 提供可视化标记（绿色背景标识生成的字段）
 * 3. 支持Excel导出，保留颜色标记
 * 
 * 生成器注册：
 * 各字段生成器通过 window.DATA_GENERATORS 注册
 * 每个生成器包含 name 和 generate 函数
 */
window.DATA_GENERATORS = {};

/**
 * 通用工具函数：列名匹配
 * 供所有生成器使用，解决列名中包含空格的问题
 */
window.GeneratorUtils = {
    /**
     * 清理字符串：移除所有空格（包括前后空格、中间空格、全角空格、制表符等）
     */
    cleanString: function(str) {
        if (!str) return '';
        return String(str)
            .trim()                    // 移除前后空格
            .replace(/\s+/g, '')       // 移除所有普通空格、制表符、换行符
            .replace(/　+/g, '')       // 移除全角空格
            .replace(/[\u200B-\u200D\uFEFF]/g, ''); // 移除零宽字符
    },
    
    /**
     * 查找列名（容错处理空格和不可见字符）
     * @param {Array} headers - 表头数组
     * @param {String|Array} targetNames - 要查找的列名（可以是字符串或数组）
     * @returns {String|null} 返回找到的原始列名，未找到返回null
     */
    findColumn: function(headers, targetNames) {
        var targets = Array.isArray(targetNames) ? targetNames : [targetNames];
        
        for (var i = 0; i < headers.length; i++) {
            var header = this.cleanString(headers[i]);
            
            for (var j = 0; j < targets.length; j++) {
                var target = this.cleanString(targets[j]);
                if (header === target) {
                    return headers[i]; // 返回原始列名（包含空格）
                }
            }
        }
        return null;
    },
    
    /**
     * 查找多个列名
     * @param {Array} headers - 表头数组
     * @param {Object} columnMap - 列名映射 {key: [可能的列名]}
     * @returns {Object} 返回找到的列名映射 {key: 实际列名}
     */
    findColumns: function(headers, columnMap) {
        var result = {};
        for (var key in columnMap) {
            if (columnMap.hasOwnProperty(key)) {
                result[key] = this.findColumn(headers, columnMap[key]);
            }
        }
        return result;
    }
};

/**
 * 生成器分类映射表
 * 按类别组织所有生成器，便于用户查找和使用
 */
var GENERATORS_MAPPING = {
    "个人信息": [
        "身份证日期生成",
        "证件类型生成",
        "证件编号生成",
        "联系电话生成",
        "血型生成",
        "体型数据生成"
    ],
    "教育信息": [
        "文化程度生成",
        "学位生成",
        "毕业院校生成",
        "毕业专业生成",
        "入学日期生成",
        "毕业日期生成"
    ],
    "工作信息": [
        "工作日期生成"
    ],
    "家庭信息": [
        "是否独生子女生成"
    ],
    "政治信息": [
        "组织关系机构名称生成",
        "政治面貌修正"
    ]
};

// 全局状态变量
var selectedGenerators = {};  // 已选中的生成器
var generatorFileData = null; // 数据生成工具 - 当前文件数据
var currentGenFile = null;    // 向后兼容别名，与 generatorFileData 同步
var generatedData = null;     // 生成后的数据
var cellColors = {};          // 单元格颜色标记（用于Excel导出）
var originalData = null;      // 原始数据备份

/**
 * 切换到数据生成工具页面
 */
function switchToGenerator() {
    document.getElementById('checkToolPage').style.display = 'none';
    document.getElementById('generatorToolPage').style.display = 'flex';
    document.getElementById('auditToolPage').style.display = 'none';
    document.getElementById('notificationHandlerPage').style.display = 'none';
    document.getElementById('cardToolPage').style.display = 'none';
    initDataGenerator();
    // 保存当前页面状态
    try {
        localStorage.setItem('currentToolPage', 'generator');
    } catch (e) {
        console.warn('无法保存页面状态:', e);
    }
}

/**
 * 切换回数据检查工具页面
 */
function switchToChecker() {
    document.getElementById('generatorToolPage').style.display = 'none';
    document.getElementById('auditToolPage').style.display = 'none';
    document.getElementById('notificationHandlerPage').style.display = 'none';
    document.getElementById('cardToolPage').style.display = 'none';
    document.getElementById('checkToolPage').style.display = 'flex';
    // 不清空生成器状态，保留生成结果
    // 保存当前页面状态
    try {
        localStorage.setItem('currentToolPage', 'checker');
    } catch (e) {
        console.warn('无法保存页面状态:', e);
    }
}

/**
 * 切换到数据联审工具页面
 */
function switchToAudit() {
    document.getElementById('checkToolPage').style.display = 'none';
    document.getElementById('generatorToolPage').style.display = 'none';
    document.getElementById('auditToolPage').style.display = 'flex';
    document.getElementById('notificationHandlerPage').style.display = 'none';
    document.getElementById('cardToolPage').style.display = 'none';
    // 不清空生成器状态，保留生成结果
    // 保存当前页面状态
    try {
        localStorage.setItem('currentToolPage', 'audit');
    } catch (e) {
        console.warn('无法保存页面状态:', e);
    }
}

/**
 * 重置生成器状态
 * 清空所有选择和生成的数据
 */
function resetGeneratorState() {
    selectedGenerators = {};
    currentGenFile = null;
    generatedData = null;
    cellColors = {};
    originalData = null;
    document.getElementById('genFileDisplay').innerHTML = '';
    document.getElementById('genRightPanel').style.display = 'none';
    document.getElementById('generateBtn').disabled = true;
    if (document.getElementById('genFileInput')) {
        document.getElementById('genFileInput').value = '';
    }
    
    var toggleBtn = document.getElementById('toggleAllGenBtn');
    if (toggleBtn) {
        toggleBtn.textContent = '全选';
        toggleBtn.classList.remove('active');
        // 强制样式更新
        toggleBtn.style.background = '';
        toggleBtn.style.boxShadow = '';
        toggleBtn.style.transform = '';
    }
    
    var buttons = document.querySelectorAll('#generatorToolPage .gen-tool-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('selected');
    }
}

/**
 * 初始化数据生成工具
 * 按分类渲染生成器按钮列表
 */
function initDataGenerator() {
    var toolsGrid = document.getElementById('genToolsGrid');
    if (!toolsGrid) return;
    
    debugLog('初始化数据生成工具，已注册的生成器:', Object.keys(DATA_GENERATORS));
    
    var html = '';
    var loadedCount = 0;
    var missingCount = 0;
    
    // 遍历分类
    for (var category in GENERATORS_MAPPING) {
        if (!GENERATORS_MAPPING.hasOwnProperty(category)) continue;
        
        var generators = GENERATORS_MAPPING[category];
        
        // 分类容器
        html += '<div class="rule-category">';
        
        // 分类头部
        html += '<div class="category-header-with-select">';
        html += '<div class="category-title">' + category + '</div>';
        html += '<button class="category-select-btn" data-category="' + category + '" onclick="toggleCategoryGenerators(\'' + category + '\')" title="全选/全不选 ' + category + '">全选</button>';
        html += '</div>';
        
        // 分类按钮容器
        html += '<div class="category-buttons">';
        
        // 分类下的生成器
        for (var i = 0; i < generators.length; i++) {
            var genKey = generators[i];
            var tool = DATA_GENERATORS[genKey];
            
            if (tool) {
                html += '<button class="rule-btn" data-key="' + genKey + '" onclick="toggleGenerator(\'' + genKey + '\')">';
                html += tool.name;
                html += '</button>';
                loadedCount++;
            } else {
                console.warn('生成器未注册: ' + genKey);
                missingCount++;
            }
        }
        
        html += '</div>';
        html += '</div>';
    }
    
    toolsGrid.innerHTML = html;
    debugLog('生成器加载完成: ' + loadedCount + ' 个成功, ' + missingCount + ' 个缺失');
}

function toggleAllGenerators() {
    var btn = document.getElementById('toggleAllGenBtn');
    var buttons = document.querySelectorAll('#generatorToolPage .rule-btn');
    
    var allSelected = true;
    for (var category in GENERATORS_MAPPING) {
        if (GENERATORS_MAPPING.hasOwnProperty(category)) {
            var generators = GENERATORS_MAPPING[category];
            for (var i = 0; i < generators.length; i++) {
                if (!selectedGenerators[generators[i]]) {
                    allSelected = false;
                    break;
                }
            }
            if (!allSelected) break;
        }
    }
    
    if (allSelected) {
        selectedGenerators = {};
        btn.textContent = '全选';
        btn.classList.remove('active');
        // 强制样式更新
        btn.style.background = '';
        btn.style.boxShadow = '';
        btn.style.transform = '';
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('selected');
        }
        updateCategoryButtons();
    } else {
        for (var category in GENERATORS_MAPPING) {
            if (GENERATORS_MAPPING.hasOwnProperty(category)) {
                var generators = GENERATORS_MAPPING[category];
                for (var i = 0; i < generators.length; i++) {
                    selectedGenerators[generators[i]] = true;
                }
            }
        }
        btn.textContent = '全不选';
        btn.classList.add('active');
        // 强制样式更新
        btn.style.background = '#dc3545';
        btn.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
        btn.style.transform = 'scale(1.02)';
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.add('selected');
        }
        updateCategoryButtons();
    }
    
    updateGenerateButton();
}

/**
 * 切换分类下的所有生成器
 */
function toggleCategoryGenerators(category) {
    if (!GENERATORS_MAPPING[category]) return;
    
    var generators = GENERATORS_MAPPING[category];
    var categoryBtn = document.querySelector('#generatorToolPage .category-select-btn[data-category="' + category + '"]');
    
    // 检查该分类下是否全部已选
    var allSelected = true;
    for (var i = 0; i < generators.length; i++) {
        if (!selectedGenerators[generators[i]]) {
            allSelected = false;
            break;
        }
    }
    
    // 切换选择状态
    for (var i = 0; i < generators.length; i++) {
        var genKey = generators[i];
        var btn = document.querySelector('#generatorToolPage .rule-btn[data-key="' + genKey + '"]');
        
        if (allSelected) {
            delete selectedGenerators[genKey];
            if (btn) btn.classList.remove('selected');
        } else {
            selectedGenerators[genKey] = true;
            if (btn) btn.classList.add('selected');
        }
    }
    
    updateCategoryButtons();
    updateToggleAllButton();
    updateGenerateButton();
}

/**
 * 更新所有分类按钮的状态
 */
function updateCategoryButtons() {
    for (var category in GENERATORS_MAPPING) {
        if (!GENERATORS_MAPPING.hasOwnProperty(category)) continue;
        
        var generators = GENERATORS_MAPPING[category];
        var categoryBtn = document.querySelector('#generatorToolPage .category-select-btn[data-category="' + category + '"]');
        if (!categoryBtn) continue;
        
        var allSelected = true;
        var noneSelected = true;
        
        for (var i = 0; i < generators.length; i++) {
            if (selectedGenerators[generators[i]]) {
                noneSelected = false;
            } else {
                allSelected = false;
            }
        }
        
        if (allSelected) {
            categoryBtn.textContent = '全不选';
            categoryBtn.classList.add('active');
            // 强制样式更新
            categoryBtn.style.background = '#dc3545';
            categoryBtn.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
            categoryBtn.style.transform = 'scale(1.02)';
        } else {
            categoryBtn.textContent = '全选';
            categoryBtn.classList.remove('active');
            // 强制样式更新
            categoryBtn.style.background = '';
            categoryBtn.style.boxShadow = '';
            categoryBtn.style.transform = '';
        }
    }
}

/**
 * 更新顶部"全选"按钮的状态
 */
function updateToggleAllButton() {
    var btn = document.getElementById('toggleAllGenBtn');
    if (!btn) return;
    
    var allSelected = true;
    for (var category in GENERATORS_MAPPING) {
        if (GENERATORS_MAPPING.hasOwnProperty(category)) {
            var generators = GENERATORS_MAPPING[category];
            for (var i = 0; i < generators.length; i++) {
                if (!selectedGenerators[generators[i]]) {
                    allSelected = false;
                    break;
                }
            }
            if (!allSelected) break;
        }
    }
    
    if (allSelected) {
        btn.textContent = '全不选';
        btn.classList.add('active');
        // 强制样式更新
        btn.style.background = '#dc3545';
        btn.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
        btn.style.transform = 'scale(1.02)';
    } else {
        btn.textContent = '全选';
        btn.classList.remove('active');
        // 强制样式更新
        btn.style.background = '';
        btn.style.boxShadow = '';
        btn.style.transform = '';
    }
}

function toggleGenerator(generatorKey) {
    var btn = document.querySelector('#generatorToolPage .rule-btn[data-key="' + generatorKey + '"]');
    
    if (selectedGenerators[generatorKey]) {
        delete selectedGenerators[generatorKey];
        if (btn) btn.classList.remove('selected');
    } else {
        selectedGenerators[generatorKey] = true;
        if (btn) btn.classList.add('selected');
    }
    
    updateCategoryButtons();
    updateToggleAllButton();
    updateGenerateButton();
}

// selectGenFile函数已移除，现在使用点击上传区域或拖拽文件

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('genFileInput');
    var genUploadArea = document.getElementById('genUploadArea');
    
    if (input) {
        input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                currentGenFile = file;
                displayGenFile(file);
                updateGenerateButton();
            }
        });
    }
    
    // 点击上传区域触发文件选择
    if (genUploadArea && input) {
        genUploadArea.addEventListener('click', function() {
            input.click();
        });
    }
    
    // 拖拽支持
    if (genUploadArea && typeof setupDragAndDrop === 'function') {
        setupDragAndDrop(genUploadArea, function(file) {
            currentGenFile = file;
            displayGenFile(file);
            updateGenerateButton();
        });
    }
});

function displayGenFile(file) {
    var container = document.getElementById('genFileDisplay');
    var sizeText = (file.size / 1024).toFixed(2) + ' KB';
    
    container.innerHTML = '<div class="file-item">' +
                            '<div class="file-info">' +
                                '<span class="file-icon"><i class="fa fa-file-excel-o"></i></span>' +
                                '<div>' +
                                    '<div class="file-name">' + escapeHtml(file.name) + '</div>' +
                                    '<div class="file-size">' + sizeText + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<button class="remove-btn" onclick="removeGenFile()">移除</button>' +
                        '</div>';
}

/**
 * 移除上传的文件
 * 清空文件和所有生成结果
 */
function removeGenFile() {
    currentGenFile = null;
    generatedData = null;
    cellColors = {};
    originalData = null;
    document.getElementById('genFileInput').value = '';
    document.getElementById('genFileDisplay').innerHTML = '';
    hideGenResults();
    updateGenerateButton();
}

/**
 * 隐藏生成结果面板
 * 恢复左侧面板居中状态
 */
function hideGenResults() {
    document.getElementById('genRightPanel').style.display = 'none';
    document.getElementById('genLeftPanel').classList.add('centered');
    document.getElementById('genLeftPanel').classList.remove('checking');
}

/**
 * 更新生成按钮状态
 * 只有在上传文件且选择了生成器后才启用
 */
function updateGenerateButton() {
    var btn = document.getElementById('generateBtn');
    var hasGenerators = Object.keys(selectedGenerators).length > 0;
    btn.disabled = !(currentGenFile && hasGenerators);
}

function generateData() {
    if (!currentGenFile) {
        alert('请先选择文件');
        return;
    }
    
    if (Object.keys(selectedGenerators).length === 0) {
        alert('请至少选择一个生成工具');
        return;
    }
    
    document.getElementById('genLeftPanel').classList.remove('centered');
    document.getElementById('genLeftPanel').classList.add('checking');
    var rightPanel = document.getElementById('genRightPanel');
    rightPanel.style.display = 'flex';
    
    var resultContainer = document.getElementById('genResultContainer');
    resultContainer.innerHTML = '<div class="loading">正在处理数据...</div>';
    
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, {type: 'array', cellStyles: true});
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            var jsonData = XLSX.utils.sheet_to_json(firstSheet, {defval: '', header: 1});
            
            originalData = JSON.parse(JSON.stringify(jsonData));
            
            var result = processDataGeneration(jsonData);
            
            generatedData = result.data;
            cellColors = result.cellColors;
            
            displayGenerationResult(result);
            
        } catch (error) {
            resultContainer.innerHTML = '<div class="error-message">处理失败: ' + escapeHtml(error.message) + '</div>';
        }
    };
    
    reader.onerror = function() {
        resultContainer.innerHTML = '<div class="error-message">文件读取失败</div>';
    };
    
    reader.readAsArrayBuffer(currentGenFile);
}

function processDataGeneration(data) {
    if (data.length === 0) {
        return {data: data, modifiedCount: 0, modifiedFields: {}, cellColors: {}};
    }
    
    var headers = data[0];
    
    // 标准化列名（移除空格），同时保留原始列名映射
    var cleanHeaders = [];
    var headerMapping = {}; // 清理后的列名 -> 原始列名
    
    debugLog('=== 列名标准化 ===');
    for (var j = 0; j < headers.length; j++) {
        var original = headers[j];
        var cleaned = window.GeneratorUtils.cleanString(original);
        cleanHeaders.push(cleaned);
        headerMapping[cleaned] = original;
        
        if (original !== cleaned) {
            debugLog('列名标准化: "' + original + '" → "' + cleaned + '"');
        }
    }
    
    // 使用清理后的列名创建数据行
    var rows = [];
    for (var i = 1; i < data.length; i++) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
            row[cleanHeaders[j]] = data[i][j]; // 使用清理后的列名
        }
        rows.push(row);
    }
    
    var colors = {};
    var modifiedCount = 0;
    var modifiedFields = {};
    
    for (var generatorKey in selectedGenerators) {
        var generator = DATA_GENERATORS[generatorKey];
        debugLog('处理生成器: ' + generatorKey, generator ? '[OK] 已找到' : '[ERROR] 未找到');
        
        if (generator && generator.func) {
            debugLog('执行生成器: ' + generatorKey);
            var result = generator.func(rows, originalData, cleanHeaders); // 传入清理后的列名
            debugLog('生成结果: ' + generatorKey + ' - 修改 ' + result.count + ' 个字段');
            
            modifiedCount += result.count;
            if (result.count > 0) {
                modifiedFields[generatorKey] = result.count;
            }
            if (result.colors) {
                for (var rowIdx in result.colors) {
                    if (!colors[rowIdx]) {
                        colors[rowIdx] = {};
                    }
                    for (var colName in result.colors[rowIdx]) {
                        // 将清理后的列名映射回原始列名
                        var originalColName = headerMapping[colName] || colName;
                        colors[rowIdx][originalColName] = result.colors[rowIdx][colName];
                    }
                }
            }
        } else {
            console.warn('生成器无效或缺少func函数: ' + generatorKey);
        }
    }
    
    // 将数据转换回原始格式（使用原始列名）
    var resultData = [headers];
    for (var i = 0; i < rows.length; i++) {
        var rowArray = [];
        for (var j = 0; j < headers.length; j++) {
            // 使用清理后的列名从row中获取数据
            rowArray.push(rows[i][cleanHeaders[j]] || '');
        }
        resultData.push(rowArray);
    }
    
    return {
        data: resultData,
        modifiedCount: modifiedCount,
        modifiedFields: modifiedFields,
        cellColors: colors
    };
}

function displayGenerationResult(result) {
    var resultContainer = document.getElementById('genResultContainer');
    
    var generatedRecords = [];
    var headers = result.data[0];
    
    var nameIdx = -1;
    var idIdx = -1;
    var possibleNameCols = ['姓名', '名字'];
    var possibleIdCols = ['公民身份号码', '身份证号码', '身份证号', '身份证'];
    
    for (var i = 0; i < headers.length; i++) {
        if (possibleNameCols.indexOf(headers[i]) !== -1) nameIdx = i;
        if (possibleIdCols.indexOf(headers[i]) !== -1) idIdx = i;
    }
    
    for (var rowIdx in result.cellColors) {
        var dataRowIdx = parseInt(rowIdx) + 1;
        var excelRowNum = dataRowIdx + 1;
        
        // 检查行是否存在
        if (!result.data[dataRowIdx]) {
            console.warn('数据行不存在: ' + dataRowIdx);
            continue;
        }
        
        for (var colName in result.cellColors[rowIdx]) {
            var colIdx = headers.indexOf(colName);
            if (colIdx === -1) continue;
            
            var color = result.cellColors[rowIdx][colName];
            var cellValue = result.data[dataRowIdx][colIdx];
            
            generatedRecords.push({
                '姓名': nameIdx !== -1 ? result.data[dataRowIdx][nameIdx] : '',
                '身份证号码': idIdx !== -1 ? result.data[dataRowIdx][idIdx] : '',
                '字段名称': colName,
                '生成值': cellValue,
                '行号': excelRowNum,
                '_color': color,
                '_generator': colName
            });
        }
    }
    
    var html = '<div class="report-container">' +
                   '<div class="summary-section">' +
                       '<h3><i class="fa fa-magic"></i> 生成分类</h3>' +
                       '<div class="summary-buttons">' +
                           '<button class="summary-btn active" onclick="showAllGenerated(event)">' +
                               '<div class="summary-category">全部</div>' +
                               '<div class="summary-rule">显示所有生成</div>' +
                               '<div class="summary-count">' + generatedRecords.length + '个生成</div>' +
                           '</button>';
    
    var fieldCounts = {};
    for (var i = 0; i < generatedRecords.length; i++) {
        var fieldName = generatedRecords[i]['字段名称'];
        fieldCounts[fieldName] = (fieldCounts[fieldName] || 0) + 1;
    }
    
    for (var fieldName in fieldCounts) {
        // 表头来自用户Excel：先做JS字符串转义（反斜杠/单引号），再做HTML属性转义。
        // 只做HTML转义不够——属性解码发生在JS解析之前，&#039;解码回'后仍会打断onclick里的JS字符串
        var safeFieldName = escapeHtml(String(fieldName).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
        html += '<button class="summary-btn" onclick="showFieldGenerated(\'' + safeFieldName + '\', event)">' +
                    '<div class="summary-category">数据生成</div>' +
                    '<div class="summary-rule">' + escapeHtml(fieldName) + '</div>' +
                    '<div class="summary-count">' + fieldCounts[fieldName] + '个生成</div>' +
                '</button>';
    }
    
    html += '</div></div>' +
            '<div class="details-section">' +
                '<div class="details-header">' +
                    '<h3><i class="fa fa-list-alt"></i> 生成详情</h3>' +
                    '<span class="error-count-badge" id="genCountBadge">共 ' + generatedRecords.length + ' 条生成</span>' +
                '</div>' +
                '<div style="margin: 15px 0; padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px;">' +
                    '<div style="font-size: 12px; color: #856404;">' +
                        '<strong><i class="fa fa-info-circle"></i> 颜色标记说明：</strong> ' +
                        '<span style="background: #ffeb3b; padding: 2px 6px; border-radius: 3px; margin: 0 5px;">黄色</span> 新增数据 ' +
                        '<span style="background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; margin: 0 5px;">橙色</span> 修改数据' +
                    '</div>' +
                '</div>' +
                '<div id="genDetailsContent"></div>' +
            '</div>' +
            '<div class="export-section">' +
                '<button class="export-btn" onclick="downloadGeneratedData()"><i class="fa fa-download"></i> 下载生成结果</button>' +
            '</div>' +
        '</div>';
    
    resultContainer.innerHTML = html;
    window.currentGenRecords = generatedRecords;
    showAllGenerated();
}

var genCurrentPage = 1;
var genPageSize = 10;
var genTotalPages = 0;
var genAllRecords = [];

function showAllGenerated(event) {
    if (!window.currentGenRecords) return;
    
    var allBtns = document.querySelectorAll('#generatorToolPage .summary-btn');
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
        var firstBtn = document.querySelector('#generatorToolPage .summary-btn');
        if (firstBtn) firstBtn.className += ' active';
    }
    
    document.getElementById('genCountBadge').textContent = '共 ' + window.currentGenRecords.length + ' 条生成';
    displayGeneratedWithPagination(window.currentGenRecords);
}

function showFieldGenerated(fieldName, event) {
    if (!window.currentGenRecords) return;
    
    var allBtns = document.querySelectorAll('#generatorToolPage .summary-btn');
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
    
    var filtered = [];
    for (var i = 0; i < window.currentGenRecords.length; i++) {
        if (window.currentGenRecords[i]['字段名称'] === fieldName) {
            filtered.push(window.currentGenRecords[i]);
        }
    }
    
    document.getElementById('genCountBadge').textContent = '共 ' + filtered.length + ' 条生成';
    displayGeneratedWithPagination(filtered);
}

function displayGeneratedWithPagination(records) {
    genAllRecords = records;
    genCurrentPage = 1;
    genTotalPages = Math.ceil(records.length / genPageSize);
    
    var html = '';
    
    html += '<div class="pagination-controls">' +
                '<div class="pagination-info">' +
                    '<span>共 <strong>' + records.length + '</strong> 条生成</span>' +
                '</div>' +
                '<div class="pagination-size-selector">' +
                    '<label>每页显示：</label>' +
                    '<select id="genPageSizeSelector" onchange="changeGenPageSize(this.value)">' +
                        '<option value="10"' + (genPageSize === 10 ? ' selected' : '') + '>10条</option>' +
                        '<option value="20"' + (genPageSize === 20 ? ' selected' : '') + '>20条</option>' +
                        '<option value="50"' + (genPageSize === 50 ? ' selected' : '') + '>50条</option>' +
                        '<option value="100"' + (genPageSize === 100 ? ' selected' : '') + '>100条</option>' +
                    '</select>' +
                '</div>' +
            '</div>';
    
    html += '<div class="error-table-container">' +
                '<table class="error-table">' +
                    '<thead>' +
                        '<tr>' +
                            '<th>序号</th>' +
                            '<th>姓名</th>' +
                            '<th>身份证号码</th>' +
                            '<th>字段名称</th>' +
                            '<th>生成值</th>' +
                            '<th>行号</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody id="genTableBody">' +
                    '</tbody>' +
                '</table>' +
            '</div>';
    
    html += '<div id="genPaginationNav"></div>';
    
    document.getElementById('genDetailsContent').innerHTML = html;
    renderGenPage(genCurrentPage);
}

/**
 * 渲染当前页的生成结果
 * @param {number} pageNum - 页码
 */
function renderGenPage(pageNum) {
    genCurrentPage = pageNum;
    
    /**
     * 格式化显示值
     */
    function formatValue(val) {
        if (val === null || val === undefined) {
            return '<span style="color: #999; font-style: italic;">空值</span>';
        }
        if (String(val).trim() === '') {
            return '<span style="color: #999; font-style: italic;">空字符串</span>';
        }
        return escapeHtml(String(val));
    }
    
    /**
     * 格式化可复制的值（姓名和身份证号）
     * 添加点击复制功能
     */
    function formatCopyableValue(val) {
        if (val === null || val === undefined || String(val).trim() === '') {
            return '<span style="color: #999; font-style: italic;">空值</span>';
        }
        var rawVal = String(val);
        var escapedForDisplay = escapeHtml(rawVal);
        var escapedForAttr = escapeHtml(rawVal);
        // 将值存储在data属性中，使用HTML转义确保安全
        return '<span class="copyable-text" data-copy-text="' + escapedForAttr + '" title="点击复制">' + 
               escapedForDisplay + 
               '</span>';
    }
    
    var startIdx = (genCurrentPage - 1) * genPageSize;
    var endIdx = Math.min(startIdx + genPageSize, genAllRecords.length);
    
    var tbody = document.getElementById('genTableBody');
    if (!tbody) return;
    
    var html = '';
    for (var i = startIdx; i < endIdx; i++) {
        var record = genAllRecords[i];
        var displayNum = i + 1;
        
        var rowColor = '';
        if (record._color === 'yellow') {
            rowColor = ' style="background-color: #fffde7;"';
        } else if (record._color === 'orange') {
            rowColor = ' style="background-color: #fff3e0;"';
        }
        
        html += '<tr' + rowColor + '>' +
                    '<td>' + displayNum + '</td>' +
                    '<td>' + formatCopyableValue(record['姓名']) + '</td>' +
                    '<td>' + formatCopyableValue(record['身份证号码']) + '</td>' +
                    '<td>' + formatValue(record['字段名称']) + '</td>' +
                    '<td><strong>' + formatCopyableValue(record['生成值']) + '</strong></td>' +
                    '<td>' + formatValue(record['行号']) + '</td>' +
                '</tr>';
    }
    
    tbody.innerHTML = html;
    
    // 为所有可复制元素添加点击事件（事件委托）
    var copyableElements = tbody.querySelectorAll('.copyable-text');
    for (var i = 0; i < copyableElements.length; i++) {
        copyableElements[i].addEventListener('click', function() {
            copyTextFromData(this);
        });
    }
    
    renderGenPagination();
}

function renderGenPagination() {
    var nav = document.getElementById('genPaginationNav');
    if (!nav || genTotalPages <= 1) {
        if (nav) nav.innerHTML = '';
        return;
    }
    
    var html = '<div class="pagination">';
    
    if (genCurrentPage > 1) {
        html += '<button class="page-btn" onclick="changeGenPage(' + (genCurrentPage - 1) + ')">上一页</button>';
    } else {
        html += '<button class="page-btn" disabled>上一页</button>';
    }
    
    var startPage = Math.max(1, genCurrentPage - 2);
    var endPage = Math.min(genTotalPages, genCurrentPage + 2);
    
    if (startPage > 1) {
        html += '<button class="page-btn" onclick="changeGenPage(1)">1</button>';
        if (startPage > 2) {
            html += '<span class="page-ellipsis">...</span>';
        }
    }
    
    for (var i = startPage; i <= endPage; i++) {
        if (i === genCurrentPage) {
            html += '<button class="page-btn active">' + i + '</button>';
        } else {
            html += '<button class="page-btn" onclick="changeGenPage(' + i + ')">' + i + '</button>';
        }
    }
    
    if (endPage < genTotalPages) {
        if (endPage < genTotalPages - 1) {
            html += '<span class="page-ellipsis">...</span>';
        }
        html += '<button class="page-btn" onclick="changeGenPage(' + genTotalPages + ')">' + genTotalPages + '</button>';
    }
    
    if (genCurrentPage < genTotalPages) {
        html += '<button class="page-btn" onclick="changeGenPage(' + (genCurrentPage + 1) + ')">下一页</button>';
    } else {
        html += '<button class="page-btn" disabled>下一页</button>';
    }
    
    html += '</div>';
    nav.innerHTML = html;
}

function changeGenPage(pageNum) {
    if (pageNum < 1 || pageNum > genTotalPages) return;
    renderGenPage(pageNum);
}

function changeGenPageSize(size) {
    genPageSize = parseInt(size);
    displayGeneratedWithPagination(genAllRecords);
}

// 记录用户电脑的内存状况（用于智能选择导出模式）
var memoryStatus = {
    hasMemoryIssue: false, // 是否曾出现内存问题
    lastDataSize: 0,       // 上次出现问题的数据量
    initialized: false
};

/**
 * 从本地存储加载内存状态
 */
function loadMemoryStatus() {
    try {
        var saved = localStorage.getItem('excelExportMemoryStatus');
        if (saved) {
            var status = JSON.parse(saved);
            memoryStatus.hasMemoryIssue = status.hasMemoryIssue || false;
            memoryStatus.lastDataSize = status.lastDataSize || 0;
            debugLog('加载内存状态:', memoryStatus);
        }
    } catch (e) {
        console.warn('无法加载内存状态:', e);
    }
    memoryStatus.initialized = true;
}

/**
 * 保存内存状态到本地存储
 */
function saveMemoryStatus() {
    try {
        localStorage.setItem('excelExportMemoryStatus', JSON.stringify({
            hasMemoryIssue: memoryStatus.hasMemoryIssue,
            lastDataSize: memoryStatus.lastDataSize
        }));
    } catch (e) {
        console.warn('无法保存内存状态:', e);
    }
}

function downloadGeneratedData() {
    if (!generatedData) {
        alert('没有可下载的数据');
        return;
    }
    
    // 初始化内存状态
    if (!memoryStatus.initialized) {
        loadMemoryStatus();
    }
    
    try {
        // 显示处理提示
        var processingMsg = document.createElement('div');
        processingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
                                       'background: rgba(0,0,0,0.8); color: white; padding: 20px 40px; ' +
                                       'border-radius: 8px; z-index: 10000; font-size: 16px;';
        processingMsg.innerHTML = '<div style="text-align: center;">正在生成Excel文件，请稍候...</div>' +
                                  '<div id="exportProgress" style="margin-top: 10px; font-size: 14px; color: #ccc;"></div>';
        document.body.appendChild(processingMsg);
        
        // 使用 setTimeout 让浏览器有机会渲染提示信息
        setTimeout(function() {
            try {
                // 检查数据有效性
                if (!generatedData || generatedData.length === 0) {
                    throw new Error('没有可下载的数据');
                }
                
                if (!window.XLSX) {
                    throw new Error('Excel库未加载，请刷新页面重试');
                }
                
                var totalRows = generatedData.length - 1; // 减去表头
                var columnCount = generatedData[0] ? generatedData[0].length : 0;
                var dataSize = totalRows * columnCount; // 数据单元格总数
                
                debugLog('准备导出Excel - 数据行数: ' + totalRows + ', 列数: ' + columnCount + ', 总单元格: ' + dataSize);
                
                // 智能判断是否需要分批
                var needBatch = shouldUseBatchMode(totalRows, columnCount, dataSize);
                
                if (needBatch) {
                    // 分批模式
                    var config = calculateBatchConfig(totalRows, columnCount);
                    debugLog('使用分批模式 - 批次大小: ' + config.batchSize + ', 简化模式: ' + config.simpleMode);
                    
                    // 更新提示信息
                    var progressEl = document.getElementById('exportProgress');
                    if (progressEl) {
                        progressEl.textContent = '数据量较大，将分批导出...';
                    }
                    
                    downloadInBatchesOptimized(generatedData, cellColors, config.batchSize, processingMsg, config.simpleMode);
                } else {
                    // 尝试一次性导出
                    debugLog('尝试一次性导出...');
                    tryFullExport(generatedData, cellColors, processingMsg, totalRows, columnCount, dataSize);
                }
                
            } catch (error) {
                // 移除提示信息
                if (processingMsg.parentNode) {
                    document.body.removeChild(processingMsg);
                }
                console.error('下载错误:', error);
                var errorMsg = error && error.message ? error.message : String(error || '未知错误');
                alert('下载失败: ' + errorMsg);
            }
        }, 100);
        
    } catch (error) {
        console.error('下载错误:', error);
        var errorMsg = error && error.message ? error.message : String(error || '未知错误');
        alert('下载失败: ' + errorMsg);
    }
}

/**
 * 判断是否应该使用分批模式
 * @param {number} totalRows - 总行数
 * @param {number} columnCount - 列数
 * @param {number} dataSize - 总单元格数
 * @returns {boolean} 是否使用分批模式
 */
function shouldUseBatchMode(totalRows, columnCount, dataSize) {
    // 1. 如果历史记录显示此电脑有内存问题，且当前数据量大于上次问题数据量的80%，直接分批
    if (memoryStatus.hasMemoryIssue && dataSize > memoryStatus.lastDataSize * 0.8) {
        debugLog('根据历史记录判断：需要分批（上次问题数据量: ' + memoryStatus.lastDataSize + '）');
        return true;
    }
    
    // 2. 超大数据量，无论如何都分批
    if (totalRows > 50000 || dataSize > 5000000) {
        debugLog('超大数据量，强制分批');
        return true;
    }
    
    // 3. 尝试检测可用内存（部分浏览器支持）
    if (window.performance && window.performance.memory) {
        var memory = window.performance.memory;
        var usedMemory = memory.usedJSHeapSize;
        var totalMemory = memory.jsHeapSizeLimit;
        var availableMemory = totalMemory - usedMemory;
        
        // 估算需要的内存（每个单元格约100字节，加上样式信息）
        var estimatedMemory = dataSize * 150;
        
        debugLog('内存检测 - 可用: ' + (availableMemory / 1024 / 1024).toFixed(2) + 'MB, ' +
                    '需要: ' + (estimatedMemory / 1024 / 1024).toFixed(2) + 'MB');
        
        // 如果估算需要的内存超过可用内存的70%，使用分批模式
        if (estimatedMemory > availableMemory * 0.7) {
            debugLog('可用内存不足，使用分批模式');
            return true;
        }
    }
    
    // 4. 默认尝试一次性导出（让用户享受更好的体验）
    return false;
}

/**
 * 计算分批配置
 * @param {number} totalRows - 总行数
 * @param {number} columnCount - 列数
 * @returns {Object} {batchSize, simpleMode}
 */
function calculateBatchConfig(totalRows, columnCount) {
    var BATCH_SIZE;
    var USE_SIMPLE_MODE = false;
    
    // 如果列数很多，需要更小的批次
    var columnFactor = columnCount > 100 ? 0.5 : (columnCount > 50 ? 0.7 : 1);
    
    if (totalRows > 100000) {
        BATCH_SIZE = Math.floor(500 * columnFactor);
        USE_SIMPLE_MODE = true;
    } else if (totalRows > 50000) {
        BATCH_SIZE = Math.floor(800 * columnFactor);
        USE_SIMPLE_MODE = true;
    } else if (totalRows > 20000) {
        BATCH_SIZE = Math.floor(1500 * columnFactor);
        USE_SIMPLE_MODE = true;
    } else if (totalRows > 10000) {
        BATCH_SIZE = Math.floor(2000 * columnFactor);
    } else if (totalRows > 5000) {
        BATCH_SIZE = Math.floor(3000 * columnFactor);
    } else {
        BATCH_SIZE = Math.floor(5000 * columnFactor);
    }
    
    // 确保至少有100行
    if (BATCH_SIZE < 100 && totalRows >= 100) {
        BATCH_SIZE = 100;
    }
    
    return {
        batchSize: BATCH_SIZE,
        simpleMode: USE_SIMPLE_MODE
    };
}

/**
 * 尝试一次性完整导出
 * 如果失败（内存不足），自动切换到分批模式
 */
function tryFullExport(data, colors, processingMsg, totalRows, columnCount, dataSize) {
    try {
        debugLog('开始一次性完整导出...');
        
        var progressEl = document.getElementById('exportProgress');
        if (progressEl) {
            progressEl.textContent = '正在生成完整Excel文件...';
        }
        
        // 尝试一次性导出
        downloadSingleFile(data, colors, processingMsg, false);
        
        debugLog('一次性导出成功');
        
    } catch (error) {
        console.error('一次性导出失败:', error);
        
        // 判断是否为内存错误
        var errorMsg = error && error.message ? error.message.toLowerCase() : String(error).toLowerCase();
        var isMemoryError = errorMsg.indexOf('memory') !== -1 || 
                           errorMsg.indexOf('内存') !== -1 ||
                           errorMsg.indexOf('heap') !== -1 ||
                           errorMsg.indexOf('out of') !== -1;
        
        if (isMemoryError) {
            debugLog('检测到内存不足，自动切换到分批模式');
            
            // 记录内存问题
            memoryStatus.hasMemoryIssue = true;
            memoryStatus.lastDataSize = dataSize;
            saveMemoryStatus();
            
            // 更新提示信息
            var progressEl = document.getElementById('exportProgress');
            if (progressEl) {
                progressEl.textContent = '内存不足，自动切换到分批导出...';
            }
            
            // 等待一下让浏览器回收内存
            setTimeout(function() {
                try {
                    var config = calculateBatchConfig(totalRows, columnCount);
                    debugLog('使用分批模式 - 批次大小: ' + config.batchSize);
                    
                    downloadInBatchesOptimized(data, colors, config.batchSize, processingMsg, config.simpleMode);
                    
                } catch (retryError) {
                    // 如果分批也失败了，清理并报错
                    if (processingMsg && processingMsg.parentNode) {
                        document.body.removeChild(processingMsg);
                    }
                    
                    console.error('分批导出也失败:', retryError);
                    var msg = '导出失败，建议尝试以下方法：\n\n';
                    msg += '1. 关闭其他浏览器标签页\n';
                    msg += '2. 重新加载本页面\n';
                    msg += '3. 将数据分成更小的部分处理\n';
                    msg += '4. 使用性能更好的电脑或浏览器';
                    alert(msg);
                }
            }, 1000);
            
        } else {
            // 非内存错误，直接报错
            if (processingMsg && processingMsg.parentNode) {
                document.body.removeChild(processingMsg);
            }
            throw error;
        }
    }
}

/**
 * 单文件下载（优化内存使用）
 * @param {Boolean} simpleMode - 简化模式（不应用样式，节省内存）
 */
function downloadSingleFile(data, colors, processingMsg, simpleMode) {
    try {
        debugLog('开始单文件下载，数据行数: ' + (data.length - 1) + ', 简化模式: ' + simpleMode);
        
        var headers = data[0];
        debugLog('表头列数: ' + headers.length);
        
        // 创建工作簿和工作表
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.aoa_to_sheet(data);
        
        // 只在非简化模式下应用样式
        if (!simpleMode && colors && Object.keys(colors).length > 0) {
            // 预先建立列名到索引的映射
            var colNameToIdx = {};
            for (var i = 0; i < headers.length; i++) {
                colNameToIdx[headers[i]] = i;
            }
            
            var result = applyCellStyles(ws, data, colors, colNameToIdx, 0);
            debugLog('添加工作表到工作簿 (样式: ' + result.styleCount + ', 跳过: ' + result.skipCount + ')');
        } else {
            debugLog('添加工作表到工作簿 (无样式)');
        }
        
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        
        var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        var filename = '生成数据_' + timestamp + (simpleMode ? '_无样式' : '') + '.xlsx';
        
        debugLog('准备写入文件: ' + filename);
        
        // 检查 XLSX.writeFile 是否存在
        if (typeof XLSX.writeFile !== 'function') {
            throw new Error('Excel导出功能不可用，请使用较新版本的浏览器');
        }
        
        XLSX.writeFile(wb, filename, {
            bookType: 'xlsx',
            cellStyles: !simpleMode
        });
        
        debugLog('文件写入成功');
        
        // 释放内存
        wb = null;
        ws = null;
        
        // 移除提示信息
        if (processingMsg && processingMsg.parentNode) {
            document.body.removeChild(processingMsg);
        }
        
        var msg = 'Excel文件已下载成功！\n\n文件包含完整的生成数据（' + (data.length - 1) + ' 行）。';
        if (simpleMode) {
            msg += '\n\n注意：为节省内存，文件不包含颜色标记。';
        } else {
            msg += '\n\n注意：受当前Excel组件限制，导出文件可能不保留黄/橙颜色标记；新增/修改的数据范围以页面预览中的颜色为准。';
        }
        msg += '\n您可以直接使用此文件或复制粘贴到原文件中。';
        alert(msg);
        
    } catch (error) {
        // 移除提示信息
        if (processingMsg && processingMsg.parentNode) {
            document.body.removeChild(processingMsg);
        }
        console.error('下载错误:', error);
        var errorMsg = error && error.message ? error.message : String(error || '未知错误');
        alert('下载失败: ' + errorMsg);
        throw error;
    }
}

/**
 * 分批下载（优化版 - 异步处理，减少内存占用）
 * @param {Boolean} simpleMode - 简化模式（不应用样式，大幅节省内存）
 */
function downloadInBatchesOptimized(data, colors, batchSize, processingMsg, simpleMode) {
    var headers = data[0];
    var totalRows = data.length - 1;
    var totalBatches = Math.ceil(totalRows / batchSize);
    
    debugLog('数据量较大，将分 ' + totalBatches + ' 个文件下载 (简化模式: ' + simpleMode + ')');
    
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // 只在需要样式时建立列名映射
    var colNameToIdx = null;
    if (!simpleMode) {
        colNameToIdx = {};
        for (var i = 0; i < headers.length; i++) {
            colNameToIdx[headers[i]] = i;
        }
    }
    
    var currentBatch = 0;
    
    // 使用递归异步处理每个批次，避免阻塞浏览器
    function processBatch() {
        try {
            if (currentBatch >= totalBatches) {
                // 所有批次完成
                if (processingMsg && processingMsg.parentNode) {
                    document.body.removeChild(processingMsg);
                }
                
                var msg = 'Excel文件已分批下载完成！\n\n' +
                          '数据量较大，已自动拆分为 ' + totalBatches + ' 个文件。\n' +
                          '每个文件包含约 ' + batchSize + ' 行数据。';
                
                if (simpleMode) {
                    msg += '\n\n[!] 注意：为节省内存，文件不包含颜色标记。\n数据内容完整，只是没有黄色/橙色标识。';
                } else {
                    msg += '\n\n[!] 注意：受当前Excel组件限制，导出文件可能不保留黄/橙颜色标记；新增/修改的数据范围以页面预览中的颜色为准。';
                }
                
                msg += '\n\n文件命名格式：生成数据_时间_第X批_共Y批' + (simpleMode ? '_无样式' : '') + '.xlsx';
                
                alert(msg);
                return;
            }
            
            var startRow = currentBatch * batchSize + 1;
            var endRow = Math.min((currentBatch + 1) * batchSize + 1, data.length);
            
            // 更新进度提示
            var progressEl = document.getElementById('exportProgress');
            if (progressEl) {
                progressEl.textContent = '正在生成第 ' + (currentBatch + 1) + '/' + totalBatches + ' 个文件...';
            }
            
            debugLog('生成批次 ' + (currentBatch + 1) + ': 行 ' + startRow + ' 到 ' + (endRow - 1));
            
            // 提取当前批次的数据（只复制需要的行，节省内存）
            var batchData = [headers.slice()]; // 使用slice复制表头，避免引用原数组
            for (var i = startRow; i < endRow; i++) {
                if (data[i]) { // 检查行是否存在
                    batchData.push(data[i].slice()); // 使用slice复制数据，避免引用
                }
            }
            
            // 只在非简化模式下提取颜色标记
            var batchColors = {};
            if (!simpleMode && colors) {
                for (var rowIdx in colors) {
                    var originalRowIdx = parseInt(rowIdx);
                    var dataRowIdx = originalRowIdx + 1;
                    
                    if (dataRowIdx >= startRow && dataRowIdx < endRow) {
                        var newRowIdx = dataRowIdx - startRow;
                        // 深拷贝颜色对象，避免引用
                        batchColors[newRowIdx] = {};
                        for (var col in colors[rowIdx]) {
                            batchColors[newRowIdx][col] = colors[rowIdx][col];
                        }
                    }
                }
            }
            
            // 生成Excel
            var wb = null;
            var ws = null;
            
            try {
                wb = XLSX.utils.book_new();
                ws = XLSX.utils.aoa_to_sheet(batchData);
                
                // 只在非简化模式下应用样式
                if (!simpleMode && Object.keys(batchColors).length > 0) {
                    applyCellStyles(ws, batchData, batchColors, colNameToIdx, 0);
                }
                
                XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                
                var filename = '生成数据_' + timestamp + '_第' + (currentBatch + 1) + '批_共' + totalBatches + '批' + (simpleMode ? '_无样式' : '') + '.xlsx';
                
                XLSX.writeFile(wb, filename, {
                    bookType: 'xlsx',
                    cellStyles: !simpleMode
                });
                
                debugLog('批次 ' + (currentBatch + 1) + ' 下载完成');
                
            } finally {
                // 立即释放内存
                batchData = null;
                batchColors = null;
                wb = null;
                ws = null;
            }
            
            currentBatch++;
            
            // 延迟处理下一批次，让浏览器有机会回收内存和响应用户操作
            // 增加延迟时间，给浏览器更多时间回收内存
            setTimeout(processBatch, 500);
            
        } catch (error) {
            // 移除提示信息
            if (processingMsg && processingMsg.parentNode) {
                document.body.removeChild(processingMsg);
            }
            console.error('分批下载错误 (批次 ' + (currentBatch + 1) + '):', error);
            var errorMsg = error && error.message ? error.message : String(error || '未知错误');
            
            var helpMsg = '分批下载失败 (批次 ' + (currentBatch + 1) + '): ' + errorMsg;
            if (currentBatch > 0) {
                helpMsg += '\n\n[OK] 已成功下载 ' + currentBatch + ' 个文件。';
            }
            
            // 如果是内存错误，提供额外建议
            if (errorMsg.toLowerCase().indexOf('memory') !== -1 || errorMsg.toLowerCase().indexOf('内存') !== -1) {
                helpMsg += '\n\n[TIP] 内存不足解决建议：';
                helpMsg += '\n1. 关闭其他浏览器标签页';
                helpMsg += '\n2. 重新加载本页面（清空内存）';
                helpMsg += '\n3. 将数据分成更小的部分分别处理';
                helpMsg += '\n4. 使用性能更好的浏览器（如Chrome）';
            }
            
            alert(helpMsg);
        }
    }
    
    // 开始处理第一个批次
    processBatch();
}

/**
 * 应用单元格样式
 * @param {Object} ws - 工作表对象
 * @param {Array} data - 数据数组
 * @param {Object} colors - 颜色标记对象
 * @param {Object} colNameToIdx - 列名到索引的映射
 * @param {number} rowOffset - 行偏移量（用于批次处理）
 * @return {Object} 返回统计信息
 */
function applyCellStyles(ws, data, colors, colNameToIdx, rowOffset) {
    var styleCount = 0;
    var skipCount = 0;
    
    // 预定义样式对象，避免重复创建
    var yellowStyle = {
        fill: {
            patternType: 'solid',
            fgColor: { rgb: 'FFFFFF00' },
            bgColor: { rgb: 'FFFFFF00' }
        },
        font: {}
    };
    
    var orangeStyle = {
        fill: {
            patternType: 'solid',
            fgColor: { rgb: 'FFFF9800' },
            bgColor: { rgb: 'FFFF9800' }
        },
        font: { color: { rgb: 'FFFFFFFF' } }
    };
    
    for (var rowIdx in colors) {
        var excelRowIdx = parseInt(rowIdx) + 1; // Excel中的行号（跳过表头）
        
        // 检查行是否存在
        if (!data[excelRowIdx]) {
            skipCount++;
            continue;
        }
        
        for (var colName in colors[rowIdx]) {
            var colIdx = colNameToIdx[colName];
            if (colIdx === undefined) {
                skipCount++;
                continue;
            }
            
            var color = colors[rowIdx][colName];
            var cellAddress = XLSX.utils.encode_cell({r: excelRowIdx, c: colIdx});
            
            if (!ws[cellAddress]) {
                var cellValue = data[excelRowIdx][colIdx];
                ws[cellAddress] = {
                    t: 's',
                    v: cellValue || ''
                };
            }
            
            // 使用预定义样式对象
            ws[cellAddress].s = color === 'yellow' ? yellowStyle : orangeStyle;
            
            styleCount++;
        }
    }
    
    return { styleCount: styleCount, skipCount: skipCount };
}

// escapeHtml 函数已移至 DataCheckUtils，统一引用
// 为保持向后兼容，提供别名（同时校验escapeHtml方法确实存在，避免绑定到undefined）
var escapeHtml = (window.DataCheckUtils && typeof window.DataCheckUtils.escapeHtml === 'function') ? window.DataCheckUtils.escapeHtml : function(text) {
    if (typeof text !== 'string') {
        text = String(text);
    }
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
};

/**
 * 从元素的data属性中复制文本
 * @param {HTMLElement} element - 包含data-copy-text属性的元素
 */
function copyTextFromData(element) {
    if (!element) return;
    var text = element.getAttribute('data-copy-text');
    if (!text) {
        // 如果没有data属性，尝试使用文本内容
        text = element.textContent || element.innerText;
    }
    // 解码HTML实体
    var textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    text = textarea.value;
    
    copyToClipboard(text, element);
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @param {HTMLElement} element - 触发复制的元素（用于显示反馈）
 */
function copyToClipboard(text, element) {
    // 方法1: 使用现代 Clipboard API（如果支持）
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function() {
            showCopyFeedback(element, true);
        }).catch(function(err) {
            // 失败时使用备用方法
            fallbackCopyToClipboard(text, element);
        });
    } else {
        // 方法2: 使用传统方法（兼容旧浏览器）
        fallbackCopyToClipboard(text, element);
    }
}

/**
 * 备用复制方法（兼容旧浏览器）
 * @param {string} text - 要复制的文本
 * @param {HTMLElement} element - 触发复制的元素
 */
function fallbackCopyToClipboard(text, element) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        var successful = document.execCommand('copy');
        showCopyFeedback(element, successful);
    } catch (err) {
        showCopyFeedback(element, false);
    }
    
    document.body.removeChild(textArea);
}

/**
 * 显示复制反馈
 * @param {HTMLElement} element - 要显示反馈的元素
 * @param {boolean} success - 是否成功
 */
function showCopyFeedback(element, success) {
    if (!element) return;
    
    // 移除可能存在的旧定时器
    if (element._copyTimer) {
        clearTimeout(element._copyTimer);
        element._copyTimer = null;
    }
    
    if (success) {
        // 添加已复制标记（持久保持）
        element.setAttribute('data-copied', 'true');
        
    } else {
        // 复制失败时短暂显示错误（临时）
        element.setAttribute('data-copied', 'false');
        element.style.backgroundColor = '#ffebee';
        element.style.color = '#c62828';
        element.style.border = '1px solid #ef9a9a';
        
        // 1.5秒后恢复
        element._copyTimer = setTimeout(function() {
            element.style.backgroundColor = '';
            element.style.color = '';
            element.style.border = '';
            element.removeAttribute('data-copied');
            element._copyTimer = null;
        }, 1500);
    }
}

// String.prototype.padStart 垫片已移至 脚本/浏览器兼容.js 统一维护
// （原先放在本文件尾部，生效依赖"本文件先于发卡收卡登记.js加载"的脆弱顺序）

/**
 * 恢复保存的页面状态
 * 在页面加载时调用，恢复用户上次访问的页面
 */
function restorePageState() {
    try {
        var savedPage = localStorage.getItem('currentToolPage');
        
        // 隐藏所有页面
        document.getElementById('checkToolPage').style.display = 'none';
        document.getElementById('generatorToolPage').style.display = 'none';
        document.getElementById('auditToolPage').style.display = 'none';
        document.getElementById('notificationHandlerPage').style.display = 'none';
        document.getElementById('cardToolPage').style.display = 'none';
        
        // 显示保存的页面
        if (savedPage === 'generator') {
            document.getElementById('generatorToolPage').style.display = 'flex';
            initDataGenerator();
        } else if (savedPage === 'audit') {
            document.getElementById('auditToolPage').style.display = 'flex';
        } else if (savedPage === 'notification') {
            document.getElementById('notificationHandlerPage').style.display = 'flex';
        } else if (savedPage === 'cardTool') {
            document.getElementById('cardToolPage').style.display = 'flex';
        } else {
            // 默认显示检查工具
            document.getElementById('checkToolPage').style.display = 'flex';
        }
    } catch (e) {
        console.warn('无法恢复页面状态:', e);
        // 如果出错，默认显示检查工具
        document.getElementById('checkToolPage').style.display = 'flex';
    }
}

// 页面加载时恢复状态
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restorePageState);
} else {
    // DOM已经加载完成
    restorePageState();
}

