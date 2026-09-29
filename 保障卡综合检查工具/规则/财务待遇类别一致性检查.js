(function() {
    'use strict';
    
    function checkCaiwuDaiyuRenyuanLeibie(data) {
        var errors = [];
        var ruleName = "财务待遇类别一致性检查";
        
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
            var renyuanLeibie = row["人员类别"];
            var caiwuDaiyuLeibie = row["财务待遇人员类别"];
            
            var renyuanStr = (renyuanLeibie !== null && renyuanLeibie !== undefined && String(renyuanLeibie).trim() !== "")
                ? String(renyuanLeibie).trim()
                : "";
            
            var caiwuStr = (caiwuDaiyuLeibie !== null && caiwuDaiyuLeibie !== undefined && String(caiwuDaiyuLeibie).trim() !== "")
                ? String(caiwuDaiyuLeibie).trim()
                : "";
            
            if (renyuanStr === "" && caiwuStr === "") {
                continue;
            }
            
            if (renyuanStr !== "" && caiwuStr === "") {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": "人员类别: " + renyuanStr + ", 财务待遇人员类别: (空)",
                    "错误详情": "财务待遇人员类别不能为空",
                    "规则名称": ruleName
                });
                continue;
            }
            
            if (caiwuStr !== "" && renyuanStr === "") {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": "人员类别: (空), 财务待遇人员类别: " + caiwuStr,
                    "错误详情": "人员类别不能为空",
                    "规则名称": ruleName
                });
                continue;
            }
            
            // 特殊规则：生长干部学员的财务待遇人员类别可以为学员
            if (renyuanStr === '生长干部学员' && caiwuStr === '学员') {
                continue;
            }
            
            // 特殊规则：军士学员的财务待遇人员类别可以为学员或军士
            if (renyuanStr === '军士学员' && (caiwuStr === '学员' || caiwuStr === '军士')) {
                continue;
            }
            
            // 精准匹配：人员类别和财务待遇人员类别必须完全一致
            if (renyuanStr !== caiwuStr) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": "人员类别: " + renyuanStr + ", 财务待遇人员类别: " + caiwuStr,
                    "错误详情": "财务待遇人员类别与人员类别不一致",
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkCaiwuDaiyuRenyuanLeibie = checkCaiwuDaiyuRenyuanLeibie;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('财务待遇类别检查', checkCaiwuDaiyuRenyuanLeibie, '数据一致性', '检查财务待遇人员类别与人员类别的一致性');
    }
})();
