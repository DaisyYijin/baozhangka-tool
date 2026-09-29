(function() {
    'use strict';
    
    function checkBeizhuangFafang(data) {
        var errors = [];
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        // 退休人员类别列表
        var retiredTypes = ['退休军士', '退休军官', '退休干部', '退休士兵'];
        
        var valueCounts = {};
        var nonEmptyCount = 0;
        
        for (var i = 0; i < data.length; i++) {
            var personType = data[i]['人员类别'];
            var isRetired = false;
            
            // 检查是否为退休人员
            if (personType) {
                var typeStr = String(personType).trim();
                for (var j = 0; j < retiredTypes.length; j++) {
                    if (typeStr === retiredTypes[j]) {
                        isRetired = true;
                        break;
                    }
                }
            }
            
            // 如果不是退休人员，才统计被装发放单位
            if (!isRetired) {
                var value = data[i]['被装发放单位'];
                if (!isEmpty(value)) {
                    nonEmptyCount++;
                    valueCounts[value] = (valueCounts[value] || 0) + 1;
                }
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
            var personType = row['人员类别'];
            var isRetired = false;
            
            // 检查是否为退休人员
            if (personType) {
                var typeStr = String(personType).trim();
                for (var j = 0; j < retiredTypes.length; j++) {
                    if (typeStr === retiredTypes[j]) {
                        isRetired = true;
                        break;
                    }
                }
            }
            
            // 如果是退休人员，跳过被装检查
            if (isRetired) {
                continue;
            }
            
            var value = row['被装发放单位'];
            
            if (isEmpty(value)) {
                errors.push({
                    "行号": idx + 2,
                    "身份证号码": getIdNumber(row),
                    "姓名": getName(row),
                    "人员类别": row["人员类别"] || "",
                    "当前值": value,
                    "错误详情": "被装发放单位不能为空",
                    "规则名称": "被装发放单位"
                });
            } else if (commonValue !== null && value !== commonValue) {
                errors.push({
                    "行号": idx + 2,
                    "身份证号码": getIdNumber(row),
                    "姓名": getName(row),
                    "人员类别": row["人员类别"] || "",
                    "当前值": value,
                    "错误详情": "被装发放单位值'" + value + "'与常见值'" + commonValue + "'不一致",
                    "规则名称": "被装发放单位"
                });
            }
        }
        
        return errors;
    }
    
    window.checkBeizhuangFafang = checkBeizhuangFafang;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('被装发放单位检查', checkBeizhuangFafang, '单位一致性', '检查被装发放单位的一致性');
    }
})();
