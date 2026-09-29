(function() {
    'use strict';
    
    function checkXuewei(data) {
        var errors = [];
        var ruleName = "学位检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        var noDegreeEducation = [
            "文盲或半文盲", "小学", "初中", "高中", "技工学校",
            "中等专业学校或中等技术学校", "大学专科和专科学校"
        ];
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var degree = row["学位"];
            var education = row["文化程度"] || "";
            
            var hasError = false;
            var errorDetail = "";
            
            var degreeStr = isEmpty(degree) ? "" : String(degree).trim();
            
            if (degreeStr === "") {
                errorDetail = "学位不能为空";
                hasError = true;
            } else {
                var needsNoDegree = false;
                for (var i = 0; i < noDegreeEducation.length; i++) {
                    if (noDegreeEducation[i] === education) {
                        needsNoDegree = true;
                        break;
                    }
                }
                
                if (needsNoDegree) {
                    if (degreeStr !== "无学位") {
                        errorDetail = "文化程度 '" + education + "' 的学位应为'无学位', 实际为 '" + degreeStr + "'";
                        hasError = true;
                    }
                } else if (education === "大学本科（简称大学）") {
                    if (degreeStr !== "学士" && degreeStr !== "其他学位") {
                        errorDetail = "大学本科学位应为'学士'或'其他学位', 实际为 '" + degreeStr + "'";
                        hasError = true;
                    }
                } else if (education === "研究生") {
                    if (degreeStr !== "硕士" && degreeStr !== "博士" && degreeStr !== "其他学位") {
                        errorDetail = "研究生学位应为'硕士'、'博士'或'其他学位', 实际为 '" + degreeStr + "'";
                        hasError = true;
                    }
                } else if (education !== "") {
                    if (degreeStr !== "无学位") {
                        errorDetail = "文化程度 '" + education + "' 的学位应为'无学位', 实际为 '" + degreeStr + "'";
                        hasError = true;
                    }
                }
            }
            
            if (hasError) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": degree || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkXuewei = checkXuewei;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('学位检查', checkXuewei, '基础信息', '检查学位与文化程度是否匹配');
    }
})();

