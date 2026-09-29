(function() {
    'use strict';
    
    function checkZuzhiGuanxiJigouMingcheng(data) {
        var errors = [];
        var ruleName = "组织关系机构名称检查";
        
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
            var orgName = row["组织关系机构名称"];
            var politicalStatus = row['政治面貌'];
            
            if (isEmpty(orgName)) {
                continue;
            }
            
            var orgNameStr = String(orgName).trim();
            var politicalStatusStr = String(politicalStatus || '').trim();
            
            if (orgNameStr.indexOf('中共陆军') !== 0) {
                errors.push({
                    '行号': excelRow,
                    '身份证号码': idValue,
                    '姓名': nameValue,
                    '人员类别': personType || "",
                    '当前值': orgNameStr,
                    '错误详情': '组织关系机构名称开头必须为"中共陆军"',
                    '规则名称': ruleName
                });
            }
            
            if (politicalStatusStr) {
                var expectedSuffix = null;
                var errorMsg = null;
                
                if (politicalStatusStr === '中共预备党员' || politicalStatusStr === '中共党员') {
                    var endsWithDangzhibu = orgNameStr.indexOf('党支部') === orgNameStr.length - 3;
                    if (!endsWithDangzhibu) {
                        expectedSuffix = '党支部';
                        errorMsg = "政治面貌为\"" + politicalStatusStr + "\"，组织名称应以\"党支部\"结尾";
                    }
                } else if (politicalStatusStr === '共青团员') {
                    var endsWithTuanzhibu = orgNameStr.indexOf('团支部') === orgNameStr.length - 3;
                    if (!endsWithTuanzhibu) {
                        expectedSuffix = '团支部';
                        errorMsg = "政治面貌为\"" + politicalStatusStr + "\"，组织名称应以\"团支部\"结尾";
                    }
                }
                
                if (errorMsg) {
                    errors.push({
                        '行号': excelRow,
                        '身份证号码': idValue,
                        '姓名': nameValue,
                        '人员类别': personType || "",
                        '当前值': orgNameStr,
                        '错误详情': errorMsg,
                        '规则名称': ruleName
                    });
                }
            }
        }
        
        return errors;
    }
    
    window.checkZuzhiGuanxiJigouMingcheng = checkZuzhiGuanxiJigouMingcheng;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('组织关系机构名称检查', checkZuzhiGuanxiJigouMingcheng, '基础信息', '检查组织关系机构名称格式');
    }
})();
