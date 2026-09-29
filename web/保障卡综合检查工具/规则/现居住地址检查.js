/**
 * 现居住地址检查
 * 功能：检查现居住地址是否完整、符合格式要求
 * 
 * 要求：
 * 1. 必须包含区/县级行政区划（区/县/旗等）
 * 2. 允许简化格式：省市区、省市县、省市市等
 * 3. 也支持详细地址（街道/镇/乡/村/路/号等）
 * 
 * 支持格式：
 * - 支持省份别名（如“广西省”和“广西壮族自治区”）
 * - 支持自治州（如“四川省凉山彝族自治州”）
 * - 支持内蒙古的盟、旗（如“锡林郭勒盟正镶白旗”）
 * - 支持林区（如“湖北省神农架林区”）
 * - 支持特别行政区（香港、澳门）
 * 
 * 示例：
 * ✅ 北京市朝阳区
 * ✅ 天津市和平区
 * ✅ 河北省石家庄市裕华区
 * ✅ 重庆市沙坪坝区乐山镇山东村1号
 * ✅ 内蒙古自治区锡林郭勒盟正镶白旗XX街道XX号
 * ✅ 湖北省神农架林区木鱼镇红花坪村
 * ✅ 四川省凉山彝族自治州西昌市XX路XX号
 * ❌ 重庆市（缺少区/县级行政区划）
 * ❌ XX小区（缺少行政区划）
 */
(function() {
    'use strict';
    
    function checkXianjuzhudizhi(data) {
        var errors = [];
        var ruleName = "现居住地址检查";
        
        var isEmpty = window.DataCheckUtils ? window.DataCheckUtils.isEmpty : function(v) {
            return v === null || v === undefined || String(v).trim() === '';
        };
        var getIdNumber = window.DataCheckUtils ? window.DataCheckUtils.getIdNumber : function(row) {
            return row['公民身份号码'] || row['身份证号码'] || '';
        };
        var getName = window.DataCheckUtils ? window.DataCheckUtils.getName : function(row) {
            return row['姓名'] || '';
        };
        
        /**
         * 省份别名映射表
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
         * 标准化省份名称
         * 将各种写法统一为标准名称
         */
        function normalizeProvince(address) {
            if (!address) return address;
            var addr = String(address).trim();
            
            // 检查是否包含别名，如果有则替换
            for (var alias in provinceAliases) {
                if (provinceAliases.hasOwnProperty(alias) && addr.indexOf(alias) !== -1) {
                    // 检查是否已经是完整名称
                    var fullName = provinceAliases[alias];
                    if (addr.indexOf(fullName) === -1) {
                        addr = addr.replace(alias, fullName);
                    }
                }
            }
            
            return addr;
        }
        
        // 详细地址关键词
        var detailKeywords = [
            '街道', '街', '路', '巷', '弄', '号', '栋', '幢', '单元', '室', '层',
            '镇', '乡', '村', '社区', '小区', '大厦', '广场', '花园', '公寓',
            '苑', '园', '庄', '里', '坊', '区', '组', '队', '屯', '营', '场',
            '道', '胡同', '条', '排', '幢', '座'
        ];
        
        // 行政区划关键词
        var provinceKeywords = ['省', '市', '自治区', '特别行政区'];
        var cityKeywords = ['市', '地区', '州', '盟', '林区'];  // 增加"林区"（如神农架林区）
        var districtKeywords = ['区', '县', '旗', '市'];  // "旗"用于内蒙古
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var dizhi = row["现居住地址"];
            
            var hasError = false;
            var errorDetail = "";
            
            if (isEmpty(dizhi)) {
                errorDetail = "现居住地址不能为空";
                hasError = true;
            } else {
                // 先标准化省份名称
                var dizhiStr = normalizeProvince(String(dizhi).trim());
                
                // 检查是否包含区/县级行政区划
                var hasDistrict = false;
                for (var dt = 0; dt < districtKeywords.length; dt++) {
                    if (dizhiStr.indexOf(districtKeywords[dt]) !== -1) {
                        hasDistrict = true;
                        break;
                    }
                }
                
                if (!hasDistrict) {
                    errorDetail = "现居住地址必须写到区/县级: " + dizhiStr + " (应包含区、县、旗等行政区划)";
                    hasError = true;
                }
            }
            
            if (hasError) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue || "",
                    "姓名": nameValue || "",
                    "人员类别": personType || "",
                    "当前值": dizhi || "",
                    "错误详情": errorDetail,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkXianjuzhudizhi = checkXianjuzhudizhi;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('现居住地址检查', checkXianjuzhudizhi, '基础信息', '检查现居住地址的有效性和格式');
    }
})();
