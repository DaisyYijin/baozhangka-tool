(function() {
    'use strict';
    
    function checkAirenQingkuang(data) {
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
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var maritalStatus = String(row['婚姻状况'] || '').trim();
            
            if (maritalStatus !== "已婚") {
                continue;
            }
            
            var missingFields = [];
            
            var loverFields = [
                '爱人成员公民身份号码',
                '爱人成员姓名',
                '爱人成员出生日期',
                '爱人成员工作单位',
                '爱人成员参加工作日期',
                '爱人随军状况'
            ];
            
            for (var i = 0; i < loverFields.length; i++) {
                var field = loverFields[i];
                var value = row[field];
                if (isEmpty(value)) {
                    missingFields.push(field);
                }
            }
            
            var militaryStatus = String(row['爱人随军状况'] || '').trim();
            var militaryDate = row['爱人随军日期'];
            
            if (militaryStatus === "是" && isEmpty(militaryDate)) {
                missingFields.push('爱人随军日期');
            }
            
            if (missingFields.length > 0) {
                errors.push({
                    '行号': idx + 2,
                    '身份证号码': getIdNumber(row),
                    '姓名': getName(row),
                    '人员类别': row["人员类别"] || "",
                    '当前值': "婚姻状况: 已婚",
                    '错误详情': "爱人信息缺失: " + missingFields.join(", "),
                    '规则名称': "爱人信息完整性检查"
                });
            }
        }
        
        return errors;
    }
    
    window.checkAirenQingkuang = checkAirenQingkuang;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('爱人情况检查', checkAirenQingkuang, '基础信息', '检查已婚人员爱人信息的完整性');
    }
})();

