/**
 * 证件类型生成器
 * 功能：根据人员类别自动生成对应的证件类型
 * 
 * 生成规则：
 * - 义务兵 → 义务兵证
 * - 军士 → 军士证
 * - 指挥管理军官/专业技术军官 → 军官证
 * - 学员 → 学员证
 * - 退休人员 → 退休证
 * - 文职人员 → 文职人员证
 */
(function() {
    /**
     * 人员类别与证件类型的映射表
     * 键：人员类别
     * 值：对应的证件类型
     */
    var PERSON_TYPE_MAP = {
        '义务兵': '义务兵证',
        '军士': '军士证',
        '指挥管理军官': '军官证',
        '专业技术军官': '军官证',
        '军士学员': '学员证',
        '军官学员': '学员证',
        '生长干部学员': '学员证',
        '退休军士': '军士退休证',
        '退休士官': '军士退休证',
        // 与 规则/证件类型检查.js 口径对齐：离退休干部/军官/士兵统一使用"退休证"，避免生成数据通不过检查
        '退休军官': '退休证',
        '退休干部': '退休证',
        '退休士兵': '退休证',
        '离休干部': '退休证',
        '转改管理文职人员': '文职人员证',
        '招录管理文职人员': '文职人员证',
        '招录技术文职人员': '文职人员证',
        '转改技术文职人员': '文职人员证',
        '专业技能文职人员': '文职人员证'
    };
    
    /**
     * 根据人员类别生成证件类型
     * @param {string} personType - 人员类别
     * @returns {string|null} 证件类型，未匹配返回null
     */
    function generateCertificateType(personType) {
        if (!personType || String(personType).trim() === '') {
            return null;
        }
        
        var typeStr = String(personType).trim();
        
        if (typeStr in PERSON_TYPE_MAP) {
            return PERSON_TYPE_MAP[typeStr];
        }
        
        return null;
    }
    
    /**
     * 证件类型生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据（用于对比变更）
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息 {count: number, colors: object}
     */
    function generateCertType(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var certType = row['证件类型'];
            var personType = row['人员类别'];
            
            var origRow = originalData[i + 1];
            var origCertType = origRow ? origRow[headers.indexOf('证件类型')] : '';
            
            if ((!certType || String(certType).trim() === '') && personType) {
                var generated = generateCertificateType(personType);
                if (generated) {
                    row['证件类型'] = generated;
                    
                    // 使用统一的颜色标记函数
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '证件类型', 'yellow');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['证件类型'] = 'yellow';
                    }
                    count++;
                }
            } else if (origCertType && String(origCertType).trim() !== '' && 
                       certType && String(certType).trim() !== String(origCertType).trim()) {
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, '证件类型', 'orange');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i]['证件类型'] = 'orange';
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册证件类型生成器到全局生成器列表
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['证件类型生成'] = {
            name: '证件类型生成',
            description: '根据人员类别生成证件类型',
            icon: '<i class="fa fa-id-card"></i>',
            func: generateCertType
        };
    }
})();

