/**
 * 字段标准化模块
 * 功能：统一不同格式的字段值，支持智能匹配
 * 用途：用于四表联审时，识别"初职（助理级）"和"初职助理级"为相同值
 */

/**
 * 岗位职务层级映射表
 * 将各种格式的岗位职务层级统一为标准格式
 */
var positionLevelMap = {
    '初职（助理级）': '初职',
    '初职助理级': '初职',
    '初职 助理级': '初职',
    '初职-助理级': '初职',
    '初职': '初职',
    
    '中职': '中职',
    '中职（讲师级）': '中职',
    '中职讲师级': '中职',
    '中职 讲师级': '中职',
    '中职-讲师级': '中职',
    
    '副高职': '副高职',
    '副高职（副教授级）': '副高职',
    '副高职副教授级': '副高职',
    '副高职 副教授级': '副高职',
    '副高职-副教授级': '副高职',
    '高职（副教授级）': '副高职',
    '高职副教授级': '副高职',
    
    '正高职': '正高职',
    '正高职（教授级）': '正高职',
    '正高职教授级': '正高职',
    '正高职 教授级': '正高职',
    '正高职-教授级': '正高职',
    
    '正师职': '正师职',
    '副师职': '副师职',
    '正团职': '正团职',
    '副团职': '副团职',
    '正营职': '正营职',
    '副营职': '副营职',
    '正连职': '正连职',
    '副连职': '副连职',
    '排职': '排职',
    
    '专业技术': '专业技术',
    '管理': '管理'
};

/**
 * 军衔文职级映射表
 * 包含军衔（上将-少尉）和文职级（专业技术、管理）的标准化映射
 */
var rankMap = {
    '上将': '上将',
    '中将': '中将',
    '少将': '少将',
    '大校': '大校',
    '上校': '上校',
    '中校': '中校',
    '少校': '少校',
    '上尉': '上尉',
    '中尉': '中尉',
    '少尉': '少尉',
    
    '专业技术一级': '专业技术一级',
    '专业技术二级': '专业技术二级',
    '专业技术三级': '专业技术三级',
    '专业技术四级': '专业技术四级',
    '专业技术五级': '专业技术五级',
    '专业技术六级': '专业技术六级',
    '专业技术七级': '专业技术七级',
    '专业技术八级': '专业技术八级',
    '专业技术九级': '专业技术九级',
    '专业技术十级': '专业技术十级',
    '专业技术十一级': '专业技术十一级',
    '专业技术十二级': '专业技术十二级',
    '专业技术十三级': '专业技术十三级',
    
    '管理一级': '管理一级',
    '管理二级': '管理二级',
    '管理三级': '管理三级',
    '管理四级': '管理四级',
    '管理五级': '管理五级',
    '管理六级': '管理六级',
    '管理七级': '管理七级',
    '管理八级': '管理八级',
    '管理九级': '管理九级'
};

/**
 * 字段标准化函数
 * @param {string} value - 原始字段值
 * @param {string} fieldType - 字段类型（'positionLevel': 岗位职务层级, 'rank': 军衔文职级, 'treatmentLevel': 待遇级别, 'normal': 普通字段）
 * @returns {string} 标准化后的字段值
 * 
 * 处理逻辑：
 * 1. 优先查找映射表
 * 2. 如果映射表中没有，则进行基本标准化（去除括号、空格、短横线）
 */
function normalizeField(value, fieldType) {
    if (!value) return '';
    
    var normalized = String(value).trim();
    
    if (fieldType === 'positionLevel') {
        if (positionLevelMap[normalized]) {
            return positionLevelMap[normalized];
        }
        normalized = normalized.replace(/[（）()]/g, '').replace(/[\s\-]/g, '');
        // 二级查找：归一化后再查一次映射表，保证"初职(助理级)"（半角括号）与"初职（助理级）"收敛到同一规范形式
        if (positionLevelMap[normalized]) {
            return positionLevelMap[normalized];
        }
        return normalized;
    } else if (fieldType === 'rank') {
        if (rankMap[normalized]) {
            return rankMap[normalized];
        }
        normalized = normalized.replace(/[（）()]/g, '').replace(/[\s\-]/g, '');
        if (rankMap[normalized]) {
            return rankMap[normalized];
        }
        return normalized;
    } else if (fieldType === 'treatmentLevel') {
        // 待遇级别标准化：去除括号、空格、短横线，统一格式
        // 例如："正营职（十八级）" -> "正营职十八级"
        normalized = normalized.replace(/[（）()]/g, '').replace(/[\s\-]/g, '');
        return normalized;
    } else {
        normalized = normalized.replace(/[（）()]/g, '').replace(/\s+/g, '');
        return normalized;
    }
}

/**
 * 字段比对函数（支持标准化）
 * @param {string} value1 - 第一个值
 * @param {string} value2 - 第二个值
 * @param {string} fieldType - 字段类型
 * @returns {boolean} 两个值标准化后是否相等
 */
function compareFields(value1, value2, fieldType) {
    var norm1 = normalizeField(value1, fieldType);
    var norm2 = normalizeField(value2, fieldType);
    return norm1 === norm2;
}


/**
 * 身份证号归一化（联审模块统一主键格式）
 * 处理：前后空格、末位x/X大小写、全角数字/字母转半角
 * 用于多表比对前统一主键，避免"…011x"与"…011X"漏匹配
 */
function normalizeIdCard(value) {
    var s = String(value === null || value === undefined ? '' : value);
    s = s.replace(/[０-９ａ-ｚＡ-Ｚ]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    return s.trim().toUpperCase();
}
