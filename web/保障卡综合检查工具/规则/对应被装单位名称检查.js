(function() {
    'use strict';
    
    function checkDuiyingBeizhuangDanwei(data) {
        var errors = [];
        var targetColumn = '对应被装单位名称';
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        var valueCounts = {};
        for (var i = 0; i < data.length; i++) {
            var value = data[i][targetColumn];
            if (!isEmpty(value)) {
                valueCounts[value] = (valueCounts[value] || 0) + 1;
            }
        }
        
        var commonValue = null;
        var maxCount = 0;
        for (var key in valueCounts) {
            if (valueCounts.hasOwnProperty(key) && valueCounts[key] > maxCount) {
                maxCount = valueCounts[key];
                commonValue = key;
            }
        }
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var value = row[targetColumn];
            
            if (isEmpty(value)) {
                errors.push({
                    "行号": idx + 2,
                    "身份证号码": getIdNumber(row),
                    "姓名": getName(row),
                    "人员类别": row["人员类别"] || "",
                    "当前值": value,
                    "错误详情": "对应被装单位名称不能为空"
                });
            } else if (commonValue !== null && value !== commonValue) {
                errors.push({
                    "行号": idx + 2,
                    "身份证号码": getIdNumber(row),
                    "姓名": getName(row),
                    "人员类别": row["人员类别"] || "",
                    "当前值": value,
                    "错误详情": "对应被装单位名称值'" + value + "'与常见值'" + commonValue + "'不一致"
                });
            }
        }
        
        return errors;
    }
    
    window.checkDuiyingBeizhuangDanwei = checkDuiyingBeizhuangDanwei;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('对应被装单位名称检查', checkDuiyingBeizhuangDanwei, '单位一致性', '检查对应被装单位名称的一致性');
    }
})();
