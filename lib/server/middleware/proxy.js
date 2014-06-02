/**
 * @file 代理 http 请求 中间件
 * @author sparklewhy@gmail.com
 */

var httpProxy = require('http-proxy');
var log = require('../../common/log');

/**
 * 获取代理请求的处理器
 *
 * @param {Object} options 代理请求选项
 * @param {string=} options.target 设置的目标代理，格式为: '127.0.0.1:8888'
 * @param {string=} options.host 设置的目标代理的主机
 * @param {string=} options.port 设置的目标代理的端口
 * @return {function}
 */
function proxyRequest(options) {
    options || (options = {});

    var target;
    if (options.target) {
        target = options.target;
    }
    else if (options.host) {
        target = options.host;
        var port = options.port;
        port && (target += ':' + port);
    }

    target = 'http://' + target;

    var proxy = httpProxy.createProxyServer({});

    log.info('Using proxy: %s', target);

    return function (req, resp, next) {
        proxy.web(req, resp, {
            target: target
        });

        proxy.once('error', function (err) {
            log.error('Proxy server error: %s', err);
            next(err);
        });
    };
}

module.exports = exports = proxyRequest;