(function() {
    'use strict';
    
    function checkGuhuaZhucema(data) {
        var errors = [];
        var ruleName = "固化注册码检查";
        
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
            var guhuaZhucema = row["固化注册码"];
            
            if (isEmpty(guhuaZhucema)) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": guhuaZhucema || "",
                    "错误详情": "固化注册码不能为空",
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkGuhuaZhucema = checkGuhuaZhucema;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('固化注册码检查', checkGuhuaZhucema, '基础信息', '检查固化注册码是否为空');
    }
})();

