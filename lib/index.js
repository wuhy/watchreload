/**
 * @file 入口模块
 * @author sparklewhy@gmail.com
 */
var WatchServer = require('./server/watch-server');
var watchHandler = require('./server/watch-handler');
var log = require('./common/log');

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
    });

    server.bindListeners(watchHandler);
    server.bindListeners(server.options.watch);
};