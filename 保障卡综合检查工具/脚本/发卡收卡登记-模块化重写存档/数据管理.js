/**
 * 发卡收卡登记系统 - 数据管理模块
 * 负责记录的CRUD操作、数据验证、重复检测等
 */

import { uid, parseDate, fmtDate, normalizeCardType } from './工具函数.js';
import { saveRecords } from './存储处理.js';
import { state } from './配置.js';

/**
 * 添加新记录
 * @param {Object} record - 记录对象
 * @returns {Object} 添加的记录（含ID和时间戳）
 */
export function addRecord(record) {
    // 确保记录有ID
    if (!record.id) {
        record.id = uid();
    }
    
    // 确保有时间戳
    if (!record.dates) {
        record.dates = {};
    }
    if (!record.dates.createdAt) {
        record.dates.createdAt = new Date().toISOString();
    }
    record.dates.updatedAt = new Date().toISOString();
    
    // 规范化数据
    if (record.cardType) {
        record.cardType = normalizeCardType(record.cardType);
    }
    
    // 添加到状态
    state.records.push(record);
    saveRecords(state.records);
    
    return record;
}

/**
 * 更新记录
 * @param {string} id - 记录ID
 * @param {Object} updates - 更新的字段
 * @returns {Object|null} 更新后的记录，如果未找到返回null
 */
export function updateRecord(id, updates) {
    const index = state.records.findIndex(r => r.id === id);
    if (index === -1) {
        console.warn('记录未找到:', id);
        return null;
    }
    
    // 合并更新
    const record = state.records[index];
    Object.assign(record, updates);
    
    // 更新时间戳
    if (!record.dates) {
        record.dates = {};
    }
    record.dates.updatedAt = new Date().toISOString();
    
    // 规范化数据
    if (record.cardType) {
        record.cardType = normalizeCardType(record.cardType);
    }
    
    saveRecords(state.records);
    return record;
}

/**
 * 删除记录
 * @param {string} id - 记录ID
 * @returns {boolean} 是否成功删除
 */
export function deleteRecord(id) {
    const initialLength = state.records.length;
    state.records = state.records.filter(r => r.id !== id);
    
    if (state.records.length < initialLength) {
        saveRecords(state.records);
        return true;
    }
    
    console.warn('记录未找到:', id);
    return false;
}

/**
 * 获取单个记录
 * @param {string} id - 记录ID
 * @returns {Object|null} 记录对象，如果未找到返回null
 */
export function getRecord(id) {
    return state.records.find(r => r.id === id) || null;
}

/**
 * 根据身份证号查找记录
 * @param {string} idNumber - 身份证号
 * @returns {Array} 匹配的记录数组
 */
export function findRecordsByIdNumber(idNumber) {
    if (!idNumber) return [];
    const normalized = String(idNumber).trim();
    return state.records.filter(r => r.idNumber === normalized);
}

/**
 * 根据保障卡号查找记录
 * @param {string} cardNumber - 保障卡号
 * @returns {Array} 匹配的记录数组
 */
export function findRecordsByCardNumber(cardNumber) {
    if (!cardNumber) return [];
    const normalized = String(cardNumber).trim();
    return state.records.filter(r => r.cardNumber === normalized);
}

/**
 * 检测重复记录
 * @param {Object} newRecord - 新记录
 * @param {string} recordType - 记录类型 ('issue' 或 'recycle')
 * @returns {Object|null} 如果存在重复则返回重复记录，否则返回null
 */
export function checkDuplicate(newRecord, recordType) {
    if (!newRecord) return null;
    
    const dateField = recordType === 'issue' ? 'issueDate' : 'recycleDate';
    const newDate = newRecord[dateField];
    const newIdNumber = newRecord.idNumber;
    const newName = newRecord.name;
    const newCardNumber = newRecord.cardNumber;
    const newDepartment = newRecord.department;
    
    // 重复判断逻辑：
    // 1. 日期相同 + 身份证号相同
    // 2. 日期相同 + 姓名相同 + 保障卡号相同
    // 3. 日期相同 + 姓名相同 + 部别相同
    
    return state.records.find(function(r) {
        // 跳过同一条记录（更新时）
        if (r.id === newRecord.id) return false;
        
        // 日期必须相同才判断为重复
        if (r[dateField] !== newDate) return false;
        
        // 条件1: 身份证号相同
        if (newIdNumber && r.idNumber === newIdNumber) {
            return true;
        }
        
        // 条件2: 姓名相同 + 保障卡号相同
        if (newName && newCardNumber && 
            r.name === newName && r.cardNumber === newCardNumber) {
            return true;
        }
        
        // 条件3: 姓名相同 + 部别相同
        if (newName && newDepartment && 
            r.name === newName && r.department === newDepartment) {
            return true;
        }
        
        return false;
    }) || null;
}

/**
 * 批量检测重复记录
 * @param {Array} newRecords - 新记录数组
 * @param {string} recordType - 记录类型
 * @returns {Object} 包含唯一记录和重复记录的对象
 */
export function checkDuplicates(newRecords, recordType) {
    const uniqueRecords = [];
    const duplicates = [];
    
    newRecords.forEach(function(newRecord) {
        const existingRecord = checkDuplicate(newRecord, recordType);
        
        if (existingRecord) {
            const existingIndex = state.records.findIndex(r => r.id === existingRecord.id);
            duplicates.push({
                record: newRecord,
                existing: existingRecord,
                existingIndex: existingIndex
            });
        } else {
            uniqueRecords.push(newRecord);
        }
    });
    
    return {
        uniqueRecords: uniqueRecords,
        duplicates: duplicates
    };
}

/**
 * 验证记录数据
 * @param {Object} record - 记录对象
 * @param {string} recordType - 记录类型
 * @returns {Object} 验证结果 {valid: boolean, errors: Array}
 */
export function validateRecord(record, recordType) {
    const errors = [];
    
    // 必填字段验证
    if (!record.name || !record.name.trim()) {
        errors.push('姓名不能为空');
    }
    
    if (!record.idNumber || !record.idNumber.trim()) {
        errors.push('身份证号码不能为空');
    } else {
        // 身份证号格式验证
        const idNumber = record.idNumber.trim();
        if (!/^[0-9]{17}[0-9Xx]$/.test(idNumber)) {
            errors.push('身份证号码格式不正确（应为18位）');
        }
    }
    
    if (!record.department || !record.department.trim()) {
        errors.push('部别不能为空');
    }
    
    // 卡类型验证
    if (!record.cardType || !record.cardType.trim()) {
        errors.push('卡类型不能为空');
    }
    
    // 日期验证
    if (recordType === 'issue') {
        if (!record.issueDate || !record.issueDate.trim()) {
            errors.push('发卡日期不能为空');
        }
    } else if (recordType === 'recycle') {
        if (!record.recycleDate || !record.recycleDate.trim()) {
            errors.push('回收日期不能为空');
        }
        if (!record.reason || !record.reason.trim()) {
            errors.push('回收原因不能为空');
        }
    }
    
    // 保障卡号格式验证（如果填写了）
    if (record.cardNumber && record.cardNumber.trim()) {
        const cardNumber = record.cardNumber.trim();
        if (!/^[0-9]+$/.test(cardNumber)) {
            errors.push('保障卡号只能包含数字');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * 批量更新记录
 * @param {Array} ids - 记录ID数组
 * @param {Object} updates - 更新的字段
 * @returns {number} 成功更新的记录数量
 */
export function batchUpdate(ids, updates) {
    let count = 0;
    
    ids.forEach(function(id) {
        const result = updateRecord(id, updates);
        if (result) count++;
    });
    
    return count;
}

/**
 * 批量删除记录
 * @param {Array} ids - 记录ID数组
 * @returns {number} 成功删除的记录数量
 */
export function batchDelete(ids) {
    let count = 0;
    
    ids.forEach(function(id) {
        if (deleteRecord(id)) count++;
    });
    
    return count;
}

/**
 * 获取所有记录
 * @returns {Array} 所有记录的副本
 */
export function getAllRecords() {
    return [...state.records];
}

/**
 * 获取记录数量
 * @returns {number} 记录总数
 */
export function getRecordCount() {
    return state.records.length;
}

/**
 * 创建发卡记录对象
 * @param {Object} data - 原始数据
 * @returns {Object} 标准化的发卡记录对象
 */
export function createIssueRecord(data) {
    return {
        id: data.id || uid(),
        action: 'issue',
        department: data.department || '',
        name: data.name || '',
        idNumber: data.idNumber || '',
        cardNumber: data.cardNumber || '',
        cardType: normalizeCardType(data.cardType || 'Ⅰ类卡'),
        cardStatus: data.cardStatus || '未发卡',
        issueDate: parseDate(data.issueDate) || fmtDate(new Date()),
        receiveDate: parseDate(data.receiveDate) || '',
        familyMember: data.familyMember || '',
        remark: data.remark || '',
        dates: {
            createdAt: data.dates?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };
}

/**
 * 创建收卡记录对象
 * @param {Object} data - 原始数据
 * @returns {Object} 标准化的收卡记录对象
 */
export function createRecycleRecord(data) {
    return {
        id: data.id || uid(),
        action: 'recycle',
        department: data.department || '',
        name: data.name || '',
        idNumber: data.idNumber || '',
        cardNumber: data.cardNumber || '',
        cardType: normalizeCardType(data.cardType || 'Ⅰ类卡'),
        status: data.status || 'done',
        reason: data.reason || '',
        recycleDate: parseDate(data.recycleDate) || fmtDate(new Date()),
        remark: data.remark || '',
        dates: {
            createdAt: data.dates?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };
}

/**
 * 导入记录（支持去重和更新）
 * @param {Array} records - 要导入的记录数组
 * @param {string} recordType - 记录类型
 * @param {Object} options - 选项 {skipDuplicates: boolean, updateDuplicates: boolean}
 * @returns {Object} 导入结果
 */
export function importRecords(records, recordType, options = {}) {
    const { skipDuplicates = true, updateDuplicates = false } = options;
    
    const result = checkDuplicates(records, recordType);
    const { uniqueRecords, duplicates } = result;
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    
    // 导入唯一记录
    uniqueRecords.forEach(function(record) {
        addRecord(record);
        imported++;
    });
    
    // 处理重复记录
    if (updateDuplicates && !skipDuplicates) {
        // 更新重复记录
        duplicates.forEach(function(dup) {
            const existingId = state.records[dup.existingIndex].id;
            const existingCreatedAt = state.records[dup.existingIndex].dates.createdAt;
            
            dup.record.id = existingId;
            dup.record.dates.createdAt = existingCreatedAt;
            dup.record.dates.updatedAt = new Date().toISOString();
            
            state.records[dup.existingIndex] = dup.record;
            updated++;
        });
        
        saveRecords(state.records);
    } else {
        // 跳过重复记录
        skipped = duplicates.length;
    }
    
    return {
        imported: imported,
        updated: updated,
        skipped: skipped,
        total: records.length,
        duplicates: duplicates
    };
}

/**
 * 更新常用部门列表
 * @param {Array} records - 记录数组（可选，默认使用state.records）
 */
export function updateCommonDepartments(records = null) {
    const dataSource = records || state.records;
    
    // 统计各部别出现次数
    const departmentCount = {};
    dataSource.forEach(function(r) {
        if (r.department && r.department.trim()) {
            const dept = r.department.trim();
            departmentCount[dept] = (departmentCount[dept] || 0) + 1;
        }
    });
    
    // 按出现次数排序，取前10个
    const sortedDepartments = Object.keys(departmentCount)
        .sort(function(a, b) {
            return departmentCount[b] - departmentCount[a];
        })
        .slice(0, 10);
    
    // 更新配置
    state.config.commonDepartments = sortedDepartments;
    
    return sortedDepartments;
}

