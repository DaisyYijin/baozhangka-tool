/**
 * 浏览器兼容性补丁
 * 适用于老版本浏览器（如 Firefox 45.0.2）
 * 
 * 本文件提供了必要的 polyfill，使老版本浏览器支持现代 JavaScript 特性
 */

(function() {
    'use strict';
    
    // 为 NodeList 添加 forEach 方法（IE、老版本 Firefox/Safari 不支持）
    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = function(callback, thisArg) {
            thisArg = thisArg || window;
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
        console.info('[兼容性补丁] 已为 NodeList 添加 forEach 方法');
    }
    
    // 为 HTMLCollection 添加 forEach 方法
    if (window.HTMLCollection && !HTMLCollection.prototype.forEach) {
        HTMLCollection.prototype.forEach = function(callback, thisArg) {
            thisArg = thisArg || window;
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
        console.info('[兼容性补丁] 已为 HTMLCollection 添加 forEach 方法');
    }
    
    // Array.from polyfill
    if (!Array.from) {
        Array.from = (function() {
            var toStr = Object.prototype.toString;
            var isCallable = function(fn) {
                return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
            };
            var toInteger = function(value) {
                var number = Number(value);
                if (isNaN(number)) { return 0; }
                if (number === 0 || !isFinite(number)) { return number; }
                return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
            };
            var maxSafeInteger = Math.pow(2, 53) - 1;
            var toLength = function(value) {
                var len = toInteger(value);
                return Math.min(Math.max(len, 0), maxSafeInteger);
            };

            return function from(arrayLike/*, mapFn, thisArg */) {
                var C = this;
                var items = Object(arrayLike);
                if (arrayLike == null) {
                    throw new TypeError('Array.from requires an array-like object - not null or undefined');
                }
                var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
                var T;
                if (typeof mapFn !== 'undefined') {
                    if (!isCallable(mapFn)) {
                        throw new TypeError('Array.from: when provided, the second argument must be a function');
                    }
                    if (arguments.length > 2) {
                        T = arguments[2];
                    }
                }
                var len = toLength(items.length);
                var A = isCallable(C) ? Object(new C(len)) : new Array(len);
                var k = 0;
                var kValue;
                while (k < len) {
                    kValue = items[k];
                    if (mapFn) {
                        A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                    } else {
                        A[k] = kValue;
                    }
                    k += 1;
                }
                A.length = len;
                return A;
            };
        }());
        console.info('[兼容性补丁] 已添加 Array.from 方法');
    }
    
    // Array.prototype.find polyfill
    if (!Array.prototype.find) {
        Array.prototype.find = function(predicate) {
            if (this == null) {
                throw new TypeError('Array.prototype.find called on null or undefined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var list = Object(this);
            var length = list.length >>> 0;
            var thisArg = arguments[1];
            var value;

            for (var i = 0; i < length; i++) {
                value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return value;
                }
            }
            return undefined;
        };
        console.info('[兼容性补丁] 已添加 Array.prototype.find 方法');
    }
    
    // Array.prototype.findIndex polyfill
    if (!Array.prototype.findIndex) {
        Array.prototype.findIndex = function(predicate) {
            if (this == null) {
                throw new TypeError('Array.prototype.findIndex called on null or undefined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var list = Object(this);
            var length = list.length >>> 0;
            var thisArg = arguments[1];
            var value;

            for (var i = 0; i < length; i++) {
                value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return i;
                }
            }
            return -1;
        };
        console.info('[兼容性补丁] 已添加 Array.prototype.findIndex 方法');
    }
    
    // Object.assign polyfill
    if (typeof Object.assign !== 'function') {
        Object.assign = function(target) {
            'use strict';
            if (target == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }

            target = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var source = arguments[index];
                if (source != null) {
                    for (var key in source) {
                        if (Object.prototype.hasOwnProperty.call(source, key)) {
                            target[key] = source[key];
                        }
                    }
                }
            }
            return target;
        };
        console.info('[兼容性补丁] 已添加 Object.assign 方法');
    }
    
    // String.prototype.includes polyfill
    if (!String.prototype.includes) {
        String.prototype.includes = function(search, start) {
            'use strict';
            if (search instanceof RegExp) {
                throw TypeError('first argument must not be a RegExp');
            }
            if (start === undefined) { start = 0; }
            return this.indexOf(search, start) !== -1;
        };
        console.info('[兼容性补丁] 已添加 String.prototype.includes 方法');
    }
    
    // String.prototype.startsWith polyfill
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function(search, pos) {
            pos = !pos || pos < 0 ? 0 : +pos;
            return this.substring(pos, pos + search.length) === search;
        };
        console.info('[兼容性补丁] 已添加 String.prototype.startsWith 方法');
    }
    
    // String.prototype.endsWith polyfill
    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function(search, this_len) {
            if (this_len === undefined || this_len > this.length) {
                this_len = this.length;
            }
            return this.substring(this_len - search.length, this_len) === search;
        };
        console.info('[兼容性补丁] 已添加 String.prototype.endsWith 方法');
    }
    
    // String.prototype.repeat polyfill
    if (!String.prototype.repeat) {
        String.prototype.repeat = function(count) {
            'use strict';
            if (this == null) {
                throw new TypeError('can\'t convert ' + this + ' to object');
            }
            var str = '' + this;
            count = +count;
            if (count != count) {
                count = 0;
            }
            if (count < 0) {
                throw new RangeError('repeat count must be non-negative');
            }
            if (count == Infinity) {
                throw new RangeError('repeat count must be less than infinity');
            }
            count = Math.floor(count);
            if (str.length == 0 || count == 0) {
                return '';
            }
            if (str.length * count >= 1 << 28) {
                throw new RangeError('repeat count must not overflow maximum string size');
            }
            var maxCount = str.length * count;
            count = Math.floor(Math.log(count) / Math.log(2));
            while (count) {
                str += str;
                count--;
            }
            str += str.substring(0, maxCount - str.length);
            return str;
        };
        console.info('[兼容性补丁] 已添加 String.prototype.repeat 方法');
    }
    
    // Promise polyfill (简化版)
    if (typeof Promise === 'undefined') {
        window.Promise = function(executor) {
            var self = this;
            this.status = 'pending';
            this.value = null;
            this.reason = null;
            this.onFulfilledCallbacks = [];
            this.onRejectedCallbacks = [];
            
            function resolve(value) {
                if (self.status === 'pending') {
                    self.status = 'fulfilled';
                    self.value = value;
                    self.onFulfilledCallbacks.forEach(function(fn) { fn(); });
                }
            }
            
            function reject(reason) {
                if (self.status === 'pending') {
                    self.status = 'rejected';
                    self.reason = reason;
                    self.onRejectedCallbacks.forEach(function(fn) { fn(); });
                }
            }
            
            try {
                executor(resolve, reject);
            } catch (e) {
                reject(e);
            }
        };
        
        Promise.prototype.then = function(onFulfilled, onRejected) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if (self.status === 'fulfilled') {
                    try {
                        var result = onFulfilled ? onFulfilled(self.value) : self.value;
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                } else if (self.status === 'rejected') {
                    try {
                        // 按Promise/A+规范：onRejected处理器的返回值应resolve新promise，
                        // 否则 .catch(恢复逻辑).then(...) 链会继续走失败分支
                        if (onRejected) {
                            resolve(onRejected(self.reason));
                        } else {
                            reject(self.reason);
                        }
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    self.onFulfilledCallbacks.push(function() {
                        try {
                            var result = onFulfilled ? onFulfilled(self.value) : self.value;
                            resolve(result);
                        } catch (e) {
                            reject(e);
                        }
                    });
                    self.onRejectedCallbacks.push(function() {
                        try {
                            if (onRejected) {
                                resolve(onRejected(self.reason));
                            } else {
                                reject(self.reason);
                            }
                        } catch (e) {
                            reject(e);
                        }
                    });
                }
            });
        };
        
        Promise.prototype.catch = function(onRejected) {
            return this.then(null, onRejected);
        };
        
        // 静态方法（缺失会导致依赖 Promise.resolve/Promise.all 的代码在旧浏览器报错）
        Promise.resolve = function(value) {
            return new Promise(function(resolve) { resolve(value); });
        };
        
        Promise.reject = function(reason) {
            return new Promise(function(resolve, reject) { reject(reason); });
        };
        
        Promise.all = function(iterable) {
            return new Promise(function(resolve, reject) {
                var items = [];
                for (var i = 0; i < iterable.length; i++) {
                    items.push(iterable[i]);
                }
                if (items.length === 0) {
                    resolve([]);
                    return;
                }
                var results = new Array(items.length);
                var remaining = items.length;
                items.forEach(function(item, idx) {
                    var settle = function(v) {
                        results[idx] = v;
                        remaining--;
                        if (remaining === 0) resolve(results);
                    };
                    if (item && typeof item.then === 'function') {
                        item.then(settle, reject);
                    } else {
                        settle(item);
                    }
                });
            });
        };
        
        console.info('[兼容性补丁] 已添加 Promise (简化版)');
    }
    
    // Array.prototype.includes 垫片（Firefox 48+ 才原生支持；
    // 通知单处理等模块用到了数组includes，缺失时在旧浏览器直接抛TypeError）
    if (!Array.prototype.includes) {
        Array.prototype.includes = function(searchElement, fromIndex) {
            var len = this.length;
            if (len === 0) return false;
            var k = fromIndex ? Number(fromIndex) : 0;
            if (k < 0) k = Math.max(0, len + k);
            while (k < len) {
                var current = this[k];
                if (current === searchElement ||
                    (typeof current === 'number' && typeof searchElement === 'number' && isNaN(current) && isNaN(searchElement))) {
                    return true;
                }
                k++;
            }
            return false;
        };
        console.info('[兼容性补丁] 已添加 Array.prototype.includes');
    }
    
    // String.prototype.padStart/padEnd 垫片（原置于数据生成工具.js尾部，依赖script加载顺序才生效，统一移至兼容模块）
    if (!String.prototype.padStart) {
        String.prototype.padStart = function(targetLength, padString) {
            targetLength = targetLength >> 0;
            var str = String(this);
            if (str.length >= targetLength) return str;
            padString = padString !== undefined ? String(padString) : ' ';
            var padLen = targetLength - str.length;
            var padding = '';
            while (padding.length < padLen) {
                padding += padString;
            }
            return padding.substring(0, padLen) + str;
        };
        console.info('[兼容性补丁] 已添加 String.prototype.padStart');
    }
    
    if (!String.prototype.padEnd) {
        String.prototype.padEnd = function(targetLength, padString) {
            targetLength = targetLength >> 0;
            var str = String(this);
            if (str.length >= targetLength) return str;
            padString = padString !== undefined ? String(padString) : ' ';
            var padLen = targetLength - str.length;
            var padding = '';
            while (padding.length < padLen) {
                padding += padString;
            }
            return str + padding.substring(0, padLen);
        };
        console.info('[兼容性补丁] 已添加 String.prototype.padEnd');
    }
    
    console.info('[浏览器兼容补丁] 所有补丁加载完成');
})();

