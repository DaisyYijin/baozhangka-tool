(function() {
    'use strict';
    
    function checkHunyin(data) {
        var errors = [];
        var ruleName = "婚姻状况检查";
        
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
            window.DataCheckConstants.MARITAL_STATUS.ALL_VALID :
            ["未婚", "已婚", "离婚", "丧偶"];
        
        var requireDateStatuses = window.DataCheckConstants ?
            window.DataCheckConstants.MARITAL_STATUS.REQUIRE_DATE :
            ["已婚", "离婚", "丧偶"];
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var maritalStatus = row["婚姻状况"];
            var marriageDate = row["婚姻日期"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(maritalStatus)) {
                errorDetail = "婚姻状况不能为空";
                hasError = true;
            } else {
                var statusStr = String(maritalStatus).trim();
                
                var isValidStatus = false;
                for (var i = 0; i < validValues.length; i++) {
                    if (validValues[i] === statusStr) {
                        isValidStatus = true;
                        break;
                    }
                }
                
                if (!isValidStatus) {
                    errorDetail = "无效的婚姻状况: " + statusStr + " (应为: " + validValues.join(', ') + ")";
                    hasError = true;
                }
                else if (statusStr === "未婚") {
                    if (!isEmpty(marriageDate)) {
                        errorDetail = "未婚的婚姻状况下婚姻日期必须为空";
                        hasError = true;
                    }
                }
                else {
                    var needsDate = false;
                    for (var j = 0; j < requireDateStatuses.length; j++) {
                        if (requireDateStatuses[j] === statusStr) {
                            needsDate = true;
                            break;
                        }
                    }
                    
                    if (needsDate && isEmpty(marriageDate)) {
                        errorDetail = statusStr + "的婚姻状况下婚姻日期不能为空";
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
                    "当前值": maritalStatus || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkHunyin = checkHunyin;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('婚姻状况检查', checkHunyin, '基础信息', '检查婚姻状况的有效性和婚姻日期');
    }
})();
