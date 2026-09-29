(function() {
    'use strict';
    
    function checkXingzhengZhiwuRiqi(data) {
        var errors = [];
        var ruleName = "行政职务日期检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        // 需要填写行政职务日期的人员类别（专业技术军官可以为空）
        var requireAdminPositionDateTypes = [
            "指挥管理军官"
        ];
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personnelType = row['人员类别'];
            var adminPositionDate = row['行政职务日期'];
            
            // 检查人员类别是否需要填写行政职务日期
            if (!isEmpty(personnelType)) {
                var typeStr = String(personnelType).trim();
                var requiresAdminPositionDate = false;
                
                for (var i = 0; i < requireAdminPositionDateTypes.length; i++) {
                    if (requireAdminPositionDateTypes[i] === typeStr) {
                        requiresAdminPositionDate = true;
                        break;
                    }
                }
                
                // 如果人员类别要求填写行政职务日期，检查行政职务日期是否为空
                if (requiresAdminPositionDate && isEmpty(adminPositionDate)) {
                    errors.push({
                        "行号": excelRow,
                        "身份证号码": idValue || "",
                        "姓名": nameValue || "",
                        "人员类别": personnelType || "",
                        "当前值": "人员类别: " + typeStr + ", 行政职务日期: 空",
                        "错误详情": "人员类别为'" + typeStr + "'时，行政职务日期不能为空",
                        "规则名称": ruleName
                    });
                }
            }
        }
        
        return errors;
    }
    
    window.checkXingzhengZhiwuRiqi = checkXingzhengZhiwuRiqi;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('行政职务日期检查', checkXingzhengZhiwuRiqi, '工作信息', '检查指挥管理军官的行政职务日期必填（专业技术军官可以为空）');
    }
})();

