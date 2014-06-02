/**
 * @file browser-reload客户端实现
 * @author sparklewhy@gmail.com
 */

(function (window, document, io, reloader) {

    /**
     * 判断是否是IE浏览器
     *
     * @type {boolean}
     */
    var isIE = !!document.createStyleSheet;

    var navigator = window.navigator;
    var CSSRule = window.CSSRule;

    /**
     * 用于提取样式值包括import包含的 url(xxx) 里包含的链接地址
     * @type {RegExp}
     * @const
     */
    var URL_STYLE_REGEXP = /url\s*\(\s*['"]?\s*([^\s'"]*)\s*['"]?\s*\)/g;

    /**
     * reloader util模块
     *
     * @type {Object}
     */
    reloader.util = {

        /**
         * 去除字符串前后空白字符
         *
         * @param {string} str 要处理的字符串
         */
        trim: function (str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        },

        /**
         * 判断给定的的值是否是数组
         *
         * @param {*} value 要判断的值
         * @return {boolean}
         */
        isArray: function (value) {
            return '[object Array]' == Object.prototype.toString.call(value);
        },

        /**
         * 将给定的要作为正则表达式的字符串做下转义
         *
         * @param {string} str 要转义的字符串
         * @return {string}
         */
        escapeRegExp: function (str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
        },

        /**
         * 获取路径 `/` 分隔的部分，移除空的部分
         *
         * @param {string} path 要分隔的路径
         * @return {Array.<string>}
         */
        getPathSegments: function (path) {
            var segments = path.split('/');
            var validSegments = [];
            for (var i = 0, len = segments.length; i < len; i++) {
                var part = segments[i];
                if (part) {
                    validSegments.push(part);
                }
            }

            return validSegments;
        },

        /**
         * 判断给定的请求路径是否是完整路径
         *
         * @param {string} path 要判断的路径
         * @return {boolean}
         */
        isAbsolutePath: function (path) {
            return /^\w+:\/\//.test(path);
        },

        /**
         * 获取给定的相对路径基于base的绝对路径，若未给定base，默认根据当前浏览器访问的路径信息
         * 作为基路径信息。
         *
         * 如果给定的相对路径已经是完整路径信息，则原值返回。
         *
         * @param {?string} base 要相对的基路径
         * @param {string} relative 给定的相对路径
         * @return {string}
         */
        getAbsolutePath: function (base, relative) {
            var utils = reloader.util;
            if (utils.isAbsolutePath(relative)) {
                return relative;
            }

            if (base) {
                base = utils.parseURL(base).url;
            }
            else {
                base = utils.parseURL(window.location.href).url;
            }

            var relativePathInfo = utils.parseURL(relative);
            var fullPaths = utils.getPathSegments(base);
            var relativePaths = utils.getPathSegments(relativePathInfo.url);

            // 如果给定的基路径不以 `/` 结尾，则移除当前文件名
            if (!/\/$/.test(base)) {
                fullPaths.pop();
            }

            for (var i = 0, len = relativePaths.length; i < len; i++) {
                var part = relativePaths[i];
                if (part === '.') {
                    continue;
                }

                if (part === '..') {
                    fullPaths.pop();
                }
                else {
                    fullPaths.push(part);
                }
            }

            // 协议后面加上斜杠
            var firstPart = fullPaths[0];
            if (/^\w+:$/.test(firstPart)) {
                fullPaths[0] = firstPart + '/';
            }

            return fullPaths.join('/') + relativePathInfo.param + relativePathInfo.hash;
        },

        /**
         * 解析给定的url
         * 返回解析后的url的路径信息、查询参数信息（包括 `?` ）和 hash信息（包括 `#` ）
         *
         * @param {string} url 要解析的url
         * @return {{ url: string, param: string, hash: string }}
         */
        parseURL: function (url) {
            var index;

            var hash = '';
            if ((index = url.indexOf('#')) >= 0) {
                hash = url.slice(index);
                url = url.slice(0, index);
            }

            var param = '';
            if ((index = url.indexOf('?')) >= 0) {
                param = url.slice(index);
                url = url.slice(0, index);
            }

            return {
                url: url,
                param: param,
                hash: hash
            };
        },

        /**
         * 为给定的url添加查询时间戳参数作为版本号。
         * 如果给定的url已经包含查询时间戳参数`browserreload`，
         * 则查询参数值自动替换为最新的。
         * 否则，自动追加该查询参数。
         *
         * @param {string} url 要添加查询参数的url
         * @param {number|string=} 要添加的时间戳，可选，默认用当前时间
         * @return {string}
         */
        addQueryTimestamp: function (url, timeStamp) {
            var urlInfo = reloader.util.parseURL(url);
            var param = urlInfo.param;
            var versionParam = 'browserreload=' + (timeStamp || (new Date()).getTime());
            var newParam = param.replace(/(\?|&)browserreload=(\d+)/, '$1' + versionParam);

            if (newParam === param) {
                newParam = param + ((param ? '&' : '?') + versionParam);
            }

            return urlInfo.url + newParam + urlInfo.hash;
        },

        /**
         * 获取给定路径信息的匹配比例，从后往前比较，返回匹配比例的百分值。
         *
         * @param {Array.<string>} rawPaths 原路径信息
         * @param {Array.<string>} toMatchPaths 要比较的路径信息
         * @return {number}
         */
        getMatchRatio: function (rawPaths, toMatchPaths) {
            var rawLen = rawPaths.length;
            var toMatchLen = toMatchPaths.length;

            var matchNum = 0;
            for (var i = rawLen - 1, j = toMatchLen - 1; i >= 0 && j >= 0; i--, j--) {
                if (rawPaths[i] === toMatchPaths[j]) {
                    matchNum++;
                }
                else {
                    break;
                }
            }

            return parseInt(matchNum / rawLen * 100);
        },

        /**
         * 从给定的文件列表里，查找文件路径跟要查找的目标文件路径最大匹配的文件，如果有多个完全
         * 匹配的文件，则返回数组，否则只返回最大匹配的那个文件，若有多个匹配程度一样，只返回其中
         * 一个。
         *
         * @param {string} path 要查找的目标文件路径
         * @param {Array.<Object>} fileInfoList 给定的文件信息列表
         *        文件信息要求包含文件链接地址信息：
         *        {
         *             href: string,
         *             fullHref: string // 若未给定，默认基于当前浏览页面路径获取
         *                              // 完整的链接地址
         *        }
         * @return {Array.<Object>}
         *         返回匹配文件对象结构：
         *         { ratio: number, isFullMatch: boolean, file: Object }
         */
        findMaxMatchFile: function (path, fileInfoList) {
            var utils = reloader.util;
            var changePaths = utils.getPathSegments(utils.parseURL(path).url);

            var maxMatch = null;
            var maxMatchFiles = [];
            for (var i = 0, len = fileInfoList.length; i < len; i++) {
                var file = fileInfoList[i];
                var fullHref = file.fullHref || (utils.getAbsolutePath(null, file.href));
                var toMatchPaths = utils.getPathSegments(utils.parseURL(fullHref).url);
                var ratio = utils.getMatchRatio(changePaths, toMatchPaths);
                var isFullMatch = ratio === 100;

                if (!maxMatch || isFullMatch || (maxMatch.ratio < ratio)) {
                    maxMatch = {
                        file: file,
                        ratio: ratio,
                        isFullMatch: isFullMatch
                    };

                    if (isFullMatch) {
                        maxMatchFiles.push(maxMatch);
                    }
                }
            }

            if (!maxMatchFiles.length && maxMatch) {
                maxMatchFiles.push(maxMatch);
            }

            return maxMatchFiles;
        }

    };

    /**
     * 轮询样式加载状态，对于不支持样式元素onload事件的fallback方式
     *
     * @param {HTMLElement} styleElem 样式元素
     * @param {function} callback 样式加载完成要执行的回调
     */
    function pollStyleLoadState(styleElem, callback) {
        var isLoaded = false;

        // 对于ie由于支持onload事件，因此这里不需要考虑ie<9版本不支持sheet属性
        // 此外对于ie>8,linkNode.sheet 和 cssRules 在 css 插入 DOM 后都立刻可访问，
        // cssRules 为 []，因此该轮询方法不适合ie
        var styleSheet = styleElem.sheet;

        if (/webkit/i.test(navigator.userAgent)) {
            // for webkit
            // Chrome / Safari:
            // linkNode.sheet 在 css 文件下载完成并解析好后才有值，之前为 undefined
            // linkNode.sheet.cssRules 同域时返回 CSSRuleList, 跨域时返回 null
            isLoaded = !!styleSheet || styleSheet === null;
        }
        else if (styleSheet) {
            // for firefox
            // linkNode.sheet 在 css 插入 DOM 中后立刻有值，插入前为 undefined
            // linkNode.sheet.cssRules 在文件还未下好时，抛出非法访问错误
            // 在文件下载并解析好后，同域时返回 cssRuleList
            // 只要是跨域(不管对错)抛出异常 (opera貌似也是？)
            try {
                isLoaded = !!styleSheet.cssRules;
            }
            catch (ex) {
                if (/security|insecure/i.test(ex.message)) {
                    isLoaded = true;
                }
            }
        }

        if (isLoaded) {
            setTimeout(function () {
                callback();
            }, 1);
        }
        else {
            setTimeout(function () {
                pollStyleLoadState(styleElem, callback);
            }, 1);
        }
    }

    /**
     * reloader dom模块
     *
     * @type {Object}
     */
    reloader.dom = {
        /**
         * 样式元素支持的事件
         */
        styleEvent: {},

        /**
         * 查询DOM元素，对于不支持querySelectorAll，如果当前上下文支持jquery则使用
         *
         * @param {string} selector 查询DOM元素的选择器
         * @return {?NodeList}
         */
        querySelectorAll: function (selector) {
            if (document.querySelectorAll) {
                return document.querySelectorAll(selector);
            }
            else if (typeof jQuery !== 'undefined') {
                return jQuery(selector);
            }
            else {
                return null;
            }
        },

        /**
         * 获取页面中所有 `link` 的样式元素，不包括动态插入的正在加载的元素
         *
         * @return {Array.<HTMLElement>}
         */
        getLinkStyles: function () {
            var linkElems = document.getElementsByTagName('link');
            var linkStyles = [];

            for (var i = 0, len = linkElems.length; i < len; i++) {
                var link = linkElems[i];
                if (link.rel === 'stylesheet' && !link.browserReloading) {
                    linkStyles.push(link);
                }
            }

            return linkStyles;
        },

        /**
         * 获取拥有给定的样式表的节点元素
         *
         * @param {Object} styleSheet 样式表
         * @return {HTMLElement}
         */
        getStyleOwnerNode: function (styleSheet) {
            var ownerNode;

            while (styleSheet) {

                // 对于ie9以前浏览器通过owningElement获取
                ownerNode = styleSheet.ownerNode || styleSheet.owningElement;

                if (ownerNode) {
                    return ownerNode;
                }
                else {

                    // 如果不存在，回溯到父样式表进行查找
                    styleSheet = styleSheet.parentStyleSheet;
                }
            }
        },

        /**
         * 提取导入的样式链接地址，兼容ie7以前浏览器，确保提取出来的链接值不包含url等非链接的
         * 信息。
         *
         * @param {string} href 导入的样式链接值
         * @return {string}
         */
        extractImportStyleHref: function (href) {
            href = reloader.util.trim(href);

            // 对于ie7早期版本，如果import的url包含media信息，href值变成：
            // url(test/myImportStyle.css) screen, print
            // 或者 "test/myImportStyle.css" screen, print
            var extractURLResult = URL_STYLE_REGEXP.exec(href);
            if (extractURLResult && extractURLResult.length === 2) {
                href = extractURLResult[1];
            }
            else if (!extractURLResult) {
                extractURLResult = /^\s*['"]\s*([^\s]*)\s*['"]/.exec(href);
            }

            if (extractURLResult && extractURLResult.length === 2) {
                href = extractURLResult[1];
            }

            return href;
        },

        /**
         * 获取导入的样式的完整路径
         *
         * @param {Object} importStyle 导入的样式信息
         */
        getImportStyleFullHref: function (importStyle) {
            var rule = importStyle.rule;
            var href = importStyle.href;
            var parentStyle = rule.parentStyleSheet;

            var getAbsolutePath = reloader.util.getAbsolutePath;
            var basePath = parentStyle.href && getAbsolutePath('', parentStyle.href);
            href = getAbsolutePath(basePath, href);

            return href;
        },

        /**
         * 收集导入的样式集合
         *
         * @param {Object} styleSheet 样式表
         * @param {Array.<Object>} result 收集的结果
         */
        collectImportStyles: function (styleSheet, result) {
            var ruleList;

            try {
                // firefox 对于跨域的样式访问会报错
                ruleList = styleSheet.cssRules;
            }
            catch (e) {
                return;
            }

            var isModernBrowser = !!ruleList;
            if (!ruleList) {

                // 对于ie9以前版本不存在cssRules属性，可以通过rules属性获取
                // 这里由于需要获取imports的rule，在ie里是不在rules集合里的
                // 所以这里通过ie特有的imports属性获取
                ruleList = styleSheet.imports;
            }

            var link = reloader.dom.getStyleOwnerNode(styleSheet);

            if (!ruleList || !ruleList.length) {
                return;
            }

            var extractImportStyleHref = reloader.dom.extractImportStyleHref;
            var getImportStyleFullHref = reloader.dom.getImportStyleFullHref;
            var collectImportStyles = reloader.dom.collectImportStyles;

            for (var i = 0, len = ruleList.length; i < len; i++) {
                var rule = ruleList[i];

                if ((CSSRule && rule.type === CSSRule.IMPORT_RULE)
                    || !CSSRule
                    ) {

                    var href = extractImportStyleHref(rule.href);
                    var importStyle = {
                        link: link,
                        rule: rule,
                        index: i,
                        href: href
                    };
                    importStyle.fullHref = getImportStyleFullHref(importStyle);
                    result.push(importStyle);

                    collectImportStyles(
                        // 对于现在浏览器的import规则，需要通过styleSheet获取其样式表信息
                        // 对于非import规则，不存在该属性。
                        // 对于ie9以前浏览器直接通过规则的imports属性就可以递归获取到间接
                        // import规则
                        isModernBrowser ? rule.styleSheet : rule,
                        result
                    );
                }
            }
        },

        /**
         * 获取当前页面导入的样式集合包括直接和间接导入的样式表
         *
         * @return {Array.<Object>}
         */
        getImportStyles: function () {
            var styleSheets = document.styleSheets;
            var importStyles = [];

            for (var i = 0, len = styleSheets.length; i < len; i++) {
                reloader.dom.collectImportStyles(styleSheets[i], importStyles);
            }

            return importStyles;
        },

        /**
         * 设置样式元素支持的事件
         *
         * @param {string} event 支持的事件名
         * @param {boolean} hasNativeSupport 该事件是否提供原生支持
         */
        setStyleSupportEvent: function (event, hasNativeSupport) {
            reloader.dom.styleEvent[event] = hasNativeSupport;
        },

        /**
         * 是否样式元素支持给定的原生事件
         *
         * @param {string} event 事件名称
         * @return {boolean}
         */
        isStyleSupportEvent: function (event) {
            return reloader.dom.styleEvent[event];
        },

        /**
         * 监听样式表加载完成回调处理
         *
         * @param {Object} styleElem 要监听的样式元素
         * @param {function} callback 要执行的回调
         */
        styleOnLoad: function (styleElem, callback) {
            var onLoad = function () {
                if (onLoad.called) {
                    return;
                }
                onLoad.called = true;
                callback && callback();
            };

            // 先尝试使用onload事件监听
            // 目前已知ie支持该事件，最新chrome33/ff28也支持该事件
            // 已知问题：当请求为404时候，在ie下 `onload` 事件依旧会触发，但在其它浏览器不会触发
            styleElem.onload = function () {
                reloader.dom.setStyleSupportEvent('load', true);
                onLoad();
            };

            // 目前已知的最新chrome33支持onerror事件
            styleElem.onerror = function () {
                onLoad();
            };

            // 如果不支持，降级使用轮询
            if (!reloader.dom.isStyleSupportEvent('load')) {
                setTimeout(function () {
                    pollStyleLoadState(styleElem, onLoad);
                }, 0);
            }
        },

        /**
         * 重新加载链接的样式
         *
         * @param {HTMLElement} link 要重新加载的链接样式元素
         */
        reloadLinkStyle: function (link) {
            if (link.browserReloading) {
                return;
            }

            var cloneLink = link.cloneNode();
            cloneLink.href = reloader.util.addQueryTimestamp(cloneLink.href);

            link.browserReloading = true;

            var parentNode = link.parentNode;
            if (parentNode.lastChild === link) {
                parentNode.appendChild(cloneLink);
            }
            else {
                parentNode.insertBefore(cloneLink, link.nextSibling);
            }

            reloader.dom.styleOnLoad(cloneLink, function () {
                var parentNode = link.parentNode;
                if (parentNode) {
                    parentNode.removeChild(link);
                }
            });
        },

        /**
         * 重新导入样式文件
         *
         * @param {Object} importStyle 要重新导入的样式对象
         */
        reloadImportStyle: function (importStyle) {
            var rule = importStyle.rule;
            var index = importStyle.index;
            var href = reloader.util.addQueryTimestamp(importStyle.fullHref);

            // 对于ie<9的浏览器media为字符串非数组
            var media = '';

            try {
                media = rule.media || '';
                (typeof media !== 'string')
                && (media = [].join.call(rule.media, ', '));
            }
            catch (e) {
                // 不知道为啥在ie9浏览器访问media属性会抛出错误，报"未实现"错
            }

            var newRule = '@import url("' + href + '") ' + media + ';';
            var parentStyle = rule.parentStyleSheet;

            // FIXME 已知问题，firefox28/ie9/ie10，插入的import规则的优先级不是按照插入的
            // 位置，而是莫名其妙变成父样式里的css规则里优先级最高的。。
            // chrome33/ie6/7/8均无此问题
            // 插入规则
            if (parentStyle.insertRule) {
                // all browsers, except IE before version 9
                parentStyle.insertRule(newRule, index);
            }
            else if (parentStyle.addImport) {
                // Internet Explorer  before version 9
                // parentStyle.addRule(newRule, index);
                parentStyle.addImport(href, index);
            }

            // 移除旧的规则
            var removePosition = index + 1;
            if (parentStyle.deleteRule
                && parentStyle.cssRules.length > removePosition
                ) {
                parentStyle.deleteRule(removePosition);
            }
            else if (parentStyle.removeImport
                && parentStyle.imports.length > removePosition
                ) {
                parentStyle.removeImport(removePosition);
            }

        }
    };

    // 对于IE的样式元素原生支持load事件
    if (isIE) {
        reloader.dom.setStyleSupportEvent('load', true);
    }

    /**
     * 获取要reload的文件路径，根据livereload选项配置，若未找到，默认reload变化的文件路径
     *
     * @param {string} changePath 变化的文件路径
     * @return {string}
     */
    reloader.getReloadFile = function (changePath) {
        var livereloadPathMap = reloader.options.livereload || {};
        for (var path in livereloadPathMap) {
            if (livereloadPathMap.hasOwnProperty(path)) {
                var regex = new RegExp(path);
                if (regex.test(changePath)) {
                    return livereloadPathMap[path];
                }
            }
        }

        return changePath;
    };

    /**
     * relaod选项定义
     *
     * @type {{Object}}
     */
    reloader.options = {
        /**
         * 打印 log 层级
         *
         * @type {string}
         */
        logLevel: 'info',

        /**
         * 定义要reload的文件路径，key为变化的文件路径的正则，value为要reload的文件路径
         *
         * @type {Object}
         */
        livereload: {}
    };

    /**
     * 图片相关样式定义
     * Refer [livereload](https://github.com/livereload/livereload-js)
     *
     * @type {Array.<Object>}
     * @const
     */
    var IMAGE_STYLES = [
        {
            selector: 'background',
            styleNames: ['backgroundImage']
        },
        {
            selector: 'border',
            styleNames: ['borderImage', 'webkitBorderImage', 'MozBorderImage']
        }
    ];

    /**
     * 更新 css 图片相关的样式
     *
     * @param {Object} style 要更新的样式对象
     * @param {Array.<string>} styleNames 要更新的样式名称
     * @param {Object} updateImageInfo 要更新的图片信息
     * @param {string=} updateImageInfo.basePath 更新的图片路径的基路径，可选，默认为当
     *                                 前页面路径
     * @param {string=} updateImageInfo.path 更新的图片路径
     * @param {string} updateImageInfo.reloadVersion 要更新的图片重新加载的版本号
     * @return {boolean}
     */
    function updateCSSImageStyle(style, styleNames, updateImageInfo) {
        var basePath = updateImageInfo.basePath;
        var path = updateImageInfo.path;
        var reloadVersion = updateImageInfo.reloadVersion;
        var hasUpdate = false;
        var escapeRegExp = reloader.util.escapeRegExp;

        for (var i = 0, len = styleNames.length; i < len; i++) {
            var name = styleNames[i];
            var value = style[name];

            if (!value) {
                continue;
            }

            // 类似于background-image可能会设置多个 url(xxx)
            var maxMatchImage = null;
            var result;
            var imgHref;
            while ((result = URL_STYLE_REGEXP.exec(value))) {
                imgHref = (result.length === 2) ? result[1] : null;

                if (!imgHref) {
                    continue;
                }

                maxMatchImage = reloader.util.findMaxMatchFile(path, [
                    {
                        fullHref: reloader.util.getAbsolutePath(basePath, imgHref)
                    }
                ])[0];

                if (maxMatchImage.isFullMatch) {
                    break;
                }
            }

            if (maxMatchImage && maxMatchImage.isFullMatch) {
                // 由于同一张图片可能会重复出现，这里若用正则，不能简单：
                // new RegExp(imgHref, 'g') ，需要对imgHref做转义，比如 .
                style[name] = value.replace(
                    new RegExp(escapeRegExp(imgHref), 'g'),
                    reloader.util.addQueryTimestamp(imgHref, reloadVersion)
                );
                hasUpdate = true;
            }
        }

        return hasUpdate;
    }

    /**
     * 更新样式表单的图片相关的样式
     *
     * @param {Object} styleSheet 要更新的样式表单
     * @param {Object} updateImageInfo 要更新的图片信息
     * @param {string=} updateImageInfo.basePath 更新的图片路径的基路径，可选，默认为当
     *                                 前页面路径
     * @param {string=} updateImageInfo.path 更新的图片路径
     * @param {string} updateImageInfo.reloadVersion 要更新的图片重新加载的版本号
     * @return {boolean}
     */
    function updateStyleSheetImage(styleSheet, updateImageInfo) {
        var cssRules = [];

        try {
            // firefox 对于跨域的样式访问会报错
            cssRules = styleSheet.cssRules || styleSheet.rules;
        }
        catch (e) {
            return false;
        }

        var hasReload = false;
        var result;
        for (var i = 0, len = cssRules.length; i < len; i++) {
            var rule = cssRules[i];

            if (!CSSRule || (rule.type === CSSRule.STYLE_RULE)) {

                // 样式规则直接更新图片样式信息
                for (var j = 0, jLen = IMAGE_STYLES.length; j < jLen; j++) {
                    var styleInfo = IMAGE_STYLES[j];

                    result = updateCSSImageStyle(
                        rule.style, styleInfo.styleNames,
                        updateImageInfo
                    );
                    hasReload || (hasReload = result);
                }
            }
            else if (CSSRule && (rule.type === CSSRule.MEDIA_RULE)) {

                // 对于媒介查询类似于一个子的样式表单，递归下
                result = updateStyleSheetImage(rule, updateImageInfo);
                hasReload || (hasReload = result);
            }
        }

        return hasReload;
    }

    /**
     * 重新加载样式表单里设置的图片相关的样式
     *
     * @param {string} path 要重新加载的图片路径
     * @param {string} reloadVersion 重新加载的图片要添加的版本号
     * @return {boolean}
     */
    function reloadStyleSheetImage(path, reloadVersion) {
        var hasReload = false;
        var result;

        // 更新 link 样式和 style 元素定义的图片样式信息
        var styleSheets = document.styleSheets;
        var getAbsolutePath = reloader.util.getAbsolutePath;
        for (var i = 0, len = styleSheets.length; i < len; i++) {
            var sheet = styleSheets[i];
            var href = sheet.href;
            result = updateStyleSheetImage(
                sheet,
                {
                    basePath: href && getAbsolutePath(null, href),
                    path: path,
                    reloadVersion: reloadVersion
                }
            );

            hasReload || (hasReload = result);
        }

        // 更新导入样式图片样式信息
        var importStyles = reloader.dom.getImportStyles();
        for (i = 0, len = importStyles.length; i < len; i++) {
            var importStyle = importStyles[i];
            var rule = importStyle.rule;

            result = updateStyleSheetImage(
                rule.styleSheet || rule,
                {
                    basePath: importStyle.fullHref,
                    path: path,
                    reloadVersion: reloadVersion
                }
            );

            hasReload || (hasReload = result);
        }

        return hasReload;
    }

    /**
     * 重新加载HTML行业样式设置的图片相关的样式
     *
     * @param {string} path 要重新加载的图片路径
     * @param {string} reloadVersion 重新加载的图片要添加的版本号
     * @return {boolean}
     */
    function reloadInlineStyleImage(path, reloadVersion) {
        var hasReload = false;
        var querySelectorAll = reloader.dom.querySelectorAll;

        for (var i = 0, len = IMAGE_STYLES.length; i < len; i++) {
            var styleInfo = IMAGE_STYLES[i];

            // IE7/IE8 下 style*=xx查找不到，
            // 但是查找存在属性style就可以找到 因此这里改成查找所有包含style属性的元素
            // var selector = '[style*=' + styleInfo.selector + ']';
            var foundElements = querySelectorAll('[style]') || [];

            for (var j = 0, jLen = foundElements.length; j < jLen; j++) {
                var result = updateCSSImageStyle(
                    foundElements[j].style, styleInfo.styleNames,
                    {
                        path: path,
                        reloadVersion: reloadVersion
                    }
                );
                hasReload || (hasReload = result);
            }
        }

        return hasReload;
    }

    /**
     * 重新加载Image元素引用的图片
     *
     * @param {string} path 要重新加载的图片路径
     * @param {string} reloadVersion 重新加载的图片要添加的版本号
     * @return {boolean}
     */
    function reloadImageElement(path, reloadVersion) {
        var imageElements = document.images;

        var imageFileList = [];
        for (var i = 0, len = imageElements.length; i < len; i++) {
            var img = imageElements[i];
            imageFileList[i] = {
                href: img.src,
                img: img
            };
        }

        var hasReload = false;
        var maxMatchImages = reloader.util.findMaxMatchFile(path, imageFileList);
        for (i = 0, len = maxMatchImages.length; i < len; i++) {
            var matchImg = maxMatchImages[i];

            if (matchImg.isFullMatch) {
                matchImg.file.img.src = reloader.util.addQueryTimestamp(
                    matchImg.file.href, reloadVersion
                );

                hasReload = true;
            }
        }

        return hasReload;
    }

    /**
     * 默认的reload命令相关处理器定义
     *
     * @type {Object}
     */
    reloader.command = {
        /**
         * 初始化reload上下文的选项信息
         *
         * @param {Object} data 要初始化选项信息
         */
        init: function (data) {
            var options = reloader.options;
            options.livereload = data.livereload || {};
            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    options[k] = data[k];
                }
            }
        },

        /**
         * 重新加载css样式文件
         *
         * @param {{ path: string }} data 重新加载的样式文件信息
         */
        reloadCSS: function (data) {
            var changeFilePath = reloader.getReloadFile(data.path);
            var hasMatch = false;
            var linkStyles = reloader.dom.getLinkStyles();
            var importStyles = reloader.dom.getImportStyles();

            var findMaxMatchFile = reloader.util.findMaxMatchFile;
            var maxMatchLink = findMaxMatchFile(changeFilePath, linkStyles)[0];
            var maxMatchImport = findMaxMatchFile(changeFilePath, importStyles)[0];

            if (maxMatchLink && maxMatchLink.isFullMatch) {
                reloader.dom.reloadLinkStyle(maxMatchLink.file);
                hasMatch = true;
            }
            if (maxMatchImport && maxMatchImport.isFullMatch) {
                reloader.dom.reloadImportStyle(maxMatchImport.file);
                hasMatch = true;
            }

            if (!hasMatch) {
                reloader.command.reloadPage();
            }
        },

        /**
         * 重新加载图片
         *
         * @param {{ path: string }} data 重新加载的图片信息
         */
        reloadImage: function (data) {
            if (!document.querySelectorAll && (typeof jQuery === 'undefined')) {
                reloader.command.reloadPage();
            }

            var changeFilePath = reloader.getReloadFile(data.path);
            var hasReload = false;

            var reloadVersion = (new Date()).getTime();
            hasReload = reloadImageElement(changeFilePath, reloadVersion);

            var result = reloadInlineStyleImage(changeFilePath, reloadVersion);
            hasReload || (hasReload = result);

            result = reloadStyleSheetImage(changeFilePath, reloadVersion);
            hasReload || (hasReload = result);

            if (!hasReload) {
                reloader.command.reloadPage();
            }
        },

        /**
         * 重新刷新页面
         */
        reloadPage: function () {
            window.document.location.reload();
        }
    };

    /**
     * 打印日志信息
     *
     * @param {string} type 日志类型，有效值:log/warn/error
     * @param {string} msg 要打印的消息
     */
    function log(type, msg) {
        var typeMap = {
            info: 'log',
            warn: 'warn',
            error: 'error'
        };
        var logLevel = {
            info: 1,
            warn: 2,
            error: 3
        };

        var options = reloader.options;
        if (logLevel[type] < (logLevel[options.logLevel] || logLevel.info)) {
            return;
        }

        var console = window.console;
        if (console) {
            var logInfo = console[typeMap[type]] || console.log;
            if (typeof logInfo === 'function') {
                logInfo.call(console, '[watchreload-' + type + ']: ' + msg);
            }
        }
    }

    /**
     * log模块
     */
    reloader.log = {
        info: function (message) {
            log('info', message);
        },

        warn: function (message) {
            log('warn', message);
        },

        error: function (message) {
            log('error', message);
        }
    };

    /**
     * 进行socket通信接口定义
     *
     * @type {Object}
     */
    reloader.socket = {
        /**
         * 初始化消息接收监听器
         */
        initMessageListener: function () {
            var socket = this._socket;
            socket.on('command', function (data) {
                reloader.log.info('receive command: ' + io.JSON.stringify(data));
                var handler = reloader.command[data.type];
                delete data.type;
                handler && handler(data);
            });

            socket.on('connect', function () {
                socket.emit('register', {
                    name: navigator.userAgent
                });
                reloader.log.info('connection is successful.');
            });
            socket.on('disconnect', function () {
                reloader.log.info('connection is disconnected.');
            });
            socket.on('reconnecting', function () {
                reloader.log.info('reconnection...');
            });
        },

        /**
         * 向服务端发送消息
         *
         * @param {string} msgType 发送的消息类型
         * @param {Object} data 要发送消息数据
         */
        sendMessage: function (msgType, data) {
            var socket = this._socket;
            if (socket) {
                socket.emit(msgType, data || {});
            }
        },

        /**
         * 打开socket通信，同时开始监听进入的消息
         */
        open: function () {
            // NOTICE: 这里端口使用变量方式，便于保持跟服务器端启用的端口一致
            this._socket = io.connect('http://{{ip}}:{{port}}');
            this.initMessageListener();
        },

        /**
         * 关闭socket通信
         */
        close: function () {
            var socket = this._socket;
            socket.removeAllListeners();
            socket.disconnect();
            this._socket = null;
        }
    };

    // 打开socket
    reloader.socket.open();

})(window, document, window.io, window._browserReloader || (window._browserReloader = {}));



