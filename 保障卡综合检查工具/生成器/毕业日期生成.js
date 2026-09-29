/**
 * 毕业日期生成器
 * 功能：根据入学日期和文化程度自动生成或修正毕业日期
 * 
 * 生成规则：
 * - 根据文化程度确定标准学制年限
 * - 结合入学日期计算毕业日期
 * - 统一设置毕业日期为6月30日（毕业季）
 * - 验证毕业日期的合理性（不能早于入学日期，学习年限需在合理范围内）
 * - 自动跳过特殊教育类型（开放大学、成人教育、自考等）
 * 
 * 标准学制：
 * - 小学：6年
 * - 初中/高中：3年
 * - 技工学校/中专：3年
 * - 大专：3年
 * - 本科：4年
 * - 研究生：3年
 */
(function() {
    /**
     * 文化程度对应的学制年限映射表
     * standard: 标准学制年限
     * min: 最短学制年限（用于验证）
     * max: 最长学制年限（用于验证）
     */
    var DURATION_MAP = {
        '小学': { standard: 6, min: 3, max: 10 },
        '初中': { standard: 3, min: 1.5, max: 6 },
        '高中': { standard: 3, min: 1.5, max: 6 },
        '技工学校': { standard: 3, min: 1, max: 8 },
        '中等专业学校或中等技术学校': { standard: 3, min: 1, max: 8 },
        '大学专科和专科学校': { standard: 3, min: 2, max: 8 },
        '大学本科（简称大学）': { standard: 4, min: 2.5, max: 10 },
        '研究生': { standard: 3, min: 1.5, max: 10 }
    };
    
    /**
     * 需要跳过检查的特殊教育类型关键词
     * 这些教育类型的学制不固定，不进行严格验证
     */
    var SKIP_KEYWORDS = [
        '开放大学', '八一', '军队', '军校', '电大', '远程',
        '成人', '自考', '函授', '继续教育', '网络教育', '夜大', '业余'
    ];
    
    /**
     * 解析日期字符串为Date对象
     * @param {string|number} dateVal - 日期值（支持8位数字格式：YYYYMMDD）
     * @returns {Date|null} Date对象，解析失败返回null
     */
    function parseDate(dateVal) {
        if (dateVal === null || dateVal === undefined || dateVal === '') {
            return null;
        }
        
        var dateStr = String(dateVal).trim();
        if (dateStr === '' || dateStr === 'undefined' || dateStr === 'null') {
            return null;
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
    }
    
    /**
     * 将Date对象格式化为8位数字字符串
     * @param {Date} date - Date对象
     * @returns {string|null} 8位数字格式的日期字符串（YYYYMMDD），失败返回null
     */
    function formatDate(date) {
        if (!date) return null;
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        var day = date.getDate();
        var monthStr = month < 10 ? '0' + month : String(month);
        var dayStr = day < 10 ? '0' + day : String(day);
        return year + monthStr + dayStr;
    }
    
    /**
     * 判断是否应该跳过日期验证
     * @param {string} education - 文化程度
     * @param {string} school - 毕业院校
     * @returns {boolean} true表示应该跳过验证
     */
    function shouldSkipCheck(education, school) {
        var eduStr = String(education || '').trim();
        var schoolStr = String(school || '').trim();
        
        for (var i = 0; i < SKIP_KEYWORDS.length; i++) {
            if (eduStr.indexOf(SKIP_KEYWORDS[i]) !== -1 || 
                schoolStr.indexOf(SKIP_KEYWORDS[i]) !== -1) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 根据入学日期和文化程度计算标准毕业日期
     * @param {string} admissionDateStr - 入学日期字符串
     * @param {string} education - 文化程度
     * @returns {string|null} 8位数字格式的毕业日期，计算失败返回null
     */
    function calculateStandardGraduationDate(admissionDateStr, education) {
        try {
            var admissionDate = parseDate(admissionDateStr);
            if (!admissionDate) return null;
            
            var eduStr = String(education).trim();
            var duration = DURATION_MAP[eduStr];
            
            if (!duration) {
                duration = { standard: 4 };
            }
            
            var graduationDate = new Date(admissionDate);
            graduationDate.setFullYear(graduationDate.getFullYear() + duration.standard);
            
            graduationDate.setMonth(5);
            graduationDate.setDate(30);
            
            return formatDate(graduationDate);
        } catch (e) {
            return null;
        }
    }
    
    /**
     * 验证毕业日期的合理性，如不合理则返回修正后的日期
     * @param {string} admissionDateStr - 入学日期字符串
     * @param {string} graduationDateStr - 毕业日期字符串
     * @param {string} education - 文化程度
     * @param {string} school - 毕业院校
     * @returns {Object} {isValid: boolean, fixed: string|null, reason: string}
     */
    function validateAndFixGraduationDate(admissionDateStr, graduationDateStr, education, school) {
        if (shouldSkipCheck(education, school)) {
            return { isValid: true, fixed: null };
        }
        
        var admissionDate = parseDate(admissionDateStr);
        var graduationDate = parseDate(graduationDateStr);
        
        if (!admissionDate || !graduationDate) {
            return { isValid: false, fixed: null };
        }
        
        if (graduationDate <= admissionDate) {
            var fixed = calculateStandardGraduationDate(admissionDateStr, education);
            return { isValid: false, fixed: fixed, reason: '毕业日期必须晚于入学日期' };
        }
        
        var eduStr = String(education).trim();
        var duration = DURATION_MAP[eduStr];
        
        if (!duration) {
            return { isValid: true, fixed: null };
        }
        
        var studyDays = (graduationDate - admissionDate) / (1000 * 60 * 60 * 24);
        var studyYears = studyDays / 365.25;
        
        if (studyYears < duration.min) {
            var fixed = calculateStandardGraduationDate(admissionDateStr, education);
            return { 
                isValid: false, 
                fixed: fixed, 
                reason: '学习年限过短(' + studyYears.toFixed(2) + '年)，应至少' + duration.min + '年'
            };
        }
        
        return { isValid: true, fixed: null };
    }
    
    /**
     * 毕业日期生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据（用于对比变更）
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息 {count: number, colors: object}
     */
    function generateGraduationDate(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var graduationDate = row['毕业日期'];
            var admissionDate = row['入学日期'];
            var education = row['文化程度'];
            var school = row['毕业院校'];
            
            var origRow = originalData[i + 1];
            var origGraduation = origRow ? origRow[headers.indexOf('毕业日期')] : '';
            
            if ((!graduationDate || String(graduationDate).trim() === '') && admissionDate && education) {
                var date = calculateStandardGraduationDate(admissionDate, education);
                if (date) {
                    row['毕业日期'] = date;
                    
                    // 使用统一的颜色标记函数
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '毕业日期', 'yellow');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['毕业日期'] = 'yellow';
                    }
                    count++;
                }
            }
            else if (graduationDate && String(graduationDate).trim() !== '' && admissionDate) {
                var validation = validateAndFixGraduationDate(admissionDate, graduationDate, education, school);
                
                if (!validation.isValid && validation.fixed) {
                    row['毕业日期'] = validation.fixed;
                    
                    // 使用统一的颜色标记函数
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '毕业日期', 'orange');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['毕业日期'] = 'orange';
                    }
                    count++;
                }
                else if (origGraduation && String(origGraduation).trim() !== '' && 
                         String(graduationDate).trim() !== String(origGraduation).trim()) {
                    // 使用统一的颜色标记函数
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '毕业日期', 'orange');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['毕业日期'] = 'orange';
                    }
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册毕业日期生成器到全局生成器列表
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['毕业日期生成'] = {
            name: '毕业日期生成',
            description: '根据入学日期和文化程度生成或修正毕业日期',
            icon: '<i class="fa fa-graduation-cap"></i>',
            func: generateGraduationDate
        };
    }
})();
