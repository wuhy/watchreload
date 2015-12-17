/**
 * @file 入口模块
 * @author sparklewhy@gmail.com
 */

var url = require('url');
var opn = require('opn');

var WatchServer = require('./server/watch-server');
var watchHandler = require('./server/watch-handler');
var log = require('./common/log');

/**
 * 打开浏览器访问给定的URL
 *
 * @param {Object} options 打开的选项信息
 * @param {boolean=} options.autoOpen 是否自动打开，如果为false，则不执行打开URL操作
 * @param {string|Array.<string>=} options.openBrowser 要自动打开的浏览器，浏览器名称是
 *                                平台独立的，未给定打开默认浏览器
 * @param {string=} options.openPath 要打开的url的访问的起始路径
 * @param {string} baseURL 要打开的URL的 base URL
 * @return {boolean} 如果执行了打开操作，返回true
 */
exports.tryOpenURL = function (options, baseURL) {
    options || (options = {});

    if (!options.autoOpen) {
        return false;
    }

    var openBrowsers = options.openBrowser;
    var openURL = url.resolve(baseURL, options.openPath || '');

    if (openBrowsers) {
        if (!Array.isArray(openBrowsers)) {
            openBrowsers = [
                openBrowsers
            ];
        }

        openBrowsers.forEach(function (browser) {
            opn(openURL, browser);
        });
    }
    else {
        opn(openURL);
    }

    return true;
};

/**
 * watchreload 启动入口
 *
 * @param {Object=} options 启动选项信息，具体参见{@link watch-server}构造函数说明
 */
exports.main = function (options) {
    // 创建文件监控server实例
    var server = new WatchServer(options);
    server.start(function (err) {
        if (err) {
            log.error('Start server failed: %s', err);
            return;
        }

        log.info('Working Dir: ' + this.workingDir);
        log.info('Watch server start on port %d', this.port);

        var visitURL = 'http://' + this.ip + ':' + this.port;
        log.info('Web server started, visit %s', visitURL);

        exports.tryOpenURL(this.options, visitURL);
    });

    server.bindListeners(watchHandler);
    server.bindListeners(server.options.watch);
};
