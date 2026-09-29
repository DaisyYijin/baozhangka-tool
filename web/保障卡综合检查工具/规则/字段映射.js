/**
 * 字段映射表
 * 统一管理所有字段的标准名称和别名
 * 支持字段名的向后兼容
 */
(function(window) {
    'use strict';
    
    var FieldMappings = {
        // ==================== 标准字段名定义 ====================
        STANDARD_FIELDS: {
            // 身份信息
            ID_NUMBER: '公民身份号码',           // 标准身份证字段（18位）
            NAME: '姓名',
            GENDER: '性别',
            BIRTH_DATE: '出生日期',
            NATION: '民族',
            
            // 证件信息（独立字段，不可与身份证混用）
            CERT_NUMBER: '证件编号',             // 军队证件编号（如"军字第20190901001号"）
            CERT_TYPE: '证件类型',               // 证件类型（如"军官证"、"军士证"）
            ID_START_DATE: '身份证件起始日期',
            ID_END_DATE: '身份证件终止日期',
            
            // 个人信息
            BLOOD_TYPE: '血型',
            MARITAL_STATUS: '婚姻状况',
            MARRIAGE_DATE: '婚姻日期',
            PHONE: '联系电话',
            ADDRESS: '现居住地址',
            ONLY_CHILD: '是否独生子女',
            NATIVE_PLACE: '籍贯',
            BIRTH_PLACE: '出生地',
            
            // 教育信息
            EDUCATION: '文化程度',
            DEGREE: '学位',
            ADMISSION_DATE: '入学日期',
            GRADUATION_DATE: '毕业日期',
            GRADUATE_SCHOOL: '毕业院校',
            
            // 工作信息
            PERSONNEL_TYPE: '人员类别',
            RANK: '军衔文职级',
            POSITION_LEVEL: '岗位职务层级',
            SALARY_LEVEL: '待遇级别',
            WORK_START_DATE: '工作日期',
            ENLISTMENT_DATE: '入伍日期',
            ENLISTMENT_PLACE: '入伍地',
            
            // 政治面貌
            POLITICAL_STATUS: '政治面貌',
            
            // 组织信息
            UNIT_NAME: '行政单位名称',
            UNIT_LOCATION: '单位驻地',
            UNIT_AREA_CODE: '单位驻地行政区划代码',
            ORG_RELATION: '组织关系机构名称',
            
            // 保障信息
            MEDICAL_UNIT: '医疗保障单位',
            BASIC_MEDICAL: '基层医疗机构',
            SYSTEM_HOSPITAL: '体系医院',
            SALARY_UNIT: '工薪发放单位',
            CLOTHING_UNIT: '被装发放单位',
            CLOTHING_SIZE: '服装登记表号',
            
            // 体型数据
            HEIGHT: '身高',
            BUST: '胸围',
            WAIST: '腰围',
            
            // 注册码
            SOLIDIFIED_CODE: '固化注册码',
            SOLDIER_CODE: '士兵注册码',
            
            // 配偶信息
            SPOUSE_ID: '爱人成员公民身份号码',
            SPOUSE_NAME: '爱人成员姓名',
            SPOUSE_BIRTH_DATE: '爱人成员出生日期',
            SPOUSE_WORK_UNIT: '爱人成员工作单位',
            SPOUSE_WORK_START_DATE: '爱人成员参加工作日期',
            SPOUSE_MILITARY_STATUS: '爱人随军状况',
            SPOUSE_MILITARY_DATE: '爱人随军日期',
            
            // 士官相关
            NCO_SELECTION_DATE: '选改士官日期'
        },
        
        // ==================== 身份证字段别名（只包含身份证相关字段）====================
        ID_NUMBER_ALIASES: [
            '公民身份号码',  // 标准名称
            '身份证号码',    // 常用别名
            '身份证号',      // 简称
            'idNumber',     // 英文别名
            'idCard'        // 英文别名
        ],
        
        // [!] 重要说明：证件编号不是身份证号的别名！
        // 证件编号格式：军字第20190901001号（军队证件）
        // 身份证号格式：110101199001011234（18位数字）
        
        // ==================== 字段别名映射 ====================
        ALIASES: {
            // 身份证号别名（只包含身份证字段）
            '身份证号码': '公民身份号码',
            '身份证号': '公民身份号码',
            'idNumber': '公民身份号码',
            'idCard': '公民身份号码',
            
            // 其他常见别名
            '手机号': '联系电话',
            '电话': '联系电话',
            '联系方式': '联系电话',
            
            '现住址': '现居住地址',
            '住址': '现居住地址',
            '家庭住址': '现居住地址',
            
            '学历': '文化程度',
            
            '职务': '岗位职务层级',
            '军衔': '军衔文职级',
            
            '单位': '行政单位名称',
            '所在单位': '行政单位名称',
            
            // 注意：证件编号不应作为任何字段的别名
        },
        
        // ==================== 获取标准字段名 ====================
        /**
         * 获取标准字段名
         * @param {string} fieldName - 输入的字段名
         * @returns {string} 标准字段名
         */
        getStandardField: function(fieldName) {
            if (!fieldName) return '';
            return this.ALIASES[fieldName] || fieldName;
        },
        
        // ==================== 获取身份证号 ====================
        /**
         * 从行对象中获取身份证号（只支持身份证字段，不包括证件编号）
         * @param {Object} row - 数据行对象
         * @returns {string} 身份证号，找不到返回空字符串
         */
        getIdNumber: function(row) {
            if (!row) return '';
            
            // 按优先级尝试获取身份证号
            for (var i = 0; i < this.ID_NUMBER_ALIASES.length; i++) {
                var fieldName = this.ID_NUMBER_ALIASES[i];
                var value = row[fieldName];
                if (value && String(value).trim() !== '') {
                    return String(value).trim();
                }
            }
            
            return '';
        },
        
        // ==================== 获取证件编号（独立方法）====================
        /**
         * 从行对象中获取证件编号（军队证件编号，独立字段，不与身份证混用）
         * @param {Object} row - 数据行对象
         * @returns {string} 证件编号，找不到返回空字符串
         */
        getCertNumber: function(row) {
            if (!row) return '';
            var value = row['证件编号'];
            return value ? String(value).trim() : '';
        },
        
        // ==================== 获取证件类型 ====================
        /**
         * 从行对象中获取证件类型
         * @param {Object} row - 数据行对象
         * @returns {string} 证件类型
         */
        getCertType: function(row) {
            if (!row) return '';
            var value = row['证件类型'];
            return value ? String(value).trim() : '';
        },
        
        // ==================== 获取姓名 ====================
        /**
         * 从行对象中获取姓名
         * @param {Object} row - 数据行对象
         * @returns {string} 姓名
         */
        getName: function(row) {
            if (!row) return '';
            var value = row['姓名'];
            return value ? String(value).trim() : '';
        },
        
        // ==================== 智能字段获取 ====================
        /**
         * 智能获取字段值（处理字段名变化和别名）
         * @param {Object} row - 数据行对象
         * @param {string} standardFieldName - 标准字段名
         * @param {Array} aliases - 字段别名数组（可选）
         * @returns {any} 字段值，找不到返回 undefined
         */
        getFieldValue: function(row, standardFieldName, aliases) {
            if (!row) return undefined;
            
            // 先尝试标准字段名
            if (standardFieldName in row) {
                return row[standardFieldName];
            }
            
            // 尝试从全局别名映射中查找
            var mappedName = this.ALIASES[standardFieldName];
            if (mappedName && mappedName in row) {
                return row[mappedName];
            }
            
            // 尝试提供的别名列表
            if (aliases && Array.isArray(aliases)) {
                for (var i = 0; i < aliases.length; i++) {
                    var alias = aliases[i];
                    if (alias in row) {
                        return row[alias];
                    }
                }
            }
            
            return undefined;
        },
        
        // ==================== 检查字段是否存在 ====================
        /**
         * 检查字段是否存在（考虑别名）
         * @param {Object} row - 数据行对象
         * @param {string} fieldName - 字段名
         * @returns {boolean} 是否存在
         */
        hasField: function(row, fieldName) {
            if (!row) return false;
            
            // 检查标准名
            if (fieldName in row) return true;
            
            // 检查别名
            var standardName = this.getStandardField(fieldName);
            if (standardName !== fieldName && standardName in row) return true;
            
            return false;
        },
        
        // ==================== 字段信息说明 ====================
        /**
         * 获取字段说明信息
         * @param {string} fieldName - 字段名
         * @returns {Object} 字段信息 {standardName, description, type}
         */
        getFieldInfo: function(fieldName) {
            var standardName = this.getStandardField(fieldName);
            
            // 字段类型和描述映射
            var fieldInfoMap = {
                '公民身份号码': {
                    type: 'idNumber',
                    description: '18位公民身份证号码',
                    format: '110101199001011234',
                    pattern: /^\d{18}$/
                },
                '证件编号': {
                    type: 'certNumber',
                    description: '军队证件编号',
                    format: '军字第20190901001号',
                    pattern: /^[军士兵学文退]字第\d{11}号$/
                },
                '联系电话': {
                    type: 'phone',
                    description: '11位手机号码',
                    format: '13800138000',
                    pattern: /^\d{11}$/
                },
                '血型': {
                    type: 'bloodType',
                    description: '血型（ABO+RH）',
                    format: 'A型RH+',
                    values: ['A型RH+', 'B型RH+', 'O型RH+', 'AB型RH+', 'A型RH-', 'B型RH-', 'O型RH-', 'AB型RH-']
                },
                '婚姻状况': {
                    type: 'maritalStatus',
                    description: '婚姻状况',
                    values: ['未婚', '已婚', '离婚', '丧偶']
                },
                '文化程度': {
                    type: 'education',
                    description: '文化程度/学历',
                    values: ['文盲或半文盲', '小学', '初中', '高中', '技工学校', '中等专业学校或中等技术学校', 
                            '大学专科和专科学校', '大学本科（简称大学）', '研究生']
                }
                // 可以继续添加更多字段信息
            };
            
            return fieldInfoMap[standardName] || {
                type: 'text',
                description: standardName
            };
        }
    };
    
    // 挂载到全局
    window.FieldMappings = FieldMappings;
    
})(window);

