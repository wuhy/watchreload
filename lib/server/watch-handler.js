/**
 * @file 文件监控服务器监听事件类型的默认处理器
 * @author wuhuiyao
 */

var fs = require('fs');
var pathUtil = require('path');
var chalk = require('chalk');
var _ = require('lodash');
var Buffer = require('buffer').Buffer;
var log = require('../common/log');
var helper = require('../common/helper');
var protocolCommand = require('./protocol').Command;

var baseDir = __dirname;

/**
 * 默认的客户端脚本文件
 *
 * @type {string}
 * @const
 */
var DEFAULT_CLIENT_SCRIPT = pathUtil.resolve(baseDir, '../client/browser-reload.js');

/**
 * socket.io客户端脚本文件(压缩版本)
 *
 * @type {string}
 * @const
 */
var SOCKET_IO_CLIENT_COMPRESSED = pathUtil.resolve(
    baseDir, '../../node_modules/socket.io-client/dist/socket.io.min.js'
);

/**
 * 重写socket.io客户端脚本：强行设置socket.io客户端端执行环境不具备amd模块定义，确保socket.io
 * 能在客户端作为普通的脚本引用。否则会影响其它模块的require的初始化。
 *
 * @param {string} script 脚本
 * @return {Buffer}
 */
function rewriteSocketIOClientScript(script) {
    var resetAmdScript = ''
        + 'if (typeof define === "function" && define.amd) {'
        +     'define.resetAmd = true; define.amd = false; '
        + '}';
    var recoverAmdScript = ''
        + 'if (typeof define === "function" && define.resetAmd) {'
        +     'delete define.resetAmd; define.amd = true; '
        + '}';

    return new Buffer(resetAmdScript + '\n' + script + '\n' + recoverAmdScript);
}

/**
 * 重写浏览器客户端的reload脚本
 *
 * @param {string} script 脚本
 * @param {Object} server watchServer对象
 * @return {Buffer}
 */
function rewriteBrowserReloadScript(script, server) {

    // 设置socket连接的端口信息
    return new Buffer('\n' + script.replace(
        /{{port}}/g, server.port
    ));
}


/**
 * 处理文件监控服务器客户端脚本请求
 *
 * @param {http.IncomingMessage} request 请求对象
 * @param {http.ServerResponse}  response 响应对象
 * @param {Object} query 附加查询参数信息
 */
function handleClientScriptRequest(request, response, query) {
    var server = this;

    log.info('Serving client script...');

    var clientConf = this.options.client;
    var clientScriptPath = clientConf.path;
    if (clientScriptPath) {
        clientScriptPath = pathUtil.resolve(clientScriptPath);
    }
    else {
        clientScriptPath = DEFAULT_CLIENT_SCRIPT;
    }

    var scriptPaths = [ SOCKET_IO_CLIENT_COMPRESSED, clientScriptPath ];
    var clientPlugins = clientConf.plugins || [];
    clientPlugins.forEach(function (plugin) {
       scriptPaths.push(pathUtil.resolve(plugin));
    });

    helper.readFiles(scriptPaths).on(
        'done',
        function (err, data) {
            if (err) {
                log.error('The client script is not found: ' + err.message);
                response.writeHead(404);
                response.end();
                return;
            }

            data[0] = rewriteSocketIOClientScript(data[0].toString('utf8'));
            data[1] = rewriteBrowserReloadScript(data[1].toString('utf8'), server);

            data = Buffer.concat(data);

            response.writeHead(200, {
                'Content-Length': data.length,
                'Content-Type': 'application/x-javascript;charset=utf-8'
            });
            response.end(data);
        }
    );
}

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
    changed: function (server, filePath, data) {
        var cmd = data.style
            ? protocolCommand.reloadCSS : protocolCommand.reloadPage;
        server.sendCommandMessage({
            type: cmd,
            path: filePath,
            fileInfo: data
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
    fileWatchReady: function (watchedFiles) {
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
     * 请求客户端脚本处理器
     */
    'client.js': handleClientScriptRequest,

    /**
     * 文件相关变化事件处理器
     *
     * @param {string} event 文件变化的事件类型：deleted/added/changed/renamed
     * @param {string} filePath 变化的文件路径
     */
    fileAll: function (event, filePath) {
        var relativePath = helper.getRelativePath(filePath);

        log.info('Watch file ' + chalk.yellow.bold(event) + ': '
            + chalk.cyan(relativePath));

        var handler = fileChangeHandler[event];
        var typeInfo = helper.getFileTypeInfo(filePath, this.options.fileTypes);
        handler && handler(this, relativePath, typeInfo);
    }
};
