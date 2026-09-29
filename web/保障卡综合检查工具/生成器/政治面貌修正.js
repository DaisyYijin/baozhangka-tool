/**
 * 政治面貌修正生成器
 * 功能：检查中共预备党员时间是否超过一年，如果超过则修改为中共党员
 * 
 * 规则：
 * - 政治面貌为"中共预备党员"
 * - 政治面貌日期距今超过365天
 * - 自动修改为"中共党员"
 */
(function() {
    /**
     * 解析日期字符串（支持8位数字格式：20190901）
     */
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
    
    /**
     * 计算两个日期之间的天数差
     */
    function getDaysDiff(date1, date2) {
        var timeDiff = date2.getTime() - date1.getTime();
        return Math.floor(timeDiff / (1000 * 3600 * 24));
    }
    
    /**
     * 判断值是否为空
     */
    function isEmpty(value) {
        if (window.DataCheckUtils && window.DataCheckUtils.isEmpty) {
            return window.DataCheckUtils.isEmpty(value);
        }
        return value === null || value === undefined || String(value).trim() === '';
    }
    
    /**
     * 政治面貌修正主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息
     */
    function correctPoliticalStatus(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        var currentDate = new Date();
        
        // 使用工具函数查找列名（容错处理空格）
        var politicalStatusCol = window.GeneratorUtils ? 
            window.GeneratorUtils.findColumn(headers, ['政治面貌']) : '政治面貌';
        var politicalDateCol = window.GeneratorUtils ? 
            window.GeneratorUtils.findColumn(headers, ['政治面貌日期']) : '政治面貌日期';
        
        if (!politicalStatusCol || !politicalDateCol) {
            console.warn('未找到必需的列: 政治面貌或政治面貌日期');
            return {count: 0, colors: {}};
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var politicalStatus = row[politicalStatusCol];
            var politicalDate = row[politicalDateCol];
            
            // 检查是否为中共预备党员
            if (!isEmpty(politicalStatus)) {
                var statusStr = String(politicalStatus).trim();
                
                if (statusStr === "中共预备党员") {
                    // 检查政治面貌日期是否存在
                    if (!isEmpty(politicalDate)) {
                        // 解析政治面貌日期
                        var polDate = parseDate(politicalDate);
                        
                        if (polDate) {
                            // 计算从政治面貌日期到现在的天数
                            var daysDiff = getDaysDiff(polDate, currentDate);
                            
                            // 如果超过365天（一年），修改为中共党员
                            if (daysDiff > 365) {
                                row[politicalStatusCol] = "中共党员";
                                
                                var years = (daysDiff / 365).toFixed(1);
                                debugLog('第' + (i + 2) + '行：预备党员时间超过一年(' + years + '年)，修正为"中共党员"');
                                
                                // 使用统一的颜色标记函数
                                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                                    window.DataCheckUtils.markCellColor(colors, i, politicalStatusCol, 'yellow');
                                } else {
                                    if (!colors[i]) colors[i] = {};
                                    colors[i][politicalStatusCol] = 'yellow';
                                }
                                count++;
                            }
                        } else {
                            console.warn('第' + (i + 2) + '行：政治面貌日期格式错误: ' + politicalDate);
                        }
                    } else {
                        console.warn('第' + (i + 2) + '行：中共预备党员的政治面貌日期为空');
                    }
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册政治面貌修正生成器
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['政治面貌修正'] = {
            name: '政治面貌修正',
            description: '检查中共预备党员时间是否超过一年，如超过则修正为中共党员',
            icon: '<i class="fa fa-flag"></i>',
            func: correctPoliticalStatus
        };
    }
})();

