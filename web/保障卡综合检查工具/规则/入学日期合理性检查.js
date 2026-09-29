/**
 * 入学日期合理性检查
 * 功能：检查入学日期与出生日期、文化程度的逻辑一致性
 * 
 * 检查规则：
 * 1. 入学日期不能为空
 * 2. 根据文化程度判断合理的入学年龄范围
 * 3. 成人教育、函授、自考等跳过严格年龄检查
 * 4. 只检查年龄过小的情况，年龄过大的情况允许（考虑在职进修等情况）
 */
(function() {
    'use strict';
    
    function checkRuxueRiqi(data) {
    var errors = [];
    var ruleName = "入学日期检查";
    
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
     * 计算年龄（精确到月份和日期）
     * @param {Date} birthDate - 出生日期
     * @param {Date} targetDate - 目标日期
     * @returns {number|null} 年龄
     */
    function calculateAge(birthDate, targetDate) {
        if (!birthDate || !targetDate) {
            return null;
        }
        
        var age = targetDate.getFullYear() - birthDate.getFullYear();
        
        if (targetDate.getMonth() < birthDate.getMonth() || 
            (targetDate.getMonth() === birthDate.getMonth() && targetDate.getDate() < birthDate.getDate())) {
            age -= 1;
        }
        
        return age;
    }
    
    /**
     * 不同学历的合理入学年龄范围
     * null 表示不做限制
     * 注意：年龄范围已放宽，适应成人教育、在职进修等情况
     */
    var admissionAgeRanges = {
        "文盲或半文盲": { min: null, max: null },
        "小学": { min: 5, max: 12 },
        "初中": { min: 11, max: 18 },
        "高中": { min: 14, max: 25 },
        "技工学校": { min: 14, max: 35 },
        "中等专业学校或中等技术学校": { min: 14, max: 35 },
        "大学专科和专科学校": { min: 17, max: 45 },
        "大学本科（简称大学）": { min: 17, max: 45 },
        "研究生": { min: 20, max: 50 },
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
        var birthDate = row["出生日期"];
        var admissionDate = row["入学日期"];
        var education = String(row["文化程度"] || "").trim();
        var school = String(row["毕业院校"] || "").trim();
        
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
        
        var parsedAdmissionDate = parseDate(admissionDate);
        if (parsedAdmissionDate === null) {
            errors.push({
                "行号": excelRow,
                "身份证号码": idValue,
                "姓名": nameValue,
                "当前值": String(admissionDate),
                "错误详情": "【入学日期】格式错误，无法解析（当前值: " + String(admissionDate) + "），应为8位数字格式，如20190901",
                "规则名称": ruleName
            });
            continue;
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
        

        if (birthDate && birthDate !== null && birthDate !== undefined && String(birthDate).trim() !== "") {
            var parsedBirthDate = parseDate(birthDate);
            
            if (parsedBirthDate === null) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue,
                    "姓名": nameValue,
                    "当前值": String(birthDate),
                    "错误详情": "【出生日期】格式错误，无法解析（当前值: " + String(birthDate) + "），应为8位数字格式，如19900101",
                    "规则名称": ruleName
                });
            } else {
            
            if (education && education in admissionAgeRanges) {
                var ageRange = admissionAgeRanges[education];
                

                if (ageRange.min !== null && ageRange.max !== null) {
                    var admissionAge = calculateAge(parsedBirthDate, parsedAdmissionDate);
                    
                    if (admissionAge === null) {
                        errors.push({
                            "行号": excelRow,
                            "身份证号码": idValue,
                            "姓名": nameValue,
                            "当前值": "出生: " + String(birthDate) + ", 入学: " + String(admissionDate),
                            "错误详情": "无法计算入学年龄",
                            "规则名称": ruleName
                        });
                    } else if (admissionAge < ageRange.min) {
                        errors.push({
                            "行号": excelRow,
                            "身份证号码": idValue,
                            "姓名": nameValue,
                            "当前值": String(admissionDate),
                            "错误详情": "入学年龄过小（" + admissionAge + "岁），" + education + "正常入学年龄应为" + ageRange.min + "岁以上",
                            "规则名称": ruleName
                        });
                    }
                }
            }
            }
        }
    }
    
    return errors;
}

window.checkRuxueRiqi = checkRuxueRiqi;

// 自动注册规则
if (typeof registerValidationRule === 'function') {
    registerValidationRule('入学日期检查', checkRuxueRiqi, '日期合理性', '检查入学日期和入学年龄的合理性');
}
})();
