(function() {
    'use strict';
    
    function checkZhengjianBianhao(data) {
        var errors = [];
        var ruleName = "证件编号检查";
        
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        var prefixMapping = window.DataCheckConstants ?
            window.DataCheckConstants.CERTIFICATE_TYPES.PREFIX_MAPPING :
            {
                "军官证": "军字第",
                "军士证": "士字第",
                "义务兵证": "兵字第",
                "学员证": "学字第",
                "退休证": "退字第",
                "文职人员证": "文字第"
            };
        
        var suffix = window.DataCheckConstants ?
            window.DataCheckConstants.CERTIFICATE_TYPES.SUFFIX :
            "号";
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var personType = row["人员类别"];
            var zjlx = row["证件类型"] || "";
            var zjbh = String(row["证件编号"] || "").trim();
            
            var hasMapping = false;
            for (var key in prefixMapping) {
                if (prefixMapping.hasOwnProperty(key) && key === zjlx) {
                    hasMapping = true;
                    break;
                }
            }
            
            if (!zjlx || !hasMapping || !zjbh) {
                continue;
            }
            
            var requiredPrefix = prefixMapping[zjlx];
            var errorDetails = [];
            
            if (zjbh.indexOf(requiredPrefix) !== 0) {
                errorDetails.push("应以'" + requiredPrefix + "'开头");
            }
            
            var expectedEnd = zjbh.length - suffix.length;
            var suffixIndex = zjbh.indexOf(suffix);
            if (suffixIndex !== expectedEnd || suffixIndex === -1) {
                if (!(zjlx === '文职人员证' && zjbh.length >= 15)) {
                    errorDetails.push("应以'" + suffix + "'结尾");
                }
            }
            
            if (errorDetails.length > 0) {
                var errorMsg = "证件类型[" + zjlx + "]要求: " + errorDetails.join('且');
                errors.push({
                    "行号": idx + 2,
                    "身份证号码": getIdNumber(row),
                    "姓名": getName(row),
                    "人员类别": personType || "",
                    "当前值": zjbh || "",
                    "错误详情": errorMsg,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkZhengjianBianhao = checkZhengjianBianhao;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('证件编号检查', checkZhengjianBianhao, '证件信息', '检查军队证件编号格式');
    }
})();
