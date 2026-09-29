(function() {
    'use strict';
    
    function checkTixiYiyuan(data) {
        var errors = [];
        var targetColumn = '体系医院';
        
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        var nonEmptyValues = [];
        for (var i = 0; i < data.length; i++) {
            var val = data[i][targetColumn];
            if (val !== null && val !== undefined && String(val).trim() !== '') {
                nonEmptyValues.push(String(val).trim().toLowerCase());
            }
        }
        
        if (nonEmptyValues.length === 0) {
            return errors;
        }
        
        var valueCounts = {};
        for (var j = 0; j < nonEmptyValues.length; j++) {
            var val2 = nonEmptyValues[j];
            valueCounts[val2] = (valueCounts[val2] || 0) + 1;
        }
        
        var mostCommonValue = null;
        var mostCommonCount = 0;
        for (var key in valueCounts) {
            if (valueCounts.hasOwnProperty(key) && valueCounts[key] > mostCommonCount) {
                mostCommonCount = valueCounts[key];
                mostCommonValue = key;
            }
        }
        
        var threshold = nonEmptyValues.length * 0.6;
        
        if (mostCommonCount < threshold) {
            console.log("最高频值 '" + mostCommonValue + "' 占比 " + (mostCommonCount/nonEmptyValues.length*100).toFixed(1) + "% < 60%，跳过检查");
            return errors;
        }
        
        console.log("最高频值 '" + mostCommonValue + "' 占比 " + (mostCommonCount/nonEmptyValues.length*100).toFixed(1) + "%，开始检查一致性");
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var rawValue = row[targetColumn];
            
            var value = "";
            if (rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '') {
                value = String(rawValue).trim().toLowerCase();
            }
            
            if (value === "") {
                continue;
            }
            
            if (value !== mostCommonValue) {
                errors.push({
                    '行号': excelRow,
                    '身份证号码': getIdNumber(row),
                    '姓名': getName(row),
                    '人员类别': row["人员类别"] || "",
                    '当前值': rawValue,
                    '错误详情': "体系医院不一致 (应为: " + mostCommonValue + ")",
                    '规则名称': "体系医院一致性检查"
                });
            }
        }
        
        if (window.Logger) {
            Logger.info("体系医院检查: 发现 " + errors.length + " 个不一致项");
        }
        return errors;
    }
    
    window.checkTixiYiyuan = checkTixiYiyuan;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('体系医院检查', checkTixiYiyuan, '单位一致性', '检查体系医院的一致性');
    }
})();
