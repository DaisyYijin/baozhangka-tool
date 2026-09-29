/**
 * 发卡收卡登记系统 - 配置和状态管理
 */

import { loadConfig, loadRecords, loadCurrentSubTab } from './存储处理.js';

/**
 * 全局状态对象
 */
export const state = {
    config: loadConfig(),
    records: loadRecords(),
    filters: {
        action: '',
        status: '',
        cardType: '',
        keyword: '',
        cardStatus: '',
        yearByIssueDate: '',
        yearByReceiveDate: '',
        issueStartDate: '',
        issueEndDate: '',
        receiveStartDate: '',
        receiveEndDate: '',
        recycleStartDate: '',
        recycleEndDate: ''
    },
    sort: {
        column: '',
        direction: ''
    },
    selected: [],
    pagination: {
        currentPage: 1,
        pageSize: 50,  // 每页显示50条
        totalPages: 1,
        totalRecords: 0
    },
    currentSubTab: loadCurrentSubTab(),
    isEditing: false
};

/**
 * 获取当前状态的快照（用于调试）
 */
export function getStateSnapshot() {
    return {
        recordCount: state.records.length,
        currentSubTab: state.currentSubTab,
        filters: {...state.filters},
        pagination: {...state.pagination},
        selectedCount: state.selected.length
    };
}

/**
 * 重置过滤器
 */
export function resetFilters() {
    state.filters = {
        action: '',
        status: '',
        cardType: '',
        keyword: '',
        cardStatus: '',
        yearByIssueDate: '',
        yearByReceiveDate: '',
        issueStartDate: '',
        issueEndDate: '',
        receiveStartDate: '',
        receiveEndDate: '',
        recycleStartDate: '',
        recycleEndDate: ''
    };
}

/**
 * 重置排序
 */
export function resetSort() {
    state.sort = {
        column: '',
        direction: ''
    };
}

/**
 * 清除选择
 */
export function clearSelection() {
    state.selected = [];
}

export default state;

