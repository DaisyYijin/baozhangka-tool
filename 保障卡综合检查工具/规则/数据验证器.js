/**
 * 数据校验工具
 * 在数据处理前进行预检查，避免运行时错误
 */
(function(window) {
    'use strict';
    
    var DataValidator = {
        /**
         * 检查必需字段
         * @param {Array} data - 数据数组
         * @param {Array} requiredFields - 必需字段数组
         * @returns {Object} {valid: boolean, missingFields: Array, message: string}
         */
        checkRequiredFields: function(data, requiredFields) {
            if (!data || !Array.isArray(data)) {
                return {
                    valid: false,
                    missingFields: requiredFields || [],
                    message: '数据格式错误或为空'
                };
            }
            
            if (data.length === 0) {
                return {
                    valid: false,
                    missingFields: requiredFields || [],
                    message: '数据为空，请检查Excel文件'
                };
            }
            
            if (!requiredFields || !Array.isArray(requiredFields) || requiredFields.length === 0) {
                return {
                    valid: true,
                    missingFields: [],
                    message: '没有必需字段要求'
                };
            }
            
            // 检查第一行数据的字段
            var firstRow = data[0];
            var missingFields = [];
            
            for (var i = 0; i < requiredFields.length; i++) {
                var field = requiredFields[i];
                if (!(field in firstRow)) {
                    missingFields.push(field);
                }
            }
            
            if (missingFields.length > 0) {
                return {
                    valid: false,
                    missingFields: missingFields,
                    message: '缺少必需字段: ' + missingFields.join(', ')
                };
            }
            
            return {
                valid: true,
                missingFields: [],
                message: '所有必需字段都存在'
            };
        },
        
        /**
         * 检查数据行数
         * @param {Array} data - 数据数组
         * @param {number} minRows - 最小行数（可选）
         * @param {number} maxRows - 最大行数（可选）
         * @returns {Object} {valid: boolean, rowCount: number, message: string}
         */
        checkRowCount: function(data, minRows, maxRows) {
            if (!data || !Array.isArray(data)) {
                return {
                    valid: false,
                    rowCount: 0,
                    message: '数据格式错误或为空'
                };
            }
            
            var count = data.length;
            
            if (minRows !== undefined && count < minRows) {
                return {
                    valid: false,
                    rowCount: count,
                    message: '数据行数过少: ' + count + ' 行（最少需要 ' + minRows + ' 行）'
                };
            }
            
            if (maxRows !== undefined && count > maxRows) {
                return {
                    valid: false,
                    rowCount: count,
                    message: '数据行数过多: ' + count + ' 行（最多支持 ' + maxRows + ' 行）'
                };
            }
            
            return {
                valid: true,
                rowCount: count,
                message: '数据行数正常: ' + count + ' 行'
            };
        },
        
        /**
         * 智能字段获取（处理字段名变化和别名）
         * @param {Object} row - 数据行
         * @param {string} standardFieldName - 标准字段名
         * @param {Array} aliases - 字段别名数组（可选）
         * @returns {any} 字段值，找不到返回 undefined
         */
        getFieldValue: function(row, standardFieldName, aliases) {
            if (!row) return undefined;
            
            // 优先使用 FieldMappings（如果可用）
            if (window.FieldMappings && window.FieldMappings.getFieldValue) {
                return window.FieldMappings.getFieldValue(row, standardFieldName, aliases);
            }
            
            // 备用实现
            if (standardFieldName in row) {
                return row[standardFieldName];
            }
            
            if (aliases && Array.isArray(aliases)) {
                for (var i = 0; i < aliases.length; i++) {
                    var alias = aliases[i];
                    if (alias in row) {
                        return row[alias];
                    }
                }
            }
            
            return undefined;
        },
        
        /**
         * 检查字段值的有效性
         * @param {any} value - 字段值
         * @param {Object} rules - 验证规则 {required, type, min, max, pattern, enum}
         * @returns {Object} {valid: boolean, message: string}
         */
        validateFieldValue: function(value, rules) {
            if (!rules) {
                return {valid: true, message: ''};
            }
            
            // 检查必填
            if (rules.required) {
                if (value === null || value === undefined || value === '') {
                    return {valid: false, message: '字段不能为空'};
                }
                if (typeof value === 'string' && value.trim() === '') {
                    return {valid: false, message: '字段不能为空'};
                }
            }
            
            // 如果值为空且非必填，直接通过
            if (value === null || value === undefined || value === '') {
                return {valid: true, message: ''};
            }
            
            // 检查类型
            if (rules.type) {
                var actualType = typeof value;
                if (rules.type === 'number' && actualType !== 'number') {
                    return {valid: false, message: '字段类型应为数字'};
                }
                if (rules.type === 'string' && actualType !== 'string') {
                    return {valid: false, message: '字段类型应为字符串'};
                }
                if (rules.type === 'boolean' && actualType !== 'boolean') {
                    return {valid: false, message: '字段类型应为布尔值'};
                }
            }
            
            // 检查最小值/最小长度
            if (rules.min !== undefined) {
                if (typeof value === 'number' && value < rules.min) {
                    return {valid: false, message: '值不能小于 ' + rules.min};
                }
                if (typeof value === 'string' && value.length < rules.min) {
                    return {valid: false, message: '长度不能少于 ' + rules.min + ' 个字符'};
                }
            }
            
            // 检查最大值/最大长度
            if (rules.max !== undefined) {
                if (typeof value === 'number' && value > rules.max) {
                    return {valid: false, message: '值不能大于 ' + rules.max};
                }
                if (typeof value === 'string' && value.length > rules.max) {
                    return {valid: false, message: '长度不能超过 ' + rules.max + ' 个字符'};
                }
            }
            
            // 检查正则表达式
            if (rules.pattern && value !== null && value !== undefined) {
                var pattern = rules.pattern;
                if (typeof pattern === 'string') {
                    pattern = new RegExp(pattern);
                }
                if (!pattern.test(String(value))) {
                    return {valid: false, message: '字段格式不正确'};
                }
            }
            
            // 检查枚举值
            if (rules.enum && Array.isArray(rules.enum)) {
                var strValue = String(value).trim();
                var found = false;
                for (var i = 0; i < rules.enum.length; i++) {
                    if (String(rules.enum[i]) === strValue) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return {
                        valid: false,
                        message: '无效的值，应为: ' + rules.enum.join(', ')
                    };
                }
            }
            
            return {valid: true, message: ''};
        },
        
        /**
         * 检查数据完整性
         * @param {Array} data - 数据数组
         * @param {Object} fieldRules - 字段验证规则 {fieldName: rules}
         * @returns {Object} {valid: boolean, errors: Array, summary: Object}
         */
        validateData: function(data, fieldRules) {
            if (!data || !Array.isArray(data) || data.length === 0) {
                return {
                    valid: false,
                    errors: [],
                    summary: {
                        total: 0,
                        valid: 0,
                        invalid: 0
                    }
                };
            }
            
            if (!fieldRules || typeof fieldRules !== 'object') {
                return {
                    valid: true,
                    errors: [],
                    summary: {
                        total: data.length,
                        valid: data.length,
                        invalid: 0
                    }
                };
            }
            
            var errors = [];
            var invalidCount = 0;
            
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                var rowErrors = [];
                
                for (var fieldName in fieldRules) {
                    if (fieldRules.hasOwnProperty(fieldName)) {
                        var rules = fieldRules[fieldName];
                        var value = row[fieldName];
                        var result = this.validateFieldValue(value, rules);
                        
                        if (!result.valid) {
                            rowErrors.push({
                                row: i + 2,  // Excel行号（从2开始）
                                field: fieldName,
                                value: value,
                                message: result.message
                            });
                        }
                    }
                }
                
                if (rowErrors.length > 0) {
                    invalidCount++;
                    errors.push({
                        row: i + 2,
                        errors: rowErrors
                    });
                }
            }
            
            return {
                valid: invalidCount === 0,
                errors: errors,
                summary: {
                    total: data.length,
                    valid: data.length - invalidCount,
                    invalid: invalidCount
                }
            };
        },
        
        /**
         * 检查重复值
         * @param {Array} data - 数据数组
         * @param {string|Array} keyFields - 键字段（单个或多个）
         * @returns {Object} {hasDuplicates: boolean, duplicates: Array}
         */
        checkDuplicates: function(data, keyFields) {
            if (!data || !Array.isArray(data) || data.length === 0) {
                return {hasDuplicates: false, duplicates: []};
            }
            
            var fields = Array.isArray(keyFields) ? keyFields : [keyFields];
            var seen = {};
            var duplicates = [];
            
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                var keyParts = [];
                
                for (var j = 0; j < fields.length; j++) {
                    var field = fields[j];
                    var value = row[field];
                    keyParts.push(String(value || ''));
                }
                
                var key = keyParts.join('||');
                
                if (seen[key] !== undefined) {
                    duplicates.push({
                        row: i + 2,
                        duplicateOf: seen[key] + 2,
                        key: keyParts
                    });
                } else {
                    seen[key] = i;
                }
            }
            
            return {
                hasDuplicates: duplicates.length > 0,
                duplicates: duplicates
            };
        }
    };
    
    // 挂载到全局
    window.DataValidator = DataValidator;
    
})(window);

