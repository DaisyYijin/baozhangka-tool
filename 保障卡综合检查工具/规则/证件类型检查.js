(function() {
    'use strict';
    
    function checkZhengjianLeixing(data) {
        var errors = [];
        var ruleName = "证件类型检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        var specificTypeMapping = {
            "义务兵": "义务兵证",
            "军士": "军士证",
            "军士学员": "学员证",
            "军官学员": "学员证",
            "生长干部学员": "学员证",
            "退休军士": "军士退休证",
            "退休士官": "军士退休证",
            "士官": "军士证",
            "兵": "义务兵证",
            "其他士兵": "军士证",
            "培养士官学员": "学员证"
        };
        
        var categoryMapping = {
            "军官": "军官证",
            "干部": "军官证",
            "文职人员": "文职人员证",
            "离退休人员": "退休证"
        };
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var idType = row["证件类型"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(personType)) {
                errorDetail = "人员类别不能为空";
                hasError = true;
            } else if (isEmpty(idType)) {
                errorDetail = "证件类型不能为空";
                hasError = true;
            } else {
                var typeStr = String(personType).trim();
                var idTypeStr = String(idType).trim();
                var expectedIdType = null;
                
                if (specificTypeMapping.hasOwnProperty(typeStr)) {
                    expectedIdType = specificTypeMapping[typeStr];
                } else {
                    var categoryName = window.PersonnelTypeUtils ? 
                                      window.PersonnelTypeUtils.getCategoryName(typeStr) : null;
                    if (categoryName && categoryMapping.hasOwnProperty(categoryName)) {
                        expectedIdType = categoryMapping[categoryName];
                    }
                }
                
                if (!expectedIdType) {
                    errorDetail = "未知的人员类别: " + typeStr;
                    hasError = true;
                } else if (idTypeStr !== expectedIdType) {
                    errorDetail = "证件类型不匹配: 人员类别 " + typeStr + " 应使用 " + expectedIdType + ", 实际为 " + idTypeStr;
                    hasError = true;
                }
            }
            
            if (hasError) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": idType || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkZhengjianLeixing = checkZhengjianLeixing;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('证件类型检查', checkZhengjianLeixing, '证件信息', '检查证件类型与人员类别是否匹配');
    }
})();

