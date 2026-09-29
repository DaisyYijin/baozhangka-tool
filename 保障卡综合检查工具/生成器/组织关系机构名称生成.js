/**
 * 组织关系机构名称生成器
 * 功能：根据政治面貌和行政单位自动生成或修正组织关系机构名称
 * 
 * 生成规则：
 * - 群众：不生成组织关系机构名称（留空）
 * - 共青团员：中共陆军 + 行政单位 + 团支部
 * - 中共党员/预备党员：中共陆军 + 行政单位 + 党支部
 * 
 * 修正规则：
 * - 自动添加缺失的“中共陆军”前缀
 * - 根据政治面貌修正后缀（党支部/团支部）
 * - 处理各种不规范的格式
 */
(function() {
    /**
     * 判断字符串是否以指定后缀结尾
     * @param {string} str - 要检查的字符串
     * @param {string} suffix - 后缀字符串
     * @returns {boolean} 是否以该后缀结尾
     */
    function stringEndsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }
    
    /**
     * 生成组织关系机构名称
     * @param {string} adminUnit - 行政单位
     * @param {string} politicalStatus - 政治面貌
     * @returns {string} 生成的组织关系机构名称，群众返回空字符串
     */
    function generateOrgName(adminUnit, politicalStatus) {
        var politicalStr = String(politicalStatus || '').trim();
        
        // 政治面貌为"群众"时，不生成组织关系机构名称
        if (politicalStr === '群众') {
            return '';
        }
        
        var suffix = '';
        if (politicalStr === '共青团员') {
            suffix = '团支部';
        } else if (politicalStr === '中共党员' || politicalStr === '中共预备党员') {
            suffix = '党支部';
        } else {
            suffix = '党支部';
        }
        
        var unitPart = '';
        if (adminUnit && String(adminUnit).trim() !== '') {
            unitPart = String(adminUnit).trim();
            unitPart = unitPart.replace(/^(中共陆军|中共|中国共产党|陆军)\s*/g, '');
        }
        
        return '中共陆军' + unitPart + suffix;
    }
    
    /**
     * 修正组织关系机构名称
     * @param {string} orgName - 原始组织关系机构名称
     * @param {string} politicalStatus - 政治面貌
     * @returns {string|null} 修正后的名称，如果不需要修正则返回null
     */
    function fixOrgName(orgName, politicalStatus) {
        if (!orgName || String(orgName).trim() === '') {
            return null;
        }
        
        var fixed = String(orgName).trim();
        var politicalStr = String(politicalStatus || '').trim();
        var modified = false;
        
        // 政治面貌为"群众"时，应该清空组织关系机构名称
        if (politicalStr === '群众') {
            return '';
        }
        
        // 检查并修正前缀"中共陆军"
        if (!fixed.startsWith('中共陆军')) {
            if (fixed.startsWith('陆军')) {
                // 只有"陆军"，添加"中共"
                fixed = '中共' + fixed;
                modified = true;
            } else if (fixed.startsWith('中共')) {
                // 只有"中共"，检查后面是否紧跟"陆军"
                var afterZhonggong = fixed.substring(2).trim();
                if (!afterZhonggong.startsWith('陆军')) {
                    // 没有"陆军"，添加"陆军"
                    fixed = '中共陆军' + afterZhonggong;
                    modified = true;
                }
            } else if (fixed.startsWith('中国共产党')) {
                // "中国共产党"开头，替换为"中共陆军"
                var afterParty = fixed.substring(5).trim();
                if (!afterParty.startsWith('陆军')) {
                    fixed = '中共陆军' + afterParty;
                } else {
                    fixed = '中共' + afterParty;
                }
                modified = true;
            } else {
                // 都没有，添加"中共陆军"
                fixed = '中共陆军' + fixed;
                modified = true;
            }
        }
        
        // 确定正确的后缀
        var correctSuffix = '';
        if (politicalStr === '共青团员') {
            correctSuffix = '团支部';
        } else if (politicalStr === '中共党员' || politicalStr === '中共预备党员') {
            correctSuffix = '党支部';
        } else {
            correctSuffix = '党支部';
        }
        
        // 检查并修正后缀
        var hasCorrectSuffix = stringEndsWith(fixed, correctSuffix);
        
        if (!hasCorrectSuffix) {
            if (stringEndsWith(fixed, '党支部')) {
                fixed = fixed.substring(0, fixed.length - 3);
            } else if (stringEndsWith(fixed, '团支部')) {
                fixed = fixed.substring(0, fixed.length - 3);
            }
            
            fixed += correctSuffix;
            modified = true;
        }
        
        return modified ? fixed : null;
    }
    
    /**
     * 组织关系机构名称生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据（用于对比变更）
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息 {count: number, colors: object}
     */
    function generateOrganizationName(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        var adminUnitCol = null;
        var orgNameCol = '组织关系机构名称';
        var politicalCol = '政治面貌';
        
        var possibleAdminCols = ['行政单位名称', '单位名称', '单位', '部门名称', '机构名称'];
        
        for (var i = 0; i < possibleAdminCols.length; i++) {
            if (headers.indexOf(possibleAdminCols[i]) !== -1) {
                adminUnitCol = possibleAdminCols[i];
                break;
            }
        }
        
        // 使用Logger或console作为fallback
        if (window.Logger && typeof Logger.debug === 'function') {
            Logger.debug('找到的列: 行政单位=' + adminUnitCol + ', 政治面貌=' + politicalCol);
        } else {
            debugLog('找到的列: 行政单位=' + adminUnitCol + ', 政治面貌=' + politicalCol);
        }
        
        if (!adminUnitCol) {
            if (window.Logger && typeof Logger.warn === 'function') {
                Logger.warn('未找到行政单位名称列，无法生成组织关系机构名称');
            } else {
                console.warn('未找到行政单位名称列，无法生成组织关系机构名称');
            }
            return {count: 0, colors: {}};
        }
        
        if (headers.indexOf(politicalCol) === -1) {
            if (window.Logger && typeof Logger.warn === 'function') {
                Logger.warn('未找到政治面貌列，无法生成组织关系机构名称');
            } else {
                console.warn('未找到政治面貌列，无法生成组织关系机构名称');
            }
            return {count: 0, colors: {}};
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var orgName = row[orgNameCol];
            var adminUnit = row[adminUnitCol];
            var political = row[politicalCol];
            
            var origRow = originalData[i + 1];
            var origOrgName = origRow ? origRow[headers.indexOf(orgNameCol)] : '';
            
            if (!orgName || String(orgName).trim() === '') {
                // 空值情况：生成新值
                if (adminUnit && political) {
                    var generated = generateOrgName(adminUnit, political);
                    
                    // 如果生成结果不为空，或者政治面貌是"群众"（应该保持为空），都进行处理
                    if (generated || String(political).trim() === '群众') {
                        row[orgNameCol] = generated;
                        
                        // 只有实际生成了内容才标记颜色
                        if (generated) {
                            // 使用统一的颜色标记函数
                            if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                                window.DataCheckUtils.markCellColor(colors, i, orgNameCol, 'yellow');
                            } else {
                                if (!colors[i]) colors[i] = {};
                                colors[i][orgNameCol] = 'yellow';
                            }
                            count++;
                            if (window.Logger && typeof Logger.debug === 'function') {
                                Logger.debug('[生成] 新值 [行' + (i+2) + ']: ' + generated);
                            } else {
                                debugLog('[生成] 新值 [行' + (i+2) + ']: ' + generated);
                            }
                        }
                    }
                }
            }
            else {
                // 非空值情况：修正现有值
                if (political) {
                    var fixed = fixOrgName(orgName, political);
                    
                    // fixed 可能是修正后的值，也可能是 null（不需要修正），或者是 ''（群众应该清空）
                    if (fixed !== null) {
                        row[orgNameCol] = fixed;
                        
                        // 使用统一的颜色标记函数
                        if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                            window.DataCheckUtils.markCellColor(colors, i, orgNameCol, 'orange');
                        } else {
                            if (!colors[i]) colors[i] = {};
                            colors[i][orgNameCol] = 'orange';
                        }
                        count++;
                        
                        // 日志输出
                        var logMsg = fixed === '' ? 
                            '[清空] 政治面貌为群众 [行' + (i+2) + ']: ' + orgName + ' -> (空)' :
                            '[修正] 值 [行' + (i+2) + ']: ' + orgName + ' -> ' + fixed;
                        
                        if (window.Logger && typeof Logger.debug === 'function') {
                            Logger.debug(logMsg);
                        } else {
                            debugLog(logMsg);
                        }
                    }
                }
                
                // 检查原始值是否被修改（包括修改为空的情况）
                var currentVal = row[orgNameCol] ? String(row[orgNameCol]).trim() : '';
                var originalVal = origOrgName ? String(origOrgName).trim() : '';
                
                if (originalVal !== '' && currentVal !== originalVal) {
                    // 使用统一的颜色标记函数
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, orgNameCol, 'orange');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i][orgNameCol] = 'orange';
                    }
                }
            }
        }
        
        if (window.Logger && typeof Logger.info === 'function') {
            Logger.info('组织关系机构名称生成完成: 共处理 ' + count + ' 条数据');
        } else {
            debugLog('组织关系机构名称生成完成: 共处理 ' + count + ' 条数据');
        }
        
        return {count: count, colors: colors};
    }
    
    /**
     * 注册组织关系机构名称生成器到全局生成器列表
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['组织关系机构名称生成'] = {
            name: '组织关系机构名称生成',
            description: '根据行政单位和政治面貌生成组织名称（中共陆军+单位+党/团支部）',
            icon: '<i class="fa fa-building"></i>',
            func: generateOrganizationName
        };
    }
})();
