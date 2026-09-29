/**
 * 血型生成器
 * 功能：根据中国人群血型分布统计规律生成合理的血型数据
 * 
 * 血型分布比例（符合中国人群统计数据）：
 * - A型RH+: 28%
 * - B型RH+: 24%
 * - O型RH+: 40%
 * - AB型RH+: 7%
 * - A型RH-: 0.5%
 * - B型RH-: 0.4%
 * - O型RH-: 0.1%
 * - AB型RH-: 0.05%
 */
(function() {
    var BLOOD_TYPES = {
        'A型RH+': 0.28,
        'B型RH+': 0.24,
        'O型RH+': 0.40,
        'AB型RH+': 0.07,
        'A型RH-': 0.005,
        'B型RH-': 0.004,
        'O型RH-': 0.001,
        'AB型RH-': 0.0005
    };
    
    /**
     * 根据分布概率随机选择血型
     * @param {Object} distribution - 血型分布对象
     * @returns {string} 选中的血型（带"型"字）
     */
    function getRandomBloodType(distribution) {
        var rand = Math.random();
        var sum = 0;
        for (var type in distribution) {
            sum += distribution[type];
            if (rand < sum) {
                return type;
            }
        }
        return 'O型RH+';
    }
    
    /**
     * 血型生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息
     */
    function generateBloodType(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var bloodType = row['血型'];
            var origRow = originalData[i + 1];
            var origBloodType = origRow ? origRow[headers.indexOf('血型')] : '';
            
            if (!bloodType || String(bloodType).trim() === '') {
                // 血型为空，生成新血型
                var newBloodType = getRandomBloodType(BLOOD_TYPES);
                row['血型'] = newBloodType;
                
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, '血型', 'yellow');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i]['血型'] = 'yellow';
                }
                count++;
            } else {
                var bloodStr = String(bloodType).trim();
                var needsNormalization = false;
                var normalizedBlood = bloodStr;
                
                // 检查是否包含RH后缀
                var hasRH = bloodStr.toUpperCase().indexOf('RH') !== -1;
                
                if (!hasRH) {
                    // 没有RH后缀，需要规范化
                    // 先移除可能存在的"血"字
                    normalizedBlood = bloodStr.replace(/血/g, '');
                    // 添加RH+后缀
                    normalizedBlood = normalizedBlood + 'RH+';
                    needsNormalization = true;
                }
                
                if (needsNormalization) {
                    row['血型'] = normalizedBlood;
                    
                    debugLog('第' + (i + 1) + '行：血型规范化 "' + bloodStr + '" -> "' + normalizedBlood + '"');
                    
                    // 标记为黄色（生成/修正）
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '血型', 'yellow');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['血型'] = 'yellow';
                    }
                    count++;
                } else if (origBloodType && String(origBloodType).trim() !== '' && 
                           String(bloodType).trim() !== String(origBloodType).trim()) {
                    // 标记已修改的单元格为橙色
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '血型', 'orange');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['血型'] = 'orange';
                    }
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册血型生成器
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['血型生成'] = {
        name: '血型生成',
        description: '根据中国人群统计规律生成血型数据（A型/B型/O型/AB型）',
        icon: '<i class="fa fa-tint"></i>',
        func: generateBloodType
        };
    }
})();

