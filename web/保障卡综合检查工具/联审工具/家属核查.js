/**
 * 家属核查模块
 * 功能：核查本单位人员、临时供应人员、家属三表数据的关联性和准确性
 * 
 * 核查内容：
 * 1. 检查家属的主官兵是否在本单位人员或临时供应人员名单中
 * 2. 检查家属信息的完整性和一致性
 * 3. 生成核查报告，标识异常情况
 * 
 * 使用场景：
 * 适用于单位家属信息管理和审核工作
 */

// 全局变量：存储三个文件的数据
var famFile1Data = null;  // 本单位人员数据
var famFile2Data = null;  // 临时供应人员数据
var famFile3Data = null;  // 家属数据
var famFile1Name = '';    // 本单位人员文件名
var famFile2Name = '';    // 临时供应人员文件名
var famFile3Name = '';    // 家属文件名
var famCheckResult = null; // 核查结果

/**
 * 打开家属核查弹窗
 */
function openFamilyCheck() {
    document.getElementById('familyCheckModal').style.display = 'flex';
    resetFamilyCheck();
}

/**
 * 关闭家属核查弹窗
 */
function closeFamilyCheck() {
    document.getElementById('familyCheckModal').style.display = 'none';
    resetFamilyCheck();
}

/**
 * 重置家属核查状态
 * 清空所有上传的文件和核查结果
 */
function resetFamilyCheck() {
    famFile1Data = null;
    famFile2Data = null;
    famFile3Data = null;
    famFile1Name = '';
    famFile2Name = '';
    famFile3Name = '';
    famCheckResult = null;
    
    document.getElementById('famFile1Display').innerHTML = '';
    document.getElementById('famFile2Display').innerHTML = '';
    document.getElementById('famFile3Display').innerHTML = '';
    document.getElementById('famResultContainer').style.display = 'none';
    document.getElementById('famResultContainer').innerHTML = '';
    document.getElementById('famCheckBtn').disabled = true;
    
    var famFile1Input = document.getElementById('famFile1Input');
    var famFile2Input = document.getElementById('famFile2Input');
    var famFile3Input = document.getElementById('famFile3Input');
    if (famFile1Input) famFile1Input.value = '';
    if (famFile2Input) famFile2Input.value = '';
    if (famFile3Input) famFile3Input.value = '';
}

// selectFamFile函数已移除，现在使用点击上传区域或拖拽文件

document.addEventListener('DOMContentLoaded', function() {
    // 文件1：本单位人员
    var famFile1Input = document.getElementById('famFile1Input');
    var famFile1UploadArea = document.getElementById('famFile1UploadArea');
    
    if (famFile1Input) {
        famFile1Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                famFile1Name = file.name;
                readFamExcelFile(file, 1);
                displayFamFile(file, 'famFile1Display', 'removeFamFile1');
            }
        });
    }
    
    if (famFile1UploadArea && famFile1Input) {
        famFile1UploadArea.addEventListener('click', function() {
            famFile1Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(famFile1UploadArea, function(file) {
                famFile1Name = file.name;
                readFamExcelFile(file, 1);
                displayFamFile(file, 'famFile1Display', 'removeFamFile1');
            });
        }
    }
    
    // 文件2：临时供应人员
    var famFile2Input = document.getElementById('famFile2Input');
    var famFile2UploadArea = document.getElementById('famFile2UploadArea');
    
    if (famFile2Input) {
        famFile2Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                famFile2Name = file.name;
                readFamExcelFile(file, 2);
                displayFamFile(file, 'famFile2Display', 'removeFamFile2');
            }
        });
    }
    
    if (famFile2UploadArea && famFile2Input) {
        famFile2UploadArea.addEventListener('click', function() {
            famFile2Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(famFile2UploadArea, function(file) {
                famFile2Name = file.name;
                readFamExcelFile(file, 2);
                displayFamFile(file, 'famFile2Display', 'removeFamFile2');
            });
        }
    }
    
    // 文件3：家属
    var famFile3Input = document.getElementById('famFile3Input');
    var famFile3UploadArea = document.getElementById('famFile3UploadArea');
    
    if (famFile3Input) {
        famFile3Input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                famFile3Name = file.name;
                readFamExcelFile(file, 3);
                displayFamFile(file, 'famFile3Display', 'removeFamFile3');
            }
        });
    }
    
    if (famFile3UploadArea && famFile3Input) {
        famFile3UploadArea.addEventListener('click', function() {
            famFile3Input.click();
        });
        
        if (typeof setupDragAndDrop === 'function') {
            setupDragAndDrop(famFile3UploadArea, function(file) {
                famFile3Name = file.name;
                readFamExcelFile(file, 3);
                displayFamFile(file, 'famFile3Display', 'removeFamFile3');
            });
        }
    }
});

function displayFamFile(file, containerId, removeFunc) {
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

function removeFamFile1() {
    famFile1Data = null;
    famFile1Name = '';
    document.getElementById('famFile1Input').value = '';
    document.getElementById('famFile1Display').innerHTML = '';
    document.getElementById('famResultContainer').style.display = 'none';
    updateFamCheckButton();
}

function removeFamFile2() {
    famFile2Data = null;
    famFile2Name = '';
    document.getElementById('famFile2Input').value = '';
    document.getElementById('famFile2Display').innerHTML = '';
    document.getElementById('famResultContainer').style.display = 'none';
    updateFamCheckButton();
}

function removeFamFile3() {
    famFile3Data = null;
    famFile3Name = '';
    document.getElementById('famFile3Input').value = '';
    document.getElementById('famFile3Display').innerHTML = '';
    document.getElementById('famResultContainer').style.display = 'none';
    updateFamCheckButton();
}

function readFamExcelFile(file, fileNum) {
    var reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, {type: 'array'});
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            var jsonData = XLSX.utils.sheet_to_json(firstSheet, {defval: '', raw: false});
            
            if (fileNum === 1) {
                famFile1Data = jsonData;
                if (window.Logger) {
                    Logger.info('本单位人员数据加载成功，共 ' + jsonData.length + ' 条记录');
                }
            } else if (fileNum === 2) {
                famFile2Data = jsonData;
                if (window.Logger) {
                    Logger.info('临时供应人员数据加载成功，共 ' + jsonData.length + ' 条记录');
                }
            } else if (fileNum === 3) {
                famFile3Data = jsonData;
                if (window.Logger) {
                    Logger.info('家属数据加载成功，共 ' + jsonData.length + ' 条记录');
                }
            }
            
            updateFamCheckButton();
            
        } catch (error) {
            alert('文件读取失败: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('文件读取失败');
    };
    
    reader.readAsArrayBuffer(file);
}

function updateFamCheckButton() {
    var btn = document.getElementById('famCheckBtn');
    btn.disabled = !(famFile1Data && famFile2Data && famFile3Data);
}

function checkFamilyData() {
    if (!famFile1Data || !famFile2Data || !famFile3Data) {
        alert('请先上传所有必填文件（本单位人员、临时供应人员、家属）');
        return;
    }
    
    var resultContainer = document.getElementById('famResultContainer');
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div class="loading">正在核查数据...</div>';
    
    setTimeout(function() {
        try {
            famCheckResult = performFamilyCheck(famFile1Data, famFile2Data, famFile3Data);
            
            displayFamilyCheckResult(famCheckResult);
            
        } catch (error) {
            resultContainer.innerHTML = '<div class="error-message">核查失败: ' + escapeHtml(error.message) + '</div>';
        }
    }, 100);
}

function performFamilyCheck(unitData, tempData, familyData) {
    if (window.Logger) {
        Logger.info('开始执行家属核查...');
    }
    
    // 主键归一化：去空格、末位x统一大写、全角转半角（定义见字段标准化.js）
    var normKey = (typeof normalizeIdCard === 'function') ? normalizeIdCard : function(v) { return String(v || '').trim(); };

    var militaryIndex = {};


    for (var i = 0; i < unitData.length; i++) {
        var idCard = normKey(unitData[i]['公民身份号码'] || unitData[i]['身份证号码']);
        if (idCard) {
            militaryIndex[idCard] = {
                name: unitData[i]['姓名'] || '',
                source: '本单位人员',
                adminUnit: String(unitData[i]['行政单位名称'] || '').trim(),
                primaryMedical: String(unitData[i]['基层医疗机构'] || '').trim(),
                medicalUnit: String(unitData[i]['医疗保障单位'] || '').trim()
            };
        }
    }
    
    for (var i = 0; i < tempData.length; i++) {
        var idCard = normKey(tempData[i]['公民身份号码'] || tempData[i]['身份证号码']);
        if (idCard) {
            militaryIndex[idCard] = {
                name: tempData[i]['姓名'] || '',
                source: '临时供应人员',
                adminUnit: String(tempData[i]['行政单位名称'] || '').trim(),
                primaryMedical: String(tempData[i]['基层医疗机构'] || '').trim(),
                medicalUnit: String(tempData[i]['医疗保障单位'] || '').trim()
            };
        }
    }
    
    if (window.Logger) {
        Logger.info('军人索引构建完成，共 ' + Object.keys(militaryIndex).length + ' 人');
    }
    
    var militaryNotFound = [];
    var adminUnitMismatch = [];
    var primaryMedicalMismatch = [];
    var medicalUnitMismatch = [];
    
    for (var i = 0; i < familyData.length; i++) {
        var family = familyData[i];
        var militaryId = normKey(family['对应军人身份号码'] || family['对应军人公民身份号码']);
        var familyId = normKey(family['公民身份号码'] || family['身份证号码']);
        var familyName = String(family['姓名'] || '').trim();
        var militaryName = String(family['对应军人姓名'] || '').trim();
        var familyType = String(family['家属身份类别'] || '').trim();
        var isMartyrsFamily = String(family['是否遗属'] || '').trim();
        
        var familyAdminUnit = String(family['行政单位名称'] || '').trim();
        var familyPrimaryMedical = String(family['基层医疗机构'] || '').trim();
        var familyMedicalUnit = String(family['医疗保障单位'] || '').trim();
        
        if (!militaryId || !militaryIndex[militaryId]) {

            militaryNotFound.push({
                familyName: familyName,
                familyId: familyId,
                militaryName: militaryName,
                militaryId: militaryId || '(空)',
                familyType: familyType,
                isMartyrsFamily: isMartyrsFamily,
                rowNum: i + 2
            });
        } else {
            var militaryInfo = militaryIndex[militaryId];
            

            if (familyAdminUnit !== militaryInfo.adminUnit) {
                adminUnitMismatch.push({
                    familyName: familyName,
                    familyId: familyId,
                    militaryName: militaryName,
                    militaryId: militaryId,
                    familyType: familyType,
                    isMartyrsFamily: isMartyrsFamily,
                    familyAdminUnit: familyAdminUnit || '(空)',
                    militaryAdminUnit: militaryInfo.adminUnit || '(空)',
                    rowNum: i + 2
                });
            }
            
            if (familyPrimaryMedical !== militaryInfo.primaryMedical) {
                primaryMedicalMismatch.push({
                    familyName: familyName,
                    familyId: familyId,
                    militaryName: militaryName,
                    militaryId: militaryId,
                    familyType: familyType,
                    isMartyrsFamily: isMartyrsFamily,
                    familyPrimaryMedical: familyPrimaryMedical || '(空)',
                    militaryPrimaryMedical: militaryInfo.primaryMedical || '(空)',
                    rowNum: i + 2
                });
            }
            
            if (familyMedicalUnit !== militaryInfo.medicalUnit) {
                medicalUnitMismatch.push({
                    familyName: familyName,
                    familyId: familyId,
                    militaryName: militaryName,
                    militaryId: militaryId,
                    familyType: familyType,
                    isMartyrsFamily: isMartyrsFamily,
                    familyMedicalUnit: familyMedicalUnit || '(空)',
                    militaryMedicalUnit: militaryInfo.medicalUnit || '(空)',
                    rowNum: i + 2
                });
            }
        }
    }
    
    if (window.Logger) {
        Logger.info('核查完成：');
        Logger.info('- 对应军人未找到：' + militaryNotFound.length);
        Logger.info('- 行政单位不一致：' + adminUnitMismatch.length);
        Logger.info('- 基层医疗机构不一致：' + primaryMedicalMismatch.length);
        Logger.info('- 医疗保障单位不一致：' + medicalUnitMismatch.length);
    }
    
    return {
        militaryNotFound: militaryNotFound,
        adminUnitMismatch: adminUnitMismatch,
        primaryMedicalMismatch: primaryMedicalMismatch,
        medicalUnitMismatch: medicalUnitMismatch
    };
}

function displayFamilyCheckResult(result) {
    var resultContainer = document.getElementById('famResultContainer');
    
    var html = '<div class="diff-result-header">' +
                   '<h3 style="font-size: 16px; margin-bottom: 10px;"><i class="fa fa-check-circle"></i> 核查完成</h3>' +
               '</div>';
    
    html += '<div style="margin-bottom: 30px;">' +
                '<h4 style="font-size: 15px; margin-bottom: 10px; color: #e74c3c; border-left: 4px solid #e74c3c; padding-left: 10px;">' +
                    '<i class="fa fa-times-circle"></i> 对应军人未找到 (' + result.militaryNotFound.length + ')' +
                '</h4>';
    
    if (result.militaryNotFound.length > 0) {
        html += '<div class="diff-table-container" style="overflow-x: auto;">' +
                    '<table class="error-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th style="min-width: 50px;">序号</th>' +
                                '<th style="min-width: 80px;">姓名</th>' +
                                '<th style="min-width: 160px;">身份证号码</th>' +
                                '<th style="min-width: 80px;">对应军人姓名</th>' +
                                '<th style="min-width: 160px;">对应军人身份号码</th>' +
                                '<th style="min-width: 100px;">家属身份类别</th>' +
                                '<th style="min-width: 80px;">是否遗属</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>';
        
        for (var i = 0; i < result.militaryNotFound.length; i++) {
            var fam = result.militaryNotFound[i];
            html += '<tr>' +
                        '<td>' + (i + 1) + '</td>' +
                        '<td>' + escapeHtml(fam.familyName) + '</td>' +
                        '<td>' + escapeHtml(fam.familyId) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryName) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryId) + '</td>' +
                        '<td>' + escapeHtml(fam.familyType) + '</td>' +
                        '<td>' + escapeHtml(fam.isMartyrsFamily || '-') + '</td>' +
                    '</tr>';
        }
        
        html += '</tbody></table></div>';
    } else {
        html += '<div style="padding: 15px; background: #d4edda; border-radius: 6px; color: #155724; text-align: center;"><i class="fa fa-check-circle"></i> 无此类问题</div>';
    }
    html += '</div>';
    
    html += '<div style="margin-bottom: 30px;">' +
                '<h4 style="font-size: 15px; margin-bottom: 10px; color: #ff9800; border-left: 4px solid #ff9800; padding-left: 10px;">' +
                    '<i class="fa fa-exclamation-triangle"></i> 行政单位不一致 (' + result.adminUnitMismatch.length + ')' +
                '</h4>';
    
    if (result.adminUnitMismatch.length > 0) {
        html += '<div class="diff-table-container" style="overflow-x: auto;">' +
                    '<table class="error-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th style="min-width: 50px;">序号</th>' +
                                '<th style="min-width: 80px;">姓名</th>' +
                                '<th style="min-width: 160px;">身份证号码</th>' +
                                '<th style="min-width: 80px;">对应军人姓名</th>' +
                                '<th style="min-width: 160px;">对应军人身份号码</th>' +
                                '<th style="min-width: 100px;">家属身份类别</th>' +
                                '<th style="min-width: 80px;">是否遗属</th>' +
                                '<th style="min-width: 180px;">家属行政单位</th>' +
                                '<th style="min-width: 180px;">军人行政单位</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>';
        
        for (var i = 0; i < result.adminUnitMismatch.length; i++) {
            var fam = result.adminUnitMismatch[i];
            html += '<tr>' +
                        '<td>' + (i + 1) + '</td>' +
                        '<td>' + escapeHtml(fam.familyName) + '</td>' +
                        '<td>' + escapeHtml(fam.familyId) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryName) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryId) + '</td>' +
                        '<td>' + escapeHtml(fam.familyType) + '</td>' +
                        '<td>' + escapeHtml(fam.isMartyrsFamily || '-') + '</td>' +
                        '<td>' + escapeHtml(fam.familyAdminUnit) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryAdminUnit) + '</td>' +
                    '</tr>';
        }
        
        html += '</tbody></table></div>';
    } else {
        html += '<div style="padding: 15px; background: #d4edda; border-radius: 6px; color: #155724; text-align: center;"><i class="fa fa-check-circle"></i> 无此类问题</div>';
    }
    html += '</div>';
    
    html += '<div style="margin-bottom: 30px;">' +
                '<h4 style="font-size: 15px; margin-bottom: 10px; color: #9c27b0; border-left: 4px solid #9c27b0; padding-left: 10px;">' +
                    '<i class="fa fa-exclamation-triangle"></i> 基层医疗机构不一致 (' + result.primaryMedicalMismatch.length + ')' +
                '</h4>';
    
    if (result.primaryMedicalMismatch.length > 0) {
        html += '<div class="diff-table-container" style="overflow-x: auto;">' +
                    '<table class="error-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th style="min-width: 50px;">序号</th>' +
                                '<th style="min-width: 80px;">姓名</th>' +
                                '<th style="min-width: 160px;">身份证号码</th>' +
                                '<th style="min-width: 80px;">对应军人姓名</th>' +
                                '<th style="min-width: 160px;">对应军人身份号码</th>' +
                                '<th style="min-width: 100px;">家属身份类别</th>' +
                                '<th style="min-width: 80px;">是否遗属</th>' +
                                '<th style="min-width: 180px;">家属基层医疗机构</th>' +
                                '<th style="min-width: 180px;">军人基层医疗机构</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>';
        
        for (var i = 0; i < result.primaryMedicalMismatch.length; i++) {
            var fam = result.primaryMedicalMismatch[i];
            html += '<tr>' +
                        '<td>' + (i + 1) + '</td>' +
                        '<td>' + escapeHtml(fam.familyName) + '</td>' +
                        '<td>' + escapeHtml(fam.familyId) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryName) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryId) + '</td>' +
                        '<td>' + escapeHtml(fam.familyType) + '</td>' +
                        '<td>' + escapeHtml(fam.isMartyrsFamily || '-') + '</td>' +
                        '<td>' + escapeHtml(fam.familyPrimaryMedical) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryPrimaryMedical) + '</td>' +
                    '</tr>';
        }
        
        html += '</tbody></table></div>';
    } else {
        html += '<div style="padding: 15px; background: #d4edda; border-radius: 6px; color: #155724; text-align: center;"><i class="fa fa-check-circle"></i> 无此类问题</div>';
    }
    html += '</div>';
    
    html += '<div style="margin-bottom: 30px;">' +
                '<h4 style="font-size: 15px; margin-bottom: 10px; color: #2196f3; border-left: 4px solid #2196f3; padding-left: 10px;">' +
                    '<i class="fa fa-exclamation-triangle"></i> 医疗保障单位不一致 (' + result.medicalUnitMismatch.length + ')' +
                '</h4>';
    
    if (result.medicalUnitMismatch.length > 0) {
        html += '<div class="diff-table-container" style="overflow-x: auto;">' +
                    '<table class="error-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th style="min-width: 50px;">序号</th>' +
                                '<th style="min-width: 80px;">姓名</th>' +
                                '<th style="min-width: 160px;">身份证号码</th>' +
                                '<th style="min-width: 80px;">对应军人姓名</th>' +
                                '<th style="min-width: 160px;">对应军人身份号码</th>' +
                                '<th style="min-width: 100px;">家属身份类别</th>' +
                                '<th style="min-width: 80px;">是否遗属</th>' +
                                '<th style="min-width: 180px;">家属医疗保障单位</th>' +
                                '<th style="min-width: 180px;">军人医疗保障单位</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>';
        
        for (var i = 0; i < result.medicalUnitMismatch.length; i++) {
            var fam = result.medicalUnitMismatch[i];
            html += '<tr>' +
                        '<td>' + (i + 1) + '</td>' +
                        '<td>' + escapeHtml(fam.familyName) + '</td>' +
                        '<td>' + escapeHtml(fam.familyId) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryName) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryId) + '</td>' +
                        '<td>' + escapeHtml(fam.familyType) + '</td>' +
                        '<td>' + escapeHtml(fam.isMartyrsFamily || '-') + '</td>' +
                        '<td>' + escapeHtml(fam.familyMedicalUnit) + '</td>' +
                        '<td>' + escapeHtml(fam.militaryMedicalUnit) + '</td>' +
                    '</tr>';
        }
        
        html += '</tbody></table></div>';
    } else {
        html += '<div style="padding: 15px; background: #d4edda; border-radius: 6px; color: #155724; text-align: center;"><i class="fa fa-check-circle"></i> 无此类问题</div>';
    }
    html += '</div>';
    
    var hasAnyData = result.militaryNotFound.length > 0 || 
                     result.adminUnitMismatch.length > 0 || 
                     result.primaryMedicalMismatch.length > 0 || 
                     result.medicalUnitMismatch.length > 0;
    
    if (hasAnyData) {
        html += '<div class="diff-export">' +
                    '<button class="export-btn" onclick="exportFamilyCheckResult()"><i class="fa fa-download"></i> 导出核查报告（所有问题）</button>' +
                '</div>';
    }
    
    resultContainer.innerHTML = html;
}

function exportFamilyCheckResult() {
    if (!famCheckResult) {
        alert('没有可导出的数据');
        return;
    }
    
    var hasData = famCheckResult.militaryNotFound.length > 0 || 
                  famCheckResult.adminUnitMismatch.length > 0 || 
                  famCheckResult.primaryMedicalMismatch.length > 0 || 
                  famCheckResult.medicalUnitMismatch.length > 0;
    
    if (!hasData) {
        alert('没有可导出的数据');
        return;
    }
    
    try {
        var wb = XLSX.utils.book_new();
        
        if (famCheckResult.militaryNotFound.length > 0) {
            var data1 = [];
            for (var i = 0; i < famCheckResult.militaryNotFound.length; i++) {
                var fam = famCheckResult.militaryNotFound[i];
                data1.push({
                    '序号': i + 1,
                    '姓名': fam.familyName,
                    '身份证号码': fam.familyId,
                    '对应军人姓名': fam.militaryName,
                    '对应军人身份号码': fam.militaryId,
                    '家属身份类别': fam.familyType,
                    '是否遗属': fam.isMartyrsFamily || ''
                });
            }
            var ws1 = XLSX.utils.json_to_sheet(data1);
            ws1['!cols'] = [
                { wch: 6 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 10 }
            ];
            XLSX.utils.book_append_sheet(wb, ws1, '对应军人未找到');
        }
        
        if (famCheckResult.adminUnitMismatch.length > 0) {
            var data2 = [];
            for (var i = 0; i < famCheckResult.adminUnitMismatch.length; i++) {
                var fam = famCheckResult.adminUnitMismatch[i];
                data2.push({
                    '序号': i + 1,
                    '姓名': fam.familyName,
                    '身份证号码': fam.familyId,
                    '对应军人姓名': fam.militaryName,
                    '对应军人身份号码': fam.militaryId,
                    '家属身份类别': fam.familyType,
                    '是否遗属': fam.isMartyrsFamily || '',
                    '家属行政单位': fam.familyAdminUnit,
                    '军人行政单位': fam.militaryAdminUnit
                });
            }
            var ws2 = XLSX.utils.json_to_sheet(data2);
            ws2['!cols'] = [
                { wch: 6 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }
            ];
            XLSX.utils.book_append_sheet(wb, ws2, '行政单位不一致');
        }
        
        if (famCheckResult.primaryMedicalMismatch.length > 0) {
            var data3 = [];
            for (var i = 0; i < famCheckResult.primaryMedicalMismatch.length; i++) {
                var fam = famCheckResult.primaryMedicalMismatch[i];
                data3.push({
                    '序号': i + 1,
                    '姓名': fam.familyName,
                    '身份证号码': fam.familyId,
                    '对应军人姓名': fam.militaryName,
                    '对应军人身份号码': fam.militaryId,
                    '家属身份类别': fam.familyType,
                    '是否遗属': fam.isMartyrsFamily || '',
                    '家属基层医疗机构': fam.familyPrimaryMedical,
                    '军人基层医疗机构': fam.militaryPrimaryMedical
                });
            }
            var ws3 = XLSX.utils.json_to_sheet(data3);
            ws3['!cols'] = [
                { wch: 6 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }
            ];
            XLSX.utils.book_append_sheet(wb, ws3, '基层医疗机构不一致');
        }
        
        if (famCheckResult.medicalUnitMismatch.length > 0) {
            var data4 = [];
            for (var i = 0; i < famCheckResult.medicalUnitMismatch.length; i++) {
                var fam = famCheckResult.medicalUnitMismatch[i];
                data4.push({
                    '序号': i + 1,
                    '姓名': fam.familyName,
                    '身份证号码': fam.familyId,
                    '对应军人姓名': fam.militaryName,
                    '对应军人身份号码': fam.militaryId,
                    '家属身份类别': fam.familyType,
                    '是否遗属': fam.isMartyrsFamily || '',
                    '家属医疗保障单位': fam.familyMedicalUnit,
                    '军人医疗保障单位': fam.militaryMedicalUnit
                });
            }
            var ws4 = XLSX.utils.json_to_sheet(data4);
            ws4['!cols'] = [
                { wch: 6 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }
            ];
            XLSX.utils.book_append_sheet(wb, ws4, '医疗保障单位不一致');
        }
        
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var day = now.getDate();
        var filename = '军人已注销家属核查报告_' + year + (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day + '.xlsx';
        
        XLSX.writeFile(wb, filename);
        
        var totalCount = famCheckResult.militaryNotFound.length + 
                        famCheckResult.adminUnitMismatch.length + 
                        famCheckResult.primaryMedicalMismatch.length + 
                        famCheckResult.medicalUnitMismatch.length;
        
        var message = '导出成功！\n文件名：' + filename + '\n\n';
        message += '导出统计：\n';
        message += '- 对应军人未找到：' + famCheckResult.militaryNotFound.length + ' 条\n';
        message += '- 行政单位不一致：' + famCheckResult.adminUnitMismatch.length + ' 条\n';
        message += '- 基层医疗机构不一致：' + famCheckResult.primaryMedicalMismatch.length + ' 条\n';
        message += '- 医疗保障单位不一致：' + famCheckResult.medicalUnitMismatch.length + ' 条\n';
        message += '- 总计：' + totalCount + ' 条';
        
        alert(message);
        
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

