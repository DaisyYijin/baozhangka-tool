/**
 * 加载状态管理器
 * 提供统一的加载提示界面，改善用户体验
 */
(function(window) {
    'use strict';
    
    var LoadingManager = {
        _loadingEl: null,
        _textEl: null,
        _progressEl: null,
        _isShowing: false,
        
        /**
         * 初始化加载遮罩
         */
        _init: function() {
            if (this._loadingEl) return;
            
            // 创建加载遮罩
            var loading = document.createElement('div');
            loading.id = 'global-loading';
            loading.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 9999;
                align-items: center;
                justify-content: center;
            `;
            
            // 创建加载内容
            var content = document.createElement('div');
            content.style.cssText = `
                background: white;
                padding: 30px 40px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                min-width: 250px;
            `;
            
            // 创建加载动画
            var spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.style.cssText = `
                width: 50px;
                height: 50px;
                margin: 0 auto 20px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
            
            // 添加旋转动画（如果不存在）
            if (!document.getElementById('loading-spinner-style')) {
                var style = document.createElement('style');
                style.id = 'loading-spinner-style';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 创建文本元素
            var text = document.createElement('div');
            text.id = 'loading-text';
            text.style.cssText = `
                font-size: 16px;
                color: #333;
                margin-bottom: 10px;
                font-weight: 500;
            `;
            text.textContent = '加载中...';
            
            // 创建进度条容器
            var progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                display: none;
                width: 100%;
                height: 8px;
                background: #f0f0f0;
                border-radius: 4px;
                overflow: hidden;
                margin-top: 15px;
            `;
            
            // 创建进度条
            var progress = document.createElement('div');
            progress.id = 'loading-progress';
            progress.style.cssText = `
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                border-radius: 4px;
                transition: width 0.3s ease;
            `;
            
            progressContainer.appendChild(progress);
            content.appendChild(spinner);
            content.appendChild(text);
            content.appendChild(progressContainer);
            loading.appendChild(content);
            document.body.appendChild(loading);
            
            this._loadingEl = loading;
            this._textEl = text;
            this._progressEl = progress;
            this._progressContainer = progressContainer;
        },
        
        /**
         * 显示加载提示
         * @param {string} text - 提示文本（可选）
         */
        show: function(text) {
            this._init();
            
            if (text) {
                this._textEl.textContent = text;
            } else {
                this._textEl.textContent = '加载中...';
            }
            
            this._loadingEl.style.display = 'flex';
            this._isShowing = true;
            
            if (window.Logger) {
                window.Logger.log('LoadingManager: 显示加载提示 -', text);
            }
        },
        
        /**
         * 隐藏加载提示
         */
        hide: function() {
            if (this._loadingEl) {
                this._loadingEl.style.display = 'none';
                this._isShowing = false;
                
                // 重置进度条
                if (this._progressContainer) {
                    this._progressContainer.style.display = 'none';
                }
                if (this._progressEl) {
                    this._progressEl.style.width = '0%';
                }
                
                if (window.Logger) {
                    window.Logger.log('LoadingManager: 隐藏加载提示');
                }
            }
        },
        
        /**
         * 更新加载文本
         * @param {string} text - 新的提示文本
         */
        updateText: function(text) {
            if (this._textEl && text) {
                this._textEl.textContent = text;
                
                if (window.Logger) {
                    window.Logger.log('LoadingManager: 更新文本 -', text);
                }
            }
        },
        
        /**
         * 显示进度条
         * @param {number} percent - 进度百分比（0-100）
         * @param {string} text - 提示文本（可选）
         */
        showProgress: function(percent, text) {
            this._init();
            
            if (!this._isShowing) {
                this.show(text);
            }
            
            if (text) {
                this.updateText(text);
            }
            
            if (this._progressContainer) {
                this._progressContainer.style.display = 'block';
            }
            
            if (this._progressEl) {
                var validPercent = Math.max(0, Math.min(100, percent));
                this._progressEl.style.width = validPercent + '%';
                
                if (window.Logger) {
                    window.Logger.log('LoadingManager: 更新进度 -', validPercent + '%');
                }
            }
        },
        
        /**
         * 更新进度
         * @param {number} percent - 进度百分比（0-100）
         */
        updateProgress: function(percent) {
            if (this._progressEl && this._progressContainer.style.display !== 'none') {
                var validPercent = Math.max(0, Math.min(100, percent));
                this._progressEl.style.width = validPercent + '%';
            }
        },
        
        /**
         * 是否正在显示
         * @returns {boolean}
         */
        isShowing: function() {
            return this._isShowing;
        },
        
        /**
         * 执行带加载提示的异步操作
         * @param {Function} asyncFunc - 异步函数
         * @param {string} loadingText - 加载文本
         * @returns {Promise}
         */
        withLoading: function(asyncFunc, loadingText) {
            var self = this;
            self.show(loadingText);
            
            // 确保异步函数返回 Promise
            var promise = Promise.resolve(asyncFunc());
            
            return promise.then(function(result) {
                self.hide();
                return result;
            }).catch(function(error) {
                self.hide();
                throw error;
            });
        }
    };
    
    // 挂载到全局
    window.LoadingManager = LoadingManager;
    
})(window);

