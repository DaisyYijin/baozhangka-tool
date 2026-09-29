(function() {
    /**
     * ============================================================
     * 体型数据生成工具
     * ============================================================
     * 
     * 【绝对范围值】（所有人员必须在此范围内）
     * - 身高：150-210cm
     * - 体重：50-120kg
     * - 脚长：23-28cm
     * - 胸围：70-120cm
     * - 腰围：55-100cm
     * - 臀围：80-120cm
     * - 头围：52-62cm
     * - 趾围（跖围）：20-28cm
     * 
     * 【精度要求】
     * - 身高、体重、胸围、腰围、臀围、趾围：生成精确到一位小数的值
     * - 头围：生成整数值
     * - 脚长：生成0.5的倍数
     * 
     * 【男性生成范围】（集中在合理区间）
     * - 身高：168-185cm
     * - 体重：根据身高自动计算，保持合理比例
     * - 胸围：根据体重和身高关联计算
     * - 腰围：根据胸围关联计算（约为胸围85%）
     * - 臀围：根据胸围关联计算（略大于胸围）
     * - 头围：根据身高关联计算，范围55-62cm
     * - 脚长：根据身高关联计算（约为身高/7），范围24-28cm
     * - 趾围：根据脚长关联计算，范围22-28cm
     * 
     * 【女性生成范围】（集中在合理区间）
     * - 身高：158-172cm
     * - 体重：根据身高自动计算，保持合理比例
     * - 胸围：根据体重和身高关联计算
     * - 腰围：根据胸围关联计算（约为胸围75%）
     * - 臀围：根据胸围关联计算（大于胸围）
     * - 头围：根据身高关联计算，范围52-58cm
     * - 脚长：根据身高关联计算（约为身高/7.2），范围23-26cm
     * - 趾围：根据脚长关联计算，范围20-25cm
     * 
     * 【生成特点】
     * - 各项数据相互关联，符合实际人体比例
     * - 所有生成值自动限制在绝对范围内
     * - 生成数据100%通过检查规则
     * 
     * 【更新历史】
     * - v2.5.4: 优化生成算法，各项数据关联计算
     * - v2.5.2: 调整为实际军人体型标准
     * 
     * ============================================================
     */
    
    var BODY_FIELDS = ['身高', '体重', '胸围', '腰围', '臀围', '头围', '脚长', '跖围'];
    
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
    
    function generateMeasurements(gender, age) {
        var measurements = {};
        var genderStr = String(gender).trim();
        var isMale = genderStr.indexOf('男') !== -1 && genderStr !== '女';
        
        if (isMale) {
            // 男性军人标准：生成符合实际情况的体型数据
            // 身高：集中在168-185cm之间，符合军人体型
            var height = (Math.random() * 17 + 168).toFixed(1);  // 168.0-185.0cm
            measurements['身高'] = height;
            
            // 根据身高计算合理体重（BMI 20-25之间）
            var heightM = parseFloat(height) / 100;
            var targetBMI = Math.random() * 5 + 20;  // BMI 20-25
            var weight = (targetBMI * heightM * heightM).toFixed(1);
            measurements['体重'] = weight;
            
            // 胸围：男性一般在85-105cm，基于体重合理生成
            var baseChest = 80 + (parseFloat(weight) - 55) * 0.4;  // 根据体重线性映射
            measurements['胸围'] = Math.min(110, Math.max(80, baseChest + Math.random() * 5)).toFixed(1);
            
            // 腰围：比胸围小，男性一般在75-90cm
            var chestSize = parseFloat(measurements['胸围']);
            var waistRatio = 0.82 + Math.random() * 0.08;  // 腰围是胸围的82%-90%
            measurements['腰围'] = Math.min(95, Math.max(70, chestSize * waistRatio)).toFixed(1);
            
            // 臀围：略大于胸围，男性一般在90-105cm
            var hipRatio = 0.95 + Math.random() * 0.10;  // 臀围是胸围的95%-105%
            measurements['臀围'] = Math.min(110, Math.max(85, chestSize * hipRatio)).toFixed(1);
            
            // 头围：男性一般在55-62cm，与身高相关
            var headBase = 55 + (parseFloat(height) - 160) * 0.15;  // 根据身高线性映射
            measurements['头围'] = Math.min(62, Math.max(55, Math.round(headBase)));
            
            // 脚长：男性一般在24-28cm，与身高相关（身高/7左右）
            var footBase = parseFloat(height) / 7;
            measurements['脚长'] = Math.min(28, Math.max(24, (Math.round(footBase * 2) / 2))).toFixed(1);
            
            // 跖围：男性一般在22-28cm，与脚长相关
            var footLength = parseFloat(measurements['脚长']);
            var toeBase = footLength * 0.95;
            measurements['跖围'] = Math.min(28, Math.max(22, toeBase)).toFixed(1);
        } else {
            // 女性军人标准：生成符合实际情况的体型数据
            // 身高：集中在158-172cm之间，符合女性军人体型
            var height = (Math.random() * 14 + 158).toFixed(1);  // 158.0-172.0cm
            measurements['身高'] = height;
            
            // 根据身高计算合理体重（BMI 18-23之间）
            var heightM = parseFloat(height) / 100;
            var targetBMI = Math.random() * 5 + 18;  // BMI 18-23
            var weight = (targetBMI * heightM * heightM).toFixed(1);
            measurements['体重'] = weight;
            
            // 胸围：女性一般在80-98cm，基于体重合理生成
            var baseChest = 75 + (parseFloat(weight) - 50) * 0.8;  // 根据体重线性映射
            measurements['胸围'] = Math.min(105, Math.max(75, baseChest + Math.random() * 5)).toFixed(1);
            
            // 腰围：女性腰围较细，一般在60-75cm
            var chestSize = parseFloat(measurements['胸围']);
            var waistRatio = 0.70 + Math.random() * 0.08;  // 腰围是胸围的70%-78%
            measurements['腰围'] = Math.min(85, Math.max(55, chestSize * waistRatio)).toFixed(1);
            
            // 臀围：女性臀围一般大于胸围，在85-100cm
            var hipRatio = 1.00 + Math.random() * 0.12;  // 臀围是胸围的100%-112%
            measurements['臀围'] = Math.min(110, Math.max(80, chestSize * hipRatio)).toFixed(1);
            
            // 头围：女性头围较小，一般在52-58cm，与身高相关
            var headBase = 52 + (parseFloat(height) - 150) * 0.15;  // 根据身高线性映射
            measurements['头围'] = Math.min(58, Math.max(52, Math.round(headBase)));
            
            // 脚长：女性脚长较小，一般在23-26cm，与身高相关（身高/7.2左右）
            var footBase = parseFloat(height) / 7.2;
            measurements['脚长'] = Math.min(26, Math.max(23, (Math.round(footBase * 2) / 2))).toFixed(1);
            
            // 跖围：女性一般在20-25cm，与脚长相关
            var footLength = parseFloat(measurements['脚长']);
            var toeBase = footLength * 0.92;
            measurements['跖围'] = Math.min(25, Math.max(20, toeBase)).toFixed(1);
        }
        
        // 确保所有值都在绝对范围内
        measurements['身高'] = Math.min(210, Math.max(150, parseFloat(measurements['身高']))).toFixed(1);
        measurements['体重'] = Math.min(120, Math.max(50, parseFloat(measurements['体重']))).toFixed(1);
        measurements['胸围'] = Math.min(120, Math.max(70, parseFloat(measurements['胸围']))).toFixed(1);
        measurements['腰围'] = Math.min(100, Math.max(55, parseFloat(measurements['腰围']))).toFixed(1);
        measurements['臀围'] = Math.min(120, Math.max(80, parseFloat(measurements['臀围']))).toFixed(1);
        measurements['头围'] = Math.min(62, Math.max(52, parseInt(measurements['头围'])));
        measurements['脚长'] = Math.min(28, Math.max(23, parseFloat(measurements['脚长']))).toFixed(1);
        measurements['跖围'] = Math.min(28, Math.max(20, parseFloat(measurements['跖围']))).toFixed(1);
        
        return measurements;
    }
    
    // 定义军人体型标准范围（与检查规则保持一致）
    var absoluteRanges = {
        '身高': [150, 210],    // 身高：150-210cm（一位小数）
        '体重': [50, 120],     // 体重：50-120kg（一位小数）
        '胸围': [70, 120],     // 胸围：70-120cm（一位小数）
        '腰围': [55, 100],     // 腰围：55-100cm（一位小数）
        '臀围': [80, 120],     // 臀围：80-120cm（一位小数）
        '头围': [52, 62],      // 头围：52-62cm（整数）
        '脚长': [23, 28],      // 脚长：23-28cm（0.5倍数）
        '跖围': [20, 28]       // 跖围（趾围）：20-28cm（一位小数）
    };
    
    var genderRanges = {
        '男': {
            '身高': [160, 195],    // 男性身高标准（一位小数）
            '体重': [55, 100],     // 男性体重标准（一位小数）
            '胸围': [80, 110],     // 男性胸围标准（一位小数）
            '腰围': [70, 95],      // 男性腰围标准（一位小数）
            '臀围': [85, 110],     // 男性臀围标准（一位小数）
            '头围': [55, 62],      // 男性头围标准（整数）
            '脚长': [24, 28],      // 男性脚长标准（0.5倍数）
            '跖围': [22, 28]       // 男性跖围标准（一位小数）
        },
        '女': {
            '身高': [150, 180],    // 女性身高标准（一位小数）
            '体重': [50, 75],      // 女性体重标准（一位小数）
            '胸围': [75, 105],     // 女性胸围标准（一位小数）
            '腰围': [55, 85],      // 女性腰围标准（一位小数）
            '臀围': [80, 110],     // 女性臀围标准（一位小数）
            '头围': [52, 58],      // 女性头围标准（整数）
            '脚长': [23, 26],      // 女性脚长标准（0.5倍数）
            '跖围': [20, 25]       // 女性跖围标准（一位小数）
        }
    };
    
    /**
     * 检查数值是否在合理范围内
     */
    function isValueUnreasonable(field, value, gender) {
        if (!value || isNaN(value)) return false;
        
        var numValue = parseFloat(value);
        
        // 检查绝对范围
        if (absoluteRanges[field]) {
            var absMin = absoluteRanges[field][0];
            var absMax = absoluteRanges[field][1];
            if (numValue < absMin || numValue > absMax) {
                return true;
            }
        }
        
        // 检查性别范围（扩展20%作为特殊体型允许范围）
        if (gender && genderRanges[gender] && genderRanges[gender][field]) {
            var minVal = genderRanges[gender][field][0];
            var maxVal = genderRanges[gender][field][1];
            var rangeSize = maxVal - minVal;
            var extendedMin = minVal - rangeSize * 0.2;
            var extendedMax = maxVal + rangeSize * 0.2;
            
            if (numValue < extendedMin || numValue > extendedMax) {
                return true;
            }
        }
        
        return false;
    }
    
    function generateBodyMeasurements(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        debugLog('体型数据生成开始，处理行数：' + rows.length);
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var gender = row['性别'];
            var birthDateStr = row['出生日期'];
            
            var origRow = originalData[i + 1];
            
            // 检查是否需要生成或修正数据
            var needsGeneration = false;
            var hasEmpty = false;
            var hasUnreasonable = false;
            var emptyFields = [];
            var unreasonableFields = [];
            
            var genderStr = gender ? String(gender).trim() : '';
            
            // 检查空字段
            for (var j = 0; j < BODY_FIELDS.length; j++) {
                var field = BODY_FIELDS[j];
                if (!row[field] || String(row[field]).trim() === '') {
                    hasEmpty = true;
                    emptyFields.push(field);
                }
            }
            
            // 检查不合理的数值
            if (gender && String(gender).trim() !== '') {
                for (var j = 0; j < BODY_FIELDS.length; j++) {
                    var field = BODY_FIELDS[j];
                    var value = row[field];
                    
                    if (value && String(value).trim() !== '') {
                        if (isValueUnreasonable(field, value, genderStr)) {
                            hasUnreasonable = true;
                            unreasonableFields.push(field);
                        }
                    }
                }
            }
            
            needsGeneration = hasEmpty || hasUnreasonable;
            
            // 如果需要生成数据且性别存在
            if (needsGeneration && gender && String(gender).trim() !== '') {
                var age = birthDateStr ? calculateAgeFromBirthDate(birthDateStr) : 25;
                var measurements = generateMeasurements(gender, age);
                
                if (hasEmpty || hasUnreasonable) {
                    debugLog('第' + (i + 1) + '行：性别=' + gender + 
                               (hasEmpty ? '，空字段=' + emptyFields.join(',') : '') +
                               (hasUnreasonable ? '，不合理字段=' + unreasonableFields.join(',') : ''));
                }
                
                for (var field in measurements) {
                    var origValue = origRow ? origRow[headers.indexOf(field)] : '';
                    var currentValue = row[field];
                    var isEmpty = !currentValue || String(currentValue).trim() === '';
                    var isUnreasonable = !isEmpty && isValueUnreasonable(field, currentValue, genderStr);
                    
                    if (isEmpty) {
                        // 空值：生成新值，标记为黄色
                        row[field] = measurements[field];
                        
                        if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                            window.DataCheckUtils.markCellColor(colors, i, field, 'yellow');
                        } else {
                            if (!colors[i]) colors[i] = {};
                            colors[i][field] = 'yellow';
                        }
                        count++;
                    } else if (isUnreasonable) {
                        // 不合理的值：修正为新值，标记为橙色
                        row[field] = measurements[field];
                        
                        if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                            window.DataCheckUtils.markCellColor(colors, i, field, 'orange');
                        } else {
                            if (!colors[i]) colors[i] = {};
                            colors[i][field] = 'orange';
                        }
                        count++;
                    } else if (origValue && String(origValue).trim() !== '' && 
                               String(currentValue).trim() !== String(origValue).trim()) {
                        // 值已经变化：标记为橙色（但不计数，因为不是本次生成的）
                        if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                            window.DataCheckUtils.markCellColor(colors, i, field, 'orange');
                        } else {
                            if (!colors[i]) colors[i] = {};
                            colors[i][field] = 'orange';
                        }
                    }
                }
            }
        }
        
        debugLog('体型数据生成完成，共生成/修正：' + count + '个字段');
        
        return {count: count, colors: colors};
    }
    
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['体型数据生成'] = {
            name: '体型数据生成',
            description: '根据性别和年龄生成体型数据（需要性别字段）',
            icon: '<i class="fa fa-user"></i>',
            func: generateBodyMeasurements
        };
    }
})();

