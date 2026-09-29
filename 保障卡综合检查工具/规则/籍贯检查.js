/**
 * 籍贯检查
 * 功能：检查籍贯的格式是否正确
 * 
 * 要求：
 * 1. 不能为空
 * 2. 允许简单格式，如"北京市"、"浙江省"、"广西壮族自治区"
 * 3. 必须包含省级/直辖市/自治区/特别行政区
 * 
 * 支持格式：
 * 1. 直辖市：北京市、上海市、天津市、重庆市
 * 2. 省：XX省（如：浙江省、河北省）
 * 3. 自治区：XX自治区（如：广西壮族自治区、内蒙古自治区）
 * 4. 特别行政区：香港特别行政区、澳门特别行政区
 * 5. 省+市：XX省XX市（可选，允许更详细）
 * 6. 支持省份别名（如"广西省"自动识别为"广西壮族自治区"）
 * 
 * 示例：
 * ✅ 北京市
 * ✅ 浙江省
 * ✅ 广西壮族自治区
 * ✅ 河北省石家庄市（允许详细地址）
 * ✅ 内蒙古自治区
 * ❌ 空值
 * ❌ 石家庄（缺少省级）
 */
(function() {
    'use strict';
    
    function checkJiguan(data) {
        var errors = [];
        var ruleName = "籍贯检查";
        
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
        function normalizeProvince(location) {
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
         * 验证籍贯格式
         */
        function isValidJiguan(location) {
            if (!location || String(location).trim() === "") {
                return { valid: false, message: "籍贯不能为空" };
            }
            
            // 先标准化省份名称
            var loc = normalizeProvince(String(location).trim());
            
            // 检查是否包含省份、自治区、特别行政区或直辖市
            var hasProvinceOrCity = loc.indexOf("省") !== -1 || 
                                   loc.indexOf("市") !== -1 || 
                                   loc.indexOf("自治区") !== -1 || 
                                   loc.indexOf("特别行政区") !== -1;
            
            if (!hasProvinceOrCity) {
                return { valid: false, message: "籍贯格式错误，应包含省份、直辖市、自治区或特别行政区（如：浙江省、北京市、广西壮族自治区等）" };
            }
            
            return { valid: true };
        }
        
        for (var idx = 0; idx < data.length; idx++) {
            var row = data[idx];
            var excelRow = idx + 2;
            var idValue = getIdNumber(row);
            var nameValue = getName(row);
            var personType = row["人员类别"];
            var jiguan = row["籍贯"];
            
            var validation = isValidJiguan(jiguan);
            
            if (!validation.valid) {
                errors.push({
                    "行号": excelRow,
                    "身份证号码": idValue,
                    "姓名": nameValue,
                    "人员类别": personType || "",
                    "当前值": jiguan || "",
                    "错误详情": validation.message,
                    "规则名称": ruleName
                });
            }
        }
        
        return errors;
    }
    
    window.checkJiguan = checkJiguan;
    
    // 自动注册规则
    if (typeof registerValidationRule === 'function') {
        registerValidationRule('籍贯检查', checkJiguan, '基础信息', '检查籍贯的有效性和格式');
    }
})();
