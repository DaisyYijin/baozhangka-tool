// 发卡收卡登记 - 最小可用模型与UI联动
(function () {
    var STORAGE_KEY = 'cardRegistry.records';
    var CONFIG_KEY = 'cardRegistry.config';
    var SUBTAB_KEY = 'cardRegistry.currentSubTab';

    var defaultConfig = {
        cardTypes: ['Ⅰ类卡', 'Ⅱ类卡', 'Ⅲ类卡', 'Ⅳ类卡'],
        defaultCardType: 'Ⅰ类卡',  // 默认卡类型
        commonDepartments: [],  // 常用部门列表
        actions: {
            types: ['issue', 'recycle', 'replace', 'loss', 'other'],
            reasons: ['退伍回收','复员回收','转业回收','损坏回收','纠错回收','更换回收','消磁回收','其他原因回收'],
            channels: ['frontdesk','batch','proxy']
        },
        ui: { dateFormat: 'YYYY-MM-DD' }
    };

    function loadConfig() {
        try { 
            var cfg = JSON.parse(localStorage.getItem(CONFIG_KEY)) || defaultConfig;
            // 确保新字段存在
            if (!cfg.defaultCardType) cfg.defaultCardType = 'Ⅰ类卡';
            if (!cfg.commonDepartments) cfg.commonDepartments = [];
            return cfg;
        } catch (e) { return defaultConfig; }
    }
    function saveConfig(cfg) { 
        try { 
            if (cfg) {
                localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); 
                state.config = cfg;
            }
        } catch (e) {} 
    }

    function loadRecords() {
        try { 
            var data = localStorage.getItem(STORAGE_KEY);
            if (!data || data === 'undefined' || data === 'null') {
                return [];
            }
            return JSON.parse(data) || []; 
        } catch (e) { 
            console.error('加载数据失败:', e);
            return []; 
        }
    }
    function saveRecords(list) { 
        try { 
            if (!list || !Array.isArray(list)) {
                console.error('saveRecords: 参数无效', list);
                return false;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); 
            return true;
        } catch (e) { 
            console.error('保存数据失败:', e);
            if (window.NotificationManager) {
                window.NotificationManager.error('保存数据失败：' + e.message);
            }
            return false;
        } 
    }
    
    function loadCurrentSubTab() {
        try { return localStorage.getItem(SUBTAB_KEY) || 'issue'; } catch (e) { return 'issue'; }
    }
    function saveCurrentSubTab(tab) { try { localStorage.setItem(SUBTAB_KEY, tab); } catch (e) {} }

    function uid() { return 'R' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
    
    // 计算两个日期之间的天数差
    function daysBetween(date1, date2) {
        if (!date1) return 0;
        var d1 = new Date(date1);
        var d2 = date2 ? new Date(date2) : new Date();
        var diff = d2.getTime() - d1.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    
    // 根据未发卡天数返回CSS类名（背景色标记）
    function getUnclaimedClass(issueDate, receiveDate, cardStatus) {
        // 只对"未发卡"状态且长时间未改状态的记录进行背景色标记
        // 如果已经是"已发卡"状态，说明卡已经发出去了，不再需要背景色提醒
        if (cardStatus === '已发卡' || !issueDate) {
            return '';
        }
        var days = daysBetween(issueDate);
        if (days >= 60) return 'unclaimed-60days';  // 超过2个月
        if (days >= 30) return 'unclaimed-30days';  // 超过1个月
        if (days >= 15) return 'unclaimed-15days';  // 超过半个月
        if (days >= 7) return 'unclaimed-7days';    // 超过7天
        return '';
    }

    // 标准日期格式化（用于存储）YYYY-MM-DD
    function fmtDate(d) {
        if (!d) return '';
        try { var dt = new Date(d); var y = dt.getFullYear(); var m = (dt.getMonth()+1+'').padStart(2,'0'); var da = (dt.getDate()+'' ).padStart(2,'0'); return y+'-'+m+'-'+da; } catch(e){ return d; }
    }
    
    // 显示日期格式化（用于UI显示）YYYYMMDD
    function fmtDateDisplay(d) {
        if (!d) return '';
        try { 
            var dt = new Date(d); 
            var y = dt.getFullYear(); 
            var m = (dt.getMonth()+1+'').padStart(2,'0'); 
            var da = (dt.getDate()+'').padStart(2,'0'); 
            return y+m+da; 
        } catch(e){ return d; }
    }
    
    // 解析各种日期格式并转换为标准格式 YYYY-MM-DD
    function parseDate(dateStr) {
        if (!dateStr) return '';
        
        // 如果已经是 Date 对象
        if (dateStr instanceof Date) {
            return fmtDate(dateStr);
        }
        
        // 处理数字类型（Excel 日期序列号或时间戳）
        if (typeof dateStr === 'number') {
            // Excel 日期序列号范围：1 到 2958465 (1900-01-01 到 9999-12-31)
            // 时间戳范围：更大的数字
            if (dateStr > 0 && dateStr < 2958466) {
                // Excel 日期序列号：从 1900-01-01 开始的天数
                // 注意：Excel 错误地将 1900 当作闰年，所以需要特殊处理
                var excelEpoch = new Date(1900, 0, 1);
                var daysOffset = dateStr > 59 ? dateStr - 2 : dateStr - 1; // Excel 1900闰年bug修正
                var dt = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
                return fmtDate(dt);
            } else if (dateStr > 10000000000) {
                // 时间戳（毫秒或秒）
                var timestamp = dateStr > 10000000000 ? dateStr : dateStr * 1000;
                return fmtDate(new Date(timestamp));
            }
        }
        
        // 转换为字符串
        dateStr = String(dateStr).trim();
        if (!dateStr) return '';
        
        // 如果已经是标准格式 YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        
        // 如果是 YYYYMMDD 格式（8位数字）
        if (/^\d{8}$/.test(dateStr)) {
            var y = dateStr.substring(0, 4);
            var m = dateStr.substring(4, 6);
            var d = dateStr.substring(6, 8);
            return y + '-' + m + '-' + d;
        }
        
        // 如果是 YYYY/MM/DD 格式
        if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
            var parts = dateStr.split('/');
            var y = parts[0];
            var m = parts[1].padStart(2, '0');
            var d = parts[2].padStart(2, '0');
            return y + '-' + m + '-' + d;
        }
        
        // 如果是 YYYY.MM.DD 格式
        if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
            var parts = dateStr.split('.');
            var y = parts[0];
            var m = parts[1].padStart(2, '0');
            var d = parts[2].padStart(2, '0');
            return y + '-' + m + '-' + d;
        }
        
        // 如果是 MM/DD/YYYY 格式（美式日期）
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            var parts = dateStr.split('/');
            var m = parts[0].padStart(2, '0');
            var d = parts[1].padStart(2, '0');
            var y = parts[2];
            return y + '-' + m + '-' + d;
        }
        
        // 如果是 DD-MM-YYYY 或 DD/MM/YYYY 格式
        if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateStr)) {
            var parts = dateStr.split(/[-\/]/);
            var d = parts[0].padStart(2, '0');
            var m = parts[1].padStart(2, '0');
            var y = parts[2];
            return y + '-' + m + '-' + d;
        }
        
        // 如果是带时间的日期格式，提取日期部分
        if (dateStr.includes(' ')) {
            var datePart = dateStr.split(' ')[0];
            return parseDate(datePart); // 递归调用处理日期部分
        }
        
        // 尝试使用 Date 对象解析
        try {
            var dt = new Date(dateStr);
            if (!isNaN(dt.getTime())) {
                return fmtDate(dt);
            }
        } catch(e) {}
        
        // 如果都无法解析，返回原始值
        return dateStr;
    }
    
    // 提示框功能
    function showNotification(message, type, element) {
        type = type || 'error';
        
        // 移除已存在的提示框
        var existingToasts = document.querySelectorAll('.notification-toast');
        existingToasts.forEach(function(toast) {
            toast.remove();
        });
        
        // 如果指定了元素，标红
        if (element) {
            // 移除所有元素的错误状态
            var allInputs = document.querySelectorAll('.input-error');
            allInputs.forEach(function(input) {
                input.classList.remove('input-error');
            });
            
            // 添加错误状态到当前元素
            element.classList.add('input-error');
            
            // 3秒后移除错误状态
            setTimeout(function() {
                element.classList.remove('input-error');
            }, 3000);
        }
        
        // 创建提示框
        var toast = document.createElement('div');
        toast.className = 'notification-toast ' + type;
        
        var iconMap = {
            error: '&#xf06a;',      // fa-exclamation-circle
            success: '&#xf00c;',    // fa-check
            warning: '&#xf071;',    // fa-exclamation-triangle
            info: '&#xf05a;'        // fa-info-circle
        };
        
        toast.innerHTML =
            '<i class="fa notification-icon">' + (iconMap[type] || iconMap.error) + '</i>' +
            '<div class="notification-content">' +
                '<p class="notification-message">' + escapeHtml(message) + '</p>' +
            '</div>' +
            '<button class="notification-close" onclick="this.parentElement.remove()">×</button>';
        
        document.body.appendChild(toast);
        
        // 自动消失
        setTimeout(function() {
            if (toast && toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(function() {
                    if (toast && toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // 验证日期格式
    function isValidDate(dateStr) {
        if (!dateStr || dateStr.trim() === '') return true; // 空值允许
        
        // 检查格式 YYYY-MM-DD
        var regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) {
            return false;
        }
        
        // 检查日期是否合理
        var parts = dateStr.split('-');
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        var day = parseInt(parts[2], 10);
        
        // 基本范围检查
        if (year < 1900 || year > 2100) return false;
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;
        
        // 检查月份天数
        var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        // 闰年2月有29天
        if (year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)) {
            daysInMonth[1] = 29;
        }
        
        if (day > daysInMonth[month - 1]) return false;
        
        return true;
    }

    var state = {
        config: loadConfig(),
        records: loadRecords(),
        filters: { action: '', status: '', cardType: '', keyword: '', cardStatus: '', yearByIssueDate: '', yearByReceiveDate: '', issueStartDate: '', issueEndDate: '', receiveStartDate: '', receiveEndDate: '', recycleStartDate: '', recycleEndDate: '' },
        sort: { column: '', direction: '' },
        selected: [],
        pagination: {
            currentPage: 1,
            pageSize: 50,  // 每页显示50条
            totalPages: 1,
            totalRecords: 0
        }
    };

    function ensureCardTypeOptions() {
        var ids = ['issueFilterCardType','recycleFilterCardType'];
        ids.forEach(function(id){
            var sel = document.getElementById(id);
            if (sel) sel.innerHTML = '<option value="">卡型：全部</option>' + state.config.cardTypes.map(function(ct){ return '<option value="'+ct+'">'+ct+'</option>'; }).join('');
        });
    }

    function ensureRecycleReasonOptions() {
        var sel = document.getElementById('recycleFilterReason');
        if (!sel) return;
        var reasons = state.config.actions.reasons || [];
        sel.innerHTML = '<option value="">回收类型：全部</option>' + reasons.map(function(r){ return '<option value="'+r+'">'+r+'</option>'; }).join('');
    }

    var currentSubTab = 'issue';
    
    function filterByCard(status, cardType) {
        // 检查是否点击了已激活的卡片（取消选择）
        var isDeselecting = false;
        if (!cardType) {
            // 点击的是父卡片
            var parentCards = document.querySelectorAll('#registryIssueTab .parent-filter-card');
            parentCards.forEach(function(card){
                var cStatus = card.getAttribute('data-status');
                if (cStatus === status && card.classList.contains('active')) {
                    isDeselecting = true;
                }
            });
        } else {
            // 点击的是子卡片
            var childCards = document.querySelectorAll('#registryIssueTab .child-filter-card');
            childCards.forEach(function(card){
                var cStatus = card.getAttribute('data-status');
                var cType = card.getAttribute('data-type');
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
            var allCards = document.querySelectorAll('#registryIssueTab .parent-filter-card, #registryIssueTab .child-filter-card');
            allCards.forEach(function(card){ card.classList.remove('active'); });
        } else {
            // 正常筛选
            state.filters.action = 'issue';
            state.filters.cardStatus = status;
            state.filters.cardType = cardType;
            state.filters.keyword = '';
            state.filters.recycleReason = '';
            
            // 更新父卡片激活状态
            var parentCards = document.querySelectorAll('#registryIssueTab .parent-filter-card');
            parentCards.forEach(function(card){
                var cStatus = card.getAttribute('data-status');
                if (cStatus === status && !cardType) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
            
            // 更新子卡片激活状态
            var childCards = document.querySelectorAll('#registryIssueTab .child-filter-card');
            childCards.forEach(function(card){
                var cStatus = card.getAttribute('data-status');
                var cType = card.getAttribute('data-type');
                if (cStatus === status && cType === cardType) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
        }
        
        renderTable();
    }
    
    function filterRecycleCard(status, reason, cardType) {
        // 检查是否点击了已激活的卡片（取消该维度的选择）
        var isDeselecting = false;
        
        if (!reason && !cardType) {
            // 点击的是父卡片（只按状态筛选）
            var parentCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card');
            parentCards.forEach(function(card){
                var cStatus = card.getAttribute('data-status');
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
                var allCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card, #registryRecycleTab .child-filter-card');
                allCards.forEach(function(card){ card.classList.remove('active'); });
            } else {
                // 正常筛选：只按状态，清除所有子筛选
                state.filters.action = 'recycle';
                state.filters.status = status;
                state.filters.recycleReason = '';  // 清除回收类型筛选
                state.filters.cardType = '';       // 清除卡类型筛选
                state.filters.keyword = '';
                state.filters.cardStatus = '';
                
                // 移除所有卡片的激活状态
                var allCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card, #registryRecycleTab .child-filter-card');
                allCards.forEach(function(card){ card.classList.remove('active'); });
                
                // 激活父卡片
                var parentCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card');
                parentCards.forEach(function(card){
                    var cStatus = card.getAttribute('data-status');
                    if (cStatus === status) {
                        card.classList.add('active');
                    }
                });
            }
        } else {
            // 点击的是子卡片（卡类型或回收类型）
            var childCards = document.querySelectorAll('#registryRecycleTab .child-filter-card');
            childCards.forEach(function(card){
                var cStatus = card.getAttribute('data-status');
                var cType = card.getAttribute('data-cardtype');
                var cReason = card.getAttribute('data-reason');
                
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
                    // 取消卡类型选择，保留回收类型（如果有）
                    state.filters.cardType = '';
                } else if (reason) {
                    // 取消回收类型选择，保留卡类型（如果有）
                    state.filters.recycleReason = '';
                }
                
                // 移除该维度的激活状态
                childCards.forEach(function(card){
                    var cType = card.getAttribute('data-cardtype');
                    var cReason = card.getAttribute('data-reason');
                    if ((cardType && cType === cardType) || (reason && cReason === reason)) {
                        card.classList.remove('active');
                    }
                });
                
                // 如果两个维度都被取消了，恢复到只按状态筛选，激活父卡片
                if (!state.filters.cardType && !state.filters.recycleReason) {
                    state.filters.action = 'recycle';
                    state.filters.status = status;
                    state.filters.keyword = '';
                    state.filters.cardStatus = '';
                    
                    // 激活父卡片
                    var parentCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card');
                    parentCards.forEach(function(card){
                        var cStatus = card.getAttribute('data-status');
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
                    // 点击了卡类型，保留现有的回收类型筛选
                    state.filters.cardType = cardType;
                } else if (reason) {
                    // 点击了回收类型，保留现有的卡类型筛选
                    state.filters.recycleReason = reason;
                }
                
                // 移除父卡片的激活状态（因为现在有更细的筛选）
                var parentCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card');
                parentCards.forEach(function(card){ card.classList.remove('active'); });
                
                // 更新子卡片的激活状态
                childCards.forEach(function(card){
                    var cStatus = card.getAttribute('data-status');
                    var cType = card.getAttribute('data-cardtype');
                    var cReason = card.getAttribute('data-reason');
                    
                    if (cStatus === status) {
                        // 激活当前筛选条件对应的卡片
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
        
        renderTable();
    }
    
    function applyFilters() {
        if (currentSubTab === 'issue') {
            // 发卡界面通过卡片筛选，不需要单独的筛选器
        } else {
            // 收卡界面通过卡片筛选
        }
        renderTable();
    }

    function resetFilters() {
        // 重置为不选中任何卡片，显示所有记录
        if (currentSubTab === 'issue') {
            state.filters = { action: 'issue', status: '', cardType: '', keyword: '', recycleReason: '', cardStatus: '', yearByIssueDate: '', yearByReceiveDate: '', issueStartDate: '', issueEndDate: '', receiveStartDate: '', receiveEndDate: '' };
            var allCards = document.querySelectorAll('#registryIssueTab .parent-filter-card, #registryIssueTab .child-filter-card');
            allCards.forEach(function(card){ card.classList.remove('active'); });
            
            // 清空发卡登记的筛选UI
            var issueYearByIssue = document.getElementById('issueYearFilterByIssueDate');
            var issueYearByReceive = document.getElementById('issueYearFilterByReceiveDate');
            var issueStart = document.getElementById('issueStartDate');
            var issueEnd = document.getElementById('issueEndDate');
            var receiveStart = document.getElementById('receiveStartDate');
            var receiveEnd = document.getElementById('receiveEndDate');
            if (issueYearByIssue) issueYearByIssue.value = '';
            if (issueYearByReceive) issueYearByReceive.value = '';
            if (issueStart) issueStart.value = '';
            if (issueEnd) issueEnd.value = '';
            if (receiveStart) receiveStart.value = '';
            if (receiveEnd) receiveEnd.value = '';
        } else {
            state.filters = { action: 'recycle', status: '', cardType: '', keyword: '', recycleReason: '', cardStatus: '', recycleStartDate: '', recycleEndDate: '' };
            var allCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card, #registryRecycleTab .child-filter-card');
            allCards.forEach(function(card){ card.classList.remove('active'); });
            
            // 清空收卡登记的筛选UI
            var recycleYear = document.getElementById('recycleYearFilter');
            var recycleStart = document.getElementById('recycleStartDate');
            var recycleEnd = document.getElementById('recycleEndDate');
            if (recycleYear) recycleYear.value = '';
            if (recycleStart) recycleStart.value = '';
            if (recycleEnd) recycleEnd.value = '';
        }
        renderTable();
    }

    function updateStats(list) {
        // 统计发卡记录
        var issueRecords = state.records.filter(function(r){ return r.action && r.action.type==='issue'; });
        
        // 已发卡统计
        var issued = issueRecords.filter(function(r){ return (r.action.cardStatus||'未发卡') === '已发卡'; });
        var el = document.getElementById('issued-total'); if(el) el.innerText = issued.length;
        el = document.getElementById('issued-1'); if(el) el.innerText = issued.filter(function(r){ return r.card&&r.card.cardType==='Ⅰ类卡'; }).length;
        el = document.getElementById('issued-2'); if(el) el.innerText = issued.filter(function(r){ return r.card&&r.card.cardType==='Ⅱ类卡'; }).length;
        el = document.getElementById('issued-3'); if(el) el.innerText = issued.filter(function(r){ return r.card&&r.card.cardType==='Ⅲ类卡'; }).length;
        el = document.getElementById('issued-4'); if(el) el.innerText = issued.filter(function(r){ return r.card&&r.card.cardType==='Ⅳ类卡'; }).length;
        
        // 未发卡统计
        var pending = issueRecords.filter(function(r){ return (r.action.cardStatus||'未发卡') === '未发卡'; });
        el = document.getElementById('pending-total'); if(el) el.innerText = pending.length;
        el = document.getElementById('pending-1'); if(el) el.innerText = pending.filter(function(r){ return r.card&&r.card.cardType==='Ⅰ类卡'; }).length;
        el = document.getElementById('pending-2'); if(el) el.innerText = pending.filter(function(r){ return r.card&&r.card.cardType==='Ⅱ类卡'; }).length;
        el = document.getElementById('pending-3'); if(el) el.innerText = pending.filter(function(r){ return r.card&&r.card.cardType==='Ⅲ类卡'; }).length;
        el = document.getElementById('pending-4'); if(el) el.innerText = pending.filter(function(r){ return r.card&&r.card.cardType==='Ⅳ类卡'; }).length;
        
        // 统计收卡记录
        var recycleRecords = state.records.filter(function(r){ return r.action && r.action.type==='recycle'; });
        
        // 待办回收统计（两个维度：按卡类型 + 按回收类型，支持动态联动）
        var recyclePending = recycleRecords.filter(function(r){ return (r.action.status||'done') === 'pending'; });
        el = document.getElementById('recycle-pending-total'); if(el) el.innerText = recyclePending.length;
        
        // 根据当前筛选条件决定统计基数
        var pendingBase = recyclePending;
        if (currentSubTab === 'recycle' && state.filters.status === 'pending') {
            // 如果当前在未回收标签页
            if (state.filters.cardType) {
                // 如果选择了卡类型，回收类型统计基于该卡类型
                pendingBase = recyclePending.filter(function(r){ return r.card&&r.card.cardType===state.filters.cardType; });
            } else if (state.filters.recycleReason) {
                // 如果选择了回收类型，卡类型统计基于该回收类型
                pendingBase = recyclePending.filter(function(r){ return r.action&&r.action.reason===state.filters.recycleReason; });
            }
        }
        
        // 按卡类型统计（如果选择了回收类型，则基于该回收类型）
        var cardTypeBase = state.filters.status === 'pending' && state.filters.recycleReason ? 
            recyclePending.filter(function(r){ return r.action&&r.action.reason===state.filters.recycleReason; }) : 
            recyclePending;
        el = document.getElementById('recycle-pending-type1'); if(el) el.innerText = cardTypeBase.filter(function(r){ return r.card&&r.card.cardType==='Ⅰ类卡'; }).length;
        el = document.getElementById('recycle-pending-type2'); if(el) el.innerText = cardTypeBase.filter(function(r){ return r.card&&r.card.cardType==='Ⅱ类卡'; }).length;
        el = document.getElementById('recycle-pending-type3'); if(el) el.innerText = cardTypeBase.filter(function(r){ return r.card&&r.card.cardType==='Ⅲ类卡'; }).length;
        el = document.getElementById('recycle-pending-type4'); if(el) el.innerText = cardTypeBase.filter(function(r){ return r.card&&r.card.cardType==='Ⅳ类卡'; }).length;
        
        // 按回收类型统计（如果选择了卡类型，则基于该卡类型）
        var reasonBase = state.filters.status === 'pending' && state.filters.cardType ? 
            recyclePending.filter(function(r){ return r.card&&r.card.cardType===state.filters.cardType; }) : 
            recyclePending;
        el = document.getElementById('recycle-pending-reason1'); if(el) el.innerText = reasonBase.filter(function(r){ return r.action&&r.action.reason==='退伍回收'; }).length;
        el = document.getElementById('recycle-pending-reason2'); if(el) el.innerText = reasonBase.filter(function(r){ return r.action&&r.action.reason==='复员回收'; }).length;
        el = document.getElementById('recycle-pending-reason3'); if(el) el.innerText = reasonBase.filter(function(r){ return r.action&&r.action.reason==='转业回收'; }).length;
        el = document.getElementById('recycle-pending-reason4'); if(el) el.innerText = reasonBase.filter(function(r){ return r.action&&r.action.reason==='损坏回收'; }).length;
        el = document.getElementById('recycle-pending-reason5'); if(el) el.innerText = reasonBase.filter(function(r){ return r.action&&r.action.reason==='纠错回收'; }).length;
        el = document.getElementById('recycle-pending-reason6'); if(el) el.innerText = reasonBase.filter(function(r){ return r.action&&r.action.reason==='更换回收'; }).length;
        el = document.getElementById('recycle-pending-reason7'); if(el) el.innerText = reasonBase.filter(function(r){ return r.action&&r.action.reason==='消磁回收'; }).length;
        el = document.getElementById('recycle-pending-reason8'); if(el) el.innerText = reasonBase.filter(function(r){ return r.action&&r.action.reason==='其他原因回收'; }).length;
        
        // 已完成回收统计（两个维度：按卡类型 + 按回收类型，支持动态联动）
        var recycleDone = recycleRecords.filter(function(r){ return (r.action.status||'done') === 'done'; });
        el = document.getElementById('recycle-done-total'); if(el) el.innerText = recycleDone.length;
        
        // 按卡类型统计（如果选择了回收类型，则基于该回收类型）
        var doneCardTypeBase = state.filters.status === 'done' && state.filters.recycleReason ? 
            recycleDone.filter(function(r){ return r.action&&r.action.reason===state.filters.recycleReason; }) : 
            recycleDone;
        el = document.getElementById('recycle-done-type1'); if(el) el.innerText = doneCardTypeBase.filter(function(r){ return r.card&&r.card.cardType==='Ⅰ类卡'; }).length;
        el = document.getElementById('recycle-done-type2'); if(el) el.innerText = doneCardTypeBase.filter(function(r){ return r.card&&r.card.cardType==='Ⅱ类卡'; }).length;
        el = document.getElementById('recycle-done-type3'); if(el) el.innerText = doneCardTypeBase.filter(function(r){ return r.card&&r.card.cardType==='Ⅲ类卡'; }).length;
        el = document.getElementById('recycle-done-type4'); if(el) el.innerText = doneCardTypeBase.filter(function(r){ return r.card&&r.card.cardType==='Ⅳ类卡'; }).length;
        
        // 按回收类型统计（如果选择了卡类型，则基于该卡类型）
        var doneReasonBase = state.filters.status === 'done' && state.filters.cardType ? 
            recycleDone.filter(function(r){ return r.card&&r.card.cardType===state.filters.cardType; }) : 
            recycleDone;
        el = document.getElementById('recycle-done-reason1'); if(el) el.innerText = doneReasonBase.filter(function(r){ return r.action&&r.action.reason==='退伍回收'; }).length;
        el = document.getElementById('recycle-done-reason2'); if(el) el.innerText = doneReasonBase.filter(function(r){ return r.action&&r.action.reason==='复员回收'; }).length;
        el = document.getElementById('recycle-done-reason3'); if(el) el.innerText = doneReasonBase.filter(function(r){ return r.action&&r.action.reason==='转业回收'; }).length;
        el = document.getElementById('recycle-done-reason4'); if(el) el.innerText = doneReasonBase.filter(function(r){ return r.action&&r.action.reason==='损坏回收'; }).length;
        el = document.getElementById('recycle-done-reason5'); if(el) el.innerText = doneReasonBase.filter(function(r){ return r.action&&r.action.reason==='纠错回收'; }).length;
        el = document.getElementById('recycle-done-reason6'); if(el) el.innerText = doneReasonBase.filter(function(r){ return r.action&&r.action.reason==='更换回收'; }).length;
        el = document.getElementById('recycle-done-reason7'); if(el) el.innerText = doneReasonBase.filter(function(r){ return r.action&&r.action.reason==='消磁回收'; }).length;
        el = document.getElementById('recycle-done-reason8'); if(el) el.innerText = doneReasonBase.filter(function(r){ return r.action&&r.action.reason==='其他原因回收'; }).length;
    }

    function filtered() {
        var f = state.filters;
        return state.records.filter(function(r){
            if (f.action && (!r.action || r.action.type!==f.action)) return false;
            if (f.status && (!r.action || r.action.status!==f.status)) return false;
            if (f.cardStatus && (!r.action || r.action.cardStatus!==f.cardStatus)) return false;
            if (f.cardType && (!r.card || r.card.cardType!==f.cardType)) return false;
            if (f.recycleReason && (!r.action || r.action.reason!==f.recycleReason)) return false;
            
            // 发卡日期年度筛选
            if (f.yearByIssueDate) {
                var d = r.dates || {};
                var dateStr = currentSubTab === 'issue' ? d.issueDate : d.recycleDate;
                if (dateStr) {
                    var year = dateStr.split('-')[0];
                    if (year !== f.yearByIssueDate) return false;
                } else {
                    return false;
                }
            }
            
            // 领卡日期年度筛选（仅发卡登记）
            if (f.yearByReceiveDate && currentSubTab === 'issue') {
                var d = r.dates || {};
                if (d.receiveDate) {
                    var year = d.receiveDate.split('-')[0];
                    if (year !== f.yearByReceiveDate) return false;
                } else {
                    return false;
                }
            }
            
            // 时间段筛选
            if (currentSubTab === 'issue') {
                var d = r.dates || {};
                
                // 发卡日期筛选
                if (f.issueStartDate || f.issueEndDate) {
                    var issueDate = d.issueDate;
                    if (issueDate) {
                        if (f.issueStartDate && issueDate < f.issueStartDate) return false;
                        if (f.issueEndDate && issueDate > f.issueEndDate) return false;
                    } else {
                        // 如果没有发卡日期，则不通过筛选
                        return false;
                    }
                }
                
                // 领卡日期筛选
                if (f.receiveStartDate || f.receiveEndDate) {
                    var receiveDate = d.receiveDate;
                    if (receiveDate) {
                        if (f.receiveStartDate && receiveDate < f.receiveStartDate) return false;
                        if (f.receiveEndDate && receiveDate > f.receiveEndDate) return false;
                    } else {
                        // 如果没有领卡日期，则不通过筛选
                        return false;
                    }
                }
            } else if (currentSubTab === 'recycle') {
                // 收卡日期筛选
                if (f.recycleStartDate || f.recycleEndDate) {
                    var d = r.dates || {};
                    var recycleDate = d.recycleDate;
                    if (recycleDate) {
                        if (f.recycleStartDate && recycleDate < f.recycleStartDate) return false;
                        if (f.recycleEndDate && recycleDate > f.recycleEndDate) return false;
                    } else {
                        return false;
                    }
                }
            }
            
            if (f.keyword) {
                var kw = f.keyword.toLowerCase().trim();
                if (!kw) return true; // 空关键词不过滤
                
                var p = r.person || {};
                var c = r.card || {};
                var a = r.action || {};
                var remark = r.remark || '';
                
                // 搜索：姓名、身份证号、部别、保障卡号、卡类型、回收类型、备注、关联军人
                var searchText = (
                    (p.name || '') +
                    (p.idNumber || '') +
                    (p.department || '') +
                    (c.cardNumber || '') +
                    (c.cardType || '') +
                    (c.relatedMilitary || '') +
                    (a.reason || '') +
                    remark
                ).toLowerCase();
                
                // 文本搜索
                if (searchText.indexOf(kw) === -1) return false;
            }
            return true;
        });
    }
    
    function search() {
        var input = currentSubTab === 'issue' 
            ? document.getElementById('issueSearchInput') 
            : document.getElementById('recycleSearchInput');
        if (input) {
            state.filters.keyword = input.value.trim();
            renderTable();
            updateSearchCount();
        }
    }
    
    function clearSearch() {
        var issueInput = document.getElementById('issueSearchInput');
        var recycleInput = document.getElementById('recycleSearchInput');
        if (issueInput) issueInput.value = '';
        if (recycleInput) recycleInput.value = '';
        state.filters.keyword = '';
        updateSearchCount();
        renderTable();
    }
    
    // 年度筛选
    function filterByYear() {
        if (currentSubTab === 'issue') {
            var issueDateFilter = document.getElementById('issueYearFilterByIssueDate');
            var receiveDateFilter = document.getElementById('issueYearFilterByReceiveDate');
            if (issueDateFilter) state.filters.yearByIssueDate = issueDateFilter.value;
            if (receiveDateFilter) state.filters.yearByReceiveDate = receiveDateFilter.value;
        } else {
            var recycleFilter = document.getElementById('recycleYearFilter');
            if (recycleFilter) state.filters.yearByIssueDate = recycleFilter.value;
        }
        state.pagination.currentPage = 1;
        renderTable();
    }
    
    // 时间段筛选
    function filterByDateRange() {
        if (currentSubTab === 'issue') {
            // 发卡日期筛选 - 统一转换为 YYYY-MM-DD 格式
            var issueStartInput = document.getElementById('issueStartDate');
            var issueEndInput = document.getElementById('issueEndDate');
            if (issueStartInput) {
                var dateValue = issueStartInput.value.trim();
                state.filters.issueStartDate = dateValue ? parseDate(dateValue) : '';
            }
            if (issueEndInput) {
                var dateValue = issueEndInput.value.trim();
                state.filters.issueEndDate = dateValue ? parseDate(dateValue) : '';
            }
            
            // 领卡日期筛选 - 统一转换为 YYYY-MM-DD 格式
            var receiveStartInput = document.getElementById('receiveStartDate');
            var receiveEndInput = document.getElementById('receiveEndDate');
            if (receiveStartInput) {
                var dateValue = receiveStartInput.value.trim();
                state.filters.receiveStartDate = dateValue ? parseDate(dateValue) : '';
            }
            if (receiveEndInput) {
                var dateValue = receiveEndInput.value.trim();
                state.filters.receiveEndDate = dateValue ? parseDate(dateValue) : '';
            }
        } else if (currentSubTab === 'recycle') {
            // 收卡日期筛选 - 统一转换为 YYYY-MM-DD 格式
            var recycleStartInput = document.getElementById('recycleStartDate');
            var recycleEndInput = document.getElementById('recycleEndDate');
            if (recycleStartInput) {
                var dateValue = recycleStartInput.value.trim();
                state.filters.recycleStartDate = dateValue ? parseDate(dateValue) : '';
            }
            if (recycleEndInput) {
                var dateValue = recycleEndInput.value.trim();
                state.filters.recycleEndDate = dateValue ? parseDate(dateValue) : '';
            }
        }
        
        state.pagination.currentPage = 1;
        renderTable();
    }
    
    // 填充年度下拉菜单
    function populateYearFilters() {
        // 收集发卡日期的年份
        var issueYears = {};
        // 收集领卡日期的年份
        var receiveYears = {};
        // 收集回收日期的年份
        var recycleYears = {};
        
        state.records.forEach(function(r) {
            var d = r.dates || {};
            
            if (d.issueDate) {
                var year = d.issueDate.split('-')[0];
                issueYears[year] = true;
            }
            
            if (d.receiveDate) {
                var year = d.receiveDate.split('-')[0];
                receiveYears[year] = true;
            }
            
            if (d.recycleDate) {
                var year = d.recycleDate.split('-')[0];
                recycleYears[year] = true;
            }
        });
        
        // 发卡日期年度选项
        var issueYearList = Object.keys(issueYears).sort().reverse();
        var issueOptions = '<option value="">发卡年度</option>' + 
                          issueYearList.map(function(y) { return '<option value="' + y + '">' + y + '年</option>'; }).join('');
        
        // 领卡日期年度选项
        var receiveYearList = Object.keys(receiveYears).sort().reverse();
        var receiveOptions = '<option value="">领卡年度</option>' + 
                            receiveYearList.map(function(y) { return '<option value="' + y + '">' + y + '年</option>'; }).join('');
        
        // 回收日期年度选项
        var recycleYearList = Object.keys(recycleYears).sort().reverse();
        var recycleOptions = '<option value="">回收年度</option>' + 
                            recycleYearList.map(function(y) { return '<option value="' + y + '">' + y + '年</option>'; }).join('');
        
        var issueFilterByIssueDate = document.getElementById('issueYearFilterByIssueDate');
        var issueFilterByReceiveDate = document.getElementById('issueYearFilterByReceiveDate');
        var recycleFilter = document.getElementById('recycleYearFilter');
        
        if (issueFilterByIssueDate) issueFilterByIssueDate.innerHTML = issueOptions;
        if (issueFilterByReceiveDate) issueFilterByReceiveDate.innerHTML = receiveOptions;
        if (recycleFilter) recycleFilter.innerHTML = recycleOptions;
    }
    
    function updateSearchCount() {
        var countEl = currentSubTab === 'issue' 
            ? document.getElementById('issueSearchCount') 
            : document.getElementById('recycleSearchCount');
        if (!countEl) return;
        
        if (state.filters.keyword) {
            var count = filtered().filter(function(r){ 
                return r.action && r.action.type === currentSubTab; 
            }).length;
            countEl.textContent = '(' + count + '条)';
            countEl.style.display = 'block';
        } else {
            countEl.textContent = '';
            countEl.style.display = 'none';
        }
    }

    function renderTable() {
        var rows = filtered();
        updateStats(rows);
        
        // 更新表头排序指示器
        var headers = document.querySelectorAll('.registry-table th.sortable');
        headers.forEach(function(th){
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.getAttribute('data-column') === state.sort.column) {
                th.classList.add('sort-' + state.sort.direction);
            }
        });
        
        if (currentSubTab === 'issue') {
            var issueBody = document.getElementById('issueTableBody');
            if (!issueBody) return;
            var issueRows = rows.filter(function(r){ return r.action && r.action.type==='issue'; });
            if (issueRows.length===0) { 
                issueBody.innerHTML = '<tr class="empty-row"><td colspan="12"><div class="empty">暂无发卡记录</div></td></tr>'; 
                updatePagination(0);
                updateUnclaimedWarning([]);  // 清空数据时隐藏警告横幅
                return; 
            }
            
            // 默认排序：未发卡在前，已发卡在后，各自按时间排序
            issueRows = sortRecords(issueRows);
            
            // 分页处理
            state.pagination.totalRecords = issueRows.length;
            state.pagination.totalPages = Math.ceil(issueRows.length / state.pagination.pageSize);
            if (state.pagination.currentPage > state.pagination.totalPages) {
                state.pagination.currentPage = state.pagination.totalPages || 1;
            }
            
            var startIndex = (state.pagination.currentPage - 1) * state.pagination.pageSize;
            var endIndex = startIndex + state.pagination.pageSize;
            var pageRows = issueRows.slice(startIndex, endIndex);
            
            issueBody.innerHTML = pageRows.map(function(r, idx){
                var p=r.person||{}, c=r.card||{}, a=r.action||{}, d=r.dates||{};
                var cardStatus = a.cardStatus || '未发卡';
                var isChecked = state.selected.indexOf(r.id) !== -1;
                var rowNumber = startIndex + idx + 1;
                var unclaimedClass = getUnclaimedClass(d.issueDate, d.receiveDate, cardStatus);
                
                // 姓名显示：Ⅲ类卡显示"姓名(关联军人)"格式
                var personName = p.name || '';
                var relatedMilitary = c.relatedMilitary || '';
                var isType3Card = c.cardType === 'Ⅲ类卡';
                var nameDisplay = personName;
                if (isType3Card && relatedMilitary) {
                    nameDisplay = personName + '(' + relatedMilitary + ')';
                }
                
                return '<tr class="'+unclaimedClass+'">'+
                    '<td class="checkbox-col"><input type="checkbox" class="row-checkbox" data-id="'+r.id+'" '+
                    (isChecked?'checked':'')+' onchange="REG.toggleRowSelect(\''+r.id+'\')" /></td>'+
                    '<td>'+rowNumber+'</td>'+
                    '<td class="editable" data-id="'+r.id+'" data-field="department" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(p.department||'')+'</td>'+
                    '<td class="editable" data-id="'+r.id+'" data-field="name" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(nameDisplay)+'</td>'+
                    '<td class="editable" data-id="'+r.id+'" data-field="idNumber" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(p.idNumber||'')+'</td>'+
                    '<td class="editable" data-id="'+r.id+'" data-field="cardNumber" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(c.cardNumber||'')+'</td>'+
                    '<td class="editable" data-id="'+r.id+'" data-field="cardType" data-type="select" ondblclick="REG.editCell(this)">'+escapeHtml(c.cardType||'')+'</td>'+
                    '<td><button class="card-status-btn '+cardStatus+'" onclick="REG.toggleCardStatus(\''+r.id+'\')">'+cardStatus+'</button></td>'+
                    '<td class="editable" data-id="'+r.id+'" data-field="issueDate" data-type="date" ondblclick="REG.editCell(this)">'+escapeHtml(fmtDateDisplay(d.issueDate))+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="receiveDate" data-type="date" ondblclick="REG.editCell(this)">'+escapeHtml(fmtDateDisplay(d.receiveDate))+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="remark" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(r.remark||'')+'</td>'+
                '<td><button class="btn light" onclick="REG.remove(\''+r.id+'\')"><i class="fa fa-trash"></i></button></td>'+
            '</tr>';
            }).join('');
            updateSelectAllCheckbox('issue');
            updatePagination(issueRows.length);
            updateUnclaimedWarning(issueRows);
            return;
        }
        var recycleBody = document.getElementById('recycleTableBody');
        if (!recycleBody) return;
        var recycleRows = rows.filter(function(r){ return r.action && r.action.type==='recycle'; });
        if (recycleRows.length===0) { 
            recycleBody.innerHTML = '<tr class="empty-row"><td colspan="12"><div class="empty">暂无收卡记录</div></td></tr>'; 
            updatePagination(0);
            return; 
        }
        
        // 默认排序：未回收在前，已回收在后，各自按时间排序
        recycleRows = sortRecords(recycleRows);
        
        // 分页处理
        state.pagination.totalRecords = recycleRows.length;
        state.pagination.totalPages = Math.ceil(recycleRows.length / state.pagination.pageSize);
        if (state.pagination.currentPage > state.pagination.totalPages) {
            state.pagination.currentPage = state.pagination.totalPages || 1;
        }
        
        var startIndex = (state.pagination.currentPage - 1) * state.pagination.pageSize;
        var endIndex = startIndex + state.pagination.pageSize;
        var pageRows = recycleRows.slice(startIndex, endIndex);
        
        recycleBody.innerHTML = pageRows.map(function(r, idx){
            var p=r.person||{}, c=r.card||{}, a=r.action||{}, d=r.dates||{};
            var isChecked = state.selected.indexOf(r.id) !== -1;
            var recycleStatus = (a.status || 'done') === 'done' ? '已回收' : '未回收';
            var statusClass = recycleStatus === '已回收' ? 'done' : 'pending';
            var rowNumber = startIndex + idx + 1;
            
            // 姓名显示：Ⅲ类卡显示"姓名(关联军人)"格式
            var personName = p.name || '';
            var relatedMilitary = c.relatedMilitary || '';
            var isType3Card = c.cardType === 'Ⅲ类卡';
            var nameDisplay = personName;
            if (isType3Card && relatedMilitary) {
                nameDisplay = personName + '(' + relatedMilitary + ')';
            }
            
            return '<tr>'+
                '<td class="checkbox-col"><input type="checkbox" class="row-checkbox" data-id="'+r.id+'" '+
                (isChecked?'checked':'')+' onchange="REG.toggleRowSelect(\''+r.id+'\')" /></td>'+
                '<td>'+rowNumber+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="department" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(p.department||'')+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="name" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(nameDisplay)+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="idNumber" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(p.idNumber||'')+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="cardNumber" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(c.cardNumber||'')+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="cardType" data-type="select" ondblclick="REG.editCell(this)">'+escapeHtml(c.cardType||'')+'</td>'+
                '<td><button class="recycle-status-btn '+statusClass+'" onclick="REG.toggleRecycleStatus(\''+r.id+'\')">'+recycleStatus+'</button></td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="reason" data-type="select" ondblclick="REG.editCell(this)">'+escapeHtml(a.reason||'')+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="recycleDate" data-type="date" ondblclick="REG.editCell(this)">'+escapeHtml(fmtDateDisplay(d.recycleDate))+'</td>'+
                '<td class="editable" data-id="'+r.id+'" data-field="remark" data-type="text" ondblclick="REG.editCell(this)">'+escapeHtml(r.remark||'')+'</td>'+
                '<td><button class="btn light" onclick="REG.remove(\''+r.id+'\')"><i class="fa fa-trash"></i></button></td>'+
            '</tr>';
        }).join('');
        updateSelectAllCheckbox('recycle');
        updatePagination(recycleRows.length);
    }
    
    // 更新未领取卡片警告
    function updateUnclaimedWarning(issueRows) {
        var warningDiv = document.getElementById('unclaimedWarning');
        if (!warningDiv) return;
        
        // 统计"未发卡"状态且时间较长的记录（按卡类型和时间段分类）
        var typeStats = {
            'Ⅰ类卡': 0,
            'Ⅱ类卡': 0,
            'Ⅲ类卡': 0,
            'Ⅳ类卡': 0,
            '其他': 0
        };
        
        var timeStats = {
            days7: 0,   // 7-14天
            days15: 0,  // 15-29天
            days30: 0,  // 30-59天
            days60: 0   // ≥60天
        };
        
        issueRows.forEach(function(r) {
            var d = r.dates || {};
            var a = r.action || {};
            var c = r.card || {};
            
            // 统计"未发卡"状态且有发卡日期的记录
            if ((a.cardStatus || '未发卡') === '未发卡' && d.issueDate) {
                var days = daysBetween(d.issueDate);
                
                // 只统计超过7天的
                if (days >= 7) {
                    // 卡类型统计
                    var cardType = c.cardType || '其他';
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
        var total = 0;
        for (var key in typeStats) {
            total += typeStats[key];
        }
        
        if (total === 0) {
            warningDiv.style.display = 'none';
            return;
        }
        
        // 生成时间段提示
        var timeMessages = [];
        if (timeStats.days60 > 0) timeMessages.push('<span class="warning-60">' + timeStats.days60 + '张>2月</span>');
        if (timeStats.days30 > 0) timeMessages.push('<span class="warning-30">' + timeStats.days30 + '张>1月</span>');
        if (timeStats.days15 > 0) timeMessages.push('<span class="warning-15">' + timeStats.days15 + '张>半月</span>');
        if (timeStats.days7 > 0) timeMessages.push('<span class="warning-7">' + timeStats.days7 + '张>7天</span>');
        
        // 生成卡类型提示
        var typeMessages = [];
        var cardTypes = ['Ⅰ类卡', 'Ⅱ类卡', 'Ⅲ类卡', 'Ⅳ类卡', '其他'];
        for (var i = 0; i < cardTypes.length; i++) {
            var type = cardTypes[i];
            if (typeStats[type] > 0) {
                typeMessages.push('<span style="color: #2c3e50; font-weight: 600;">' + type + ' ' + typeStats[type] + '张</span>');
            }
        }
        
        warningDiv.innerHTML = 
            '<i class="fa fa-exclamation-triangle"></i>' +
            '<span>' +
                '<strong style="font-size: 16px; color: #d84315;">' + total + '</strong>张长时间未发卡：' + 
                timeMessages.join('、') + 
                (typeMessages.length > 0 ? ' | ' + typeMessages.join('、') : '') +
            '</span>';
        warningDiv.style.display = 'flex';
    }
    
    function sortRecords(records) {
        if (currentSubTab === 'issue') {
            // 如果有自定义排序，使用自定义排序
            if (state.sort.column && state.sort.direction) {
                return applySorting(records);
            }
            // 默认排序：未发卡在前，已发卡在后
            var pending = records.filter(function(r){ return (r.action.cardStatus || '未发卡') === '未发卡'; });
            var issued = records.filter(function(r){ return (r.action.cardStatus || '未发卡') === '已发卡'; });
            
            // 未发卡：按发卡日期倒序（最近的在前）
            pending.sort(function(a, b){ 
                var aDate = a.dates.issueDate || a.dates.createdAt || '0';
                var bDate = b.dates.issueDate || b.dates.createdAt || '0';
                return new Date(bDate) - new Date(aDate);
            });
            
            // 已发卡：按领卡日期倒序（最近领卡的在前），如果没有领卡日期则按发卡日期
            issued.sort(function(a, b){ 
                var aDate = a.dates.receiveDate || a.dates.issueDate || a.dates.createdAt || '0';
                var bDate = b.dates.receiveDate || b.dates.issueDate || b.dates.createdAt || '0';
                return new Date(bDate) - new Date(aDate);
            });
            
            return pending.concat(issued);
        } else {
            // 如果有自定义排序，使用自定义排序
            if (state.sort.column && state.sort.direction) {
                return applySorting(records);
            }
            // 默认排序：未回收在前，已回收在后
            var pending = records.filter(function(r){ return (r.action.status || 'done') === 'pending'; });
            var done = records.filter(function(r){ return (r.action.status || 'done') === 'done'; });
            
            // 未回收：按发卡日期倒序（最近的在前）
            pending.sort(function(a, b){ 
                var aDate = a.dates.issueDate || a.dates.createdAt || '0';
                var bDate = b.dates.issueDate || b.dates.createdAt || '0';
                return new Date(bDate) - new Date(aDate);
            });
            
            // 已回收：按回收日期倒序（最近回收的在前）
            done.sort(function(a, b){ 
                var aDate = a.dates.recycleDate || a.dates.createdAt || '0';
                var bDate = b.dates.recycleDate || b.dates.createdAt || '0';
                return new Date(bDate) - new Date(aDate);
            });
            
            return pending.concat(done);
        }
    }
    
    function applySorting(records) {
        var col = state.sort.column;
        var dir = state.sort.direction;
        var sorted = records.slice();
        sorted.sort(function(a, b){
            var aVal, bVal;
            var p1=a.person||{}, c1=a.card||{}, a1=a.action||{}, d1=a.dates||{};
            var p2=b.person||{}, c2=b.card||{}, a2=b.action||{}, d2=b.dates||{};
            
            switch(col) {
                case 'department': aVal = p1.department||''; bVal = p2.department||''; break;
                case 'name': aVal = p1.name||''; bVal = p2.name||''; break;
                case 'idNumber': aVal = p1.idNumber||''; bVal = p2.idNumber||''; break;
                case 'cardNumber': aVal = c1.cardNumber||''; bVal = c2.cardNumber||''; break;
                case 'cardType': aVal = c1.cardType||''; bVal = c2.cardType||''; break;
                case 'cardStatus': aVal = a1.cardStatus||'未发卡'; bVal = a2.cardStatus||'未发卡'; break;
                case 'status': aVal = mapStatus(a1.status); bVal = mapStatus(a2.status); break;
                case 'reason': aVal = a1.reason||''; bVal = a2.reason||''; break;
                case 'issueDate': aVal = d1.issueDate||''; bVal = d2.issueDate||''; break;
                case 'receiveDate': aVal = d1.receiveDate||''; bVal = d2.receiveDate||''; break;
                case 'recycleDate': aVal = d1.recycleDate||''; bVal = d2.recycleDate||''; break;
                case 'remark': aVal = a.remark||''; bVal = b.remark||''; break;
                default: return 0;
            }
            
            if (aVal < bVal) return dir === 'asc' ? -1 : 1;
            if (aVal > bVal) return dir === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }
    
    function sortTable(column) {
        if (state.sort.column === column) {
            // 同一列：切换排序方向 asc -> desc -> 无排序
            if (state.sort.direction === 'asc') {
                state.sort.direction = 'desc';
            } else if (state.sort.direction === 'desc') {
                state.sort.column = '';
                state.sort.direction = '';
            } else {
                state.sort.direction = 'asc';
            }
        } else {
            // 新列：默认升序
            state.sort.column = column;
            state.sort.direction = 'asc';
        }
        renderTable();
    }

    function mapAction(t){ var m={issue:'发卡',recycle:'收卡',replace:'替换',loss:'挂失/丢失',other:'其他'}; return m[t]||t||''; }
    function mapStatus(s){ var m={pending:'未回收',done:'已回收',cancelled:'取消'}; return m[s]||s||''; }

    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[ch]; }); }

    // 基础操作
    function addRecord(record){ 
        state.records.push(record); 
        saveRecords(state.records); 
        populateYearFilters(); // 刷新年度筛选选项
        renderTable(); 
    }
    function remove(id){ 
        state.records = state.records.filter(function(r){ return r.id!==id; }); 
        saveRecords(state.records); 
        populateYearFilters(); // 刷新年度筛选选项
        renderTable(); 
    }

    // 表格内直接新增
    var isEditing = false;
    function addInlineRow() {
        if (isEditing) { 
            showNotification('请先完成当前编辑', 'warning'); 
            return; 
        }
        isEditing = true;
        var tbody = currentSubTab === 'issue' ? document.getElementById('issueTableBody') : document.getElementById('recycleTableBody');
        if (!tbody) return;
        
        var defaultCardType = state.config.defaultCardType || 'Ⅰ类卡';
        var cardTypeOpts = state.config.cardTypes.map(function(ct){ 
            var selected = ct === defaultCardType ? ' selected' : '';
            return '<option value="'+ct+'"'+selected+'>'+ct+'</option>'; 
        }).join('');
        
        if (currentSubTab === 'issue') {
            var row = '<tr class="edit-row" id="editRow">'+
                '<td class="checkbox-col"></td>'+
                '<td><span style="color:#999;">自动</span></td>'+
                '<td><input type="text" id="editDepartment" placeholder="部别" list="commonDepartmentsList" /></td>'+
                '<td><input type="text" id="editName" placeholder="姓名" /></td>'+
                '<td><input type="text" id="editIdNumber" placeholder="身份证号码" /></td>'+
                '<td><input type="text" id="editCardNumber" placeholder="保障卡号(可选)" /></td>'+
                '<td><select id="editCardType">'+cardTypeOpts+'</select></td>'+
                '<td><span style="color:#999;">未发卡</span></td>'+
            '<td><input type="text" class="date-input-compat" id="editIssueDate" value="'+fmtDate(new Date())+'" placeholder="YYYY-MM-DD 或 YYYYMMDD" /></td>'+
            '<td><input type="text" class="date-input-compat" id="editReceiveDate" placeholder="领卡后自动填充" disabled /></td>'+
            '<td><input type="text" id="editRemark" placeholder="备注(可选)" /></td>'+
            '<td>'+
                '<button class="btn save" onclick="REG.saveInlineRow()"><i class="fa fa-save"></i></button>'+
                '<button class="btn cancel" onclick="REG.cancelInlineRow()"><i class="fa fa-times"></i></button>'+
            '</td>'+
        '</tr>';
            tbody.insertAdjacentHTML('afterbegin', row);
        } else {
            var statusOpts = '<option value="pending">未回收</option><option value="done" selected>已回收</option>';
            var reasonOpts = state.config.actions.reasons.map(function(r){ return '<option value="'+r+'">'+r+'</option>'; }).join('');
            var row = '<tr class="edit-row" id="editRow">'+
                '<td class="checkbox-col"></td>'+
                '<td><span style="color:#999;">自动</span></td>'+
                '<td><input type="text" id="editDepartment" placeholder="部别" list="commonDepartmentsList" /></td>'+
                '<td><input type="text" id="editName" placeholder="姓名" /></td>'+
                '<td><input type="text" id="editIdNumber" placeholder="身份证号码" /></td>'+
                '<td><input type="text" id="editCardNumber" placeholder="保障卡号(可选)" /></td>'+
                '<td><select id="editCardType">'+cardTypeOpts+'</select></td>'+
                '<td><select id="editStatus">'+statusOpts+'</select></td>'+
            '<td><select id="editReason"><option value="">请选择</option>'+reasonOpts+'</select></td>'+
            '<td><input type="text" class="date-input-compat" id="editRecycleDate" value="'+fmtDate(new Date())+'" placeholder="YYYY-MM-DD 或 YYYYMMDD" /></td>'+
            '<td><input type="text" id="editRemark" placeholder="备注(可选)" /></td>'+
            '<td>'+
                '<button class="btn save" onclick="REG.saveInlineRow()"><i class="fa fa-save"></i></button>'+
                '<button class="btn cancel" onclick="REG.cancelInlineRow()"><i class="fa fa-times"></i></button>'+
            '</td>'+
        '</tr>';
            tbody.insertAdjacentHTML('afterbegin', row);
        }
        
        // 为身份证和保障卡号输入框添加数字验证
        var idNumberInput = document.getElementById('editIdNumber');
        var cardNumberInput = document.getElementById('editCardNumber');
        
        if (idNumberInput) {
            idNumberInput.onkeypress = function(e) {
                var char = String.fromCharCode(e.which || e.keyCode);
                if (!/^[0-9Xx]$/.test(char)) {
                    e.preventDefault();
                    return false;
                }
            };
            idNumberInput.oninput = function() {
                this.value = this.value.replace(/[^0-9Xx]/g, '');
            };
        }
        
        if (cardNumberInput) {
            cardNumberInput.onkeypress = function(e) {
                var char = String.fromCharCode(e.which || e.keyCode);
                if (!/^[0-9]$/.test(char)) {
                    e.preventDefault();
                    return false;
                }
            };
            cardNumberInput.oninput = function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            };
        }
        
        // 为日期输入框添加自动格式化
        var dateInputs = [
            document.getElementById('editIssueDate'),
            document.getElementById('editRecycleDate')
        ];
        
        dateInputs.forEach(function(dateInput) {
            if (dateInput && !dateInput.disabled) {
                var lastValue = dateInput.value;
                
                dateInput.oninput = function() {
                    var val = this.value;
                    
                    // 如果是8位纯数字，自动转换为日期格式
                    if (/^\d{8}$/.test(val)) {
                        var year = val.substring(0, 4);
                        var month = val.substring(4, 6);
                        var day = val.substring(6, 8);
                        this.value = year + '-' + month + '-' + day;
                        lastValue = this.value;
                        return;
                    }
                    
                    // 检测用户是否在删除（值变短了）
                    var isDeleting = val.length < lastValue.length;
                    
                    if (!isDeleting) {
                        // 手动输入时自动添加分隔符（只在增加内容时）
                        if (val.length === 4 && val.indexOf('-') === -1 && /^\d{4}$/.test(val)) {
                            this.value = val + '-';
                        } else if (val.length === 7 && val.split('-').length === 2 && /^\d{4}-\d{2}$/.test(val)) {
                            this.value = val + '-';
                        }
                    }
                    
                    lastValue = this.value;
                };
            }
        });
        
        // 添加键盘快捷键监听
        var editInputs = [
            document.getElementById('editDepartment'),
            document.getElementById('editName'),
            document.getElementById('editIdNumber'),
            document.getElementById('editCardNumber'),
            document.getElementById('editCardType'),
            document.getElementById('editIssueDate') || document.getElementById('editRecycleDate'),
            document.getElementById('editReason'),
            document.getElementById('editRemark')
        ].filter(function(el) { return el; }); // 过滤掉null元素
        
        editInputs.forEach(function(input, index) {
            if (input) {
                input.addEventListener('keydown', function(e) {
                    // Enter键：快速保存并继续
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        saveInlineRow(true);  // true表示保存后继续添加
                    }
                    // Tab键：跳转到下一个输入框（最后一个跳转到保存按钮）
                    else if (e.key === 'Tab' || e.keyCode === 9) {
                        // 如果是最后一个输入框，按Tab跳转到保存按钮
                        if (index === editInputs.length - 1 && !e.shiftKey) {
                            e.preventDefault();
                            var saveBtn = document.querySelector('#editRow .btn.save');
                            if (saveBtn) saveBtn.focus();
                        }
                        // Shift+Tab在第一个输入框时，跳转到取消按钮
                        else if (index === 0 && e.shiftKey) {
                            e.preventDefault();
                            var cancelBtn = document.querySelector('#editRow .btn.cancel');
                            if (cancelBtn) cancelBtn.focus();
                        }
                        // 其他情况使用浏览器默认行为
                    }
                });
            }
        });
        
        // 保存按钮按Tab跳转到取消按钮
        var saveBtn = document.querySelector('#editRow .btn.save');
        if (saveBtn) {
            saveBtn.addEventListener('keydown', function(e) {
                if ((e.key === 'Tab' || e.keyCode === 9) && !e.shiftKey) {
                    e.preventDefault();
                    var cancelBtn = document.querySelector('#editRow .btn.cancel');
                    if (cancelBtn) cancelBtn.focus();
                }
            });
        }
        
        // 取消按钮按Tab跳转回第一个输入框
        var cancelBtn = document.querySelector('#editRow .btn.cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('keydown', function(e) {
                if ((e.key === 'Tab' || e.keyCode === 9) && !e.shiftKey) {
                    e.preventDefault();
                    if (editInputs[0]) editInputs[0].focus();
                }
            });
        }
        
        // 聚焦到第一个输入框（部别）
        var firstInput = document.getElementById('editDepartment');
        if (firstInput) firstInput.focus();
        
        // 添加点击空白处自动保存功能
        setTimeout(function() {
            document.addEventListener('click', handleClickOutside);
        }, 100);
    }
    
    // 处理点击编辑行外部的事件
    function handleClickOutside(e) {
        var editRow = document.getElementById('editRow');
        if (!editRow) {
            document.removeEventListener('click', handleClickOutside);
            return;
        }
        
        // 检查点击是否在编辑行内部
        var clickedInside = editRow.contains(e.target);
        
        // 检查是否点击了保存或取消按钮（这些按钮会自己处理）
        var clickedButton = e.target.closest('.btn.save') || e.target.closest('.btn.cancel');
        
        // 检查是否点击了新增按钮（避免冲突）
        var clickedAddBtn = e.target.closest('.btn-add-inline');
        
        if (!clickedInside && !clickedButton && !clickedAddBtn) {
            // 点击了外部，尝试自动保存
            if (validateAndSave()) {
                // 验证通过，保存成功，移除监听器
                document.removeEventListener('click', handleClickOutside);
            }
            // 如果验证失败，保持编辑状态，继续监听
        }
    }
    
    // 验证并保存（返回true表示成功，false表示失败）
    function validateAndSave() {
        var name = document.getElementById('editName');
        var idNumber = document.getElementById('editIdNumber');
        var cardNo = document.getElementById('editCardNumber');
        var cardType = document.getElementById('editCardType');
        
        if (!name || !idNumber || !cardNo || !cardType) return false;
        
        var nameVal = name.value.trim();
        var idNumberVal = idNumber.value.trim();
        var cardNoVal = cardNo.value.trim();
        var cardTypeVal = cardType.value;
        
        // 验证必填项
        if (!nameVal) {
            showNotification('请输入姓名后再点击空白处保存', 'warning', name);
            name.focus();
            return false;
        }
        
        if (!idNumberVal) {
            showNotification('请输入身份证号码后再点击空白处保存', 'warning', idNumber);
            idNumber.focus();
            return false;
        }
        
        // 保障卡号不是必填项，可以为空
        
        if (!cardTypeVal) {
            showNotification('请选择卡类型后再点击空白处保存', 'warning', cardType);
            cardType.focus();
            return false;
        }
        
        // 验证日期格式
        if (currentSubTab === 'issue') {
            var issueDateInput = document.getElementById('editIssueDate');
            if (issueDateInput) {
                var issueDate = issueDateInput.value.trim();
                if (issueDate && !isValidDate(issueDate)) {
                    showNotification('发卡日期格式不正确，请使用 YYYY-MM-DD 格式', 'error', issueDateInput);
                    issueDateInput.focus();
                    return false;
                }
            }
        } else {
            var reason = document.getElementById('editReason');
            if (reason && !reason.value) {
                showNotification('请选择回收类型后再点击空白处保存', 'warning', reason);
                reason.focus();
                return false;
            }
            
            var recycleDateInput = document.getElementById('editRecycleDate');
            if (recycleDateInput) {
                var recycleDate = recycleDateInput.value.trim();
                if (recycleDate && !isValidDate(recycleDate)) {
                    showNotification('回收日期格式不正确，请使用 YYYY-MM-DD 格式', 'error', recycleDateInput);
                    recycleDateInput.focus();
                    return false;
                }
            }
        }
        
        // 验证通过，执行保存（不继续添加下一条）
        saveInlineRow(false);
        return true;
    }

    function saveInlineRow(continueAdd) {
        var name = document.getElementById('editName').value.trim();
        var idn = document.getElementById('editIdNumber').value.trim();
        var dept = document.getElementById('editDepartment').value.trim();
        var cardNo = document.getElementById('editCardNumber').value.trim();
        var cardType = document.getElementById('editCardType').value;
        var remark = document.getElementById('editRemark') ? document.getElementById('editRemark').value.trim() : '';
        
        if (!name) { 
            var nameInput = document.getElementById('editName');
            showNotification('请输入姓名', 'error', nameInput);
            if (nameInput) nameInput.focus();
            return; 
        }
        if (!idn) { 
            var idnInput = document.getElementById('editIdNumber');
            showNotification('请输入身份证号码', 'error', idnInput);
            if (idnInput) idnInput.focus();
            return; 
        }
        // 保障卡号不是必填项，可以为空
        if (!cardType) { 
            var cardTypeInput = document.getElementById('editCardType');
            showNotification('请选择卡型', 'error', cardTypeInput); 
            if (cardTypeInput) cardTypeInput.focus();
            return; 
        }
        
        var rec = {
            id: uid(),
            person: { name: name, idNumber: idn, department: dept },
            card: { cardNumber: cardNo, cardType: cardType },
            action: { type: currentSubTab, channel: 'frontdesk' },
            dates: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            remark: remark
        };
        
        if (currentSubTab === 'issue') {
            var issueDate = document.getElementById('editIssueDate').value.trim();
            // 验证日期格式
            if (!isValidDate(issueDate)) {
                var issueDateInput = document.getElementById('editIssueDate');
                showNotification('发卡日期格式不正确，请使用 YYYY-MM-DD 格式（例如：2023-10-01）', 'error', issueDateInput);
                if (issueDateInput) issueDateInput.focus();
                return;
            }
            rec.action.cardStatus = '未发卡';
            rec.action.reason = '';
            rec.dates.issueDate = parseDate(issueDate);
            rec.dates.receiveDate = '';
        } else {
            var status = document.getElementById('editStatus').value;
            var recycleDate = document.getElementById('editRecycleDate').value.trim();
            var reason = document.getElementById('editReason').value;
            if (!reason) { 
                var reasonInput = document.getElementById('editReason');
                showNotification('请选择回收类型', 'error', reasonInput); 
                if (reasonInput) reasonInput.focus();
                return; 
            }
            // 验证日期格式
            if (!isValidDate(recycleDate)) {
                var recycleDateInput = document.getElementById('editRecycleDate');
                showNotification('回收日期格式不正确，请使用 YYYY-MM-DD 格式（例如：2023-10-01）', 'error', recycleDateInput);
                if (recycleDateInput) recycleDateInput.focus();
                return;
            }
            rec.action.status = status;
            rec.action.reason = reason;
            rec.dates.recycleDate = parseDate(recycleDate);
        }
        
        // 保存部门到常用部门列表（如果不存在）
        if (dept && state.config.commonDepartments.indexOf(dept) === -1) {
            state.config.commonDepartments.push(dept);
            saveConfig(state.config);
            updateCommonDepartments();
        }
        
        addRecord(rec);
        cancelInlineRow();
        
        // 如果是Enter键保存，继续添加下一条
        if (continueAdd) {
            setTimeout(function() {
                addInlineRow();
            }, 100);
        }
    }
    
    function toggleCardStatus(id) {
        var record = state.records.find(function(r){ return r.id === id; });
        if (!record || !record.action) return;
        
        var currentStatus = record.action.cardStatus || '未发卡';
        if (currentStatus === '未发卡') {
            record.action.cardStatus = '已发卡';
            record.dates.receiveDate = new Date().toISOString().split('T')[0];
        } else {
            record.action.cardStatus = '未发卡';
            record.dates.receiveDate = '';
        }
        record.dates.updatedAt = new Date().toISOString();
        populateYearFilters(); // 刷新年度筛选选项（领卡日期可能改变）
        saveRecords(state.records);
        renderTable();
    }
    
    function toggleRecycleStatus(id) {
        var record = state.records.find(function(r){ return r.id === id; });
        if (!record || !record.action) return;
        
        var currentStatus = record.action.status || 'done';
        if (currentStatus === 'pending') {
            // 从未回收切换到已回收
            record.action.status = 'done';
            // 如果没有回收日期，自动填充当前日期
            if (!record.dates.recycleDate) {
                record.dates.recycleDate = new Date().toISOString().split('T')[0];
            }
        } else {
            // 从已回收切换到未回收
            record.action.status = 'pending';
        }
        record.dates.updatedAt = new Date().toISOString();
        saveRecords(state.records);
        renderTable();
    }
    
    // 双击编辑功能
    var currentEditingCell = null;
    
    function editCell(cell) {
        // 如果已有单元格在编辑，先保存
        if (currentEditingCell && currentEditingCell !== cell) {
            saveCellEdit(currentEditingCell, false);
        }
        
        currentEditingCell = cell;
        var recordId = cell.getAttribute('data-id');
        var field = cell.getAttribute('data-field');
        var type = cell.getAttribute('data-type');
        var currentValue = cell.textContent.trim();
        
        // 特殊处理：如果是姓名字段，显示原始格式（已包含括号）
        // 无需特殊处理，currentValue已经是显示的内容
        
        // 保存原始值
        cell.setAttribute('data-original', currentValue);
        cell.classList.add('editing');
        
        var input;
        if (type === 'select') {
            // 创建下拉框
            input = document.createElement('select');
            input.className = 'cell-editor';
            
            if (field === 'cardType') {
                input.innerHTML = '<option value="">请选择</option>' +
                    '<option value="Ⅰ类卡"'+(currentValue==='Ⅰ类卡'?' selected':'')+'>Ⅰ类卡</option>' +
                    '<option value="Ⅱ类卡"'+(currentValue==='Ⅱ类卡'?' selected':'')+'>Ⅱ类卡</option>' +
                    '<option value="Ⅲ类卡"'+(currentValue==='Ⅲ类卡'?' selected':'')+'>Ⅲ类卡</option>' +
                    '<option value="Ⅳ类卡"'+(currentValue==='Ⅳ类卡'?' selected':'')+'>Ⅳ类卡</option>';
            } else if (field === 'reason') {
                input.innerHTML = '<option value="">请选择</option>' +
                    '<option value="退伍回收"'+(currentValue==='退伍回收'?' selected':'')+'>退伍回收</option>' +
                    '<option value="复员回收"'+(currentValue==='复员回收'?' selected':'')+'>复员回收</option>' +
                    '<option value="转业回收"'+(currentValue==='转业回收'?' selected':'')+'>转业回收</option>' +
                    '<option value="损坏回收"'+(currentValue==='损坏回收'?' selected':'')+'>损坏回收</option>' +
                    '<option value="纠错回收"'+(currentValue==='纠错回收'?' selected':'')+'>纠错回收</option>' +
                    '<option value="更换回收"'+(currentValue==='更换回收'?' selected':'')+'>更换回收</option>' +
                    '<option value="消磁回收"'+(currentValue==='消磁回收'?' selected':'')+'>消磁回收</option>' +
                    '<option value="其他原因回收"'+(currentValue==='其他原因回收'?' selected':'')+'>其他原因回收</option>';
            }
        } else if (type === 'date') {
            // Firefox 45.0.2 不支持 HTML5 date input，使用文本输入
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'cell-editor date-input-compat';
            input.placeholder = 'YYYY-MM-DD 或 YYYYMMDD';
            input.value = currentValue;
            
            var lastValue = currentValue;
            
            // 添加输入验证和自动格式化
            input.oninput = function() {
                var val = this.value;
                
                // 如果是8位纯数字，自动转换为日期格式
                if (/^\d{8}$/.test(val)) {
                    var year = val.substring(0, 4);
                    var month = val.substring(4, 6);
                    var day = val.substring(6, 8);
                    this.value = year + '-' + month + '-' + day;
                    lastValue = this.value;
                    return;
                }
                
                // 检测用户是否在删除（值变短了）
                var isDeleting = val.length < lastValue.length;
                
                if (!isDeleting) {
                    // 手动输入时自动添加分隔符（只在增加内容时）
                    if (val.length === 4 && val.indexOf('-') === -1 && /^\d{4}$/.test(val)) {
                        this.value = val + '-';
                    } else if (val.length === 7 && val.split('-').length === 2 && /^\d{4}-\d{2}$/.test(val)) {
                        this.value = val + '-';
                    }
                }
                
                lastValue = this.value;
            };
        } else {
            // 备注字段使用多行文本框
            if (field === 'remark') {
                input = document.createElement('textarea');
                input.className = 'cell-editor';
                input.value = currentValue;
                input.rows = 2;
                input.style.resize = 'vertical';
                input.style.minHeight = '40px';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'cell-editor';
                input.value = currentValue;
                
                // 姓名字段特殊提示
                if (field === 'name') {
                    var rec = state.records.find(function(r){ return r.id === recordId; });
                    if (rec && rec.card && rec.card.cardType === 'Ⅲ类卡') {
                        input.placeholder = 'Ⅲ类卡格式：姓名(关联军人)';
                        input.title = 'Ⅲ类卡可输入格式：张小明(张三)\n不输入括号则只修改姓名';
                    }
                }
            }
            
            // 身份证号和保障卡号只能输入数字
            if (field === 'idNumber' || field === 'cardNumber') {
                input.onkeypress = function(e) {
                    // 只允许数字和X（身份证可能有X）
                    var char = String.fromCharCode(e.which || e.keyCode);
                    if (field === 'idNumber') {
                        // 身份证允许数字和X
                        if (!/^[0-9Xx]$/.test(char)) {
                            e.preventDefault();
                            return false;
                        }
                    } else {
                        // 保障卡号只允许数字
                        if (!/^[0-9]$/.test(char)) {
                            e.preventDefault();
                            return false;
                        }
                    }
                };
                
                input.oninput = function() {
                    // 移除非法字符
                    if (field === 'idNumber') {
                        this.value = this.value.replace(/[^0-9Xx]/g, '');
                    } else {
                        this.value = this.value.replace(/[^0-9]/g, '');
                    }
                };
            }
        }
        
        // 事件处理
        input.onblur = function() {
            setTimeout(function() {
                saveCellEdit(cell, true);
            }, 150);
        };
        
        input.onkeydown = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveCellEdit(cell, true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelCellEdit(cell);
            }
        };
        
        
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        
        if (type === 'text') {
            input.select();
        }
    }
    
    function saveCellEdit(cell, shouldSave) {
        if (!cell || !cell.classList.contains('editing')) return;
        
        var input = cell.querySelector('.cell-editor');
        if (!input) return;
        
        var recordId = cell.getAttribute('data-id');
        var field = cell.getAttribute('data-field');
        var newValue = input.value.trim();
        var originalValue = cell.getAttribute('data-original');
        
        cell.classList.remove('editing');
        cell.removeAttribute('data-original');
        currentEditingCell = null;
        
        if (shouldSave && newValue !== originalValue) {
            // 保存更改
            var record = state.records.find(function(r){ return r.id === recordId; });
            if (record) {
                // 根据字段更新对应的数据
                if (field === 'department' || field === 'name' || field === 'idNumber') {
                    if (!record.person) record.person = {};
                    
                    // 特殊处理姓名字段：解析"姓名(关联军人)"格式
                    if (field === 'name') {
                        var match = newValue.match(/^(.+?)\((.+?)\)$/);
                        if (match) {
                            // 格式正确：姓名(关联军人)
                            record.person.name = match[1].trim();
                            if (!record.card) record.card = {};
                            record.card.relatedMilitary = match[2].trim();
                        } else {
                            // 没有括号，直接保存为姓名
                            record.person.name = newValue;
                            // 如果之前有关联军人，保留它
                            // 如果要清空，用户需要输入"姓名()"格式
                        }
                    } else {
                        record.person[field] = newValue;
                    }
                } else if (field === 'cardNumber' || field === 'cardType' || field === 'relatedMilitary') {
                    if (!record.card) record.card = {};
                    record.card[field] = newValue;
                } else if (field === 'issueDate' || field === 'receiveDate' || field === 'recycleDate') {
                    // 验证日期格式
                    if (!isValidDate(newValue)) {
                        var inputElement = cell.querySelector('.cell-editor');
                        showNotification('日期格式不正确，请使用 YYYY-MM-DD 格式（例如：2023-10-01）', 'error', inputElement);
                        cell.textContent = originalValue;
                        return;
                    }
                    if (!record.dates) record.dates = {};
                    record.dates[field] = parseDate(newValue);
                    
                    // 如果填写了领卡日期，自动将发卡状态改为"已发卡"
                    if (field === 'receiveDate' && newValue) {
                        if (!record.action) record.action = {};
                        record.action.cardStatus = '已发卡';
                    }
                    
                    // 修改日期后刷新年度筛选
                    populateYearFilters();
                } else if (field === 'reason') {
                    if (!record.action) record.action = {};
                    record.action.reason = newValue;
                } else if (field === 'remark') {
                    // 处理备注字段
                    record.remark = newValue;
                }
                
                // 更新修改时间
                if (!record.dates) record.dates = {};
                record.dates.updatedAt = new Date().toISOString();
                
                saveRecords(state.records);
            }
        }
        
        renderTable();
    }
    
    function cancelCellEdit(cell) {
        if (!cell || !cell.classList.contains('editing')) return;
        
        cell.classList.remove('editing');
        cell.removeAttribute('data-original');
        currentEditingCell = null;
        
        renderTable();
    }

    function cancelInlineRow() {
        var editRow = document.getElementById('editRow');
        if (editRow) editRow.remove();
        isEditing = false;
        // 移除点击外部监听器
        document.removeEventListener('click', handleClickOutside);
    }

    function switchSubTab(tab) {
        // 切换前取消编辑
        if (isEditing) cancelInlineRow();
        
        currentSubTab = tab === 'recycle' ? 'recycle' : 'issue';
        
        // 保存当前子标签状态
        saveCurrentSubTab(currentSubTab);
        
        var iBtn = document.getElementById('issueSubTabBtn');
        var rBtn = document.getElementById('recycleSubTabBtn');
        var iTab = document.getElementById('registryIssueTab');
        var rTab = document.getElementById('registryRecycleTab');
        if (iBtn) iBtn.classList.toggle('active', currentSubTab==='issue');
        if (rBtn) rBtn.classList.toggle('active', currentSubTab==='recycle');
        if (iTab) iTab.style.display = currentSubTab==='issue' ? 'block' : 'none';
        if (rTab) rTab.style.display = currentSubTab==='recycle' ? 'block' : 'none';
        
        // 清空搜索框和选择
        clearSearch();
        state.selected = [];
        updateBatchEditButton();
        
        // 重置分页
        resetPagination();
        
        // 切换子标签时不选中任何卡片，显示所有记录
        if (currentSubTab === 'issue') {
            state.filters = { action: 'issue', status: '', cardType: '', keyword: '', recycleReason: '', cardStatus: '' };
            // 移除所有激活状态
            var allCards = document.querySelectorAll('#registryIssueTab .parent-filter-card, #registryIssueTab .child-filter-card');
            allCards.forEach(function(card){ card.classList.remove('active'); });
        } else {
            state.filters = { action: 'recycle', status: '', cardType: '', keyword: '', recycleReason: '', cardStatus: '' };
            // 移除所有激活状态
            var allCards = document.querySelectorAll('#registryRecycleTab .parent-filter-card, #registryRecycleTab .child-filter-card');
            allCards.forEach(function(card){ card.classList.remove('active'); });
        }
        renderTable();
    }

    // 复选框功能
    function toggleRowSelect(id) {
        var idx = state.selected.indexOf(id);
        if (idx === -1) {
            state.selected.push(id);
        } else {
            state.selected.splice(idx, 1);
        }
        updateSelectAllCheckbox(currentSubTab);
        updateBatchEditButton();
    }
    
    function toggleSelectAll(tab) {
        var checkbox = document.getElementById(tab === 'issue' ? 'issueSelectAll' : 'recycleSelectAll');
        var tbody = document.getElementById(tab === 'issue' ? 'issueTableBody' : 'recycleTableBody');
        if (!checkbox || !tbody) return;
        
        var checkboxes = tbody.querySelectorAll('.row-checkbox');
        var shouldCheck = checkbox.checked;
        
        checkboxes.forEach(function(cb) {
            var id = cb.getAttribute('data-id');
            var idx = state.selected.indexOf(id);
            
            if (shouldCheck && idx === -1) {
                state.selected.push(id);
            } else if (!shouldCheck && idx !== -1) {
                state.selected.splice(idx, 1);
            }
        });
        
        updateBatchEditButton();
        renderTable();
    }
    
    function updateBatchEditButton() {
        var btn = currentSubTab === 'issue' 
            ? document.getElementById('issueBatchEditBtn') 
            : document.getElementById('recycleBatchEditBtn');
        if (btn) {
            btn.style.display = state.selected.length > 0 ? 'inline-flex' : 'none';
        }
    }
    
    function updateSelectAllCheckbox(tab) {
        var checkbox = document.getElementById(tab === 'issue' ? 'issueSelectAll' : 'recycleSelectAll');
        var tbody = document.getElementById(tab === 'issue' ? 'issueTableBody' : 'recycleTableBody');
        if (!checkbox || !tbody) return;
        
        var checkboxes = tbody.querySelectorAll('.row-checkbox');
        if (checkboxes.length === 0) {
            checkbox.checked = false;
            checkbox.indeterminate = false;
            return;
        }
        
        var checkedCount = 0;
        checkboxes.forEach(function(cb) {
            if (cb.checked) checkedCount++;
        });
        
        if (checkedCount === 0) {
            checkbox.checked = false;
            checkbox.indeterminate = false;
        } else if (checkedCount === checkboxes.length) {
            checkbox.checked = true;
            checkbox.indeterminate = false;
        } else {
            checkbox.checked = false;
            checkbox.indeterminate = true;
        }
    }
    
    function getSelectedRecords() {
        return state.records.filter(function(r) {
            return state.selected.indexOf(r.id) !== -1;
        });
    }
    
    function clearSelection() {
        state.selected = [];
        updateSelectAllCheckbox(currentSubTab);
        updateBatchEditButton();
        renderTable();
    }
    
    // 批量修改功能
    function openBatchEdit() {
        if (state.selected.length === 0) {
            showNotification('请先选择要修改的记录', 'warning');
            return;
        }
        
        // 显示模态框
        var modal = document.getElementById('batchEditModal');
        if (!modal) return;
        modal.style.display = 'block';
        
        // 更新选中数量
        var countEl = document.getElementById('batchEditCount');
        if (countEl) countEl.textContent = '(' + state.selected.length + ' 条)';
        
        // 根据当前标签显示/隐藏相关字段
        var issueItems = ['batchCardStatusItem', 'batchIssueDateItem', 'batchReceiveDateItem'];
        var recycleItems = ['batchRecycleStatusItem', 'batchRecycleReasonItem', 'batchRecycleDateItem'];
        
        if (currentSubTab === 'issue') {
            issueItems.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'flex';
            });
            recycleItems.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        } else {
            issueItems.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            recycleItems.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'flex';
            });
        }
        
        // 清空输入框
        var fields = ['Department', 'CardType', 'CardStatus', 'IssueDate', 'ReceiveDate', 'RecycleStatus', 'RecycleReason', 'RecycleDate', 'Remark'];
        fields.forEach(function(field) {
            var input = document.getElementById('batchEdit' + field);
            if (input) input.value = '';
        });
    }
    
    function closeBatchEdit() {
        var modal = document.getElementById('batchEditModal');
        if (modal) modal.style.display = 'none';
    }
    
    function applyBatchEdit() {
        if (state.selected.length === 0) {
            showNotification('没有选中的记录', 'warning');
            return;
        }
        
        // 收集要修改的字段（只收集非空字段）
        var updates = {};
        var hasUpdates = false;
        
        var fields = [
            { id: 'batchEditDepartment', type: 'person', field: 'department' },
            { id: 'batchEditCardType', type: 'card', field: 'cardType' },
            { id: 'batchEditCardStatus', type: 'action', field: 'cardStatus' },
            { id: 'batchEditIssueDate', type: 'dates', field: 'issueDate' },
            { id: 'batchEditReceiveDate', type: 'dates', field: 'receiveDate' },
            { id: 'batchEditRecycleStatus', type: 'action', field: 'status' },
            { id: 'batchEditRecycleReason', type: 'action', field: 'reason' },
            { id: 'batchEditRecycleDate', type: 'dates', field: 'recycleDate' },
            { id: 'batchEditRemark', type: 'root', field: 'remark' }
        ];
        
        fields.forEach(function(fieldConfig) {
            var input = document.getElementById(fieldConfig.id);
            if (input && input.value && input.value.trim() !== '') {
                var value = input.value.trim();
                
                // 对日期字段使用 parseDate 处理
                if (fieldConfig.type === 'dates') {
                    value = parseDate(value);
                }
                
                if (fieldConfig.type === 'root') {
                    updates.remark = value;
                } else {
                    if (!updates[fieldConfig.type]) updates[fieldConfig.type] = {};
                    updates[fieldConfig.type][fieldConfig.field] = value;
                }
                hasUpdates = true;
            }
        });
        
        if (!hasUpdates) {
            showNotification('请至少填写一个字段', 'warning');
            return;
        }
        
        // 应用修改
        var updatedCount = 0;
        state.records.forEach(function(r) {
            if (state.selected.indexOf(r.id) !== -1) {
                // 只修改当前标签页的记录
                if ((currentSubTab === 'issue' && r.action && r.action.type === 'issue') ||
                    (currentSubTab === 'recycle' && r.action && r.action.type === 'recycle')) {
                    
                    if (updates.person) {
                        if (!r.person) r.person = {};
                        Object.assign(r.person, updates.person);
                    }
                    if (updates.card) {
                        if (!r.card) r.card = {};
                        Object.assign(r.card, updates.card);
                    }
                    if (updates.action) {
                        if (!r.action) r.action = {};
                        Object.assign(r.action, updates.action);
                    }
                    if (updates.dates) {
                        if (!r.dates) r.dates = {};
                        Object.assign(r.dates, updates.dates);
                        
                        // 如果批量修改了领卡日期，自动将发卡状态改为"已发卡"
                        if (updates.dates.receiveDate) {
                            if (!r.action) r.action = {};
                            r.action.cardStatus = '已发卡';
                        }
                    }
                    if (updates.remark !== undefined) {
                        r.remark = updates.remark;
                    }
                    
                    // 更新修改时间
                    if (!r.dates) r.dates = {};
                    r.dates.updatedAt = new Date().toISOString();
                    
                    updatedCount++;
                }
            }
        });
        
        // 保存并刷新
        saveRecords(state.records);
        renderTable();
        closeBatchEdit();
        
        showNotification('成功修改 ' + updatedCount + ' 条记录', 'success');
        
        // 清空选择
        clearSelection();
    }
    
    // 打印功能
    function togglePrintMenu(tab) {
        var menuId = tab === 'issue' ? 'issuePrintMenu' : 'recyclePrintMenu';
        var menu = document.getElementById(menuId);
        if (!menu) return;
        
        // 关闭其他打开的菜单
        var allMenus = document.querySelectorAll('.print-menu');
        allMenus.forEach(function(m) {
            if (m.id !== menuId) m.classList.remove('show');
        });
        
        // 切换当前菜单
        menu.classList.toggle('show');
        
        // 点击页面其他地方关闭菜单
        setTimeout(function() {
            document.addEventListener('click', function closeMenu(e) {
                if (!e.target.closest('.print-dropdown')) {
                    allMenus.forEach(function(m) { m.classList.remove('show'); });
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }
    
    function print(type, tab) {
        // 关闭下拉菜单
        var allMenus = document.querySelectorAll('.print-menu');
        allMenus.forEach(function(m) { m.classList.remove('show'); });
        
        var records = [];
        var title = tab === 'issue' ? '发卡登记表' : '收卡登记表';
        
        // 根据打印类型获取记录
        if (type === 'all') {
            // 全部打印：所有该标签的记录
            records = state.records.filter(function(r) {
                return r.action && r.action.type === tab;
            });
            records = sortRecords(records);
        } else if (type === 'page') {
            // 页面打印：当前页面显示的记录（包括筛选、排序和分页）
            var allFiltered = filtered().filter(function(r){ return r.action && r.action.type === tab; });
            allFiltered = sortRecords(allFiltered);
            
            // 获取当前页的记录
            var startIndex = (state.pagination.currentPage - 1) * state.pagination.pageSize;
            var endIndex = startIndex + state.pagination.pageSize;
            records = allFiltered.slice(startIndex, endIndex);
            
            title += '（第' + state.pagination.currentPage + '页）';
        } else if (type === 'selected') {
            // 选中打印：选中的记录
            if (state.selected.length === 0) {
                showNotification('请先选择要打印的记录', 'warning');
                return;
            }
            records = getSelectedRecords();
        }
        
        if (records.length === 0) {
            showNotification('没有可打印的记录', 'warning');
            return;
        }
        
        // 生成打印内容
        var printContent = generatePrintContent(records, title, tab);
        
        // 先创建或获取打印区域（用于实际打印）
        var printArea = document.getElementById('printArea');
        if (!printArea) {
            printArea = document.createElement('div');
            printArea.id = 'printArea';
            document.body.appendChild(printArea);
        }
        
        // 设置打印内容到打印区域
        printArea.innerHTML = printContent;
        
        // 创建预览模态窗口
        var previewModal = document.createElement('div');
        previewModal.className = 'modal print-preview-modal';
        previewModal.innerHTML = 
            '<div class="modal-content print-preview-content">' +
                '<div class="modal-header">' +
                    '<h3><i class="fa fa-eye"></i> 打印预览</h3>' +
                    '<button class="close-btn" onclick="this.closest(\'.modal\').remove()"><i class="fa fa-times"></i></button>' +
                '</div>' +
                '<div class="modal-body print-preview-body">' +
                    printContent +
                '</div>' +
                '<div class="modal-footer">' +
                    '<button class="btn light" onclick="this.closest(\'.modal\').remove()"><i class="fa fa-times"></i> 关闭</button>' +
                    '<button class="btn" onclick="REG.executePrint()"><i class="fa fa-print"></i> 确认打印</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(previewModal);
        
        // 添加点击背景关闭
        previewModal.addEventListener('click', function(e) {
            if (e.target === previewModal) {
                previewModal.remove();
            }
        });
    }
    
    // 执行实际打印操作
    function executePrint() {
        // 关闭预览窗口
        var previewModal = document.querySelector('.print-preview-modal');
        if (previewModal) {
            previewModal.remove();
        }
        
        // 延迟执行打印，确保内容已渲染
        setTimeout(function() {
            window.print();
        }, 100);
    }
    
    function generatePrintContent(records, title, tab) {
        var now = new Date();
        // 使用兼容的日期格式化方法
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var day = now.getDate();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        
        // 手动补零，兼容老版本浏览器
        var dateStr = year + '-' + 
                      (month < 10 ? '0' + month : month) + '-' + 
                      (day < 10 ? '0' + day : day) + ' ' +
                      (hours < 10 ? '0' + hours : hours) + ':' +
                      (minutes < 10 ? '0' + minutes : minutes);
        
        var html = '<div class="print-title">' + title + '</div>';
        html += '<div class="print-info">打印时间：' + dateStr + ' | 共 ' + records.length + ' 条记录</div>';
        html += '<table class="registry-table">';
        
        // 表头
        if (tab === 'issue') {
            html += '<thead><tr>';
            html += '<th>序号</th>';
            html += '<th>部别</th>';
            html += '<th>姓名</th>';
            html += '<th>身份证号码</th>';
            html += '<th>保障卡号</th>';
            html += '<th>卡类型</th>';
            html += '<th>发卡状态</th>';
            html += '<th>发卡日期</th>';
            html += '<th>领卡日期</th>';
            html += '<th>备注</th>';
            html += '</tr></thead>';
        } else {
            html += '<thead><tr>';
            html += '<th>序号</th>';
            html += '<th>部别</th>';
            html += '<th>姓名</th>';
            html += '<th>身份证号码</th>';
            html += '<th>保障卡号</th>';
            html += '<th>卡类型</th>';
            html += '<th>回收状态</th>';
            html += '<th>回收类型</th>';
            html += '<th>回收日期</th>';
            html += '<th>备注</th>';
            html += '</tr></thead>';
        }
        
        // 表体
        html += '<tbody>';
        records.forEach(function(r, idx) {
            html += '<tr>';
            html += '<td>' + (idx + 1) + '</td>';
            html += '<td>' + (r.person && r.person.department || '') + '</td>';
            html += '<td>' + (r.person && r.person.name || '') + '</td>';
            html += '<td>' + (r.person && r.person.idNumber || '') + '</td>';
            html += '<td>' + (r.card && r.card.cardNumber || '') + '</td>';
            html += '<td>' + (r.card && r.card.cardType || '') + '</td>';
            
            if (tab === 'issue') {
                html += '<td>' + (r.action && r.action.cardStatus || '未发卡') + '</td>';
                html += '<td>' + fmtDateDisplay(r.dates && r.dates.issueDate) + '</td>';
                html += '<td>' + fmtDateDisplay(r.dates && r.dates.receiveDate) + '</td>';
            } else {
                html += '<td>' + mapStatus(r.action && r.action.status) + '</td>';
                html += '<td>' + (r.action && r.action.reason || '') + '</td>';
                html += '<td>' + fmtDateDisplay(r.dates && r.dates.recycleDate) + '</td>';
            }
            
            html += '<td>' + (r.remark || '') + '</td>';
            html += '</tr>';
        });
        html += '</tbody>';
        html += '</table>';
        
        return html;
    }

    // 分页功能
    function updatePagination(totalRecords) {
        var paginationContainer = currentSubTab === 'issue' 
            ? document.getElementById('issuePagination')
            : document.getElementById('recyclePagination');
        
        if (!paginationContainer) return;
        
        if (totalRecords === 0) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        var currentPage = state.pagination.currentPage;
        var totalPages = state.pagination.totalPages;
        var pageSize = state.pagination.pageSize;
        
        var startRecord = (currentPage - 1) * pageSize + 1;
        var endRecord = Math.min(currentPage * pageSize, totalRecords);
        
        var html = '<div class="pagination-info">显示 ' + startRecord + '-' + endRecord + ' / 共 ' + totalRecords + ' 条</div>';
        html += '<div class="pagination-controls">';
        html += '<button class="pagination-btn" onclick="REG.goToPage(1)" '+(currentPage===1?'disabled':'')+'>首页</button>';
        html += '<button class="pagination-btn" onclick="REG.goToPage('+(currentPage-1)+')" '+(currentPage===1?'disabled':'')+'>上一页</button>';
        
        // 页码显示逻辑
        var startPage = Math.max(1, currentPage - 2);
        var endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            html += '<button class="pagination-btn" onclick="REG.goToPage(1)">1</button>';
            if (startPage > 2) html += '<span class="pagination-ellipsis">...</span>';
        }
        
        for (var i = startPage; i <= endPage; i++) {
            html += '<button class="pagination-btn '+(i===currentPage?'active':'')+'" onclick="REG.goToPage('+i+')">'+i+'</button>';
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += '<span class="pagination-ellipsis">...</span>';
            html += '<button class="pagination-btn" onclick="REG.goToPage('+totalPages+')">'+totalPages+'</button>';
        }
        
        html += '<button class="pagination-btn" onclick="REG.goToPage('+(currentPage+1)+')" '+(currentPage===totalPages?'disabled':'')+'>下一页</button>';
        html += '<button class="pagination-btn" onclick="REG.goToPage('+totalPages+')" '+(currentPage===totalPages?'disabled':'')+'>末页</button>';
        
        html += '<select class="pagination-size" onchange="REG.changePageSize(this.value)">';
        html += '<option value="20"'+(pageSize===20?' selected':'')+'>20条/页</option>';
        html += '<option value="50"'+(pageSize===50?' selected':'')+'>50条/页</option>';
        html += '<option value="100"'+(pageSize===100?' selected':'')+'>100条/页</option>';
        html += '<option value="200"'+(pageSize===200?' selected':'')+'>200条/页</option>';
        html += '<option value="500"'+(pageSize===500?' selected':'')+'>500条/页</option>';
        html += '<option value="1000"'+(pageSize===1000?' selected':'')+'>1000条/页</option>';
        html += '<option value="2000"'+(pageSize===2000?' selected':'')+'>2000条/页</option>';
        html += '</select>';
        
        html += '</div>';
        
        paginationContainer.innerHTML = html;
    }
    
    function goToPage(page) {
        if (page < 1 || page > state.pagination.totalPages) return;
        state.pagination.currentPage = page;
        renderTable();
    }
    
    function changePageSize(size) {
        state.pagination.pageSize = parseInt(size);
        state.pagination.currentPage = 1;  // 重置到第一页
        renderTable();
    }
    
    function resetPagination() {
        state.pagination.currentPage = 1;
    }

    // 数据管理功能
    function toggleDataManageMenu() {
        var menu = document.getElementById('dataManageMenu');
        menu.classList.toggle('show');
        
        // 点击外部关闭菜单
        if (menu.classList.contains('show')) {
            setTimeout(function() {
                document.addEventListener('click', closeDataManageMenu);
            }, 0);
        }
    }
    
    function closeDataManageMenu(e) {
        var menu = document.getElementById('dataManageMenu');
        var btn = document.querySelector('.btn-data-manage');
        if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('show');
            document.removeEventListener('click', closeDataManageMenu);
        }
    }
    
    function backupCurrentData() {
        // 关闭下拉菜单
        document.getElementById('dataManageMenu').classList.remove('show');
        
        // 根据当前标签筛选数据
        var dataType = currentSubTab === 'issue' ? 'issue' : 'recycle';
        var typeName = currentSubTab === 'issue' ? '发卡登记' : '收卡登记';
        var filteredRecords = state.records.filter(function(r) {
            return r.action && r.action.type === dataType;
        });
        
        if (filteredRecords.length === 0) {
            showNotification('当前' + typeName + '没有数据可以备份！', 'warning');
            return;
        }
        
        // 准备备份数据
        var backupData = {
            version: '1.0',
            type: dataType,
            timestamp: new Date().toISOString(),
            records: filteredRecords,
            config: state.config
        };
        
        // 生成文件名
        var now = new Date();
        var dateStr = now.getFullYear() + 
            String(now.getMonth() + 1).padStart(2, '0') + 
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + 
            String(now.getMinutes()).padStart(2, '0') + 
            String(now.getSeconds()).padStart(2, '0');
        var filename = typeName + '备份_' + dateStr + '.json';
        
        // 创建下载
        var dataStr = JSON.stringify(backupData, null, 2);
        var blob = new Blob([dataStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        showNotification(typeName + '数据备份成功！共备份 ' + filteredRecords.length + ' 条记录。文件名: ' + filename, 'success');
    }
    
    function backupAllData() {
        // 关闭下拉菜单
        document.getElementById('dataManageMenu').classList.remove('show');
        
        if (state.records.length === 0) {
            showNotification('没有数据可以备份！', 'warning');
            return;
        }
        
        // 统计数据
        var issueRecords = state.records.filter(function(r) {
            return r.action && r.action.type === 'issue';
        });
        var recycleRecords = state.records.filter(function(r) {
            return r.action && r.action.type === 'recycle';
        });
        
        // 准备备份数据
        var backupData = {
            version: '1.0',
            type: 'all',
            timestamp: new Date().toISOString(),
            records: state.records,
            config: state.config,
            summary: {
                total: state.records.length,
                issue: issueRecords.length,
                recycle: recycleRecords.length
            }
        };
        
        // 生成文件名
        var now = new Date();
        var dateStr = now.getFullYear() + 
            String(now.getMonth() + 1).padStart(2, '0') + 
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + 
            String(now.getMinutes()).padStart(2, '0') + 
            String(now.getSeconds()).padStart(2, '0');
        var filename = '发卡收卡登记全部数据备份_' + dateStr + '.json';
        
        // 创建下载
        var dataStr = JSON.stringify(backupData, null, 2);
        var blob = new Blob([dataStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        showNotification(
            '全部数据备份成功！\n' +
            '发卡登记: ' + issueRecords.length + ' 条\n' +
            '收卡登记: ' + recycleRecords.length + ' 条\n' +
            '共计: ' + state.records.length + ' 条记录\n' +
            '文件名: ' + filename,
            'success'
        );
    }
    
    function restoreData(input) {
        var file = input.files[0];
        if (!file) return;
        
        var currentDataType = currentSubTab === 'issue' ? 'issue' : 'recycle';
        var currentTypeName = currentSubTab === 'issue' ? '发卡登记' : '收卡登记';
        
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var backupData = JSON.parse(e.target.result);
                
                // 验证备份数据
                if (!backupData.records || !Array.isArray(backupData.records)) {
                    showNotification('备份文件格式错误！', 'error');
                    input.value = '';
                    return;
                }
                
                // 检查备份类型
                var backupType = backupData.type || 'unknown';
                var backupTypeName = backupType === 'issue' ? '发卡登记' : 
                                    backupType === 'recycle' ? '收卡登记' : 
                                    backupType === 'all' ? '全部数据' : '未知类型';
                
                // 如果是全部数据备份,单独处理
                if (backupType === 'all') {
                    var summary = backupData.summary || {};
                    var mode = confirm(
                        '这是一个完整数据备份文件！\n' +
                        '备份时间: ' + (backupData.timestamp ? new Date(backupData.timestamp).toLocaleString() : '未知') + '\n' +
                        '发卡登记: ' + (summary.issue || 0) + ' 条\n' +
                        '收卡登记: ' + (summary.recycle || 0) + ' 条\n' +
                        '共计: ' + backupData.records.length + ' 条记录\n\n' +
                        '点击"确定"：覆盖所有数据（清空现有数据后导入）\n' +
                        '点击"取消"：合并数据（保留现有数据并添加备份数据）'
                    );
                    
                    if (mode) {
                        // 覆盖模式 - 清空所有数据并导入
                        state.records = [];
                        backupData.records.forEach(function(record) {
                            state.records.push(record);
                        });
                        if (backupData.config) {
                            state.config = backupData.config;
                            saveConfig();
                        }
                    } else {
                        // 合并模式
                        var addedCount = 0;
                        backupData.records.forEach(function(record) {
                            // 检查是否已存在（根据ID）
                            var exists = state.records.some(function(r) { return r.id === record.id; });
                            if (!exists) {
                                state.records.push(record);
                                addedCount++;
                            }
                        });
                        
                        if (addedCount === 0) {
                            showNotification('所有备份记录已存在，未添加新记录。', 'info');
                            input.value = '';
                            return;
                        }
                    }
                    
                    // 保存并刷新
                    saveRecords(state.records);
                    resetFilters();
                    clearSelection();
                    resetPagination();
                    renderTable();
                    populateYearFilters();
                    
                    var issueCount = state.records.filter(function(r) {
                        return r.action && r.action.type === 'issue';
                    }).length;
                    var recycleCount = state.records.filter(function(r) {
                        return r.action && r.action.type === 'recycle';
                    }).length;
                    
                    showNotification(
                        '全部数据恢复成功！' + (mode ? '已覆盖原有数据' : '已合并数据') + '\n' +
                        '发卡登记: ' + issueCount + ' 条\n' +
                        '收卡登记: ' + recycleCount + ' 条\n' +
                        '共计: ' + state.records.length + ' 条记录',
                        'success'
                    );
                    
                    // 清空input，允许重复选择同一文件
                    input.value = '';
                    return;
                }
                
                // 如果备份类型与当前标签不匹配，给出警告
                if (backupType !== 'unknown' && backupType !== currentDataType) {
                    var switchConfirm = confirm(
                        '注意：备份文件类型与当前标签不匹配！\n\n' +
                        '备份文件类型: ' + backupTypeName + '\n' +
                        '当前标签: ' + currentTypeName + '\n\n' +
                        '点击"确定"继续导入（数据会导入到' + currentTypeName + '）\n' +
                        '点击"取消"放弃导入'
                    );
                    if (!switchConfirm) {
                        input.value = '';
                        return;
                    }
                }
                
                // 询问恢复方式
                var mode = confirm(
                    '备份文件包含 ' + backupData.records.length + ' 条' + backupTypeName + '记录\n' +
                    '备份时间: ' + (backupData.timestamp ? new Date(backupData.timestamp).toLocaleString() : '未知') + '\n\n' +
                    '点击"确定"：覆盖当前' + currentTypeName + '数据（清空后导入）\n' +
                    '点击"取消"：合并数据（保留当前数据并添加备份数据）'
                );
                
                if (mode) {
                    // 覆盖模式 - 只删除当前类型的数据
                    state.records = state.records.filter(function(r) {
                        return r.action && r.action.type !== currentDataType;
                    });
                    // 添加备份数据（确保类型正确）
                    backupData.records.forEach(function(record) {
                        if (record.action) {
                            record.action.type = currentDataType;
                        }
                        state.records.push(record);
                    });
                    if (backupData.config) {
                        state.config = backupData.config;
                        saveConfig();
                    }
                } else {
                    // 合并模式
                    var addedCount = 0;
                    backupData.records.forEach(function(record) {
                        // 检查是否已存在（根据ID）
                        var exists = state.records.some(function(r) { return r.id === record.id; });
                        if (!exists) {
                            if (record.action) {
                                record.action.type = currentDataType;
                            }
                            state.records.push(record);
                            addedCount++;
                        }
                    });
                    
                    if (addedCount === 0) {
                        showNotification('所有备份记录已存在，未添加新记录。', 'info');
                        input.value = '';
                        return;
                    }
                }
                
                // 保存并刷新
                saveRecords(state.records);
                resetFilters();
                clearSelection();
                resetPagination();
                renderTable();
                
                var currentTypeCount = state.records.filter(function(r) {
                    return r.action && r.action.type === currentDataType;
                }).length;
                
                showNotification(currentTypeName + '数据恢复成功！' + 
                    (mode ? '已覆盖原有数据' : '已合并数据') + 
                    '，当前' + currentTypeName + '共有 ' + currentTypeCount + ' 条记录。', 'success');
                
            } catch (error) {
                showNotification('恢复失败：' + error.message, 'error');
            }
            
            // 清空input，允许重复选择同一文件
            input.value = '';
        };
        
        reader.readAsText(file);
    }
    
    function clearAllData() {
        // 关闭下拉菜单
        document.getElementById('dataManageMenu').classList.remove('show');
        
        var currentDataType = currentSubTab === 'issue' ? 'issue' : 'recycle';
        var currentTypeName = currentSubTab === 'issue' ? '发卡登记' : '收卡登记';
        
        // 统计当前类型的数据
        var currentTypeRecords = state.records.filter(function(r) {
            return r.action && r.action.type === currentDataType;
        });
        
        if (currentTypeRecords.length === 0) {
            showNotification('当前' + currentTypeName + '没有任何数据！', 'info');
            return;
        }
        
        // 二次确认
        var confirmed = confirm(
            '[!] 警告：此操作将清空所有' + currentTypeName + '数据！\n\n' +
            '当前' + currentTypeName + '共有 ' + currentTypeRecords.length + ' 条记录\n\n' +
            '建议先备份数据再进行清空操作。\n\n' +
            '确定要清空所有' + currentTypeName + '数据吗？'
        );
        
        if (!confirmed) return;
        
        // 再次确认
        var finalConfirm = confirm('最后确认：真的要删除所有 ' + currentTypeRecords.length + ' 条' + currentTypeName + '记录吗？\n此操作不可恢复！');
        
        if (finalConfirm) {
            // 只删除当前类型的数据，保留其他类型
            state.records = state.records.filter(function(r) {
                return r.action && r.action.type !== currentDataType;
            });
            saveRecords(state.records);
            clearSelection();
            resetPagination();
            renderTable();
            showNotification(currentTypeName + '数据已清空！', 'success');
        }
    }

    // Excel导入导出功能
    function downloadTemplate() {
        var headers = [];
        var filename = '';
        var sampleData = [];
        
        if (currentSubTab === 'issue') {
            // 发卡登记模板
            filename = '发卡登记模板.xlsx';
            headers = ['序号', '部别', '姓名', '身份证号码', '保障卡号', '卡类型', '关联军人', '发卡状态', '发卡日期', '领卡日期', '备注'];
            sampleData = [
                [1, '一连', '张三', '110101199001011234', 'BZK20240001', 'Ⅰ类卡', '', '已发卡', '20240101', '20240102', '示例数据'],
                [2, '二连', '李四', '110101199002022345', 'BZK20240002', 'Ⅱ类卡', '', '未发卡', '20240103', '', ''],
                ['', '请在此行下方添加数据', '', '', '', '卡类型：Ⅰ类卡/Ⅱ类卡/Ⅲ类卡/Ⅳ类卡', '关联军人仅Ⅲ类卡需要填写', '发卡状态：已发卡/未发卡', '日期格式：20240101 或 2024-01-01', '', '']
            ];
        } else {
            // 收卡登记模板
            filename = '收卡登记模板.xlsx';
            headers = ['序号', '部别', '姓名', '身份证号码', '保障卡号', '卡类型', '关联军人', '回收状态', '回收类型', '回收日期', '备注'];
            sampleData = [
                [1, '一连', '张三', '110101199001011234', 'BZK20240001', 'Ⅰ类卡', '', '已回收', '退伍回收', '20240101', '示例数据'],
                [2, '二连', '李四', '110101199002022345', 'BZK20240002', 'Ⅱ类卡', '', '未回收', '转业回收', '', ''],
                ['', '请在此行下方添加数据', '', '', '', '卡类型：Ⅰ类卡/Ⅱ类卡/Ⅲ类卡/Ⅳ类卡', '关联军人仅Ⅲ类卡需要填写', '回收状态：已回收/未回收', '回收类型：退伍回收/复员回收/转业回收/损坏回收/纠错回收/更换回收/消磁回收/其他原因回收', '日期格式：20240101 或 2024-01-01', '']
            ];
        }
        
        // 创建工作簿
        var wb = XLSX.utils.book_new();
        var wsData = [headers].concat(sampleData);
        var ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 设置列宽
        ws['!cols'] = [
            {wch: 6},  // 序号
            {wch: 15}, // 部别
            {wch: 10}, // 姓名
            {wch: 20}, // 身份证号码
            {wch: 20}, // 保障卡号
            {wch: 10}, // 卡类型
            {wch: 12}, // 关联军人
            {wch: 15}, // 状态
            {wch: 35}, // 日期/类型
            {wch: 20}, // 日期
            {wch: 20}  // 备注
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, currentSubTab === 'issue' ? '发卡登记' : '收卡登记');
        XLSX.writeFile(wb, filename);
    }
    
    function exportExcel() {
        var data = [];
        var filename = '';
        var headers = [];
        
        if (currentSubTab === 'issue') {
            // 发卡登记导出
            filename = '发卡登记_' + new Date().toISOString().split('T')[0] + '.xlsx';
            headers = ['序号', '部别', '姓名', '身份证号码', '保障卡号', '卡类型', '关联军人', '发卡状态', '发卡日期', '领卡日期', '备注'];
            
            var issueRecords = state.records.filter(function(r){ return r.action && r.action.type === 'issue'; });
            issueRecords.forEach(function(r, idx) {
                var p = r.person || {};
                var c = r.card || {};
                var a = r.action || {};
                var d = r.dates || {};
                // 只在Ⅲ类卡时导出关联军人，其他显示空
                var relatedMilitary = c.cardType === 'Ⅲ类卡' ? (c.relatedMilitary || '') : '';
                data.push([
                    idx + 1,
                    p.department || '',
                    p.name || '',
                    p.idNumber || '',
                    c.cardNumber || '',
                    c.cardType || '',
                    relatedMilitary,
                    a.cardStatus || '未发卡',
                    fmtDateDisplay(d.issueDate),
                    fmtDateDisplay(d.receiveDate),
                    r.remark || ''
                ]);
            });
        } else {
            // 收卡登记导出
            filename = '收卡登记_' + new Date().toISOString().split('T')[0] + '.xlsx';
            headers = ['序号', '部别', '姓名', '身份证号码', '保障卡号', '卡类型', '关联军人', '回收状态', '回收类型', '回收日期', '备注'];
            
            var recycleRecords = state.records.filter(function(r){ return r.action && r.action.type === 'recycle'; });
            recycleRecords.forEach(function(r, idx) {
                var p = r.person || {};
                var c = r.card || {};
                var a = r.action || {};
                var d = r.dates || {};
                // 只在Ⅲ类卡时导出关联军人，其他显示空
                var relatedMilitary = c.cardType === 'Ⅲ类卡' ? (c.relatedMilitary || '') : '';
                data.push([
                    idx + 1,
                    p.department || '',
                    p.name || '',
                    p.idNumber || '',
                    c.cardNumber || '',
                    c.cardType || '',
                    relatedMilitary,
                    mapStatus(a.status),
                    a.reason || '',
                    fmtDateDisplay(d.recycleDate),
                    r.remark || ''
                ]);
            });
        }
        
        if (data.length === 0) {
            showNotification('没有数据可导出', 'warning');
            return;
        }
        
        // 创建工作簿
        var wb = XLSX.utils.book_new();
        var wsData = [headers].concat(data);
        var ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 设置列宽
        ws['!cols'] = [
            {wch: 6},  // 序号
            {wch: 15}, // 部别
            {wch: 10}, // 姓名
            {wch: 20}, // 身份证号码
            {wch: 20}, // 保障卡号
            {wch: 10}, // 卡类型
            {wch: 12}, // 关联军人
            {wch: 12}, // 状态
            {wch: 12}, // 日期/类型
            {wch: 12}, // 日期
            {wch: 20}  // 备注
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, currentSubTab === 'issue' ? '发卡登记' : '收卡登记');
        XLSX.writeFile(wb, filename);
    }
    
    function importExcel(input) {
        var file = input.files[0];
        if (!file) return;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, {type: 'array'});
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                var jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                
                if (jsonData.length < 2) {
                    showNotification('Excel文件没有数据', 'warning');
                    input.value = '';
                    return;
                }
                
                // 跳过表头
                var rows = jsonData.slice(1);
                var newRecords = [];
                var errors = [];
                
                // 解析Excel数据为记录对象
                rows.forEach(function(row, idx) {
                    // 跳过空行
                    if (!row || row.length === 0 || !row[2]) return;  // 检查姓名列
                    
                    try {
                        var record = {
                            id: uid(),
                            person: {
                                department: row[1] || '',
                                name: row[2] || '',
                                idNumber: row[3] || ''
                            },
                            card: {
                                cardNumber: row[4] || '',
                                cardType: normalizeCardType(row[5] || ''),
                                relatedMilitary: row[6] || ''  // 新增：关联军人字段
                            },
                            action: {
                                type: currentSubTab
                            },
                            dates: {
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            },
                            remark: row[10] || ''  // 备注列从9改为10
                        };
                        
                        if (currentSubTab === 'issue') {
                            // 发卡登记
                            record.action.cardStatus = row[7] || '未发卡';  // 发卡状态从6改为7
                            record.dates.issueDate = parseDate(row[8]);      // 发卡日期从7改为8
                            record.dates.receiveDate = parseDate(row[9]);    // 领卡日期从8改为9
                            
                            // 日期转换日志（仅在开发调试时）
                            if (window.Logger && (row[8] || row[9])) {
                                window.Logger.log('第' + (idx + 2) + '行日期转换:', 
                                    '发卡日期[', row[8], '=>', record.dates.issueDate + ']',
                                    '领卡日期[', row[9], '=>', record.dates.receiveDate + ']');
                            }
                            
                            // 如果有领卡日期，自动将发卡状态改为"已发卡"
                            if (record.dates.receiveDate) {
                                record.action.cardStatus = '已发卡';
                            }
                        } else {
                            // 收卡登记
                            var statusText = row[7] || '';  // 回收状态从6改为7
                            record.action.status = statusText === '未回收' ? 'pending' : 'done';
                            record.action.reason = row[8] || '';   // 回收类型从7改为8
                            record.dates.recycleDate = parseDate(row[9]);  // 回收日期从8改为9
                            
                            // 日期转换日志（仅在开发调试时）
                            if (window.Logger && row[9]) {
                                window.Logger.log('第' + (idx + 2) + '行日期转换:', 
                                    '回收日期[', row[9], '=>', record.dates.recycleDate + ']');
                            }
                        }
                        
                        newRecords.push(record);
                    } catch (err) {
                        errors.push('第' + (idx + 2) + '行：' + err.message);
                    }
                });
                
                if (newRecords.length === 0) {
                    showNotification('Excel文件中没有有效数据', 'warning');
                    input.value = '';
                    return;
                }
                
                // 检测重复
                var duplicates = [];
                var uniqueRecords = [];
                
                newRecords.forEach(function(newRecord) {
                    var isDuplicate = false;
                    var duplicateIndex = -1;
                    
                    // 在当前标签类型中查找重复（只在同类型中查重）
                    for (var i = 0; i < state.records.length; i++) {
                        var existingRecord = state.records[i];
                        
                        // 只检查相同类型的记录
                        if (existingRecord.action.type !== currentSubTab) continue;
                        
                        var newPerson = newRecord.person;
                        var existingPerson = existingRecord.person;
                        var newDates = newRecord.dates;
                        var existingDates = existingRecord.dates;
                        
                        // 判断日期是否相同
                        var isSameDate = false;
                        if (currentSubTab === 'issue') {
                            // 发卡登记：比较发卡日期
                            isSameDate = newDates.issueDate && existingDates.issueDate && 
                                        newDates.issueDate === existingDates.issueDate;
                        } else {
                            // 收卡登记：比较回收日期
                            isSameDate = newDates.recycleDate && existingDates.recycleDate && 
                                        newDates.recycleDate === existingDates.recycleDate;
                        }
                        
                        // 重复判断逻辑（必须同时满足日期相同）：
                        // 1. 身份证号相同 + 日期相同
                        // 2. 姓名相同 + 保障卡号相同 + 日期相同
                        // 3. 姓名相同 + 部别相同 + 日期相同
                        // 注意：如果日期不同，即使其他信息都相同，也不判定为重复（允许同一个人在不同时间领卡）
                        if (isSameDate) {
                            if (newPerson.idNumber && existingPerson.idNumber && 
                                newPerson.idNumber === existingPerson.idNumber) {
                                isDuplicate = true;
                                duplicateIndex = i;
                                break;
                            } else if (newPerson.name === existingPerson.name && 
                                       newRecord.card.cardNumber && existingRecord.card.cardNumber &&
                                       newRecord.card.cardNumber === existingRecord.card.cardNumber) {
                                isDuplicate = true;
                                duplicateIndex = i;
                                break;
                            } else if (newPerson.name === existingPerson.name && 
                                       newPerson.department === existingPerson.department &&
                                       newPerson.department !== '') {
                                isDuplicate = true;
                                duplicateIndex = i;
                                break;
                            }
                        }
                    }
                    
                    if (isDuplicate) {
                        duplicates.push({
                            record: newRecord,
                            existingIndex: duplicateIndex
                        });
                    } else {
                        uniqueRecords.push(newRecord);
                    }
                });
                
                // 处理导入结果
                var typeName = currentSubTab === 'issue' ? '发卡登记' : '收卡登记';
                
                if (duplicates.length > 0) {
                    // 有重复项，询问用户如何处理
                    var dateFieldName = currentSubTab === 'issue' ? '发卡日期' : '回收日期';
                    var message = '检测到 ' + duplicates.length + ' 条重复记录，' + uniqueRecords.length + ' 条新记录。\n\n';
                    message += '重复判断依据：\n';
                    message += '• ' + dateFieldName + '相同 + 身份证号相同\n';
                    message += '• ' + dateFieldName + '相同 + 姓名相同 + 保障卡号相同\n';
                    message += '• ' + dateFieldName + '相同 + 姓名相同 + 部别相同\n\n';
                    message += '注意：' + dateFieldName + '不同的记录不会判定为重复\n';
                    message += '（同一个人可以在不同时间领卡或收卡）\n\n';
                    message += '请选择处理方式：\n';
                    message += '【确定】仅导入新记录，跳过重复项（推荐）\n';
                    message += '【取消】更新重复记录，并导入新记录';
                    
                    var skipDuplicates = confirm(message);
                    
                    if (skipDuplicates) {
                        // 只导入不重复的记录
                        state.records = state.records.concat(uniqueRecords);
                        saveRecords(state.records);
                        renderTable();
                        updateStats();
                        
                        showNotification(
                            '成功导入 ' + uniqueRecords.length + ' 条新记录\n' +
                            '跳过 ' + duplicates.length + ' 条重复记录',
                            'success'
                        );
                    } else {
                        // 更新重复记录，并导入新记录
                        duplicates.forEach(function(dup) {
                            // 保留原有ID和创建时间，更新其他信息
                            var existingId = state.records[dup.existingIndex].id;
                            var existingCreatedAt = state.records[dup.existingIndex].dates.createdAt;
                            dup.record.id = existingId;
                            dup.record.dates.createdAt = existingCreatedAt;
                            dup.record.dates.updatedAt = new Date().toISOString();
                            
                            // 替换原有记录
                            state.records[dup.existingIndex] = dup.record;
                        });
                        
                        // 添加新记录
                        state.records = state.records.concat(uniqueRecords);
                        saveRecords(state.records);
                        renderTable();
                        updateStats();
                        
                        showNotification(
                            '成功导入 ' + uniqueRecords.length + ' 条新记录\n' +
                            '更新 ' + duplicates.length + ' 条已有记录',
                            'success'
                        );
                    }
                } else {
                    // 没有重复，直接导入所有记录
                    state.records = state.records.concat(uniqueRecords);
                    saveRecords(state.records);
                    renderTable();
                    updateStats();
                    
                    var message = '成功导入 ' + uniqueRecords.length + ' 条记录';
                    if (errors.length > 0) {
                        message += '\n部分记录有错误：' + errors.slice(0, 3).join('；');
                        if (errors.length > 3) message += '等...';
                    }
                    showNotification(message, 'success');
                }
                
                if (errors.length > 0 && newRecords.length === 0) {
                    showNotification('导入失败。错误：' + errors.slice(0, 3).join('；'), 'error');
                }
                
            } catch (error) {
                showNotification('导入失败：' + error.message, 'error');
            }
            
            // 清空文件输入
            input.value = '';
        };
        
        reader.readAsArrayBuffer(file);
    }

    // 导入家属关联（根据身份证号码匹配并填充关联军人）
    function importFamilyRelation(input) {
        var file = input.files[0];
        if (!file) return;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, {type: 'array'});
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                var jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                
                if (jsonData.length < 2) {
                    showNotification('Excel文件没有数据', 'warning');
                    input.value = '';
                    return;
                }
                
                // 解析表头，识别身份证号码和军人姓名列
                var headers = jsonData[0];
                var idNumberCol = -1;
                var militaryNameCol = -1;
                var idNumberPriority = 999;  // 优先级，数字越小越优先
                var militaryNamePriority = 999;
                
                for (var i = 0; i < headers.length; i++) {
                    var header = String(headers[i] || '').trim();
                    var headerNormalized = header.replace(/\s+/g, '');  // 移除所有空格
                    
                    // 识别身份证号码列（精确匹配优先，模糊匹配次之）
                    var idPriority = 999;
                    if (headerNormalized === '公民身份号码' || headerNormalized === '身份证号码') {
                        idPriority = 1;  // 最高优先级
                    } else if (headerNormalized === '身份证号' || headerNormalized === '身份证') {
                        idPriority = 2;
                    } else if (headerNormalized === '证件号码' || headerNormalized === '证件号') {
                        idPriority = 3;
                    } else if (headerNormalized.indexOf('身份号码') !== -1 && headerNormalized.indexOf('成员') === -1 && headerNormalized.indexOf('爱人') === -1 && headerNormalized.indexOf('子女') === -1) {
                        idPriority = 4;  // 包含"身份号码"但不包含"成员/爱人/子女"
                    }
                    
                    if (idPriority < idNumberPriority) {
                        idNumberCol = i;
                        idNumberPriority = idPriority;
                    }
                    
                    // 识别军人姓名列（精确匹配优先）
                    var namePriority = 999;
                    if (headerNormalized === '对应军人姓名' || headerNormalized === '军人姓名') {
                        namePriority = 1;  // 最高优先级
                    } else if (headerNormalized === '关联军人' || headerNormalized === '关联人姓名' || headerNormalized === '关联人') {
                        namePriority = 2;
                    } else if (headerNormalized === '家长姓名' || headerNormalized === '家长') {
                        namePriority = 3;
                    } else if (headerNormalized.indexOf('对应') !== -1 && headerNormalized.indexOf('姓名') !== -1) {
                        namePriority = 4;  // 包含"对应"和"姓名"
                    }
                    
                    if (namePriority < militaryNamePriority) {
                        militaryNameCol = i;
                        militaryNamePriority = namePriority;
                    }
                }
                
                debugLog('✓ 列识别成功 - 身份证: 第' + (idNumberCol + 1) + '列 "' + headers[idNumberCol] + '", 军人姓名: 第' + (militaryNameCol + 1) + '列 "' + headers[militaryNameCol] + '"');
                
                if (idNumberCol === -1 || militaryNameCol === -1) {
                    var detectedHeaders = '检测到的表头：\n';
                    for (var i = 0; i < headers.length; i++) {
                        detectedHeaders += '第' + (i+1) + '列: "' + headers[i] + '"\n';
                    }
                    
                    showNotification(
                        '无法识别Excel列！\n\n' +
                        detectedHeaders + '\n' +
                        '需要包含的关键词：\n' +
                        '• 身份证列：身份证/公民身份/证件号/身份号\n' +
                        '• 军人姓名列：军人/关联/家长/对应\n\n' +
                        '请检查表头是否包含以上关键词',
                        'error'
                    );
                    input.value = '';
                    return;
                }
                
                // 构建关联映射表
                var relationMap = {};
                var totalRows = jsonData.length - 1;  // 减去表头行
                var validRows = 0;
                var emptyIdRows = 0;
                var emptyNameRows = 0;
                
                for (var i = 1; i < jsonData.length; i++) {
                    var row = jsonData[i];
                    if (!row || row.length === 0) continue;
                    
                    var idNumber = String(row[idNumberCol] || '').trim();
                    var militaryName = String(row[militaryNameCol] || '').trim();
                    
                    if (!idNumber) {
                        emptyIdRows++;
                        continue;
                    }
                    
                    if (!militaryName) {
                        emptyNameRows++;
                        continue;
                    }
                    
                    relationMap[idNumber] = militaryName;
                    validRows++;
                }
                
                debugLog('✓ 数据读取完成 - 有效: ' + validRows + ' 条, 跳过: ' + (emptyIdRows + emptyNameRows) + ' 条');
                
                if (Object.keys(relationMap).length === 0) {
                    var message = 'Excel中没有有效的家属关联数据！\n\n';
                    message += '统计信息：\n';
                    message += '• 总行数（不含表头）: ' + totalRows + '\n';
                    message += '• 身份证为空: ' + emptyIdRows + ' 行\n';
                    message += '• 军人姓名为空: ' + emptyNameRows + ' 行\n';
                    message += '• 有效数据: ' + validRows + ' 行\n\n';
                    message += '请检查Excel文件是否包含有效数据';
                    
                    showNotification(message, 'warning');
                    input.value = '';
                    return;
                }
                
                // 匹配并更新Ⅲ类卡记录
                var matchedCount = 0;
                var updatedCount = 0;
                var notType3Count = 0;
                var notFoundCount = 0;
                
                for (var idNumber in relationMap) {
                    var militaryName = relationMap[idNumber];
                    var found = false;
                    
                    for (var j = 0; j < state.records.length; j++) {
                        var record = state.records[j];
                        var p = record.person || {};
                        var c = record.card || {};
                        
                        // 匹配身份证号码
                        if (p.idNumber === idNumber) {
                            found = true;
                            matchedCount++;
                            
                            // 检查是否为Ⅲ类卡
                            if (c.cardType === 'Ⅲ类卡') {
                                // 填充关联军人
                                if (!record.card) record.card = {};
                                record.card.relatedMilitary = militaryName;
                                updatedCount++;
                            } else {
                                notType3Count++;
                            }
                            break;
                        }
                    }
                    
                    if (!found) {
                        notFoundCount++;
                    }
                }
                
                debugLog('✓ 匹配完成 - 更新Ⅲ类卡: ' + updatedCount + ' 条, 跳过非Ⅲ类卡: ' + notType3Count + ' 条, 未找到: ' + notFoundCount + ' 条');
                
                if (updatedCount > 0) {
                    saveRecords(state.records);
                    renderTable();
                    
                    var message = '家属关联导入完成！\n\n';
                    message += '✓ 成功匹配: ' + matchedCount + ' 条\n';
                    message += '✓ 更新Ⅲ类卡: ' + updatedCount + ' 条\n';
                    if (notType3Count > 0) {
                        message += '⚠ 匹配但非Ⅲ类卡（跳过）: ' + notType3Count + ' 条\n';
                    }
                    if (notFoundCount > 0) {
                        message += '⚠ 未找到匹配记录: ' + notFoundCount + ' 条\n';
                    }
                    
                    showNotification(message, 'success');
                } else {
                    var message = '未能更新任何记录\n\n';
                    if (matchedCount > 0) {
                        message += '匹配到 ' + matchedCount + ' 条记录，但都不是Ⅲ类卡';
                    } else {
                        message += '所有身份证号码都未找到匹配的记录';
                    }
                    showNotification(message, 'warning');
                }
                
            } catch (error) {
                console.error('导入失败:', error);
                showNotification('导入失败：' + error.message, 'error');
            }
            
            input.value = '';
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // 更新常用部门列表
    function updateCommonDepartments() {
        var datalist = document.getElementById('commonDepartmentsList');
        if (!datalist) return;
        
        var departments = state.config.commonDepartments || [];
        datalist.innerHTML = departments.map(function(dept) {
            return '<option value="' + escapeHtml(dept) + '">';
        }).join('');
    }
    
    // 规范化卡类型函数（统一格式）
    function normalizeCardType(cardType) {
        if (!cardType) return '';
        cardType = String(cardType).trim();
        
        // 如果已经是标准格式，直接返回
        if (/^[ⅠⅡⅢⅣ]类卡$/.test(cardType)) {
            return cardType;
        }
        
        // 将"型卡"统一转换为"类卡"
        cardType = cardType.replace(/型卡/g, '类卡');
        
        // 处理可能的空格
        cardType = cardType.replace(/\s+/g, '');
        
        // 处理中文数字（一、二、三、四）
        var chineseMap = {
            '一': 'Ⅰ', '二': 'Ⅱ', '三': 'Ⅲ', '四': 'Ⅳ',
            '壹': 'Ⅰ', '贰': 'Ⅱ', '叁': 'Ⅲ', '肆': 'Ⅳ'
        };
        for (var cn in chineseMap) {
            var regex = new RegExp(cn + '(?:类卡|型卡)?', 'g');
            if (regex.test(cardType)) {
                return chineseMap[cn] + '类卡';
            }
        }
        
        // 如果只有罗马数字，自动补充"类卡"
        if (/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/.test(cardType)) {
            // 只取第一个罗马数字
            var first = cardType.charAt(0);
            if (/^[ⅠⅡⅢⅣ]$/.test(first)) {
                return first + '类卡';
            }
        }
        
        // 处理可能的半角罗马数字
        var romanMap = {
            'I': 'Ⅰ', 'II': 'Ⅱ', 'III': 'Ⅲ', 'IV': 'Ⅳ',
            'V': 'Ⅴ', 'VI': 'Ⅵ', 'VII': 'Ⅶ', 'VIII': 'Ⅷ',
            'IX': 'Ⅸ', 'X': 'Ⅹ'
        };
        
        // 尝试匹配半角罗马数字（单独或带"类卡"/"型卡"）
        var match = cardType.match(/^([IVX]+)(?:类卡|型卡)?$/i);
        if (match) {
            var upper = match[1].toUpperCase();
            if (romanMap[upper] && /^[ⅠⅡⅢⅣ]$/.test(romanMap[upper])) {
                return romanMap[upper] + '类卡';
            }
        }
        
        // 处理阿拉伯数字（1、2、3、4 -> Ⅰ、Ⅱ、Ⅲ、Ⅳ）
        var arabicMap = {'1': 'Ⅰ', '2': 'Ⅱ', '3': 'Ⅲ', '4': 'Ⅳ'};
        var arabicMatch = cardType.match(/^([1-4])(?:类卡|型卡)?$/);
        if (arabicMatch) {
            var num = arabicMatch[1];
            return arabicMap[num] + '类卡';
        }
        
        // 处理"第X类卡"、"第X型卡"格式
        var prefixMatch = cardType.match(/第?([ⅠⅡⅢⅣ1-4一二三四])(?:类卡|型卡)?$/);
        if (prefixMatch) {
            var type = prefixMatch[1];
            if (arabicMap[type]) return arabicMap[type] + '类卡';
            if (chineseMap[type]) return chineseMap[type] + '类卡';
            if (/^[ⅠⅡⅢⅣ]$/.test(type)) return type + '类卡';
        }
        
        // 如果无法识别，返回原值
        return cardType;
    }
    
    function init(){ 
        ensureCardTypeOptions(); 
        ensureRecycleReasonOptions(); 
        populateYearFilters();
        updateCommonDepartments();
        // 恢复上次的子标签状态
        var savedTab = loadCurrentSubTab();
        switchSubTab(savedTab); 
        updateStats();
    }

    // 批量导入记录（供外部调用，如表格转换工具）
    function importRecords(records, type) {
        if (!records || !Array.isArray(records) || records.length === 0) {
            return;
        }
        
        type = type || 'issue';  // 默认为发卡登记
        
        // 添加到现有记录中，同时规范化卡类型
        records.forEach(function(record) {
            // 规范化卡类型（使用全局函数）
            if (record.card && record.card.cardType) {
                record.card.cardType = normalizeCardType(record.card.cardType);
            }
            state.records.push(record);
        });
        
        // 保存并刷新
        saveRecords(state.records);
        resetFilters();
        clearSelection();
        resetPagination();
        
        // 根据类型切换到对应的标签页
        var targetTab = type === 'recycle' ? 'recycle' : 'issue';
        if (currentSubTab !== targetTab) {
            switchSubTab(targetTab);
        } else {
            renderTable();
        }
    }

    // 暴露到全局
    window.REG = {
        init: init,
        applyFilters: applyFilters,
        resetFilters: resetFilters,
        filterByCard: filterByCard,
        filterRecycleCard: filterRecycleCard,
        filterByYear: filterByYear,
        filterByDateRange: filterByDateRange,
        search: search,
        clearSearch: clearSearch,
        addInlineRow: addInlineRow,
        saveInlineRow: saveInlineRow,
        cancelInlineRow: cancelInlineRow,
        toggleCardStatus: toggleCardStatus,
        toggleRecycleStatus: toggleRecycleStatus,
        editCell: editCell,
        sortTable: sortTable,
        remove: remove,
        switchSubTab: switchSubTab,
        toggleRowSelect: toggleRowSelect,
        toggleSelectAll: toggleSelectAll,
        getSelectedRecords: getSelectedRecords,
        clearSelection: clearSelection,
        openBatchEdit: openBatchEdit,
        closeBatchEdit: closeBatchEdit,
        applyBatchEdit: applyBatchEdit,
        togglePrintMenu: togglePrintMenu,
        print: print,
        executePrint: executePrint,
        downloadTemplate: downloadTemplate,
        exportExcel: exportExcel,
        importExcel: importExcel,
        importFamilyRelation: importFamilyRelation,
        goToPage: goToPage,
        changePageSize: changePageSize,
        toggleDataManageMenu: toggleDataManageMenu,
        backupCurrentData: backupCurrentData,
        backupAllData: backupAllData,
        restoreData: restoreData,
        clearAllData: clearAllData,
        importRecords: importRecords
    };
})();


