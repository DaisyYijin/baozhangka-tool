/**
 * 毕业专业生成器
 * 功能：根据毕业院校关键词和文化程度智能生成合理的毕业专业
 * 
 * 生成规则：
 * 1. 优先根据毕业院校的关键词匹配专业类型
 *    - 理工/科技 → 工科专业
 *    - 师范/教育 → 教育类专业
 *    - 医科/医学 → 医学类专业
 *    - 财经/经济 → 经管类专业
 * 2. 根据文化程度选择专业层次
 *    - 技工学校：技能型专业
 *    - 中专：职业型专业
 *    - 大专：应用型专业
 *    - 本科：学术型专业
 *    - 研究生：研究方向
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
    
    // 技工学校专业库
    var technicalSchoolMajors = [
        "机械加工技术", "数控加工", "电工技术", "焊接技术", "汽车维修",
        "汽车电器维修", "机电一体化", "电子技术应用", "钳工",
        "车工", "铣工", "磨工", "电气自动化", "模具制造",
        "数控车床", "数控铣床", "汽车钣金", "汽车喷漆", "制冷设备维修"
    ];
    
    // 中专专业库
    var secondarySchoolMajors = [
        "会计", "护理", "计算机应用", "机电技术应用", "电子商务",
        "市场营销", "建筑工程施工", "学前教育", "旅游服务与管理",
        "计算机网络技术", "电子电器应用与维修", "农村经济综合管理",
        "汽车运用与维修", "美术设计与制作", "文秘", "物流服务与管理",
        "中餐烹饪", "农业机械使用与维护", "畜牧兽医", "园林技术"
    ];
    
    // 大专专业库
    var collegeMajors = [
        "计算机应用技术", "软件技术", "会计", "护理学", "建筑工程技术",
        "工程造价", "机电一体化技术", "电气自动化技术", "汽车检测与维修技术",
        "市场营销", "电子商务", "物流管理", "旅游管理", "学前教育",
        "建筑装饰工程技术", "工商企业管理", "人力资源管理", "金融管理",
        "法律事务", "临床医学", "药学", "医学检验技术", "通信技术",
        "数控技术", "模具设计与制造", "计算机网络技术", "动漫制作技术",
        "会计信息管理", "国际经济与贸易", "应用英语"
    ];
    
    // 本科专业库（按大类分）
    var undergraduateMajors = {
        // 工科类
        engineering: [
            "计算机科学与技术", "软件工程", "网络工程", "信息安全",
            "机械工程", "机械设计制造及其自动化", "车辆工程",
            "电气工程及其自动化", "自动化", "电子信息工程", "通信工程",
            "土木工程", "建筑学", "工程管理", "工程造价",
            "化学工程与工艺", "材料科学与工程", "交通运输",
            "水利水电工程", "测绘工程", "环境工程", "食品科学与工程"
        ],
        // 理科类
        science: [
            "数学与应用数学", "信息与计算科学", "物理学", "应用物理学",
            "化学", "应用化学", "生物科学", "生物技术", "统计学"
        ],
        // 文科类
        humanities: [
            "汉语言文学", "英语", "新闻学", "广播电视学", "广告学",
            "历史学", "哲学", "法学", "政治学与行政学", "社会学"
        ],
        // 经管类
        business: [
            "工商管理", "市场营销", "会计学", "财务管理", "人力资源管理",
            "行政管理", "公共事业管理", "物流管理", "电子商务",
            "经济学", "金融学", "国际经济与贸易", "财政学", "保险学"
        ],
        // 医学类
        medical: [
            "临床医学", "口腔医学", "预防医学", "中医学", "针灸推拿学",
            "护理学", "药学", "中药学", "医学检验技术", "医学影像学"
        ],
        // 农学类
        agriculture: [
            "农学", "园艺", "植物保护", "动物科学", "动物医学",
            "林学", "园林", "水产养殖学"
        ],
        // 教育类
        education: [
            "教育学", "学前教育", "小学教育", "体育教育", "运动训练"
        ],
        // 艺术类
        arts: [
            "音乐学", "音乐表演", "美术学", "绘画", "视觉传达设计",
            "环境设计", "产品设计", "舞蹈学", "播音与主持艺术"
        ]
    };
    
    // 研究生专业库（更细分）
    var graduateMajors = [
        "计算机科学与技术", "软件工程", "网络空间安全", "人工智能",
        "机械工程", "机械制造及其自动化", "机械电子工程", "车辆工程",
        "控制科学与工程", "电气工程", "电力系统及其自动化",
        "土木工程", "结构工程", "岩土工程", "桥梁与隧道工程",
        "工商管理", "企业管理", "会计学", "技术经济及管理",
        "金融学", "应用经济学", "产业经济学", "国际贸易学",
        "法学", "宪法学与行政法学", "民商法学", "刑法学",
        "马克思主义理论", "思想政治教育", "中国近现代史",
        "临床医学", "内科学", "外科学", "妇产科学", "儿科学",
        "基础医学", "公共卫生与预防医学", "药学", "中医学",
        "材料科学与工程", "材料物理与化学", "材料加工工程",
        "教育学", "教育学原理", "课程与教学论", "高等教育学",
        "中国语言文学", "汉语言文字学", "中国古代文学", "中国现当代文学"
    ];
    
    /**
     * 随机选择数组中的元素
     */
    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    /**
     * 院校关键词到专业类型的映射
     */
    var schoolKeywordMapping = {
        // 工科类院校
        'engineering': {
            keywords: ['理工', '科技', '工业', '工程', '技术', '机械', '电子', '交通', '铁路', '石油', '矿业', '建筑', '航空', '航天'],
            categories: ['engineering']
        },
        // 师范教育类
        'education': {
            keywords: ['师范', '教育'],
            categories: ['education', 'humanities']
        },
        // 医学类
        'medical': {
            keywords: ['医科', '医学', '医药', '卫生', '护理', '药学', '中医'],
            categories: ['medical']
        },
        // 财经类
        'business': {
            keywords: ['财经', '经济', '金融', '商贸', '商业', '工商', '贸易', '会计'],
            categories: ['business']
        },
        // 农林类
        'agriculture': {
            keywords: ['农业', '林业', '农林', '畜牧', '兽医'],
            categories: ['agriculture']
        },
        // 艺术类
        'arts': {
            keywords: ['艺术', '音乐', '美术', '戏剧', '舞蹈', '传媒'],
            categories: ['arts']
        }
    };
    
    /**
     * 从毕业院校中识别关键词，返回专业类别
     * @param {string} school - 毕业院校名称
     * @returns {Array} 匹配的专业类别数组，如 ['engineering']
     */
    function identifySchoolType(school) {
        if (!school || String(school).trim() === '') {
            return null;
        }
        
        var schoolName = String(school).trim();
        
        // 遍历所有关键词映射
        for (var type in schoolKeywordMapping) {
            if (schoolKeywordMapping.hasOwnProperty(type)) {
                var mapping = schoolKeywordMapping[type];
                var keywords = mapping.keywords;
                
                // 检查院校名称是否包含关键词
                for (var i = 0; i < keywords.length; i++) {
                    if (schoolName.indexOf(keywords[i]) !== -1) {
                        return mapping.categories;
                    }
                }
            }
        }
        
        return null; // 未匹配到关键词
    }
    
    /**
     * 从本科专业库中随机选择（可指定类别）
     * @param {Array} categories - 专业类别数组，如 ['engineering', 'science']
     * @returns {string} 专业名称
     */
    function randomUndergraduateMajor(categories) {
        if (!categories || categories.length === 0) {
            // 如果没有指定类别，随机选择
            var allCategories = ['engineering', 'science', 'humanities', 'business', 'medical', 'agriculture', 'education', 'arts'];
            var category = randomChoice(allCategories);
            return randomChoice(undergraduateMajors[category]);
        }
        
        // 从指定类别中随机选择
        var category = randomChoice(categories);
        return randomChoice(undergraduateMajors[category]);
    }
    
    /**
     * 根据文化程度和毕业院校生成毕业专业
     * @param {string} education - 文化程度
     * @param {string} school - 毕业院校（用于识别专业类型）
     * @returns {string} 生成的专业名称
     */
    function generateMajorByEducation(education, school) {
        var edu = String(education || '').trim();
        
        // 识别院校类型
        var schoolCategories = identifySchoolType(school);
        
        // 技工学校：根据院校关键词筛选专业（如果可能）
        if (edu === '技工学校' || edu.indexOf('技工') !== -1) {
            // 技工学校的专业比较固定，不受院校关键词影响
            return randomChoice(technicalSchoolMajors);
        }
        
        // 中专：根据院校关键词筛选专业
        if (edu === '中等专业学校或中等技术学校' || edu.indexOf('中专') !== -1 || edu.indexOf('中等') !== -1) {
            // 中专可以根据院校关键词倾向某些专业
            if (schoolCategories) {
                if (schoolCategories.indexOf('medical') !== -1) {
                    return randomChoice(['护理', '药学', '中医', '医学检验技术']);
                }
                if (schoolCategories.indexOf('business') !== -1) {
                    return randomChoice(['会计', '市场营销', '电子商务', '物流服务与管理']);
                }
            }
            return randomChoice(secondarySchoolMajors);
        }
        
        // 大专：根据院校关键词筛选专业
        if (edu === '大学专科和专科学校' || edu === '大学专科' || edu.indexOf('专科') !== -1) {
            if (schoolCategories) {
                if (schoolCategories.indexOf('engineering') !== -1) {
                    return randomChoice(['计算机应用技术', '软件技术', '机电一体化技术', '电气自动化技术', '建筑工程技术', '工程造价']);
                }
                if (schoolCategories.indexOf('medical') !== -1) {
                    return randomChoice(['护理学', '临床医学', '药学', '医学检验技术']);
                }
                if (schoolCategories.indexOf('business') !== -1) {
                    return randomChoice(['会计', '市场营销', '电子商务', '物流管理', '金融管理', '工商企业管理']);
                }
                if (schoolCategories.indexOf('education') !== -1) {
                    return randomChoice(['学前教育', '小学教育', '语文教育', '数学教育']);
                }
            }
            return randomChoice(collegeMajors);
        }
        
        // 本科：根据院校关键词智能匹配专业类别
        if (edu === '大学本科（简称大学）' || edu === '大学本科' || edu.indexOf('本科') !== -1 || edu === '大学') {
            return randomUndergraduateMajor(schoolCategories);
        }
        
        // 研究生：根据院校关键词筛选研究方向
        if (edu === '研究生' || edu === '硕士研究生' || edu === '博士研究生' || 
            edu.indexOf('研究生') !== -1 || edu.indexOf('硕士') !== -1 || edu.indexOf('博士') !== -1) {
            if (schoolCategories) {
                if (schoolCategories.indexOf('engineering') !== -1) {
                    return randomChoice(['计算机科学与技术', '软件工程', '机械工程', '电气工程', '土木工程', '控制科学与工程', '材料科学与工程']);
                }
                if (schoolCategories.indexOf('medical') !== -1) {
                    return randomChoice(['临床医学', '内科学', '外科学', '基础医学', '公共卫生与预防医学', '药学', '中医学']);
                }
                if (schoolCategories.indexOf('business') !== -1) {
                    return randomChoice(['工商管理', '企业管理', '会计学', '金融学', '应用经济学', '产业经济学']);
                }
                if (schoolCategories.indexOf('education') !== -1) {
                    return randomChoice(['教育学', '教育学原理', '课程与教学论', '高等教育学']);
                }
            }
            return randomChoice(graduateMajors);
        }
        
        // 其他情况，默认返回空（不生成）
        return '';
    }
    
    /**
     * 毕业专业生成主函数
     * @param {Array} rows - 数据行数组
     * @param {Array} originalData - 原始数据
     * @param {Array} headers - 表头数组
     * @returns {Object} 包含生成数量和颜色标记信息
     */
    function generateMajor(rows, originalData, headers) {
        var count = 0;
        var colors = {};
        
        // 使用工具函数查找列名（容错处理空格）
        var educationCol = window.GeneratorUtils ? 
            window.GeneratorUtils.findColumn(headers, ['文化程度']) : '文化程度';
        var majorCol = window.GeneratorUtils ? 
            window.GeneratorUtils.findColumn(headers, ['毕业专业']) : '毕业专业';
        var schoolCol = window.GeneratorUtils ? 
            window.GeneratorUtils.findColumn(headers, ['毕业院校']) : '毕业院校';
        
        if (!educationCol || !majorCol) {
            console.warn('未找到必需的列: 文化程度或毕业专业');
            return {count: 0, colors: {}};
        }
        
        // 如果没有毕业院校列，给出提示但继续执行
        if (!schoolCol) {
            console.warn('未找到毕业院校列，将不考虑院校关键词生成专业');
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var education = row[educationCol];
            var major = row[majorCol];
            var school = schoolCol ? row[schoolCol] : '';
            var origRow = originalData[i + 1];
            var origMajor = origRow ? origRow[headers.indexOf(majorCol)] : '';
            
            // 如果毕业专业为空，则生成
            if (isEmpty(major)) {
                if (!isEmpty(education)) {
                    var newMajor = generateMajorByEducation(education, school);
                    
                    if (newMajor) {
                        row[majorCol] = newMajor;
                        
                        var logMsg = '第' + (i + 2) + '行：根据文化程度"' + education + '"';
                        if (school) {
                            logMsg += '和毕业院校"' + school + '"';
                        }
                        logMsg += '生成毕业专业: ' + newMajor;
                        debugLog(logMsg);
                        
                        // 使用统一的颜色标记函数
                        if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                            window.DataCheckUtils.markCellColor(colors, i, majorCol, 'yellow');
                        } else {
                            if (!colors[i]) colors[i] = {};
                            colors[i][majorCol] = 'yellow';
                        }
                        count++;
                    } else {
                        debugLog('第' + (i + 2) + '行：文化程度"' + education + '"不需要生成毕业专业');
                    }
                } else {
                    console.warn('第' + (i + 2) + '行：文化程度为空，无法生成毕业专业');
                }
            } else if (origMajor && String(origMajor).trim() !== '' && 
                       String(major).trim() !== String(origMajor).trim()) {
                // 标记已修改的单元格
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, majorCol, 'orange');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i][majorCol] = 'orange';
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    // 导出函数供其他模块使用
    window.generateMajorByEducation = generateMajorByEducation;
    window.identifySchoolType = identifySchoolType;
    
    /**
     * 注册毕业专业生成器
     */
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['毕业专业生成'] = {
            name: '毕业专业生成',
            description: '根据文化程度智能生成合理的毕业专业（技工/中专/大专/本科/研究生）',
            icon: '<i class="fa fa-book"></i>',
            func: generateMajor
        };
    }
})();

