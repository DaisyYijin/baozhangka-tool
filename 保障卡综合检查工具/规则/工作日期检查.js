(function() {
    'use strict';
    
    function checkGongzuoRiqi(data) {
        var errors = [];
        var ruleName = "工作日期检查";
        
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
            
            var shouldCheck = renyuanLeibie === "指挥管理军官" || 
                             renyuanLeibie === "专业技术军官" || 
                             renyuanLeibie === "生长干部学员" ||
                             renyuanLeibie === "军政后装军官" ||
                             renyuanLeibie === "其他军官" ||
                             renyuanLeibie === "专业技术文职干部" ||
                             renyuanLeibie === "非专业技术文职干部" ||
                             renyuanLeibie === "其他文职干部" ||
                             renyuanLeibie === "离休干部" ||
                             renyuanLeibie === "退休干部" ||
                             renyuanLeibie === "退休士兵" ||
                             renyuanLeibie === "离休职工" ||
                             renyuanLeibie === "退休职工" ||
                             renyuanLeibie === "退休军士";
            
            if (shouldCheck) {
                var gongzuoRiqi = row["工作日期"];
                
                if (isEmpty(gongzuoRiqi)) {
                    errors.push({
                        "行号": excelRow,
                        "身份证号码": idValue || "",
                        "姓名": nameValue || "",
                        "人员类别": personType || "",
                        "当前值": gongzuoRiqi || "",
                        "错误详情": "工作日期不能为空",
                        "规则名称": ruleName
                    });
                }
            }
        }
        
        return errors;
    }
    
    window.checkGongzuoRiqi = checkGongzuoRiqi;
    
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('工作日期检查', checkGongzuoRiqi, '基础信息', '检查军官、干部、生长干部学员和离退休人员的工作日期是否为空');
    }
})();
