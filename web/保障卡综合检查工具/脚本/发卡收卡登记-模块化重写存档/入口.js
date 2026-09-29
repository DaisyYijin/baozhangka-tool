/**
 * 发卡收卡登记系统 - 主入口文件
 * 整合所有模块，提供统一的API接口
 */

// 导入所有模块
import * as Utils from './工具函数.js';
import * as Storage from './存储处理.js';
import * as Config from './配置.js';
import * as DataManager from './数据管理.js';
import * as FilterSearch from './过滤搜索.js';
import * as Pagination from './分页.js';
import * as UIRenderer from './界面渲染.js';
import * as EventHandlers from './事件处理.js';
import * as ImportExport from './导入导出.js';

// 导出状态（用于调试和测试）
export { state } from './配置.js';

/**
 * 初始化系统
 */
export function init() {
    debugLog('[发卡收卡登记] 模块化系统初始化...');
    
    try {
        // 加载配置和数据
        Config.state.config = Storage.loadConfig();
        Config.state.records = Storage.loadRecords();
        Config.state.currentSubTab = Storage.loadCurrentSubTab();
        
        // 填充年度过滤器
        FilterSearch.populateYearFilters();
        
        // 更新常用部门列表
        DataManager.updateCommonDepartments();
        
        debugLog('[发卡收卡登记] 初始化完成，记录数:', Config.state.records.length);
        
        return true;
    } catch (error) {
        console.error('[发卡收卡登记] 初始化失败:', error);
        return false;
    }
}

/**
 * 对外暴露的API接口
 * 为了与旧代码兼容，保持相同的函数名
 */
export const CardRegistry = {
    // 工具函数
    uid: Utils.uid,
    getPinyinInitial: Utils.getPinyinInitial,
    getInitials: Utils.getInitials,
    parseDate: Utils.parseDate,
    fmtDate: Utils.fmtDate,
    fmtDateDisplay: Utils.fmtDateDisplay,
    isValidDate: Utils.isValidDate,
    normalizeCardType: Utils.normalizeCardType,
    showNotification: Utils.showNotification,
    escapeHtml: Utils.escapeHtml,
    mapAction: Utils.mapAction,
    mapStatus: Utils.mapStatus,
    daysBetween: Utils.daysBetween,
    getUnclaimedClass: Utils.getUnclaimedClass,
    
    // 存储管理
    loadConfig: Storage.loadConfig,
    saveConfig: Storage.saveConfig,
    loadRecords: Storage.loadRecords,
    saveRecords: Storage.saveRecords,
    loadCurrentSubTab: Storage.loadCurrentSubTab,
    saveCurrentSubTab: Storage.saveCurrentSubTab,
    getStorageInfo: Storage.getStorageInfo,
    
    // 数据管理
    addRecord: DataManager.addRecord,
    updateRecord: DataManager.updateRecord,
    deleteRecord: DataManager.deleteRecord,
    getRecord: DataManager.getRecord,
    findRecordsByIdNumber: DataManager.findRecordsByIdNumber,
    findRecordsByCardNumber: DataManager.findRecordsByCardNumber,
    checkDuplicate: DataManager.checkDuplicate,
    checkDuplicates: DataManager.checkDuplicates,
    validateRecord: DataManager.validateRecord,
    batchUpdate: DataManager.batchUpdate,
    batchDelete: DataManager.batchDelete,
    getAllRecords: DataManager.getAllRecords,
    getRecordCount: DataManager.getRecordCount,
    createIssueRecord: DataManager.createIssueRecord,
    createRecycleRecord: DataManager.createRecycleRecord,
    importRecords: DataManager.importRecords,
    updateCommonDepartments: DataManager.updateCommonDepartments,
    
    // 搜索过滤
    getFilteredRecords: FilterSearch.getFilteredRecords,
    filterByCardStatus: FilterSearch.filterByCardStatus,
    filterByRecycleStatus: FilterSearch.filterByRecycleStatus,
    searchRecords: FilterSearch.searchRecords,
    clearSearch: FilterSearch.clearSearch,
    filterByYear: FilterSearch.filterByYear,
    filterByDateRange: FilterSearch.filterByDateRange,
    resetFilters: FilterSearch.resetFilters,
    populateYearFilters: FilterSearch.populateYearFilters,
    updateSearchCount: FilterSearch.updateSearchCount,
    
    // 分页
    updatePagination: Pagination.updatePagination,
    goToPage: Pagination.goToPage,
    changePageSize: Pagination.changePageSize,
    resetPagination: Pagination.resetPagination,
    getPaginatedRecords: Pagination.getPaginatedRecords,
    getPaginationInfo: Pagination.getPaginationInfo,
    nextPage: Pagination.nextPage,
    previousPage: Pagination.previousPage,
    firstPage: Pagination.firstPage,
    lastPage: Pagination.lastPage,
    
    // UI渲染
    renderTable: UIRenderer.renderTable,
    renderIssueTable: UIRenderer.renderIssueTable,
    renderRecycleTable: UIRenderer.renderRecycleTable,
    updateUnclaimedWarning: UIRenderer.updateUnclaimedWarning,
    updateStats: UIRenderer.updateStats,
    updateSelectAllCheckbox: UIRenderer.updateSelectAllCheckbox,
    ensureCardTypeOptions: UIRenderer.ensureCardTypeOptions,
    ensureRecycleReasonOptions: UIRenderer.ensureRecycleReasonOptions,
    updateCommonDepartmentsUI: UIRenderer.updateCommonDepartments,
    sortTable: UIRenderer.sortTable,
    
    // 事件处理
    switchSubTab: EventHandlers.switchSubTab,
    toggleRowSelect: EventHandlers.toggleRowSelect,
    toggleSelectAll: EventHandlers.toggleSelectAll,
    batchRemove: EventHandlers.batchRemove,
    toggleIssueForm: EventHandlers.toggleIssueForm,
    toggleRecycleForm: EventHandlers.toggleRecycleForm,
    submitIssueForm: EventHandlers.submitIssueForm,
    submitRecycleForm: EventHandlers.submitRecycleForm,
    handleSortClick: EventHandlers.handleSortClick,
    handleSearchInput: EventHandlers.handleSearchInput,
    handleClearSearch: EventHandlers.handleClearSearch,
    handleFilterChange: EventHandlers.handleFilterChange,
    handleResetFilters: EventHandlers.handleResetFilters,
    handlePageChange: EventHandlers.handlePageChange,
    handlePageSizeChange: EventHandlers.handlePageSizeChange,
    handleExportClick: EventHandlers.handleExportClick,
    handleImportClick: EventHandlers.handleImportClick,
    handleImportFileChange: EventHandlers.handleImportFileChange,
    handleClearAllData: EventHandlers.handleClearAllData,
    handleCardTypeChange: EventHandlers.handleCardTypeChange,
    openConfigModal: EventHandlers.openConfigModal,
    closeConfigModal: EventHandlers.closeConfigModal,
    saveConfigSettings: EventHandlers.saveConfigSettings,
    handleYearFilterChange: EventHandlers.handleYearFilterChange,
    handleDateRangeFilter: EventHandlers.handleDateRangeFilter,
    initEventListeners: EventHandlers.initEventListeners,
    
    // 导入导出
    exportToExcel: ImportExport.exportToExcel,
    importFromExcel: ImportExport.importFromExcel,
    downloadTemplate: ImportExport.downloadTemplate,
    backupAllData: ImportExport.backupAllData,
    backupCompleteData: ImportExport.backupCompleteData,
    restoreFromBackup: ImportExport.restoreFromBackup,
    clearAllData: ImportExport.clearAllData,
    
    // 配置和状态
    getState: () => Config.state,
    getStateSnapshot: Config.getStateSnapshot,
    
    // 初始化
    init: init
};

/**
 * 兼容旧代码：将API暴露到window.REG
 * 注意：这是为了向后兼容，新代码应该使用ES6模块导入
 */
if (typeof window !== 'undefined') {
    window.CardRegistryModular = CardRegistry;
    debugLog('[发卡收卡登记] API已暴露到 window.CardRegistryModular');
}

// 默认导出
export default CardRegistry;

/**
 * 测试函数 - 验证模块是否正常工作
 */
export function test() {
    debugLog('=== 模块化系统测试 ===');
    
    try {
        // 测试工具函数
        debugLog('1. 测试拼音转换:');
        debugLog('   张三 ->', Utils.getInitials('张三'));
        debugLog('   李四 ->', Utils.getInitials('李四'));
        
        // 测试日期处理
        debugLog('2. 测试日期处理:');
        debugLog('   20241027 ->', Utils.parseDate('20241027'));
        debugLog('   2024-10-27 ->', Utils.fmtDateDisplay('2024-10-27'));
        
        // 测试数据管理
        debugLog('3. 测试数据管理:');
        const testRecord = DataManager.createIssueRecord({
            name: '测试人员',
            idNumber: '110101199001011234',
            department: '测试部门',
            cardType: '1'
        });
        debugLog('   创建测试记录:', testRecord);
        
        // 测试过滤
        debugLog('4. 测试过滤功能:');
        debugLog('   总记录数:', Config.state.records.length);
        
        // 测试分页
        debugLog('5. 测试分页:');
        Pagination.updatePagination(100);
        debugLog('   分页信息:', Pagination.getPaginationInfo());
        
        debugLog('=== 所有测试通过 ===');
        return true;
    } catch (error) {
        console.error('=== 测试失败 ===', error);
        return false;
    }
}

debugLog('[发卡收卡登记] 模块加载完成');

