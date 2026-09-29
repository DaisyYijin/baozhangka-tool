(function() {
    'use strict';
    
    function checkWenhuaChengdu(data) {
        var errors = [];
        var ruleName = "文化程度检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        var validValues = window.DataCheckConstants ?
            window.DataCheckConstants.EDUCATION_LEVELS.ALL_VALID :
            ["文盲或半文盲", "小学", "初中", "高中", "技工学校",
             "中等专业学校或中等技术学校", "大学专科和专科学校",
             "大学本科（简称大学）", "研究生"];
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var education = row["文化程度"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(education)) {
                errorDetail = "文化程度不能为空";
                hasError = true;
            } else {
                var eduStr = String(education).trim();
                
                var isValid = false;
                for (var i = 0; i < validValues.length; i++) {
                    if (validValues[i] === eduStr) {
                        isValid = true;
                        break;
                    }
                }
                
                if (!isValid) {
                    // 全半角/空格归一化：输入与合法值表两侧归一到同一形式再比较，
                    // 否则"大学本科(简称大学)"会因半角括号与全角合法值不等而被误报
                    var normalizeEdu = function(s) {
                        return String(s).replace(/\s+/g, "").replace(/（/g, "(").replace(/）/g, ")");
                    };
                    var normalizedEdu = normalizeEdu(eduStr);
                    for (var j = 0; j < validValues.length; j++) {
                        if (normalizeEdu(validValues[j]) === normalizedEdu) {
                            isValid = true;
                            break;
                        }
                    }
                    
                    if (!isValid) {
                        var validList = "\n- " + validValues.join("\n- ");
                        errorDetail = "无效的文化程度: " + eduStr + " (应为以下值之一: " + validList + ")";
                        hasError = true;
                    }
                }
            }
            
            if (hasError) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": education || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkWenhuaChengdu = checkWenhuaChengdu;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('文化程度检查', checkWenhuaChengdu, '基础信息', '检查文化程度的有效性');
    }
})();
