/**
 * 入学日期生成器
 * 功能：根据出生日期和文化程度自动生成合理的入学日期
 * 
 * 生成规则：
 * - 根据文化程度确定入学年龄（小学6岁、初中12岁、高中15岁等）
 * - 结合出生日期计算入学年份
 * - 统一设置入学日期为9月1日（开学日期）
 * - 如果出生月份在9月之后，入学年份顺延一年
 * 
 * 支持的文化程度：
 * - 小学、初中、高中、技工学校
 * - 中等专业学校、大学专科、大学本科、研究生
 */
(function() {
    /**
     * 文化程度对应的入学年龄映射表
     * 键：文化程度名称
     * 值：标准入学年龄
     */
    var AGE_MAP = {
        '小学': 6,
        '初中': 12,
        '高中': 15,
        '技工学校': 15,
        '中等专业学校或中等技术学校': 15,
        '大学专科和专科学校': 18,
        '大学本科（简称大学）': 18,
        '研究生': 22,
    };
    
    /**
     * 从身份证号码中提取出生日期
     * @param {string|number} idNumber - 身份证号码（支持15位或18位）
     * @returns {string|null} 8位数字格式的出生日期（YYYYMMDD），提取失败返回null
     */
    function extractBirthFromID(idNumber) {
        if (!idNumber) return null;
        var idStr = String(idNumber).trim();
        
        if (idStr.length === 18) {
            var birthStr = idStr.substring(6, 14);
            if (/^\d{8}$/.test(birthStr)) {
                return birthStr;
            }
        }
        else if (idStr.length === 15) {
            var year = idStr.substring(6, 8);
            var month = idStr.substring(8, 10);
            var day = idStr.substring(10, 12);
            return '19' + year + month + day;
        }
        
        return null;
    }
    
    /**
     * 计算入学日期
     * @param {string} birthDateStr - 出生日期字符串（8位数字格式：YYYYMMDD）
     * @param {string} education - 文化程度
     * @returns {string|null} 8位数字格式的入学日期（YYYYMMDD），计算失败返回null
     */
    function calculateAdmissionDate(birthDateStr, education) {
        try {
            var birthStr = String(birthDateStr).replace(/\D/g, '');
            if (birthStr.length !== 8) return null;
            
            var year = parseInt(birthStr.substring(0, 4));
            var month = parseInt(birthStr.substring(4, 6));
            
            var eduStr = String(education).trim();
            var admissionAge = AGE_MAP[eduStr] || 18;
            
            var admissionYear = year + admissionAge;
            if (month > 9) {
                admissionYear++;
            }
            
            return admissionYear + '0901';
        } catch (e) {
            return null;
        }
    }
    
    /**
     * 入学日期生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据（用于对比变更）
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息 {count: number, colors: object}
     */
    function generateAdmissionDate(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var admissionDate = row['入学日期'];
            var birthDateStr = row['出生日期'];
            var idNumber = row['公民身份号码'] || row['身份证号码'];
            var education = row['文化程度'];
            
            var origRow = originalData[i + 1];
            var origAdmission = origRow ? origRow[headers.indexOf('入学日期')] : '';
            
            if ((!admissionDate || String(admissionDate).trim() === '') && education) {
                var birthDate = birthDateStr;
                if (!birthDate || String(birthDate).trim() === '') {
                    birthDate = extractBirthFromID(idNumber);
                }
                
                if (birthDate) {
                    var date = calculateAdmissionDate(birthDate, education);
                    if (date) {
                        row['入学日期'] = date;
                        
                        // 使用统一的颜色标记函数
                        if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                            window.DataCheckUtils.markCellColor(colors, i, '入学日期', 'yellow');
                        } else {
                            if (!colors[i]) colors[i] = {};
                            colors[i]['入学日期'] = 'yellow';
                        }
                        count++;
                    }
                }
            } else if (origAdmission && String(origAdmission).trim() !== '' && 
                       admissionDate && String(admissionDate).trim() !== String(origAdmission).trim()) {
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, '入学日期', 'orange');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i]['入学日期'] = 'orange';
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册入学日期生成器到全局生成器列表
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['入学日期生成'] = {
        name: '入学日期生成',
        description: '根据出生日期和文化程度生成入学日期',
        icon: '<i class="fa fa-sign-in"></i>',
        func: generateAdmissionDate
        };
    }
})();

