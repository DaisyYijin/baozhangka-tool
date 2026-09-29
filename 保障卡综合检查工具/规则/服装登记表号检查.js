(function() {
    'use strict';
    
    function checkFuzhuangDengjibiaohao(data) {
        var errors = [];
        var ruleName = "服装登记表号检查";
        
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
            var fuzhuangBiaohao = row["服装登记表号"];
            
            // 军官、干部、文职人员、离退休人员不需要检查服装登记表号
            var isExempt = false;
            if (personType && window.PersonnelTypeUtils) {
                var categoryName = window.PersonnelTypeUtils.getCategoryName(personType);
                if (categoryName === '军官' || 
                    categoryName === '干部' || 
                    categoryName === '文职人员' || 
                    categoryName === '离退休人员') {
                    isExempt = true;
                }
            }
            if (isExempt) {
                continue;
            }
            
            if (isEmpty(fuzhuangBiaohao)) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": fuzhuangBiaohao || "",
                    "错误详情": "服装登记表号不能为空",
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkFuzhuangDengjibiaohao = checkFuzhuangDengjibiaohao;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('服装登记表号检查', checkFuzhuangDengjibiaohao, '基础信息', '检查服装登记表号是否为空');
    }
})();

