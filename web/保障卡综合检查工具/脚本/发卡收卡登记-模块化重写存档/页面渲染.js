/**
 * 发卡收卡登记系统 - UI渲染模块
 * 负责表格渲染、统计信息更新、下拉选项填充等UI相关功能
 */

import { getFilteredRecords, populateYearFilters } from './过滤搜索.js';
import { getPaginatedRecords, updatePagination, getPaginationInfo } from './分页.js';
import { state } from './配置.js';
import { 
    fmtDateDisplay, escapeHtml, mapStatus, 
    daysBetween, getUnclaimedClass 
} from './工具函数.js';

/**
 * 渲染主表格
 */
export function renderTable() {
    const filtered = getFilteredRecords();
    
    // 更新表头排序指示器
    updateSortHeaders();
    
    if (state.currentSubTab === 'issue') {
        renderIssueTable(filtered);
    } else {
        renderRecycleTable(filtered);
    }
}

/**
 * 渲染发卡表格
 */
export function renderIssueTable(records) {
    const tbody = document.getElementById('issueTableBody');
    if (!tbody) return;
    
    const issueRows = records.filter(r => r.action === 'issue');
    
    if (issueRows.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="12"><div class="empty">暂无发卡记录</div></td></tr>';
        updatePagination(0);
        updateUnclaimedWarning([]);
        return;
    }
    
    // 排序
    const sorted = sortRecords(issueRows);
    
    // 分页
    updatePagination(sorted.length);
    const pageData = getPaginatedRecords(sorted);
    const pageInfo = getPaginationInfo();
    
    // 渲染行
    let html = '';
    pageData.forEach(function(r, idx) {
        const rowNumber = pageInfo.startIndex + idx;
        const isChecked = state.selected.indexOf(r.id) !== -1;
        const cardStatus = r.cardStatus || '未发卡';
        const unclaimedClass = getUnclaimedClass(r.issueDate, r.receiveDate, cardStatus);
        
        // 姓名显示：Ⅲ类卡显示"姓名(关联军人)"格式
        let nameDisplay = r.name || '';
        if (r.cardType === 'Ⅲ类卡' && r.familyMember) {
            nameDisplay += '(' + r.familyMember + ')';
        }
        
        html += '<tr class="' + unclaimedClass + '">' +
            '<td class="checkbox-col">' +
                '<input type="checkbox" class="row-checkbox" ' +
                'data-id="' + r.id + '" ' +
                (isChecked ? 'checked' : '') + ' ' +
                'onchange="REG.toggleRowSelect(\'' + r.id + '\')" />' +
            '</td>' +
            '<td>' + rowNumber + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="department" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.department || '') + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="name" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(nameDisplay) + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="idNumber" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.idNumber || '') + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="cardNumber" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.cardNumber || '') + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="cardType" data-type="select" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.cardType || '') + '</td>' +
            '<td>' +
                '<button class="card-status-btn ' + cardStatus + '" onclick="REG.toggleCardStatus(\'' + r.id + '\')">' +
                cardStatus + '</button>' +
            '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="issueDate" data-type="date" ondblclick="REG.editCell(this)">' +
                fmtDateDisplay(r.issueDate) + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="receiveDate" data-type="date" ondblclick="REG.editCell(this)">' +
                fmtDateDisplay(r.receiveDate) + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="remark" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.remark || '') + '</td>' +
            '<td>' +
                '<button class="btn light" onclick="REG.remove(\'' + r.id + '\')"><i class="fa fa-trash"></i></button>' +
            '</td>' +
        '</tr>';
    });
    
    tbody.innerHTML = html;
    updateSelectAllCheckbox('issue');
    updateUnclaimedWarning(issueRows);
    updateStats();
}

/**
 * 渲染收卡表格
 */
export function renderRecycleTable(records) {
    const tbody = document.getElementById('recycleTableBody');
    if (!tbody) return;
    
    const recycleRows = records.filter(r => r.action === 'recycle');
    
    if (recycleRows.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="12"><div class="empty">暂无收卡记录</div></td></tr>';
        updatePagination(0);
        return;
    }
    
    // 排序
    const sorted = sortRecords(recycleRows);
    
    // 分页
    updatePagination(sorted.length);
    const pageData = getPaginatedRecords(sorted);
    const pageInfo = getPaginationInfo();
    
    // 渲染行
    let html = '';
    pageData.forEach(function(r, idx) {
        const rowNumber = pageInfo.startIndex + idx;
        const isChecked = state.selected.indexOf(r.id) !== -1;
        const recycleStatus = (r.status || 'done') === 'done' ? '已回收' : '未回收';
        const statusClass = recycleStatus === '已回收' ? 'done' : 'pending';
        
        // 姓名显示：Ⅲ类卡显示"姓名(关联军人)"格式
        let nameDisplay = r.name || '';
        if (r.cardType === 'Ⅲ类卡' && r.familyMember) {
            nameDisplay += '(' + r.familyMember + ')';
        }
        
        html += '<tr>' +
            '<td class="checkbox-col">' +
                '<input type="checkbox" class="row-checkbox" ' +
                'data-id="' + r.id + '" ' +
                (isChecked ? 'checked' : '') + ' ' +
                'onchange="REG.toggleRowSelect(\'' + r.id + '\')" />' +
            '</td>' +
            '<td>' + rowNumber + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="department" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.department || '') + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="name" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(nameDisplay) + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="idNumber" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.idNumber || '') + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="cardNumber" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.cardNumber || '') + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="cardType" data-type="select" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.cardType || '') + '</td>' +
            '<td>' +
                '<button class="recycle-status-btn ' + statusClass + '" onclick="REG.toggleRecycleStatus(\'' + r.id + '\')">' +
                recycleStatus + '</button>' +
            '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="reason" data-type="select" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.reason || '') + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="recycleDate" data-type="date" ondblclick="REG.editCell(this)">' +
                fmtDateDisplay(r.recycleDate) + '</td>' +
            '<td class="editable" data-id="' + r.id + '" data-field="remark" data-type="text" ondblclick="REG.editCell(this)">' +
                escapeHtml(r.remark || '') + '</td>' +
            '<td>' +
                '<button class="btn light" onclick="REG.remove(\'' + r.id + '\')"><i class="fa fa-trash"></i></button>' +
            '</td>' +
        '</tr>';
    });
    
    tbody.innerHTML = html;
    updateSelectAllCheckbox('recycle');
    updateStats();
}

/**
 * 排序记录
 */
function sortRecords(records) {
    // 如果有自定义排序，使用自定义排序
    if (state.sort.column && state.sort.direction) {
        return applySorting(records);
    }
    
    if (state.currentSubTab === 'issue') {
        // 默认排序：未发卡在前，已发卡在后
        const pending = records.filter(r => (r.cardStatus || '未发卡') === '未发卡');
        const issued = records.filter(r => (r.cardStatus || '未发卡') === '已发卡');
        
        // 未发卡：按发卡日期倒序
        pending.sort((a, b) => {
            const aDate = a.issueDate || a.dates?.createdAt || '0';
            const bDate = b.issueDate || b.dates?.createdAt || '0';
            return new Date(bDate) - new Date(aDate);
        });
        
        // 已发卡：按领卡日期倒序
        issued.sort((a, b) => {
            const aDate = a.receiveDate || a.issueDate || a.dates?.createdAt || '0';
            const bDate = b.receiveDate || b.issueDate || b.dates?.createdAt || '0';
            return new Date(bDate) - new Date(aDate);
        });
        
        return pending.concat(issued);
    } else {
        // 默认排序：未回收在前，已回收在后
        const pending = records.filter(r => (r.status || 'done') === 'pending');
        const done = records.filter(r => (r.status || 'done') === 'done');
        
        // 未回收：按发卡日期倒序
        pending.sort((a, b) => {
            const aDate = a.issueDate || a.dates?.createdAt || '0';
            const bDate = b.issueDate || b.dates?.createdAt || '0';
            return new Date(bDate) - new Date(aDate);
        });
        
        // 已回收：按回收日期倒序
        done.sort((a, b) => {
            const aDate = a.recycleDate || a.dates?.createdAt || '0';
            const bDate = b.recycleDate || b.dates?.createdAt || '0';
            return new Date(bDate) - new Date(aDate);
        });
        
        return pending.concat(done);
    }
}

/**
 * 应用自定义排序
 */
function applySorting(records) {
    const col = state.sort.column;
    const dir = state.sort.direction;
    const sorted = [...records];
    
    sorted.sort((a, b) => {
        let aVal, bVal;
        
        switch(col) {
            case 'department': aVal = a.department || ''; bVal = b.department || ''; break;
            case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
            case 'idNumber': aVal = a.idNumber || ''; bVal = b.idNumber || ''; break;
            case 'cardNumber': aVal = a.cardNumber || ''; bVal = b.cardNumber || ''; break;
            case 'cardType': aVal = a.cardType || ''; bVal = b.cardType || ''; break;
            case 'cardStatus': aVal = a.cardStatus || '未发卡'; bVal = b.cardStatus || '未发卡'; break;
            case 'status': aVal = mapStatus(a.status); bVal = mapStatus(b.status); break;
            case 'reason': aVal = a.reason || ''; bVal = b.reason || ''; break;
            case 'issueDate': aVal = a.issueDate || ''; bVal = b.issueDate || ''; break;
            case 'receiveDate': aVal = a.receiveDate || ''; bVal = b.receiveDate || ''; break;
            case 'recycleDate': aVal = a.recycleDate || ''; bVal = b.recycleDate || ''; break;
            case 'remark': aVal = a.remark || ''; bVal = b.remark || ''; break;
            default: return 0;
        }
        
        if (aVal < bVal) return dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return dir === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
}

/**
 * 更新排序表头指示器
 */
function updateSortHeaders() {
    const headers = document.querySelectorAll('.registry-table th.sortable');
    headers.forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('data-column') === state.sort.column) {
            th.classList.add('sort-' + state.sort.direction);
        }
    });
}

/**
 * 更新未领卡警告横幅
 */
export function updateUnclaimedWarning(issueRows) {
    const warningDiv = document.getElementById('unclaimedWarning');
    if (!warningDiv) return;
    
    // 统计未发卡且时间较长的记录
    const typeStats = {
        'Ⅰ类卡': 0, 'Ⅱ类卡': 0,
        'Ⅲ类卡': 0, 'Ⅳ类卡': 0,
        '其他': 0
    };
    
    const timeStats = {
        days7: 0,   // 7-14天
        days15: 0,  // 15-29天
        days30: 0,  // 30-59天
        days60: 0   // ≥60天
    };
    
    issueRows.forEach(r => {
        if ((r.cardStatus || '未发卡') === '未发卡' && r.issueDate) {
            const days = daysBetween(r.issueDate);
            
            if (days >= 7) {
                // 卡类型统计
                const cardType = r.cardType || '其他';
                if (typeStats.hasOwnProperty(cardType)) {
                    typeStats[cardType]++;
                } else {
                    typeStats['其他']++;
                }
                
                // 时间段统计
                if (days >= 60) timeStats.days60++;
                else if (days >= 30) timeStats.days30++;
                else if (days >= 15) timeStats.days15++;
                else if (days >= 7) timeStats.days7++;
            }
        }
    });
    
    // 计算总数
    let total = 0;
    for (const key in typeStats) {
        total += typeStats[key];
    }
    
    if (total === 0) {
        warningDiv.style.display = 'none';
        return;
    }
    
    // 生成时间段提示
    const timeMessages = [];
    if (timeStats.days60 > 0) timeMessages.push('<span class="warning-60">' + timeStats.days60 + '张>2月</span>');
    if (timeStats.days30 > 0) timeMessages.push('<span class="warning-30">' + timeStats.days30 + '张>1月</span>');
    if (timeStats.days15 > 0) timeMessages.push('<span class="warning-15">' + timeStats.days15 + '张>半月</span>');
    if (timeStats.days7 > 0) timeMessages.push('<span class="warning-7">' + timeStats.days7 + '张>7天</span>');
    
    // 生成卡类型提示
    const typeMessages = [];
    const cardTypes = ['Ⅰ类卡', 'Ⅱ类卡', 'Ⅲ类卡', 'Ⅳ类卡', '其他'];
    cardTypes.forEach(type => {
        if (typeStats[type] > 0) {
            typeMessages.push('<span style="color: #2c3e50; font-weight: 600;">' + type + ' ' + typeStats[type] + '张</span>');
        }
    });
    
    warningDiv.innerHTML =
        '<i class="fa fa-exclamation-triangle"></i>' +
        '<span>' +
            '<strong style="font-size: 16px; color: #d84315;">' + total + '</strong>张长时间未发卡：' +
            timeMessages.join('、') +
            (typeMessages.length > 0 ? ' | ' + typeMessages.join('、') : '') +
        '</span>';
    warningDiv.style.display = 'flex';
}

/**
 * 更新统计信息
 */
export function updateStats() {
    const issueRecords = state.records.filter(r => r.action === 'issue');
    const recycleRecords = state.records.filter(r => r.action === 'recycle');
    
    // 发卡统计
    const issued = issueRecords.filter(r => (r.cardStatus || '未发卡') === '已发卡');
    const pending = issueRecords.filter(r => (r.cardStatus || '未发卡') === '未发卡');
    
    updateStatElement('issued-total', issued.length);
    updateStatElement('issued-1', issued.filter(r => r.cardType === 'Ⅰ类卡').length);
    updateStatElement('issued-2', issued.filter(r => r.cardType === 'Ⅱ类卡').length);
    updateStatElement('issued-3', issued.filter(r => r.cardType === 'Ⅲ类卡').length);
    updateStatElement('issued-4', issued.filter(r => r.cardType === 'Ⅳ类卡').length);
    
    updateStatElement('pending-total', pending.length);
    updateStatElement('pending-1', pending.filter(r => r.cardType === 'Ⅰ类卡').length);
    updateStatElement('pending-2', pending.filter(r => r.cardType === 'Ⅱ类卡').length);
    updateStatElement('pending-3', pending.filter(r => r.cardType === 'Ⅲ类卡').length);
    updateStatElement('pending-4', pending.filter(r => r.cardType === 'Ⅳ类卡').length);
    
    // 收卡统计
    const recycleDone = recycleRecords.filter(r => (r.status || 'done') === 'done');
    const recyclePending = recycleRecords.filter(r => (r.status || 'done') === 'pending');
    
    updateStatElement('recycle-done-total', recycleDone.length);
    updateStatElement('recycle-pending-total', recyclePending.length);
    
    // 按卡类型统计
    state.config.cardTypes.forEach((type, idx) => {
        updateStatElement('recycle-done-type' + (idx + 1), recycleDone.filter(r => r.cardType === type).length);
        updateStatElement('recycle-pending-type' + (idx + 1), recyclePending.filter(r => r.cardType === type).length);
    });
    
    // 按回收原因统计
    state.config.actions.reasons.forEach((reason, idx) => {
        updateStatElement('recycle-done-reason' + (idx + 1), recycleDone.filter(r => r.reason === reason).length);
        updateStatElement('recycle-pending-reason' + (idx + 1), recyclePending.filter(r => r.reason === reason).length);
    });
}

/**
 * 更新统计元素
 */
function updateStatElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/**
 * 更新全选复选框状态
 */
export function updateSelectAllCheckbox(tab) {
    const checkbox = document.getElementById(tab + 'SelectAll');
    if (!checkbox) return;
    
    const tbody = document.getElementById(tab === 'issue' ? 'issueTableBody' : 'recycleTableBody');
    if (!tbody) return;
    
    const rowCheckboxes = tbody.querySelectorAll('.row-checkbox');
    const checkedCount = Array.from(rowCheckboxes).filter(cb => cb.checked).length;
    
    checkbox.checked = rowCheckboxes.length > 0 && checkedCount === rowCheckboxes.length;
    checkbox.indeterminate = checkedCount > 0 && checkedCount < rowCheckboxes.length;
}

/**
 * 确保卡类型下拉选项已填充
 */
export function ensureCardTypeOptions() {
    const ids = ['issueFilterCardType', 'recycleFilterCardType'];
    ids.forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            sel.innerHTML = '<option value="">卡型：全部</option>' +
                state.config.cardTypes.map(ct =>
                    '<option value="' + ct + '">' + ct + '</option>'
                ).join('');
        }
    });
}

/**
 * 确保回收原因下拉选项已填充
 */
export function ensureRecycleReasonOptions() {
    const sel = document.getElementById('recycleFilterReason');
    if (!sel) return;
    
    const reasons = state.config.actions.reasons || [];
    sel.innerHTML = '<option value="">回收原因：全部</option>' +
        reasons.map(r => '<option value="' + r + '">' + r + '</option>').join('');
}

/**
 * 更新常用部门列表
 */
export function updateCommonDepartments() {
    const datalist = document.getElementById('commonDepartmentsList');
    if (!datalist) return;
    
    const departments = state.config.commonDepartments || [];
    datalist.innerHTML = departments.map(d =>
        '<option value="' + d + '">' + d + '</option>'
    ).join('');
}

/**
 * 排序表格（点击表头）
 */
export function sortTable(column) {
    if (state.sort.column === column) {
        // 切换排序方向
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.column = column;
        state.sort.direction = 'asc';
    }
    
    renderTable();
}

