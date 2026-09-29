(function() {
    'use strict';
    
    function checkDuiyingYingfangDanwei(data) {
        var errors = [];
        var targetColumn = '对应营房单位名称';
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        // 军官类别列表
        var officerTypes = ['指挥管理军官', '专业技术军官', '军官学员'];
        
        var valueCounts = {};
        var nonEmptyCount = 0;
        
        for (var i = 0; i < data.length; i++) {
            var personType = data[i]['人员类别'];
            var isOfficer = false;
            
            // 检查是否为军官
            if (personType) {
                var typeStr = String(personType).trim();
                for (var j = 0; j < officerTypes.length; j++) {
                    if (typeStr === officerTypes[j]) {
                        isOfficer = true;
                        break;
                    }
                }
            }
            
            // 如果是军官，才统计对应营房单位名称
            if (isOfficer) {
                var value = data[i][targetColumn];
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
            var isOfficer = false;
            
            // 检查是否为军官
            if (personType) {
                var typeStr = String(personType).trim();
                for (var j = 0; j < officerTypes.length; j++) {
                    if (typeStr === officerTypes[j]) {
                        isOfficer = true;
                        break;
                    }
                }
            }
            
            // 如果不是军官，跳过营房检查
            if (!isOfficer) {
                continue;
            }
            
            var value = row[targetColumn];
            
            if (isEmpty(value)) {
                errors.push({
                    "行号": idx + 2,
                    "身份证号码": getIdNumber(row),
                    "姓名": getName(row),
                    "人员类别": row["人员类别"] || "",
                    "当前值": value,
                    "错误详情": "对应营房单位名称不能为空"
                });
            } else if (commonValue !== null && value !== commonValue) {
                errors.push({
                    "行号": idx + 2,
                    "身份证号码": getIdNumber(row),
                    "姓名": getName(row),
                    "人员类别": row["人员类别"] || "",
                    "当前值": value,
                    "错误详情": "对应营房单位名称值'" + value + "'与常见值'" + commonValue + "'不一致"
                });
            }
        }
        
        return errors;
    }
    
    window.checkDuiyingYingfangDanwei = checkDuiyingYingfangDanwei;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('对应营房单位名称检查', checkDuiyingYingfangDanwei, '单位一致性', '检查对应营房单位名称的一致性（仅检查军官）');
    }
})();
