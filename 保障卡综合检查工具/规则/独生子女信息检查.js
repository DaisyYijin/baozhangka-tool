(function() {
    'use strict';
    
    function checkDushengZinv(data) {
        var errors = [];
        var ruleName = "独生子女检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var onlyChild = row["是否独生子女"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(onlyChild)) {
                errorDetail = "是否独生子女不能为空";
                hasError = true;
            } else {
                var childStr = String(onlyChild).trim();
                
                if (childStr !== "是" && childStr !== "否") {
                    errorDetail = "无效的独生子女值: " + childStr + " (应为: '是' 或 '否')";
                    hasError = true;
                }
            }
            
            if (hasError) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": onlyChild || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkDushengZinv = checkDushengZinv;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('独生子女检查', checkDushengZinv, '基础信息', '检查是否独生子女字段的有效性');
    }
})();

