/**
 * 证件编号生成器
 * 功能：根据证件类型和入伍日期生成符合规范的证件编号
 * 
 * 格式：前缀 + 日期（8位） + 随机后缀（3位） + "号"
 * 例如：军字第20190901001号
 * 
 * 支持的证件类型：
 * - 军官证、军士证、义务兵证、学员证
 * - 退休证、军官退休证、军士退休证
 * - 文职人员证
 */
(function() {
    /**
     * 证件类型与前缀映射表
     */
    var CERTIFICATE_PREFIX_MAP = {
        '军官证': '军字第',
        '军士证': '士字第',
        '义务兵证': '兵字第',
        '学员证': '学字第',
        '退休证': '退字第',
        '军官退休证': '退字第',
        '军士退休证': '退字第',
        '文职人员证': '文字第'
    };
    
    /**
     * 生成证件编号
     * @param {string} certificateType - 证件类型
     * @param {string} entryDate - 入伍日期或工作日期
     * @param {object} existingNumbers - 已存在的编号集合（用于去重）
     * @param {string} idNumber - 身份证号码（文职人员证需要）
     * @returns {string|null} 生成的证件编号，失败返回null
     */
    function generateCertificateNumber(certificateType, entryDate, existingNumbers, idNumber) {
        if (!certificateType || !entryDate) {
            return null;
        }
        
        var certTypeStr = String(certificateType).trim();
        
        var correctPrefix = CERTIFICATE_PREFIX_MAP[certTypeStr] || '';
        if (!correctPrefix) {
            return null;
        }
        
        // 文职人员证特殊处理：工作日期前4位 + 身份证后6位
        if (certTypeStr === '文职人员证') {
            if (!idNumber) {
                return null;
            }
            
            var dateStr = String(entryDate).replace(/\D/g, '');
            var yearPart = '';
            if (dateStr.length >= 4) {
                yearPart = dateStr.substring(0, 4);
            } else {
                return null;
            }
            
            var idStr = String(idNumber).replace(/\D/g, '');
            var idSuffix = '';
            if (idStr.length >= 6) {
                idSuffix = idStr.substring(idStr.length - 6);
            } else {
                return null;
            }
            
            var certNumber = correctPrefix + yearPart + idSuffix + '号';
            existingNumbers[certNumber] = true;
            return certNumber;
        }
        
        // 其他证件类型：使用原有逻辑
        var dateStr = String(entryDate).replace(/\D/g, '');
        var datePart = '';
        if (dateStr.length >= 8) {
            datePart = dateStr.substring(0, 8);
        } else {
            datePart = dateStr;
            while (datePart.length < 8) {
                datePart += '0';
            }
        }
        
        var maxAttempts = 100;
        for (var i = 0; i < maxAttempts; i++) {
            var randomSuffix = String(Math.floor(Math.random() * 999) + 1);
            while (randomSuffix.length < 3) {
                randomSuffix = '0' + randomSuffix;
            }
            
            var certNumber = correctPrefix + datePart + randomSuffix + '号';
            
            if (!existingNumbers[certNumber]) {
                existingNumbers[certNumber] = true;
                return certNumber;
            }
        }
        
        return correctPrefix + datePart + '001号';
    }
    
    /**
     * 规范化证件编号：为纯数字的证件编号添加前缀和后缀
     * @param {string} certNumber - 原始证件编号
     * @param {string} certType - 证件类型
     * @param {string} idNumber - 身份证号码（文职人员证需要）
     * @param {string} workDate - 工作日期（文职人员证需要）
     * @returns {string|null} 规范化后的证件编号，如果不需要规范化则返回null
     */
    function normalizeCertNumber(certNumber, certType, idNumber, workDate) {
        if (!certNumber || !certType) {
            return null;
        }
        
        var certStr = String(certNumber).trim();
        var certTypeStr = String(certType).trim();
        
        // 获取对应的前缀
        var correctPrefix = CERTIFICATE_PREFIX_MAP[certTypeStr];
        if (!correctPrefix) {
            return null;
        }
        
        // 检查是否已经有前缀和后缀
        var hasPrefix = certStr.indexOf(correctPrefix) !== -1;
        var hasSuffix = certStr.indexOf('号') !== -1;
        
        // 文职人员证特殊处理
        if (certTypeStr === '文职人员证') {
            // 提取数字部分
            var numberPart = certStr.replace(/\D/g, '');
            
            // 如果已经是完整格式，且数字部分是10位（年份4位+身份证后6位）
            if (hasPrefix && hasSuffix && numberPart.length === 10) {
                return null; // 已经规范，不需要修改
            }
            
            // 情况1：已经是10位数字，只需要添加前后缀
            if (numberPart.length === 10) {
                return correctPrefix + numberPart + '号';
            }
            
            // 情况2：不是10位，需要重新生成（使用工作日期+身份证）
            if (idNumber && workDate) {
                var dateStr = String(workDate).replace(/\D/g, '');
                var yearPart = '';
                if (dateStr.length >= 4) {
                    yearPart = dateStr.substring(0, 4);
                } else {
                    // 如果没有工作日期，尝试从原编号中提取年份
                    if (numberPart.length >= 4) {
                        yearPart = numberPart.substring(0, 4);
                    } else {
                        return correctPrefix + numberPart + '号'; // 无法确定年份，只能添加前后缀
                    }
                }
                
                var idStr = String(idNumber).replace(/\D/g, '');
                var idSuffix = '';
                if (idStr.length >= 6) {
                    idSuffix = idStr.substring(idStr.length - 6);
                } else {
                    return correctPrefix + numberPart + '号'; // 身份证不合法，只能添加前后缀
                }
                
                return correctPrefix + yearPart + idSuffix + '号';
            }
            
            // 如果没有身份证和工作日期，只能添加前后缀
            if (numberPart.length > 0) {
                return correctPrefix + numberPart + '号';
            }
            
            return null;
        }
        
        // 其他证件类型的规范化逻辑
        // 如果已经规范，不需要修改
        if (hasPrefix && hasSuffix) {
            return null;
        }
        
        // 如果是纯数字或缺少前缀/后缀，进行规范化
        var numberPart = certStr.replace(/\D/g, '');
        
        if (numberPart.length > 0) {
            // 构建完整的证件编号
            return correctPrefix + numberPart + '号';
        }
        
        return null;
    }
    
    function generateCertNumber(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        var existingNumbers = {};
        
        for (var i = 0; i < rows.length; i++) {
            var certNumber = rows[i]['证件编号'];
            if (certNumber && String(certNumber).trim() !== '') {
                existingNumbers[String(certNumber).trim()] = true;
            }
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var certNumber = row['证件编号'];
            var certType = row['证件类型'];
            var entryDate = row['入伍日期'] || row['入伍时间'];
            
            var origRow = originalData[i + 1];
            var origCertNumber = origRow ? origRow[headers.indexOf('证件编号')] : '';
            
            if ((!certNumber || String(certNumber).trim() === '') && certType && entryDate) {
                // 情况1：证件编号为空，生成新编号
                var idNumber = row['公民身份号码'] || row['身份证号码'];
                var workDate = row['工作日期'] || entryDate;
                var generated = generateCertificateNumber(certType, workDate, existingNumbers, idNumber);
                if (generated) {
                    row['证件编号'] = generated;
                    
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '证件编号', 'yellow');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['证件编号'] = 'yellow';
                    }
                    count++;
                }
            } else if (certNumber && String(certNumber).trim() !== '' && certType) {
                // 情况2：证件编号不为空，检查是否需要规范化
                var idNumber = row['公民身份号码'] || row['身份证号码'];
                var workDate = row['工作日期'] || entryDate;
                var normalized = normalizeCertNumber(certNumber, certType, idNumber, workDate);
                
                if (normalized) {
                    row['证件编号'] = normalized;
                    
                    debugLog('第' + (i + 2) + '行：证件编号规范化 "' + certNumber + '" -> "' + normalized + '"');
                    
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '证件编号', 'yellow');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['证件编号'] = 'yellow';
                    }
                    count++;
                } else if (origCertNumber && String(origCertNumber).trim() !== '' && 
                           String(certNumber).trim() !== String(origCertNumber).trim()) {
                    // 标记已修改的单元格
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, '证件编号', 'orange');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i]['证件编号'] = 'orange';
                    }
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['证件编号生成'] = {
            name: '证件编号生成',
            description: '根据证件类型和入伍日期生成证件编号',
            icon: '<i class="fa fa-barcode"></i>',
            func: generateCertNumber
        };
    }
})();

