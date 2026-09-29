/**
 * 发卡收卡登记系统 - 事件处理模块
 * 负责各种用户交互事件的处理，包括点击、输入、提交等
 */

import { state, config } from './配置.js';
import { renderTable, sortTable as uiSortTable, updateSelectAllCheckbox } from './页面渲染.js';
import { 
    addRecord, remove, validateAndSave, 
    toggleCardStatus, toggleRecycleStatus,
    editCell, saveCellEdit, cancelCellEdit,
    addInlineRow, cancelInlineRow
} from './数据管理.js';
import { 
    applyFilters, resetFilters, search, clearSearch,
    filterByYear, filterByDateRange 
} from './过滤搜索.js';
import { goToPage, changePageSize } from './分页.js';
import { exportToExcel, importFromExcel } from './导入导出.js';
import { saveConfig } from './存储处理.js';

/**
 * 切换子标签页（发卡/收卡）
 */
export function switchSubTab(tab) {
    if (tab !== 'issue' && tab !== 'recycle') {
        console.error('Invalid tab:', tab);
        return;
    }
    
    state.currentSubTab = tab;
    
    // 更新标签按钮状态
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector('.sub-tab-btn[data-tab="' + tab + '"]');
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 显示/隐藏对应的表格容器
    document.querySelectorAll('.sub-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(tab + 'TabContent');
    if (activeContent) {
        activeContent.style.display = 'block';
    }
    
    // 清空选中项
    state.selected = [];
    
    // 重新渲染表格
    renderTable();
    
    // 保存当前标签状态
    try {
        localStorage.setItem('currentSubTab', tab);
    } catch (e) {
        console.error('保存标签状态失败:', e);
    }
}

/**
 * 切换行选中状态
 */
export function toggleRowSelect(id) {
    const index = state.selected.indexOf(id);
    if (index > -1) {
        state.selected.splice(index, 1);
    } else {
        state.selected.push(id);
    }
    
    updateSelectAllCheckbox(state.currentSubTab);
}

/**
 * 全选/取消全选
 */
export function toggleSelectAll(tab) {
    const checkbox = document.getElementById(tab + 'SelectAll');
    if (!checkbox) return;
    
    const tbody = document.getElementById(tab === 'issue' ? 'issueTableBody' : 'recycleTableBody');
    if (!tbody) return;
    
    const rowCheckboxes = tbody.querySelectorAll('.row-checkbox');
    const isChecked = checkbox.checked;
    
    // 清空当前选中项
    state.selected = [];
    
    if (isChecked) {
        // 添加当前页所有记录ID到选中列表
        rowCheckboxes.forEach(cb => {
            const id = cb.getAttribute('data-id');
            if (id) {
                state.selected.push(id);
                cb.checked = true;
            }
        });
    } else {
        // 取消选中所有
        rowCheckboxes.forEach(cb => {
            cb.checked = false;
        });
    }
}

/**
 * 批量删除选中的记录
 */
export function batchRemove() {
    if (state.selected.length === 0) {
        alert('请先选择要删除的记录！');
        return;
    }
    
    if (!confirm('确定要删除选中的 ' + state.selected.length + ' 条记录吗？')) {
        return;
    }
    
    // 批量删除
    const ids = [...state.selected]; // 复制数组，避免迭代时修改
    ids.forEach(id => {
        remove(id);
    });
    
    // 清空选中项
    state.selected = [];
    
    // 重新渲染
    renderTable();
    
    alert('已成功删除 ' + ids.length + ' 条记录！');
}

/**
 * 显示/隐藏新增发卡表单
 */
export function toggleIssueForm() {
    const form = document.getElementById('issueForm');
    const btn = document.getElementById('toggleIssueFormBtn');
    
    if (!form || !btn) return;
    
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    btn.innerHTML = isHidden ?
        '<i class="fa fa-minus-circle"></i> 收起表单' :
        '<i class="fa fa-plus-circle"></i> 新增发卡';
    
    // 显示时聚焦第一个输入框
    if (isHidden) {
        const firstInput = form.querySelector('input[type="text"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

/**
 * 显示/隐藏新增收卡表单
 */
export function toggleRecycleForm() {
    const form = document.getElementById('recycleForm');
    const btn = document.getElementById('toggleRecycleFormBtn');
    
    if (!form || !btn) return;
    
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    btn.innerHTML = isHidden ?
        '<i class="fa fa-minus-circle"></i> 收起表单' :
        '<i class="fa fa-plus-circle"></i> 新增收卡';
    
    // 显示时聚焦第一个输入框
    if (isHidden) {
        const firstInput = form.querySelector('input[type="text"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

/**
 * 提交发卡表单
 */
export function submitIssueForm(event) {
    if (event) event.preventDefault();
    
    const form = document.getElementById('issueForm');
    if (!form) return;
    
    // 收集表单数据
    const formData = new FormData(form);
    const record = {
        action: 'issue',
        department: formData.get('department') || '',
        name: formData.get('name') || '',
        idNumber: formData.get('idNumber') || '',
        cardNumber: formData.get('cardNumber') || '',
        cardType: formData.get('cardType') || '',
        familyMember: formData.get('familyMember') || '',
        cardStatus: '未发卡',
        issueDate: formData.get('issueDate') || '',
        receiveDate: formData.get('receiveDate') || '',
        remark: formData.get('remark') || ''
    };
    
    // 验证
    if (!record.name || !record.department || !record.cardType) {
        alert('请填写必填项：姓名、单位、卡型！');
        return;
    }
    
    // 添加记录
    addRecord(record);
    
    // 清空表单
    form.reset();
    
    // 重新渲染
    renderTable();
    
    alert('发卡记录添加成功！');
}

/**
 * 提交收卡表单
 */
export function submitRecycleForm(event) {
    if (event) event.preventDefault();
    
    const form = document.getElementById('recycleForm');
    if (!form) return;
    
    // 收集表单数据
    const formData = new FormData(form);
    const record = {
        action: 'recycle',
        department: formData.get('department') || '',
        name: formData.get('name') || '',
        idNumber: formData.get('idNumber') || '',
        cardNumber: formData.get('cardNumber') || '',
        cardType: formData.get('cardType') || '',
        familyMember: formData.get('familyMember') || '',
        status: 'done',
        reason: formData.get('reason') || '',
        recycleDate: formData.get('recycleDate') || '',
        remark: formData.get('remark') || ''
    };
    
    // 验证
    if (!record.name || !record.department || !record.cardType) {
        alert('请填写必填项：姓名、单位、卡型！');
        return;
    }
    
    // 添加记录
    addRecord(record);
    
    // 清空表单
    form.reset();
    
    // 重新渲染
    renderTable();
    
    alert('收卡记录添加成功！');
}

/**
 * 表头排序点击
 */
export function handleSortClick(event) {
    const th = event.target.closest('th.sortable');
    if (!th) return;
    
    const column = th.getAttribute('data-column');
    if (column) {
        uiSortTable(column);
    }
}

/**
 * 搜索框输入事件
 */
export function handleSearchInput(event) {
    const query = event.target.value;
    search(query);
    renderTable();
}

/**
 * 清空搜索
 */
export function handleClearSearch() {
    clearSearch();
    const searchInput = document.getElementById(state.currentSubTab + 'Search');
    if (searchInput) {
        searchInput.value = '';
    }
    renderTable();
}

/**
 * 筛选条件改变
 */
export function handleFilterChange() {
    applyFilters();
    renderTable();
}

/**
 * 重置所有筛选
 */
export function handleResetFilters() {
    resetFilters();
    
    // 重置UI
    const tab = state.currentSubTab;
    if (tab === 'issue') {
        const cardTypeSelect = document.getElementById('issueFilterCardType');
        const statusSelect = document.getElementById('issueFilterStatus');
        const yearSelect = document.getElementById('issueFilterYear');
        if (cardTypeSelect) cardTypeSelect.value = '';
        if (statusSelect) statusSelect.value = '';
        if (yearSelect) yearSelect.value = '';
    } else {
        const cardTypeSelect = document.getElementById('recycleFilterCardType');
        const statusSelect = document.getElementById('recycleFilterStatus');
        const reasonSelect = document.getElementById('recycleFilterReason');
        const yearSelect = document.getElementById('recycleFilterYear');
        if (cardTypeSelect) cardTypeSelect.value = '';
        if (statusSelect) statusSelect.value = '';
        if (reasonSelect) reasonSelect.value = '';
        if (yearSelect) yearSelect.value = '';
    }
    
    renderTable();
}

/**
 * 分页按钮点击
 */
export function handlePageChange(page) {
    goToPage(page);
    renderTable();
}

/**
 * 每页显示条数改变
 */
export function handlePageSizeChange(event) {
    const size = parseInt(event.target.value, 10);
    if (!isNaN(size) && size > 0) {
        changePageSize(size);
        renderTable();
    }
}

/**
 * 导出按钮点击
 */
export function handleExportClick() {
    try {
        exportToExcel();
    } catch (e) {
        console.error('导出失败:', e);
        alert('导出失败：' + e.message);
    }
}

/**
 * 导入按钮点击
 */
export function handleImportClick() {
    const input = document.getElementById('importFileInput');
    if (input) {
        input.click();
    }
}

/**
 * 导入文件选择
 */
export function handleImportFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    importFromExcel(file)
        .then(count => {
            alert('成功导入 ' + count + ' 条记录！');
            renderTable();
            // 清空文件选择
            event.target.value = '';
        })
        .catch(err => {
            console.error('导入失败:', err);
            alert('导入失败：' + err.message);
            event.target.value = '';
        });
}

/**
 * 清空所有数据（带确认）
 */
export function handleClearAllData() {
    if (!confirm('确定要清空所有数据吗？此操作不可撤销！')) {
        return;
    }
    
    if (!confirm('最后确认：真的要删除全部数据吗？')) {
        return;
    }
    
    state.records = [];
    state.selected = [];
    saveRecords();
    renderTable();
    alert('所有数据已清空！');
}

/**
 * 卡类型改变事件（自动显示/隐藏关联军人字段）
 */
export function handleCardTypeChange(event) {
    const cardType = event.target.value;
    const form = event.target.closest('form');
    if (!form) return;
    
    const familyMemberGroup = form.querySelector('.family-member-group');
    if (!familyMemberGroup) return;
    
    if (cardType === 'Ⅲ类卡') {
        familyMemberGroup.style.display = 'block';
    } else {
        familyMemberGroup.style.display = 'none';
        const input = familyMemberGroup.querySelector('input');
        if (input) input.value = '';
    }
}

/**
 * 打开配置弹窗
 */
export function openConfigModal() {
    const modal = document.getElementById('configModal');
    if (!modal) return;
    
    // 填充当前配置
    const cardTypesInput = document.getElementById('configCardTypes');
    const reasonsInput = document.getElementById('configRecycleReasons');
    
    if (cardTypesInput) {
        cardTypesInput.value = state.config.cardTypes.join('\n');
    }
    
    if (reasonsInput) {
        reasonsInput.value = (state.config.actions.reasons || []).join('\n');
    }
    
    modal.style.display = 'block';
}

/**
 * 关闭配置弹窗
 */
export function closeConfigModal() {
    const modal = document.getElementById('configModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 保存配置
 */
export function saveConfigSettings() {
    const cardTypesInput = document.getElementById('configCardTypes');
    const reasonsInput = document.getElementById('configRecycleReasons');
    
    if (cardTypesInput) {
        const types = cardTypesInput.value
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        if (types.length > 0) {
            state.config.cardTypes = types;
        }
    }
    
    if (reasonsInput) {
        const reasons = reasonsInput.value
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        if (reasons.length > 0) {
            if (!state.config.actions) {
                state.config.actions = {};
            }
            state.config.actions.reasons = reasons;
        }
    }
    
    // 保存到存储
    saveConfig();
    
    // 关闭弹窗
    closeConfigModal();
    
    // 重新渲染（更新下拉选项等）
    renderTable();
    
    alert('配置已保存！');
}

/**
 * 年份筛选改变
 */
export function handleYearFilterChange(event) {
    const year = event.target.value;
    filterByYear(year);
    renderTable();
}

/**
 * 日期范围筛选
 */
export function handleDateRangeFilter() {
    const startDateInput = document.getElementById(state.currentSubTab + 'FilterStartDate');
    const endDateInput = document.getElementById(state.currentSubTab + 'FilterEndDate');
    
    if (!startDateInput || !endDateInput) return;
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    filterByDateRange(startDate, endDate);
    renderTable();
}

/**
 * 初始化事件监听器
 */
export function initEventListeners() {
    // 标签页切换
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchSubTab(tab);
        });
    });
    
    // 全选复选框
    const issueSelectAll = document.getElementById('issueSelectAll');
    if (issueSelectAll) {
        issueSelectAll.addEventListener('change', () => toggleSelectAll('issue'));
    }
    
    const recycleSelectAll = document.getElementById('recycleSelectAll');
    if (recycleSelectAll) {
        recycleSelectAll.addEventListener('change', () => toggleSelectAll('recycle'));
    }
    
    // 表格排序
    document.querySelectorAll('.registry-table th.sortable').forEach(th => {
        th.addEventListener('click', handleSortClick);
    });
    
    // 搜索框
    const issueSearch = document.getElementById('issueSearch');
    if (issueSearch) {
        issueSearch.addEventListener('input', handleSearchInput);
    }
    
    const recycleSearch = document.getElementById('recycleSearch');
    if (recycleSearch) {
        recycleSearch.addEventListener('input', handleSearchInput);
    }
    
    // 筛选器
    const filters = [
        'issueFilterCardType', 'issueFilterStatus', 'issueFilterYear',
        'recycleFilterCardType', 'recycleFilterStatus', 'recycleFilterReason', 'recycleFilterYear'
    ];
    
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', handleFilterChange);
        }
    });
    
    // 卡类型改变（显示/隐藏关联军人）
    const issueCardType = document.querySelector('#issueForm select[name="cardType"]');
    if (issueCardType) {
        issueCardType.addEventListener('change', handleCardTypeChange);
    }
    
    const recycleCardType = document.querySelector('#recycleForm select[name="cardType"]');
    if (recycleCardType) {
        recycleCardType.addEventListener('change', handleCardTypeChange);
    }
    
    debugLog('✅ 事件监听器初始化完成');
}

// 导出所有事件处理函数供全局使用
export const EventHandlers = {
    switchSubTab,
    toggleRowSelect,
    toggleSelectAll,
    batchRemove,
    toggleIssueForm,
    toggleRecycleForm,
    submitIssueForm,
    submitRecycleForm,
    handleSortClick,
    handleSearchInput,
    handleClearSearch,
    handleFilterChange,
    handleResetFilters,
    handlePageChange,
    handlePageSizeChange,
    handleExportClick,
    handleImportClick,
    handleImportFileChange,
    handleClearAllData,
    handleCardTypeChange,
    openConfigModal,
    closeConfigModal,
    saveConfigSettings,
    handleYearFilterChange,
    handleDateRangeFilter,
    initEventListeners,
    
    // 从 data-manager 导出的函数
    remove,
    toggleCardStatus,
    toggleRecycleStatus,
    editCell,
    saveCellEdit,
    cancelCellEdit,
    addInlineRow,
    cancelInlineRow
};

