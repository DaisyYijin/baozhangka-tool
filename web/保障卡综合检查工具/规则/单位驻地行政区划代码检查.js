(function() {
    'use strict';
    
    function checkDanweizhudiXingzhengquhudaima(data) {
        var errors = [];
        var ruleName = "单位驻地行政区划代码检查";
        
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
            var code = row["单位驻地行政区划代码"];
            
            if (isEmpty(code)) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": code || "",
                    "错误详情": "单位驻地行政区划代码不能为空",
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkDanweizhudiXingzhengquhudaima = checkDanweizhudiXingzhengquhudaima;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('单位驻地行政区划代码检查', checkDanweizhudiXingzhengquhudaima, '基础信息', '检查单位驻地行政区划代码是否为空');
    }
})();

