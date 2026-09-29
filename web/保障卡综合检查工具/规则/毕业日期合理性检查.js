/**
 * 毕业日期合理性检查
 * 功能：检查毕业日期与入学日期、文化程度的逻辑一致性
 * 
 * 检查规则：
 * 1. 毕业日期不能为空
 * 2. 毕业日期必须晚于入学日期
 * 3. 根据文化程度判断合理的学习年限（学制）
 * 4. 成人教育、函授、自考等跳过严格学制检查
 * 5. 只检查学习年限过短的情况，过长的情况允许（考虑休学、在职进修等）
 */
(function() {
    'use strict';
    
    function checkBiyeRiqi(data) {
    var errors = [];
    var ruleName = "毕业日期检查";
    
    /**
     * 日期解析函数
     * 专门处理8位数字格式（如20190901）
     */
    function parseDate(dateVal) {
        if (dateVal === null || dateVal === undefined || dateVal === '') {
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
    }
    
    /**
     * 格式化日期为YYYYMMDD
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    function formatDate(date) {
        if (!date) return "";
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        var day = date.getDate();
        var monthStr = month < 10 ? '0' + month : String(month);
        var dayStr = day < 10 ? '0' + day : String(day);
        return year + monthStr + dayStr;
    }
    
    /**
     * 文化程度与标准学习年限映射表（单位：年）
     * 包含标准学制、最小学制、最大学制
     * 注意：年限范围已放宽，适应成人教育、在职进修等灵活学制
     */
    var studyYearsMap = {
        "文盲或半文盲": null,
        "小学": { standard: 6, min: 3, max: 10 },
        "初中": { standard: 3, min: 1.5, max: 6 },
        "高中": { standard: 3, min: 1.5, max: 6 },
        "技工学校": { standard: 3, min: 1, max: 8 },
        "中等专业学校或中等技术学校": { standard: 3, min: 1, max: 8 },
        "大学专科和专科学校": { standard: 3, min: 2, max: 8 },
        "大学专科": { standard: 3, min: 2, max: 8 },
        "大学本科（简称大学）": { standard: 4, min: 2.5, max: 10 },
        "大学本科": { standard: 4, min: 2.5, max: 10 },
        "医学本科": { standard: 5, min: 4, max: 10 },
        "建筑学本科": { standard: 5, min: 4, max: 10 },
        "研究生": { standard: 3, min: 1.5, max: 10 },
        "硕士研究生": { standard: 3, min: 1.5, max: 8 },
        "博士研究生": { standard: 4, min: 2, max: 10 }
    };
    
    var skipKeywords = [
        "开放大学", "八一", "军队", "军校", "电大", "远程",
        "成人", "自考", "函授", "继续教育", "网络教育", "夜大", "业余"
    ];
    
    for (var idx = 0; idx < data.length; idx++) {
        var row = data[idx];
        var excelRow = idx + 2;
        var idValue = row["公民身份号码"] || row["身份证号码"] || "";
        var nameValue = row["姓名"] || "";
        var personType = row["人员类别"] || "";
        var admissionDate = row["入学日期"];
        var graduationDate = row["毕业日期"];
        var education = String(row["文化程度"] || "").trim();
        var school = String(row["毕业院校"] || "").trim();
        
        if (graduationDate === null || graduationDate === undefined || String(graduationDate).trim() === "") {
            errors.push({
                "行号": excelRow,
                "身份证号码": idValue,
                "姓名": nameValue,
                "人员类别": personType || "",
                "当前值": "",
                "错误详情": "毕业日期不能为空",
                "规则名称": ruleName
            });
            continue;
        }
        
        if (admissionDate === null || admissionDate === undefined || String(admissionDate).trim() === "") {
            errors.push({
                "行号": excelRow,
                "身份证号码": idValue,
                "姓名": nameValue,
                "人员类别": personType,
                "当前值": "",
                "错误详情": "入学日期不能为空",
                "规则名称": ruleName
            });
            continue;
        }
        
        var parsedGraduationDate = parseDate(graduationDate);
        if (parsedGraduationDate === null) {
            errors.push({
                "行号": excelRow,
                "身份证号码": idValue,
                "姓名": nameValue,
                "人员类别": personType,
                "当前值": String(graduationDate),
                "错误详情": "【毕业日期】格式错误，无法解析（当前值: " + String(graduationDate) + "），应为8位数字格式，如20230630",
                "规则名称": ruleName
            });
            continue;
        }
        
        var parsedAdmissionDate = parseDate(admissionDate);
        if (parsedAdmissionDate === null) {
            errors.push({
                "行号": excelRow,
                "身份证号码": idValue,
                "姓名": nameValue,
                "人员类别": personType,
                "当前值": String(admissionDate),
                "错误详情": "【入学日期】格式错误，无法解析（当前值: " + String(admissionDate) + "），应为8位数字格式，如20190901",
                "规则名称": ruleName
            });
            continue;
        }
        
        if (parsedGraduationDate <= parsedAdmissionDate) {
            errors.push({
                "行号": excelRow,
                "身份证号码": idValue,
                "姓名": nameValue,
                "人员类别": personType,
                "当前值": "入学: " + String(admissionDate) + ", 毕业: " + String(graduationDate),
                "错误详情": "毕业日期必须晚于入学日期",
                "规则名称": ruleName
            });
        }
        
        var shouldSkip = false;
        for (var i = 0; i < skipKeywords.length; i++) {
            if (school.indexOf(skipKeywords[i]) !== -1 || education.indexOf(skipKeywords[i]) !== -1) {
                shouldSkip = true;
                break;
            }
        }
        
        if (shouldSkip) {
            continue;
        }
        
        if (education && education in studyYearsMap) {
            var yearRange = studyYearsMap[education];
            
            if (yearRange !== null && yearRange.min !== undefined) {
                var studyDays = (parsedGraduationDate - parsedAdmissionDate) / (1000 * 60 * 60 * 24);
                var studyYears = studyDays / 365.25;
                
                if (studyYears < yearRange.min) {
                    errors.push({
                        "行号": excelRow,
                        "身份证号码": idValue,
                        "姓名": nameValue,
                        "人员类别": personType,
                        "当前值": "入学: " + String(admissionDate) + ", 毕业: " + String(graduationDate),
                        "错误详情": "学习年限过短（" + studyYears.toFixed(2) + "年），" + education + "正常学制为" + yearRange.standard + "年，最少应为" + yearRange.min + "年",
                        "规则名称": ruleName
                    });
                }
            }
        }
    }
    
    return errors;
}

window.checkBiyeRiqi = checkBiyeRiqi;

// 自动注册规则
if (typeof registerValidationRule === 'function') {
    registerValidationRule('毕业日期检查', checkBiyeRiqi, '日期合理性', '检查毕业日期与入学日期的合理性');
}
})();
