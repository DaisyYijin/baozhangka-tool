(function() {
    'use strict';
    
    function checkXuangaiShiguanRiqi(data) {
        var errors = [];
        var ruleName = "选改士官日期检查";
        
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
            var renyuanLeibie = row["人员类别"];
            var xuangaiRiqi = row["选改士官日期"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(renyuanLeibie)) {
                continue;
            }
            
            var renyuanLeibieStr = String(renyuanLeibie).trim();
            
            // 检查是否为军士或士官（即士兵或未转换士兵类别中的军士相关人员）
            var isTarget = renyuanLeibieStr === '军士' || renyuanLeibieStr === '士官';
            
            if (isTarget && isEmpty(xuangaiRiqi)) {
                errorDetail = "人员类别为\"" + renyuanLeibieStr + "\"时，选改士官日期不能为空";
                hasError = true;
            }
            
            if (hasError) {
                var xuangaiDisplay = isEmpty(xuangaiRiqi) ? "空" : String(xuangaiRiqi);
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": renyuanLeibie || "",
                    "当前值": "人员类别: " + renyuanLeibieStr + ", 选改士官日期: " + xuangaiDisplay,
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkXuangaiShiguanRiqi = checkXuangaiShiguanRiqi;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('选改士官日期检查', checkXuangaiShiguanRiqi, '日期合理性', '检查军士人员的选改士官日期');
    }
})();

