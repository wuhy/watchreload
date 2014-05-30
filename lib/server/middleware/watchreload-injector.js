/**
 * @file 提供 watchreload 客户端脚本注入中间件
 * @author sparklewhy@gmail.com
 */

var injector = require('connect-injector');

function injectWatchreload(options) {
    var snippet = options.snippet;

    return injector(
        function (req, res) {
            var contentType = res.getHeader('content-type');
            return contentType && (contentType.toLowerCase().indexOf('text/html') >= 0);
        },

        function (callback, content) {
            content = content.toString();

            if (snippet && content.indexOf(snippet) === -1) {
                var lastBody = /<\s*\/\s*body\s*>(?!(.|\n)*<\s*\/\s*body\s*>)/gi;
                var injected = content.replace(lastBody, snippet + '</body>');
                callback(null, injected);
            }
            else {
                callback(null, content);
            }
        }
    );
}

module.exports = exports = injectWatchreload;