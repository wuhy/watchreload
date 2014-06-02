/**
 * @file 提供 watchreload 客户端脚本注入中间件
 * @author sparklewhy@gmail.com
 */

var injector = require('connect-injector');

/**
 * 匹配最后一个 body 关闭元素正则表达式
 *
 * @type {RegExp}
 */
var LAST_CLOSE_BODY_REGEXP = /<\s*\/\s*body\s*>(?![\s\S]*<\s*\/\s*body\s*>)/i;

function injectWatchreload(options) {
    var snippet = options.snippet;

    return injector(
        function (req, res) {
            var contentType = res.getHeader('content-type');

            return contentType && (contentType.toLowerCase().indexOf('text/html') >= 0);
        },

        function (callback, content) {
            content = content.toString();
            if (content.indexOf(snippet) === -1) {
                callback(
                    null,
                    content.replace(LAST_CLOSE_BODY_REGEXP, snippet + '</body>')
                );
            }
            else {
                callback(null, content);
            }
        }
    );
}

module.exports = exports = injectWatchreload;