var file1Data = null;    // 数据联审工具 - 文件1（保障卡）
var file2Data = null;    // 数据联审工具 - 文件2（人资）
var file3Data = null;    // 数据联审工具 - 文件3（财务或被装）
var file1Name = '';
var file2Name = '';
var file3Name = '';
var diffResult = null;
var noticeIndex = {};

// 数据整合模块状态
var mergeOriginalData = null;
var mergeUpdatedData = null;
var mergeOriginalName = '';
var mergeUpdatedName = '';
var mergeResult = null;
var mergeOriginalFiles = [];
var mergeUpdatedFiles = [];
var MERGE_KEY_FIELD = '公民身份号码';
var mergeUpdatedSlotCounter = 0;

function normalizeMergeKey(value) {
    return String(value || '').trim();
}

function mergeRecordsByKey(records) {
    if (!records || !records.length) {
        return [];
    }
    var index = {};
    var order = [];
    for (var i = 0; i < records.length; i++) {
        var record = records[i] || {};
        var key = normalizeMergeKey(record[MERGE_KEY_FIELD]);
        if (!key) continue;
        if (!index.hasOwnProperty(key)) {
            order.push(key);
        }
        index[key] = record;
    }
    var result = [];
    for (var j = 0; j < order.length; j++) {
        result.push(index[order[j]]);
    }
    return result;
}

function createFileInfo(file) {
    return {
        name: file.name,
        sizeText: (file.size / 1024).toFixed(2) + ' KB'
    };
}

function updateMergeDisplay(type) {
    var container = document.getElementById(type === 'original' ? 'mergeOriginalDisplay' : 'mergeUpdatedDisplay');
    if (!container) return;
    var files = type === 'original' ? mergeOriginalFiles : mergeUpdatedFiles;
    if (!files || !files.length) {
        container.innerHTML = '';
        return;
    }
    var html = '';
    
    // 如果是修改后文件且有多个，显示汇总信息
    if (type === 'updated' && files.length > 1) {
        var totalRecords = 0;
        for (var i = 0; i < files.length; i++) {
            if (files[i].data) {
                totalRecords += files[i].data.length;
            }
        }
        html += '<div class="file-summary" style="background:#f5f5f5; padding:10px; border-radius:6px; margin-bottom:8px;">' +
            '<div style="font-weight:600; margin-bottom:4px;"><i class="fa fa-files-o"></i> 已选择 ' + files.length + ' 个文件</div>' +
            '<div style="font-size:12px; color:#666;">共 ' + totalRecords + ' 条记录（去重后: ' + (mergeUpdatedData ? mergeUpdatedData.length : 0) + ' 条）</div>' +
        '</div>';
    }
    
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var recordCount = file.data ? file.data.length : 0;
        html += '<div class="file-item">' +
            '<div class="file-info">' +
                '<span class="file-icon"><i class="fa fa-file-excel-o"></i></span>' +
                '<div>' +
                    '<div class="file-name">' + escapeHtml(file.name) + '</div>' +
                    '<div class="file-size">' + file.sizeText + (recordCount > 0 ? ' · ' + recordCount + ' 条' : '') + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }
    html += '<button class="remove-btn" style="margin-top:8px;" onclick="' + (type === 'original' ? 'removeMergeOriginal()' : 'removeMergeUpdated()') + '">清空' + (type === 'original' ? '' : '全部') + '</button>';
    container.innerHTML = html;
}

function formatMergeCell(updatedVal, originalVal) {
    var uv = String(updatedVal === undefined || updatedVal === null ? '' : updatedVal).trim();
    var ov = String(originalVal === undefined || originalVal === null ? '' : originalVal).trim();
    if (!uv && !ov) return '';
    if (uv && ov && uv !== ov) {
        return '<span class="merge-cell modified" title="原值: ' + escapeHtml(ov || '空') + '">' + escapeHtml(uv) + '</span>';
    }
    if (uv && !ov) {
        return '<span class="merge-cell backfilled" title="来自修改后文件">' + escapeHtml(uv) + '</span>';
    }
    if (!uv && ov) {
        return '<span class="merge-cell original" title="保留原始值">' + escapeHtml(ov) + '</span>';
    }
    return escapeHtml(uv || ov);
}

function downloadDiffTemplate() {
    try {
        var templateData = [
            {
                '姓名': '张三',
                '部门': '示例部门',
                '公民身份号码': '110101199001011234',
                '军衔级别': '中校'
            },
            {
                '姓名': '李四',
                '部门': '示例部门',
                '公民身份号码': '110101199002022345',
                '军衔级别': '少校'
            },
            {
                '姓名': '王五',
                '部门': '示例部门',
                '公民身份号码': '110101199003033456',
                '军衔级别': '上尉'
            }
        ];
        
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.json_to_sheet(templateData);
        
        ws['!cols'] = [
            { wch: 12 },
            { wch: 20 },
            { wch: 20 },
            { wch: 12 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, '样表');
        
        var filename = '保障卡与人资差额对比样表.xlsx';
        
        XLSX.writeFile(wb, filename);
        
        alert('样表下载成功！\n\n样表包含示例数据，请参照格式填写您的数据。\n必填字段：姓名、部门、公民身份号码、军衔级别');
        
    } catch (error) {
        alert('样表下载失败: ' + error.message);
    }
}

function integrateDataFiles() {
    if (!mergeOriginalData || !mergeUpdatedData) {
        alert('请先上传原始文件和修改后文件');
        return;
    }

    var resultContainer = document.getElementById('dataMergeResultContainer');
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div class="loading">正在整合数据...</div>';

    setTimeout(function() {
        try {
            mergeResult = performDataMerge(MERGE_KEY_FIELD);
            displayMergeResult(mergeResult);
        } catch (error) {
            resultContainer.innerHTML = '<div class="error-message">整合失败: ' + escapeHtml(error.message) + '</div>';
        }
    }, 80);
}

function performDataMerge(keyField) {
    // 兼容旧调用方式：默认使用全局的 mergeOriginalData / mergeUpdatedData
    keyField = keyField || MERGE_KEY_FIELD;

    if (!window.DataMerge || typeof window.DataMerge.performDataMerge !== 'function') {
        throw new Error('DataMerge 模块未正确加载');
    }

    return window.DataMerge.performDataMerge(keyField, mergeOriginalData || [], mergeUpdatedData || []);
}

function displayMergeResult(result) {
    var container = document.getElementById('dataMergeResultContainer');
    if (!container) return;

    var total = result.mergedData.length;
    var statsHtml = '<div class="diff-result-header">' +
        '<h3 style="font-size: 16px; margin-bottom: 10px;"><i class="fa fa-check-circle"></i> 整合完成</h3>' +
        '<div style="font-size: 13px; color: #666;">关键字段：<strong>' + escapeHtml(result.keyField) + '</strong></div>' +
        '</div>';

    statsHtml += '<div class="diff-result-stats">' +
        '<div class="stat-card" style="background: #4caf50; color: #fff;">' +
            '<div class="stat-number">' + result.counts.merged + '</div>' +
            '<div class="stat-label">匹配整合</div>' +
        '</div>' +
        '<div class="stat-card" style="background: #ff9800; color: #fff;">' +
            '<div class="stat-number">' + result.counts.onlyUpdated + '</div>' +
            '<div class="stat-label">仅修改文件</div>' +
        '</div>' +
        '<div class="stat-card" style="background: #9e9e9e; color: #fff;">' +
            '<div class="stat-number">' + result.counts.onlyOriginal + '</div>' +
            '<div class="stat-label">仅原始文件</div>' +
        '</div>' +
    '</div>';

    statsHtml += '<div style="font-size: 13px; color: #666; margin-bottom: 10px;">' +
        '原始文件：' + result.originalTotal + ' 行，修改后文件：' + result.updatedTotal + ' 行，整合后总计：' + total + ' 行' +
        '</div>';

    statsHtml += '<div class="diff-export">' +
        '<button class="export-btn" onclick="exportMergedData()"><i class="fa fa-download"></i> 导出整合结果</button>' +
    '</div>';

    var tableHtml = '<div class="diff-table-container merge-table" style="max-height: 420px; overflow: auto;">' +
        '<table class="error-table">' +
        '<thead><tr>';

    for (var i = 0; i < result.displayFields.length; i++) {
        tableHtml += '<th>' + escapeHtml(result.displayFields[i]) + '</th>';
    }
    tableHtml += '</tr></thead><tbody>';

    if (result.mergedData.length === 0) {
        tableHtml += '<tr><td colspan="' + result.displayFields.length + '" style="text-align:center; color:#999;">暂无数据</td></tr>';
    } else {
        // 预建主键索引，避免每个单元格做O(n)线性查找（大表会卡死页面）
        var normCellKey = (typeof normalizeIdCard === 'function') ? normalizeIdCard : function(v) { return String(v || '').trim(); };
        var updatedIndexMap = {};
        var originalIndexMap = {};
        for (var ui = 0; ui < mergeUpdatedData.length; ui++) {
            updatedIndexMap[normCellKey(mergeUpdatedData[ui][MERGE_KEY_FIELD])] = mergeUpdatedData[ui];
        }
        for (var oi = 0; oi < mergeOriginalData.length; oi++) {
            originalIndexMap[normCellKey(mergeOriginalData[oi][MERGE_KEY_FIELD])] = mergeOriginalData[oi];
        }

        for (var rowIdx = 0; rowIdx < result.mergedData.length; rowIdx++) {
            var row = result.mergedData[rowIdx];
            var rowKey = normCellKey(row[MERGE_KEY_FIELD]);
            // 行级一次性找到对应记录用于展示备注
            var originalRow = null;
            var updatedRow = null;
            if (row[result.statusField] !== '仅原始文件存在') {
                updatedRow = updatedIndexMap[rowKey] || null;
            }
            if (row[result.statusField] !== '仅修改后文件存在') {
                originalRow = originalIndexMap[rowKey] || null;
            }
            tableHtml += '<tr>';
            for (var colIdx = 0; colIdx < result.displayFields.length; colIdx++) {
                var field = result.displayFields[colIdx];
                var value = row[field];
                if (field === result.statusField) {
                    tableHtml += '<td>' + escapeHtml(value === undefined ? '' : String(value)) + '</td>';
                } else {
                    var originalValue = originalRow ? originalRow[field] : '';
                    var updatedValue = updatedRow ? updatedRow[field] : '';
                    tableHtml += '<td>' + formatMergeCell(updatedValue || value, originalValue) + '</td>';
                }
            }
            tableHtml += '</tr>';
        }
    }

    tableHtml += '</tbody></table></div>';

    container.innerHTML = statsHtml + tableHtml;
}

function exportMergedData() {
    if (!mergeResult || !mergeResult.mergedData || mergeResult.mergedData.length === 0) {
        alert('暂无可导出的整合结果');
        return;
    }

    try {
        var ws = XLSX.utils.json_to_sheet(mergeResult.mergedData);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '数据整合结果');

        var now = new Date();
        var filename = '数据整合结果_' + now.getFullYear() + (now.getMonth() + 1) + now.getDate() + '.xlsx';
        XLSX.writeFile(wb, filename);

        alert('导出成功：' + filename);
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

function openDiffAudit() {
    document.getElementById('diffAuditModal').style.display = 'flex';
    resetDiffAudit();
}

function closeDiffAudit() {
    document.getElementById('diffAuditModal').style.display = 'none';
    resetDiffAudit();
}

function resetDiffAudit() {
    file1Data = null;
    file2Data = null;
    file3Data = null;
    file1Name = '';
    file2Name = '';
    file3Name = '';
    diffResult = null;
    noticeIndex = {};
    
    document.getElementById('file1Display').innerHTML = '';
    document.getElementById('file2Display').innerHTML = '';
    document.getElementById('file3Display').innerHTML = '';
    document.getElementById('diffResultContainer').style.display = 'none';
    document.getElementById('diffResultContainer').innerHTML = '';
    document.getElementById('compareBtn').disabled = true;
    
    var file1Input = document.getElementById('file1Input');
    var file2Input = document.getElementById('file2Input');
    var file3Input = document.getElementById('file3Input');
    if (file1Input) file1Input.value = '';
    if (file2Input) file2Input.value = '';
    if (file3Input) file3Input.value = '';
}

function openDataMerge() {
    document.getElementById('dataMergeModal').style.display = 'flex';
    resetDataMerge();
}

function closeDataMerge() {
    document.getElementById('dataMergeModal').style.display = 'none';
    resetDataMerge();
}

function resetDataMerge() {
    mergeOriginalData = null;
    mergeUpdatedData = null;
    mergeOriginalName = '';
    mergeUpdatedName = '';
    mergeResult = null;
    mergeOriginalFiles = [];
    mergeUpdatedFiles = [];
    mergeUpdatedSlotCounter = 0;

    var originalDisplay = document.getElementById('mergeOriginalDisplay');
    var updatedDisplay = document.getElementById('mergeUpdatedDisplay');
    var resultContainer = document.getElementById('dataMergeResultContainer');
    if (originalDisplay) originalDisplay.innerHTML = '';
    if (updatedDisplay) updatedDisplay.innerHTML = '';
    if (resultContainer) {
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';
    }

    var originalInput = document.getElementById('mergeOriginalInput');
    var updatedInput = document.getElementById('mergeUpdatedInput');
    if (originalInput) originalInput.value = '';
    if (updatedInput) updatedInput.value = '';

    updateMergeButton();
}

// selectFile函数已移除，现在使用点击上传区域或拖拽文件

document.addEventListener('DOMContentLoaded', function() {
    // 文件1：后勤供应实力
    var file1Input = document.getElementById('file1Input');
    var file1UploadArea = document.getElementById('file1UploadArea');
    
    if (file1Input) {
        file1Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                file1Name = file.name;
                readDiffExcelFile(file, 1);
                displayFile(file, 'file1Display', 'removeFile1');
            }
        });
    }
    
    if (file1UploadArea && file1Input) {
        file1UploadArea.addEventListener('click', function() {
            file1Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(file1UploadArea, function(file) {
                file1Name = file.name;
                readDiffExcelFile(file, 1);
                displayFile(file, 'file1Display', 'removeFile1');
            });
        }
    }
    
    // 文件2：人力资源实力
    var file2Input = document.getElementById('file2Input');
    var file2UploadArea = document.getElementById('file2UploadArea');
    
    if (file2Input) {
        file2Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                file2Name = file.name;
                readDiffExcelFile(file, 2);
                displayFile(file, 'file2Display', 'removeFile2');
            }
        });
    }
    
    if (file2UploadArea && file2Input) {
        file2UploadArea.addEventListener('click', function() {
            file2Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(file2UploadArea, function(file) {
                file2Name = file.name;
                readDiffExcelFile(file, 2);
                displayFile(file, 'file2Display', 'removeFile2');
            });
        }
    }
    
    // 文件3：通知单查询列表（可选）
    var file3Input = document.getElementById('file3Input');
    var file3UploadArea = document.getElementById('file3UploadArea');
    
    if (file3Input) {
        file3Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                file3Name = file.name;
                readNoticeExcelFile(file);
                displayFile(file, 'file3Display', 'removeFile3');
            }
        });
    }
    
    if (file3UploadArea && file3Input) {
        file3UploadArea.addEventListener('click', function() {
            file3Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(file3UploadArea, function(file) {
                file3Name = file.name;
                readNoticeExcelFile(file);
                displayFile(file, 'file3Display', 'removeFile3');
            });
        }
    }

    // 数据整合：原始文件
    var mergeOriginalInput = document.getElementById('mergeOriginalInput');
    var mergeOriginalUpload = document.getElementById('mergeOriginalUploadArea');
    if (mergeOriginalInput) {
        mergeOriginalInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                mergeOriginalName = file.name;
                readMergeExcelFile(file, 'original');
            }
        });
    }
    if (mergeOriginalUpload && mergeOriginalInput) {
        mergeOriginalUpload.addEventListener('click', function() {
            mergeOriginalInput.click();
        });
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(mergeOriginalUpload, function(file) {
                mergeOriginalName = file.name;
                readMergeExcelFile(file, 'original');
            });
        }
    }

    // 数据整合：修改后文件（支持多文件选择）
    var mergeUpdatedInput = document.getElementById('mergeUpdatedInput');
    var mergeUpdatedUpload = document.getElementById('mergeUpdatedUploadArea');
    if (mergeUpdatedInput) {
        mergeUpdatedInput.addEventListener('change', function(e) {
            var files = e.target.files;
            if (files && files.length > 0) {
                handleMultipleMergeFiles(files);
            }
        });
    }
    if (mergeUpdatedUpload && mergeUpdatedInput) {
        mergeUpdatedUpload.addEventListener('click', function() {
            mergeUpdatedInput.click();
        });
        
        // 支持拖拽多个文件
        if (typeof setupMultiFileDragAndDrop === 'function') {
            setupMultiFileDragAndDrop(mergeUpdatedUpload, handleMultipleMergeFiles);
        } else if (typeof setupDragAndDrop === 'function') {
            // 降级方案：使用原有的单文件拖拽
            setupDragAndDrop(mergeUpdatedUpload, function(file) {
                handleMultipleMergeFiles([file]);
            });
        }
    }
});

/**
 * 处理多个修改后文件
 * @param {FileList|Array} files - 文件列表
 */
function handleMultipleMergeFiles(files) {
    if (!files || files.length === 0) return;
    
    // 清空之前的文件
    mergeUpdatedFiles = [];
    var filesArray = Array.prototype.slice.call(files);
    var loadedCount = 0;
    
    // 显示加载状态
    updateMergeDisplay('updated');
    
    // 读取所有文件
    for (var i = 0; i < filesArray.length; i++) {
        (function(file, index) {
            readMergeExcelFile(file, 'updated', 'file_' + index);
        })(filesArray[i], i);
    }
}

/**
 * 存储修改后文件的数据
 * @param {string} fileId - 文件标识
 * @param {File} file - 文件对象
 * @param {Array} jsonData - 解析的数据
 */
function storeMergeUpdatedSlot(fileId, file, jsonData) {
    var fileInfo = {
        id: fileId,
        name: file.name,
        sizeText: (file.size / 1024).toFixed(2) + ' KB',
        data: jsonData
    };
    
    mergeUpdatedFiles.push(fileInfo);
    
    // 合并所有修改后文件的数据
    mergeMergeUpdatedData();
    updateMergeDisplay('updated');
    updateMergeButton();
}

/**
 * 合并所有修改后文件的数据
 * 使用身份证号码作为主键，去重合并
 */
function mergeMergeUpdatedData() {
    if (!mergeUpdatedFiles || mergeUpdatedFiles.length === 0) {
        mergeUpdatedData = null;
        return;
    }
    
    var allData = [];
    for (var i = 0; i < mergeUpdatedFiles.length; i++) {
        if (mergeUpdatedFiles[i].data) {
            allData = allData.concat(mergeUpdatedFiles[i].data);
        }
    }
    
    // 使用身份证号码去重合并（委托给 DataMerge 模块）
    if (window.DataMerge && typeof window.DataMerge.mergeRecordsByKey === 'function') {
        mergeUpdatedData = window.DataMerge.mergeRecordsByKey(allData, MERGE_KEY_FIELD);
    } else {
        // 兜底：如果模块未加载，则不做去重，直接返回拼接结果
        mergeUpdatedData = allData;
    }
}

function displayFile(file, containerId, removeFunc) {
    var container = document.getElementById(containerId);
    var sizeText = (file.size / 1024).toFixed(2) + ' KB';
    
    container.innerHTML = '<div class="file-item">' +
                            '<div class="file-info">' +
                                '<span class="file-icon"><i class="fa fa-file-excel-o"></i></span>' +
                                '<div>' +
                                    '<div class="file-name">' + escapeHtml(file.name) + '</div>' +
                                    '<div class="file-size">' + sizeText + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<button class="remove-btn" onclick="' + removeFunc + '()">移除</button>' +
                        '</div>';
}

function removeFile1() {
    file1Data = null;
    file1Name = '';
    document.getElementById('file1Input').value = '';
    document.getElementById('file1Display').innerHTML = '';
    document.getElementById('diffResultContainer').style.display = 'none';
    updateCompareButton();
}

function removeFile2() {
    file2Data = null;
    file2Name = '';
    document.getElementById('file2Input').value = '';
    document.getElementById('file2Display').innerHTML = '';
    document.getElementById('diffResultContainer').style.display = 'none';
    updateCompareButton();
}

function removeFile3() {
    file3Data = null;
    file3Name = '';
    noticeIndex = {};
    document.getElementById('file3Input').value = '';
    document.getElementById('file3Display').innerHTML = '';
    document.getElementById('diffResultContainer').style.display = 'none';
    updateCompareButton();
}

function removeMergeOriginal() {
    mergeOriginalData = null;
    mergeOriginalName = '';
    mergeOriginalFiles = [];
    var input = document.getElementById('mergeOriginalInput');
    if (input) input.value = '';
    var resultContainer = document.getElementById('dataMergeResultContainer');
    if (resultContainer) resultContainer.style.display = 'none';
    updateMergeDisplay('original');
    updateMergeButton();
}

function removeMergeUpdated() {
    mergeUpdatedData = null;
    mergeUpdatedName = '';
    mergeUpdatedFiles = [];
    var input = document.getElementById('mergeUpdatedInput');
    if (input) input.value = '';
    var resultContainer = document.getElementById('dataMergeResultContainer');
    if (resultContainer) resultContainer.style.display = 'none';
    updateMergeDisplay('updated');
    updateMergeButton();
}

function readDiffExcelFile(file, fileNum) {
    var reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, {type: 'array'});
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            var jsonData = XLSX.utils.sheet_to_json(firstSheet, {defval: '', raw: false});

            if (fileNum === 1) {
                file1Data = jsonData;
            } else {
                file2Data = jsonData;
            }
            
            updateCompareButton();
            
        } catch (error) {
            alert('文件读取失败: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('文件读取失败');
    };
    
    reader.readAsArrayBuffer(file);
}

function readMergeExcelFile(file, type, fileId) {
    var reader = new FileReader();

    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, {type: 'array'});
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            var jsonData = XLSX.utils.sheet_to_json(firstSheet, {defval: '', raw: false});

            if (type === 'original') {
                mergeOriginalData = jsonData;
                mergeOriginalFiles = [createFileInfo(file)];
                updateMergeDisplay('original');
                updateMergeButton();
            } else {
                storeMergeUpdatedSlot(fileId, file, jsonData);
            }

            updateCompareButton();

        } catch (error) {
            alert('文件读取失败: ' + error.message);
        }
    };

    reader.onerror = function() {
        alert('文件读取失败');
    };

    reader.readAsArrayBuffer(file);
}

function readNoticeExcelFile(file) {
    var reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, {type: 'array'});
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            var jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                defval: '',
                header: 1,
                range: 1,
                raw: false
            });
            
            var headers = jsonData[0];
            file3Data = [];
            
            for (var i = 1; i < jsonData.length; i++) {
                var row = jsonData[i];
                if (row && row.length > 0) {
                    var obj = {};
                    for (var j = 0; j < headers.length; j++) {
                        obj[headers[j]] = row[j] || '';
                    }
                    file3Data.push(obj);
                }
            }
            
            buildNoticeIndex();
            
            updateCompareButton();
            
            alert('通知单文件读取成功！共 ' + file3Data.length + ' 条记录');
            
        } catch (error) {
            alert('通知单文件读取失败: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('通知单文件读取失败');
    };
    
    reader.readAsArrayBuffer(file);
}

function buildNoticeIndex() {
    noticeIndex = {};
    
    if (!file3Data || file3Data.length === 0) {
        return;
    }
    
    for (var i = 0; i < file3Data.length; i++) {
        var notice = file3Data[i];
        var idCard = (typeof normalizeIdCard === 'function') ? normalizeIdCard(notice['公民身份号码']) : String(notice['公民身份号码'] || '').trim();
        
        if (!idCard) continue;
        
        var dateStr = String(notice['通知单日期'] || '').trim();
        var noticeDate = parseNoticeDate(dateStr);
        
        if (noticeIndex[idCard]) {
            var existingDate = parseNoticeDate(noticeIndex[idCard]['通知单日期']);
            if (noticeDate > existingDate) {
                noticeIndex[idCard] = notice;
            }
        } else {
            noticeIndex[idCard] = notice;
        }
    }
}

function parseNoticeDate(dateStr) {
    if (!dateStr) return new Date(0);
    
    dateStr = String(dateStr).trim();
    
    var parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
    }
    
    var date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date(0) : date;
}

function getNoticeReason(idCard) {
    if (!idCard || !noticeIndex || Object.keys(noticeIndex).length === 0) {
        return '';
    }
    
    var notice = noticeIndex[(typeof normalizeIdCard === 'function') ? normalizeIdCard(idCard) : String(idCard).trim()];
    if (notice && notice['通知单类型']) {
        return String(notice['通知单类型']).trim();
    }
    
    return '';
}

function updateCompareButton() {
    var btn = document.getElementById('compareBtn');
    btn.disabled = !(file1Data && file2Data);
}

function updateMergeButton() {
    var btn = document.getElementById('mergeBtn');
    if (!btn) return;
    btn.disabled = !(mergeOriginalData && mergeUpdatedData);
}

function compareDiff() {
    if (!file1Data || !file2Data) {
        alert('请先上传必填文件（保障卡数据、人资数据）');
        return;
    }
    
    var resultContainer = document.getElementById('diffResultContainer');
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div class="loading">正在比对数据...</div>';
    
    setTimeout(function() {
        try {
            var keyField = '公民身份号码';
            
            diffResult = performDiff(file1Data, file2Data, keyField);
            
            displayDiffResult(diffResult, keyField);
            
        } catch (error) {
            resultContainer.innerHTML = '<div class="error-message">比对失败: ' + escapeHtml(error.message) + '</div>';
        }
    }, 100);
}

function performDiff(data1, data2, keyField) {
    // 主键归一化：去空格、末位x统一大写、全角转半角（定义见字段标准化.js）
    var normKey = (typeof normalizeIdCard === 'function') ? normalizeIdCard : function(v) { return String(v || '').trim(); };

    var index1 = {};
    var index2 = {};

    for (var i = 0; i < data1.length; i++) {
        var key = normKey(data1[i][keyField]);
        if (key) {
            index1[key] = data1[i];
        }
    }

    for (var i = 0; i < data2.length; i++) {
        var key = normKey(data2[i][keyField]);
        if (key) {
            index2[key] = data2[i];
        }
    }

    // 预检：数据非空但索引为空说明主键列缺失，直接比对只会产出全量"缺失"误报
    if (data1.length > 0 && Object.keys(index1).length === 0) {
        throw new Error('保障卡数据中未找到有效的"公民身份号码"列，请检查表头命名或该列是否全部为空');
    }
    if (data2.length > 0 && Object.keys(index2).length === 0) {
        throw new Error('人资数据中未找到有效的"公民身份号码"列，请检查表头命名或该列是否全部为空');
    }
    
    var onlyInFile1 = [];
    var onlyInFile2 = [];
    var inBoth = [];
    
    for (var key in index1) {
        if (index2[key]) {
            inBoth.push({
                key: key,
                data1: index1[key],
                data2: index2[key]
            });
        } else {
            onlyInFile1.push({
                key: key,
                data: index1[key]
            });
        }
    }
    
    for (var key in index2) {
        if (!index1[key]) {
            onlyInFile2.push({
                key: key,
                data: index2[key]
            });
        }
    }
    
    return {
        onlyInFile1: onlyInFile1,
        onlyInFile2: onlyInFile2,
        inBoth: inBoth,
        total1: data1.length,
        total2: data2.length,
        keyField: keyField
    };
}

function displayDiffResult(result, keyField) {
    var resultContainer = document.getElementById('diffResultContainer');
    
    var html = '<div class="diff-result-header">' +
                   '<h3 style="font-size: 16px; margin-bottom: 10px;"><i class="fa fa-check-circle"></i> 比对完成</h3>' +
                   '<div style="font-size: 13px; color: #666;">关键字段：<strong>' + keyField + '</strong></div>' +
                   '</div>';
    
    html += '<div class="diff-result-stats">' +
                '<div class="stat-card only-card1">' +
                    '<div class="stat-number">' + result.onlyInFile1.length + '</div>' +
                    '<div class="stat-label">仅在保障卡中</div>' +
                '</div>' +
                '<div class="stat-card only-card2">' +
                    '<div class="stat-number">' + result.onlyInFile2.length + '</div>' +
                    '<div class="stat-label">仅在人资中</div>' +
                '</div>' +
            '</div>';
    
    html += '<div class="diff-tabs">' +
                '<button class="diff-tab active" onclick="showDiffTab(\'only1\')">仅在保障卡中 (' + result.onlyInFile1.length + ')</button>' +
                '<button class="diff-tab" onclick="showDiffTab(\'only2\')">仅在人资中 (' + result.onlyInFile2.length + ')</button>' +
            '</div>';
    
    html += '<div id="diffTabContent"></div>';
    
    html += '<div class="diff-export">' +
                '<button class="export-btn" onclick="exportDiffResult()"><i class="fa fa-download"></i> 导出差额报告</button>' +
            '</div>';
    
    resultContainer.innerHTML = html;
    
    showDiffTab('only1');
}

function showDiffTab(tab) {
    var tabs = document.querySelectorAll('.diff-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    
    if (tab === 'only1') {
        tabs[0].classList.add('active');
        displayOnlyInFile1();
    } else if (tab === 'only2') {
        tabs[1].classList.add('active');
        displayOnlyInFile2();
    }
}

function displayOnlyInFile1() {
    var content = document.getElementById('diffTabContent');
    if (!diffResult || diffResult.onlyInFile1.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无数据</div>';
        return;
    }
    
    var data = diffResult.onlyInFile1;
    var keyField = diffResult.keyField;
    
    var html = '<div class="diff-table-container">' +
                   '<table class="error-table">' +
                       '<thead>' +
                           '<tr>' +
                               '<th>序号</th>' +
                               '<th>' + keyField + '</th>' +
                               '<th>姓名</th>' +
                               '<th>部门</th>' +
                               '<th>军衔级别</th>' +
                           '</tr>' +
                       '</thead>' +
                       '<tbody>';
    
    for (var i = 0; i < data.length; i++) {
        var row = data[i].data;
        html += '<tr>' +
                    '<td>' + (i + 1) + '</td>' +
                    '<td>' + escapeHtml(data[i].key) + '</td>' +
                    '<td>' + escapeHtml(row['姓名'] || '-') + '</td>' +
                    '<td>' + escapeHtml(row['部门'] || '-') + '</td>' +
                    '<td>' + escapeHtml(row['军衔级别'] || '-') + '</td>' +
                '</tr>';
    }
    
    html += '</tbody></table></div>';
    content.innerHTML = html;
}

function displayOnlyInFile2() {
    var content = document.getElementById('diffTabContent');
    if (!diffResult || diffResult.onlyInFile2.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无数据</div>';
        return;
    }
    
    var data = diffResult.onlyInFile2;
    var keyField = diffResult.keyField;
    
    var html = '<div class="diff-table-container">' +
                   '<table class="error-table">' +
                       '<thead>' +
                           '<tr>' +
                               '<th>序号</th>' +
                               '<th>' + keyField + '</th>' +
                               '<th>姓名</th>' +
                               '<th>部门</th>' +
                               '<th>军衔级别</th>' +
                           '</tr>' +
                       '</thead>' +
                       '<tbody>';
    
    for (var i = 0; i < data.length; i++) {
        var row = data[i].data;
        html += '<tr>' +
                    '<td>' + (i + 1) + '</td>' +
                    '<td>' + escapeHtml(data[i].key) + '</td>' +
                    '<td>' + escapeHtml(row['姓名'] || '-') + '</td>' +
                    '<td>' + escapeHtml(row['部门'] || '-') + '</td>' +
                    '<td>' + escapeHtml(row['军衔级别'] || '-') + '</td>' +
                '</tr>';
    }
    
    html += '</tbody></table></div>';
    content.innerHTML = html;
}


function exportDiffResult() {
    if (!diffResult) {
        alert('没有可导出的数据');
        return;
    }
    
    try {
        var wb = XLSX.utils.book_new();
        
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var day = now.getDate();
        var dateStr = year + '年' + month + '月' + day + '日';
        
        var sheetData = [];
        
        sheetData.push(['人力资源实力与后勤供应实力联审差额明细表']);
        
        sheetData.push(['填制单位：（请填写）        人力资源部门：（请填写）     统计日期：' + dateStr]);
        
        sheetData.push([]);
        
        var hasNotice = file3Data && file3Data.length > 0;
        
        if (hasNotice) {
            sheetData.push(['序号', '姓名', '部门', '公民身份号码', '军衔级别', '差额原因', '备注']);
        } else {
            sheetData.push(['序号', '姓名', '部门', '公民身份号码', '军衔级别', '备注']);
        }
        
        sheetData.push(['一、人力资源实力有，后勤供应实力无']);
        
        if (diffResult.onlyInFile2.length > 0) {
            for (var i = 0; i < diffResult.onlyInFile2.length; i++) {
                var idCard = diffResult.onlyInFile2[i].key;
                var row = [
                    i + 1,
                    diffResult.onlyInFile2[i].data['姓名'] || '',
                    diffResult.onlyInFile2[i].data['部门'] || '',
                    idCard,
                    diffResult.onlyInFile2[i].data['军衔级别'] || ''
                ];
                
                if (hasNotice) {
                    var reason = getNoticeReason(idCard);
                    row.push(reason);
                }
                
                row.push('');
                sheetData.push(row);
            }
        } else {
            if (hasNotice) {
                sheetData.push(['', '无', '', '', '', '', '']);
            } else {
                sheetData.push(['', '无', '', '', '', '']);
            }
        }
        
        sheetData.push([]);
        
        sheetData.push(['二、后勤供应实力有，人力资源实力无']);
        
        if (diffResult.onlyInFile1.length > 0) {
            for (var i = 0; i < diffResult.onlyInFile1.length; i++) {
                var idCard = diffResult.onlyInFile1[i].key;
                var row = [
                    i + 1,
                    diffResult.onlyInFile1[i].data['姓名'] || '',
                    diffResult.onlyInFile1[i].data['部门'] || '',
                    idCard,
                    diffResult.onlyInFile1[i].data['军衔级别'] || ''
                ];
                
                if (hasNotice) {
                    var reason = getNoticeReason(idCard);
                    row.push(reason);
                }
                
                row.push('');
                sheetData.push(row);
            }
        } else {
            if (hasNotice) {
                sheetData.push(['', '无', '', '', '', '', '']);
            } else {
                sheetData.push(['', '无', '', '', '', '']);
            }
        }
        
        var ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        if (hasNotice) {
            ws['!cols'] = [
                { wch: 6 },
                { wch: 10 },
                { wch: 20 },
                { wch: 20 },
                { wch: 12 },
                { wch: 15 },
                { wch: 15 }
            ];
        } else {
            ws['!cols'] = [
                { wch: 6 },
                { wch: 10 },
                { wch: 20 },
                { wch: 20 },
                { wch: 12 },
                { wch: 15 }
            ];
        }
        
        var lastCol = hasNotice ? 6 : 5;
        var merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
            { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } }
        ];
        
        var section2Row = 5 + (diffResult.onlyInFile2.length > 0 ? diffResult.onlyInFile2.length : 1) + 1;
        merges.push({ s: { r: section2Row, c: 0 }, e: { r: section2Row, c: lastCol } });
        
        ws['!merges'] = merges;
        
        XLSX.utils.book_append_sheet(wb, ws, '差额明细表');
        
        var filename = '人力资源实力与后勤供应实力联审差额明细表_' + year + month + day + '.xlsx';
        
        XLSX.writeFile(wb, filename);
        
        var message = '导出成功！\n文件名：' + filename;
        
        if (hasNotice) {
            var matchedCount = 0;
            var totalCount = diffResult.onlyInFile1.length + diffResult.onlyInFile2.length;
            
            for (var i = 0; i < diffResult.onlyInFile1.length; i++) {
                if (getNoticeReason(diffResult.onlyInFile1[i].key)) {
                    matchedCount++;
                }
            }
            for (var i = 0; i < diffResult.onlyInFile2.length; i++) {
                if (getNoticeReason(diffResult.onlyInFile2[i].key)) {
                    matchedCount++;
                }
            }
            
            message += '\n\n通知单匹配情况：\n- 共 ' + totalCount + ' 条差额记录\n- 匹配到通知单 ' + matchedCount + ' 条\n- 未匹配 ' + (totalCount - matchedCount) + ' 条';
            
            if ((totalCount - matchedCount) > 0) {
                message += '\n\n提示：有 ' + (totalCount - matchedCount) + ' 条记录未匹配到通知单，差额原因为空，需手工填写。';
            }
        } else {
            message += '\n\n提示：未上传通知单，导出的Excel中不包含"差额原因"列。';
        }
        
        alert(message);
        
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
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

