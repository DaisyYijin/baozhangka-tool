/**
 * 发卡工具 - Word表格转Excel
 * 功能：将Word文档中的表格数据转换为Excel格式
 * 
 * 使用方式：
 * 1. 从Word中复制表格
 * 2. 粘贴到文本框中
 * 3. 点击解析并预览
 * 4. 下载Excel
 */

// 全局变量
var cardTableData = null;
var cardDocInfo = null; // 保存提取的文档信息

/**
 * 切换到发卡工具页面
 */
function switchToCardTool() {
    document.getElementById('checkToolPage').style.display = 'none';
    document.getElementById('generatorToolPage').style.display = 'none';
    document.getElementById('auditToolPage').style.display = 'none';
    document.getElementById('notificationHandlerPage').style.display = 'none';
    document.getElementById('cardToolPage').style.display = 'flex';
    
    // 恢复上次的标签页状态
    var savedTab = localStorage.getItem('cardToolCurrentTab') || 'convert';
    switchCardToolTab(savedTab);
    
    // 保存当前页面状态
    try {
        localStorage.setItem('currentToolPage', 'cardTool');
    } catch (e) {
        console.warn('无法保存页面状态:', e);
    }
}

/**
 * 切换发卡工具内的标签页
 * @param {string} tab - 标签页类型：'convert' 或 'register'
 */
function switchCardToolTab(tab) {
    var convertTab = document.getElementById('cardConvertTab');
    var registryTab = document.getElementById('cardRegistryTab');
    var convertBtn = document.getElementById('convertTabBtn');
    var registryBtn = document.getElementById('registryTabBtn');

    if (tab === 'registry') {
        if (convertTab) convertTab.style.display = 'none';
        if (registryTab) registryTab.style.display = 'block';
        if (convertBtn) convertBtn.classList.remove('active');
        if (registryBtn) registryBtn.classList.add('active');
        if (typeof REG !== 'undefined' && typeof REG.init === 'function') {
            REG.init();
        }
        try { localStorage.setItem('cardToolCurrentTab', 'registry'); } catch (e) {}
        return;
    }

    // default -> convert
    if (convertTab) convertTab.style.display = 'block';
    if (registryTab) registryTab.style.display = 'none';
    if (convertBtn) convertBtn.classList.add('active');
    if (registryBtn) registryBtn.classList.remove('active');
    try { localStorage.setItem('cardToolCurrentTab', 'convert'); } catch (e) {}
}

/**
 * 提取文档信息（标题、部别/单位名称、时间等）
 */
function extractDocumentInfo(text) {
    var info = {
        title: '',
        unitName: '',
        date: ''
    };
    
    var lines = text.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();
        
        // 提取标题（包含"登记表"等关键词）
        if (!info.title && (trimmedLine.indexOf('登记表') !== -1 || trimmedLine.indexOf('发卡') !== -1)) {
            info.title = trimmedLine.replace(/\s+/g, '');
        }
        
        // 提取部别/单位名称和时间（同一行的情况）
        if (trimmedLine.indexOf('部别') !== -1 || trimmedLine.indexOf('单位名称') !== -1 || trimmedLine.indexOf('时间') !== -1) {
            debugLog('找到包含部别/单位/时间的行:', line);
            
            // 尝试按制表符分割
            var parts = line.split('\t');
            debugLog('按制表符分割后:', parts);
            
            // 遍历每个部分
            for (var j = 0; j < parts.length; j++) {
                var part = parts[j].trim();
                
                // 提取部别（优先）
                if (!info.unitName && part.indexOf('部别') !== -1) {
                    var deptMatch = part.match(/部别[：:]\s*(.+)/);
                    if (deptMatch) {
                        info.unitName = deptMatch[1].trim();
                        debugLog('提取到部别:', info.unitName);
                    }
                }
                
                // 提取单位名称（次优先）
                if (!info.unitName && part.indexOf('单位名称') !== -1) {
                    var unitMatch = part.match(/单位名称[：:]\s*(.+)/);
                    if (unitMatch) {
                        info.unitName = unitMatch[1].trim();
                        debugLog('提取到单位名称:', info.unitName);
                    }
                }
                
                // 提取时间
                if (!info.date && part.indexOf('时间') !== -1) {
                    var dateMatch = part.match(/时间[：:]\s*(\d{4}[-./年]\d{1,2}[-./月]\d{1,2}日?)/);
                    if (dateMatch) {
                        info.date = dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '');
                        debugLog('提取到日期:', info.date);
                    }
                }
            }
            
            // 如果制表符分割没有找到，尝试空格分割
            if (!info.unitName && trimmedLine.indexOf('部别') !== -1) {
                var deptMatch = trimmedLine.match(/部别[：:]\s*([^\s]+(?:\s+[^\s]+)*?)(?:\s{2,}|时间|$)/);
                if (deptMatch) {
                    info.unitName = deptMatch[1].trim();
                    debugLog('通过空格分割提取到部别:', info.unitName);
                }
            }
            
            if (!info.unitName && trimmedLine.indexOf('单位名称') !== -1) {
                var unitMatch = trimmedLine.match(/单位名称[：:]\s*([^\s]+(?:\s+[^\s]+)*?)(?:\s{2,}|时间|$)/);
                if (unitMatch) {
                    info.unitName = unitMatch[1].trim();
                    debugLog('通过空格分割提取到单位名称:', info.unitName);
                }
            }
            
            if (!info.date && trimmedLine.indexOf('时间') !== -1) {
                var dateMatch = trimmedLine.match(/(\d{4}[-./]\d{1,2}[-./]\d{1,2})/);
                if (dateMatch) {
                    info.date = dateMatch[1].replace(/[\/\.]/g, '-');
                    debugLog('通过模式匹配提取到日期:', info.date);
                }
            }
        }
    }
    
    debugLog('提取的文档信息:', info);
    debugLog('原始文本（前500字符）:', text.substring(0, 500));
    return info;
}

/**
 * 解析粘贴的表格数据
 * 支持从Word/Excel复制的制表符分隔格式
 */
function parseTableData(text) {
    var rows = [];
    var tableStarted = false;
    var headerRowIndex = -1;
    
    // 提取文档信息
    var docInfo = extractDocumentInfo(text);
    
    // 按行分割
    var lines = text.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line === '') continue;
        
        // 过滤掉标题行、单位名称、时间等无关内容
        if (line.indexOf('军人保障卡发卡登记表') !== -1 || 
            line.indexOf('发卡登记表') !== -1) {
            debugLog('过滤掉非表格内容:', line.substring(0, 50) + '...');
            continue;
        }
        
        // 过滤包含"单位名称："和"时间："的行（无论有多少制表符）
        if ((line.indexOf('单位名称：') !== -1 || line.indexOf('单位名称:') !== -1) && 
            (line.indexOf('时间：') !== -1 || line.indexOf('时间:') !== -1)) {
            debugLog('过滤掉单位/时间行:', line.substring(0, 50) + '...');
            continue;
        }
        
        // 跳过非表格内容（标题、单位名称、时间等）
        if (!tableStarted) {
            // 检测到表格开始（通常表头行会有多个列）
            var testCells = line.split('\t');
            
            // 检查是否包含常见的表头关键字
            var hasHeaderKeywords = false;
            var headerKeywords = ['序号', '姓名', '编号', '部别', '类型', '单位', '公民', '身份', '保障卡'];
            for (var k = 0; k < testCells.length; k++) {
                var cell = testCells[k].trim();
                for (var m = 0; m < headerKeywords.length; m++) {
                    if (cell.indexOf(headerKeywords[m]) !== -1) {
                        hasHeaderKeywords = true;
                        break;
                    }
                }
                if (hasHeaderKeywords) break;
            }
            
            // 表格开始的条件：
            // 1. 至少3列
            // 2. 包含常见表头关键字，或者列数在合理范围内（5-20列）且没有冒号
            if (testCells.length >= 3 && 
                (hasHeaderKeywords || 
                 (testCells.length >= 5 && testCells.length <= 20 && line.indexOf('：') === -1 && line.indexOf(':') === -1))) {
                tableStarted = true;
                headerRowIndex = rows.length;
                debugLog('检测到表格开始，行索引:', i, '列数:', testCells.length, '包含表头关键字:', hasHeaderKeywords);
            } else {
                debugLog('跳过非表格行（列数:', testCells.length, ', 包含关键字:', hasHeaderKeywords, ')');
                continue; // 跳过非表格行
            }
        }
        
        // 按制表符分割（从Excel/Word复制）
        var cells = line.split('\t');
        
        // 如果没有制表符，尝试按多个空格分割
        if (cells.length === 1) {
            cells = line.split(/\s{2,}/);
        }
        
        // 清理每个单元格的内容
        var cleanedCells = [];
        for (var j = 0; j < cells.length; j++) {
            var cellContent = cells[j].trim();
            // 移除单元格内的换行符
            cellContent = cellContent.replace(/[\r\n]+/g, '');
            cleanedCells.push(cellContent);
        }
        
        // 如果是表头行（第一行），规范化列名（移除多余空格）
        if (rows.length === 0) {
            for (var j = 0; j < cleanedCells.length; j++) {
                cleanedCells[j] = cleanedCells[j].replace(/\s+/g, ' ');
            }
        }
        
        if (cleanedCells.length > 0) {
            rows.push(cleanedCells);
        }
    }
    
    // 处理跨行表头（例如"领取签字\n（日期）"）
    if (rows.length >= 2 && headerRowIndex === 0) {
        var headerRow = rows[0];
        var nextRow = rows[1];
        
        debugLog('检查是否为跨行表头:');
        debugLog('  表头行长度:', headerRow.length);
        debugLog('  第二行长度:', nextRow.length);
        debugLog('  第二行内容:', nextRow);
        
        // 检查第二行是否是表头的补充
        var isHeaderSupplement = true;
        var hasParenthesis = false;
        var nonEmptyCount = 0;
        var allBracketCount = 0; // 全是括号内容的单元格数量
        
        for (var j = 0; j < nextRow.length; j++) {
            var cell = nextRow[j];
            if (cell !== '') {
                nonEmptyCount++;
                // 检查是否只包含括号内容或者很短的内容
                if (cell.match(/^[（(].*[)）]$/) || cell.match(/^[\（\(]/) || cell.length <= 5) {
                    hasParenthesis = true;
                    allBracketCount++;
                } else {
                    // 如果有正常的数据内容（不是括号，且较长），说明这是数据行
                    debugLog('  第' + j + '列包含数据内容:', cell);
                    isHeaderSupplement = false;
                    break;
                }
            }
        }
        
        // 判断条件：
        // 1. 第二行非空单元格数量很少（小于表头行数量的一半）
        // 2. 且这些非空单元格都是括号内容或很短
        var emptyRatio = (nextRow.length - nonEmptyCount) / nextRow.length;
        debugLog('  非空单元格数:', nonEmptyCount, ', 空单元格比例:', (emptyRatio * 100).toFixed(1) + '%');
        
        if (isHeaderSupplement && hasParenthesis && 
            (nonEmptyCount <= Math.max(3, headerRow.length * 0.3) || emptyRatio >= 0.6)) {
            debugLog('[OK] 检测到跨行表头，开始合并...');
            for (var j = 0; j < Math.min(headerRow.length, nextRow.length); j++) {
                if (nextRow[j] !== '') {
                    headerRow[j] = headerRow[j] + nextRow[j];
                    debugLog('  合并列' + j + ':', headerRow[j]);
                }
            }
            // 删除第二行
            rows.splice(1, 1);
            debugLog('[OK] 合并后的表头:', headerRow);
        } else {
            debugLog('[INFO] 第二行不是表头补充，保持为数据行');
        }
    }
    
    debugLog('解析的表格行数:', rows.length);
    if (rows.length > 0) {
        debugLog('表头:', rows[0]);
    }
    
    // 不再将提取的单位名称和日期添加到表格中
    // 这些信息仅用于文件名生成和显示提示
    debugLog('提取的单位名称（不添加到表格）:', docInfo.unitName);
    debugLog('提取的日期（不添加到表格）:', docInfo.date);
    
    // 返回表格数据和文档信息
    return {
        rows: rows,
        docInfo: docInfo
    };
}

/**
 * 处理粘贴的表格数据
 */
function handleCardPaste() {
    var textarea = document.getElementById('cardTableInput');
    var text = textarea.value.trim();
    
    if (!text) {
        alert('请先粘贴表格数据');
        return;
    }
    
    try {
        // 解析表格数据
        var parseResult = parseTableData(text);
        cardTableData = parseResult.rows;
        cardDocInfo = parseResult.docInfo;
        
        if (!cardTableData || cardTableData.length === 0) {
            alert('未能解析表格数据，请确保已从Word中正确复制表格');
            return;
        }
        
        // 显示预览
        displayCardPreview(cardTableData, cardDocInfo);
        
        // 启用下载按钮和导入按钮
        document.getElementById('downloadCardExcelBtn').disabled = false;
        var importIssueBtn = document.getElementById('importToIssueBtn');
        if (importIssueBtn) importIssueBtn.disabled = false;
        var importRecycleBtn = document.getElementById('importToRecycleBtn');
        if (importRecycleBtn) importRecycleBtn.disabled = false;
        
    } catch (error) {
        console.error('解析表格失败:', error);
        alert('解析失败: ' + error.message);
    }
}

/**
 * 显示表格预览
 */
function displayCardPreview(data, docInfo) {
    // 显示右侧面板
    var rightPanel = document.getElementById('cardRightPanel');
    if (rightPanel) {
        rightPanel.style.display = 'flex';
    }
    
    var previewDiv = document.getElementById('cardTablePreview');
    
    if (!data || data.length === 0) {
        previewDiv.innerHTML = '<p style="color: #999;">暂无数据</p>';
        return;
    }
    
    // 查找"卡类型"列的索引并统计分类
    var headers = data[0];
    var cardTypeIndex = -1;
    
    for (var i = 0; i < headers.length; i++) {
        var header = String(headers[i]).trim();
        // 移除多余空格
        header = header.replace(/\s+/g, '');
        
        if (header === '卡类型' || header === '卡片类型' || header === '类型') {
            cardTypeIndex = i;
            break;
        }
    }
    
    // 统计卡类型分类
    var typeStats = {};
    if (cardTypeIndex !== -1) {
        for (var i = 1; i < data.length; i++) {
            var cardType = String(data[i][cardTypeIndex] || '').trim();
            if (cardType === '') {
                cardType = '(空)';
            }
            typeStats[cardType] = (typeStats[cardType] || 0) + 1;
        }
    }
    
    // 使用传入的文档信息
    var hasExtractedInfo = false;
    var extractedUnitName = '';
    var extractedDate = '';
    
    if (docInfo) {
        if (docInfo.unitName) {
            extractedUnitName = docInfo.unitName;
            hasExtractedInfo = true;
        }
        if (docInfo.date) {
            extractedDate = docInfo.date;
            hasExtractedInfo = true;
        }
    }
    
    // 使用卡片式布局显示信息
    var html = '<div style="margin-bottom: 15px;">';
    
    // 统计信息卡片
    html += '<div style="display: flex; gap: 10px; margin-bottom: 15px;">';
    
    // 数据量统计
    html += '<div style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; color: white; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">';
    html += '<div style="display: flex; align-items: center; justify-content: space-between;">';
    html += '<div>';
    html += '<div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">数据行数</div>';
    html += '<div style="font-size: 24px; font-weight: bold;">' + (data.length - 1) + '</div>';
    html += '</div>';
    html += '<i class="fa fa-database" style="font-size: 32px; opacity: 0.3;"></i>';
    html += '</div></div>';
    
    // 列数统计
    html += '<div style="flex: 1; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 15px; border-radius: 8px; color: white; box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);">';
    html += '<div style="display: flex; align-items: center; justify-content: space-between;">';
    html += '<div>';
    html += '<div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">表格列数</div>';
    html += '<div style="font-size: 24px; font-weight: bold;">' + (data[0] ? data[0].length : 0) + '</div>';
    html += '</div>';
    html += '<i class="fa fa-columns" style="font-size: 32px; opacity: 0.3;"></i>';
    html += '</div></div>';
    
    html += '</div>';
    
    // 显示提取到的文档信息
    if (hasExtractedInfo) {
        html += '<div style="background: #ffffff; border: 1px solid #d1f2eb; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">';
        html += '<div style="display: flex; align-items: center; margin-bottom: 10px;">';
        html += '<i class="fa fa-check-circle" style="color: #27ae60; font-size: 18px; margin-right: 8px;"></i>';
        html += '<span style="font-weight: 600; color: #27ae60; font-size: 14px;">已提取文档信息</span>';
        html += '</div>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">';
        if (extractedUnitName) {
            html += '<div style="background: #f0f9ff; padding: 10px; border-radius: 6px; border-left: 3px solid #3498db;">';
            html += '<div style="font-size: 11px; color: #666; margin-bottom: 3px;">单位名称</div>';
            html += '<div style="font-size: 13px; color: #333; font-weight: 500;">' + escapeHtmlForCard(extractedUnitName) + '</div>';
            html += '</div>';
        }
        if (extractedDate) {
            html += '<div style="background: #fff4e6; padding: 10px; border-radius: 6px; border-left: 3px solid #e67e22;">';
            html += '<div style="font-size: 11px; color: #666; margin-bottom: 3px;">日期</div>';
            html += '<div style="font-size: 13px; color: #333; font-weight: 500;">' + escapeHtmlForCard(extractedDate) + '</div>';
            html += '</div>';
        }
        html += '</div>';
    }
    
    // 显示卡类型分类统计
    if (cardTypeIndex !== -1 && Object.keys(typeStats).length > 0) {
        html += '<div style="background: #ffffff; border: 1px solid #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">';
        html += '<div style="display: flex; align-items: center; margin-bottom: 12px;">';
        html += '<i class="fa fa-pie-chart" style="color: #667eea; font-size: 18px; margin-right: 8px;"></i>';
        html += '<span style="font-weight: 600; color: #333; font-size: 14px;">卡类型分类统计</span>';
        html += '</div>';
        
        var types = Object.keys(typeStats);
        
        // 按罗马数字排序（与下载逻辑一致）
        types.sort(function(a, b) {
            if (a === '(空)') return 1;
            if (b === '(空)') return -1;
            
            var romanA = a.match(/[Ⅰ-Ⅹ]+/);
            var romanB = b.match(/[Ⅰ-Ⅹ]+/);
            
            if (romanA && romanB) {
                var romanOrder = {'Ⅰ': 1, 'Ⅱ': 2, 'Ⅲ': 3, 'Ⅳ': 4, 'Ⅴ': 5, 'Ⅵ': 6, 'Ⅶ': 7, 'Ⅷ': 8, 'Ⅸ': 9, 'Ⅹ': 10};
                var orderA = romanOrder[romanA[0]] || 0;
                var orderB = romanOrder[romanB[0]] || 0;
                return orderA - orderB;
            } else if (romanA) {
                return -1;
            } else if (romanB) {
                return 1;
            } else {
                return a.localeCompare(b, 'zh-CN');
            }
        });
        
        var colorSchemes = {
            'Ⅰ型卡': '#667eea',
            'Ⅱ型卡': '#e91e63',
            'Ⅲ型卡': '#27ae60',
            'Ⅳ型卡': '#f39c12',
            '(空)': '#999'
        };
        
        html += '<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">';
        
        for (var i = 0; i < types.length; i++) {
            var typeName = types[i];
            var count = typeStats[typeName];
            var bgColor = colorSchemes[typeName] || '#999';
            
            html += '<div style="background: ' + bgColor + '; color: white; padding: 6px 14px; border-radius: 16px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">';
            html += '<span style="font-size: 12px; font-weight: 600;">' + escapeHtmlForCard(typeName) + '</span>';
            html += '<span style="background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">' + count + '</span>';
            html += '</div>';
        }
        
        html += '</div>';
        
        html += '</div>';
    } else {
        html += '<div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #999; font-size: 13px; color: #666; margin-bottom: 15px;">';
        html += '<i class="fa fa-info-circle" style="margin-right: 8px;"></i>';
        html += '未检测到"卡类型"列，将导出到单个Sheet';
        html += '</div>';
    }
    
    html += '</div>';
    
    // 表格预览标题
    html += '<div style="display: flex; align-items: center; margin-bottom: 10px;">';
    html += '<i class="fa fa-table" style="color: #667eea; font-size: 16px; margin-right: 8px;"></i>';
    html += '<span style="font-weight: 600; color: #333; font-size: 14px;">表格预览</span>';
    html += '<span style="margin-left: auto; font-size: 12px; color: #999;">最多显示50行</span>';
    html += '</div>';
    
    html += '<div style="overflow-x: auto; max-height: 450px; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">' +
            '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">' +
            '<thead style="position: sticky; top: 0; background: linear-gradient(to bottom, #f8f9fa 0%, #f0f1f2 100%); z-index: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">';
    
    // 表头
    html += '<tr>';
    for (var j = 0; j < data[0].length; j++) {
        var headerText = String(data[0][j]);
        var isCardTypeCol = (j === cardTypeIndex);
        
        var bgColor = '';
        var icon = '';
        var borderLeft = '';
        
        if (isCardTypeCol) {
            bgColor = ' background: linear-gradient(to bottom, #fff9e6 0%, #fff3cd 100%);';
            icon = ' <i class="fa fa-tag" style="color: #f39c12; margin-left: 5px;"></i>';
            borderLeft = ' border-left: 3px solid #f39c12;';
        }
        
        html += '<th style="padding: 12px 10px; text-align: left; border-right: 1px solid #e0e0e0; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #555;' + bgColor + borderLeft + '">' +
                    escapeHtmlForCard(headerText) + icon +
                '</th>';
    }
    html += '</tr></thead><tbody>';
    
    // 数据行（最多显示50行）
    var maxRows = Math.min(data.length, 51);
    for (var i = 1; i < maxRows; i++) {
        var rowBg = i % 2 === 0 ? ' background: #fafafa;' : ' background: white;';
        html += '<tr style="transition: background 0.2s;">';
        for (var j = 0; j < data[i].length; j++) {
            var isCardTypeCol = (j === cardTypeIndex);
            
            var cellBg = '';
            var borderLeft = '';
            
            if (isCardTypeCol) {
                cellBg = ' background: #fffef7;';
                borderLeft = ' border-left: 2px solid #ffe6a5;';
            }
            
            html += '<td style="padding: 10px; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #333;' + cellBg + borderLeft + rowBg + '">' +
                        escapeHtmlForCard(String(data[i][j] || '')) +
                    '</td>';
        }
        html += '</tr>';
    }
    
    if (data.length > 51) {
        html += '<tr><td colspan="' + data[0].length + '" style="padding: 15px; text-align: center; background: #f8f9fa; border-top: 2px solid #e0e0e0;">';
        html += '<i class="fa fa-info-circle" style="color: #999; margin-right: 5px;"></i>';
        html += '<span style="color: #666; font-size: 12px;">仅显示前50行数据，下载Excel查看完整内容（共' + (data.length - 1) + '行）</span>';
        html += '</td></tr>';
    }
    
    html += '</tbody></table></div>';
    
    previewDiv.innerHTML = html;
}

/**
 * HTML转义函数
 */
function escapeHtmlForCard(text) {
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
}

/**
 * 下载为Excel文件
 * 根据卡类型分类到不同的Sheet
 */
function downloadCardExcel() {
    if (!cardTableData || cardTableData.length === 0) {
        alert('没有可下载的数据');
        return;
    }
    
    try {
        // 创建工作簿
        var wb = XLSX.utils.book_new();
        
        // 查找"卡类型"列的索引
        var headers = cardTableData[0];
        var cardTypeIndex = -1;
        
        debugLog('表头信息 (总共' + headers.length + '列):');
        for (var i = 0; i < headers.length; i++) {
            debugLog('  列' + i + ': "' + headers[i] + '"');
        }
        
        for (var i = 0; i < headers.length; i++) {
            var header = String(headers[i]).trim();
            // 移除多余空格
            header = header.replace(/\s+/g, '');
            
            if (header === '卡类型' || header === '卡片类型' || header === '类型') {
                cardTypeIndex = i;
                debugLog('找到卡类型列，索引:', i, '原始值:', headers[i]);
                break;
            }
        }
        
        if (cardTypeIndex === -1) {
            // 如果没有找到卡类型列，直接导出全部数据到Sheet1
            debugLog('未找到"卡类型"列，导出全部数据');
            debugLog('请检查表头中是否有"卡类型"、"卡片类型"或"类型"列');
            var ws = XLSX.utils.aoa_to_sheet(cardTableData);
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            
            // 使用提取的日期信息生成文件名
            var dateStr = '';
            if (cardDocInfo && cardDocInfo.date) {
                dateStr = cardDocInfo.date;
            }
            
            // 生成文件名
            var now = new Date();
            function pad(num) {
                return num < 10 ? '0' + num : '' + num;
            }
            
            var timeStr = now.getFullYear() + 
                          pad(now.getMonth() + 1) + 
                          pad(now.getDate()) + '-' +
                          pad(now.getHours()) + 
                          pad(now.getMinutes()) + 
                          pad(now.getSeconds());
            
            var filename = '发卡登记';
            if (dateStr) {
                filename += '-' + dateStr.replace(/[\/\s:]/g, '-');
            }
            filename += '-' + timeStr + '.xlsx';
            
            XLSX.writeFile(wb, filename);
            
            alert('[OK] Excel文件已下载成功！\n\n文件名：' + filename + '\n\n未检测到"卡类型"列，所有数据已导出到Sheet1');
            return;
        }
        
        // 先收集所有不同的卡类型
        var allTypes = {};
        var unclassifiedCount = 0;
        for (var i = 1; i < cardTableData.length; i++) {
            var row = cardTableData[i];
            var cardType = String(row[cardTypeIndex] || '').trim();
            
            // 整行为空的行直接跳过
            var hasContent = false;
            for (var c = 0; c < row.length; c++) {
                if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
                    hasContent = true;
                    break;
                }
            }
            if (!hasContent) continue;
            
            // 卡类型为空但整行有内容的行不再静默丢弃，归入"未分类"sheet，避免导出数据不完整
            var groupKey = cardType !== '' ? cardType : '未分类';
            if (cardType === '') unclassifiedCount++;
            if (!allTypes[groupKey]) {
                allTypes[groupKey] = [];
            }
            allTypes[groupKey].push(row);
        }
        
        // 获取所有卡类型并排序
        var typeNames = Object.keys(allTypes);
        
        // 自定义排序：优先处理罗马数字，然后是其他
        typeNames.sort(function(a, b) {
            // 提取罗马数字
            var romanA = a.match(/[Ⅰ-Ⅹ]+/);
            var romanB = b.match(/[Ⅰ-Ⅹ]+/);
            
            if (romanA && romanB) {
                // 两者都有罗马数字，按罗马数字排序
                var romanOrder = {'Ⅰ': 1, 'Ⅱ': 2, 'Ⅲ': 3, 'Ⅳ': 4, 'Ⅴ': 5, 'Ⅵ': 6, 'Ⅶ': 7, 'Ⅷ': 8, 'Ⅸ': 9, 'Ⅹ': 10};
                var orderA = romanOrder[romanA[0]] || 0;
                var orderB = romanOrder[romanB[0]] || 0;
                return orderA - orderB;
            } else if (romanA) {
                // 只有A有罗马数字，A在前
                return -1;
            } else if (romanB) {
                // 只有B有罗马数字，B在前
                return 1;
            } else {
                // 都没有罗马数字，按字母顺序
                return a.localeCompare(b, 'zh-CN');
            }
        });
        
        debugLog('检测到的卡类型（已排序）:', typeNames);
        
        // 为每种卡类型创建独立的Sheet
        var sheetStats = [];
        
        for (var i = 0; i < typeNames.length; i++) {
            var typeName = typeNames[i];
            var typeData = [headers].concat(allTypes[typeName]);
            
            // 创建Sheet名称
            var sheetName = typeName;
            
            // 限制Sheet名称长度（Excel最多31个字符）
            if (sheetName.length > 31) {
                sheetName = sheetName.substring(0, 31);
            }
            
            // 创建工作表
            var ws = XLSX.utils.aoa_to_sheet(typeData);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            
            // 记录统计信息
            sheetStats.push({
                name: sheetName,
                count: typeData.length - 1
            });
            
            debugLog('创建Sheet: ' + sheetName + ', 数据行数: ' + (typeData.length - 1));
        }
        
        // 如果没有找到任何卡类型数据，导出全部
        if (typeNames.length === 0) {
            var ws = XLSX.utils.aoa_to_sheet(cardTableData);
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        }
        
        // 使用提取的日期信息生成文件名
        var dateStr = '';
        if (cardDocInfo && cardDocInfo.date) {
            dateStr = cardDocInfo.date;
        }
        
        // 生成文件名：发卡登记-日期-时间
        var now = new Date();
        
        // 辅助函数：补零
        function pad(num) {
            return num < 10 ? '0' + num : '' + num;
        }
        
        var timeStr = now.getFullYear() + 
                      pad(now.getMonth() + 1) + 
                      pad(now.getDate()) + '-' +
                      pad(now.getHours()) + 
                      pad(now.getMinutes()) + 
                      pad(now.getSeconds());
        
        var filename = '发卡登记';
        if (dateStr) {
            filename += '-' + dateStr.replace(/[\/\s:]/g, '-');
        }
        filename += '-' + timeStr + '.xlsx';
        
        // 下载文件
        XLSX.writeFile(wb, filename);
        
        debugLog('Excel下载完成:', filename);
        
        // 显示分类统计信息
        var message = '[OK] Excel文件已下载成功！\n\n文件名：' + filename + '\n\n';
        if (sheetStats.length > 0) {
            message += '[DATA] 数据分类统计（共 ' + sheetStats.length + ' 个Sheet）：';
            var statsLine = [];
            for (var i = 0; i < sheetStats.length; i++) {
                statsLine.push(sheetStats[i].name + ' ' + sheetStats[i].count + '条');
            }
            message += statsLine.join('、') + '\n';
        } else {
            message += '所有数据已导出到Sheet1\n';
        }
        
        // 提示存在未分类数据，避免用户误以为这些行丢失
        if (unclassifiedCount > 0) {
            message += '\n[!] 注意：有 ' + unclassifiedCount + ' 条记录未识别到卡类型，已导出到"未分类"Sheet，请人工核对。\n';
        }
        
        alert(message);
        
        // 询问是否添加到发卡收卡登记表
        // 登记功能已移除：不再提示添加到登记表
        
    } catch (error) {
        console.error('下载错误:', error);
        alert('下载失败: ' + error.message);
    }
}

/**
 * 清空输入
 */
function clearCardInput() {
    document.getElementById('cardTableInput').value = '';
    document.getElementById('cardTablePreview').innerHTML = '<p style="color: #999; text-align: center; padding: 50px 0;">' +
        '<i class="fa fa-table" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>' +
        '粘贴表格数据后，这里将显示预览' +
        '</p>';
    document.getElementById('downloadCardExcelBtn').disabled = true;
    
    // 登记功能已移除：不再处理导入登记按钮
    
    // 隐藏右侧面板
    var rightPanel = document.getElementById('cardRightPanel');
    if (rightPanel) {
        rightPanel.style.display = 'none';
    }
    
    // 禁用按钮
    document.getElementById('downloadCardExcelBtn').disabled = true;
    var importIssueBtn = document.getElementById('importToIssueBtn');
    if (importIssueBtn) importIssueBtn.disabled = true;
    var importRecycleBtn = document.getElementById('importToRecycleBtn');
    if (importRecycleBtn) importRecycleBtn.disabled = true;
    
    cardTableData = null;
    cardDocInfo = null;
}

/**
 * 导入表格数据到发卡/收卡登记
 * @param {string} type - 导入类型：'issue'（发卡登记）或 'recycle'（收卡登记）
 */
function importToCardRegistry(type) {
    if (!cardTableData || cardTableData.length < 2) {
        alert('没有可导入的数据！请先解析表格数据。');
        return;
    }
    
    type = type || 'issue';  // 默认为发卡登记
    var typeName = type === 'issue' ? '发卡登记' : '收卡登记';
    
    // 确认导入
    var confirmMsg = '确定要将 ' + (cardTableData.length - 1) + ' 条数据导入到' + typeName + '吗？\n\n';
    if (cardDocInfo && cardDocInfo.unitName) {
        confirmMsg += '部别/单位：' + cardDocInfo.unitName + '\n';
    }
    if (cardDocInfo && cardDocInfo.date) {
        confirmMsg += '日期：' + cardDocInfo.date;
    }
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        // 解析表头，找到各列的索引
        var headers = cardTableData[0];
        var columnMap = {};
        
        for (var i = 0; i < headers.length; i++) {
            var header = String(headers[i]).trim().replace(/\s+/g, '');
            
            // 映射列名（通用字段）
            if (header === '序号' || header === '编号') {
                columnMap.index = i;
            } else if (header === '部别' || header === '单位' || header === '单位名称') {
                columnMap.department = i;
            } else if (header === '姓名' || header === '人员姓名') {
                columnMap.name = i;
            } else if (header === '身份证号' || header === '身份证号码' || header === '身份证' || 
                       header === '公民身份号码' || header === '公民身份证号码' || 
                       header.indexOf('身份证') !== -1 || header.indexOf('身份号') !== -1) {
                columnMap.idNumber = i;
            } else if (header === '保障卡号' || header === '卡号' || header === '军人保障卡号') {
                columnMap.cardNumber = i;
            } else if (header === '卡类型' || header === '卡片类型' || header === '类型') {
                columnMap.cardType = i;
            } else if (header === '备注' || header === '说明') {
                columnMap.remark = i;
            }
            
            // 发卡登记特有字段
            if (type === 'issue') {
                if (header === '发卡日期' || header === '发放日期' || header === '日期' || header === '时间') {
                    columnMap.issueDate = i;
                } else if (header === '领卡日期') {
                    columnMap.receiveDate = i;
                } else if (header === '发卡状态' || header === '卡状态') {
                    columnMap.cardStatus = i;
                }
            }
            
            // 收卡登记特有字段
            if (type === 'recycle') {
                if (header === '回收日期' || header === '收卡日期' || header === '日期' || header === '时间') {
                    columnMap.recycleDate = i;
                } else if (header === '回收类型' || header === '收卡类型' || header === '类型') {
                    columnMap.recycleReason = i;
                } else if (header === '回收状态' || header === '收卡状态') {
                    columnMap.recycleStatus = i;
                }
            }
        }
        
        // 检查必需字段
        if (columnMap.name === undefined) {
            alert('错误：未找到"姓名"列！');
            return;
        }
        
        // 转换数据为登记格式
        var importedRecords = [];
        var errors = [];
        var defaultDepartment = cardDocInfo && cardDocInfo.unitName ? cardDocInfo.unitName : '';
        var defaultDate = cardDocInfo && cardDocInfo.date ? cardDocInfo.date : '';
        
        // 处理日期格式（可能需要转换）
        var processDate = function(dateStr) {
            if (!dateStr) return '';
            dateStr = String(dateStr).trim();
            // 如果已经是 YYYY-MM-DD 格式
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr;
            }
            // 如果是 YYYYMMDD 格式
            if (/^\d{8}$/.test(dateStr)) {
                return dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6) + '-' + dateStr.substring(6, 8);
            }
            // 如果是其他格式，使用 parseDate（如果存在）
            if (typeof parseDate === 'function') {
                return parseDate(dateStr);
            }
            return dateStr;
        };
        
        // 规范化卡类型（统一为"类卡"格式）
        var normalizeCardType = function(cardType) {
            if (!cardType) return '';
            cardType = String(cardType).trim();
            
            // 将"型卡"统一转换为"类卡"
            cardType = cardType.replace(/型卡/g, '类卡');
            
            // 处理可能的空格
            cardType = cardType.replace(/\s+/g, '');
            
            // 如果只有罗马数字，自动补充"类卡"
            if (/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/.test(cardType)) {
                cardType = cardType + '类卡';
            }
            
            // 处理可能的全角/半角数字
            if (/^[IVX1-4]+$/.test(cardType)) {
                // 转换半角罗马数字为全角
                var romanMap = {
                    'I': 'Ⅰ',
                    'II': 'Ⅱ',
                    'III': 'Ⅲ',
                    'IV': 'Ⅳ',
                    'V': 'Ⅴ',
                    'VI': 'Ⅵ',
                    'VII': 'Ⅶ',
                    'VIII': 'Ⅷ',
                    'IX': 'Ⅸ',
                    'X': 'Ⅹ'
                };
                var upper = cardType.toUpperCase();
                if (romanMap[upper]) {
                    cardType = romanMap[upper] + '类卡';
                }
            }
            
            // 处理阿拉伯数字（1、2、3、4 -> Ⅰ、Ⅱ、Ⅲ、Ⅳ）
            var arabicMap = {
                '1': 'Ⅰ',
                '2': 'Ⅱ',
                '3': 'Ⅲ',
                '4': 'Ⅳ'
            };
            if (/^[1-4]类卡$/.test(cardType) || /^[1-4]型卡$/.test(cardType)) {
                var num = cardType.charAt(0);
                cardType = arabicMap[num] + '类卡';
            }
            
            return cardType;
        };
        
        for (var i = 1; i < cardTableData.length; i++) {
            var row = cardTableData[i];
            
            try {
                // 跳过空行
                var name = columnMap.name !== undefined ? String(row[columnMap.name] || '').trim() : '';
                if (!name) {
                    continue;
                }
                
                // 获取部别（优先使用表格中的部别，其次使用文档提取的部别）
                var department = columnMap.department !== undefined ? 
                    String(row[columnMap.department] || '').trim() : '';
                if (!department) {
                    department = defaultDepartment;
                }
                
                // 创建基础记录对象
                var record = {
                    id: 'R' + Math.random().toString(36).slice(2) + Date.now().toString(36),
                    person: {
                        department: department,
                        name: name,
                        idNumber: columnMap.idNumber !== undefined ? 
                            String(row[columnMap.idNumber] || '').trim() : ''
                    },
                    card: {
                        cardNumber: columnMap.cardNumber !== undefined ? 
                            String(row[columnMap.cardNumber] || '').trim() : '',
                        cardType: columnMap.cardType !== undefined ? 
                            normalizeCardType(row[columnMap.cardType]) : ''
                    },
                    action: {
                        type: type,
                        channel: 'batch'
                    },
                    dates: {
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    remark: columnMap.remark !== undefined ? 
                        String(row[columnMap.remark] || '').trim() : ''
                };
                
                // 根据类型添加特定字段
                if (type === 'issue') {
                    // 发卡登记
                    var issueDate = columnMap.issueDate !== undefined ? 
                        String(row[columnMap.issueDate] || '').trim() : '';
                    if (!issueDate) {
                        issueDate = defaultDate;
                    }
                    
                    var receiveDate = columnMap.receiveDate !== undefined ? 
                        String(row[columnMap.receiveDate] || '').trim() : '';
                    
                    var cardStatus = columnMap.cardStatus !== undefined ? 
                        String(row[columnMap.cardStatus] || '').trim() : '未发卡';
                    
                    record.action.cardStatus = cardStatus;
                    record.dates.issueDate = processDate(issueDate);
                    record.dates.receiveDate = processDate(receiveDate);
                    
                    // 如果有领卡日期，自动将发卡状态改为"已发卡"
                    if (record.dates.receiveDate) {
                        record.action.cardStatus = '已发卡';
                    }
                    
                } else if (type === 'recycle') {
                    // 收卡登记
                    var recycleDate = columnMap.recycleDate !== undefined ? 
                        String(row[columnMap.recycleDate] || '').trim() : '';
                    if (!recycleDate) {
                        recycleDate = defaultDate;
                    }
                    
                    var recycleReason = columnMap.recycleReason !== undefined ? 
                        String(row[columnMap.recycleReason] || '').trim() : '退伍回收';
                    
                    var recycleStatus = columnMap.recycleStatus !== undefined ? 
                        String(row[columnMap.recycleStatus] || '').trim() : '未回收';
                    
                    // 映射回收状态
                    var status = 'pending';  // 默认未回收
                    if (recycleStatus === '已回收' || recycleStatus === '已完成' || recycleStatus === 'done') {
                        status = 'done';
                    }
                    
                    record.action.status = status;
                    record.action.reason = recycleReason;
                    record.dates.recycleDate = processDate(recycleDate);
                }
                
                importedRecords.push(record);
                
            } catch (err) {
                errors.push('第 ' + (i + 1) + ' 行：' + err.message);
            }
        }
        
        if (importedRecords.length === 0) {
            alert('没有可导入的有效数据！\n\n' + 
                (errors.length > 0 ? '错误：\n' + errors.join('\n') : ''));
            return;
        }
        
        // 导入到发卡/收卡登记系统
        if (typeof REG !== 'undefined' && typeof REG.importRecords === 'function') {
            // 如果发卡登记模块提供了导入方法
            REG.importRecords(importedRecords, type);
        } else {
            // 直接添加到存储
            var STORAGE_KEY = 'cardRegistry.records';
            try {
                var existingRecords = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
                existingRecords = existingRecords.concat(importedRecords);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(existingRecords));
            } catch (e) {
                alert('保存数据失败：' + e.message);
                return;
            }
        }
        
        // 切换到登记标签页
        switchCardToolTab('registry');
        
        // 显示成功消息
        var successMsg = '成功导入 ' + importedRecords.length + ' 条记录到' + typeName + '！';
        if (errors.length > 0) {
            successMsg += '\n\n跳过了 ' + errors.length + ' 条错误记录';
        }
        alert(successMsg);
        
        // 清空表格数据
        clearCardInput();
        
    } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败：' + error.message);
    }
}

/**
 * 显示使用说明
 */
function showCardHelp() {
    if (typeof showUsageHelp === 'function') {
        showUsageHelp('card');
    }
}

/**
 * 将表格数据添加到发卡收卡登记表
 * @param {Array} tableData - 表格数据（包含表头）
 * @param {Object} docInfo - 文档信息
 */
function addCardDataToRegistry(tableData, docInfo) {
    if (!tableData || tableData.length < 2) {
        alert('没有有效的数据可以添加');
        return;
    }
    
    // 检查CardRecordStorage是否存在
    if (typeof CardRecordStorage === 'undefined') {
        alert('发卡收卡登记模块未加载，请刷新页面后重试');
        return;
    }
    
    var headers = tableData[0];
    var records = [];
    
    // 查找关键列的索引
    var nameIndex = -1;
    var idNumberIndex = -1;
    var departmentIndex = -1;
    var cardNumberIndex = -1;
    var cardTypeIndex = -1;
    
    for (var i = 0; i < headers.length; i++) {
        var header = String(headers[i]).trim().replace(/\s+/g, '');
        debugLog('检查列头: "' + headers[i] + '" -> "' + header + '"');
        
        if (header.indexOf('姓名') !== -1) {
            nameIndex = i;
        } else if (header.indexOf('身份证') !== -1 || header.indexOf('公民身份号码') !== -1) {
            idNumberIndex = i;
        } else if (header.indexOf('部别') !== -1) {
            departmentIndex = i;
        } else if (header.indexOf('单位') !== -1 && departmentIndex === -1) {
            // 只在没有找到"部别"时才使用"单位"
            departmentIndex = i;
        } else if (header.indexOf('保障卡号') !== -1 || header.indexOf('军人保障卡号') !== -1) {
            cardNumberIndex = i;
        } else if (header.indexOf('卡号') !== -1 && cardNumberIndex === -1 && header.indexOf('银行') === -1) {
            // 只在没有找到"保障卡号"时才使用"卡号"，且排除"银行卡号"
            cardNumberIndex = i;
        } else if (header.indexOf('卡类型') !== -1 || (header.indexOf('类型') !== -1 && header.indexOf('卡') !== -1)) {
            cardTypeIndex = i;
        }
    }
    
    debugLog('识别结果:', {
        nameIndex: nameIndex,
        idNumberIndex: idNumberIndex,
        departmentIndex: departmentIndex,
        cardNumberIndex: cardNumberIndex,
        cardTypeIndex: cardTypeIndex
    });
    
    // 验证必要的列
    if (nameIndex === -1) {
        alert('表格中未找到"姓名"列，无法添加到登记表');
        return;
    }
    
    // 获取日期（优先使用文档信息中的日期）
    var defaultDate = '';
    if (docInfo && docInfo.date) {
        defaultDate = docInfo.date;
    } else {
        defaultDate = new Date().toISOString().split('T')[0];
    }
    
    // 获取默认部别（仅作为备用，当表格中没有部别列时使用）
    var defaultDepartment = '';
    if (docInfo && docInfo.unitName) {
        defaultDepartment = docInfo.unitName;
    }
    
    debugLog('默认部别（备用）:', defaultDepartment);
    debugLog('表格部别列索引:', departmentIndex);
    
    // 转换数据
    for (var i = 1; i < tableData.length; i++) {
        var row = tableData[i];
        var name = nameIndex !== -1 ? String(row[nameIndex] || '').trim() : '';
        
        // 如果姓名为空，跳过
        if (!name) continue;
        
        // 提取部别：优先使用表格中的部别列，如果为空才使用默认值
        var rowDepartment = '';
        if (departmentIndex !== -1) {
            rowDepartment = String(row[departmentIndex] || '').trim();
        }
        
        // 如果表格中的部别为空，才使用文档提取的默认部别
        var finalDepartment = rowDepartment || defaultDepartment;
        
        debugLog('第' + i + '行: 表格部别="' + rowDepartment + '", 最终部别="' + finalDepartment + '"');
        
        var record = {
            name: name,
            idNumber: idNumberIndex !== -1 ? String(row[idNumberIndex] || '').trim() : '',
            department: finalDepartment,
            cardNumber: cardNumberIndex !== -1 ? String(row[cardNumberIndex] || '').trim() : '',
            cardType: cardTypeIndex !== -1 ? String(row[cardTypeIndex] || '').trim() : '',
            issueStatus: '未发卡', // 默认状态为未发卡
            recoveryType: '',
            date: defaultDate,
            remark: '' // 不再自动添加备注
        };
        
        records.push(record);
    }
    
    if (records.length === 0) {
        alert('没有有效的记录可以添加');
        return;
    }
    
    // 批量添加记录
    var addedCount = CardRecordStorage.addBatch(records);
    
    if (addedCount > 0) {
        alert('[OK] 成功添加 ' + addedCount + ' 条记录到发卡收卡登记表！\n\n可以切换到"发卡收卡登记"标签页的"发卡管理"查看这些记录。');
        
        // 更新登记表界面（如果已初始化）
        if (typeof refreshIssueList === 'function') {
            refreshIssueList();
        }
        if (typeof updateStatistics === 'function') {
            updateStatistics();
        }
        if (typeof updateYearFilter === 'function') {
            updateYearFilter();
        }
    } else {
        alert('添加失败，请稍后重试');
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('cardToolPage')) {
        debugLog('发卡工具已加载');
    }
});
