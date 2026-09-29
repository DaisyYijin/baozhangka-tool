(function() {
    'use strict';
    
    function checkGongzuoShijian(data) {
        var errors = [];
        var ruleName = "工作时间检查";
        
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
            var renyuanLeibie = row["人员类别"] || "";
            
            var shouldCheck = renyuanLeibie === "军士" || 
                             renyuanLeibie === "义务兵";
            
            if (shouldCheck) {
                var gongzuoShijian = row["工作时间"];
                
                if (isEmpty(gongzuoShijian)) {
                    errors.push({
                        "行号": excelRow,
                        "身份证号码": idValue || "",
                        "姓名": nameValue || "",
                        "人员类别": personType || "",
                        "当前值": gongzuoShijian || "",
                        "错误详情": "工作时间不能为空",
                        "规则名称": ruleName
                    });
                }
            }
        }
        
        return errors;
    }
    
    window.checkGongzuoShijian = checkGongzuoShijian;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('工作时间检查', checkGongzuoShijian, '基础信息', '检查军士和义务兵的工作时间是否为空');
    }
})();

