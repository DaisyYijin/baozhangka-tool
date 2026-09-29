(function(window) {
    'use strict';
    
    var PersonnelTypeUtils = {};
    
    PersonnelTypeUtils.CATEGORIES = {
        OFFICER: {
            name: '军官',
            types: [
                '指挥管理军官',
                '专业技术军官'
            ]
        },
        CADRE: {
            name: '干部',
            types: [
                '军政后装军官',
                '专业技术军官',
                '其他军官',
                '专业技术文职干部',
                '非专业技术文职干部',
                '其他文职干部',
                '生长干部学员'
            ]
        },
        SOLDIER: {
            name: '士兵',
            types: [
                '军士',
                '义务兵',
                '军士学员'
            ]
        },
        UNCONVERTED_SOLDIER: {
            name: '未转换士兵',
            types: [
                '士官',
                '兵',
                '其他士兵',
                '培养士官学员'
            ]
        },
        CIVILIAN: {
            name: '文职人员',
            types: [
                '转改管理文职人员',
                '转改技术文职人员',
                '招录管理文职人员',
                '招录技术文职人员',
                '专业技能文职人员'
            ]
        },
        EMPLOYEE: {
            name: '职工',
            types: [
                '在编职员',
                '非编职员',
                '在编工人',
                '非编工人'
            ]
        },
        NON_ACTIVE: {
            name: '非现役',
            types: [
                '非现役文职人员',
                '非现役公勤人员'
            ]
        },
        RETIRED: {
            name: '离退休人员',
            types: [
                '离休干部',
                '退休干部',
                '退休军官',
                '退休士兵',
                '离休职工',
                '退休职工',
                '退休军士',
                '退休士官'
            ]
        }
    };
    
    PersonnelTypeUtils.CHECK_WORK_DATE_TYPES = [
        '指挥管理军官',
        '专业技术军官',
        '军政后装军官',
        '其他军官',
        '专业技术文职干部',
        '非专业技术文职干部',
        '其他文职干部',
        '生长干部学员',
        '转改管理文职人员',
        '转改技术文职人员',
        '招录管理文职人员',
        '招录技术文职人员',
        '专业技能文职人员'
    ];
    
    PersonnelTypeUtils.CHECK_WORK_TIME_TYPES = [
        '军士',
        '义务兵',
        '军士学员',
        '士官',
        '兵',
        '其他士兵',
        '培养士官学员',
        '在编职员',
        '非编职员',
        '在编工人',
        '非编工人',
        '非现役文职人员',
        '非现役公勤人员',
        '离休干部',
        '退休干部',
        '退休军官',
        '退休士兵',
        '离休职工',
        '退休职工',
        '退休军士',
        '退休士官'
    ];
    
    PersonnelTypeUtils.shouldCheckWorkDate = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        
        for (var i = 0; i < PersonnelTypeUtils.CHECK_WORK_DATE_TYPES.length; i++) {
            if (PersonnelTypeUtils.CHECK_WORK_DATE_TYPES[i] === typeStr) {
                return true;
            }
        }
        return false;
    };
    
    PersonnelTypeUtils.shouldCheckWorkTime = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        
        for (var i = 0; i < PersonnelTypeUtils.CHECK_WORK_TIME_TYPES.length; i++) {
            if (PersonnelTypeUtils.CHECK_WORK_TIME_TYPES[i] === typeStr) {
                return true;
            }
        }
        return false;
    };
    
    PersonnelTypeUtils.getCategoryName = function(personnelType) {
        if (!personnelType) return null;
        var typeStr = String(personnelType).trim();
        
        for (var categoryKey in PersonnelTypeUtils.CATEGORIES) {
            var category = PersonnelTypeUtils.CATEGORIES[categoryKey];
            for (var i = 0; i < category.types.length; i++) {
                if (category.types[i] === typeStr) {
                    return category.name;
                }
            }
        }
        return null;
    };
    
    PersonnelTypeUtils.belongsToCategory = function(personnelType, categoryName) {
        if (!personnelType || !categoryName) return false;
        var typeStr = String(personnelType).trim();
        var catName = String(categoryName).trim();
        
        for (var categoryKey in PersonnelTypeUtils.CATEGORIES) {
            var category = PersonnelTypeUtils.CATEGORIES[categoryKey];
            if (category.name === catName) {
                for (var i = 0; i < category.types.length; i++) {
                    if (category.types[i] === typeStr) {
                        return true;
                    }
                }
                return false;
            }
        }
        return false;
    };
    
    PersonnelTypeUtils.isOfficer = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        return PersonnelTypeUtils.CATEGORIES.OFFICER.types.indexOf(typeStr) !== -1;
    };
    
    PersonnelTypeUtils.isCadre = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        return PersonnelTypeUtils.CATEGORIES.CADRE.types.indexOf(typeStr) !== -1;
    };
    
    PersonnelTypeUtils.isSoldier = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        return PersonnelTypeUtils.CATEGORIES.SOLDIER.types.indexOf(typeStr) !== -1 ||
               PersonnelTypeUtils.CATEGORIES.UNCONVERTED_SOLDIER.types.indexOf(typeStr) !== -1;
    };
    
    PersonnelTypeUtils.isCivilian = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        return PersonnelTypeUtils.CATEGORIES.CIVILIAN.types.indexOf(typeStr) !== -1;
    };
    
    PersonnelTypeUtils.isRetired = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        return PersonnelTypeUtils.CATEGORIES.RETIRED.types.indexOf(typeStr) !== -1;
    };
    
    PersonnelTypeUtils.isEmployee = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        return PersonnelTypeUtils.CATEGORIES.EMPLOYEE.types.indexOf(typeStr) !== -1;
    };
    
    PersonnelTypeUtils.isNonActive = function(personnelType) {
        if (!personnelType) return false;
        var typeStr = String(personnelType).trim();
        return PersonnelTypeUtils.CATEGORIES.NON_ACTIVE.types.indexOf(typeStr) !== -1;
    };
    
    PersonnelTypeUtils.shouldCheckEnlistmentLocation = function(personnelType) {
        if (!personnelType) return true; // 默认需要检查
        var typeStr = String(personnelType).trim();
        
        // 文职人员、职工、非现役、离退休人员不需要检查入伍地
        return !PersonnelTypeUtils.isCivilian(typeStr) &&
               !PersonnelTypeUtils.isEmployee(typeStr) &&
               !PersonnelTypeUtils.isNonActive(typeStr) &&
               !PersonnelTypeUtils.isRetired(typeStr);
    };
    
    window.PersonnelTypeUtils = PersonnelTypeUtils;
    window.PTU = PersonnelTypeUtils;
    
})(window);
