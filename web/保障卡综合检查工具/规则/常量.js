/**
 * 数据检查常量定义
 * 集中管理所有检查规则用到的常量和配置
 * 
 * 包含的常量类别：
 * - 身份证相关（有效期、长度）
 * - 手机号前缀（移动、联通、电信）
 * - 血型类型
 * - 婚姻状况
 * - 人员类别
 * - 文化程度
 * - 证件类型
 * 等等
 */
(function(window) {
    'use strict';
    
    var DataCheckConstants = {};
    
    /**
     * 身份证相关常量
     */
    DataCheckConstants.ID_CARD = {
        VALID_PERIODS: {
            TEN_YEARS: 100000,
            TWENTY_YEARS: 200000,
            THIRTY_YEARS: 300000
        },
        PERIOD_YEARS: [10, 20, 30],
        LENGTH_15: 15,
        LENGTH_18: 18
    };
    
    /**
     * 手机号前缀（按运营商分类）
     */
    DataCheckConstants.PHONE_PREFIXES = {
        CHINA_MOBILE: [
            '134', '135', '136', '137', '138', '139',
            '147', '148', '150', '151', '152', '157', '158', '159',
            '165', '172', '178',
            '182', '183', '184', '187', '188',
            '195', '197', '198'
        ],
        CHINA_UNICOM: [
            '130', '131', '132',
            '145', '146',
            '155', '156', '166', '167',
            '171', '175', '176',
            '185', '186', '196'
        ],
        CHINA_TELECOM: [
            '133', '141',
            '149', '153',
            '162', '170', '173', '174', '177',
            '180', '181', '189', '190', '191', '193', '199'
        ],
        CHINA_BROADNET: [
            '192'
        ]
    };
    
    /**
     * 所有有效手机号前缀
     */
    DataCheckConstants.ALL_PHONE_PREFIXES = []
        .concat(DataCheckConstants.PHONE_PREFIXES.CHINA_MOBILE)
        .concat(DataCheckConstants.PHONE_PREFIXES.CHINA_UNICOM)
        .concat(DataCheckConstants.PHONE_PREFIXES.CHINA_TELECOM)
        .concat(DataCheckConstants.PHONE_PREFIXES.CHINA_BROADNET);
    
    /**
     * 血型类型
     */
    DataCheckConstants.BLOOD_TYPES = {
        VALID_TYPES: ['A', 'B', 'O', 'AB'],
        VALID_RH: ['RH+', 'RH-'],
        ALL_VALID: ['ARH+', 'ARH-', 'BRH+', 'BRH-', 'ORH+', 'ORH-', 'ABRH+', 'ABRH-']
    };
    
    /**
     * 婚姻状况
     */
    DataCheckConstants.MARITAL_STATUS = {
        SINGLE: '未婚',
        MARRIED: '已婚',
        DIVORCED: '离婚',
        WIDOWED: '丧偶',
        ALL_VALID: ['未婚', '已婚', '离婚', '丧偶'],
        REQUIRE_DATE: ['已婚', '离婚', '丧偶']
    };
    
    /**
     * 人员类别
     */
    DataCheckConstants.PERSONNEL_TYPES = {
        CONSCRIPT: '义务兵',
        SERGEANT: '军士',
        COMMAND_OFFICER: '指挥管理军官',
        TECHNICAL_OFFICER: '专业技术军官',
        SERGEANT_STUDENT: '军士学员',
        OFFICER_STUDENT: '军官学员',
        GROWING_OFFICER_STUDENT: '生长干部学员',
        RETIRED_SERGEANT: '退休军士',
        RETIRED_OFFICER: '退休军官',
        CIVILIAN_MANAGER: '招录管理文职人员',
        CIVILIAN_TECHNICAL: '招录技术文职人员',
        CIVILIAN_CONVERTED: '转改技术文职人员',
        CIVILIAN_SKILLED: '专业技能文职人员',
        RETIRED_CADRE: '退休干部',
        RETIRED_SOLDIER: '退休士兵',
        ALL_VALID: [
            '义务兵', '军士', '指挥管理军官', '专业技术军官', '军士学员', '军官学员',
            '生长干部学员', '退休军士', '退休军官', '招录管理文职人员', '招录技术文职人员',
            '转改技术文职人员', '专业技能文职人员', '退休干部', '退休士兵'
        ]
    };
    
    DataCheckConstants.CERTIFICATE_TYPES = {
        OFFICER_CERT: '军官证',
        SERGEANT_CERT: '军士证',
        CONSCRIPT_CERT: '义务兵证',
        STUDENT_CERT: '学员证',
        RETIRED_CERT: '退休证',
        CIVILIAN_CERT: '文职人员证',
        PREFIX_MAPPING: {
            '军官证': '军字第',
            '军士证': '士字第',
            '义务兵证': '兵字第',
            '学员证': '学字第',
            '退休证': '退字第',
            '文职人员证': '文字第'
        },
        SUFFIX: '号'
    };
    
    DataCheckConstants.EDUCATION_LEVELS = {
        ILLITERATE: '文盲或半文盲',
        PRIMARY: '小学',
        JUNIOR_HIGH: '初中',
        HIGH_SCHOOL: '高中',
        TECHNICAL_SCHOOL: '技工学校',
        SECONDARY_TECHNICAL: '中等专业学校或中等技术学校',
        COLLEGE_SHORT: '大学专科和专科学校',
        COLLEGE: '大学专科',
        UNDERGRADUATE: '大学本科（简称大学）',
        UNDERGRADUATE_SHORT: '大学本科',
        GRADUATE: '研究生',
        MASTER: '硕士研究生',
        DOCTORATE: '博士研究生',
        ALL_VALID: [
            '文盲或半文盲', '小学', '初中', '高中', '技工学校',
            '中等专业学校或中等技术学校', '大学专科和专科学校',
            '大学本科（简称大学）', '研究生'
        ]
    };
    
    DataCheckConstants.STUDY_YEARS = {
        STANDARD: {
            '文盲或半文盲': null,
            '小学': 6,
            '初中': 3,
            '高中': 3,
            '技工学校': 3,
            '中等专业学校或中等技术学校': 3,
            '大学专科和专科学校': 3,
            '大学专科': 3,
            '大学本科（简称大学）': 4,
            '大学本科': 4,
            '医学本科': 5,
            '建筑学本科': 5,
            '研究生': 3,
            '硕士研究生': 2.5,
            '博士研究生': 4
        },
        TOLERANCE: {
            '文盲或半文盲': 0,
            '小学': 2,
            '初中': 2,
            '高中': 2,
            '技工学校': 2,
            '中等专业学校或中等技术学校': 2,
            '大学专科和专科学校': 2,
            '大学专科': 2,
            '大学本科（简称大学）': 3,
            '大学本科': 3,
            '医学本科': 3,
            '建筑学本科': 2,
            '研究生': 5,
            '硕士研究生': 2,
            '博士研究生': 3
        }
    };
    
    DataCheckConstants.ADMISSION_AGE = {
        MIN: {
            '大学专科和专科学校': 17,
            '大学专科': 17,
            '大学本科（简称大学）': 17,
            '大学本科': 17,
            '研究生': 20,
            '硕士研究生': 20,
            '博士研究生': 22
        },
        MAX: {
            '大学专科和专科学校': 45,
            '大学专科': 45,
            '大学本科（简称大学）': 45,
            '大学本科': 45,
            '研究生': 50,
            '硕士研究生': 50,
            '博士研究生': 55
        }
    };
    
    DataCheckConstants.POLITICAL_STATUS = {
        CPC_MEMBER: '中共党员',
        CPC_PROBATIONARY: '中共预备党员',
        LEAGUE_MEMBER: '共青团员',
        DEMOCRATIC_PARTY: '民主党派',
        MASSES: '群众',
        ALL_VALID: ['中共党员', '中共预备党员', '共青团员', '民主党派', '群众']
    };
    
    DataCheckConstants.ADULT_EDUCATION_KEYWORDS = [
        '开放大学', '八一', '军队', '军校', '电大', '远程', 
        '成人', '自考', '函授', '继续教育', '网络教育', '夜大', '业余'
    ];
    
    DataCheckConstants.MUNICIPALITIES = ['北京', '上海', '天津', '重庆'];
    
    /**
     * 省份别名映射表
     * 用于地址标准化，支持各种省份的常见写法
     */
    DataCheckConstants.PROVINCE_ALIASES = {
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
    
    DataCheckConstants.EXCEL = {
        HEADER_ROW: 1,
        DATA_START_ROW: 2,
        MAX_ROWS: 100000,
        BATCH_SIZE: 1000
    };
    
    DataCheckConstants.PAGINATION = {
        DEFAULT_PAGE_SIZE: 10,
        PAGE_SIZE_OPTIONS: [10, 20, 50, 100, 200],
        MAX_VISIBLE_PAGES: 7
    };
    
    DataCheckConstants.REGEX = {
        DATE_8_DIGITS: /^\d{8}$/,
        PHONE_11_DIGITS: /^\d{11}$/,
        ID_CARD: /^(\d{15}|\d{17}[\dXx])$/
    };
    
    DataCheckConstants.ERROR_MESSAGES = {
        EMPTY_FIELD: '不能为空',
        INVALID_FORMAT: '格式错误',
        INVALID_VALUE: '无效的值',
        DATE_PARSE_ERROR: '日期格式错误，无法解析',
        OUT_OF_RANGE: '超出有效范围',
        INCONSISTENT: '不一致'
    };
    
    DataCheckConstants.DATE = {
        DAYS_PER_YEAR: 365.25,
        MIN_YEAR: 1900,
        MAX_YEAR: 2100
    };
    
    DataCheckConstants.ADDRESS = {
        MIN_LENGTH: 15,
        REQUIRED_PARTS: ['省|市|区|县', '街道|镇|乡|村', '路|街|巷|号|楼']
    };
    
    window.DataCheckConstants = DataCheckConstants;
    window.DCC = DataCheckConstants;
    
})(window);

