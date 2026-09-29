(function() {
    'use strict';
    
    function checkRenyuanLeibie(data) {
        var errors = [];
        var ruleName = "人员类别检查";
        
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
            window.DataCheckConstants.PERSONNEL_TYPES.ALL_VALID :
            ["义务兵", "军士", "指挥管理军官", "专业技术军官", "军士学员", "军官学员", 
             "生长干部学员", "退休军士", "退休军官", "招录管理文职人员", "招录技术文职人员", 
             "转改技术文职人员", "专业技能文职人员", "退休干部", "退休士兵"];
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(personType)) {
                errorDetail = "人员类别不能为空";
                hasError = true;
            } else {
                var typeStr = String(personType).trim();
                var isValid = false;
                
                for (var i = 0; i < validValues.length; i++) {
                    if (validValues[i] === typeStr) {
                        isValid = true;
                        break;
                    }
                }
                
                if (!isValid) {
                    errorDetail = "无效的人员类别: " + typeStr;
                    hasError = true;
                }
            }
            
            if (hasError) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": personType || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkRenyuanLeibie = checkRenyuanLeibie;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('人员类别检查', checkRenyuanLeibie, '基础信息', '检查人员类别的有效性');
    }
})();

