/**
 * 联系电话生成器
 * 功能：为缺失的联系电话字段生成合法的手机号码
 * 
 * 生成规则：
 * 1. 使用真实的运营商号段（中国移动、联通、电信）
 * 2. 号码格式：3位前缀 + 8位随机数字
 * 3. 自动去重，确保不重复
 */
(function() {
    /**
     * 中国移动号段
     */
    var MOBILE_PREFIXES = [
        '134','135','136','137','138','139',
        '147','148','150','151','152',
        '157','158','159',
        '165','172','178',
        '182','183','184','187','188',
        '195','197','198'
    ];
    /**
     * 中国联通号段
     */
    var UNICOM_PREFIXES = [
        '130','131','132','145','146','155','156','166','167','171',
        '175','176','185','186','196'
    ];
    var TELECOM_PREFIXES = [
        '133','141',
        '149','153',
        '162','170','173','174','177',
        '180','181','189','190','191','193','199'
    ];
    var BROADNET_PREFIXES = [
        '192'
    ];
    
    /**
     * 所有可用号段集合
     */
    var PHONE_PREFIXES = MOBILE_PREFIXES
        .concat(UNICOM_PREFIXES)
        .concat(TELECOM_PREFIXES)
        .concat(BROADNET_PREFIXES);
    
    /**
     * 生成唯一的手机号码
     * @param {object} existing - 已存在的号码集合
     * @param {array} prefixes - 号段列表
     * @returns {string} 生成的手机号码
     */
    function generateUniquePhone(existing, prefixes) {
        var maxAttempts = 100;
        for (var i = 0; i < maxAttempts; i++) {
            var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            var suffix = '';
            for (var j = 0; j < 8; j++) {
                suffix += Math.floor(Math.random() * 10);
            }
            var phone = prefix + suffix;
            if (!existing[phone]) {
                return phone;
            }
        }
        return prefixes[0] + '00000000';
    }
    
    /**
     * 主生成函数
     * 为数据中缺失的联系电话字段生成号码
     * @param {array} rows - 数据行数组
     * @param {array} originalData - 原始数据
     * @param {array} headers - 表头数组
     * @returns {object} 包含生成数量和颜色标记信息
     */
    function generatePhoneNumber(rows, originalData, headers) {
        var existingPhones = {};
        var count = 0;
        var colors = {};
        
        for (var i = 0; i < rows.length; i++) {
            var phone = rows[i]['联系电话'];
            if (phone && String(phone).trim() !== '') {
                existingPhones[String(phone)] = true;
            }
        }
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var phone = row['联系电话'];
            var origRow = originalData[i + 1];
            var origPhone = origRow ? origRow[headers.indexOf('联系电话')] : '';
            
            if (!phone || String(phone).trim() === '') {
                var newPhone = generateUniquePhone(existingPhones, PHONE_PREFIXES);
                row['联系电话'] = newPhone;
                existingPhones[newPhone] = true;
                
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, '联系电话', 'yellow');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i]['联系电话'] = 'yellow';
                }
                count++;
            } else if (origPhone && String(origPhone).trim() !== '' && 
                       String(phone).trim() !== String(origPhone).trim()) {
                // 使用统一的颜色标记函数
                if (window.DataCheckUtils && window.DataCheckUtils.markCellColor) {
                    window.DataCheckUtils.markCellColor(colors, i, '联系电话', 'orange');
                } else {
                    if (!colors[i]) colors[i] = {};
                    colors[i]['联系电话'] = 'orange';
                }
            }
        }
        
        return {count: count, colors: colors};
    }
    
    if (typeof window.DATA_GENERATORS !== 'undefined') {
        window.DATA_GENERATORS['联系电话生成'] = {
        name: '联系电话生成',
        description: '根据籍贯生成手机号码',
        icon: '<i class="fa fa-mobile"></i>',
        func: generatePhoneNumber
        };
    }
})();

