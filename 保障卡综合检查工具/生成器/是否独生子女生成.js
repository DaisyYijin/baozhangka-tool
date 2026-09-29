/**
 * 是否独生子女生成器
 * 功能：随机生成"是"或"否"
 * 
 * 生成规则：
 * - 随机分配"是"或"否"
 * - 默认比例：是 40%，否 60%（符合中国实际情况）
 */
(function() {
    /**
     * 根据概率随机生成是否独生子女
     * @returns {string} "是"或"否"
     */
    function getRandomOnlyChild() {
        // 40%的概率生成"是"，60%的概率生成"否"
        return Math.random() < 0.4 ? '是' : '否';
    }
    
    /**
     * 是否独生子女生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息
     */
    function generateOnlyChild(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        var fieldIndex = headers.indexOf('是否独生子女');
        if (fieldIndex === -1) {
            // 如果没有找到该列，返回0
            return {count: 0, colors: {}};
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var onlyChild = row['是否独生子女'];
            var origRow = originalData[i + 1];
            var origOnlyChild = origRow ? origRow[fieldIndex] : '';
            
            // 如果字段为空，生成新值
            if (!onlyChild || String(onlyChild).trim() === '') {
                var newValue = getRandomOnlyChild();
                row['是否独生子女'] = newValue;
                
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, '是否独生子女', 'yellow');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i]['是否独生子女'] = 'yellow';
                }
                count++;
            } 
            // 如果原始值存在但被修改，标记为橙色
            else if (origOnlyChild && String(origOnlyChild).trim() !== '' && 
                     String(onlyChild).trim() !== String(origOnlyChild).trim()) {
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, '是否独生子女', 'orange');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i]['是否独生子女'] = 'orange';
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册是否独生子女生成器
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['是否独生子女生成'] = {
            name: '是否独生子女生成',
            description: '随机生成"是"或"否"',
            icon: '<i class="fa fa-child"></i>',
            func: generateOnlyChild
        };
    }
})();

