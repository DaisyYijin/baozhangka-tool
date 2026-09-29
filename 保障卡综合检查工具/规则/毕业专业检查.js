(function() {
    'use strict';
    
    function checkBiyeZhuanye(data) {
        var errors = [];
        var ruleName = "毕业专业检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        // 需要填写毕业专业的文化程度（技工学校及以上）
        var requireMajorEducations = [
            "技工学校",
            "中等专业学校或中等技术学校",
            "大学专科和专科学校",
            "大学本科（简称大学）",
            "研究生"
        ];
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var education = row['文化程度'];
            var major = row['毕业专业'];
            
            // 检查文化程度是否需要填写毕业专业
            if (!isEmpty(education)) {
                var educationStr = String(education).trim();
                var requiresMajor = false;
                
                for (var i = 0; i < requireMajorEducations.length; i++) {
                    if (requireMajorEducations[i] === educationStr) {
                        requiresMajor = true;
                        break;
                    }
                }
                
                // 如果文化程度要求填写毕业专业，但毕业专业为空，则报错
                if (requiresMajor && isEmpty(major)) {
                    errors.push({
                        "行号": excelRow,
                        "身份证号码": idValue || "",
                        "姓名": nameValue || "",
                        "人员类别": personType || "",
                        "当前值": "文化程度: " + educationStr + ", 毕业专业: 空",
                        "错误详情": "文化程度为'" + educationStr + "'时，毕业专业不能为空",
                        "规则名称": ruleName
                    });
                }
            }
        }
        
        return errors;
    }
    
    window.checkBiyeZhuanye = checkBiyeZhuanye;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('毕业专业检查', checkBiyeZhuanye, '教育信息', '检查文化程度在技工学校及以上时毕业专业必填');
    }
})();

