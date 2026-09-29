(function() {
    'use strict';
    
    function checkShibingZhucema(data) {
        var errors = [];
        var ruleName = "士兵注册码检查";
        
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
            var shibingZhucema = row["士兵注册码"];
            
            // 只有士兵和未转换士兵需要检查士兵注册码
            var shouldCheck = false;
            if (personType && window.PersonnelTypeUtils) {
                var categoryName = window.PersonnelTypeUtils.getCategoryName(personType);
                if (categoryName === '士兵' || categoryName === '未转换士兵') {
                    shouldCheck = true;
                }
            }
            if (!shouldCheck) {
                continue;
            }
            
            if (isEmpty(shibingZhucema)) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": shibingZhucema || "",
                    "错误详情": "士兵注册码不能为空",
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkShibingZhucema = checkShibingZhucema;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('士兵注册码检查', checkShibingZhucema, '基础信息', '检查士兵注册码是否为空');
    }
})();

