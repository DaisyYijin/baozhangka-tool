/**
 * 通知管理器
 * 提供统一的消息提示界面，替代 alert()
 * 支持多种类型的通知（信息、成功、警告、错误）
 */
(function(window) {
    'use strict';
    
    var NotificationManager = {
        _container: null,
        _notifications: [],
        _maxNotifications: 5,
        _autoCloseDelay: 5000,
        
        /**
         * 初始化通知容器
         */
        _init: function() {
            if (this._container) return;
            
            // 创建通知容器
            var container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            `;
            
            // 添加动画样式
            if (!document.getElementById('notification-style')) {
                var style = document.createElement('style');
                style.id = 'notification-style';
                style.textContent = `
                    @keyframes slideIn {
                        from {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                    }
                    
                    .notification-item {
                        pointer-events: auto;
                        margin-bottom: 10px;
                        animation: slideIn 0.3s ease-out;
                    }
                    
                    .notification-item.closing {
                        animation: slideOut 0.3s ease-out;
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(container);
            this._container = container;
        },
        
        /**
         * 显示通知
         * @param {string} message - 消息内容
         * @param {string} type - 类型：info/success/warning/error
         * @param {number} duration - 显示时长（毫秒），0表示不自动关闭
         */
        show: function(message, type, duration) {
            this._init();
            
            if (!message) return;
            
            type = type || 'info';
            duration = duration !== undefined ? duration : this._autoCloseDelay;
            
            // 如果通知数量超过最大值，移除最旧的
            if (this._notifications.length >= this._maxNotifications) {
                this._removeNotification(this._notifications[0]);
            }
            
            // 通知配置
            var config = {
                info: {
                    color: '#3498db',
                    icon: 'fa-info-circle',
                    bgColor: '#e8f4f8'
                },
                success: {
                    color: '#2ecc71',
                    icon: 'fa-check-circle',
                    bgColor: '#e8f8f0'
                },
                warning: {
                    color: '#f39c12',
                    icon: 'fa-exclamation-triangle',
                    bgColor: '#fef5e7'
                },
                error: {
                    color: '#e74c3c',
                    icon: 'fa-times-circle',
                    bgColor: '#fde8e8'
                }
            };
            
            var typeConfig = config[type] || config.info;
            
            // 创建通知元素
            var notification = document.createElement('div');
            notification.className = 'notification-item';
            notification.style.cssText = `
                background: white;
                border-left: 4px solid ${typeConfig.color};
                padding: 15px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                position: relative;
            `;
            
            notification.innerHTML = `
                <div style="display: flex; align-items: center; flex: 1;">
                    <i class="fa ${typeConfig.icon}" style="color: ${typeConfig.color}; font-size: 20px; margin-right: 12px;"></i>
                    <span style="flex: 1; font-size: 14px; color: #333; line-height: 1.5;">${this._escapeHtml(message)}</span>
                </div>
                <button onclick="this.parentElement.closeNotification()" 
                        style="border: none; background: none; cursor: pointer; font-size: 20px; color: #999; margin-left: 10px; padding: 0; width: 24px; height: 24px; line-height: 24px;">×</button>
            `;
            
            // 添加关闭方法
            var self = this;
            notification.closeNotification = function() {
                self._removeNotification(notification);
            };
            
            this._container.appendChild(notification);
            this._notifications.push(notification);
            
            // 自动关闭
            if (duration > 0) {
                setTimeout(function() {
                    self._removeNotification(notification);
                }, duration);
            }
            
            if (window.Logger) {
                window.Logger.log('NotificationManager: 显示通知 [' + type + '] -', message);
            }
        },
        
        /**
         * 移除通知
         * @param {Element} notification - 通知元素
         */
        _removeNotification: function(notification) {
            if (!notification || !notification.parentElement) return;
            
            notification.classList.add('closing');
            
            var index = this._notifications.indexOf(notification);
            if (index > -1) {
                this._notifications.splice(index, 1);
            }
            
            setTimeout(function() {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        },
        
        /**
         * HTML转义
         * @param {string} text - 文本
         * @returns {string} 转义后的文本
         */
        _escapeHtml: function(text) {
            if (window.DataCheckUtils && window.DataCheckUtils.escapeHtml) {
                return window.DataCheckUtils.escapeHtml(text);
            }
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
        },
        
        /**
         * 显示信息通知
         * @param {string} message - 消息内容
         * @param {number} duration - 显示时长
         */
        info: function(message, duration) {
            this.show(message, 'info', duration);
        },
        
        /**
         * 显示成功通知
         * @param {string} message - 消息内容
         * @param {number} duration - 显示时长
         */
        success: function(message, duration) {
            this.show(message, 'success', duration);
        },
        
        /**
         * 显示警告通知
         * @param {string} message - 消息内容
         * @param {number} duration - 显示时长
         */
        warning: function(message, duration) {
            this.show(message, 'warning', duration);
        },
        
        /**
         * 显示错误通知
         * @param {string} message - 消息内容
         * @param {number} duration - 显示时长（错误默认10秒）
         */
        error: function(message, duration) {
            this.show(message, 'error', duration || 10000);
        },
        
        /**
         * 清除所有通知
         */
        clearAll: function() {
            var self = this;
            var notifications = this._notifications.slice();
            notifications.forEach(function(notification) {
                self._removeNotification(notification);
            });
        },
        
        /**
         * 设置最大通知数量
         * @param {number} max - 最大数量
         */
        setMaxNotifications: function(max) {
            if (typeof max === 'number' && max > 0) {
                this._maxNotifications = max;
            }
        },
        
        /**
         * 设置自动关闭延迟
         * @param {number} delay - 延迟时间（毫秒）
         */
        setAutoCloseDelay: function(delay) {
            if (typeof delay === 'number' && delay >= 0) {
                this._autoCloseDelay = delay;
            }
        }
    };
    
    // 挂载到全局
    window.NotificationManager = NotificationManager;
    
})(window);

