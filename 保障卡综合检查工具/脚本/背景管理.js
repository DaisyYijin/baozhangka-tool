/**
 * 背景管理脚本
 * 
 * 功能：
 * 1. 随机切换背景图片
 * 2. 自动定时更换背景
 * 3. 提供手动刷新按钮
 */

(function() {
    'use strict';
    
    // 背景图片列表
    var backgroundImages = [
        '背景/bj_01.jpg',
        '背景/bj_02.jpg',
        '背景/bj_03.jpg'
    ];
    
    // 当前背景索引
    var currentIndex = 0;
    
    // 自动切换定时器
    var autoSwitchTimer = null;
    
    // 自动切换间隔时间（毫秒）
    var AUTO_SWITCH_INTERVAL = 30000; // 30秒
    
    /**
     * 获取随机背景图片索引（不与当前重复）
     */
    function getRandomIndex() {
        var newIndex;
        do {
            newIndex = Math.floor(Math.random() * backgroundImages.length);
        } while (newIndex === currentIndex && backgroundImages.length > 1);
        return newIndex;
    }
    
    /**
     * 切换背景图片
     * @param {number} index - 指定索引，不传则随机选择
     */
    function switchBackground(index) {
        if (typeof index === 'undefined') {
            index = getRandomIndex();
        }
        
        currentIndex = index;
        var imageUrl = backgroundImages[index];
        
        // 更新背景（带过渡效果）
        document.body.style.transition = 'background 1s ease-in-out';
        document.body.style.background = 
            'linear-gradient(rgba(245, 247, 250, 0.85), rgba(245, 247, 250, 0.85)), ' +
            'url("' + imageUrl + '") center center / cover no-repeat fixed';
        
        debugLog('背景已切换到:', imageUrl);
    }
    
    /**
     * 启动自动切换
     */
    function startAutoSwitch() {
        // 清除已有定时器
        if (autoSwitchTimer) {
            clearInterval(autoSwitchTimer);
        }
        
        // 设置新定时器
        autoSwitchTimer = setInterval(function() {
            switchBackground();
        }, AUTO_SWITCH_INTERVAL);
        
        debugLog('背景自动切换已启动，间隔:', AUTO_SWITCH_INTERVAL / 1000, '秒');
    }
    
    /**
     * 停止自动切换
     */
    function stopAutoSwitch() {
        if (autoSwitchTimer) {
            clearInterval(autoSwitchTimer);
            autoSwitchTimer = null;
            debugLog('背景自动切换已停止');
        }
    }
    
    /**
     * 初始化
     */
    function init() {
        // 随机选择初始背景
        var initialIndex = Math.floor(Math.random() * backgroundImages.length);
        switchBackground(initialIndex);
        
        // 启动自动切换
        startAutoSwitch();
        
        debugLog('背景管理器已初始化');
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // 导出到全局（供外部调用）
    window.BackgroundManager = {
        switch: switchBackground,
        startAutoSwitch: startAutoSwitch,
        stopAutoSwitch: stopAutoSwitch,
        setInterval: function(milliseconds) {
            AUTO_SWITCH_INTERVAL = milliseconds;
            if (autoSwitchTimer) {
                stopAutoSwitch();
                startAutoSwitch();
            }
        }
    };
})();

