/**
 * @file 文件监控服务器监听事件类型的默认处理器
 * @author wuhuiyao
 */

var chalk = require('chalk');
var log = require('../common/log');
var helper = require('../common/helper');
var protocolCommand = require('./protocol').Command;

/**
 * 各种文件类型发生修改，要触发的动作定义
 *
 * @type {Object}
 */
var fileTypeAction = {
    style: protocolCommand.reloadCSS,
    image: protocolCommand.reloadImage
};

/**
 * 文件变化相关的事件类型的处理器定义
 *
 * @type {Object}
 */
var fileChangeHandler = {
    deleted: function (server, filePath) {
        server.sendCommandMessage({
            type: protocolCommand.reloadPage,
            path: filePath
        });
    },
    changed: function (server, filePath, typeInfo) {
        var cmd = fileTypeAction[typeInfo.type] || protocolCommand.reloadPage;
        server.sendCommandMessage({
            type: cmd,
            path: filePath,
            fileInfo: typeInfo
        });
    },
    added: function (server, filePath) {
        server.sendCommandMessage({
            type: protocolCommand.reloadPage,
            path: filePath
        });
    }
};

module.exports = {

    /**
     * 客户端连接成功处理器
     *
     * @param {Object} socket 连接成功的socket
     * @param {number} count 连接的客户端数量
     */
    connection: function (socket, count) {
        log.info('Client connected: %s, connection count: %d', socket.id, count);

        // 发送初始化命令
        this.sendInitCommandMessage(socket);
    },

    /**
     * 客户端连接断开处理器
     *
     * @param {Object} socket 断开的socket
     */
    disconnect: function (socket) {
        log.info('Client %s disconnected...', socket.id);
    },

    /**
     * 注册客户端信息
     *
     * @param {Object} socket 连接的socket
     * @param {{ name: string }} data 客户端注册信息，其中name为客户端的useragent信息
     */
    register: function (socket, data) {
        log.info('Client info: ' + JSON.stringify(data));
    },

    /**
     * 文件监控就绪处理器
     *
     * @param {Object} watchedFiles 监控的文件信息
     */
    fileWatchReady: function () {
        log.info('Watching files start...');
    },

    /**
     * 文件监控出错处理器
     *
     * @param {Object} err 错误对象
     */
    fileWatchError: function (err) {
        log.error('Watch file error: ' + err);
    },

    /**
     * 文件监控服务器配置文件变化处理器
     */
    watchConfigChange: function () {
        log.info(chalk.green('Reload watcher config...'));

        this.init(this.readWatchConf(this.configFile));
        this.restartFileWatch();

        // 发送初始化命令
        this.sendInitCommandMessage();
    },

    /**
     * 文件相关变化事件处理器
     *
     * @param {string} event 文件变化的事件类型：deleted/added/changed/renamed
     * @param {string} filePath 变化的文件路径
     * @param {string} fileTypeInfo 变化的文件类型信息
     */
    fileAll: function (event, filePath, fileTypeInfo) {
        var relativePath = helper.getRelativePath(this.options.basePath, filePath);

        log.info('Watch file ' + chalk.yellow.bold(event) + ': '
            + chalk.cyan(relativePath));

        var handler = fileChangeHandler[event];
        handler && handler(this, relativePath, fileTypeInfo);
    }
};
