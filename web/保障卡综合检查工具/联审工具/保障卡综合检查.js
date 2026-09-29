/**
 * 保障卡综合数据检查模块
 * 功能：对比保障卡、人资、财务、被装四表数据的一致性
 */

// 全局变量：存储四个文件的数据
var compFile1Data = null;  // 保障卡数据
var compFile2Data = null;  // 人资数据
var compFile3Data = null;  // 财务数据
var compFile4Data = null;  // 被装数据
var compFile1Name = '';    // 保障卡文件名
var compFile2Name = '';    // 人资文件名
var compFile3Name = '';    // 财务文件名
var compFile4Name = '';    // 被装文件名
var compCheckResult = null; // 检查结果

/**
 * 下载综合检查样表
 * 生成包含示例数据的Excel样表供用户参考
 */
function downloadCompTemplate() {
    try {
        var templateData = [
            {
                '姓名': '张三',
                '公民身份号码': '110101199001011234',
                '人员类别': '现役军官',
                '军衔文职级': '中校',
                '岗位职务层级': '正营职',
                '待遇级别': '正营职（十八级）'
            },
            {
                '姓名': '李四',
                '公民身份号码': '110101199002022345',
                '人员类别': '现役军官',
                '军衔文职级': '少校',
                '岗位职务层级': '副营职',
                '待遇级别': '副营职（十九级）'
            },
            {
                '姓名': '王五',
                '公民身份号码': '110101199003033456',
                '人员类别': '文职人员',
                '军衔文职级': '专业技术九级',
                '岗位职务层级': '初职（助理级）',
                '待遇级别': '专业技术九级'
            }
        ];
        
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.json_to_sheet(templateData);
        
        ws['!cols'] = [
            { wch: 12 },
            { wch: 20 },
            { wch: 15 },
            { wch: 18 },
            { wch: 18 },
            { wch: 22 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, '样表');
        
        var filename = '保障卡综合数据检查样表.xlsx';
        
        XLSX.writeFile(wb, filename);
        
        alert('样表下载成功！\n\n样表包含示例数据，请参照格式填写您的数据。\n必填字段：姓名、公民身份号码、人员类别、军衔文职级、岗位职务层级、待遇级别\n\n提示：系统支持智能匹配，如"初职（助理级）"和"初职助理级"会被识别为相同。');
        
    } catch (error) {
        alert('样表下载失败: ' + error.message);
    }
}

/**
 * 打开综合检查弹窗
 */
function openComprehensiveCheck() {
    document.getElementById('comprehensiveCheckModal').style.display = 'flex';
    resetComprehensiveCheck();
}

/**
 * 关闭综合检查弹窗
 */
function closeComprehensiveCheck() {
    document.getElementById('comprehensiveCheckModal').style.display = 'none';
    resetComprehensiveCheck();
}

/**
 * 重置综合检查状态
 * 清空所有上传的文件和检查结果
 */
function resetComprehensiveCheck() {
    compFile1Data = null;
    compFile2Data = null;
    compFile3Data = null;
    compFile4Data = null;
    compFile1Name = '';
    compFile2Name = '';
    compFile3Name = '';
    compFile4Name = '';
    compCheckResult = null;
    
    document.getElementById('compFile1Display').innerHTML = '';
    document.getElementById('compFile2Display').innerHTML = '';
    document.getElementById('compFile3Display').innerHTML = '';
    document.getElementById('compFile4Display').innerHTML = '';
    document.getElementById('compResultContainer').style.display = 'none';
    document.getElementById('compResultContainer').innerHTML = '';
    document.getElementById('compCheckBtn').disabled = true;
    
    var file1Input = document.getElementById('compFile1Input');
    var file2Input = document.getElementById('compFile2Input');
    var file3Input = document.getElementById('compFile3Input');
    var file4Input = document.getElementById('compFile4Input');
    if (file1Input) file1Input.value = '';
    if (file2Input) file2Input.value = '';
    if (file3Input) file3Input.value = '';
    if (file4Input) file4Input.value = '';
}

// selectCompFile函数已移除，现在使用点击上传区域或拖拽文件

document.addEventListener('DOMContentLoaded', function() {
    // 文件1：保障卡数据
    var compFile1Input = document.getElementById('compFile1Input');
    var compFile1UploadArea = document.getElementById('compFile1UploadArea');
    
    if (compFile1Input) {
        compFile1Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                compFile1Name = file.name;
                readCompExcelFile(file, 1);
                displayFile(file, 'compFile1Display', 'removeCompFile1');
            }
        });
    }
    
    if (compFile1UploadArea && compFile1Input) {
        compFile1UploadArea.addEventListener('click', function() {
            compFile1Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(compFile1UploadArea, function(file) {
                compFile1Name = file.name;
                readCompExcelFile(file, 1);
                displayFile(file, 'compFile1Display', 'removeCompFile1');
            });
        }
    }
    
    // 文件2：人资数据
    var compFile2Input = document.getElementById('compFile2Input');
    var compFile2UploadArea = document.getElementById('compFile2UploadArea');
    
    if (compFile2Input) {
        compFile2Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                compFile2Name = file.name;
                readCompExcelFile(file, 2);
                displayFile(file, 'compFile2Display', 'removeCompFile2');
            }
        });
    }
    
    if (compFile2UploadArea && compFile2Input) {
        compFile2UploadArea.addEventListener('click', function() {
            compFile2Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(compFile2UploadArea, function(file) {
                compFile2Name = file.name;
                readCompExcelFile(file, 2);
                displayFile(file, 'compFile2Display', 'removeCompFile2');
            });
        }
    }
    
    // 文件3：财务数据
    var compFile3Input = document.getElementById('compFile3Input');
    var compFile3UploadArea = document.getElementById('compFile3UploadArea');
    
    if (compFile3Input) {
        compFile3Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                compFile3Name = file.name;
                readCompExcelFile(file, 3);
                displayFile(file, 'compFile3Display', 'removeCompFile3');
            }
        });
    }
    
    if (compFile3UploadArea && compFile3Input) {
        compFile3UploadArea.addEventListener('click', function() {
            compFile3Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(compFile3UploadArea, function(file) {
                compFile3Name = file.name;
                readCompExcelFile(file, 3);
                displayFile(file, 'compFile3Display', 'removeCompFile3');
            });
        }
    }
    
    // 文件4：被装数据
    var compFile4Input = document.getElementById('compFile4Input');
    var compFile4UploadArea = document.getElementById('compFile4UploadArea');
    
    if (compFile4Input) {
        compFile4Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                compFile4Name = file.name;
                readCompExcelFile(file, 4);
                displayFile(file, 'compFile4Display', 'removeCompFile4');
            }
        });
    }
    
    if (compFile4UploadArea && compFile4Input) {
        compFile4UploadArea.addEventListener('click', function() {
            compFile4Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(compFile4UploadArea, function(file) {
                compFile4Name = file.name;
                readCompExcelFile(file, 4);
                displayFile(file, 'compFile4Display', 'removeCompFile4');
            });
        }
    }
});

function readCompExcelFile(file, fileNum) {
    var reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, {type: 'array'});
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            var jsonData = XLSX.utils.sheet_to_json(firstSheet, {defval: '', raw: false});
            
            if (fileNum === 1) {
                compFile1Data = jsonData;
            } else if (fileNum === 2) {
                compFile2Data = jsonData;
            } else if (fileNum === 3) {
                compFile3Data = jsonData;
            } else if (fileNum === 4) {
                compFile4Data = jsonData;
            }
            
            updateCompCheckButton();
            
        } catch (error) {
            alert('文件读取失败: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('文件读取失败');
    };
    
    reader.readAsArrayBuffer(file);
}

function removeCompFile1() {
    compFile1Data = null;
    compFile1Name = '';
    document.getElementById('compFile1Input').value = '';
    document.getElementById('compFile1Display').innerHTML = '';
    document.getElementById('compResultContainer').style.display = 'none';
    updateCompCheckButton();
}

function removeCompFile2() {
    compFile2Data = null;
    compFile2Name = '';
    document.getElementById('compFile2Input').value = '';
    document.getElementById('compFile2Display').innerHTML = '';
    document.getElementById('compResultContainer').style.display = 'none';
    updateCompCheckButton();
}

function removeCompFile3() {
    compFile3Data = null;
    compFile3Name = '';
    document.getElementById('compFile3Input').value = '';
    document.getElementById('compFile3Display').innerHTML = '';
    document.getElementById('compResultContainer').style.display = 'none';
    updateCompCheckButton();
}

function removeCompFile4() {
    compFile4Data = null;
    compFile4Name = '';
    document.getElementById('compFile4Input').value = '';
    document.getElementById('compFile4Display').innerHTML = '';
    document.getElementById('compResultContainer').style.display = 'none';
    updateCompCheckButton();
}

/**
 * 更新检查按钮状态
 * 只有四个文件都上传后才启用检查按钮
 */
function updateCompCheckButton() {
    var btn = document.getElementById('compCheckBtn');
    btn.disabled = !(compFile1Data && compFile2Data && compFile3Data && compFile4Data);
}

/**
 * 开始综合数据检查
 * 检查四表数据的一致性
 */
function checkComprehensiveData() {
    if (!compFile1Data || !compFile2Data || !compFile3Data || !compFile4Data) {
        alert('请先上传所有文件（保障卡、人资、财务、被装）');
        return;
    }
    
    var resultContainer = document.getElementById('compResultContainer');
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div class="loading">正在检查数据...</div>';
    
    setTimeout(function() {
        try {
            compCheckResult = performComprehensiveCheck();
            
            displayCompCheckResult(compCheckResult);
            
        } catch (error) {
            resultContainer.innerHTML = '<div class="error-message">检查失败: ' + escapeHtml(error.message) + '</div>';
        }
    }, 100);
}

/**
 * 执行综合数据检查
 * @returns {Object} 检查结果对象，包含总数、错误数和错误详情
 * 
 * 检查逻辑：
 * 1. 以身份证号为主键，建立四表索引
 * 2. 遍历保障卡数据，检查在其他三表中的一致性
 * 3. 检查项目包括：缺失、姓名、岗位职务层级、军衔文职级、待遇级别、人员类别
 */
function performComprehensiveCheck() {
    // 主键归一化：去空格、末位x统一大写、全角转半角（定义见字段标准化.js）
    var normKey = (typeof normalizeIdCard === 'function') ? normalizeIdCard : function(v) { return String(v || '').trim(); };
    
    // 兼容"身份证号码/身份证号"等常见主键列名
    function resolveKeyField(data) {
        if (data && data.length > 0) {
            if (data[0].hasOwnProperty('公民身份号码')) return '公民身份号码';
            if (data[0].hasOwnProperty('身份证号码')) return '身份证号码';
            if (data[0].hasOwnProperty('身份证号')) return '身份证号';
        }
        return '公民身份号码';
    }
    
    // 创建索引：以身份证号为key，快速查找人员信息
    var cardIndex = {};  // 保障卡索引
    var hrIndex = {};    // 人资索引
    var finIndex = {};   // 财务索引
    var uniIndex = {};   // 被装索引
    
    var tableKeyFields = [
        resolveKeyField(compFile1Data),
        resolveKeyField(compFile2Data),
        resolveKeyField(compFile3Data),
        resolveKeyField(compFile4Data)
    ];
    
    // 索引保障卡数据
    for (var i = 0; i < compFile1Data.length; i++) {
        var key = normKey(compFile1Data[i][tableKeyFields[0]]);
        if (key) cardIndex[key] = compFile1Data[i];
    }
    
    // 索引人资数据
    for (var j = 0; j < compFile2Data.length; j++) {
        var key = normKey(compFile2Data[j][tableKeyFields[1]]);
        if (key) hrIndex[key] = compFile2Data[j];
    }
    
    // 索引财务数据
    for (var k = 0; k < compFile3Data.length; k++) {
        var key = normKey(compFile3Data[k][tableKeyFields[2]]);
        if (key) finIndex[key] = compFile3Data[k];
    }
    
    // 索引被装数据
    for (var m = 0; m < compFile4Data.length; m++) {
        var key = normKey(compFile4Data[m][tableKeyFields[3]]);
        if (key) uniIndex[key] = compFile4Data[m];
    }
    
    // 预检：某表有数据但索引为空，说明主键列缺失或全空，直接比对只会产出全量"缺失"误报
    var prechecks = [
        { name: '保障卡', index: cardIndex, data: compFile1Data },
        { name: '人资', index: hrIndex, data: compFile2Data },
        { name: '财务', index: finIndex, data: compFile3Data },
        { name: '被装', index: uniIndex, data: compFile4Data }
    ];
    for (var p = 0; p < prechecks.length; p++) {
        if (prechecks[p].data.length > 0 && Object.keys(prechecks[p].index).length === 0) {
            throw new Error('「' + prechecks[p].name + '」表中未找到有效的主键列（公民身份号码/身份证号码/身份证号），请检查表头命名或该列是否全部为空');
        }
    }
    
    var errors = [];
    
    // 收集所有人员的身份证号（并集）
    var allKeys = {};
    for (var key in cardIndex) allKeys[key] = true;
    for (var key in hrIndex) allKeys[key] = true;
    for (var key in finIndex) allKeys[key] = true;
    for (var key in uniIndex) allKeys[key] = true;
    
    // 遍历所有人员，检查数据一致性
    for (var key in allKeys) {
        var cardData = cardIndex[key];
        var hrData = hrIndex[key];
        var finData = finIndex[key];
        var uniData = uniIndex[key];
        
        var personErrors = [];
        
        // 如果保障卡没有此人，但其他表有，也要报告
        if (!cardData) {
            var sourceName = hrData ? (hrData['姓名'] || '') : (finData ? (finData['姓名'] || '') : (uniData ? (uniData['姓名'] || '') : ''));
            var sources = [];
            if (hrData) sources.push('人资');
            if (finData) sources.push('财务');
            if (uniData) sources.push('被装');
            personErrors.push({
                type: '缺失',
                source: '保障卡',
                description: sources.join('、') + '有此人，但保障卡数据中缺失'
            });
            errors.push({
                idCard: key,
                name: sourceName,
                dept: '',
                errors: personErrors
            });
            continue;
        }
        
        if (!hrData) {
            personErrors.push({
                type: '缺失',
                source: '人资',
                description: '保障卡有此人，但人资数据中缺失'
            });
        } else {
            if (!compareFields(cardData['姓名'], hrData['姓名'], 'normal')) {
                personErrors.push({
                    type: '不一致',
                    source: '人资-姓名',
                    description: '保障卡：' + cardData['姓名'] + '，人资：' + hrData['姓名']
                });
            }
            if (cardData['岗位职务层级'] && hrData['岗位职务层级']) {
                if (!compareFields(cardData['岗位职务层级'], hrData['岗位职务层级'], 'positionLevel')) {
                    personErrors.push({
                        type: '不一致',
                        source: '人资-岗位职务层级',
                        description: '保障卡：' + cardData['岗位职务层级'] + '，人资：' + hrData['岗位职务层级']
                    });
                }
            }
            if (cardData['军衔文职级'] && hrData['军衔文职级']) {
                if (!compareFields(cardData['军衔文职级'], hrData['军衔文职级'], 'rank')) {
                    personErrors.push({
                        type: '不一致',
                        source: '人资-军衔文职级',
                        description: '保障卡：' + cardData['军衔文职级'] + '，人资：' + hrData['军衔文职级']
                    });
                }
            }
        }
        
        if (!finData) {
            personErrors.push({
                type: '缺失',
                source: '财务',
                description: '保障卡有此人，但财务数据中缺失'
            });
        } else {
            if (!compareFields(cardData['姓名'], finData['姓名'], 'normal')) {
                personErrors.push({
                    type: '不一致',
                    source: '财务-姓名',
                    description: '保障卡：' + cardData['姓名'] + '，财务：' + finData['姓名']
                });
            }
            if (cardData['岗位职务层级'] && finData['岗位职务层级']) {
                if (!compareFields(cardData['岗位职务层级'], finData['岗位职务层级'], 'positionLevel')) {
                    personErrors.push({
                        type: '不一致',
                        source: '财务-岗位职务层级',
                        description: '保障卡：' + cardData['岗位职务层级'] + '，财务：' + finData['岗位职务层级']
                    });
                }
            }
            if (cardData['待遇级别'] && finData['待遇级别']) {
                if (!compareFields(cardData['待遇级别'], finData['待遇级别'], 'treatmentLevel')) {
                    personErrors.push({
                        type: '不一致',
                        source: '财务-待遇级别',
                        description: '保障卡：' + cardData['待遇级别'] + '，财务：' + finData['待遇级别']
                    });
                }
            }
            if (cardData['人员类别'] && finData['人员类别']) {
                if (!compareFields(cardData['人员类别'], finData['人员类别'], 'normal')) {
                    personErrors.push({
                        type: '不一致',
                        source: '财务-人员类别',
                        description: '保障卡：' + cardData['人员类别'] + '，财务：' + finData['人员类别']
                    });
                }
            }
        }
        
        if (!uniData) {
            personErrors.push({
                type: '缺失',
                source: '被装',
                description: '保障卡有此人，但被装数据中缺失'
            });
        } else {
            if (!compareFields(cardData['姓名'], uniData['姓名'], 'normal')) {
                personErrors.push({
                    type: '不一致',
                    source: '被装-姓名',
                    description: '保障卡：' + cardData['姓名'] + '，被装：' + uniData['姓名']
                });
            }
            if (cardData['人员类别'] && uniData['人员类别']) {
                if (!compareFields(cardData['人员类别'], uniData['人员类别'], 'normal')) {
                    personErrors.push({
                        type: '不一致',
                        source: '被装-人员类别',
                        description: '保障卡：' + cardData['人员类别'] + '，被装：' + uniData['人员类别']
                    });
                }
            }
        }
        
        if (personErrors.length > 0) {
            errors.push({
                idCard: key,
                name: cardData['姓名'] || '',
                dept: cardData['部门'] || '',
                errors: personErrors
            });
        }
    }
    
    return {
        totalCheck: Object.keys(allKeys).length,
        errorCount: errors.length,
        errors: errors,
        stats: {
            cardCount: Object.keys(cardIndex).length,
            hrCount: Object.keys(hrIndex).length,
            finCount: Object.keys(finIndex).length,
            uniCount: Object.keys(uniIndex).length
        }
    };
}

function displayCompCheckResult(result) {
    var resultContainer = document.getElementById('compResultContainer');
    
    var html = '<div class="diff-result-header">' +
                   '<h3 style="font-size: 16px; margin-bottom: 10px;"><i class="fa fa-check-circle"></i> 检查完成</h3>' +
                   '<div style="font-size: 13px; color: #666; margin-bottom: 10px;">共检查 ' + result.totalCheck + ' 人（去重后），发现 ' + result.errorCount + ' 人存在问题</div>' +
                   '<div style="font-size: 12px; color: #999; display: flex; gap: 15px;">' +
                       '<span>保障卡：' + result.stats.cardCount + '人</span>' +
                       '<span>人资：' + result.stats.hrCount + '人</span>' +
                       '<span>财务：' + result.stats.finCount + '人</span>' +
                       '<span>被装：' + result.stats.uniCount + '人</span>' +
                   '</div>' +
               '</div>';
    
    if (result.errorCount > 0) {
        html += '<div class="diff-table-container">' +
                    '<table class="error-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th>序号</th>' +
                                '<th>公民身份号码</th>' +
                                '<th>姓名</th>' +
                                '<th>部门</th>' +
                                '<th>问题类型</th>' +
                                '<th>问题来源</th>' +
                                '<th>问题描述</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>';
        
        var rowNum = 1;
        for (var i = 0; i < result.errors.length; i++) {
            var person = result.errors[i];
            for (var j = 0; j < person.errors.length; j++) {
                var error = person.errors[j];
                html += '<tr>' +
                            '<td>' + rowNum + '</td>' +
                            '<td>' + escapeHtml(person.idCard) + '</td>' +
                            '<td>' + escapeHtml(person.name) + '</td>' +
                            '<td>' + escapeHtml(person.dept) + '</td>' +
                            '<td>' + escapeHtml(error.type) + '</td>' +
                            '<td>' + escapeHtml(error.source) + '</td>' +
                            '<td>' + escapeHtml(error.description) + '</td>' +
                        '</tr>';
                rowNum++;
            }
        }
        
        html += '</tbody></table></div>';
    } else {
        html += '<div style="text-align: center; padding: 40px; color: #27ae60;">' +
                    '<h3><i class="fa fa-check-circle"></i> 所有数据一致</h3>' +
                    '<p style="margin-top: 10px;">未发现任何问题</p>' +
                '</div>';
    }
    
    html += '<div class="diff-export">' +
                '<button class="export-btn" onclick="exportCompCheckResult()"><i class="fa fa-download"></i> 导出检查报告</button>' +
            '</div>';
    
    resultContainer.innerHTML = html;
}

function exportCompCheckResult() {
    if (!compCheckResult) {
        alert('没有可导出的数据');
        return;
    }
    
    try {
        var wb = XLSX.utils.book_new();
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var day = now.getDate();
        
        var sheetData = [];
        
        sheetData.push(['保障卡综合数据检查报告']);
        sheetData.push(['检查日期：' + year + '年' + month + '月' + day + '日']);
        sheetData.push([]);
        sheetData.push(['检查统计']);
        sheetData.push(['检查总人数（去重后）', compCheckResult.totalCheck]);
        sheetData.push(['发现问题人数', compCheckResult.errorCount]);
        sheetData.push([]);
        sheetData.push(['各表人数统计']);
        sheetData.push(['保障卡人数', compCheckResult.stats.cardCount]);
        sheetData.push(['人资人数', compCheckResult.stats.hrCount]);
        sheetData.push(['财务人数', compCheckResult.stats.finCount]);
        sheetData.push(['被装人数', compCheckResult.stats.uniCount]);
        sheetData.push([]);
        
        if (compCheckResult.errorCount > 0) {
            sheetData.push(['问题明细']);
            sheetData.push(['序号', '公民身份号码', '姓名', '部门', '问题类型', '问题来源', '问题描述']);
            
            var rowNum = 1;
            for (var i = 0; i < compCheckResult.errors.length; i++) {
                var person = compCheckResult.errors[i];
                for (var j = 0; j < person.errors.length; j++) {
                    var error = person.errors[j];
                    sheetData.push([
                        rowNum,
                        person.idCard,
                        person.name,
                        person.dept,
                        error.type,
                        error.source,
                        error.description
                    ]);
                    rowNum++;
                }
            }
        } else {
            sheetData.push(['检查结果：所有数据一致，未发现问题']);
        }
        
        var ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        ws['!cols'] = [
            { wch: 8 },
            { wch: 20 },
            { wch: 12 },
            { wch: 20 },
            { wch: 12 },
            { wch: 15 },
            { wch: 40 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, '检查报告');
        
        var filename = '保障卡综合数据检查报告_' + year + month + day + '.xlsx';
        XLSX.writeFile(wb, filename);
        
        alert('导出成功！\n文件名：' + filename);
        
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

