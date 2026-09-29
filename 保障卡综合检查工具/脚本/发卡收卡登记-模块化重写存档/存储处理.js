/**
 * 发卡收卡登记系统 - 数据存储模块
 * 负责所有localStorage操作，包括记录、配置和子标签状态
 */

// 存储键名常量
const STORAGE_KEY = 'cardRegistry.records';
const CONFIG_KEY = 'cardRegistry.config';
const SUBTAB_KEY = 'cardRegistry.currentSubTab';

// 默认配置
const DEFAULT_CONFIG = {
    cardTypes: ['Ⅰ类卡', 'Ⅱ类卡', 'Ⅲ类卡', 'Ⅳ类卡'],
    defaultCardType: 'Ⅰ类卡',  // 默认卡类型
    commonDepartments: [],  // 常用部门列表
    actions: {
        types: ['issue', 'recycle', 'replace', 'loss', 'other'],
        reasons: ['退伍回收', '复员回收', '转业回收', '损坏回收', '纠错回收', '更换回收', '消磁回收', '其他原因回收'],
        channels: ['frontdesk', 'batch', 'proxy']
    },
    ui: {dateFormat: 'YYYY-MM-DD'}
};

/**
 * 加载配置
 * @returns {Object} 配置对象
 */
export function loadConfig() {
    try {
        var cfg = JSON.parse(localStorage.getItem(CONFIG_KEY)) || DEFAULT_CONFIG;
        // 确保新字段存在
        if (!cfg.defaultCardType) cfg.defaultCardType = 'Ⅰ类卡';
        if (!cfg.commonDepartments) cfg.commonDepartments = [];
        return cfg;
    } catch (e) {
        console.error('加载配置失败:', e);
        return DEFAULT_CONFIG;
    }
}

/**
 * 保存配置
 * @param {Object} cfg - 配置对象
 * @returns {boolean} 是否成功
 */
export function saveConfig(cfg) {
    try {
        if (cfg) {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
            return true;
        }
        return false;
    } catch (e) {
        console.error('保存配置失败:', e);
        return false;
    }
}

/**
 * 加载所有记录
 * @returns {Array} 记录数组
 */
export function loadRecords() {
    try {
        var data = localStorage.getItem(STORAGE_KEY);
        if (!data || data === 'undefined' || data === 'null') {
            return [];
        }
        return JSON.parse(data) || [];
    } catch (e) {
        console.error('加载记录失败:', e);
        return [];
    }
}

/**
 * 保存所有记录
 * @param {Array} list - 记录数组
 * @returns {boolean} 是否成功
 */
export function saveRecords(list) {
    try {
        if (!list || !Array.isArray(list)) {
            console.error('saveRecords: 参数无效', list);
            return false;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return true;
    } catch (e) {
        console.error('保存记录失败:', e);
        if (window.NotificationManager) {
            window.NotificationManager.error('保存数据失败：' + e.message);
        }
        return false;
    }
}

/**
 * 加载当前子标签状态
 * @returns {string} 子标签名称 ('issue' 或 'recycle')
 */
export function loadCurrentSubTab() {
    try {
        return localStorage.getItem(SUBTAB_KEY) || 'issue';
    } catch (e) {
        console.error('加载子标签状态失败:', e);
        return 'issue';
    }
}

/**
 * 保存当前子标签状态
 * @param {string} tab - 子标签名称
 * @returns {boolean} 是否成功
 */
export function saveCurrentSubTab(tab) {
    try {
        localStorage.setItem(SUBTAB_KEY, tab);
        return true;
    } catch (e) {
        console.error('保存子标签状态失败:', e);
        return false;
    }
}

/**
 * 获取默认配置（用于重置）
 * @returns {Object} 默认配置对象
 */
export function getDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // 深拷贝
}

/**
 * 清除所有数据（谨慎使用）
 * @returns {boolean} 是否成功
 */
export function clearAllStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CONFIG_KEY);
        localStorage.removeItem(SUBTAB_KEY);
        return true;
    } catch (e) {
        console.error('清除存储失败:', e);
        return false;
    }
}

/**
 * 获取存储使用情况
 * @returns {Object} 包含大小信息的对象
 */
export function getStorageInfo() {
    try {
        var records = localStorage.getItem(STORAGE_KEY) || '';
        var config = localStorage.getItem(CONFIG_KEY) || '';
        var subtab = localStorage.getItem(SUBTAB_KEY) || '';
        
        return {
            totalSize: records.length + config.length + subtab.length,
            recordsSize: records.length,
            configSize: config.length,
            subtabSize: subtab.length,
            recordCount: JSON.parse(records || '[]').length
        };
    } catch (e) {
        console.error('获取存储信息失败:', e);
        return {
            totalSize: 0,
            recordsSize: 0,
            configSize: 0,
            subtabSize: 0,
            recordCount: 0
        };
    }
}

export {DEFAULT_CONFIG, STORAGE_KEY, CONFIG_KEY, SUBTAB_KEY};

