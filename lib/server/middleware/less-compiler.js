/**
 * @file 自动编译less文件为css文件中间件
 * @author sparklewhy@gmail.com
 */

var pathUtil = require('path');
var url = require('url');

var less = require('less');

/**
 * 判断请求是否是less文件的正则定义
 *
 * @type {RegExp}
 */
var LESS_REGEXP = /\.less$/i;

/**
 * 判断是否对当前请求进行 less 编译
 *
 * @param {URL} reqURL 请求的URL
 * @param {http.IncomingMessage} req 请求对象
 * @param {http.ServerResponse} res 响应对象
 * @return {boolean}
 */
exports.when = function (reqURL, req, res) {
    var contentType = res.getHeader('content-type');
    var isCSS = contentType
        && (contentType.toLowerCase().indexOf('text/css') >= 0);

    // 如果响应内容已经是css则不再做处理
    if (isCSS) {
        return false;
    }

    return LESS_REGEXP.test(reqURL.pathname);
};

/**
 * 对当前请求的 less 资源编译为 css
 *
 * @param {function(object, string)} callback 编译完成要执行的回调，
 *                                            第一个参数为err对象，
 *                                            第二个参数为编译结果内容
 * @param {Buffer} content 要编译的内容
 * @param {Object} options 编译的选项信息
 * @param {string} options.root 请求的静态资源的根路径
 * @param {Object} options.compileOption 编译的选项
 * @param {http.IncomingMessage} req 请求对象
 * @param {http.ServerResponse} res 响应对象
 */
exports.compile = function (callback, content, options, req, res) { // jshint ignore:line
    var rootPath = options.root;

    // 初始化 less 编译选项
    var reqURL = url.parse(req.url);
    var reqPath = reqURL.pathname;
    var compileOption = options.compileOption || {};

    if (!compileOption.paths) {
        compileOption.paths = [
            pathUtil.join(rootPath, pathUtil.dirname(reqPath))
        ];
    }

    // 重新设置响应的内容类型为css
    res.setHeader('content-type', 'text/css; charset=UTF-8');

    less.render(content.toString(), compileOption, callback);
};

/**
 * 默认的 less 编译选项
 *
 * @type {{relativeUrls: boolean}}
 */
exports.defaultOption = {
    relativeUrls: true
};
