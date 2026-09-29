/**
 * 数据验证规则模块（规则注册表 + 公共工具）
 *
 * 说明：各检查规则的实际实现已拆分到 规则/ 目录下的独立文件中
 * （每个文件定义 window.checkXxx 并调用 registerValidationRule 自动注册）。
 * 本文件仅保留全局注册表与公共工具函数，不再内置任何检查规则的实现，
 * 避免同一规则出现两套实现、依赖 script 加载顺序决定检查口径的问题。
 * 规则的实际调度以 脚本/主脚本.js 中的 RULES_MAPPING 为准。
 */

/**
 * 全局规则注册表
 * 所有验证规则都会注册到这个对象中，便于统一管理和调用
 * 结构：{ 规则名称: { name: 规则名称, func: 验证函数, category: 类别, description: 描述 } }
 */
window.VALIDATION_RULES = window.VALIDATION_RULES || {};

/**
 * 注册验证规则
 * @param {string} name - 规则名称
 * @param {Function} func - 验证函数
 * @param {string} category - 规则类别
 * @param {string} description - 规则描述
 */
function registerValidationRule(name, func, category, description) {
    window.VALIDATION_RULES[name] = {
        name: name,
        func: func,
        category: category || '通用',
        description: description || ''
    };
}

/**
 * 获取所有已注册的规则
 * @returns {Object} 规则对象集合
 */
function getAllRules() {
    return window.VALIDATION_RULES;
}

/**
 * 按类别获取规则
 * @param {string} category - 类别名称
 * @returns {Array} 该类别的规则数组
 */
function getRulesByCategory(category) {
    var rules = [];
    for (var key in window.VALIDATION_RULES) {
        if (window.VALIDATION_RULES[key].category === category) {
            rules.push(window.VALIDATION_RULES[key]);
        }
    }
    return rules;
}

/**
 * 判断值是否为空
 * 直接使用 DataCheckUtils 中的实现（DataCheckUtils 保证先加载）
 * @param {any} value - 要检查的值
 * @returns {boolean} 是否为空
 */
function isEmpty(value) {
    return DataCheckUtils.isEmpty(value);
}

/**
 * 格式化显示值
 * 将null、undefined、空字符串等统一显示为"空"
 * 直接使用 DataCheckUtils 中的实现（DataCheckUtils 保证先加载）
 * @param {any} val - 原始值
 * @returns {string} 格式化后的显示值
 */
function formatDisplayValue(val) {
    return DataCheckUtils.formatValue(val);
}

/**
 * 日期解析函数
 * 支持多种日期格式，特别是8位数字格式（如20190901）
 * 直接使用 DataCheckUtils 中的实现（DataCheckUtils 保证先加载）
 * @param {any} dateVal - 日期值
 * @returns {Date|null} 解析后的Date对象，解析失败返回null
 */
function parseDate(dateVal) {
    return DataCheckUtils.parseDate(dateVal);
}

/**
 * 使用注册表中的所有规则验证数据
 * 注意：主流程（主脚本.js）按 RULES_MAPPING 调度，本函数仅供需要全量执行时使用
 * @param {Array} data - 数据数组
 * @returns {Array} 全部错误数组
 */
function validateAll(data) {
    var allErrors = [];

    for (var ruleName in window.VALIDATION_RULES) {
        var rule = window.VALIDATION_RULES[ruleName];
        try {
            var errors = rule.func(data);
            if (errors && errors.length > 0) {
                for (var j = 0; j < errors.length; j++) {
                    allErrors.push(errors[j]);
                }
            }
        } catch (e) {
            console.error('验证规则执行错误: ' + ruleName, e);
        }
    }

    return allErrors;
}
