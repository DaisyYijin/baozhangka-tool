// 数据整合工具（核心算法模块）
// 负责根据关键字段对两份数据进行合并，供数据联审工具调用

(function(global) {
    var DEFAULT_KEY_FIELD = '公民身份号码';

    function normalizeMergeKey(value) {
        // 主键归一化：去空格、末位x统一大写、全角转半角（normalizeIdCard定义见字段标准化.js）
        if (typeof normalizeIdCard === 'function') {
            return normalizeIdCard(value);
        }
        return String(value || '').trim();
    }

    /**
     * 按主键字段合并记录（去重，后出现的覆盖前面）
     * @param {Array<Object>} records
     * @param {string} keyField
     * @returns {Array<Object>}
     */
    function mergeRecordsByKey(records, keyField) {
        keyField = keyField || DEFAULT_KEY_FIELD;
        if (!records || !records.length) {
            return [];
        }
        var index = {};
        var order = [];
        for (var i = 0; i < records.length; i++) {
            var record = records[i] || {};
            var key = normalizeMergeKey(record[keyField]);
            if (!key) continue;
            if (!index.hasOwnProperty(key)) {
                order.push(key);
            }
            index[key] = record;
        }
        var result = [];
        for (var j = 0; j < order.length; j++) {
            result.push(index[order[j]]);
        }
        return result;
    }

    /**
     * 执行数据整合
     * @param {string} keyField 关键字段（如公民身份号码）
     * @param {Array<Object>} originalSource 原始数据
     * @param {Array<Object>} updatedSource  修改后数据
     * @returns {{keyField:string,mergedData:Array,displayFields:Array,statusField:string,counts:Object,originalTotal:number,updatedTotal:number}}
     */
    function performDataMerge(keyField, originalSource, updatedSource) {
        keyField = keyField || DEFAULT_KEY_FIELD;
        originalSource = originalSource || [];
        updatedSource = updatedSource || [];

        var statusField = '__整合状态';
        var originalIndex = {};
        var updatedIndex = {};
        var fieldSet = {};

        function collectFields(row) {
            if (!row) return;
            for (var field in row) {
                if (row.hasOwnProperty(field)) {
                    fieldSet[field] = true;
                }
            }
        }

        for (var i = 0; i < originalSource.length; i++) {
            var key = normalizeMergeKey(originalSource[i][keyField]);
            if (!key) continue;
            originalIndex[key] = originalSource[i];
            collectFields(originalSource[i]);
        }

        for (var j = 0; j < updatedSource.length; j++) {
            var updatedKey = normalizeMergeKey(updatedSource[j][keyField]);
            if (!updatedKey) continue;
            updatedIndex[updatedKey] = updatedSource[j];
            collectFields(updatedSource[j]);
        }

        // 预检：数据非空但索引为空说明主键列缺失，此时整合结果毫无意义
        if (originalSource.length > 0 && Object.keys(originalIndex).length === 0) {
            throw new Error('原始文件中未找到有效的"' + keyField + '"列，请检查表头命名或该列是否全部为空');
        }
        if (updatedSource.length > 0 && Object.keys(updatedIndex).length === 0) {
            throw new Error('修改后文件中未找到有效的"' + keyField + '"列，请检查表头命名或该列是否全部为空');
        }

        var fieldList = Object.keys(fieldSet);
        if (fieldList.indexOf(keyField) === -1) {
            fieldList.unshift(keyField);
        }

        var mergedData = [];
        var statusCounts = {
            merged: 0,
            onlyOriginal: 0,
            onlyUpdated: 0
        };

        function isEmptyValue(value) {
            if (value === null || value === undefined) return true;
            if (typeof value === 'string' && value.trim() === '') return true;
            return false;
        }

        for (var key in updatedIndex) {
            if (!updatedIndex.hasOwnProperty(key)) continue;
            var updatedRow = updatedIndex[key];
            var originalRow = originalIndex[key] || null;
            var mergedRow = {};

            for (var f = 0; f < fieldList.length; f++) {
                var field = fieldList[f];
                var updatedValue = updatedRow[field];
                var originalValue = originalRow ? originalRow[field] : '';
                if (!isEmptyValue(updatedValue)) {
                    mergedRow[field] = updatedValue;
                } else if (!isEmptyValue(originalValue)) {
                    mergedRow[field] = originalValue;
                } else {
                    mergedRow[field] = '';
                }
            }

            mergedRow[statusField] = originalRow ? '已整合（以修改后为准）' : '仅修改后文件存在';
            mergedData.push(mergedRow);
            statusCounts[originalRow ? 'merged' : 'onlyUpdated']++;

            delete originalIndex[key];
        }

        for (var remainingKey in originalIndex) {
            if (!originalIndex.hasOwnProperty(remainingKey)) continue;
            var leftoverRow = originalIndex[remainingKey];
            var leftoverMergedRow = {};
            for (var k = 0; k < fieldList.length; k++) {
                var fieldName = fieldList[k];
                leftoverMergedRow[fieldName] = leftoverRow[fieldName] || '';
            }
            leftoverMergedRow[statusField] = '仅原始文件存在';
            mergedData.push(leftoverMergedRow);
            statusCounts.onlyOriginal++;
        }

        var displayFields = fieldList.slice();
        displayFields.push(statusField);

        return {
            keyField: keyField,
            mergedData: mergedData,
            displayFields: displayFields,
            statusField: statusField,
            counts: statusCounts,
            originalTotal: originalSource.length,
            updatedTotal: updatedSource.length
        };
    }

    // 暴露给全局使用
    global.DataMerge = {
        normalizeMergeKey: normalizeMergeKey,
        mergeRecordsByKey: mergeRecordsByKey,
        performDataMerge: performDataMerge
    };

})(window);
