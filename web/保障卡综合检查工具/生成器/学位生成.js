(function() {
    /**
     * 文化程度到学位的映射表
     * 符合中国教育体系标准
     */
    var DEGREE_MAP = {
        '文盲或半文盲': '无学位',
        '小学': '无学位',
        '初中': '无学位',
        '高中': '无学位',
        '技工学校': '无学位',
        '中等专业学校或中等技术学校': '无学位',
        '中专': '无学位',
        '职高': '无学位',
        '大学专科和专科学校': '无学位',
        '大学专科': '无学位',
        '大专': '无学位',
        '专科': '无学位',
        '大学本科（简称大学）': '学士',
        '大学本科': '学士',
        '本科': '学士',
        '研究生': '硕士',
        '硕士研究生': '硕士',
        '博士研究生': '博士',
        '博士': '博士'
    };
    
    /**
     * 根据文化程度匹配学位
     * 支持模糊匹配
     */
    function matchDegree(education) {
        if (!education) return '无学位';
        
        var eduStr = String(education).trim();
        
        // 精确匹配
        if (DEGREE_MAP[eduStr]) {
            return DEGREE_MAP[eduStr];
        }
        
        // 模糊匹配（先判专科/大专，再判本科/大学：否则"大学专科"会被"大学"抢先命中为学士，与学位检查规则矛盾）
        if (eduStr.indexOf('博士') !== -1) return '博士';
        if (eduStr.indexOf('硕士') !== -1) return '硕士';
        if (eduStr.indexOf('专科') !== -1 || eduStr.indexOf('大专') !== -1) return '无学位';
        if (eduStr.indexOf('本科') !== -1 || eduStr.indexOf('大学') !== -1) return '学士';
        if (eduStr.indexOf('研究生') !== -1) return '硕士'; // 默认研究生为硕士
        
        // 默认返回无学位
        return '无学位';
    }
    
    function generateDegree(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        // 使用通用工具函数查找列名（容错处理空格）
        var degreeCol = window.GeneratorUtils.findColumn(headers, ['学位']);
        var educationCol = window.GeneratorUtils.findColumn(headers, ['文化程度', '学历']);
        
        debugLog('学位生成器 - 列匹配结果: 学位="' + degreeCol + '", 文化程度="' + educationCol + '"');
        
        // 如果找不到必要的列，返回空结果
        if (!degreeCol) {
            debugLog('[WARN] 学位生成器: 未找到"学位"列');
            return {count: 0, colors: {}};
        }
        
        if (!educationCol) {
            debugLog('[WARN] 学位生成器: 未找到"文化程度"列，无法生成学位');
            return {count: 0, colors: {}};
        }
        
        // 获取原始表头中的索引（用于从originalData读取）
        var degreeIndex = -1;
        for (var j = 0; j < headers.length; j++) {
            if (window.GeneratorUtils.cleanString(headers[j]) === window.GeneratorUtils.cleanString(degreeCol)) {
                degreeIndex = j;
                break;
            }
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var degree = row[degreeCol];
            var education = row[educationCol];
            
            var origRow = originalData[i + 1];
            var origDegree = origRow && degreeIndex !== -1 ? origRow[degreeIndex] : '';
            
            // 如果文化程度有值，检查学位是否需要生成或修正
            if (education && String(education).trim() !== '') {
                var matchedDegree = matchDegree(education);
                var currentDegree = degree ? String(degree).trim() : '';
                
                // 情况1：学位为空，直接生成
                if (!currentDegree || currentDegree === '') {
                    row[degreeCol] = matchedDegree;
                    
                    debugLog('第' + (i + 1) + '行 [新增]: 文化程度="' + education + '" → 学位="' + matchedDegree + '"');
                    
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, degreeCol, 'yellow');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i][degreeCol] = 'yellow';
                    }
                    count++;
                }
                // 情况2：学位与文化程度不匹配，自动修正
                else if (currentDegree !== matchedDegree) {
                    debugLog('第' + (i + 1) + '行 [不匹配]: 文化程度="' + education + '", 当前学位="' + currentDegree + '", 应为="' + matchedDegree + '"');
                    
                    row[degreeCol] = matchedDegree;
                    
                    debugLog('第' + (i + 1) + '行 [修正]: 学位 "' + currentDegree + '" → "' + matchedDegree + '"');
                    
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, degreeCol, 'orange');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i][degreeCol] = 'orange';
                    }
                    count++;
                }
                // 情况3：学位与文化程度匹配，不需要修改
                else {
                    // 如果原始值存在且被修改过（但匹配正确），也标记为橙色
                    if (origDegree && String(origDegree).trim() !== '' && currentDegree !== String(origDegree).trim()) {
                        if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                            window.DataCheckUtils.markCellColor(colors, i, degreeCol, 'orange');
                        } else {
                            if (!colors[i]) colors[i] = {};
                            colors[i][degreeCol] = 'orange';
                        }
                    }
                }
            }
        }
        
        debugLog('学位生成完成，共生成/修正: ' + count + ' 个字段');
        
        return {count: count, colors: colors};
    }
    
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['学位生成'] = {
        name: '学位生成',
        description: '根据文化程度生成学位',
        icon: '<i class="fa fa-graduation-cap"></i>',
        func: generateDegree
        };
    }
})();

