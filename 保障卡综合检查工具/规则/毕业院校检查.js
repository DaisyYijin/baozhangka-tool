(function() {
    'use strict';
    
    function checkBiyeYuanxiao(data) {
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
            var degree = row['文化程度'];
            var school = row['毕业院校'];
            
            // 检查所有文化程度，毕业院校都不能为空
            if (isEmpty(school)) {
                errors.push({
                    '行号': idx + 2,
                    '身份证号码': getIdNumber(row),
                    '姓名': getName(row),
                    '人员类别': row["人员类别"] || "",
                    '当前值': isEmpty(degree) ? "毕业院校: 空" : "文化程度: " + degree + ", 毕业院校: 空",
                    '错误详情': "毕业院校不能为空",
                    '规则名称': "毕业院校检查"
                });
            }
        }
        
        return errors;
    }
    
    window.checkBiyeYuanxiao = checkBiyeYuanxiao;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('毕业院校检查', checkBiyeYuanxiao, '基础信息', '检查毕业院校不能为空（所有文化程度必填）');
    }
})();

