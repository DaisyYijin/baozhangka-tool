(function() {
    'use strict';
    
    function checkXuexing(data) {
        var errors = [];
        var ruleName = "血型检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var bloodType = row["血型"];
            
            if (isEmpty(bloodType)) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": bloodType || "",
                    "错误详情": "血型为空",
                    "规则名称": ruleName
                });
            } else {
                var bloodStr = String(bloodType).trim().toUpperCase();
                
                var hasValidSuffix = (bloodStr.indexOf("RH+") === bloodStr.length - 3) || 
                                    (bloodStr.indexOf("RH-") === bloodStr.length - 3);
                
                if (!hasValidSuffix) {
                    errors.push({
                        "行号": excelRow,
                        "身份证号码": idValue || "",
                        "姓名": nameValue || "",
                        "人员类别": personType || "",
                        "当前值": bloodType || "",
                        "错误详情": "血型格式错误，必须以RH+或RH-结尾",
                        "规则名称": ruleName
                    });
                } else {
                    // ABO部分白名单校验（兼容"A型RH+"与"ARH+"两种写法），否则"123RH+"这类值也能通过
                    var aboPart = bloodStr.substring(0, bloodStr.length - 3);
                    aboPart = String(aboPart).trim().replace(/型$/g, '').replace(/\s+/g, '');
                    
                    if (aboPart !== 'A' && aboPart !== 'B' && aboPart !== 'O' && aboPart !== 'AB') {
                        errors.push({
                            "行号": excelRow,
                            "身份证号码": idValue || "",
                            "姓名": nameValue || "",
                            "人员类别": personType || "",
                            "当前值": bloodType || "",
                            "错误详情": "血型格式错误，ABO血型部分应为A/B/O/AB（如A型RH+），实际为" + bloodStr,
                            "规则名称": ruleName
                        });
                    }
                }
            }
        }
        
        return errors;
    }
    
    window.checkXuexing = checkXuexing;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('血型检查', checkXuexing, '基础信息', '检查血型格式是否正确（必须以RH+或RH-结尾）');
    }
})();

