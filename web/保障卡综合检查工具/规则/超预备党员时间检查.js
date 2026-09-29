(function() {
    'use strict';
    
    function checkChaoYubeiDangyuanShijian(data) {
        var errors = [];
        var ruleName = "超预备党员时间检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        // 解析日期字符串（支持8位数字格式：20190901）
        function parseDate(dateStr) {
            if (!dateStr) return null;
            
            var str = String(dateStr).trim();
            
            // 处理8位数字格式（20190901）
            if (/^\d{8}$/.test(str)) {
                var year = parseInt(str.substring(0, 4), 10);
                var month = parseInt(str.substring(4, 6), 10) - 1; // 月份从0开始
                var day = parseInt(str.substring(6, 8), 10);
                return new Date(year, month, day);
            }
            
            // 处理其他可能的日期格式
            var date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
        }
        
        // 计算两个日期之间的天数差
        function getDaysDiff(date1, date2) {
            var timeDiff = date2.getTime() - date1.getTime();
            return Math.floor(timeDiff / (1000 * 3600 * 24));
        }
        
        // 获取当前日期
        var currentDate = new Date();
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var politicalStatus = row["政治面貌"];
            var politicalDate = row["政治面貌日期"];
            
            var hasError = false;
            var errorDetail = "";
            
            // 只检查政治面貌为"中共预备党员"的记录
            if (!isEmpty(politicalStatus)) {
                var statusStr = String(politicalStatus).trim();
                
                if (statusStr === "中共预备党员") {
                    // 检查政治面貌日期是否存在
                    if (isEmpty(politicalDate)) {
                        errorDetail = "中共预备党员的政治面貌日期不能为空";
                        hasError = true;
                    } else {
                        // 解析政治面貌日期
                        var polDate = parseDate(politicalDate);
                        
                        if (!polDate) {
                            errorDetail = "政治面貌日期格式错误: " + politicalDate;
                            hasError = true;
                        } else {
                            // 计算从政治面貌日期到现在的天数
                            var daysDiff = getDaysDiff(polDate, currentDate);
                            
                            // 如果超过365天（一年），报错
                            if (daysDiff > 365) {
                                var years = (daysDiff / 365).toFixed(1);
                                errorDetail = "预备党员时间超过一年: " + years + "年 (日期: " + politicalDate + ", 已超过 " + daysDiff + " 天)";
                                hasError = true;
                            }
                        }
                    }
                }
            }
            
            if (hasError) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": politicalStatus || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkChaoYubeiDangyuanShijian = checkChaoYubeiDangyuanShijian;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('超预备党员时间检查', checkChaoYubeiDangyuanShijian, '政治信息', '检查中共预备党员时间是否超过一年');
    }
})();

