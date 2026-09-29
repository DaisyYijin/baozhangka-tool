(function() {
    'use strict';
    
    /**
     * ============================================================
     * 体型数据检查规则
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
     * - 身高、体重、胸围、腰围、臀围、趾围：必须精确到一位小数（如：165.5、70.8、88.0）
     * - 头围：必须为整数（如：56、57、58）
     * - 脚长：必须为0.5的倍数（如：24.5、25.0、25.5）
     * 
     * 【男性标准范围】（合理值，在绝对范围内）
     * - 身高：160-195cm
     * - 体重：55-100kg
     * - 胸围：80-110cm
     * - 腰围：70-95cm
     * - 臀围：85-110cm
     * - 头围：55-62cm
     * - 脚长：24-28cm
     * - 趾围：22-28cm
     * 
     * 【女性标准范围】（合理值，在绝对范围内）
     * - 身高：150-180cm
     * - 体重：50-75kg
     * - 胸围：75-105cm
     * - 腰围：55-85cm
     * - 臀围：80-110cm
     * - 头围：52-58cm
     * - 脚长：23-26cm
     * - 趾围：20-25cm
     * 
     * 【更新历史】
     * - v2.5.4: 全面调整范围值和精度要求，区分男女检查标准
     * - v2.5.2: 调整为实际军人体型标准
     * 
     * ============================================================
     */
    
    function checkTixing(data) {
        var errors = [];
        var ruleName = "体型数据检查";
        
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        // 体型标准范围（绝对安全范围）
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
        
        // 军人性别体型标准范围（合理范围，在绝对范围内）
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
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var gender = String(row['性别'] || '').trim();
            var name = getName(row);
            var idNumber = getIdNumber(row);
            var personType = row['人员类别'];
            
            var fields = ['身高', '体重', '胸围', '腰围', '臀围', '头围', '脚长', '跖围'];
            
            for (var f = 0; f < fields.length; f++) {
                var field = fields[f];
                var value = row[field];
                if (value === null || value === undefined || String(value).trim() === '') {
                    errors.push({
                        "行号": idx + 2,
                        "身份证号码": idNumber,
                        "姓名": name,
                        "人员类别": personType,
                        "当前值": field + ': 空',
                        '错误详情': field + '不能为空',
                        '规则名称': ruleName
                    });
                }
            }
            
            var values = {};
            for (var f2 = 0; f2 < fields.length; f2++) {
                var field2 = fields[f2];
                var rawValue = row[field2];
                
                try {
                    if (typeof rawValue === 'string') {
                        var cleaned = rawValue.replace(/[^\d\.\-]/g, '');
                        if (cleaned === '') {
                            values[field2] = null;
                        } else {
                            values[field2] = parseFloat(cleaned);
                        }
                    } else {
                        values[field2] = parseFloat(rawValue);
                    }
                } catch (e) {
                    values[field2] = null;
                }
                
                if (values[field2] === null && rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '') {
                    errors.push({
                        "行号": idx + 2,
                        "身份证号码": idNumber,
                        "姓名": name,
                        "人员类别": personType,
                        "当前值": field2 + ': ' + rawValue,
                        '错误详情': field2 + '格式错误 (应为数字)',
                        '规则名称': ruleName
                    });
                }
                
                // 格式验证：检查数据格式是否符合规范
                if (values[field2] !== null && !isNaN(values[field2]) && rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '') {
                    var value = values[field2];
                    var valueStr = String(rawValue).trim();
                    
                    // 头围必须是整数
                    if (field2 === '头围') {
                        // 使用 % 1 检查是否有小数部分
                        if (Math.abs(value % 1) > 0.001) {
                            errors.push({
                                '行号': idx + 2,
                                '身份证号码': idNumber,
                                '姓名': name,
                                '人员类别': personType,
                                '当前值': field2 + ': ' + valueStr,
                                '错误详情': '头围必须为整数（如：56、57、58）',
                                '规则名称': ruleName
                            });
                        }
                    }
                    
                    // 脚长必须是0.5的倍数
                    if (field2 === '脚长') {
                        // 将数值乘以2，检查是否为整数
                        var doubled = value * 2;
                        if (Math.abs(doubled - Math.round(doubled)) > 0.001) {
                            errors.push({
                                '行号': idx + 2,
                                '身份证号码': idNumber,
                                '姓名': name,
                                '人员类别': personType,
                                '当前值': field2 + ': ' + valueStr,
                                '错误详情': '脚长必须为0.5的倍数（如：24.5、25.0、25.5）',
                                '规则名称': ruleName
                            });
                        }
                    }
                    
                    // 身高、体重、胸围、腰围、臀围、跖围必须精确到一位小数
                    if (field2 === '身高' || field2 === '体重' || field2 === '胸围' || 
                        field2 === '腰围' || field2 === '臀围' || field2 === '跖围') {
                        // 将数值乘以10，检查是否为整数（即最多一位小数）
                        var multiplied = value * 10;
                        if (Math.abs(multiplied - Math.round(multiplied)) > 0.001) {
                            errors.push({
                                '行号': idx + 2,
                                '身份证号码': idNumber,
                                '姓名': name,
                                '人员类别': personType,
                                '当前值': field2 + ': ' + valueStr,
                                '错误详情': field2 + '必须精确到一位小数（如：165.5、70.8、88.0）',
                                '规则名称': ruleName
                            });
                        }
                    }
                }
            }
            
            for (var fieldKey in values) {
                if (!values.hasOwnProperty(fieldKey)) continue;
                
                var value3 = values[fieldKey];
                if (value3 === null || isNaN(value3)) {
                    continue;
                }
                
                if (fieldKey in absoluteRanges) {
                    var minVal = absoluteRanges[fieldKey][0];
                    var maxVal = absoluteRanges[fieldKey][1];
                    if (value3 < minVal || value3 > maxVal) {
                        errors.push({
                            '行号': idx + 2,
                            '身份证号码': idNumber,
                            '姓名': name,
                            '人员类别': personType,
                            '当前值': fieldKey + ': ' + value3,
                            '错误详情': fieldKey + '异常 (安全范围: ' + minVal + '-' + maxVal + ')',
                            '规则名称': ruleName
                        });
                    }
                }
            }
            
            // 性别范围检查（包含身高体重）
            if (gender in genderRanges) {
                var genderFields = ['身高', '体重', '胸围', '腰围', '臀围', '头围', '脚长', '跖围'];
                for (var gf = 0; gf < genderFields.length; gf++) {
                    var gfield = genderFields[gf];
                    if (gfield in values && values[gfield] !== null && !isNaN(values[gfield])) {
                        var minVal4 = genderRanges[gender][gfield][0];
                        var maxVal4 = genderRanges[gender][gfield][1];
                        
                        if (!(minVal4 <= values[gfield] && values[gfield] <= maxVal4)) {
                            var rangeSize = maxVal4 - minVal4;
                            var extendedMin = minVal4 - rangeSize * 0.2;
                            var extendedMax = maxVal4 + rangeSize * 0.2;
                            
                            if (!(extendedMin <= values[gfield] && values[gfield] <= extendedMax)) {
                                errors.push({
                                    '行号': idx + 2,
                                    '身份证号码': idNumber,
                                    '姓名': name,
                                    '人员类别': personType,
                                    '当前值': gfield + ': ' + values[gfield],
                                    '错误详情': gfield + '异常 (' + gender + '性正常范围: ' + minVal4 + '-' + maxVal4 + ', 特殊体型允许范围: ' + extendedMin.toFixed(1) + '-' + extendedMax.toFixed(1) + ')',
                                    '规则名称': ruleName
                                });
                            }
                        }
                    }
                }
            }
            
        }
        
        return errors;
    }
    
    window.checkTixing = checkTixing;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('体型数据检查', checkTixing, '体型健康', '检查体型数据的合理性');
    }
})();
