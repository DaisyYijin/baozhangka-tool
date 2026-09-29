/**
 * 错误消息管理模块
 * 统一管理所有错误消息模板，便于维护和国际化
 */
(function(window) {
    'use strict';
    
    var ErrorMessages = {
        /**
         * 字段为空错误
         * @param {string} fieldName - 字段名称
         * @returns {string} 错误消息
         */
        FIELD_EMPTY: function(fieldName) {
            return fieldName + '不能为空';
        },
        
        /**
         * 字段值无效错误
         * @param {string} fieldName - 字段名称
         * @param {string} value - 当前值
         * @param {Array} validValues - 有效值列表
         * @returns {string} 错误消息
         */
        FIELD_INVALID: function(fieldName, value, validValues) {
            if (validValues && validValues.length > 0) {
                return '无效的' + fieldName + ': ' + value + ' (应为: ' + validValues.join(', ') + ')';
            }
            return '无效的' + fieldName + ': ' + value;
        },
        
        /**
         * 日期格式错误
         * @param {string} fieldName - 字段名称
         * @param {string} value - 当前值
         * @param {string} expectedFormat - 期望格式（可选）
         * @returns {string} 错误消息
         */
        DATE_FORMAT_ERROR: function(fieldName, value, expectedFormat) {
            var format = expectedFormat || '8位数字格式（如20190901）';
            return fieldName + '格式错误: ' + value + ' (应为' + format + ')';
        },
        
        /**
         * 日期范围错误
         * @param {string} startFieldName - 起始日期字段名
         * @param {string} endFieldName - 结束日期字段名
         * @param {string} startValue - 起始值
         * @param {string} endValue - 结束值
         * @returns {string} 错误消息
         */
        DATE_RANGE_ERROR: function(startFieldName, endFieldName, startValue, endValue) {
            return startFieldName + '不能晚于' + endFieldName + ': ' + startValue + ' vs ' + endValue;
        },
        
        /**
         * 日期早于错误
         * @param {string} field1 - 字段1名称
         * @param {string} field2 - 字段2名称
         * @returns {string} 错误消息
         */
        DATE_BEFORE_ERROR: function(field1, field2) {
            return field1 + '早于' + field2;
        },
        
        /**
         * 字段长度错误
         * @param {string} fieldName - 字段名称
         * @param {string} value - 当前值
         * @param {number} expectedLength - 期望长度
         * @returns {string} 错误消息
         */
        LENGTH_ERROR: function(fieldName, value, expectedLength) {
            return fieldName + '长度错误: ' + value + ' (应为' + expectedLength + '位)';
        },
        
        /**
         * 格式错误（通用）
         * @param {string} fieldName - 字段名称
         * @param {string} value - 当前值
         * @param {string} pattern - 格式说明
         * @returns {string} 错误消息
         */
        FORMAT_ERROR: function(fieldName, value, pattern) {
            return fieldName + '格式错误: ' + value + ' (应为' + pattern + ')';
        },
        
        /**
         * 前缀错误
         * @param {string} fieldName - 字段名称
         * @param {string} value - 当前值
         * @param {string} expectedPrefix - 期望前缀
         * @returns {string} 错误消息
         */
        PREFIX_ERROR: function(fieldName, value, expectedPrefix) {
            return fieldName + '应以"' + expectedPrefix + '"开头，当前值: ' + value;
        },
        
        /**
         * 后缀错误
         * @param {string} fieldName - 字段名称
         * @param {string} value - 当前值
         * @param {string} expectedSuffix - 期望后缀
         * @returns {string} 错误消息
         */
        SUFFIX_ERROR: function(fieldName, value, expectedSuffix) {
            return fieldName + '应以"' + expectedSuffix + '"结尾，当前值: ' + value;
        },
        
        /**
         * 不一致错误
         * @param {string} field1 - 字段1名称
         * @param {string} field2 - 字段2名称
         * @param {string} value1 - 值1
         * @param {string} value2 - 值2
         * @returns {string} 错误消息
         */
        INCONSISTENT_ERROR: function(field1, field2, value1, value2) {
            return field1 + '与' + field2 + '不一致: ' + value1 + ' vs ' + value2;
        },
        
        /**
         * 不匹配错误
         * @param {string} fieldName - 字段名称
         * @param {string} referenceFieldName - 参照字段名称
         * @param {string} value - 当前值
         * @param {string} expectedValue - 期望值
         * @returns {string} 错误消息
         */
        MISMATCH_ERROR: function(fieldName, referenceFieldName, value, expectedValue) {
            return fieldName + '与' + referenceFieldName + '不匹配: 实际为 ' + value + '，应为 ' + expectedValue;
        },
        
        /**
         * 信息缺失错误
         * @param {string} category - 类别
         * @param {Array} missingFields - 缺失字段列表
         * @returns {string} 错误消息
         */
        MISSING_INFO_ERROR: function(category, missingFields) {
            return category + '缺失: ' + missingFields.join(', ');
        },
        
        /**
         * 条件不满足错误
         * @param {string} condition - 条件描述
         * @param {string} requirement - 要求描述
         * @returns {string} 错误消息
         */
        CONDITION_ERROR: function(condition, requirement) {
            return '当' + condition + '时，' + requirement;
        },
        
        /**
         * 值范围错误
         * @param {string} fieldName - 字段名称
         * @param {string} value - 当前值
         * @param {string} min - 最小值
         * @param {string} max - 最大值
         * @returns {string} 错误消息
         */
        RANGE_ERROR: function(fieldName, value, min, max) {
            return fieldName + '超出范围: ' + value + ' (应在 ' + min + ' 到 ' + max + ' 之间)';
        },
        
        /**
         * 年限错误
         * @param {string} fieldName - 字段名称
         * @param {number} actual - 实际年限
         * @param {number} expected - 期望年限
         * @param {number} tolerance - 容差
         * @returns {string} 错误消息
         */
        YEARS_ERROR: function(fieldName, actual, expected, tolerance) {
            var minYears = expected - tolerance;
            var maxYears = expected + tolerance;
            var compareStr = actual < minYears ? '过短' : '过长';
            return fieldName + compareStr + ': ' + actual.toFixed(1) + '年 (标准: ' + expected + '年，允许范围: ' + minYears.toFixed(1) + '-' + maxYears.toFixed(1) + '年)';
        },
        
        /**
         * 通用错误（自定义消息）
         * @param {string} message - 错误消息
         * @returns {string} 错误消息
         */
        CUSTOM: function(message) {
            return message;
        }
    };
    
    // 挂载到全局
    window.ErrorMessages = ErrorMessages;
    
})(window);

