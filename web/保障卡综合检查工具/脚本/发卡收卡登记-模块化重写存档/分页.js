/**
 * 发卡收卡登记系统 - 分页模块
 * 负责分页计算、页码跳转、每页数量调整等功能
 */

import { state } from './配置.js';

/**
 * 更新分页信息
 * @param {number} totalRecords - 总记录数
 */
export function updatePagination(totalRecords) {
    state.pagination.totalRecords = totalRecords;
    state.pagination.totalPages = Math.max(1, Math.ceil(totalRecords / state.pagination.pageSize));
    
    // 确保当前页在有效范围内
    if (state.pagination.currentPage > state.pagination.totalPages) {
        state.pagination.currentPage = state.pagination.totalPages;
    }
    if (state.pagination.currentPage < 1) {
        state.pagination.currentPage = 1;
    }
    
    renderPaginationUI();
}

/**
 * 跳转到指定页
 * @param {number} page - 页码
 */
export function goToPage(page) {
    const targetPage = parseInt(page, 10);
    
    if (isNaN(targetPage) || targetPage < 1 || targetPage > state.pagination.totalPages) {
        console.warn('无效的页码:', page);
        return;
    }
    
    state.pagination.currentPage = targetPage;
}

/**
 * 修改每页显示数量
 * @param {number} size - 每页记录数
 */
export function changePageSize(size) {
    const newSize = parseInt(size, 10);
    
    if (isNaN(newSize) || newSize < 1) {
        console.warn('无效的页面大小:', size);
        return;
    }
    
    state.pagination.pageSize = newSize;
    state.pagination.currentPage = 1; // 重置到第一页
}

/**
 * 重置分页到初始状态
 */
export function resetPagination() {
    state.pagination.currentPage = 1;
    state.pagination.totalPages = 1;
    state.pagination.totalRecords = 0;
}

/**
 * 获取当前页的记录
 * @param {Array} records - 所有记录
 * @returns {Array} 当前页的记录
 */
export function getPaginatedRecords(records) {
    const startIndex = (state.pagination.currentPage - 1) * state.pagination.pageSize;
    const endIndex = startIndex + state.pagination.pageSize;
    return records.slice(startIndex, endIndex);
}

/**
 * 获取分页信息
 * @returns {Object} 分页信息对象
 */
export function getPaginationInfo() {
    const startIndex = (state.pagination.currentPage - 1) * state.pagination.pageSize + 1;
    const endIndex = Math.min(state.pagination.currentPage * state.pagination.pageSize, state.pagination.totalRecords);
    
    return {
        currentPage: state.pagination.currentPage,
        totalPages: state.pagination.totalPages,
        pageSize: state.pagination.pageSize,
        totalRecords: state.pagination.totalRecords,
        startIndex: startIndex,
        endIndex: endIndex,
        hasNext: state.pagination.currentPage < state.pagination.totalPages,
        hasPrevious: state.pagination.currentPage > 1
    };
}

/**
 * 渲染分页UI
 */
function renderPaginationUI() {
    const paginationContainer = state.currentSubTab === 'issue'
        ? document.getElementById('issuePagination')
        : document.getElementById('recyclePagination');
    
    if (!paginationContainer) return;
    
    const info = getPaginationInfo();
    
    if (info.totalRecords === 0) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-controls">';
    
    // 显示记录范围
    html += `<span class="pagination-info">显示 ${info.startIndex}-${info.endIndex}，共 ${info.totalRecords} 条</span>`;
    
    // 每页数量选择
    html += '<select class="pagination-size" onchange="REG.changePageSize(this.value)">';
    const pageSizes = [20, 50, 100, 200];
    pageSizes.forEach(function(size) {
        const selected = size === state.pagination.pageSize ? ' selected' : '';
        html += `<option value="${size}"${selected}>每页 ${size} 条</option>`;
    });
    html += '</select>';
    
    // 分页按钮
    html += '<div class="pagination-buttons">';
    
    // 首页按钮
    html += `<button class="pagination-btn" ${!info.hasPrevious ? 'disabled' : ''} onclick="REG.goToPage(1)" title="首页">
        <i class="fa fa-angle-double-left"></i>
    </button>`;
    
    // 上一页按钮
    html += `<button class="pagination-btn" ${!info.hasPrevious ? 'disabled' : ''} onclick="REG.goToPage(${info.currentPage - 1})" title="上一页">
        <i class="fa fa-angle-left"></i>
    </button>`;
    
    // 页码输入
    html += `<span class="pagination-page-input">
        <input type="number" 
               min="1" 
               max="${info.totalPages}" 
               value="${info.currentPage}" 
               onchange="REG.goToPage(this.value)"
               style="width: 50px; text-align: center;">
        <span> / ${info.totalPages}</span>
    </span>`;
    
    // 下一页按钮
    html += `<button class="pagination-btn" ${!info.hasNext ? 'disabled' : ''} onclick="REG.goToPage(${info.currentPage + 1})" title="下一页">
        <i class="fa fa-angle-right"></i>
    </button>`;
    
    // 末页按钮
    html += `<button class="pagination-btn" ${!info.hasNext ? 'disabled' : ''} onclick="REG.goToPage(${info.totalPages})" title="末页">
        <i class="fa fa-angle-double-right"></i>
    </button>`;
    
    html += '</div></div>';
    
    paginationContainer.innerHTML = html;
}

/**
 * 跳转到下一页
 */
export function nextPage() {
    const info = getPaginationInfo();
    if (info.hasNext) {
        goToPage(info.currentPage + 1);
    }
}

/**
 * 跳转到上一页
 */
export function previousPage() {
    const info = getPaginationInfo();
    if (info.hasPrevious) {
        goToPage(info.currentPage - 1);
    }
}

/**
 * 跳转到首页
 */
export function firstPage() {
    goToPage(1);
}

/**
 * 跳转到末页
 */
export function lastPage() {
    const info = getPaginationInfo();
    goToPage(info.totalPages);
}

