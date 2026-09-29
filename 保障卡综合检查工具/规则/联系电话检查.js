(function() {
    'use strict';
    
    function checkLianxiDianhua(data) {
        var errors = [];
        var ruleName = "联系电话检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        var validMobilePrefixes = window.DataCheckConstants ? 
            window.DataCheckConstants.ALL_PHONE_PREFIXES : 
            [
                '134','135','136','137','138','139','147','148','150','151','152',
                '157','158','159','165','172','178','182','183','184','187','188',
                '195','197','198','130','131','132','145','146','155','156','166',
                '167','171','175','176','185','186','196','133','141','149','153',
                '162','170','173','174','177','180','181','189','190','191','193',
                '199','192'
            ];
        var landlinePattern = /^(0\d{2,3}-?\d{6,8}|[48]00-?\d{3,4}-?\d{3,4})$/;
        var fallbackIsValidPhone = function(phoneValue) {
            if (phoneValue === null || phoneValue === undefined) {
                return false;
            }
            var phoneStr = String(phoneValue).trim();
            if (/^\d{11}$/.test(phoneStr)) {
                var prefix = phoneStr.substring(0, 3);
                for (var i = 0; i < validMobilePrefixes.length; i++) {
                    if (validMobilePrefixes[i] === prefix) {
                        return true;
                    }
                }
                return false;
            }
            return landlinePattern.test(phoneStr);
        };
        var isValidPhone = window.DataCheckUtils && typeof window.DataCheckUtils.isValidPhone === 'function'
            ? window.DataCheckUtils.isValidPhone
            : fallbackIsValidPhone;
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var phone = row["联系电话"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(phone)) {
                errorDetail = "联系电话不能为空";
                hasError = true;
            } else {
                var phoneStr = String(phone).trim();
                
                if (!isValidPhone(phoneStr)) {
                    errorDetail = "联系电话格式错误: " + phoneStr + " (需为11位手机号或带区号固定电话)";
                    hasError = true;
                }
            }
            
            if (hasError) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": phone || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkLianxiDianhua = checkLianxiDianhua;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('联系电话检查', checkLianxiDianhua, '基础信息', '检查联系电话格式和有效性');
    }
})();
