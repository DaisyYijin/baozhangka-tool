(function() {
    'use strict';
    
    function checkShenfenzhengRiqi(data) {
        var errors = [];
        var ruleName = "身份证日期检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        var getPersonType = function(row) {
            return row["人员类别"] || '';
        };
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = getPersonType(row);
            var startDate = row["身份证件起始日期"];
            var endDate = row["身份证件终止日期"];
        
            var hasError = false;
            var errorDetail = "";
        
            if (startDate === null || startDate === undefined || String(startDate).trim() === "") {
                errorDetail = "身份证件起始日期不能为空";
                hasError = true;
            }
            else if (endDate === null || endDate === undefined || String(endDate).trim() === "") {
                errorDetail = "身份证件终止日期不能为空";
                hasError = true;
            } else {
                try {
                    var startStr = String(startDate).trim();
                    var endStr = String(endDate).trim();
                
                if (!/^\d{8}$/.test(startStr)) {
                    errorDetail = "身份证件起始日期格式错误: " + startStr + " (应为8位数字, 如20160909)";
                    hasError = true;
                } else if (!/^\d{8}$/.test(endStr)) {
                    errorDetail = "身份证件终止日期格式错误: " + endStr + " (应为8位数字, 如20260909)";
                    hasError = true;
                } else {
                    var startInt = parseInt(startStr);
                    var endInt = parseInt(endStr);
                    
                    if (startInt >= endInt) {
                        errorDetail = "身份证件起始日期不能晚于或等于终止日期: " + startStr + " vs " + endStr;
                        hasError = true;
                    } else {
                        var startYear = parseInt(startStr.substring(0, 4));
                        var startMonth = parseInt(startStr.substring(4, 6));
                        var startDay = parseInt(startStr.substring(6, 8));
                        
                        var endYear = parseInt(endStr.substring(0, 4));
                        var endMonth = parseInt(endStr.substring(4, 6));
                        var endDay = parseInt(endStr.substring(6, 8));
                        
                        if (startMonth < 1 || startMonth > 12) {
                            errorDetail = "身份证件起始日期月份无效: " + startMonth + " (应为1-12)";
                            hasError = true;
                        } else if (endMonth < 1 || endMonth > 12) {
                            errorDetail = "身份证件终止日期月份无效: " + endMonth + " (应为1-12)";
                            hasError = true;
                        }
                        else if (startDay < 1 || startDay > 31) {
                            errorDetail = "身份证件起始日期日期无效: " + startDay + " (应为1-31)";
                            hasError = true;
                        } else if (endDay < 1 || endDay > 31) {
                            errorDetail = "身份证件终止日期日期无效: " + endDay + " (应为1-31)";
                            hasError = true;
                        } else {
                            var dateDiff = endInt - startInt;
                            var validDiffs = [50000, 100000, 200000, 300000];
                            
                            if (validDiffs.indexOf(dateDiff) === -1) {
                                var formattedDiff = Math.floor(dateDiff/10000) + "年" + Math.floor(dateDiff%10000/100) + "月" + (dateDiff%100) + "天";
                                var expectedDiffs = validDiffs.map(function(d) { return (d/10000) + "年"; }).join('、');
                                errorDetail = "身份证件有效期错误: 起始日期 " + startStr + ", 终止日期 " + endStr + " (实际差值: " + formattedDiff + ", 应为" + expectedDiffs + ")";
                                hasError = true;
                            }
                        }
                    }
                }
            } catch (error) {
                errorDetail = "日期转换错误: 起始日期 " + startDate + ", 终止日期 " + endDate;
                hasError = true;
            }
        }
        
            if (hasError) {
                var startDisplay = isEmpty(startDate) ? '空' : String(startDate);
                var endDisplay = isEmpty(endDate) ? '空' : String(endDate);
                
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue,
                    "姓名": nameValue,
                    "人员类别": personType || "",
                    "当前值": "起始:" + startDisplay + " 终止:" + endDisplay,
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkShenfenzhengRiqi = checkShenfenzhengRiqi;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('身份证日期检查', checkShenfenzhengRiqi, '证件信息', '检查身份证起止日期的合理性');
    }
})();
