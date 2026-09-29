/**
 * 通知单处理工具
 * 
 * 功能概述：
 * 1. 管理通知单文件的上传（支持点击和拖拽）
 * 2. 解析Excel文件，动态提取字段（冒号分隔）
 * 3. 智能识别通知类型（三级优先级系统）
 * 4. 批量处理多人记录，自动继承通知类型、文号和日期
 * 5. 提供类型筛选和分类导出功能
 * 
 * 调试：在浏览器控制台查看详细日志（F12）
 * 调试级别：DEBUG_LEVEL = 0(关闭), 1(关键), 2(详细)
 */

// DOM元素引用
var notifUploadArea = document.getElementById('notifUploadArea');
var notifFileInput = document.getElementById('notifFileInput');
var notifFileDisplay = document.getElementById('notifFileDisplay');
var notifProcessBtn = document.getElementById('notifProcessBtn');
var notifResultContainer = document.getElementById('notifResultContainer');
var notifRightPanel = document.getElementById('notifRightPanel');
var notifLeftPanel = document.getElementById('notifLeftPanel');

// 全局状态变量
var selectedNotifFile = null;      // 当前选中的文件
var notifProcessResult = null;     // 处理结果数据
var currentNotifTypeFilter = '';   // 当前选中的通知类型筛选

// 调试级别：0=关闭详细日志, 1=显示关键日志, 2=显示所有日志
var DEBUG_LEVEL = 1;

// 特殊字段列表：这些字段的值可能在下一行
var SPECIAL_FIELDS_FOR_NEXT_ROW = ['通知单类型', '文号', '日期'];

// 类型相关字段：用于识别通知类型的字段
var TYPE_RELATED_FIELDS = ['通知单类型', '类型', '新增类型', '调动事由', '变动原因', '事由', '原因'];

// 配置常量
var CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB 文件大小限制
    PREVIEW_ROW_COUNT: 3,              // 预览显示行数
    PREVIEW_CELL_COUNT: 5,             // 预览显示单元格数
    PREVIEW_MAX_LENGTH: 200,           // 预览最大字符数
    CELL_MAX_LENGTH: 15                // 单元格预览最大字符数
};

/**
 * 切换到通知单处理页面
 */
function openNotificationHandler() {
    document.getElementById('checkToolPage').style.display = 'none';
    document.getElementById('generatorToolPage').style.display = 'none';
    document.getElementById('auditToolPage').style.display = 'none';
    document.getElementById('cardToolPage').style.display = 'none';
    document.getElementById('notificationHandlerPage').style.display = 'flex';
    
    // 保存当前页面状态
    try {
        localStorage.setItem('currentToolPage', 'notification');
    } catch (e) {
        console.warn('无法保存页面状态:', e);
    }
}

/**
 * 文件输入变化事件监听
 */
notifFileInput.addEventListener('change', function(event) {
    var file = event.target.files[0];
    if (file) {
        handleNotifFileSelect(file);
    }
});

/**
 * 点击上传区域触发文件选择
 */
notifUploadArea.addEventListener('click', function() {
    notifFileInput.click();
});

/**
 * 处理选中的文件
 */
function handleNotifFileSelect(file) {
    // 验证文件类型
    var validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type) && 
        !file.name.endsWith('.xlsx') && 
        !file.name.endsWith('.xls')) {
        alert('请选择有效的Excel文件（.xlsx 或 .xls）');
        return;
    }
    
    // 验证文件大小（限制10MB）
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        var sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        var maxSizeMB = (CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
        alert('文件大小超出限制！\n当前文件: ' + sizeMB + ' MB\n最大限制: ' + maxSizeMB + ' MB');
        return;
    }
    
    selectedNotifFile = file;
    
    // 显示文件信息
    displayNotifFile(file);
    
    // 启用处理按钮
    notifProcessBtn.disabled = false;
    
    // 隐藏结果面板
    notifRightPanel.style.display = 'none';
}

/**
 * 显示文件信息
 */
function displayNotifFile(file) {
    var fileSize = (file.size / 1024).toFixed(2);
    var unit = 'KB';
    if (fileSize > 1024) {
        fileSize = (fileSize / 1024).toFixed(2);
        unit = 'MB';
    }
    
    notifFileDisplay.innerHTML = `
        <div class="file-item">
            <div class="file-icon">
                <i class="fa fa-file-excel-o"></i>
            </div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-size">${fileSize} ${unit}</div>
            </div>
            <button class="remove-file-btn" onclick="removeNotifFile()" title="移除文件">
                <i class="fa fa-times"></i>
            </button>
        </div>
    `;
}

/**
 * 移除文件
 */
function removeNotifFile() {
    selectedNotifFile = null;
    notifFileInput.value = '';
    notifFileDisplay.innerHTML = '';
    notifProcessBtn.disabled = true;
    notifRightPanel.style.display = 'none';
}

/**
 * 拖放文件支持（使用统一的setupDragAndDrop函数）
 */
if (typeof setupDragAndDrop === 'function') {
    setupDragAndDrop(notifUploadArea, handleNotifFileSelect);
}

/**
 * 处理通知单文件
 */
function processNotification() {
    if (!selectedNotifFile) {
        alert('请先选择文件');
        return;
    }
    
    // 二次验证文件
    if (!selectedNotifFile.name || selectedNotifFile.size === 0) {
        alert('文件无效或为空');
        return;
    }
    
    // 重置筛选器
    currentNotifTypeFilter = '';
    
    // 显示加载状态
    notifProcessBtn.disabled = true;
    notifProcessBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 处理中...';
    
    // 读取Excel文件
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            
            // 获取第一个工作表
            var firstSheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[firstSheetName];
            
            // 转换为JSON
            var jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                defval: '', 
                raw: false 
            });
            
            // 处理数据
            var result = processNotificationData(jsonData);
            
            // 显示结果
            displayNotifResult(result);
            
            // 恢复按钮状态
            notifProcessBtn.disabled = false;
            notifProcessBtn.innerHTML = '开始处理';
            
        } catch (error) {
            console.error('处理文件时出错:', error);
            alert('处理文件时出错：' + error.message);
            notifProcessBtn.disabled = false;
            notifProcessBtn.innerHTML = '开始处理';
        }
    };
    
    reader.onerror = function() {
        alert('读取文件失败');
        notifProcessBtn.disabled = false;
        notifProcessBtn.innerHTML = '开始处理';
    };
    
    reader.readAsArrayBuffer(selectedNotifFile);
}

// 全局调试日志
var debugLogs = [];

/**
 * 添加调试日志
 * @param {string} message - 日志消息
 * @param {number} level - 日志级别 (0=重要, 1=一般, 2=详细)
 */
function addDebugLog(message, level) {
    level = level !== undefined ? level : 1; // 默认级别为1
    
    // 只记录不高于当前调试级别的日志
    if (level <= DEBUG_LEVEL) {
        debugLogs.push(message);
        debugLog(message);
    }
}

/**
 * 检查字段是否为类型相关字段
 */
function isTypeRelatedField(fieldName) {
    return TYPE_RELATED_FIELDS.indexOf(fieldName) !== -1;
}

/**
 * 检查字段是否需要跨行取值
 */
function isSpecialField(fieldName) {
    return SPECIAL_FIELDS_FOR_NEXT_ROW.indexOf(fieldName) !== -1;
}

/**
 * 查找字符串中的冒号位置（支持中英文冒号）
 * @param {string} text - 要搜索的文本
 * @returns {object} {index: 冒号位置, char: 冒号字符} 或 {index: -1, char: ''} 如果未找到
 */
function findColonIndex(text) {
    var chineseIndex = text.indexOf('：');
    var englishIndex = text.indexOf(':');
    
    if (chineseIndex !== -1 && (englishIndex === -1 || chineseIndex < englishIndex)) {
        return { index: chineseIndex, char: '：' };
    } else if (englishIndex !== -1) {
        return { index: englishIndex, char: ':' };
    }
    return { index: -1, char: '' };
}

/**
 * 检查文本是否包含冒号
 * @param {string} text - 要检查的文本
 * @returns {boolean}
 */
function hasColon(text) {
    return text.indexOf('：') !== -1 || text.indexOf(':') !== -1;
}

/**
 * 处理通知单数据 - 数据整理和规整
 */
function processNotificationData(data) {
    // 清空调试日志
    debugLogs = [];
    
    // 性能监控
    var startTime = performance.now();
    
    addDebugLog('原始数据行数: ' + data.length);
    
    // 解析和规整数据
    var cleanedData = parseAndCleanNotificationData(data);
    
    addDebugLog('整理后数据行数: ' + cleanedData.length);
    
    // 计算处理时间
    var endTime = performance.now();
    var processingTime = ((endTime - startTime) / 1000).toFixed(2);
    addDebugLog('数据处理耗时: ' + processingTime + ' 秒');
    
    var result = {
        totalCount: cleanedData.length,
        originalCount: data.length,
        data: cleanedData,
        processedAt: new Date().toLocaleString('zh-CN'),
        processingTime: processingTime,
        debugLogs: debugLogs
    };
    
    return result;
}

/**
 * 解析和整理通知单数据
 * 动态提取字段：将单元格中":"前的内容作为列名，":"后的内容作为值
 */
function parseAndCleanNotificationData(rawData) {
    addDebugLog('开始解析数据...');
    addDebugLog('原始数据总行数: ' + rawData.length);
    
    // 输出前几行原始数据供调试
    addDebugLog('=== 原始数据示例（前' + CONFIG.PREVIEW_ROW_COUNT + '行）===');
    for (var i = 0; i < Math.min(CONFIG.PREVIEW_ROW_COUNT, rawData.length); i++) {
        var rowPreview = JSON.stringify(rawData[i]);
        if (rowPreview.length > CONFIG.PREVIEW_MAX_LENGTH) {
            rowPreview = rowPreview.substring(0, CONFIG.PREVIEW_MAX_LENGTH) + '...';
        }
        addDebugLog('第' + (i+1) + '行: ' + rowPreview);
    }
    addDebugLog('========================');
    
    // 第一步：收集所有记录和它们的字段
    var records = [];
    var currentRecord = {};
    var recordStarted = false;
    var currentNotificationType = ''; // 记录当前批次的通知单类型
    var currentBatchDocNumber = ''; // 记录当前批次的文号
    var currentBatchDate = ''; // 记录当前批次的日期
    var pendingFields = {}; // 记录待从下一行获取值的字段 {列索引: 字段名}
    
    for (var i = 0; i < rawData.length; i++) {
        var row = rawData[i];
        var isNewRecord = false;
        var isRecordTitle = false;
        
        // 检查行是否有实际内容
        var hasContent = false;
        var rowPreview = [];
        for (var colKey in row) {
            var cellValue = String(row[colKey] || '').trim();
            if (cellValue && cellValue.length > 0) {
                hasContent = true;
                if (rowPreview.length < CONFIG.PREVIEW_CELL_COUNT) {
                    rowPreview.push(cellValue.substring(0, CONFIG.CELL_MAX_LENGTH));
                }
            }
        }
        
        if (!hasContent) continue;
        
        // 记录当前处理的行
        addDebugLog('--- 处理第' + (i+1) + '行: [' + rowPreview.join(' | ') + (rowPreview.length >= CONFIG.PREVIEW_CELL_COUNT ? ' | ...' : '') + ']');
        
        // 检查每个单元格
        for (var colKey in row) {
            var cellValue = String(row[colKey] || '').trim();
            
            if (!cellValue) continue;
            
            // 检测新记录的开始（包含"军人配置手册"等标题）
            // 注意：排除"通知单序号"、"通知单类型"等字段名
            isRecordTitle = false;
            
            // 首先检查是否是"字段名：值"的模式
            var hasColonPattern = (cellValue.indexOf('：') !== -1 || cellValue.indexOf(':') !== -1);
            
            // 如果包含冒号，很可能是字段，不是标题
            if (!hasColonPattern) {
                // 没有冒号的情况下，检查是否是标题关键词
                if (cellValue.indexOf('军人配置手册') !== -1 || 
                    cellValue.indexOf('手册处理') !== -1 ||
                    cellValue.indexOf('配置手册处理') !== -1 ||
                    cellValue.indexOf('个人手册') !== -1 ||
                    (cellValue.indexOf('通知单') !== -1 && cellValue.length < 20)) {
                    isRecordTitle = true;
                }
            }
            
            if (isRecordTitle) {
                // 保存当前记录（如果有数据）
                if (recordStarted && Object.keys(currentRecord).length > 1) {
                    records.push(currentRecord);
                    var prevType = currentRecord['通知类型'] || '无';
                    addDebugLog('[OK] 【在第' + (i+1) + '行】保存记录#' + records.length + '（检测到新标题），通知类型: "' + prevType + '"');
                    if (currentRecord['姓名']) {
                        addDebugLog('   关键信息: 姓名=' + currentRecord['姓名']);
                    }
                }
                
                // 开始新记录
                currentRecord = {};
                currentRecord['通知类型'] = extractNotificationType(cellValue);
                currentNotificationType = currentRecord['通知类型']; // 记录当前批次类型
                // 新批次开始，清空批次文号和日期（等待新的提取）
                currentBatchDocNumber = '';
                currentBatchDate = '';
                recordStarted = true;
                isNewRecord = true;
                addDebugLog('--> 检测到新记录标题: "' + cellValue.substring(0, 40) + '"');
                addDebugLog('     设置批次类型为: "' + currentNotificationType + '"');
                addDebugLog('     重置批次文号和日期（等待新批次数据）');
                break;
            }
        }
        
        // 如果还没有开始记录，但已经有数据行包含冒号，就自动开始第一条记录
        if (!recordStarted && hasContent) {
            for (var colKey in row) {
                var cellValue = String(row[colKey] || '').trim();
                if (cellValue && (cellValue.indexOf('：') !== -1 || cellValue.indexOf(':') !== -1)) {
                    recordStarted = true;
                    currentRecord = {};
                    
                    // 检查是否是"通知单类型"开头
                    if (cellValue.indexOf('通知单类型') !== -1) {
                        currentRecord['通知类型'] = '待提取'; // 临时标记，等待提取实际值
                        currentNotificationType = '待提取'; // 同时设置批次类型
                        addDebugLog('[启动] 自动开始第一条记录（检测到通知单类型字段）');
                    } else {
                        currentRecord['通知类型'] = '通知单';
                        currentNotificationType = '通知单'; // 同时设置批次类型
                        addDebugLog('[启动] 自动开始第一条记录（未找到明确标题）');
                    }
                    break;
                }
            }
        }
        
        // 提取字段（即使是新记录的行，也可能包含字段）
        if (recordStarted) {
            // 获取所有列的值作为数组（保留列索引映射）
            var cellValues = [];
            var colKeys = [];
            for (var colKey in row) {
                colKeys.push(colKey);
                cellValues.push(String(row[colKey] || '').trim());
            }
            
            // 首先检查是否有待填充的字段（从上一行）
            if (Object.keys(pendingFields).length > 0) {
                addDebugLog('  [SEARCH] 检查待填充字段: ' + Object.keys(pendingFields).length + ' 个');
                addDebugLog('     当前行的所有单元格: ' + JSON.stringify(cellValues));
                
                for (var pendingColIdx in pendingFields) {
                    var fieldName = pendingFields[pendingColIdx];
                    var colIdx = parseInt(pendingColIdx);
                    
                    addDebugLog('     尝试填充"' + fieldName + '"，列索引:' + colIdx + '，该列值:"' + (cellValues[colIdx] || '空') + '"');
                    
                    if (colIdx < cellValues.length) {
                        var cellValue = cellValues[colIdx];
                        // 如果单元格不包含冒号（纯值），就认为是上一行字段的值
                        if (cellValue && cellValue.indexOf('：') === -1 && cellValue.indexOf(':') === -1) {
                            currentRecord[fieldName] = cellValue.replace(/_+/g, '').trim();
                            addDebugLog('     [完成] 从下一行填充字段"' + fieldName + '" = "' + currentRecord[fieldName] + '"');
                            
                            // 特别处理通知单类型
                            if (fieldName === '通知单类型' && currentRecord[fieldName]) {
                                currentNotificationType = currentRecord[fieldName];
                                currentRecord['通知类型'] = currentRecord[fieldName];
                                addDebugLog('     [关键] 从下一行提取通知单类型并更新批次类型: ' + currentNotificationType);
                            }
                            // 特别处理文号
                            else if (fieldName === '文号' && currentRecord[fieldName]) {
                                currentBatchDocNumber = currentRecord[fieldName];
                                addDebugLog('     [关键] 从下一行提取文号并更新批次文号: ' + currentBatchDocNumber);
                            }
                            // 特别处理日期
                            else if (fieldName === '日期' && currentRecord[fieldName]) {
                                currentBatchDate = currentRecord[fieldName];
                                addDebugLog('     [关键] 从下一行提取日期并更新批次日期: ' + currentBatchDate);
                            }
                        } else {
                            addDebugLog('     [跳过] 该列包含冒号或为空，跳过: "' + cellValue + '"');
                        }
                    } else {
                        addDebugLog('     [错误] 列索引超出范围');
                    }
                }
                // 清空待填充字段
                pendingFields = {};
            }
            
            // 检查是否包含"通知单序号"，这表示新的人员记录开始
            var hasNotificationNumber = false;
            var notificationNumberCell = '';
            for (var ci = 0; ci < cellValues.length; ci++) {
                if (cellValues[ci] && cellValues[ci].indexOf('通知单序号') !== -1) {
                    hasNotificationNumber = true;
                    notificationNumberCell = cellValues[ci];
                    break;
                }
            }
            
            // 如果发现"通知单序号"且当前记录已有数据，保存并开始新记录
            // 关键判断：只有当前记录已经包含"通知单序号"字段时，再次遇到才说明是新人
            if (hasNotificationNumber && currentRecord['通知单序号'] && !isNewRecord) {
                addDebugLog('  [检测] 检测到新的"通知单序号"字段: "' + notificationNumberCell + '"');
                addDebugLog('     当前记录已有通知单序号: ' + currentRecord['通知单序号']);
                addDebugLog('     这是新的一个人，准备保存当前记录并开始新记录');
                
                records.push(currentRecord);
                var savedType = currentRecord['通知类型'] || '无';
                addDebugLog('[完成] 【在第' + (i+1) + '行】保存记录#' + records.length + '（检测到新的通知单序号），通知类型: "' + savedType + '"');
                addDebugLog('   记录字段: ' + Object.keys(currentRecord).slice(0, 15).join(', ') + (Object.keys(currentRecord).length > 15 ? '...' : ''));
                
                // 显示记录的一些关键字段
                if (currentRecord['姓名']) {
                    addDebugLog('   关键信息: 姓名=' + currentRecord['姓名'] + ', 通知单序号=' + currentRecord['通知单序号']);
                }
                
                // 开始新记录，继承批次通知单类型、文号和日期
                currentRecord = {};
                if (currentNotificationType) {
                    currentRecord['通知类型'] = currentNotificationType;
                    addDebugLog('  [继承] 新记录继承批次类型: ' + currentNotificationType + '（当前批次类型有效）');
                } else {
                    addDebugLog('  [警告] 新记录无批次类型可继承（当前批次类型为空）');
                }
                if (currentBatchDocNumber) {
                    currentRecord['文号'] = currentBatchDocNumber;
                    addDebugLog('  [继承] 新记录继承批次文号: ' + currentBatchDocNumber);
                }
                if (currentBatchDate) {
                    currentRecord['日期'] = currentBatchDate;
                    addDebugLog('  [继承] 新记录继承批次日期: ' + currentBatchDate);
                }
            } else if (hasNotificationNumber && !currentRecord['通知单序号']) {
                addDebugLog('  [信息] 首次检测到"通知单序号"，这是第一个人的信息开始，继续添加到当前记录');
            } else if (hasNotificationNumber) {
                addDebugLog('  [信息] 检测到"通知单序号"但不满足分割条件（isNewRecord:' + isNewRecord + '）');
            }
            
            // 记录本行中发现的特殊字段及其列位置
            var specialFieldsInRow = {}; // {列索引: 字段名}
            var specialFields = ['通知单类型', '文号', '日期'];
            
            // 遍历每个单元格
            for (var cellIndex = 0; cellIndex < cellValues.length; cellIndex++) {
                var cellValue = cellValues[cellIndex];
                
                if (!cellValue || cellValue.length < 2) continue;
                
                // 跳过被识别为标题的那个单元格
                if (isNewRecord && cellIndex === 0 && isRecordTitle) {
                    continue;
                }
                
                // 检查是否包含特殊字段名（只有字段名，冒号后没有值或只有空格）
                for (var sfi = 0; sfi < specialFields.length; sfi++) {
                    var sf = specialFields[sfi];
                    if (cellValue.indexOf(sf) !== -1 && 
                        (cellValue.indexOf('：') !== -1 || cellValue.indexOf(':') !== -1)) {
                        var colonIdx = cellValue.indexOf('：') !== -1 ? cellValue.indexOf('：') : cellValue.indexOf(':');
                        var afterColon = cellValue.substring(colonIdx + 1).trim().replace(/_+/g, '').trim();
                        if (!afterColon || afterColon.length === 0) {
                            specialFieldsInRow[cellIndex] = sf;
                            addDebugLog('  [记录] 发现特殊字段"' + sf + '"在列' + cellIndex + '（值为空，待从下一行获取）');
                        }
                    }
                }
                
                // 尝试从单元格中提取所有"字段：值"对
                // 支持一个单元格中有多个字段的情况
                var beforeFieldCount = Object.keys(currentRecord).length;
                extractFieldsFromCell(cellValue, cellValues, cellIndex, currentRecord);
                var afterFieldCount = Object.keys(currentRecord).length;
                
                if (afterFieldCount > beforeFieldCount) {
                    var newFields = [];
                    for (var fk in currentRecord) {
                        newFields.push(fk);
                    }
                    addDebugLog('  [记录] 从单元格"' + cellValue.substring(0, 30) + '"提取了 ' + (afterFieldCount - beforeFieldCount) + ' 个字段');
                }
            }
            
            // 检查本行发现的特殊字段是否已被提取到值，如果没有，记录到pendingFields
            for (var sfColIdx in specialFieldsInRow) {
                var sfName = specialFieldsInRow[sfColIdx];
                if (!currentRecord[sfName]) {
                    pendingFields[sfColIdx] = sfName;
                    addDebugLog('  [*] 字段"' + sfName + '"标记为待填充（列' + sfColIdx + '）');
                }
            }
            
            // 检查是否更新了通知单类型，立即更新批次类型
            // 优先级：通知单类型 > 类型
            // 注意："新增类型"是子字段，永远不覆盖主类型
            var newBatchType = currentRecord['通知单类型'] || currentRecord['类型'];
            
            addDebugLog('  [统计] 批次类型检查: 当前批次="' + currentNotificationType + '", 新发现="' + (newBatchType || '无') + '"');
            
            // 记录"新增类型"字段但不更新批次类型（仅用于日志）
            if (currentRecord['新增类型']) {
                addDebugLog('  ℹ 检测到"新增类型"字段: ' + currentRecord['新增类型'] + '（这是细节字段，不影响主通知类型）');
            }
            
            // 如果找到新的批次类型，且不是无意义值，则更新
            if (newBatchType && 
                (newBatchType !== currentNotificationType || currentNotificationType === '待提取') &&
                newBatchType !== '通知单' && 
                newBatchType !== '其他通知' &&
                newBatchType !== '待提取') {
                currentNotificationType = newBatchType;
                currentRecord['通知类型'] = newBatchType; // 同时更新当前记录
                addDebugLog('  [更新] 更新批次通知单类型为: "' + currentNotificationType + '" (来自当前记录的"通知单类型/类型"字段)');
            } else if (currentNotificationType && currentNotificationType !== '待提取' && !currentRecord['通知类型']) {
                // 如果批次类型有效但当前记录没有类型，继承批次类型
                currentRecord['通知类型'] = currentNotificationType;
                addDebugLog('  [继承] 当前记录继承批次类型: "' + currentNotificationType + '"');
            } else if (!currentRecord['通知类型']) {
                addDebugLog('  [警告] 当前记录没有类型，且无有效批次类型可继承');
            }
            
            // 更新批次文号（如果发现新的文号）
            if (currentRecord['文号'] && !currentBatchDocNumber) {
                currentBatchDocNumber = currentRecord['文号'];
                addDebugLog('  [更新] 更新批次文号为: "' + currentBatchDocNumber + '"');
            } else if (currentBatchDocNumber && !currentRecord['文号']) {
                currentRecord['文号'] = currentBatchDocNumber;
                addDebugLog('  [继承] 当前记录继承批次文号: "' + currentBatchDocNumber + '"');
            }
            
            // 更新批次日期（如果发现新的日期）
            if (currentRecord['日期'] && !currentBatchDate) {
                currentBatchDate = currentRecord['日期'];
                addDebugLog('  [更新] 更新批次日期为: "' + currentBatchDate + '"');
            } else if (currentBatchDate && !currentRecord['日期']) {
                currentRecord['日期'] = currentBatchDate;
                addDebugLog('  [继承] 当前记录继承批次日期: "' + currentBatchDate + '"');
            }
        }
    }
    
    // 保存最后一条记录
    if (recordStarted && Object.keys(currentRecord).length > 0) {
        records.push(currentRecord);
        var lastType = currentRecord['通知类型'] || '无';
        addDebugLog('[OK] 保存最后一条记录#' + records.length + '，字段数: ' + Object.keys(currentRecord).length + '，通知类型: "' + lastType + '"');
        addDebugLog('   最后记录字段: ' + Object.keys(currentRecord).slice(0, 10).join(', ') + (Object.keys(currentRecord).length > 10 ? '...' : ''));
    }
    
    addDebugLog('========================');
    
    // 后处理：从多个可能的字段提取通知类型
    addDebugLog('[列表] 开始后处理通知类型...', 0);
    for (var i = 0; i < records.length; i++) {
        var notificationType = '';
        
        // 记录当前的通知类型状态
        var currentType = records[i]['通知类型'] || '';
        addDebugLog('  记录' + (i+1) + ' 当前通知类型: "' + currentType + '"', 1);
        
        // 如果记录已经有有效的通知类型（从批次继承的），检查是否需要更新
        var hasValidType = currentType && 
                           currentType !== '通知单' && 
                           currentType !== '其他通知' &&
                           currentType !== '待提取';
        
        // 字段优先级分组
        // 高优先级字段：可以覆盖任何类型（主通知类型字段）
        var highPriorityFields = ['通知单类型', '类型'];
        // 低优先级字段：只在完全没有类型时使用（细节描述字段）
        // 注意："新增类型"是细节字段，不作为主类型使用
        var lowPriorityFields = ['调动事由', '变动原因', '事由', '原因'];
        
        // 先检查高优先级字段（总是尝试提取）
        for (var j = 0; j < highPriorityFields.length; j++) {
            var fieldName = highPriorityFields[j];
            if (records[i][fieldName] && records[i][fieldName].trim().length > 0) {
                var value = records[i][fieldName].trim();
                addDebugLog('    检查高优先级字段"' + fieldName + '"，值: "' + value + '"', 2);
                
                if (value !== '通知单' && value !== '其他通知' && value !== '通知' &&
                    value !== '类型' && value !== '待提取' && value.length > 0) {
                    notificationType = value;
                    addDebugLog('    [OK] 从高优先级字段"' + fieldName + '"提取到类型: ' + notificationType, 1);
                    break;
                }
            }
        }
        
        // 如果还是没有找到，且没有有效批次类型，检查低优先级字段（细节描述）
        if (!notificationType && !hasValidType) {
            for (var j = 0; j < lowPriorityFields.length; j++) {
                var fieldName = lowPriorityFields[j];
                if (records[i][fieldName] && records[i][fieldName].trim().length > 0) {
                    var value = records[i][fieldName].trim();
                    addDebugLog('    检查低优先级字段"' + fieldName + '"，值: "' + value + '"', 2);
                    
                    if (value.length > 0) {
                        notificationType = value;
                        addDebugLog('    [OK] 从低优先级字段"' + fieldName + '"提取到类型: ' + notificationType, 1);
                        break;
                    }
                }
            }
        }
        
        // 更新通知类型的优先级：
        // 1. 如果找到了新的有效类型，使用新类型
        // 2. 如果没找到但已有继承的有效批次类型，保持批次类型
        // 3. 都没有，设置为"未分类"
        if (notificationType) {
            records[i]['通知类型'] = notificationType;
            addDebugLog('  [OK] 记录' + (i+1) + ' 最终类型: ' + notificationType + ' (从字段提取)', 1);
        } else if (hasValidType) {
            addDebugLog('  [OK] 记录' + (i+1) + ' 最终类型: ' + currentType + ' (保持批次继承)', 1);
        } else {
            records[i]['通知类型'] = '未分类';
            addDebugLog('  [警告] 记录' + (i+1) + ' 未找到明确的通知类型，设置为"未分类"', 0);
            addDebugLog('    【问题分析】该记录包含的所有字段:', 1);
            var allFields = [];
            for (var fieldKey in records[i]) {
                var fieldValue = records[i][fieldKey];
                if (fieldValue && String(fieldValue).length > 0) {
                    allFields.push(fieldKey + '=' + String(fieldValue).substring(0, 20));
                }
            }
            addDebugLog('    ' + allFields.join(', '), 1);
            
            // 检查可能的原因
            if (!currentType || currentType === '' || currentType === '待提取') {
                addDebugLog('    【原因1】当前类型为空或"待提取"，说明没有从批次继承到有效类型', 1);
            }
            if (!records[i]['通知单类型'] && !records[i]['类型'] && !records[i]['新增类型']) {
                addDebugLog('    【原因2】记录中没有"通知单类型"、"类型"或"新增类型"字段', 1);
            }
        }
    }
    
    addDebugLog('========================');
    addDebugLog('✔ 解析完成! 共找到 ' + records.length + ' 条记录');
    addDebugLog('');
    
    // 统计通知类型分布
    var typeCount = {};
    for (var i = 0; i < records.length; i++) {
        var type = records[i]['通知类型'] || '无';
        typeCount[type] = (typeCount[type] || 0) + 1;
    }
    addDebugLog('[统计] 通知类型统计:');
    for (var type in typeCount) {
        addDebugLog('  - ' + type + ': ' + typeCount[type] + ' 条');
    }
    addDebugLog('');
    
    // 输出每条记录的详细信息
    addDebugLog('[列表] 记录详情（前3条）:');
    for (var i = 0; i < Math.min(3, records.length); i++) {
        var fields = Object.keys(records[i]).filter(function(k) { 
            return k !== '通知类型' && k !== '序号'; 
        });
        addDebugLog('  【记录' + (i+1) + '】');
        addDebugLog('    通知类型: ' + (records[i]['通知类型'] || '无'));
        addDebugLog('    包含字段: ' + fields.join(', '));
    }
    if (records.length > 3) {
        addDebugLog('  ... 还有 ' + (records.length - 3) + ' 条记录');
    }
    
    // 第二步：收集所有可能的字段名
    var allFields = new Set();
    allFields.add('序号');
    allFields.add('通知类型');
    
    // 排除的字段（这些字段已经映射到"通知类型"了，不需要单独显示）
    // 注意："新增类型"是细节字段，应该保留显示
    var excludeFields = ['通知单类型', '类型'];
    
    for (var i = 0; i < records.length; i++) {
        for (var fieldName in records[i]) {
            // 排除序号和已映射的字段
            if (fieldName !== '序号' && excludeFields.indexOf(fieldName) === -1) {
                allFields.add(fieldName);
            }
        }
    }
    
    // 转换为数组并排序（通知类型放在前面）
    var fieldArray = Array.from(allFields);
    var sortedFields = ['序号', '通知类型'];
    
    // 优先显示常见字段
    var priorityFields = ['通知单序号', '姓名', '性别', '公民身份号码', '身份号码', 
                          '出生时间', '出生日期', '人员类别', '新增类型', '调动事由', '变动原因', '婚姻状况', '民族',
                          '单位', '部门', '职务', '军衔', '文号', '签批人', '申请人', '日期', '命令变更起算时间'];
    
    for (var i = 0; i < priorityFields.length; i++) {
        if (fieldArray.indexOf(priorityFields[i]) !== -1) {
            sortedFields.push(priorityFields[i]);
        }
    }
    
    // 添加其他字段
    for (var i = 0; i < fieldArray.length; i++) {
        if (sortedFields.indexOf(fieldArray[i]) === -1) {
            sortedFields.push(fieldArray[i]);
        }
    }
    
    debugLog('所有字段:', sortedFields);
    
    // 第三步：规范化所有记录，确保每条记录都有所有字段
    var normalizedRecords = [];
    for (var i = 0; i < records.length; i++) {
        var normalizedRecord = {};
        
        // 添加序号
        normalizedRecord['序号'] = i + 1;
        
        // 添加所有字段，如果原记录中没有则为空
        for (var j = 0; j < sortedFields.length; j++) {
            var fieldName = sortedFields[j];
            if (fieldName === '序号') continue;
            normalizedRecord[fieldName] = records[i][fieldName] || '';
        }
        
        normalizedRecords.push(normalizedRecord);
    }
    
    debugLog('规范化完成，记录数:', normalizedRecords.length);
    
    return normalizedRecords;
}

/**
 * 从单元格中提取字段
 * 支持一个单元格包含多个"字段：值"对
 */
function extractFieldsFromCell(cellValue, allCellValues, cellIndex, targetRecord) {
    // 使用全局定义的特殊字段列表
    var specialFields = SPECIAL_FIELDS_FOR_NEXT_ROW;
    
    // 特殊处理：如果单元格内有换行符，先按换行分割
    // 这样可以处理"字段：\n值"的情况
    if (cellValue.indexOf('\n') !== -1 || cellValue.indexOf('\r') !== -1) {
        var lines = cellValue.split(/[\r\n]+/);
        for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            var line = lines[lineIdx].trim();
            if (!line) continue;
            
            // 检查这一行是否有冒号
            var hasColon = line.indexOf('：') !== -1 || line.indexOf(':') !== -1;
            
            if (hasColon) {
                // 这行有字段定义，正常处理
                var colonPos = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
                var fieldName = line.substring(0, colonPos).trim();
                var fieldValue = line.substring(colonPos + 1).trim();
                
                // 只有特殊字段才从下一行获取值
                if (fieldName && !fieldValue && specialFields.indexOf(fieldName) !== -1 && lineIdx + 1 < lines.length) {
                    fieldValue = lines[lineIdx + 1].trim().replace(/_+/g, '');
                    addDebugLog('  [提取] 字段"' + fieldName + '"的值从下一行获取: ' + fieldValue);
                }
                
                if (fieldName && fieldValue) {
                    if (!targetRecord[fieldName] || fieldValue.length > targetRecord[fieldName].length) {
                        targetRecord[fieldName] = fieldValue;
                        
                        // 特殊处理：如果是通知单类型相关字段，立即标记
                        if (isTypeRelatedField(fieldName)) {
                            addDebugLog('  [重要] ' + fieldName + ' = ' + fieldValue + ' (来自多行单元格)', 1);
                        } else {
                            addDebugLog('  [OK] ' + fieldName + ' = ' + fieldValue + ' (来自多行单元格)', 2);
                        }
                    }
                }
            }
        }
    }
    
    // 方法1：按空格或换行符分割，找到所有可能的"字段：值"对
    var segments = cellValue.split(/[\s\n\r]+/);
    
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i].trim();
        if (!segment) continue;
        
        // 查找冒号
        var colonIndex = -1;
        var colonChar = '';
        
        if (segment.indexOf('：') !== -1) {
            colonIndex = segment.indexOf('：');
            colonChar = '：';
        } else if (segment.indexOf(':') !== -1) {
            colonIndex = segment.indexOf(':');
            colonChar = ':';
        }
        
        if (colonIndex !== -1) {
            var fieldName = segment.substring(0, colonIndex).trim();
            var fieldValue = segment.substring(colonIndex + 1).trim();
            
            // 整理字段值
            fieldValue = fieldValue.replace(/_+/g, '').trim();
            
            // 只有特殊字段才尝试从下一个segment或下一个单元格获取
            if (!fieldValue && specialFields.indexOf(fieldName) !== -1) {
                // 尝试下一个segment
                if (i + 1 < segments.length) {
                    fieldValue = segments[i + 1].trim().replace(/_+/g, '').trim();
                    if (fieldValue && fieldValue.indexOf('：') === -1 && fieldValue.indexOf(':') === -1) {
                        i++; // 跳过下一个segment
                    } else {
                        fieldValue = '';
                    }
                }
                // 如果还是空，尝试下一个单元格
                if (!fieldValue && cellIndex + 1 < allCellValues.length) {
                    var nextCell = allCellValues[cellIndex + 1];
                    if (nextCell && nextCell.indexOf('：') === -1 && nextCell.indexOf(':') === -1) {
                        fieldValue = nextCell.replace(/_+/g, '').trim();
                    }
                }
            }
            
            // 保存字段
            if (fieldName && fieldValue) {
                if (!targetRecord[fieldName] || fieldValue.length > targetRecord[fieldName].length) {
                    targetRecord[fieldName] = fieldValue;
                    
                    // 特殊标记通知单类型字段
                    if (isTypeRelatedField(fieldName)) {
                        addDebugLog('  [重要] ' + fieldName + ' = ' + fieldValue, 1);
                    } else {
                        addDebugLog('  [OK] ' + fieldName + ' = ' + fieldValue, 2);
                    }
                }
            } else if (fieldName && !fieldValue) {
                // 记录找到字段名但没找到值的情况
                if (isTypeRelatedField(fieldName)) {
                    addDebugLog('  [重要警告] 找到字段"' + fieldName + '"但值为空（可能在下一行/单元格）', 1);
                } else {
                    addDebugLog('  [警告] 找到字段"' + fieldName + '"但值为空（可能在下一行/单元格）', 2);
                }
            }
        }
    }
    
    // 方法2：如果整个单元格就是一个"字段：值"格式
    var colonIdx = -1;
    if (cellValue.indexOf('：') !== -1) {
        colonIdx = cellValue.indexOf('：');
    } else if (cellValue.indexOf(':') !== -1) {
        colonIdx = cellValue.indexOf(':');
    }
    
    if (colonIdx !== -1) {
        var wholeName = cellValue.substring(0, colonIdx).trim();
        var wholeValue = cellValue.substring(colonIdx + 1).trim();
        
        // 只处理简单的字段名（不包含空格和换行的）
        if (wholeName && wholeName.indexOf(' ') === -1 && wholeName.indexOf('\n') === -1) {
            wholeValue = wholeValue.replace(/_+/g, '').trim();
            wholeValue = wholeValue.replace(/\n/g, '').trim(); // 移除换行符
            
            // 只有特殊字段才尝试从下一个单元格获取值
            if (!wholeValue && specialFields.indexOf(wholeName) !== -1) {
                // 方式1：尝试下一个单元格（同一行）
                if (cellIndex + 1 < allCellValues.length) {
                    var nextCellValue = allCellValues[cellIndex + 1];
                    if (nextCellValue && nextCellValue.indexOf('：') === -1 && nextCellValue.indexOf(':') === -1) {
                        wholeValue = nextCellValue.replace(/_+/g, '').trim();
                        addDebugLog('  [提取] 字段"' + wholeName + '"的值从下一个单元格获取: ' + wholeValue);
                    }
                }
                
                // 方式2：如果还是空，记录警告
                if (!wholeValue) {
                    addDebugLog('  [警告] 字段"' + wholeName + '"找到但值为空（下一单元格: "' + (allCellValues[cellIndex + 1] || '无') + '"）');
                }
            }
            
            // 保存有效的字段值
            if (wholeValue) {
                if (!targetRecord[wholeName] || wholeValue.length > targetRecord[wholeName].length) {
                    targetRecord[wholeName] = wholeValue;
                    // 避免重复输出
                    var lastLog = debugLogs[debugLogs.length - 1] || '';
                    if (lastLog.indexOf(wholeName + ' = ' + wholeValue) === -1) {
                        // 特殊标记通知单类型字段
                        if (isTypeRelatedField(wholeName)) {
                            addDebugLog('  [重要] ' + wholeName + ' = ' + wholeValue, 1);
                        } else {
                            addDebugLog('  [OK] ' + wholeName + ' = ' + wholeValue, 2);
                        }
                    }
                }
            }
        }
    }
}

/**
 * 提取通知单类型
 */
function extractNotificationType(text) {
    if (text.indexOf('配置手册') !== -1) return '军人配置手册处理';
    if (text.indexOf('调整') !== -1) return '调整通知';
    if (text.indexOf('变更') !== -1) return '变更通知';
    if (text.indexOf('注销') !== -1) return '注销通知';
    if (text.indexOf('新增') !== -1) return '新增通知';
    if (text.indexOf('招录') !== -1) return '招录通知';
    if (text.indexOf('调动') !== -1) return '调动通知';
    if (text.indexOf('退役') !== -1) return '退役通知';
    if (text.indexOf('晋升') !== -1) return '晋升通知';
    
    // 如果只是包含"通知单"但没有具体类型，返回"待提取"
    // 这样后续会从"通知单类型"字段提取真实值
    if (text.indexOf('通知单') !== -1) {
        addDebugLog('  ℹ 标题"' + text.substring(0, 30) + '"未包含明确类型，返回"待提取"');
        return '待提取';
    }
    
    return '其他通知';
}


/**
 * 显示处理结果
 */
function displayNotifResult(result) {
    notifProcessResult = result;
    
    // 显示右侧结果面板
    notifRightPanel.style.display = 'flex';
    
    if (!result.data || result.data.length === 0) {
        notifResultContainer.innerHTML = `
            <div class="empty-results">
                <i class="fa fa-inbox"></i>
                <p>未能解析到有效数据</p>
                <p style="font-size: 13px; color: #999;">请确保Excel文件中包含带冒号(:)的字段格式</p>
            </div>
        `;
        return;
    }
    
    // 统计各类型数量
    var typeStats = {};
    for (var i = 0; i < result.data.length; i++) {
        var type = result.data[i]['通知类型'] || '未分类';
        typeStats[type] = (typeStats[type] || 0) + 1;
    }
    
    // 生成类型统计HTML（添加"全部"按钮）
    var typeStatsHTML = '';
    var allActiveClass = !currentNotifTypeFilter ? 'active' : '';
    typeStatsHTML += `<div class="stat-item ${allActiveClass}" onclick="filterNotifByType('')">
        <span class="stat-label">全部:</span> 
        <span class="stat-value">${result.data.length}条</span>
    </div>`;
    
    for (var type in typeStats) {
        var activeClass = (currentNotifTypeFilter === type) ? 'active' : '';
        // 使用data属性避免XSS风险
        typeStatsHTML += `<div class="stat-item ${activeClass}" data-type="${escapeHtml(type)}" onclick="filterNotifByType(this.getAttribute('data-type'))">
            <span class="stat-label">${escapeHtml(type)}:</span> 
            <span class="stat-value">${typeStats[type]}条</span>
        </div>`;
    }
    
    // 统计字段数量
    var fieldCount = Object.keys(result.data[0] || {}).length;
    
    // 筛选数据
    var filteredData = currentNotifTypeFilter ? 
        result.data.filter(function(row) {
            return row['通知类型'] === currentNotifTypeFilter;
        }) : result.data;
    
    var filterInfo = currentNotifTypeFilter ? 
        `<span style="color: #667eea; font-weight: 500;">（当前筛选：${escapeHtml(currentNotifTypeFilter)}）</span>` : '';
    
    // 生成结果HTML
    var resultHTML = `
        <div style="padding: 20px;">
            <!-- 统计卡片 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">整理完成</div>
                            <div style="font-size: 32px; font-weight: bold;">${result.totalCount}</div>
                            <div style="font-size: 12px; opacity: 0.8;">条记录</div>
                        </div>
                        <i class="fa fa-check-circle" style="font-size: 48px; opacity: 0.3;"></i>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">提取字段</div>
                            <div style="font-size: 32px; font-weight: bold;">${fieldCount}</div>
                            <div style="font-size: 12px; opacity: 0.8;">个字段</div>
                        </div>
                        <i class="fa fa-columns" style="font-size: 48px; opacity: 0.3;"></i>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">原始数据</div>
                            <div style="font-size: 32px; font-weight: bold;">${result.originalCount}</div>
                            <div style="font-size: 12px; opacity: 0.8;">行</div>
                        </div>
                        <i class="fa fa-file-text-o" style="font-size: 48px; opacity: 0.3;"></i>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 15px rgba(67, 233, 123, 0.3);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">处理时间</div>
                            <div style="font-size: 16px; font-weight: bold; margin-top: 8px;">${result.processedAt}</div>
                            <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">耗时: ${result.processingTime}秒</div>
                        </div>
                        <i class="fa fa-clock-o" style="font-size: 48px; opacity: 0.3;"></i>
                    </div>
                </div>
            </div>
            
            <!-- 分类统计 -->
            <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #2c3e50; font-weight: 600;">
                    <i class="fa fa-pie-chart" style="color: #667eea;"></i> 数据分类统计
                </h3>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                    ${typeStatsHTML}
                </div>
            </div>
            
            <!-- 操作按钮 -->
            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                <button class="action-btn primary" onclick="exportNotifResult(false)" style="padding: 12px 24px; font-size: 15px; flex: 1; min-width: 200px;">
                    <i class="fa fa-download"></i> 导出全部数据
                </button>
                ${currentNotifTypeFilter ? 
                    `<button class="action-btn" onclick="exportNotifResult(true)" style="padding: 12px 24px; font-size: 15px; flex: 1; min-width: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
                        <i class="fa fa-filter"></i> 导出筛选数据（${escapeHtml(currentNotifTypeFilter)}）
                    </button>` : ''}
            </div>
            
            ${currentNotifTypeFilter ? 
                `<div style="margin-bottom: 20px; padding: 12px 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px; font-size: 14px; color: white;">
                    <i class="fa fa-filter"></i> 
                    <strong>当前筛选：</strong>${escapeHtml(currentNotifTypeFilter)} （${filteredData.length} 条记录）
                </div>` : ''}
            
            <!-- 调试提示 -->
            <div style="margin-bottom: 20px; padding: 12px 15px; background: #e8f4f8; border-left: 4px solid #17a2b8; border-radius: 6px; font-size: 13px; color: #0c5460;">
                <i class="fa fa-info-circle"></i> 
                <strong>提示：</strong>详细的解析日志已输出到浏览器控制台。按 <kbd style="padding: 2px 6px; background: white; border: 1px solid #ccc; border-radius: 3px;">F12</kbd> 打开控制台查看完整信息。
            </div>
            
            <!-- 数据表格 -->
            <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="padding: 20px; border-bottom: 1px solid #e9ecef;">
                    <h3 style="margin: 0; font-size: 16px; color: #2c3e50; font-weight: 600;">
                        <i class="fa fa-table" style="color: #667eea;"></i> 整理后的数据预览
                        <span style="color: #999; font-size: 14px; font-weight: normal; margin-left: 10px;">
                            共 ${fieldCount} 个字段，${filteredData.length} 条记录 ${filterInfo}
                        </span>
                    </h3>
                </div>
                <div style="overflow-x: auto; max-height: 600px; overflow-y: auto;">
                    <table class="result-table" style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 10;">
                            <tr>
                                ${Object.keys(result.data[0]).map(key => 
                                    `<th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #2c3e50; border-bottom: 2px solid #667eea; white-space: nowrap; background: #f8f9fa;" title="${escapeHtml(key)}">${escapeHtml(key)}</th>`
                                ).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredData.length === 0 ? 
                                `<tr><td colspan="${fieldCount}" style="padding: 40px; text-align: center; color: #999;">
                                    <i class="fa fa-inbox" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                                    没有找到匹配的数据
                                </td></tr>` :
                                filteredData.slice(0, 100).map((row, index) => {
                                    var cells = Object.keys(result.data[0]).map(key => {
                                        var value = row[key] || '';
                                        var displayValue = escapeHtml(String(value));
                                        return `<td style="padding: 10px 15px; border-bottom: 1px solid #e9ecef; white-space: nowrap; max-width: 300px; overflow: hidden; text-overflow: ellipsis;" title="${displayValue}">${displayValue}</td>`;
                                    }).join('');
                                    var bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                                    return `<tr style="background: ${bgColor}; transition: background 0.2s;" onmouseover="this.style.background='#e8f4f8'" onmouseout="this.style.background='${bgColor}'">${cells}</tr>`;
                                }).join('')
                            }
                        </tbody>
                    </table>
                </div>
                ${filteredData.length > 100 ? 
                    `<div style="padding: 15px; background: #fff3cd; color: #856404; text-align: center; font-size: 14px; border-top: 1px solid #e9ecef;">
                        <i class="fa fa-info-circle"></i> 
                        <strong>提示：</strong>仅显示前100条记录（共${filteredData.length}条），完整数据请导出Excel查看
                    </div>` 
                    : ''}
            </div>
        </div>
    `;
    
    notifResultContainer.innerHTML = resultHTML;
}

/**
 * 按通知类型筛选数据
 */
function filterNotifByType(type) {
    currentNotifTypeFilter = type;
    if (notifProcessResult) {
        displayNotifResult(notifProcessResult);
    }
}

/**
 * HTML转义函数，防止XSS
 * 已移至 DataCheckUtils，统一引用
 */
// 为保持向后兼容，提供别名（同时校验escapeHtml方法确实存在，避免绑定到undefined）
var escapeHtml = (window.DataCheckUtils && typeof window.DataCheckUtils.escapeHtml === 'function') ? window.DataCheckUtils.escapeHtml : function(text) {
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
 * 隐藏结果面板
 */
function hideNotifResults() {
    notifRightPanel.style.display = 'none';
}

/**
 * 导出处理结果
 * @param {boolean} exportFiltered - 是否导出筛选后的数据
 */
function exportNotifResult(exportFiltered) {
    if (!notifProcessResult) {
        alert('没有可导出的结果');
        return;
    }
    
    // 验证数据有效性
    if (!notifProcessResult.data || !Array.isArray(notifProcessResult.data)) {
        alert('数据格式无效');
        return;
    }
    
    try {
        // 确定要导出的数据
        var dataToExport;
        var sheetName;
        var filenameSuffix = '';
        
        if (exportFiltered && currentNotifTypeFilter) {
            // 导出筛选后的数据
            dataToExport = notifProcessResult.data.filter(function(row) {
                return row['通知类型'] === currentNotifTypeFilter;
            });
            sheetName = currentNotifTypeFilter.substring(0, 31); // Excel工作表名最多31字符
            filenameSuffix = '_' + currentNotifTypeFilter;
        } else {
            // 导出全部数据
            dataToExport = notifProcessResult.data;
            sheetName = "处理结果";
        }
        
        if (dataToExport.length === 0) {
            alert('没有数据可导出');
            return;
        }
        
        // 创建工作簿
        var wb = XLSX.utils.book_new();
        
        // 将数据转换为工作表
        var ws = XLSX.utils.json_to_sheet(dataToExport);
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        // 生成文件名
        var fileName = '通知单处理结果' + filenameSuffix + '_' + 
                      new Date().toISOString().slice(0,10).replace(/-/g, '') + 
                      '.xlsx';
        
        // 导出文件
        XLSX.writeFile(wb, fileName);
        
        // 显示成功提示
        debugLog('成功导出 ' + dataToExport.length + ' 条记录');
        
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败：' + error.message);
    }
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    debugLog('通知单处理工具已加载');
});

