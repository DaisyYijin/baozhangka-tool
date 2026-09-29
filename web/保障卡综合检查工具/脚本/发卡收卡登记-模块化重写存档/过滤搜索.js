/**
 * 发卡收卡登记系统 - 搜索过滤模块
 * 负责记录的搜索、过滤、年度筛选、日期范围筛选等功能
 */

import { getInitials, parseDate } from './工具函数.js';
import { state, resetFilters as resetStateFilters } from './配置.js';

/**
 * 获取过滤后的记录
 * @returns {Array} 过滤后的记录数组
 */
export function getFilteredRecords() {
    const f = state.filters;
    
    return state.records.filter(function(r){
        // 操作类型过滤（发卡/收卡）
        if (f.action && r.action !== f.action) return false;
        
        // 卡片状态过滤（已发卡/未发卡）
        if (f.cardStatus && r.cardStatus !== f.cardStatus) return false;
        
        // 收卡状态过滤（pending/done）
        if (f.status && r.status !== f.status) return false;
        
        // 卡类型过滤
        if (f.cardType && r.cardType !== f.cardType) return false;
        
        // 回收原因过滤
        if (f.recycleReason && r.reason !== f.recycleReason) return false;
        
        // 发卡日期年度筛选
        if (f.yearByIssueDate) {
            if (!r.issueDate) return false;
            const year = r.issueDate.split('-')[0];
            if (year !== f.yearByIssueDate) return false;
        }
        
        // 领卡日期年度筛选（仅发卡登记）
        if (f.yearByReceiveDate && state.currentSubTab === 'issue') {
            if (!r.receiveDate) return false;
            const year = r.receiveDate.split('-')[0];
            if (year !== f.yearByReceiveDate) return false;
        }
        
        // 发卡日期范围筛选
        if (f.issueStartDate || f.issueEndDate) {
            if (!r.issueDate) return false;
            if (f.issueStartDate && r.issueDate < f.issueStartDate) return false;
            if (f.issueEndDate && r.issueDate > f.issueEndDate) return false;
        }
        
        // 领卡日期范围筛选
        if (f.receiveStartDate || f.receiveEndDate) {
            if (!r.receiveDate) return false;
            if (f.receiveStartDate && r.receiveDate < f.receiveStartDate) return false;
            if (f.receiveEndDate && r.receiveDate > f.receiveEndDate) return false;
        }
        
        // 回收日期范围筛选
        if (f.recycleStartDate || f.recycleEndDate) {
            if (!r.recycleDate) return false;
            if (f.recycleStartDate && r.recycleDate < f.recycleStartDate) return false;
            if (f.recycleEndDate && r.recycleDate > f.recycleEndDate) return false;
        }
        
        // 关键词搜索
        if (f.keyword) {
            const kw = f.keyword.toLowerCase().trim();
            if (!kw) return true;
            
            // 搜索文本：姓名、身份证号、部别、保障卡号、卡类型、回收原因、备注
            const searchText = (
                (r.name || '') +
                (r.idNumber || '') +
                (r.department || '') +
                (r.cardNumber || '') +
                (r.cardType || '') +
                (r.reason || '') +
                (r.remark || '')
            ).toLowerCase();
            
            // 拼音首字母搜索
            let pinyinText = '';
            if (r.name) pinyinText += getInitials(r.name);
            if (r.department) pinyinText += getInitials(r.department);
            pinyinText = pinyinText.toLowerCase();
            
            // 同时支持普通搜索和拼音首字母搜索
            const matchText = searchText.indexOf(kw) !== -1;
            const matchPinyin = pinyinText.indexOf(kw) !== -1;
            
            if (!matchText && !matchPinyin) return false;
        }
        
        return true;
    });
}

/**
 * 按卡片状态和卡类型过滤（发卡登记）
 * @param {string} status - 卡片状态（'已发卡' 或 '未发卡'）
 * @param {string} cardType - 卡类型（可选）
 */
export function filterByCardStatus(status, cardType) {
    // 检查是否点击了已激活的卡片（取消选择）
    let isDeselecting = false;
    
    if (!cardType) {
        // 点击的是父卡片
        const parentCards = document.querySelectorAll('#registryIssueTab .parent-filter-card');
        parentCards.forEach(function(card){
            const cStatus = card.getAttribute('data-status');
            if (cStatus === status && card.classList.contains('active')) {
                isDeselecting = true;
            }
        });
    } else {
        // 点击的是子卡片
        const childCards = document.querySelectorAll('#registryIssueTab .child-filter-card');
        childCards.forEach(function(card){
            const cStatus = card.getAttribute('data-status');
            const cType = card.getAttribute('data-type');
            if (cStatus === status && cType === cardType && card.classList.contains('active')) {
                isDeselecting = true;
            }
        });
    }
    
    if (isDeselecting) {
        // 取消选择：显示所有发卡记录
        state.filters.action = 'issue';
        state.filters.cardStatus = '';
        state.filters.cardType = '';
        state.filters.keyword = '';
        state.filters.recycleReason = '';
        
        // 移除所有激活状态
        const allCards = document.querySelectorAll('#registryIssueTab .parent-filter-card, #registryIssueTab .child-filter-card');
        allCards.forEach(function(card){ card.classList.remove('active'); });
    } else {
        // 正常筛选
        state.filters.action = 'issue';
        state.filters.cardStatus = status;
        state.filters.cardType = cardType || '';
        state.filters.keyword = '';
        state.filters.recycleReason = '';
        
        // 更新父卡片激活状态
        const parentCards = document.querySelectorAll('#registryIssueTab .parent-filter-card');
        parentCards.forEach(function(card){
            const cStatus = card.getAttribute('data-status');
            if (cStatus === status && !cardType) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        // 更新子卡片激活状态
        const childCards = document.querySelectorAll('#registryIssueTab .child-filter-card');
        childCards.forEach(function(card){
            const cStatus = card.getAttribute('data-status');
            const cType = card.getAttribute('data-type');
            if (cStatus === status && cType === cardType) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }
}

/**
 * 按回收状态、回收原因和卡类型过滤（收卡登记）
 * @param {string} status - 回收状态（'pending' 或 'done'）
 * @param {string} reason - 回收原因（可选）
 * @param {string} cardType - 卡类型（可选）
 */
export function filterByRecycleStatus(status, reason, cardType) {
    let isDeselecting = false;
    
    if (!reason && !cardType) {
        // 点击的是父卡片（只按状态筛选）
        const parentCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card');
        parentCards.forEach(function(card){
            const cStatus = card.getAttribute('data-status');
            if (cStatus === status && card.classList.contains('active')) {
                isDeselecting = true;
            }
        });
        
        if (isDeselecting) {
            // 取消父卡片选择：显示所有回收记录
            state.filters.action = 'recycle';
            state.filters.status = '';
            state.filters.recycleReason = '';
            state.filters.cardType = '';
            state.filters.keyword = '';
            state.filters.cardStatus = '';
            
            // 移除所有激活状态
            const allCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card, #registryRecycleTab .child-filter-card');
            allCards.forEach(function(card){ card.classList.remove('active'); });
        } else {
            // 正常筛选：只按状态，清除所有子筛选
            state.filters.action = 'recycle';
            state.filters.status = status;
            state.filters.recycleReason = '';
            state.filters.cardType = '';
            state.filters.keyword = '';
            state.filters.cardStatus = '';
            
            // 移除所有卡片的激活状态
            const allCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card, #registryRecycleTab .child-filter-card');
            allCards.forEach(function(card){ card.classList.remove('active'); });
            
            // 激活父卡片
            const parentCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card');
            parentCards.forEach(function(card){
                const cStatus = card.getAttribute('data-status');
                if (cStatus === status) {
                    card.classList.add('active');
                }
            });
        }
    } else {
        // 点击的是子卡片（卡类型或回收原因）
        const childCards = document.querySelectorAll('#registryRecycleTab .child-filter-card');
        childCards.forEach(function(card){
            const cStatus = card.getAttribute('data-status');
            const cType = card.getAttribute('data-cardtype');
            const cReason = card.getAttribute('data-reason');
            
            // 检查是否点击了同一个激活的子卡片
            if (cStatus === status && card.classList.contains('active')) {
                if ((cardType && cType === cardType) || (reason && cReason === reason)) {
                    isDeselecting = true;
                }
            }
        });
        
        if (isDeselecting) {
            // 取消该维度的选择，保留另一个维度
            if (cardType) {
                state.filters.cardType = '';
            } else if (reason) {
                state.filters.recycleReason = '';
            }
            
            // 移除该维度的激活状态
            childCards.forEach(function(card){
                const cType = card.getAttribute('data-cardtype');
                const cReason = card.getAttribute('data-reason');
                if ((cardType && cType === cardType) || (reason && cReason === reason)) {
                    card.classList.remove('active');
                }
            });
            
            // 如果两个维度都被取消了，恢复到只按状态筛选
            if (!state.filters.cardType && !state.filters.recycleReason) {
                state.filters.action = 'recycle';
                state.filters.status = status;
                state.filters.keyword = '';
                state.filters.cardStatus = '';
                
                // 激活父卡片
                const parentCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card');
                parentCards.forEach(function(card){
                    const cStatus = card.getAttribute('data-status');
                    if (cStatus === status) {
                        card.classList.add('active');
                    }
                });
            }
        } else {
            // 组合筛选：保留已有的筛选条件，添加新的维度
            state.filters.action = 'recycle';
            state.filters.status = status;
            state.filters.keyword = '';
            state.filters.cardStatus = '';
            
            // 根据点击的类型更新对应的筛选条件
            if (cardType) {
                state.filters.cardType = cardType;
            } else if (reason) {
                state.filters.recycleReason = reason;
            }
            
            // 移除父卡片的激活状态
            const parentCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card');
            parentCards.forEach(function(card){ card.classList.remove('active'); });
            
            // 更新子卡片的激活状态
            childCards.forEach(function(card){
                const cStatus = card.getAttribute('data-status');
                const cType = card.getAttribute('data-cardtype');
                const cReason = card.getAttribute('data-reason');
                
                if (cStatus === status) {
                    if ((state.filters.cardType && cType === state.filters.cardType) || 
                        (state.filters.recycleReason && cReason === state.filters.recycleReason)) {
                        card.classList.add('active');
                    } else {
                        card.classList.remove('active');
                    }
                }
            });
        }
    }
}

/**
 * 搜索记录
 * @param {string} keyword - 搜索关键词（可选，如果不提供则从输入框读取）
 */
export function searchRecords(keyword) {
    if (keyword !== undefined) {
        state.filters.keyword = keyword.trim();
    } else {
        // 从输入框读取
        const input = state.currentSubTab === 'issue' 
            ? document.getElementById('issueSearchInput') 
            : document.getElementById('recycleSearchInput');
        if (input) {
            state.filters.keyword = input.value.trim();
        }
    }
}

/**
 * 清除搜索
 */
export function clearSearch() {
    const issueInput = document.getElementById('issueSearchInput');
    const recycleInput = document.getElementById('recycleSearchInput');
    if (issueInput) issueInput.value = '';
    if (recycleInput) recycleInput.value = '';
    state.filters.keyword = '';
}

/**
 * 按年度筛选
 */
export function filterByYear() {
    if (state.currentSubTab === 'issue') {
        const issueDateFilter = document.getElementById('issueYearFilterByIssueDate');
        const receiveDateFilter = document.getElementById('issueYearFilterByReceiveDate');
        if (issueDateFilter) state.filters.yearByIssueDate = issueDateFilter.value;
        if (receiveDateFilter) state.filters.yearByReceiveDate = receiveDateFilter.value;
    } else {
        const recycleFilter = document.getElementById('recycleYearFilter');
        if (recycleFilter) state.filters.yearByIssueDate = recycleFilter.value;
    }
    state.pagination.currentPage = 1;
}

/**
 * 按日期范围筛选
 */
export function filterByDateRange() {
    if (state.currentSubTab === 'issue') {
        // 发卡日期筛选
        const issueStartInput = document.getElementById('issueStartDate');
        const issueEndInput = document.getElementById('issueEndDate');
        if (issueStartInput) {
            const dateValue = issueStartInput.value.trim();
            state.filters.issueStartDate = dateValue ? parseDate(dateValue) : '';
        }
        if (issueEndInput) {
            const dateValue = issueEndInput.value.trim();
            state.filters.issueEndDate = dateValue ? parseDate(dateValue) : '';
        }
        
        // 领卡日期筛选
        const receiveStartInput = document.getElementById('receiveStartDate');
        const receiveEndInput = document.getElementById('receiveEndDate');
        if (receiveStartInput) {
            const dateValue = receiveStartInput.value.trim();
            state.filters.receiveStartDate = dateValue ? parseDate(dateValue) : '';
        }
        if (receiveEndInput) {
            const dateValue = receiveEndInput.value.trim();
            state.filters.receiveEndDate = dateValue ? parseDate(dateValue) : '';
        }
    } else if (state.currentSubTab === 'recycle') {
        // 收卡日期筛选
        const recycleStartInput = document.getElementById('recycleStartDate');
        const recycleEndInput = document.getElementById('recycleEndDate');
        if (recycleStartInput) {
            const dateValue = recycleStartInput.value.trim();
            state.filters.recycleStartDate = dateValue ? parseDate(dateValue) : '';
        }
        if (recycleEndInput) {
            const dateValue = recycleEndInput.value.trim();
            state.filters.recycleEndDate = dateValue ? parseDate(dateValue) : '';
        }
    }
    
    state.pagination.currentPage = 1;
}

/**
 * 重置所有过滤器
 */
export function resetFilters() {
    // 重置状态
    resetStateFilters();
    
    // 移除UI激活状态
    if (state.currentSubTab === 'issue') {
        const allCards = document.querySelectorAll('#registryIssueTab .parent-filter-card, #registryIssueTab .child-filter-card');
        allCards.forEach(function(card){ card.classList.remove('active'); });
        
        // 清空筛选UI
        const elements = [
            'issueYearFilterByIssueDate',
            'issueYearFilterByReceiveDate',
            'issueStartDate',
            'issueEndDate',
            'receiveStartDate',
            'receiveEndDate',
            'issueSearchInput'
        ];
        
        elements.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    } else {
        const allCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card, #registryRecycleTab .child-filter-card');
        allCards.forEach(function(card){ card.classList.remove('active'); });
        
        // 清空筛选UI
        const elements = [
            'recycleYearFilter',
            'recycleStartDate',
            'recycleEndDate',
            'recycleSearchInput'
        ];
        
        elements.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }
    
    // 重置分页
    state.pagination.currentPage = 1;
}

/**
 * 填充年度下拉菜单选项
 * @param {Array} records - 记录数组（可选，默认使用state.records）
 */
export function populateYearFilters(records = null) {
    const dataSource = records || state.records;
    
    // 收集各种日期的年份
    const issueYears = {};
    const receiveYears = {};
    const recycleYears = {};
    
    dataSource.forEach(function(r) {
        // 发卡日期
        if (r.issueDate) {
            const year = r.issueDate.split('-')[0];
            issueYears[year] = true;
        }
        
        // 领卡日期
        if (r.receiveDate) {
            const year = r.receiveDate.split('-')[0];
            receiveYears[year] = true;
        }
        
        // 回收日期
        if (r.recycleDate) {
            const year = r.recycleDate.split('-')[0];
            recycleYears[year] = true;
        }
    });
    
    // 转换为排序数组
    const issueYearList = Object.keys(issueYears).sort().reverse();
    const receiveYearList = Object.keys(receiveYears).sort().reverse();
    const recycleYearList = Object.keys(recycleYears).sort().reverse();
    
    // 更新发卡登记的年度筛选
    const issueYearByIssue = document.getElementById('issueYearFilterByIssueDate');
    if (issueYearByIssue) {
        const currentValue = issueYearByIssue.value;
        issueYearByIssue.innerHTML = '<option value="">发卡年份：全部</option>' +
            issueYearList.map(function(y){ return '<option value="'+y+'">'+y+'年</option>'; }).join('');
        if (currentValue && issueYears[currentValue]) {
            issueYearByIssue.value = currentValue;
        }
    }
    
    const issueYearByReceive = document.getElementById('issueYearFilterByReceiveDate');
    if (issueYearByReceive) {
        const currentValue = issueYearByReceive.value;
        issueYearByReceive.innerHTML = '<option value="">领卡年份：全部</option>' +
            receiveYearList.map(function(y){ return '<option value="'+y+'">'+y+'年</option>'; }).join('');
        if (currentValue && receiveYears[currentValue]) {
            issueYearByReceive.value = currentValue;
        }
    }
    
    // 更新收卡登记的年度筛选
    const recycleYear = document.getElementById('recycleYearFilter');
    if (recycleYear) {
        const currentValue = recycleYear.value;
        recycleYear.innerHTML = '<option value="">回收年份：全部</option>' +
            recycleYearList.map(function(y){ return '<option value="'+y+'">'+y+'年</option>'; }).join('');
        if (currentValue && recycleYears[currentValue]) {
            recycleYear.value = currentValue;
        }
    }
}

/**
 * 更新搜索计数显示
 */
export function updateSearchCount() {
    const keyword = state.filters.keyword;
    if (!keyword || !keyword.trim()) {
        // 隐藏搜索结果提示
        const issueCount = document.getElementById('issueSearchCount');
        const recycleCount = document.getElementById('recycleSearchCount');
        if (issueCount) issueCount.style.display = 'none';
        if (recycleCount) recycleCount.style.display = 'none';
        return;
    }
    
    // 计算搜索结果数量
    const filtered = getFilteredRecords();
    const count = filtered.length;
    
    // 更新显示
    if (state.currentSubTab === 'issue') {
        const el = document.getElementById('issueSearchCount');
        if (el) {
            el.textContent = `找到 ${count} 条结果`;
            el.style.display = 'inline-block';
        }
    } else {
        const el = document.getElementById('recycleSearchCount');
        if (el) {
            el.textContent = `找到 ${count} 条结果`;
            el.style.display = 'inline-block';
        }
    }
}

