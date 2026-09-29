/**
 * 错误格式化模块
 * 提供统一的错误对象创建和格式化功能
 * 
 * 主要功能：
 * - createError: 创建标准格式的错误对象
 * - formatValue: 格式化显示值
 * - isEmpty: 判断值是否为空
 * 
 * 设计思路：
 * 优先使用 DataCheckUtils 中的同名函数（如果存在）
 * 否则使用本模块提供的备用实现
 * 实现了向后兼容和解耦
 */

/**
 * 创建错误对象
 * @param {object} row - 数据行对象
 * @param {any} currentValue - 当前值
 * @param {string} errorDetail - 错误详情描述
 * @param {string} ruleName - 规则名称
 * @param {number} rowIndex - 行索引（从0开始）
 * @returns {object} 标准格式的错误对象
 */
function createError(row, currentValue, errorDetail, ruleName, rowIndex) {
    if (typeof DataCheckUtils !== 'undefined' && DataCheckUtils.createError) {
        return DataCheckUtils.createError(row, currentValue, errorDetail, ruleName, rowIndex);
    }
    
    ruleName = ruleName || '';
    rowIndex = rowIndex !== undefined ? rowIndex : null;
    
    var error = {
        '姓名': row['姓名'] || '',
        '身份证号码': row['公民身份号码'] || row['身份证号码'] || row['证件编号'] || '',
        '当前值': formatValue(currentValue),
        '错误详情': errorDetail
    };
    
    if (rowIndex !== null) {
        error['行号'] = rowIndex + 2;
    }
    
    if (ruleName) {
        error['规则名称'] = ruleName;
    }
    
    return error;
}

/**
 * 格式化显示值
 * 将null、undefined、空字符串等统一显示为"空"
 * 统一使用 DataCheckUtils 中的实现
 * @param {any} value - 原始值
 * @returns {string} 格式化后的显示值
 */
function formatValue(value) {
    // 优先使用 DataCheckUtils
    if (typeof DataCheckUtils !== 'undefined' && DataCheckUtils.formatValue) {
        return DataCheckUtils.formatValue(value);
    }
    
    // 备用实现（仅在 DataCheckUtils 未加载时使用）
    if (value === null || value === undefined || value === '') {
        return '空';
    }
    
    if (typeof value === 'number' && isNaN(value)) {
        return '空';
    }
    
    var strValue = String(value).trim();
    if (strValue.toLowerCase() === 'undefined' || 
        strValue.toLowerCase() === 'null' || 
        strValue.toLowerCase() === 'nan') {
        return '空';
    }
    
    return strValue;
}

/**
 * 判断值是否为空
 * 统一使用 DataCheckUtils 中的实现
 * @param {any} value - 要检查的值
 * @returns {boolean} 是否为空
 */
function isEmpty(value) {
    // 优先使用 DataCheckUtils
    if (typeof DataCheckUtils !== 'undefined' && DataCheckUtils.isEmpty) {
        return DataCheckUtils.isEmpty(value);
    }
    
    // 备用实现（仅在 DataCheckUtils 未加载时使用）
    if (value === null || value === undefined || value === '') {
        return true;
    }
    
    if (typeof value === 'string' && value.trim() === '') {
        return true;
    }
    
    if (typeof value === 'number' && isNaN(value)) {
        return true;
    }
    
    return false;
}

function getIdNumber(row) {
    if (typeof DataCheckUtils !== 'undefined' && DataCheckUtils.getIdNumber) {
        return DataCheckUtils.getIdNumber(row);
    }
    
    return row['公民身份号码'] || row['身份证号码'] || row['证件编号'] || '';
}

function getName(row) {
    if (typeof DataCheckUtils !== 'undefined' && DataCheckUtils.getName) {
        return DataCheckUtils.getName(row);
    }
    
    return row['姓名'] || '';
}

function batchCreateErrors(rows, checkFunction, ruleName) {
    if (typeof DataCheckUtils !== 'undefined' && DataCheckUtils.batchCreateErrors) {
        return DataCheckUtils.batchCreateErrors(rows, checkFunction, ruleName);
    }
    
    var errors = [];
    ruleName = ruleName || '';
    
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var result = checkFunction(row, i);
        if (result) {
            errors.push(createError(
                row,
                result.currentValue,
                result.errorDetail,
                ruleName,
                i
            ));
        }
    }
    
    return errors;
}

