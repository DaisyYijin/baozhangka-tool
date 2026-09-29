/**
 * 日志管理器
 * 统一管理所有日志输出，支持开发/生产环境切换
 * 在生产环境中自动禁用调试日志
 */
(function(window) {
    'use strict';
    
    var Logger = {
        // 是否启用日志（生产环境设为 false）
        _enabled: false,  // 默认关闭，避免控制台输出泄露信息
        
        // 是否启用错误日志（错误始终记录）
        _enableError: true,
        
        // 日志级别
        LEVEL: {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        },
        
        // 当前日志级别（只显示此级别及以上的日志）
        _currentLevel: 1,  // 默认 INFO
        
        /**
         * 调试日志
         * @param {...any} args - 日志参数
         */
        log: function() {
            if (this._enabled && this._currentLevel <= this.LEVEL.DEBUG) {
                console.log.apply(console, arguments);
            }
        },
        
        /**
         * 调试日志（别名）
         * @param {...any} args - 日志参数
         */
        debug: function() {
            if (this._enabled && this._currentLevel <= this.LEVEL.DEBUG) {
                console.log.apply(console, arguments);
            }
        },
        
        /**
         * 信息日志
         * @param {...any} args - 日志参数
         */
        info: function() {
            if (this._enabled && this._currentLevel <= this.LEVEL.INFO) {
                console.info.apply(console, arguments);
            }
        },
        
        /**
         * 警告日志
         * @param {...any} args - 日志参数
         */
        warn: function() {
            if (this._enabled && this._currentLevel <= this.LEVEL.WARN) {
                console.warn.apply(console, arguments);
            }
        },
        
        /**
         * 错误日志（始终记录）
         * @param {...any} args - 日志参数
         */
        error: function() {
            if (this._enableError) {
                console.error.apply(console, arguments);
            }
        },
        
        /**
         * 启用日志
         */
        enable: function() {
            this._enabled = true;
            this.info('Logger 已启用');
        },
        
        /**
         * 禁用日志
         */
        disable: function() {
            this.info('Logger 即将禁用');
            this._enabled = false;
        },
        
        /**
         * 设置日志级别
         * @param {number} level - 日志级别
         */
        setLevel: function(level) {
            if (typeof level === 'number' && level >= 0 && level <= 3) {
                this._currentLevel = level;
                this.info('日志级别已设置为: ' + level);
            }
        },
        
        /**
         * 开发模式（启用所有日志）
         */
        devMode: function() {
            this._enabled = true;
            this._currentLevel = this.LEVEL.DEBUG;
            debugLog('%c[Logger] 开发模式已启用', 'color: #2ecc71; font-weight: bold');
        },
        
        /**
         * 生产模式（仅错误日志）
         */
        prodMode: function() {
            this._enabled = false;
            this._currentLevel = this.LEVEL.ERROR;
            debugLog('%c[Logger] 生产模式已启用', 'color: #e74c3c; font-weight: bold');
        },
        
        /**
         * 性能计时开始
         * @param {string} label - 计时标签
         */
        time: function(label) {
            if (this._enabled) {
                console.time(label);
            }
        },
        
        /**
         * 性能计时结束
         * @param {string} label - 计时标签
         */
        timeEnd: function(label) {
            if (this._enabled) {
                console.timeEnd(label);
            }
        },
        
        /**
         * 分组日志开始
         * @param {string} label - 分组标签
         */
        group: function(label) {
            if (this._enabled) {
                console.group(label);
            }
        },
        
        /**
         * 分组日志结束
         */
        groupEnd: function() {
            if (this._enabled) {
                console.groupEnd();
            }
        },
        
        /**
         * 表格输出
         * @param {Array|Object} data - 数据
         */
        table: function(data) {
            if (this._enabled && this._currentLevel <= this.LEVEL.INFO) {
                console.table(data);
            }
        }
    };
    
    // 挂载到全局
    window.Logger = Logger;
    
    // 根据 URL 参数自动设置模式
    // 如：?debug=1 启用调试模式
    if (window.location) {
        var search = window.location.search;
        if (search.indexOf('debug=1') !== -1 || search.indexOf('dev=1') !== -1) {
            Logger.devMode();
        }
    }
    
})(window);

