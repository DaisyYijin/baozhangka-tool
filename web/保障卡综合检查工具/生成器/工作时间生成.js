/**
 * 工作日期生成器
 * 功能：将"入伍时间"的值复制到"工作日期"字段
 * 
 * 生成规则：
 * - 如果"工作日期"为空且"入伍时间"有值，则复制"入伍时间"到"工作日期"
 * - 如果"入伍时间"为空，则不进行生成
 */
(function() {
    /**
     * 工作日期生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息
     */
    function generateWorkDate(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        // 使用通用工具函数查找列名（容错处理空格）
        var workDateCol = window.GeneratorUtils.findColumn(headers, ['工作日期', '工作时间']);
        var enlistTimeCol = window.GeneratorUtils.findColumn(headers, ['入伍时间', '入伍日期']);
        
        debugLog('工作日期生成器 - 列匹配结果: 工作日期="' + workDateCol + '", 入伍时间="' + enlistTimeCol + '"');
        
        // 如果找不到必要的列，返回空结果
        if (!workDateCol || !enlistTimeCol) {
            debugLog('[WARN] 工作日期生成器: 未找到必要的列');
            return {count: 0, colors: {}};
        }
        
        // 获取原始表头中的索引（用于从originalData读取）
        var workDateIndex = -1;
        for (var j = 0; j < headers.length; j++) {
            if (window.GeneratorUtils.cleanString(headers[j]) === window.GeneratorUtils.cleanString(workDateCol)) {
                workDateIndex = j;
                break;
            }
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var workDate = row[workDateCol];
            var enlistTime = row[enlistTimeCol];
            
            var origRow = originalData[i + 1];
            var origWorkDate = origRow && workDateIndex !== -1 ? origRow[workDateIndex] : '';
            
            // 如果工作日期为空，且入伍时间有值，则复制入伍时间
            if ((!workDate || String(workDate).trim() === '') && 
                enlistTime && String(enlistTime).trim() !== '') {
                
                row[workDateCol] = enlistTime;
                
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, workDateCol, 'yellow');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i][workDateCol] = 'yellow';
                }
                count++;
            } 
            // 如果原始值存在但被修改，标记为橙色
            else if (origWorkDate && String(origWorkDate).trim() !== '' && 
                     workDate && String(workDate).trim() !== String(origWorkDate).trim()) {
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, workDateCol, 'orange');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i][workDateCol] = 'orange';
                }
            }
        }
        
        debugLog('工作日期生成完成，共生成/修正: ' + count + ' 个字段');
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册工作日期生成器
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['工作日期生成'] = {
            name: '工作日期生成',
            description: '从入伍时间复制到工作日期',
            icon: '<i class="fa fa-clock-o"></i>',
            func: generateWorkDate
        };
    }
})();

