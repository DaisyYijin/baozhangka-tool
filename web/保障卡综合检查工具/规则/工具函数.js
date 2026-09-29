/**
 * 数据检查工具库
 * 提供通用的数据处理和验证函数
 * 使用IIFE模式封装,避免全局命名空间污染
 * 
 * 导出对象：DataCheckUtils
 * 主要功能：
 * - isEmpty: 判断值是否为空
 * - formatValue: 格式化显示值
 * - parseDate: 解析日期
 * - formatDate: 格式化日期
 * - calculateAge: 计算年龄
 * - validateIDCard: 验证身份证号
 * - arrayUnique: 数组去重
 */
(function(window) {
    'use strict';
    
    var DataCheckUtils = {};
    var VALID_MOBILE_PREFIXES = [
        '134', '135', '136', '137', '138', '139',
        '147', '148', '150', '151', '152', '157', '158', '159',
        '165', '172', '178', '182', '183', '184', '187', '188',
        '195', '197', '198', '130', '131', '132', '145', '146',
        '155', '156', '166', '167', '171', '175', '176', '185',
        '186', '196', '133', '141', '149', '153', '162', '170',
        '173', '174', '177', '180', '181', '189', '190', '191',
        '193', '199', '192'
    ];
    var LANDLINE_REGEX = /^(0\d{2,3}-?\d{6,8}|[48]00-?\d{3,4}-?\d{3,4})$/;
    
    /**
     * 判断值是否为空
     * @param {any} value - 要检查的值
     * @returns {boolean} 是否为空
     */
    DataCheckUtils.isEmpty = function(value) {
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
    };
    
    /**
     * 格式化显示值
     * 将空值、undefined、null等统一显示为"空"
     * @param {any} value - 原始值
     * @returns {string} 格式化后的显示值
     */
    DataCheckUtils.formatValue = function(value) {
        if (value === null || value === undefined || value === '') {
            return '空';
        }
        
        if (typeof value === 'number' && isNaN(value)) {
            return '空';
        }
        
        var strValue = String(value).trim();
        if (strValue.toLowerCase() === 'undefined' || 
            strValue.toLowerCase() === 'null' || 
            strValue.toLowerCase() === 'nan' ||
            strValue.toLowerCase() === 'none') {
            return '空';
        }
        
        return strValue;
    };
    
    /**
     * 格式化显示值（别名）
     */
    DataCheckUtils.formatDisplayValue = function(val) {
        return DataCheckUtils.formatValue(val);
    };
    
    /**
     * 日期解析函数
     * 支持多种日期格式：
     * - Date对象
     * - 8位数字格式（如20190901）
     * - 其他标准日期格式
     * @param {any} dateVal - 日期值
     * @returns {Date|null} 解析后的Date对象，失败返回null
     */
    DataCheckUtils.parseDate = function(dateVal) {
        if (DataCheckUtils.isEmpty(dateVal)) {
            return null;
        }
        
        var dateStr = String(dateVal).trim();
        if (dateStr === '' || dateStr === 'undefined' || dateStr === 'null') {
            return null;
        }
        
        if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            return dateVal;
        }
        
        var numOnly = dateStr.replace(/[^0-9]/g, '');
        
        if (numOnly.length === 8) {
            var year = parseInt(numOnly.substring(0, 4));
            var month = parseInt(numOnly.substring(4, 6)) - 1;
            var day = parseInt(numOnly.substring(6, 8));
            
            if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                var date = new Date(year, month, day);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        return null;
    };
    
    DataCheckUtils.getIdNumber = function(row) {
        // 只获取身份证号码，证件编号是独立字段（军队证件编号，如"军字第XXX号"）
        return row['公民身份号码'] || row['身份证号码'] || '';
    };
    
    DataCheckUtils.getName = function(row) {
        return row['姓名'] || '';
    };
    
    DataCheckUtils.createError = function(row, currentValue, errorDetail, ruleName, rowIndex) {
        ruleName = ruleName || '';
        rowIndex = rowIndex !== undefined ? rowIndex : null;
        
        var idNumber = DataCheckUtils.getIdNumber(row);
        var name = DataCheckUtils.getName(row);
        var formattedValue = DataCheckUtils.formatValue(currentValue);
        
        var error = {
            '姓名': name,
            '身份证号码': idNumber,
            '当前值': formattedValue,
            '错误详情': errorDetail
        };
        
        if (rowIndex !== null) {
            error['行号'] = rowIndex + 2;
        }
        
        if (ruleName) {
            error['规则名称'] = ruleName;
        }
        
        return error;
    };
    
    DataCheckUtils.escapeHtml = function(text) {
        if (typeof text !== 'string') {
            text = String(text);
        }
        
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            '/': '&#x2F;'
        };
        
        return text.replace(/[&<>"'\/]/g, function(m) { 
            return map[m]; 
        });
    };
    
    DataCheckUtils.batchCreateErrors = function(rows, checkFunction, ruleName) {
        var errors = [];
        ruleName = ruleName || '';
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var result = checkFunction(row, i);
            if (result) {
                errors.push(DataCheckUtils.createError(
                    row,
                    result.currentValue,
                    result.errorDetail,
                    ruleName,
                    i
                ));
            }
        }
        
        return errors;
    };
    
    DataCheckUtils.isValidPhone = function(phone) {
        if (DataCheckUtils.isEmpty(phone)) {
            return false;
        }
        
        var phoneStr = String(phone).trim();
        
        return isValidMobileNumber(phoneStr) || isValidLandlineNumber(phoneStr);
    };

    function isValidMobileNumber(phoneStr) {
        if (!/^\d{11}$/.test(phoneStr)) {
            return false;
        }
        var prefix = phoneStr.substring(0, 3);
        return VALID_MOBILE_PREFIXES.indexOf(prefix) !== -1;
    }
    
    function isValidLandlineNumber(phoneStr) {
        return LANDLINE_REGEX.test(phoneStr);
    }
    
    DataCheckUtils.isValidIdCard = function(idCard) {
        if (DataCheckUtils.isEmpty(idCard)) {
            return false;
        }
        
        var idStr = String(idCard).trim();
        
        if (!/^(\d{15}|\d{17}[\dXx])$/.test(idStr)) {
            return false;
        }
        
        if (idStr.length === 18) {
            var weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
            var checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
            
            var sum = 0;
            for (var i = 0; i < 17; i++) {
                sum += parseInt(idStr.charAt(i)) * weights[i];
            }
            
            var checkCode = checkCodes[sum % 11];
            var lastChar = idStr.charAt(17).toUpperCase();
            
            return lastChar === checkCode;
        }
        
        return true;
    };
    
    DataCheckUtils.getBirthDateFromIdCard = function(idCard) {
        if (DataCheckUtils.isEmpty(idCard)) {
            return null;
        }
        
        var idStr = String(idCard).trim();
        var year, month, day;
        
        if (idStr.length === 15) {
            year = '19' + idStr.substring(6, 8);
            month = idStr.substring(8, 10);
            day = idStr.substring(10, 12);
        } else if (idStr.length === 18) {
            year = idStr.substring(6, 10);
            month = idStr.substring(10, 12);
            day = idStr.substring(12, 14);
        } else {
            return null;
        }
        
        var date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (isNaN(date.getTime())) {
            return null;
        }
        
        return date;
    };
    
    DataCheckUtils.getGenderFromIdCard = function(idCard) {
        if (DataCheckUtils.isEmpty(idCard)) {
            return '';
        }
        
        var idStr = String(idCard).trim();
        var genderCode;
        
        if (idStr.length === 15) {
            genderCode = parseInt(idStr.charAt(14));
        } else if (idStr.length === 18) {
            genderCode = parseInt(idStr.charAt(16));
        } else {
            return '';
        }
        
        return genderCode % 2 === 0 ? '女' : '男';
    };
    
    DataCheckUtils.getYearsDiff = function(date1, date2) {
        if (!date1 || !date2) {
            return 0;
        }
        
        var days = (date2 - date1) / (1000 * 60 * 60 * 24);
        return days / 365.25;
    };
    
    DataCheckUtils.arrayIncludes = function(array, value) {
        if (!array || !array.length) {
            return false;
        }
        
        if (Array.prototype.indexOf) {
            return array.indexOf(value) !== -1;
        }
        
        for (var i = 0; i < array.length; i++) {
            if (array[i] === value) {
                return true;
            }
        }
        
        return false;
    };
    
    DataCheckUtils.arrayUnique = function(array) {
        if (!array || !array.length) {
            return [];
        }
        
        var result = [];
        var seen = {};
        
        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            var key = typeof item + String(item);
            
            if (!seen[key]) {
                seen[key] = true;
                result.push(item);
            }
        }
        
        return result;
    };
    
    DataCheckUtils.deepClone = function(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            var arrCopy = [];
            for (var i = 0; i < obj.length; i++) {
                arrCopy[i] = DataCheckUtils.deepClone(obj[i]);
            }
            return arrCopy;
        }
        
        var objCopy = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                objCopy[key] = DataCheckUtils.deepClone(obj[key]);
            }
        }
        
        return objCopy;
    };
    
    /**
     * 标记单元格颜色（用于数据生成）
     * 统一生成器中的颜色标记逻辑，避免重复代码
     * @param {Object} colors - 颜色对象（行索引 -> 字段 -> 颜色）
     * @param {number} rowIndex - 行索引
     * @param {string} fieldName - 字段名
     * @param {string} color - 颜色值（'yellow'=新生成, 'orange'=已修改）
     */
    DataCheckUtils.markCellColor = function(colors, rowIndex, fieldName, color) {
        if (!colors) return;
        if (!colors[rowIndex]) {
            colors[rowIndex] = {};
        }
        colors[rowIndex][fieldName] = color || 'yellow';
    };
    
    /**
     * 标准化省份名称
     * 将各种省份别名统一为标准行政区划名称
     * @param {string} location - 原始地址
     * @returns {string} 标准化后的地址
     * 
     * 示例：
     * - normalizeProvince('广西省南宁市') → '广西壮族自治区南宁市'
     * - normalizeProvince('内蒙古省呼和浩特市') → '内蒙古自治区呼和浩特市'
     */
    DataCheckUtils.normalizeProvince = function(location) {
        if (!location) return location;
        
        var loc = String(location).trim();
        var aliases = window.DataCheckConstants ? window.DataCheckConstants.PROVINCE_ALIASES : {
            '广西省': '广西壮族自治区',
            '广西': '广西壮族自治区',
            '内蒙古省': '内蒙古自治区',
            '内蒙': '内蒙古自治区',
            '西藏省': '西藏自治区',
            '宁夏省': '宁夏回族自治区',
            '宁夏': '宁夏回族自治区',
            '新疆省': '新疆维吾尔自治区',
            '新疆': '新疆维吾尔自治区',
            '香港': '香港特别行政区',
            '澳门': '澳门特别行政区'
        };
        
        // 检查是否包含别名，如果有则替换
        for (var alias in aliases) {
            if (aliases.hasOwnProperty(alias) && loc.indexOf(alias) !== -1) {
                // 检查是否已经是完整名称
                var fullName = aliases[alias];
                if (loc.indexOf(fullName) === -1) {
                    loc = loc.replace(alias, fullName);
                }
            }
        }
        
        return loc;
    };
    
    window.DataCheckUtils = DataCheckUtils;
    window.DCUtils = DataCheckUtils;
    
})(window);

