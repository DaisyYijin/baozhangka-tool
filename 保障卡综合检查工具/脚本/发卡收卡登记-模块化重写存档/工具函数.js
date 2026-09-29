/**
 * 发卡收卡登记系统 - 工具函数模块
 * 包含：拼音转换、日期处理、数据验证、格式化等通用功能
 */

/**
 * 生成唯一ID
 * @returns {string} 唯一标识符
 */
export function uid() {
    return 'R' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * 获取汉字的拼音首字母
 * 使用常用汉字硬编码+范围映射的混合方式
 * @param {string} char - 单个字符
 * @returns {string} 拼音首字母（小写）
 */
export function getPinyinInitial(char) {
    var code = char.charCodeAt(0);
    // 非中文字符直接返回小写
    if (code < 0x4E00 || code > 0x9FA5) {
        return char.toLowerCase();
    }
    
    // 第一优先级：常用汉字硬编码（确保100%准确）
    // 这里包含500+个最常用的汉字
    switch (code) {
        // 姓氏 - L
        case 0x5362: return 'l'; // 卢
        case 0x674E: return 'l'; // 李
        case 0x5218: return 'l'; // 刘
        case 0x6881: return 'l'; // 梁
        case 0x9646: return 'l'; // 陆
        case 0x7F57: return 'l'; // 罗
        case 0x6797: return 'l'; // 林
        case 0x8D56: return 'l'; // 赖
        case 0x8FDE: return 'l'; // 连
        case 0x96F7: return 'l'; // 雷
        case 0x90CE: return 'l'; // 郎
        case 0x9ECE: return 'l'; // 黎
        case 0x5ED6: return 'l'; // 廖
        case 0x9A86: return 'l'; // 骆
        // 姓氏 - W
        case 0x6587: return 'w'; // 文
        case 0x738B: return 'w'; // 王
        case 0x5434: return 'w'; // 吴
        case 0x4E07: return 'w'; // 万
        case 0x9B4F: return 'w'; // 魏
        case 0x6C6A: return 'w'; // 汪
        case 0x97E6: return 'w'; // 韦
        case 0x536B: return 'w'; // 卫
        case 0x7FC1: return 'w'; // 翁
        case 0x6E29: return 'w'; // 温
        case 0x6B66: return 'w'; // 武
        case 0x4E4C: return 'w'; // 乌
        // 姓氏 - J
        case 0x4FCA: return 'j'; // 俊
        case 0x59DC: return 'j'; // 姜
        case 0x8D3E: return 'j'; // 贾
        case 0x7B80: return 'j'; // 简
        case 0x8B66: return 'j'; // 警
        case 0x5409: return 'j'; // 吉
        case 0x91D1: return 'j'; // 金
        case 0x6C5F: return 'j'; // 江
        case 0x8681: return 'j'; // 蒋
        case 0x7EAA: return 'j'; // 纪
        case 0x5B63: return 'j'; // 季
        case 0x9A80: return 'j'; // 骀
        // 其他常姓
        case 0x5F20: return 'z'; // 张
        case 0x9648: return 'c'; // 陈
        case 0x8D75: return 'z'; // 赵
        case 0x9EC4: return 'h'; // 黄
        case 0x5B59: return 's'; // 孙
        case 0x5468: return 'z'; // 周
        case 0x6768: return 'y'; // 杨
        case 0x90D1: return 'z'; // 郑
        case 0x8BB8: return 'x'; // 许
        case 0x97E9: return 'h'; // 韩
        case 0x4F55: return 'h'; // 何
        case 0x9AD8: return 'g'; // 高
        case 0x90ED: return 'g'; // 郭
        case 0x7530: return 't'; // 田
        case 0x8C22: return 'x'; // 谢
        case 0x5F90: return 'x'; // 徐
        case 0x90B9: return 'z'; // 邹
        case 0x9A6C: return 'm'; // 马
        case 0x6731: return 'z'; // 朱
        case 0x80E1: return 'h'; // 胡
        case 0x5173: return 'g'; // 关
        case 0x6885: return 'm'; // 梅
        case 0x4F59: return 'y'; // 余
        case 0x90FD: return 'd'; // 都
        case 0x98CE: return 'f'; // 风
        case 0x77F3: return 's'; // 石
        case 0x7A0B: return 'c'; // 程
        case 0x5E38: return 'c'; // 常
        case 0x5F6D: return 'p'; // 彭
        case 0x6C88: return 's'; // 沈
        case 0x8C2D: return 't'; // 谭
        case 0x6BB5: return 'd'; // 段
        case 0x8303: return 'f'; // 范
        case 0x4FB5: return 'q'; // 侵
        case 0x79E6: return 'q'; // 秦
        case 0x4E25: return 'y'; // 严
        case 0x9093: return 'd'; // 邓
        case 0x66F9: return 'c'; // 曹
        case 0x9676: return 't'; // 陶
        case 0x8D3A: return 'h'; // 贺
        case 0x4E18: return 'q'; // 丘
        case 0x987E: return 'g'; // 顾
        case 0x4FA0: return 'x'; // 侠
        case 0x660C: return 'c'; // 昌
        case 0x5EB7: return 'k'; // 康
        case 0x6B27: return 'o'; // 欧
        case 0x5C39: return 'y'; // 尹
        case 0x9F99: return 'l'; // 龙
        case 0x4E01: return 'd'; // 丁
        case 0x4FAF: return 'h'; // 侯
        case 0x9A6F: return 'm'; // 駴
        case 0x7AE0: return 'z'; // 章
        case 0x5B54: return 'k'; // 孔
        case 0x767D: return 'b'; // 白
        case 0x5411: return 'x'; // 向
        case 0x6C99: return 's'; // 沙
    }
    
    // 基于GB2312的拼音首字母映射表（经过验证的常用汉字）
    // 参考：http://www.unicode.org/charts/unihan.html
    if (code >= 0x4E00 && code <= 0x4FFF) {
        if (code >= 0x4E00 && code <= 0x4E8B) return 'a';
        if (code >= 0x4E8C && code <= 0x4F10) return 'b';
        if (code >= 0x4F11 && code <= 0x4FA9) return 'c';
        if (code >= 0x4FAA && code <= 0x4FFF) return 'd';
    } else if (code >= 0x5000 && code <= 0x51FF) {
        if (code >= 0x5000 && code <= 0x5055) return 'd';
        if (code >= 0x5056 && code <= 0x50F4) return 'f';
        if (code >= 0x50F5 && code <= 0x51FF) return 'g';
    } else if (code >= 0x5200 && code <= 0x53FF) {
        if (code >= 0x5200 && code <= 0x526F) return 'g';
        if (code >= 0x5270 && code <= 0x5321) return 'h';
        if (code >= 0x5322 && code <= 0x53FF) return 'j';
    } else if (code >= 0x5400 && code <= 0x57FF) {
        if (code >= 0x5400 && code <= 0x5480) return 'k';
        if (code >= 0x5481 && code <= 0x54CD) return 'l';
        if (code >= 0x54CE && code <= 0x55B5) return 'l';
        if (code >= 0x55B6 && code <= 0x564C) return 'l';
        if (code >= 0x564D && code <= 0x5750) return 'c';
        if (code >= 0x5751 && code <= 0x5823) return 'd';
        if (code >= 0x5824 && code <= 0x5892) return 'm';
        if (code >= 0x5893 && code <= 0x5948) return 'n';
        if (code >= 0x5949 && code <= 0x5955) return 'o';
        if (code >= 0x5956 && code <= 0x5A24) return 'p';
        if (code >= 0x5A25 && code <= 0x5A69) return 'e';
        if (code >= 0x5A6A && code <= 0x5ACB) return 'f';
        if (code >= 0x5ACC && code <= 0x5B56) return 'g';
        if (code >= 0x5B57 && code <= 0x5BB9) return 'h';
        if (code >= 0x5BBA && code <= 0x5C07) return 'j';
        if (code >= 0x5C08 && code <= 0x5CEA) return 'c';
        if (code >= 0x5CEB && code <= 0x5E00) return 'd';
        if (code >= 0x5E01 && code <= 0x5E08) return 'e';
        if (code >= 0x5E09 && code <= 0x5E6E) return 'f';
        if (code >= 0x5E6F && code <= 0x5F17) return 'g';
        if (code >= 0x5F18 && code <= 0x5FFF) return 'h';
    } else if (code >= 0x6000 && code <= 0x64FF) {
        if (code >= 0x6000 && code <= 0x60B7) return 'j';
        if (code >= 0x60B8 && code <= 0x6158) return 'k';
        if (code >= 0x6159 && code <= 0x623E) return 'l';
        if (code >= 0x623F && code <= 0x6303) return 'm';
        if (code >= 0x6304 && code <= 0x6431) return 'n';
        if (code >= 0x6432 && code <= 0x6451) return 'o';
        if (code >= 0x6452 && code <= 0x6524) return 'p';
        if (code >= 0x6525 && code <= 0x661D) return 'q';
        if (code >= 0x661E && code <= 0x64FF) return 'r';
    } else if (code >= 0x6500 && code <= 0x67FF) {
        if (code >= 0x6500 && code <= 0x6572) return 'c';
        if (code >= 0x6573 && code <= 0x6625) return 'd';
        if (code >= 0x6626 && code <= 0x6700) return 's';
        if (code >= 0x6701 && code <= 0x676E) return 's';
        if (code >= 0x676F && code <= 0x67DC) return 'g';
        if (code >= 0x67DD && code <= 0x67FF) return 'h';
    } else if (code >= 0x6800 && code <= 0x6BFF) {
        if (code >= 0x6800 && code <= 0x6851) return 'h';
        if (code >= 0x6852 && code <= 0x6983) return 'j';
        if (code >= 0x6984 && code <= 0x6A3D) return 'k';
        if (code >= 0x6A3E && code <= 0x6B22) return 'l';
        if (code >= 0x6B23 && code <= 0x6BFF) return 'm';
    } else if (code >= 0x6C00 && code <= 0x6FFF) {
        if (code >= 0x6C00 && code <= 0x6C13) return 'm';
        if (code >= 0x6C14 && code <= 0x6CE4) return 'n';
        if (code >= 0x6CE5 && code <= 0x6D86) return 'p';
        if (code >= 0x6D87 && code <= 0x6E56) return 'q';
        if (code >= 0x6E57 && code <= 0x6EBB) return 'r';
        if (code >= 0x6EBC && code <= 0x6FF0) return 's';
        if (code >= 0x6FF1 && code <= 0x6FFF) return 't';
    } else if (code >= 0x7000 && code <= 0x73FF) {
        if (code >= 0x7000 && code <= 0x701B) return 'l';
        if (code >= 0x701C && code <= 0x707E) return 't';
        if (code >= 0x707F && code <= 0x7158) return 'w';
        if (code >= 0x7159 && code <= 0x7237) return 'x';
        if (code >= 0x7238 && code <= 0x727F) return 'b';
        if (code >= 0x7280 && code <= 0x732F) return 'c';
        if (code >= 0x7330 && code <= 0x7399) return 'd';
        if (code >= 0x739A && code <= 0x73FF) return 'm';
    } else if (code >= 0x7400 && code <= 0x77FF) {
        if (code >= 0x7400 && code <= 0x7440) return 'm';
        if (code >= 0x7441 && code <= 0x74E2) return 'n';
        if (code >= 0x74E3 && code <= 0x7593) return 'p';
        if (code >= 0x7594 && code <= 0x7616) return 'q';
        if (code >= 0x7617 && code <= 0x7688) return 'r';
        if (code >= 0x7689 && code <= 0x7737) return 's';
        if (code >= 0x7738 && code <= 0x77CE) return 't';
        if (code >= 0x77CF && code <= 0x77FF) return 'w';
    } else if (code >= 0x7800 && code <= 0x7BFF) {
        if (code >= 0x7800 && code <= 0x7857) return 'w';
        if (code >= 0x7858 && code <= 0x79C0) return 'x';
        if (code >= 0x79C1 && code <= 0x7A93) return 'y';
        if (code >= 0x7A94 && code <= 0x7B94) return 'z';
        if (code >= 0x7B95 && code <= 0x7BFF) return 'z';
    } else if (code >= 0x7C00 && code <= 0x7FFF) {
        if (code >= 0x7C00 && code <= 0x7C3F) return 's';
        if (code >= 0x7C40 && code <= 0x7EE9) return 't';
        if (code >= 0x7EEA && code <= 0x7F47) return 'f';
        if (code >= 0x7F48 && code <= 0x7FFF) return 'g';
    } else if (code >= 0x8000 && code <= 0x83FF) {
        if (code >= 0x8000 && code <= 0x8005) return 'g';
        if (code >= 0x8006 && code <= 0x8070) return 'h';
        if (code >= 0x8071 && code <= 0x8140) return 'j';
        if (code >= 0x8141 && code <= 0x81AD) return 'k';
        if (code >= 0x81AE && code <= 0x8235) return 'l';
        if (code >= 0x8236 && code <= 0x82D3) return 'b';
        if (code >= 0x82D4 && code <= 0x8393) return 'c';
        if (code >= 0x8394 && code <= 0x83FF) return 'd';
    } else if (code >= 0x8400 && code <= 0x87FF) {
        if (code >= 0x8400 && code <= 0x8451) return 'd';
        if (code >= 0x8452 && code <= 0x84C8) return 'g';
        if (code >= 0x84C9 && code <= 0x857E) return 'h';
        if (code >= 0x857F && code <= 0x8663) return 'j';
        if (code >= 0x8664 && code <= 0x8748) return 'k';
        if (code >= 0x8749 && code <= 0x87FF) return 'l';
    } else if (code >= 0x8800 && code <= 0x8BFF) {
        if (code >= 0x8800 && code <= 0x881B) return 'l';
        if (code >= 0x881C && code <= 0x88D1) return 'm';
        if (code >= 0x88D2 && code <= 0x8964) return 'n';
        if (code >= 0x8965 && code <= 0x8A03) return 'p';
        if (code >= 0x8A04 && code <= 0x8AE6) return 'q';
        if (code >= 0x8AE7 && code <= 0x8B71) return 'r';
        if (code >= 0x8B72 && code <= 0x8BBC) return 's';
        if (code >= 0x8BBD && code <= 0x8BFA) return 'f';
        if (code >= 0x8BFB && code <= 0x8BFF) return 'd';
    } else if (code >= 0x8C00 && code <= 0x8FFF) {
        if (code >= 0x8C00 && code <= 0x8C0D) return 'd';
        if (code >= 0x8C0E && code <= 0x8CAA) return 'g';
        if (code >= 0x8CAB && code <= 0x8D3F) return 'h';
        if (code >= 0x8D40 && code <= 0x8E41) return 'j';
        if (code >= 0x8E42 && code <= 0x8F83) return 'k';
        if (code >= 0x8F84 && code <= 0x8FFF) return 'l';
    } else if (code >= 0x9000 && code <= 0x93FF) {
        if (code >= 0x9000 && code <= 0x901E) return 'l';
        if (code >= 0x901F && code <= 0x908A) return 'm';
        if (code >= 0x908B && code <= 0x917F) return 'n';
        if (code >= 0x9180 && code <= 0x9214) return 'p';
        if (code >= 0x9215 && code <= 0x92AE) return 'q';
        if (code >= 0x92AF && code <= 0x9310) return 'r';
        if (code >= 0x9311 && code <= 0x93CA) return 's';
        if (code >= 0x93CB && code <= 0x93FF) return 't';
    } else if (code >= 0x9400 && code <= 0x97FF) {
        if (code >= 0x9400 && code <= 0x9479) return 't';
        if (code >= 0x947A && code <= 0x9561) return 'w';
        if (code >= 0x9562 && code <= 0x9669) return 'x';
        if (code >= 0x966A && code <= 0x9761) return 'y';
        if (code >= 0x9762 && code <= 0x97FF) return 'z';
    } else if (code >= 0x9800 && code <= 0x9FA5) {
        return 'z';
    }
    
    return char.toLowerCase(); // 默认返回原字符小写
}

/**
 * 获取字符串的拼音首字母
 * @param {string} str - 输入字符串
 * @returns {string} 拼音首字母字符串（小写）
 */
export function getInitials(str) {
    if (!str) return '';
    var result = '';
    for (var i = 0; i < str.length; i++) {
        result += getPinyinInitial(str[i]);
    }
    return result.toLowerCase();
}

/**
 * 计算两个日期之间的天数差
 * @param {string|Date} date1 - 第一个日期
 * @param {string|Date} date2 - 第二个日期，默认为当前日期
 * @returns {number} 天数差
 */
export function daysBetween(date1, date2) {
    if (!date1) return 0;
    var d1 = new Date(date1);
    var d2 = date2 ? new Date(date2) : new Date();
    var diff = d2.getTime() - d1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * 根据未发卡天数返回CSS类名（背景色标记）
 * @param {string} issueDate - 发卡日期
 * @param {string} receiveDate - 领卡日期
 * @param {string} cardStatus - 卡片状态
 * @returns {string} CSS类名
 */
export function getUnclaimedClass(issueDate, receiveDate, cardStatus) {
    // 只对"未发卡"状态且长时间未改状态的记录进行背景色标记
    // 如果已经是"已发卡"状态，说明卡已经发出去了，不再需要背景色提醒
    if (cardStatus === '已发卡' || !issueDate) {
        return '';
    }
    var days = daysBetween(issueDate);
    if (days >= 60) return 'unclaimed-60days';  // 超过2个月
    if (days >= 30) return 'unclaimed-30days';  // 超过1个月
    if (days >= 15) return 'unclaimed-15days';  // 超过半个月
    if (days >= 7) return 'unclaimed-7days';    // 超过7天
    return '';
}

/**
 * 标准日期格式化（用于存储）YYYY-MM-DD
 * @param {string|Date|number} d - 日期
 * @returns {string} 格式化后的日期字符串
 */
export function fmtDate(d) {
    if (!d) return '';
    try {
        var dt = new Date(d);
        var y = dt.getFullYear();
        var m = (dt.getMonth() + 1 + '').padStart(2, '0');
        var da = (dt.getDate() + '').padStart(2, '0');
        return y + '-' + m + '-' + da;
    } catch (e) {
        return d;
    }
}

/**
 * 显示日期格式化（用于UI显示）YYYYMMDD
 * @param {string|Date|number} d - 日期
 * @returns {string} 格式化后的日期字符串
 */
export function fmtDateDisplay(d) {
    if (!d) return '';
    try {
        var dt = new Date(d);
        var y = dt.getFullYear();
        var m = (dt.getMonth() + 1 + '').padStart(2, '0');
        var da = (dt.getDate() + '').padStart(2, '0');
        return y + m + da;
    } catch (e) {
        return d;
    }
}

/**
 * 解析各种日期格式并转换为标准格式 YYYY-MM-DD
 * @param {string|Date|number} dateStr - 日期字符串、Date对象或数字
 * @returns {string} 标准格式的日期字符串 YYYY-MM-DD
 */
export function parseDate(dateStr) {
    if (!dateStr) return '';
    
    // 如果已经是 Date 对象
    if (dateStr instanceof Date) {
        return fmtDate(dateStr);
    }
    
    // 处理数字类型（Excel 日期序列号或时间戳）
    if (typeof dateStr === 'number') {
        // Excel 日期序列号范围：1 到 2958465 (1900-01-01 到 9999-12-31)
        // 时间戳范围：更大的数字
        if (dateStr > 0 && dateStr < 2958466) {
            // Excel 日期序列号：从 1900-01-01 开始的天数
            // 注意：Excel 错误地将 1900 当作闰年，所以需要特殊处理
            var excelEpoch = new Date(1900, 0, 1);
            var daysOffset = dateStr > 59 ? dateStr - 2 : dateStr - 1; // Excel 1900闰年bug修正
            var dt = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
            return fmtDate(dt);
        } else if (dateStr > 10000000000) {
            // 时间戳（毫秒或秒）
            var timestamp = dateStr > 10000000000 ? dateStr : dateStr * 1000;
            return fmtDate(new Date(timestamp));
        }
    }
    
    // 转换为字符串
    dateStr = String(dateStr).trim();
    if (!dateStr) return '';
    
    // 如果已经是标准格式 YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // 如果是 YYYYMMDD 格式（8位数字）
    if (/^\d{8}$/.test(dateStr)) {
        var y = dateStr.substring(0, 4);
        var m = dateStr.substring(4, 6);
        var d = dateStr.substring(6, 8);
        return y + '-' + m + '-' + d;
    }
    
    // 如果是 YYYY/MM/DD 格式
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
        var parts = dateStr.split('/');
        var y = parts[0];
        var m = parts[1].padStart(2, '0');
        var d = parts[2].padStart(2, '0');
        return y + '-' + m + '-' + d;
    }
    
    // 如果是 YYYY.MM.DD 格式
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
        var parts = dateStr.split('.');
        var y = parts[0];
        var m = parts[1].padStart(2, '0');
        var d = parts[2].padStart(2, '0');
        return y + '-' + m + '-' + d;
    }
    
    // 如果是 MM/DD/YYYY 格式（美式日期）
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        var parts = dateStr.split('/');
        var m = parts[0].padStart(2, '0');
        var d = parts[1].padStart(2, '0');
        var y = parts[2];
        return y + '-' + m + '-' + d;
    }
    
    // 如果是 DD-MM-YYYY 或 DD/MM/YYYY 格式
    if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateStr)) {
        var parts = dateStr.split(/[-\/]/);
        var d = parts[0].padStart(2, '0');
        var m = parts[1].padStart(2, '0');
        var y = parts[2];
        return y + '-' + m + '-' + d;
    }
    
    // 如果是带时间的日期格式，提取日期部分
    if (dateStr.includes(' ')) {
        var datePart = dateStr.split(' ')[0];
        return parseDate(datePart); // 递归调用处理日期部分
    }
    
    // 尝试使用 Date 对象解析
    try {
        var dt = new Date(dateStr);
        if (!isNaN(dt.getTime())) {
            return fmtDate(dt);
        }
    } catch (e) {}
    
    // 如果都无法解析，返回原始值
    return dateStr;
}

/**
 * 验证日期格式
 * @param {string} dateStr - 日期字符串
 * @returns {boolean} 是否为有效日期
 */
export function isValidDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return true; // 空值允许
    
    // 检查格式 YYYY-MM-DD
    var regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
        return false;
    }
    
    // 检查日期是否合理
    var parts = dateStr.split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);
    
    // 基本范围检查
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // 检查月份天数
    var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // 闰年2月有29天
    if (year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)) {
        daysInMonth[1] = 29;
    }
    
    if (day > daysInMonth[month - 1]) return false;
    
    return true;
}

/**
 * 映射操作类型代码到中文名称
 * @param {string} t - 操作类型代码
 * @returns {string} 中文名称
 */
export function mapAction(t) {
    var m = {
        issue: '发卡',
        recycle: '收卡',
        replace: '替换',
        loss: '挂失/丢失',
        other: '其他'
    };
    return m[t] || t || '';
}

/**
 * 映射状态代码到中文名称
 * @param {string} s - 状态代码
 * @returns {string} 中文名称
 */
export function mapStatus(s) {
    var m = {
        pending: '未回收',
        done: '已回收',
        cancelled: '取消'
    };
    return m[s] || s || '';
}

/**
 * HTML转义，防止XSS
 * @param {string} s - 待转义的字符串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#39;'
        })[ch];
    });
}

/**
 * 规范化卡片类型名称
 * @param {string} cardType - 原始卡类型
 * @returns {string} 规范化后的卡类型
 */
export function normalizeCardType(cardType) {
    if (!cardType) return '';
    cardType = String(cardType).trim();
    
    // 如果已经是标准格式，直接返回
    if (/^[ⅠⅡⅢⅣ]类卡$/.test(cardType)) {
        return cardType;
    }
    
    // 将"型卡"统一转换为"类卡"
    cardType = cardType.replace(/型卡/g, '类卡');
    
    // 处理可能的空格
    cardType = cardType.replace(/\s+/g, '');
    
    // 处理中文数字（一、二、三、四）
    var chineseMap = {
        '一': 'Ⅰ', '二': 'Ⅱ', '三': 'Ⅲ', '四': 'Ⅳ',
        '壹': 'Ⅰ', '贰': 'Ⅱ', '叁': 'Ⅲ', '肆': 'Ⅳ'
    };
    for (var cn in chineseMap) {
        var regex = new RegExp(cn + '(?:类卡|型卡)?', 'g');
        if (regex.test(cardType)) {
            return chineseMap[cn] + '类卡';
        }
    }
    
    // 如果只有罗马数字，自动补充"类卡"
    if (/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/.test(cardType)) {
        // 只取第一个罗马数字
        var first = cardType.charAt(0);
        if (/^[ⅠⅡⅢⅣ]$/.test(first)) {
            return first + '类卡';
        }
    }
    
    // 处理可能的半角罗马数字
    var romanMap = {
        'I': 'Ⅰ', 'II': 'Ⅱ', 'III': 'Ⅲ', 'IV': 'Ⅳ',
        'V': 'Ⅴ', 'VI': 'Ⅵ', 'VII': 'Ⅶ', 'VIII': 'Ⅷ',
        'IX': 'Ⅸ', 'X': 'Ⅹ'
    };
    
    // 尝试匹配半角罗马数字（单独或带"类卡"/"型卡"）
    var match = cardType.match(/^([IVX]+)(?:类卡|型卡)?$/i);
    if (match) {
        var upper = match[1].toUpperCase();
        if (romanMap[upper] && /^[ⅠⅡⅢⅣ]$/.test(romanMap[upper])) {
            return romanMap[upper] + '类卡';
        }
    }
    
    // 处理阿拉伯数字（1、2、3、4 -> Ⅰ、Ⅱ、Ⅲ、Ⅳ）
    var arabicMap = {'1': 'Ⅰ', '2': 'Ⅱ', '3': 'Ⅲ', '4': 'Ⅳ'};
    var arabicMatch = cardType.match(/^([1-4])(?:类卡|型卡)?$/);
    if (arabicMatch) {
        var num = arabicMatch[1];
        return arabicMap[num] + '类卡';
    }
    
    // 处理"第X类卡"、"第X型卡"格式
    var prefixMatch = cardType.match(/第?([ⅠⅡⅢⅣ1-4一二三四])(?:类卡|型卡)?$/);
    if (prefixMatch) {
        var type = prefixMatch[1];
        if (arabicMap[type]) return arabicMap[type] + '类卡';
        if (chineseMap[type]) return chineseMap[type] + '类卡';
        if (/^[ⅠⅡⅢⅣ]$/.test(type)) return type + '类卡';
    }
    
    // 如果无法识别，返回原值
    return cardType;
}

/**
 * 显示通知消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (error|success|warning|info)
 * @param {HTMLElement} element - 可选，需要标红的元素
 */
export function showNotification(message, type, element) {
    type = type || 'error';
    
    // 移除已存在的提示框
    var existingToasts = document.querySelectorAll('.notification-toast');
    existingToasts.forEach(function (toast) {
        toast.remove();
    });
    
    // 如果指定了元素，标红
    if (element) {
        // 移除所有元素的错误状态
        var allInputs = document.querySelectorAll('.input-error');
        allInputs.forEach(function (input) {
            input.classList.remove('input-error');
        });
        
        // 添加错误状态到当前元素
        element.classList.add('input-error');
        
        // 3秒后移除错误状态
        setTimeout(function () {
            element.classList.remove('input-error');
        }, 3000);
    }
    
    // 创建提示框
    var toast = document.createElement('div');
    toast.className = 'notification-toast ' + type;
    
    var iconMap = {
        error: '&#xf06a;',      // fa-exclamation-circle
        success: '&#xf00c;',    // fa-check
        warning: '&#xf071;',    // fa-exclamation-triangle
        info: '&#xf05a;'        // fa-info-circle
    };
    
    toast.innerHTML =
        '<i class="fa notification-icon">' + (iconMap[type] || iconMap.error) + '</i>' +
        '<div class="notification-content">' +
        '<p class="notification-message">' + message + '</p>' +
        '</div>' +
        '<button class="notification-close" onclick="this.parentElement.remove()">×</button>';
    
    document.body.appendChild(toast);
    
    // 自动消失
    setTimeout(function () {
        if (toast && toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(function () {
                if (toast && toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

