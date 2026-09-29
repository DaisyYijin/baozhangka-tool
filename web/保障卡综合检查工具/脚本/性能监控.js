(function(window) {
    'use strict';
    
    var PerformanceMonitor = {
        marks: {},
        
        records: [],
        
        enabled: true,
        
        logToConsole: true,
        
        showInPage: false,
        
        start: function(name) {
            if (!this.enabled) return;
            
            this.marks[name] = {
                startTime: Date.now(),
                name: name
            };
        },
        
        end: function(name) {
            if (!this.enabled) return null;
            
            var endTime = Date.now();
            var mark = this.marks[name];
            
            if (!mark) {
                if (this.logToConsole) {
                    console.warn('[警告] 性能监控: 未找到起始标记 "' + name + '"');
                }
                return null;
            }
            
            var duration = endTime - mark.startTime;
            
            var record = {
                name: name,
                startTime: mark.startTime,
                endTime: endTime,
                duration: duration,
                timestamp: new Date().toLocaleString()
            };
            
            this.records.push(record);
            
            if (this.logToConsole) {
                this.logRecord(record);
            }
            
            if (this.showInPage) {
                this.displayRecord(record);
            }
            
            delete this.marks[name];
            
            return duration;
        },
        
        logRecord: function(record) {
            var icon = this.getPerformanceIcon(record.duration);
            var color = this.getPerformanceColor(record.duration);
            
            debugLog(
                '%c[性能] ' + icon + ' ' + record.name + ': ' + record.duration + 'ms',
                'color: ' + color + '; font-weight: bold;'
            );
        },
        
        getPerformanceIcon: function(duration) {
            if (duration < 100) return '[快速]';
            if (duration < 500) return '[正常]';
            if (duration < 1000) return '[较慢]';
            return '[慢速]';
        },
        
        getPerformanceColor: function(duration) {
            if (duration < 100) return '#28a745';
            if (duration < 500) return '#ffc107';
            if (duration < 1000) return '#ff9800';
            return '#dc3545';
        },
        
        displayRecord: function(record) {
            var container = document.getElementById('performanceMonitor');
            if (!container) {
                container = this.createMonitorContainer();
            }
            
            var item = document.createElement('div');
            item.className = 'perf-item';
            item.style.cssText = 'padding: 5px; margin: 2px 0; border-left: 3px solid ' + 
                                 this.getPerformanceColor(record.duration);
            
            item.innerHTML = '<span style="font-weight: bold;">' + record.name + '</span>: ' + 
                           '<span style="color: ' + this.getPerformanceColor(record.duration) + 
                           ';">' + record.duration + 'ms</span>';
            
            container.appendChild(item);
            
            if (container.children.length > 10) {
                container.removeChild(container.firstChild);
            }
        },
        
        createMonitorContainer: function() {
            var container = document.createElement('div');
            container.id = 'performanceMonitor';
            container.style.cssText = 
                'position: fixed; bottom: 10px; right: 10px; ' +
                'background: rgba(0,0,0,0.8); color: white; ' +
                'padding: 10px; border-radius: 5px; ' +
                'font-size: 12px; max-width: 300px; ' +
                'z-index: 9999;';
            
            var title = document.createElement('div');
            title.innerHTML = '<i class="fa fa-tachometer"></i> <strong>性能监控</strong>';
            title.style.cssText = 'margin-bottom: 5px; border-bottom: 1px solid #fff; padding-bottom: 5px;';
            container.appendChild(title);
            
            document.body.appendChild(container);
            return container;
        },
        
        getRecords: function() {
            return this.records;
        },
        
        getStats: function() {
            if (this.records.length === 0) {
                return {
                    count: 0,
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                };
            }
            
            var durations = [];
            var total = 0;
            
            for (var i = 0; i < this.records.length; i++) {
                var duration = this.records[i].duration;
                durations.push(duration);
                total += duration;
            }
            
            durations.sort(function(a, b) { return a - b; });
            
            return {
                count: this.records.length,
                total: total,
                average: Math.round(total / this.records.length),
                min: durations[0],
                max: durations[durations.length - 1],
                median: durations[Math.floor(durations.length / 2)]
            };
        },
        
        printReport: function() {
            var stats = this.getStats();
            
            console.group('[报告] 性能监控报告');
            debugLog('总计测量次数:', stats.count);
            debugLog('总耗时:', stats.total + 'ms');
            debugLog('平均耗时:', stats.average + 'ms');
            debugLog('最快:', stats.min + 'ms');
            debugLog('最慢:', stats.max + 'ms');
            debugLog('中位数:', stats.median + 'ms');
            
            debugLog('\n详细记录:');
            console.table(this.records);
            console.groupEnd();
        },
        
        clear: function() {
            this.records = [];
            this.marks = {};
            
            var container = document.getElementById('performanceMonitor');
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
            
            if (this.logToConsole) {
                debugLog('[清除] 性能监控记录已清除');
            }
        },
        
        enable: function() {
            this.enabled = true;
            if (this.logToConsole) {
                debugLog('[启用] 性能监控已启用');
            }
        },
        
        disable: function() {
            this.enabled = false;
            if (this.logToConsole) {
                debugLog('[禁用] 性能监控已禁用');
            }
        },
        
        measure: function(name, fn) {
            this.start(name);
            var result = fn();
            this.end(name);
            return result;
        }
    };
    
    window.PerformanceMonitor = PerformanceMonitor;
    window.PM = PerformanceMonitor;
    
    if (PerformanceMonitor.logToConsole) {
        debugLog('%c[性能监控] 性能监控工具已加载', 'color: #667eea; font-weight: bold; font-size: 14px;');
        debugLog('%c使用方法:', 'color: #999; font-weight: bold;');
        debugLog('%c  PM.start("名称")  - 开始计时', 'color: #666;');
        debugLog('%c  PM.end("名称")    - 结束计时', 'color: #666;');
        debugLog('%c  PM.printReport() - 查看报告', 'color: #666;');
        debugLog('%c  PM.clear()       - 清除记录', 'color: #666;');
    }
    
})(window);
