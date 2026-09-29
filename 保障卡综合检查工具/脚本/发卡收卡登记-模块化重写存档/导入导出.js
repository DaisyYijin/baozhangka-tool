/**
 * 发卡收卡登记系统 - 导入导出模块
 * 负责Excel导入导出、数据备份与恢复
 */

import { state } from './配置.js';
import { saveRecords, saveConfig } from './存储处理.js';
import { uid, fmtDateDisplay, parseDate, normalizeCardType, mapStatus, showNotification } from './工具函数.js';
import { resetFilters } from './过滤搜索.js';
import { resetPagination } from './分页.js';
import { renderTable } from './页面渲染.js';
import { populateYearFilters } from './过滤搜索.js';

/**
 * 导出当前数据到Excel
 */
export function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert('Excel库未加载，无法导出！');
        return;
    }
    
    const data = [];
    let filename = '';
    let headers = [];
    
    if (state.currentSubTab === 'issue') {
        // 发卡登记导出
        filename = '发卡登记_' + new Date().toISOString().split('T')[0] + '.xlsx';
        headers = ['序号', '部别', '姓名', '身份证号码', '保障卡号', '卡类型', '关联军人', '发卡状态', '发卡日期', '领卡日期', '备注'];
        
        const issueRecords = state.records.filter(r => r.action === 'issue');
        issueRecords.forEach((r, idx) => {
            // 只在Ⅲ类卡时导出关联军人，其他显示空
            const familyMember = r.cardType === 'Ⅲ类卡' ? (r.familyMember || '') : '';
            data.push([
                idx + 1,
                r.department || '',
                r.name || '',
                r.idNumber || '',
                r.cardNumber || '',
                r.cardType || '',
                familyMember,
                r.cardStatus || '未发卡',
                fmtDateDisplay(r.issueDate),
                fmtDateDisplay(r.receiveDate),
                r.remark || ''
            ]);
        });
    } else {
        // 收卡登记导出
        filename = '收卡登记_' + new Date().toISOString().split('T')[0] + '.xlsx';
        headers = ['序号', '部别', '姓名', '身份证号码', '保障卡号', '卡类型', '关联军人', '回收状态', '回收类型', '回收日期', '备注'];
        
        const recycleRecords = state.records.filter(r => r.action === 'recycle');
        recycleRecords.forEach((r, idx) => {
            // 只在Ⅲ类卡时导出关联军人，其他显示空
            const familyMember = r.cardType === 'Ⅲ类卡' ? (r.familyMember || '') : '';
            data.push([
                idx + 1,
                r.department || '',
                r.name || '',
                r.idNumber || '',
                r.cardNumber || '',
                r.cardType || '',
                familyMember,
                mapStatus(r.status),
                r.reason || '',
                fmtDateDisplay(r.recycleDate),
                r.remark || ''
            ]);
        });
    }
    
    if (data.length === 0) {
        showNotification('没有数据可导出', 'warning');
        return;
    }
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const wsData = [headers].concat(data);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // 设置列宽
    ws['!cols'] = [
        {wch: 6},  // 序号
        {wch: 15}, // 部别
        {wch: 10}, // 姓名
        {wch: 20}, // 身份证号码
        {wch: 20}, // 保障卡号
        {wch: 10}, // 卡类型
        {wch: 12}, // 关联军人
        {wch: 12}, // 状态
        {wch: 12}, // 日期/类型
        {wch: 12}, // 日期
        {wch: 20}  // 备注
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, state.currentSubTab === 'issue' ? '发卡登记' : '收卡登记');
    XLSX.writeFile(wb, filename);
    
    showNotification('导出成功：' + filename, 'success');
}

/**
 * 从Excel导入数据
 */
export function importFromExcel(file) {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            reject(new Error('Excel库未加载'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                
                if (jsonData.length < 2) {
                    reject(new Error('Excel文件没有数据'));
                    return;
                }
                
                // 跳过表头
                const rows = jsonData.slice(1);
                const newRecords = [];
                const errors = [];
                
                // 解析Excel数据为记录对象
                rows.forEach((row, idx) => {
                    // 跳过空行
                    if (!row || row.length === 0 || !row[2]) return;  // 检查姓名列
                    
                    try {
                        const record = {
                            id: uid(),
                            department: row[1] || '',
                            name: row[2] || '',
                            idNumber: row[3] || '',
                            cardNumber: row[4] || '',
                            cardType: normalizeCardType(row[5] || ''),
                            familyMember: row[6] || '',
                            action: state.currentSubTab,
                            dates: {
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            },
                            remark: row[10] || ''
                        };
                        
                        if (state.currentSubTab === 'issue') {
                            // 发卡登记
                            record.cardStatus = row[7] || '未发卡';
                            record.issueDate = parseDate(row[8]);
                            record.receiveDate = parseDate(row[9]);
                        } else {
                            // 收卡登记
                            const statusText = row[7] || '已回收';
                            record.status = statusText === '已回收' ? 'done' : 'pending';
                            record.reason = row[8] || '';
                            record.recycleDate = parseDate(row[9]);
                        }
                        
                        newRecords.push(record);
                    } catch (err) {
                        errors.push('第' + (idx + 2) + '行：' + err.message);
                    }
                });
                
                if (newRecords.length === 0) {
                    if (errors.length > 0) {
                        reject(new Error('导入失败：\n' + errors.join('\n')));
                    } else {
                        reject(new Error('没有有效数据'));
                    }
                    return;
                }
                
                // 添加到当前记录
                newRecords.forEach(record => {
                    state.records.push(record);
                });
                
                // 保存
                saveRecords();
                
                // 更新年份筛选
                populateYearFilters();
                
                resolve(newRecords.length);
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * 下载Excel模板
 */
export function downloadTemplate() {
    if (typeof XLSX === 'undefined') {
        alert('Excel库未加载，无法下载模板！');
        return;
    }
    
    let headers = [];
    let filename = '';
    let sampleData = [];
    
    if (state.currentSubTab === 'issue') {
        // 发卡登记模板
        filename = '发卡登记模板.xlsx';
        headers = ['序号', '部别', '姓名', '身份证号码', '保障卡号', '卡类型', '关联军人', '发卡状态', '发卡日期', '领卡日期', '备注'];
        sampleData = [
            [1, '一连', '张三', '110101199001011234', 'BZK20240001', 'Ⅰ类卡', '', '已发卡', '20240101', '20240102', '示例数据'],
            [2, '二连', '李四', '110101199002022345', 'BZK20240002', 'Ⅱ类卡', '', '未发卡', '20240103', '', ''],
            ['', '请在此行下方添加数据', '', '', '', '卡类型：Ⅰ类卡/Ⅱ类卡/Ⅲ类卡/Ⅳ类卡', '关联军人仅Ⅲ类卡需要填写', '发卡状态：已发卡/未发卡', '日期格式：20240101 或 2024-01-01', '', '']
        ];
    } else {
        // 收卡登记模板
        filename = '收卡登记模板.xlsx';
        headers = ['序号', '部别', '姓名', '身份证号码', '保障卡号', '卡类型', '关联军人', '回收状态', '回收类型', '回收日期', '备注'];
        sampleData = [
            [1, '一连', '张三', '110101199001011234', 'BZK20240001', 'Ⅰ类卡', '', '已回收', '退伍回收', '20240101', '示例数据'],
            [2, '二连', '李四', '110101199002022345', 'BZK20240002', 'Ⅱ类卡', '', '未回收', '转业回收', '', ''],
            ['', '请在此行下方添加数据', '', '', '', '卡类型：Ⅰ类卡/Ⅱ类卡/Ⅲ类卡/Ⅳ类卡', '关联军人仅Ⅲ类卡需要填写', '回收状态：已回收/未回收', '回收类型：退伍回收/复员回收/转业回收/损坏回收/纠错回收/更换回收/消磁回收/其他原因回收', '日期格式：20240101 或 2024-01-01', '']
        ];
    }
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const wsData = [headers].concat(sampleData);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // 设置列宽
    ws['!cols'] = [
        {wch: 6},  // 序号
        {wch: 15}, // 部别
        {wch: 10}, // 姓名
        {wch: 20}, // 身份证号码
        {wch: 20}, // 保障卡号
        {wch: 10}, // 卡类型
        {wch: 12}, // 关联军人
        {wch: 15}, // 状态
        {wch: 35}, // 日期/类型
        {wch: 20}, // 日期
        {wch: 20}  // 备注
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, state.currentSubTab === 'issue' ? '发卡登记' : '收卡登记');
    XLSX.writeFile(wb, filename);
    
    showNotification('模板下载成功：' + filename, 'success');
}

/**
 * 备份所有数据
 */
export function backupAllData() {
    const currentDataType = state.currentSubTab;
    const currentTypeName = state.currentSubTab === 'issue' ? '发卡登记' : '收卡登记';
    
    // 获取当前类型的所有记录
    const currentTypeRecords = state.records.filter(r => r.action === currentDataType);
    
    if (currentTypeRecords.length === 0) {
        showNotification('当前' + currentTypeName + '没有任何数据可备份！', 'info');
        return;
    }
    
    const backupData = {
        version: '3.0.0',
        type: currentDataType,
        timestamp: new Date().toISOString(),
        records: currentTypeRecords,
        config: state.config
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentTypeName + '_备份_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('备份成功：' + currentTypeRecords.length + ' 条记录已保存到文件', 'success');
}

/**
 * 备份全部数据（发卡+收卡）
 */
export function backupCompleteData() {
    if (state.records.length === 0) {
        showNotification('没有任何数据可备份！', 'info');
        return;
    }
    
    const issueCount = state.records.filter(r => r.action === 'issue').length;
    const recycleCount = state.records.filter(r => r.action === 'recycle').length;
    
    const backupData = {
        version: '3.0.0',
        type: 'all',
        timestamp: new Date().toISOString(),
        records: state.records,
        config: state.config,
        summary: {
            issue: issueCount,
            recycle: recycleCount
        }
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '全部数据备份_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('完整备份成功：发卡 ' + issueCount + ' 条，收卡 ' + recycleCount + ' 条', 'success');
}

/**
 * 从备份文件恢复数据
 */
export function restoreFromBackup(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backupData = JSON.parse(e.target.result);
                
                if (!backupData.records || !Array.isArray(backupData.records)) {
                    reject(new Error('备份文件格式不正确'));
                    return;
                }
                
                const backupType = backupData.type || 'unknown';
                const currentDataType = state.currentSubTab;
                
                // 如果是完整备份（包含所有数据）
                if (backupType === 'all') {
                    const summary = backupData.summary || {};
                    const mode = confirm(
                        '这是一个完整数据备份文件！\n' +
                        '备份时间: ' + (backupData.timestamp ? new Date(backupData.timestamp).toLocaleString() : '未知') + '\n' +
                        '发卡登记: ' + (summary.issue || 0) + ' 条\n' +
                        '收卡登记: ' + (summary.recycle || 0) + ' 条\n' +
                        '共计: ' + backupData.records.length + ' 条记录\n\n' +
                        '点击"确定"：覆盖所有数据（清空现有数据后导入）\n' +
                        '点击"取消"：合并数据（保留现有数据并添加备份数据）'
                    );
                    
                    if (mode) {
                        // 覆盖模式
                        state.records = [...backupData.records];
                        if (backupData.config) {
                            state.config = {...backupData.config};
                            saveConfig();
                        }
                    } else {
                        // 合并模式
                        let addedCount = 0;
                        backupData.records.forEach(record => {
                            const exists = state.records.some(r => r.id === record.id);
                            if (!exists) {
                                state.records.push(record);
                                addedCount++;
                            }
                        });
                        
                        if (addedCount === 0) {
                            showNotification('所有备份记录已存在，未添加新记录。', 'info');
                            return;
                        }
                    }
                    
                    saveRecords();
                    resetFilters();
                    state.selected = [];
                    resetPagination();
                    renderTable();
                    populateYearFilters();
                    
                    const issueCount = state.records.filter(r => r.action === 'issue').length;
                    const recycleCount = state.records.filter(r => r.action === 'recycle').length;
                    
                    resolve({
                        mode: mode ? 'overwrite' : 'merge',
                        total: state.records.length,
                        issue: issueCount,
                        recycle: recycleCount
                    });
                    
                    return;
                }
                
                // 如果备份类型与当前标签不匹配，给出警告
                const backupTypeName = backupType === 'issue' ? '发卡登记' : '收卡登记';
                const currentTypeName = currentDataType === 'issue' ? '发卡登记' : '收卡登记';
                
                if (backupType !== 'unknown' && backupType !== currentDataType) {
                    const switchConfirm = confirm(
                        '注意：备份文件类型与当前标签不匹配！\n\n' +
                        '备份文件类型: ' + backupTypeName + '\n' +
                        '当前标签: ' + currentTypeName + '\n\n' +
                        '点击"确定"继续导入（数据会导入到' + currentTypeName + '）\n' +
                        '点击"取消"放弃导入'
                    );
                    if (!switchConfirm) {
                        reject(new Error('用户取消导入'));
                        return;
                    }
                }
                
                // 询问恢复方式
                const mode = confirm(
                    '备份文件包含 ' + backupData.records.length + ' 条' + backupTypeName + '记录\n' +
                    '备份时间: ' + (backupData.timestamp ? new Date(backupData.timestamp).toLocaleString() : '未知') + '\n\n' +
                    '点击"确定"：覆盖当前' + currentTypeName + '数据（清空后导入）\n' +
                    '点击"取消"：合并数据（保留当前数据并添加备份数据）'
                );
                
                if (mode) {
                    // 覆盖模式 - 只删除当前类型的数据
                    state.records = state.records.filter(r => r.action !== currentDataType);
                    // 添加备份数据（确保类型正确）
                    backupData.records.forEach(record => {
                        record.action = currentDataType;
                        state.records.push(record);
                    });
                    if (backupData.config) {
                        state.config = {...backupData.config};
                        saveConfig();
                    }
                } else {
                    // 合并模式
                    let addedCount = 0;
                    backupData.records.forEach(record => {
                        const exists = state.records.some(r => r.id === record.id);
                        if (!exists) {
                            record.action = currentDataType;
                            state.records.push(record);
                            addedCount++;
                        }
                    });
                    
                    if (addedCount === 0) {
                        showNotification('所有备份记录已存在，未添加新记录。', 'info');
                        return;
                    }
                }
                
                // 保存并刷新
                saveRecords();
                resetFilters();
                state.selected = [];
                resetPagination();
                renderTable();
                populateYearFilters();
                
                const currentTypeCount = state.records.filter(r => r.action === currentDataType).length;
                
                resolve({
                    mode: mode ? 'overwrite' : 'merge',
                    total: currentTypeCount,
                    type: currentTypeName
                });
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * 清空所有数据
 */
export function clearAllData() {
    const currentDataType = state.currentSubTab;
    const currentTypeName = state.currentSubTab === 'issue' ? '发卡登记' : '收卡登记';
    
    // 统计当前类型的数据
    const currentTypeRecords = state.records.filter(r => r.action === currentDataType);
    
    if (currentTypeRecords.length === 0) {
        showNotification('当前' + currentTypeName + '没有任何数据！', 'info');
        return;
    }
    
    // 二次确认
    const confirmed = confirm(
        '[!] 警告：此操作将清空所有' + currentTypeName + '数据！\n\n' +
        '当前' + currentTypeName + '共有 ' + currentTypeRecords.length + ' 条记录\n\n' +
        '建议先备份数据再进行清空操作。\n\n' +
        '确定要清空所有' + currentTypeName + '数据吗？'
    );
    
    if (!confirmed) return;
    
    // 再次确认
    const finalConfirm = confirm('最后确认：真的要删除所有 ' + currentTypeRecords.length + ' 条' + currentTypeName + '记录吗？\n此操作不可恢复！');
    
    if (!finalConfirm) return;
    
    // 只删除当前类型的数据，保留其他类型
    state.records = state.records.filter(r => r.action !== currentDataType);
    saveRecords();
    state.selected = [];
    resetPagination();
    renderTable();
    showNotification(currentTypeName + '数据已清空！', 'success');
}

