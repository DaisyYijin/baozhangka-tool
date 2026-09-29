/**
 * Excel 文件处理模块
 * 统一管理 Excel 文件的读取、解析和导出
 * 避免重复代码，提供一致的错误处理
 */
(function(window) {
    'use strict';
    
    var ExcelHandler = {
        /**
         * 读取 Excel 文件
         * @param {File} file - 文件对象
         * @param {Function} onSuccess - 成功回调 function(workbook)
         * @param {Function} onError - 失败回调 function(error)
         */
        readFile: function(file, onSuccess, onError) {
            if (!file) {
                var error = new Error('文件对象为空');
                if (onError) {
                    onError(error);
                } else if (window.NotificationManager) {
                    window.NotificationManager.error(error.message);
                } else {
                    alert(error.message);
                }
                return;
            }
            
            var reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    var data = new Uint8Array(e.target.result);
                    var workbook = XLSX.read(data, {type: 'array'});
                    
                    if (window.Logger) {
                        window.Logger.info('Excel文件读取成功:', file.name);
                        window.Logger.log('工作表数量:', workbook.SheetNames.length);
                    }
                    
                    if (onSuccess) {
                        onSuccess(workbook);
                    }
                } catch (error) {
                    if (window.Logger) {
                        window.Logger.error('Excel文件解析失败:', error);
                    }
                    
                    if (onError) {
                        onError(error);
                    } else if (window.NotificationManager) {
                        window.NotificationManager.error('文件解析失败: ' + error.message);
                    } else {
                        alert('文件解析失败: ' + error.message);
                    }
                }
            };
            
            reader.onerror = function() {
                var error = new Error('文件读取失败');
                
                if (window.Logger) {
                    window.Logger.error('文件读取失败:', file.name);
                }
                
                if (onError) {
                    onError(error);
                } else if (window.NotificationManager) {
                    window.NotificationManager.error(error.message);
                } else {
                    alert(error.message);
                }
            };
            
            reader.readAsArrayBuffer(file);
        },
        
        /**
         * 获取第一个工作表的 JSON 数据
         * @param {Workbook} workbook - 工作簿对象
         * @param {Object} options - 选项 {header: 1, defval: ''}
         * @returns {Array} JSON 数据数组
         */
        getFirstSheetData: function(workbook, options) {
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('工作簿为空或没有工作表');
            }
            
            var sheetName = workbook.SheetNames[0];
            var sheet = workbook.Sheets[sheetName];
            
            var opts = options || {};
            var data = XLSX.utils.sheet_to_json(sheet, opts);
            
            if (window.Logger) {
                window.Logger.info('读取工作表:', sheetName, '行数:', data.length);
            }
            
            return data;
        },
        
        /**
         * 获取指定工作表的 JSON 数据
         * @param {Workbook} workbook - 工作簿对象
         * @param {string|number} sheetNameOrIndex - 工作表名称或索引
         * @param {Object} options - 选项
         * @returns {Array} JSON 数据数组
         */
        getSheetData: function(workbook, sheetNameOrIndex, options) {
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('工作簿为空或没有工作表');
            }
            
            var sheetName;
            if (typeof sheetNameOrIndex === 'number') {
                if (sheetNameOrIndex < 0 || sheetNameOrIndex >= workbook.SheetNames.length) {
                    throw new Error('工作表索引超出范围: ' + sheetNameOrIndex);
                }
                sheetName = workbook.SheetNames[sheetNameOrIndex];
            } else {
                sheetName = sheetNameOrIndex;
                if (workbook.SheetNames.indexOf(sheetName) === -1) {
                    throw new Error('工作表不存在: ' + sheetName);
                }
            }
            
            var sheet = workbook.Sheets[sheetName];
            var opts = options || {};
            var data = XLSX.utils.sheet_to_json(sheet, opts);
            
            if (window.Logger) {
                window.Logger.info('读取工作表:', sheetName, '行数:', data.length);
            }
            
            return data;
        },
        
        /**
         * 获取所有工作表的数据
         * @param {Workbook} workbook - 工作簿对象
         * @param {Object} options - 选项
         * @returns {Object} {sheetName: data[]} 工作表数据对象
         */
        getAllSheetsData: function(workbook, options) {
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('工作簿为空或没有工作表');
            }
            
            var allData = {};
            var opts = options || {};
            
            for (var i = 0; i < workbook.SheetNames.length; i++) {
                var sheetName = workbook.SheetNames[i];
                var sheet = workbook.Sheets[sheetName];
                allData[sheetName] = XLSX.utils.sheet_to_json(sheet, opts);
            }
            
            if (window.Logger) {
                window.Logger.info('读取所有工作表, 共', workbook.SheetNames.length, '个');
            }
            
            return allData;
        },
        
        /**
         * 导出数据为 Excel 文件
         * @param {Array} data - 数据数组
         * @param {string} filename - 文件名
         * @param {string} sheetName - 工作表名称（可选，默认 'Sheet1'）
         */
        exportToExcel: function(data, filename, sheetName) {
            try {
                if (!data || !Array.isArray(data)) {
                    throw new Error('数据格式错误');
                }
                
                if (!filename) {
                    throw new Error('文件名不能为空');
                }
                
                var wb = XLSX.utils.book_new();
                var ws = XLSX.utils.json_to_sheet(data);
                
                XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
                
                // 添加 .xlsx 扩展名（如果没有）
                if (!filename.match(/\.xlsx?$/i)) {
                    filename += '.xlsx';
                }
                
                XLSX.writeFile(wb, filename);
                
                if (window.Logger) {
                    window.Logger.info('导出Excel成功:', filename, '行数:', data.length);
                }
                
                if (window.NotificationManager) {
                    window.NotificationManager.success('导出成功: ' + filename);
                }
                
                return true;
            } catch (error) {
                if (window.Logger) {
                    window.Logger.error('导出Excel失败:', error);
                }
                
                if (window.NotificationManager) {
                    window.NotificationManager.error('导出失败: ' + error.message);
                } else {
                    alert('导出失败: ' + error.message);
                }
                
                return false;
            }
        },
        
        /**
         * 导出多个工作表到一个 Excel 文件
         * @param {Object} sheetsData - {sheetName: data[]} 工作表数据对象
         * @param {string} filename - 文件名
         */
        exportMultipleSheets: function(sheetsData, filename) {
            try {
                if (!sheetsData || typeof sheetsData !== 'object') {
                    throw new Error('数据格式错误');
                }
                
                if (!filename) {
                    throw new Error('文件名不能为空');
                }
                
                var wb = XLSX.utils.book_new();
                var sheetCount = 0;
                
                for (var sheetName in sheetsData) {
                    if (sheetsData.hasOwnProperty(sheetName)) {
                        var data = sheetsData[sheetName];
                        if (Array.isArray(data)) {
                            var ws = XLSX.utils.json_to_sheet(data);
                            XLSX.utils.book_append_sheet(wb, ws, sheetName);
                            sheetCount++;
                        }
                    }
                }
                
                if (sheetCount === 0) {
                    throw new Error('没有有效的工作表数据');
                }
                
                // 添加 .xlsx 扩展名（如果没有）
                if (!filename.match(/\.xlsx?$/i)) {
                    filename += '.xlsx';
                }
                
                XLSX.writeFile(wb, filename);
                
                if (window.Logger) {
                    window.Logger.info('导出多工作表Excel成功:', filename, '工作表数:', sheetCount);
                }
                
                if (window.NotificationManager) {
                    window.NotificationManager.success('导出成功: ' + filename + ' (包含' + sheetCount + '个工作表)');
                }
                
                return true;
            } catch (error) {
                if (window.Logger) {
                    window.Logger.error('导出多工作表Excel失败:', error);
                }
                
                if (window.NotificationManager) {
                    window.NotificationManager.error('导出失败: ' + error.message);
                } else {
                    alert('导出失败: ' + error.message);
                }
                
                return false;
            }
        },
        
        /**
         * 验证 Excel 文件格式
         * @param {File} file - 文件对象
         * @returns {boolean} 是否为有效的 Excel 文件
         */
        isValidExcelFile: function(file) {
            if (!file) return false;
            
            var validExtensions = ['.xls', '.xlsx', '.xlsm', '.xlsb'];
            var fileName = file.name.toLowerCase();
            
            for (var i = 0; i < validExtensions.length; i++) {
                if (fileName.endsWith(validExtensions[i])) {
                    return true;
                }
            }
            
            return false;
        },
        
        /**
         * 获取文件大小（格式化）
         * @param {File} file - 文件对象
         * @returns {string} 格式化的文件大小
         */
        getFileSize: function(file) {
            if (!file || !file.size) return '0 B';
            
            var size = file.size;
            var units = ['B', 'KB', 'MB', 'GB'];
            var unitIndex = 0;
            
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            
            return size.toFixed(2) + ' ' + units[unitIndex];
        }
    };
    
    // 挂载到全局
    window.ExcelHandler = ExcelHandler;
    
})(window);

