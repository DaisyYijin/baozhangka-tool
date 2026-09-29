(function() {
    'use strict';
    
    function checkZhengzhiMianmao(data) {
        var errors = [];
        var ruleName = "政治面貌检查";
        
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
            window.DataCheckConstants.POLITICAL_STATUS.ALL_VALID :
            ["群众", "共青团员", "中共预备党员", "中共党员"];
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var politicalStatus = row["政治面貌"];
            var politicalDate = row["政治面貌日期"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(politicalStatus)) {
                errorDetail = "政治面貌不能为空";
                hasError = true;
            } else {
                var statusStr = String(politicalStatus).trim();
                var isValid = false;
                
                for (var i = 0; i < validValues.length; i++) {
                    if (validValues[i] === statusStr) {
                        isValid = true;
                        break;
                    }
                }
                
                if (!isValid) {
                    errorDetail = "无效的政治面貌: " + statusStr + " (应为: " + validValues.join(', ') + ")";
                    hasError = true;
                } else if (statusStr !== "群众") {
                    if (isEmpty(politicalDate)) {
                        errorDetail = "非群众的政治面貌日期不能为空";
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
                    "当前值": politicalStatus || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkZhengzhiMianmao = checkZhengzhiMianmao;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('政治面貌检查', checkZhengzhiMianmao, '基础信息', '检查政治面貌的有效性和相关日期');
    }
})();

