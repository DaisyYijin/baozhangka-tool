/**
 * 身份证日期生成器
 * 功能：根据出生日期自动生成合理的身份证签发日期和有效期限
 * 
 * 生成规则：
 * - 签发日期：16周岁生日前后1年内随机生成
 * - 有效期限：
 *   - 16-25岁：20年有效期
 *   - 26岁及以上：30年有效期
 * - 自动检查并调整过期证件，确保有效期在当前日期之后
 * 
 * 日期格式：8位数字（YYYYMMDD）
 */
(function() {
    /**
     * 将Date对象格式化为8位数字字符串
     * @param {Date} date - Date对象
     * @returns {string} 8位数字格式的日期字符串（YYYYMMDD）
     */
    function formatDateYYYYMMDD(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1);
        if (month.length === 1) month = '0' + month;
        var day = String(date.getDate());
        if (day.length === 1) day = '0' + day;
        return year + month + day;
    }
    
    /**
     * 根据出生日期计算身份证签发日期和有效期限
     * @param {string} birthDateStr - 出生日期字符串（8位数字格式：YYYYMMDD）
     * @param {Date} today - 当前日期
     * @returns {Object|null} {start: string, end: string} 签发日期和有效期限，计算失败返回null
     */
    function calculateIdDates(birthDateStr, today) {
        try {
            var birthStr = String(birthDateStr).replace(/\D/g, '');
            if (birthStr.length !== 8) return null;
            
            var year = parseInt(birthStr.substring(0, 4));
            var month = parseInt(birthStr.substring(4, 6)) - 1;
            var day = parseInt(birthStr.substring(6, 8));
            var birthDate = new Date(year, month, day);
            
            var age = today.getFullYear() - birthDate.getFullYear();
            if (today.getMonth() < birthDate.getMonth() || 
                (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            var sixteenBday = new Date(birthDate);
            sixteenBday.setFullYear(birthDate.getFullYear() + 16);
            
            var startDate = new Date(sixteenBday);
            var randomDays = Math.floor(Math.random() * 730) - 365;
            startDate.setDate(startDate.getDate() + randomDays);
            
            // 规避2月29日：非闰年加整年会溢出到3月1日，破坏起止日期的整年差值
            if (startDate.getMonth() === 1 && startDate.getDate() === 29) {
                startDate.setDate(28);
            }
            
            var validityYears = age < 26 ? 20 : 30;
            var endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + validityYears);
            
            // 若证件已过期：以同一签发日为基准整体顺延整数个有效期，
            // 保证起止差值仍为合法的整年（检查规则要求YYYYMMDD整数差恰为20/30年）
            if (endDate < today) {
                var expiredYears = (today.getTime() - endDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                var cyclesToShift = Math.max(1, Math.ceil(expiredYears / validityYears));
                startDate.setFullYear(startDate.getFullYear() + cyclesToShift * validityYears);
                endDate = new Date(startDate);
                endDate.setFullYear(endDate.getFullYear() + validityYears);
                
                // 跨年边界兜底：仍过期则再顺延一个周期
                if (endDate < today) {
                    startDate.setFullYear(startDate.getFullYear() + validityYears);
                    endDate = new Date(startDate);
                    endDate.setFullYear(endDate.getFullYear() + validityYears);
                }
            }
            
            return {
                start: formatDateYYYYMMDD(startDate),
                end: formatDateYYYYMMDD(endDate)
            };
        } catch (e) {
            return null;
        }
    }
    
    /**
     * 身份证日期生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据（用于对比变更）
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息 {count: number, colors: object}
     */
    function generateIdDates(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        var today = new Date();
        
        debugLog('身份证日期生成器开始执行，数据行数: ' + rows.length);
        debugLog('原始表头:', headers);
        
        // 显示表头的详细信息（帮助诊断空格问题）
        debugLog('表头详细信息 (前20列):');
        for (var i = 0; i < Math.min(headers.length, 20); i++) {
            var h = headers[i];
            var cleaned = window.GeneratorUtils.cleanString(h);
            var original = String(h || '');
            
            // 可视化前后空格
            var visualized = original
                .replace(/^(\s+)/, function(m) { return '[前' + m.length + '空格]'; })
                .replace(/(\s+)$/, function(m) { return '[后' + m.length + '空格]'; })
                .replace(/　/g, '[全角空格]');
            
            var info = '  [' + i + '] 原始:"' + h + '"';
            if (original !== visualized) {
                info += ' → 可视化:"' + visualized + '"';
            }
            info += ' → 清理后:"' + cleaned + '"';
            
            debugLog(info);
        }
        
        // 使用GeneratorUtils的findColumn函数查找列名
        var birthDateCol = window.GeneratorUtils.findColumn(headers, ['出生日期', '出生年月']);
        var startDateCol = window.GeneratorUtils.findColumn(headers, ['身份证件起始日期', '身份证起始日期', '证件起始日期']);
        var endDateCol = window.GeneratorUtils.findColumn(headers, ['身份证件终止日期', '身份证终止日期', '证件终止日期']);
        
        debugLog('列匹配结果: 出生日期="' + birthDateCol + '", 起始日期="' + startDateCol + '", 终止日期="' + endDateCol + '"');
        
        if (!birthDateCol) {
            console.error('[ERROR] 未找到"出生日期"列！');
            debugLog('[TIP] 提示: 请检查Excel表头是否包含"出生日期"或"出生年月"列');
            debugLog('[INFO] 当前表头列表:', headers.join(', '));
            return {count: 0, colors: {}};
        }
        
        if (!startDateCol) {
            console.warn('[WARN] 未找到"身份证件起始日期"列，将跳过起始日期生成');
        }
        
        if (!endDateCol) {
            console.warn('[WARN] 未找到"身份证件终止日期"列，将跳过终止日期生成');
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var birthDateStr = row[birthDateCol];
            var startDate = startDateCol ? row[startDateCol] : '';
            var endDate = endDateCol ? row[endDateCol] : '';
            
            var origRow = originalData[i + 1];
            var origStartDate = origRow && startDateCol ? origRow[headers.indexOf(startDateCol)] : '';
            var origEndDate = origRow && endDateCol ? origRow[headers.indexOf(endDateCol)] : '';
            
            // 如果起始日期或终止日期为空，则生成
            if ((!startDate || String(startDate).trim() === '') || 
                (!endDate || String(endDate).trim() === '')) {
                
                if (birthDateStr && String(birthDateStr).trim() !== '') {
                    var dates = calculateIdDates(birthDateStr, today);
                    if (dates) {
                        debugLog('行' + (i+2) + ': 生成身份证日期 ' + dates.start + ' ~ ' + dates.end);
                        
                        // 如果找到了起始日期列，才设置起始日期
                        if (startDateCol) {
                            row[startDateCol] = dates.start;
                            
                            // 使用统一的颜色标记函数
                            if (!origStartDate || String(origStartDate).trim() === '') {
                                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                                    window.DataCheckUtils.markCellColor(colors, i, startDateCol, 'yellow');
                                } else {
                                    if (!colors[i]) colors[i] = {};
                                    colors[i][startDateCol] = 'yellow';
                                }
                            }
                        }
                        
                        // 如果找到了终止日期列，才设置终止日期
                        if (endDateCol) {
                            row[endDateCol] = dates.end;
                            
                            if (!origEndDate || String(origEndDate).trim() === '') {
                                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                                    window.DataCheckUtils.markCellColor(colors, i, endDateCol, 'yellow');
                                } else {
                                    if (!colors[i]) colors[i] = {};
                                    colors[i][endDateCol] = 'yellow';
                                }
                            }
                        }
                        
                        count++;
                    }
                }
            }
        }
        
        debugLog('身份证日期生成器完成，共生成: ' + count + ' 条');
        return {count: count, colors: colors};
    }
    
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['身份证日期生成'] = {
            name: '身份证日期生成',
            description: '根据出生日期生成身份证起始和终止日期',
            icon: '<i class="fa fa-calendar"></i>',
            func: generateIdDates
        };
        debugLog('[OK] 身份证日期生成器已注册');
    } else {
        console.error('[ERROR] DATA_GENERATORS 未定义，身份证日期生成器注册失败');
    }
})();

