/**
 * 毕业院校生成器
 * 功能：根据籍贯和文化程度智能生成合理的毕业院校
 * 
 * 生成规则：
 * - 优先根据籍贯字段提取省份/城市信息
 * - 小学/中学：籍贯地+学校名
 * - 大专：省份+职业技术学院
 * - 本科：省份+本地大学
 * - 研究生：985/211重点大学（不限地域）
 */
(function() {
    'use strict';
    
    /**
     * 判断值是否为空
     */
    function isEmpty(value) {
        if (window.DataCheckUtils && window.DataCheckUtils.isEmpty) {
            return window.DataCheckUtils.isEmpty(value);
        }
        return value === null || value === undefined || String(value).trim() === '';
    }
    
    // 小学名称库
    var primarySchools = [
        "实验小学", "第一小学", "第二小学", "中心小学", "育才小学",
        "希望小学", "红星小学", "阳光小学", "新华小学", "光明小学"
    ];
    
    // 中学名称库
    var middleSchools = [
        "第一中学", "第二中学", "实验中学", "育才中学", "重点中学",
        "师范附属中学", "外国语学校", "民族中学", "铁路中学", "矿务局中学"
    ];
    
    // 高中名称库
    var highSchools = [
        "第一中学", "第二中学", "实验中学", "重点高中", "师范附属中学",
        "育才高中", "外国语学校", "铁路一中", "矿务局一中", "市直中学"
    ];
    
    // 技工学校/中专名称库
    var vocationalSchools = [
        "职业技术学校", "技工学校", "工业学校", "商业学校", "财经学校",
        "卫生学校", "农业学校", "铁路技校", "机械技工学校", "电子工业学校"
    ];
    
    // 大专院校名称库（省级）
    var colleges = [
        "职业技术学院", "职业学院", "工业职业技术学院", "商贸职业学院", "信息职业技术学院",
        "交通职业技术学院", "建筑职业技术学院", "财经职业学院", "师范高等专科学校", "医学高等专科学校"
    ];
    
    // 985/211重点大学（研究生）
    var keyUniversities = [
        "清华大学", "北京大学", "复旦大学", "上海交通大学", "浙江大学",
        "南京大学", "中国科学技术大学", "哈尔滨工业大学", "西安交通大学", "武汉大学",
        "中山大学", "华中科技大学", "四川大学", "吉林大学", "山东大学",
        "中南大学", "天津大学", "南开大学", "东南大学", "北京航空航天大学",
        "同济大学", "厦门大学", "北京师范大学", "中国人民大学", "大连理工大学",
        "西北工业大学", "华南理工大学", "湖南大学", "重庆大学", "兰州大学",
        "电子科技大学", "华东师范大学", "中国农业大学", "东北大学", "西南大学"
    ];
    
    // 省份本科院校映射表
    var provincialUniversities = {
        "北京": ["北京工业大学", "首都师范大学", "北京工商大学", "北京信息科技大学", "首都经济贸易大学"],
        "上海": ["上海大学", "上海师范大学", "上海理工大学", "上海海事大学", "上海工程技术大学"],
        "天津": ["天津工业大学", "天津师范大学", "天津理工大学", "天津科技大学", "天津财经大学"],
        "重庆": ["重庆邮电大学", "重庆交通大学", "重庆师范大学", "重庆工商大学", "重庆理工大学"],
        "河北": ["河北大学", "河北师范大学", "河北工业大学", "燕山大学", "河北科技大学", "石家庄铁道大学"],
        "山西": ["山西大学", "太原理工大学", "山西师范大学", "中北大学", "山西财经大学"],
        "辽宁": ["辽宁大学", "沈阳工业大学", "沈阳师范大学", "辽宁师范大学", "沈阳航空航天大学"],
        "吉林": ["东北师范大学", "长春理工大学", "吉林师范大学", "北华大学", "长春工业大学"],
        "黑龙江": ["黑龙江大学", "哈尔滨师范大学", "哈尔滨理工大学", "东北石油大学", "哈尔滨商业大学"],
        "江苏": ["苏州大学", "南京师范大学", "南京工业大学", "江苏大学", "扬州大学", "南京邮电大学"],
        "浙江": ["宁波大学", "浙江工业大学", "浙江师范大学", "杭州电子科技大学", "浙江理工大学"],
        "安徽": ["安徽大学", "安徽师范大学", "安徽工业大学", "安徽理工大学", "安徽财经大学"],
        "福建": ["福州大学", "福建师范大学", "福建农林大学", "华侨大学", "集美大学"],
        "江西": ["南昌大学", "江西师范大学", "江西财经大学", "华东交通大学", "南昌航空大学"],
        "山东": ["中国海洋大学", "山东师范大学", "青岛大学", "山东科技大学", "济南大学", "青岛科技大学"],
        "河南": ["郑州大学", "河南大学", "河南师范大学", "河南科技大学", "河南工业大学"],
        "湖北": ["武汉理工大学", "华中师范大学", "中国地质大学", "湖北大学", "武汉科技大学"],
        "湖南": ["湖南师范大学", "湘潭大学", "长沙理工大学", "湖南科技大学", "南华大学"],
        "广东": ["暨南大学", "华南师范大学", "深圳大学", "广东工业大学", "南方医科大学", "广州大学"],
        "广西": ["广西大学", "广西师范大学", "桂林电子科技大学", "桂林理工大学", "广西医科大学"],
        "海南": ["海南大学", "海南师范大学", "海南医学院"],
        "四川": ["西南交通大学", "西南财经大学", "四川师范大学", "成都理工大学", "西南石油大学"],
        "贵州": ["贵州大学", "贵州师范大学", "贵州医科大学", "贵州财经大学"],
        "云南": ["云南大学", "昆明理工大学", "云南师范大学", "云南民族大学", "云南财经大学"],
        "陕西": ["西北大学", "陕西师范大学", "西安理工大学", "西安建筑科技大学", "长安大学"],
        "甘肃": ["兰州理工大学", "西北师范大学", "兰州交通大学", "甘肃农业大学"],
        "青海": ["青海大学", "青海师范大学", "青海民族大学"],
        "内蒙古": ["内蒙古大学", "内蒙古师范大学", "内蒙古工业大学", "内蒙古农业大学"],
        "西藏": ["西藏大学", "西藏民族大学"],
        "宁夏": ["宁夏大学", "北方民族大学", "宁夏医科大学"],
        "新疆": ["新疆大学", "石河子大学", "新疆师范大学", "新疆医科大学"],
        "香港": ["香港大学", "香港中文大学", "香港科技大学", "香港理工大学", "香港城市大学"],
        "澳门": ["澳门大学", "澳门科技大学", "澳门理工大学"]
    };
    
    /**
     * 随机选择数组中的元素
     */
    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    /**
     * 省份别名映射表（与入伍地检查规则一致）
     * 支持各种省份的常见写法
     */
    var provinceAliases = {
        '广西省': '广西壮族自治区',
        '广西': '广西壮族自治区',
        '内蒙古省': '内蒙古自治区',
        '内蒙': '内蒙古自治区',
        '西藏省': '西藏自治区',
        '宁夏省': '宁夏回族自治区',
        '宁夏': '宁夏回族自治区',
        '新疆省': '新疆维吾尔自治区',
        '新疆': '新疆维吾尔自治区',
        '香港': '香港特别行政区',
        '澳门': '澳门特别行政区'
    };
    
    /**
     * 标准化省份名称（与入伍地检查规则一致）
     * 将各种写法统一为标准名称
     */
    function normalizeJiguan(location) {
        if (!location) return location;
        var loc = String(location).trim();
        
        // 检查是否包含别名，如果有则替换
        for (var alias in provinceAliases) {
            if (provinceAliases.hasOwnProperty(alias) && loc.indexOf(alias) !== -1) {
                // 检查是否已经是完整名称
                var fullName = provinceAliases[alias];
                if (loc.indexOf(fullName) === -1) {
                    loc = loc.replace(alias, fullName);
                }
            }
        }
        
        return loc;
    }
    
    /**
     * 从完整省份名称中提取简称（用于院校映射）
     * @param {string} provinceName - 省份名称（如"广西壮族自治区"、"河北省"）
     * @returns {string} 省份简称（如"广西"、"河北"）
     */
    function getProvinceShortName(provinceName) {
        if (!provinceName) return '';
        
        // 自治区/特别行政区简称映射
        var shortNameMap = {
            '广西壮族自治区': '广西',
            '内蒙古自治区': '内蒙古',
            '宁夏回族自治区': '宁夏',
            '新疆维吾尔自治区': '新疆',
            '西藏自治区': '西藏',
            '香港特别行政区': '香港',
            '澳门特别行政区': '澳门'
        };
        
        // 如果在映射表中，直接返回简称
        if (shortNameMap[provinceName]) {
            return shortNameMap[provinceName];
        }
        
        // 普通省份：去除"省"字后缀（如"河北省" → "河北"）
        if (provinceName.indexOf('省') !== -1) {
            return provinceName.replace('省', '');
        }
        
        // 其他情况直接返回
        return provinceName;
    }
    
    /**
     * 从籍贯中提取省份信息（与入伍地检查规则一致）
     * @param {string} location - 籍贯字段值（如"河北省石家庄市"、"广西壮族自治区南宁市"）
     * @returns {Object} {province: "河北", city: "石家庄市", fullLocation: "河北省石家庄市"}
     */
    function extractLocationInfo(location) {
        if (!location || String(location).trim() === '') {
            return null;
        }
        
        var originalLoc = String(location).trim();
        // 先标准化省份名称（与入伍地检查保持一致）
        var loc = normalizeJiguan(originalLoc);
        var province = '';
        var city = '';
        
        // 直辖市处理
        var municipalities = ["北京市", "上海市", "天津市", "重庆市"];
        for (var i = 0; i < municipalities.length; i++) {
            if (loc.indexOf(municipalities[i]) === 0) {
                province = municipalities[i].replace('市', '');
                // 提取区县信息作为city
                var remaining = loc.substring(municipalities[i].length);
                if (remaining) {
                    city = remaining;
                } else {
                    city = municipalities[i];
                }
                return {province: province, city: city, fullLocation: loc, isMunicipality: true};
            }
        }
        
        // 省份/自治区/特别行政区处理
        var provinceMatch = loc.match(/(.*?)(省|自治区|特别行政区)/);
        if (provinceMatch) {
            var fullProvinceName = provinceMatch[0]; // 完整省份名（如"广西壮族自治区"）
            var rawProvince = provinceMatch[1]; // 省份前缀（如"广西壮族"）
            
            // 获取省份简称用于院校映射（如"广西"）
            province = getProvinceShortName(fullProvinceName);
            
            // 提取市/州信息（支持自治州）
            var afterProvince = loc.substring(fullProvinceName.length);
            var cityMatch = afterProvince.match(/(.*?)(市|自治州|州|区|县)/);
            if (cityMatch) {
                city = cityMatch[0];
            }
        }
        
        return province ? {province: province, city: city, fullLocation: loc, isMunicipality: false} : null;
    }
    
    /**
     * 根据文化程度和籍贯生成毕业院校
     * @param {string} education - 文化程度
     * @param {string} jiguan - 籍贯（如"河北省石家庄市"）
     * @returns {string} 生成的毕业院校名称
     */
    function generateSchoolByEducation(education, jiguan) {
        var edu = String(education || '').trim();
        var locationInfo = extractLocationInfo(jiguan);
        
        // 如果没有籍贯信息，使用默认省份
        var province = locationInfo ? locationInfo.province : '';
        var city = locationInfo ? locationInfo.city : '';
        var fullLocation = locationInfo ? locationInfo.fullLocation : '';
        
        // 小学：使用籍贯地+小学名
        if (edu === '小学') {
            if (fullLocation) {
                return fullLocation + randomChoice(primarySchools);
            }
            // 如果有省份信息，使用省份
            if (province) {
                if (province === '香港' || province === '澳门') {
                    return province + randomChoice(primarySchools);
                }
                return province + '省' + randomChoice(primarySchools);
            }
            return randomChoice(Object.keys(provincialUniversities)) + '省' + randomChoice(primarySchools);
        }
        
        // 初中：使用籍贯地+中学名
        if (edu === '初中') {
            if (fullLocation) {
                return fullLocation + randomChoice(middleSchools);
            }
            if (province) {
                if (province === '香港' || province === '澳门') {
                    return province + randomChoice(middleSchools);
                }
                return province + '省' + randomChoice(middleSchools);
            }
            return randomChoice(Object.keys(provincialUniversities)) + '省' + randomChoice(middleSchools);
        }
        
        // 高中：使用籍贯地+高中名
        if (edu === '高中') {
            if (fullLocation) {
                return fullLocation + randomChoice(highSchools);
            }
            if (province) {
                if (province === '香港' || province === '澳门') {
                    return province + randomChoice(highSchools);
                }
                return province + '省' + randomChoice(highSchools);
            }
            return randomChoice(Object.keys(provincialUniversities)) + '省' + randomChoice(highSchools);
        }
        
        // 技工学校：使用省份+技工学校名
        if (edu === '技工学校' || edu.indexOf('技工') !== -1) {
            if (province) {
                if (province === '香港' || province === '澳门') {
                    return province + randomChoice(vocationalSchools);
                }
                return province + '省' + randomChoice(vocationalSchools);
            }
            return randomChoice(Object.keys(provincialUniversities)) + '省' + randomChoice(vocationalSchools);
        }
        
        // 中专：使用省份+中专名
        if (edu === '中等专业学校或中等技术学校' || edu.indexOf('中专') !== -1 || edu.indexOf('中等') !== -1) {
            if (province) {
                if (province === '香港' || province === '澳门') {
                    return province + randomChoice(vocationalSchools);
                }
                return province + '省' + randomChoice(vocationalSchools);
            }
            return randomChoice(Object.keys(provincialUniversities)) + '省' + randomChoice(vocationalSchools);
        }
        
        // 大专：使用省份+职业技术学院
        if (edu === '大学专科和专科学校' || edu === '大学专科' || edu.indexOf('专科') !== -1) {
            if (province) {
                // 特别行政区不加"省"
                if (province === '香港' || province === '澳门') {
                    return province + randomChoice(colleges);
                }
                return province + randomChoice(colleges);
            }
            return randomChoice(Object.keys(provincialUniversities)) + randomChoice(colleges);
        }
        
        // 本科：使用省份对应的本科院校
        if (edu === '大学本科（简称大学）' || edu === '大学本科' || edu.indexOf('本科') !== -1) {
            if (province && provincialUniversities[province]) {
                return randomChoice(provincialUniversities[province]);
            }
            // 如果省份不在映射表中，随机选择一个省份的大学
            var provinces = Object.keys(provincialUniversities);
            var randomProvince = randomChoice(provinces);
            return randomChoice(provincialUniversities[randomProvince]);
        }
        
        // 研究生（硕士/博士）：使用985/211重点大学（不限地域）
        if (edu === '研究生' || edu === '硕士研究生' || edu === '博士研究生' || 
            edu.indexOf('研究生') !== -1 || edu.indexOf('硕士') !== -1 || edu.indexOf('博士') !== -1) {
            return randomChoice(keyUniversities);
        }
        
        // 文盲或其他情况，默认生成小学
        if (fullLocation) {
            return fullLocation + randomChoice(primarySchools);
        }
        if (province) {
            if (province === '香港' || province === '澳门') {
                return province + randomChoice(primarySchools);
            }
            return province + '省' + randomChoice(primarySchools);
        }
        return randomChoice(Object.keys(provincialUniversities)) + '省' + randomChoice(primarySchools);
    }
    
    /**
     * 毕业院校生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息
     */
    function generateGraduateSchool(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        // 使用工具函数查找列名（容错处理空格）
        var educationCol = window.GeneratorUtils ? 
            window.GeneratorUtils.findColumn(headers, ['文化程度']) : '文化程度';
        var schoolCol = window.GeneratorUtils ? 
            window.GeneratorUtils.findColumn(headers, ['毕业院校']) : '毕业院校';
        var jiguanCol = window.GeneratorUtils ? 
            window.GeneratorUtils.findColumn(headers, ['籍贯']) : '籍贯';
        
        if (!educationCol || !schoolCol) {
            console.warn('未找到必需的列: 文化程度或毕业院校');
            return {count: 0, colors: {}};
        }
        
        // 如果没有籍贯列，给出提示但继续执行
        if (!jiguanCol) {
            console.warn('未找到籍贯列，将使用随机省份生成毕业院校');
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var education = row[educationCol];
            var school = row[schoolCol];
            var jiguan = jiguanCol ? row[jiguanCol] : '';
            var origRow = originalData[i + 1];
            var origSchool = origRow ? origRow[headers.indexOf(schoolCol)] : '';
            
            // 如果毕业院校为空，则生成
            if (isEmpty(school)) {
                if (!isEmpty(education)) {
                    var newSchool = generateSchoolByEducation(education, jiguan);
                    row[schoolCol] = newSchool;
                    
                    var logMsg = '第' + (i + 2) + '行：根据文化程度"' + education + '"';
                    if (jiguan) {
                        logMsg += '和籍贯"' + jiguan + '"';
                    }
                    logMsg += '生成毕业院校: ' + newSchool;
                    debugLog(logMsg);
                    
                    // 使用统一的颜色标记函数
                    if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                        window.DataCheckUtils.markCellColor(colors, i, schoolCol, 'yellow');
                    } else {
                        if (!colors[i]) colors[i] = {};
                        colors[i][schoolCol] = 'yellow';
                    }
                    count++;
                } else {
                    console.warn('第' + (i + 2) + '行：文化程度为空，无法生成毕业院校');
                }
            } else if (origSchool && String(origSchool).trim() !== '' && 
                       String(school).trim() !== String(origSchool).trim()) {
                // 标记已修改的单元格
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, schoolCol, 'orange');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i][schoolCol] = 'orange';
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    // 导出函数供其他模块使用
    window.generateSchoolByEducation = generateSchoolByEducation;
    window.extractLocationInfo = extractLocationInfo;
    
    /**
     * 注册毕业院校生成器
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['毕业院校生成'] = {
            name: '毕业院校生成',
            description: '根据文化程度智能生成合理的毕业院校（小学/中学/大学等）',
            icon: '<i class="fa fa-graduation-cap"></i>',
            func: generateGraduateSchool
        };
    }
})();

