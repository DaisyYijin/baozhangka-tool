/**
 * 文化程度生成器
 * 功能：根据人员年龄自动生成合理的文化程度
 * 
 * 生成规则：
 * - 根据出生日期计算当前年龄
 * - 根据年龄段分配合适的文化程度
 * - 年龄越大，文化程度越高
 * - 部分年龄段支持随机选择多种可能的教育类型
 * 
 * 年龄与文化程度对应关系：
 * - 16岁以下：初中
 * - 16-18岁：高中
 * - 19-22岁：技工学校/中专/大专
 * - 23-25岁：大学本科
 * - 26-29岁：大学本科或研究生
 * - 30岁及以上：研究生
 */
(function() {
    /**
     * 所有可用的文化程度等级列表
     * 按照从低到高的顺序排列
     */
    var EDUCATION_LEVELS = [
        '文盲或半文盲', '小学', '初中', '高中', '技工学校',
        '中等专业学校或中等技术学校', '大学专科和专科学校',
        '大学本科（简称大学）', '研究生'
    ];
    
    /**
     * 根据出生日期计算当前年龄
     * @param {string} birthDateStr - 出生日期字符串（8位数字格式：YYYYMMDD）
     * @returns {number} 年龄，计算失败返回25（默认值）
     */
    function calculateAgeFromBirthDate(birthDateStr) {
        try {
            var birthStr = String(birthDateStr).replace(/\D/g, '');
            if (birthStr.length !== 8) return 25;
            
            var year = parseInt(birthStr.substring(0, 4));
            var today = new Date();
            return today.getFullYear() - year;
        } catch (e) {
            return 25;
        }
    }
    
    /**
     * 根据年龄获取合适的文化程度
     * @param {number} age - 年龄
     * @param {Array} levels - 文化程度等级列表（未使用）
     * @returns {string} 文化程度名称
     */
    function getEducationByAge(age, levels) {
        if (age < 16) return '初中';
        if (age < 19) return '高中';
        if (age < 23) {
            var options = ['技工学校', '中等专业学校或中等技术学校', '大学专科和专科学校'];
            return options[Math.floor(Math.random() * options.length)];
        }
        if (age < 26) return '大学本科（简称大学）';
        if (age < 30) return Math.random() < 0.7 ? '研究生' : '大学本科（简称大学）';
        return '研究生';
    }
    
    /**
     * 文化程度生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据（用于对比变更）
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息 {count: number, colors: object}
     */
    function generateEducation(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        // 使用通用工具函数查找列名（容错处理空格）
        var educationCol = window.GeneratorUtils.findColumn(headers, ['文化程度', '学历']);
        var birthDateCol = window.GeneratorUtils.findColumn(headers, ['出生日期', '出生年月']);
        
        debugLog('文化程度生成器 - 列匹配结果: 文化程度="' + educationCol + '", 出生日期="' + birthDateCol + '"');
        
        // 如果找不到必要的列，返回空结果
        if (!educationCol) {
            debugLog('[WARN] 文化程度生成器: 未找到"文化程度"列');
            return {count: 0, colors: {}};
        }
        
        if (!birthDateCol) {
            debugLog('[WARN] 文化程度生成器: 未找到"出生日期"列，无法生成文化程度');
            return {count: 0, colors: {}};
        }
        
        // 获取原始表头中的索引（用于从originalData读取）
        var educationIndex = -1;
        for (var j = 0; j < headers.length; j++) {
            if (window.GeneratorUtils.cleanString(headers[j]) === window.GeneratorUtils.cleanString(educationCol)) {
                educationIndex = j;
                break;
            }
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var education = row[educationCol];
            var birthDateStr = row[birthDateCol];
            
            var origRow = originalData[i + 1];
            var origEducation = origRow && educationIndex !== -1 ? origRow[educationIndex] : '';
            
            if ((!education || String(education).trim() === '') && birthDateStr) {
                var age = calculateAgeFromBirthDate(birthDateStr);
                var generatedEducation = getEducationByAge(age, EDUCATION_LEVELS);
                row[educationCol] = generatedEducation;
                
                debugLog('第' + (i + 1) + '行: 年龄=' + age + ' → 文化程度="' + generatedEducation + '"');
                
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, educationCol, 'yellow');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i][educationCol] = 'yellow';
                }
                count++;
            } else if (origEducation && String(origEducation).trim() !== '' && 
                       education && String(education).trim() !== String(origEducation).trim()) {
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, educationCol, 'orange');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i][educationCol] = 'orange';
                }
            }
        }
        
        debugLog('文化程度生成完成，共生成/修正: ' + count + ' 个字段');
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册文化程度生成器到全局生成器列表
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['文化程度生成'] = {
        name: '文化程度生成',
        description: '根据年龄生成文化程度',
        icon: '<i class="fa fa-book"></i>',
        func: generateEducation
        };
    }
})();

