/**
 * @file 用于和客户端进行通信的服务端
 * @author  sparklewhy@gmail.com
 */

var io = require('socket.io');
var _ = require('lodash');
var chalk = require('chalk');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var watchreload = require('../watchreload');
var helper = require('../common/helper');
var log = require('../common/log');
var FileMonitor = require('./file-monitor');
var webServer = require('./web-server');
var protocolCommand = require('./protocol').Command;

/**
 * 默认的自定义的监控配置文件
 *
 * @type {string}
 */
var WATCHER_CONFIG_FILE = watchreload.customConfigFile;

/**
 * 文件监控默认配置信息
 *
 * @type {Object}
 */
var DEFAULT_OPTIONS = require('./watch-default-config');

/**
 * 创建监控Server实例
 *
 * @constructor
 * @extends {EventEmitter}
 *
 * @param {Object=} options 创建server的选项信息，更详细的选项信息，
 *                         参见 `watch-default-config.js`
 * @param {number=} options.port 启动的server监听的端口
 * @param {{ include: Array.<string>, exclude: Array.<string> }=} options.files
 *                 要监控的文件
 * @param {string=} options.configFile 自定义的配置文件路径
 */
function WatchServer(options) {
    options || (options = {});
    var configFile = options.configFile;
    var basePath = options.basePath;

    // 初始化配置文件
    if (configFile) {
        configFile = helper.resolvePath(basePath, configFile);
    }
    else {
        configFile = helper.resolvePath(basePath, WATCHER_CONFIG_FILE);
        this.useDefaultConfig = true;
    }
    this.configFile = configFile;

    var config = _.merge(this.readWatchConf(configFile), options);
    this.init(config);
}

util.inherits(WatchServer, EventEmitter);

/**
 * 读取文件监控相关配置信息
 *
 * @param {string} configFile 配置文件路径
 * @return {Object}
 */
WatchServer.prototype.readWatchConf = function (configFile) {
    var watcherOptions = {};
    var customOption;

    try {
        // 删除缓存
        delete require.cache[require.resolve(configFile)];
        customOption = require(configFile);
    }
    catch (ex) {
        !this.useDefaultConfig && log.error('watchreload config file not found: %s', configFile);
        customOption = {};
    }

    // 初始化要监听的客户端消息类型: 合并用户定制和默认的消息类型
    var messageTypes = _.clone(DEFAULT_OPTIONS.client.messageTypes);
    var existedMsgTypeMap = {};
    messageTypes.forEach(function (type) {
        existedMsgTypeMap[type] = 1;
    });
    var customMessageTypes = (customOption.client || {}).messageTypes || [];
    customMessageTypes.forEach(function (type) {
        if (!existedMsgTypeMap[type]) {
            messageTypes.push(type);
        }
    });

    // 合并默认和用户定制的消息类型，重置消息类型的配置信息
    _.merge(watcherOptions, DEFAULT_OPTIONS, customOption);
    watcherOptions.client.messageTypes = messageTypes;

    return watcherOptions;
};

/**
 * 初始化监控服务器选项信息
 *
 * @param {Object} options 初始化选项信息，说明见构造函数
 */
WatchServer.prototype.init = function (options) {
    this.workingDir = helper.resolvePath(options.basePath || '.');
    this.port = options.port;
    this.options = options;

    // 设置 log 层级
    log.setLogLevel(options.logLevel);

    this.initWatchFiles(options.basePath, options.files);
};

/**
 * 执行启动前要执行的 shell 脚本
 *
 * @param {string} shell 要执行的shell脚本
 */
WatchServer.prototype.executeShell = function (shell) {
    if (!shell || this._cp) {
        return;
    }

    var options = {
        cwd: this.workingDir
    };

    if (!this.options.capturePrestartOutput) {
        options.stdio = ['ignore', 'ignore', process.stderr];
    }

    var cp = helper.spawnShell(shell, options);
    cp.on('close', function (code) {
        if (code !== 0) {
            log.error('Execute %s, error happen, exit errocode: %d', chalk.red(shell), code);
        }
    });
    this._cp = cp;
};

/**
 * 初始化监控的文件信息
 *
 * @param {?string} basePath 要监控的文件相对的文件基路径
 * @param {{ include: Array.<string>, exclude: Array.<string> }} files
 *                 要监控的文件
 */
WatchServer.prototype.initWatchFiles = function (basePath, files) {
    files || (files = {});

    // 初始化要监控的文件
    files.include = (files.include || []).map(function (filePath) {
        return helper.resolvePath(basePath, filePath);
    });

    // 默认添加配置文件作为监控对象
    files.include.push(this.configFile);

    // 初始化要 exclude 掉的文件
    files.exclude = (files.exclude || []).map(function (filePath) {
        return helper.reslovePath(basePath, filePath);
    });

    this.files = files;
};

/**
 * 绑定文件监控监听器
 *
 * @private
 */
WatchServer.prototype.bindFileWatchListeners = function () {
    var me = this;

    helper.proxyEvents(me._fileWatcher, this, {
        ready: function (watcher) {
            /**
             * 文件监控就绪事件
             *
             * @event fileWatchReady
             * @param {Array.<string>} watchFiles 被监控的文件
             */
            me.emit('fileWatchReady', watcher.watched());
        },

        /**
         * 文件发生变化事件
         *
         * @event fileChanged
         * @param {string} filePath 发生变化的文件路径
         */
        changed: 'fileChanged',

        /**
         * 文件发生添加事件
         *
         * @event fileAdded
         * @param {string} filePath 添加的文件路径
         */
        added: 'fileAdded',

        /**
         * 文件发生删除事件
         *
         * @event fileDeleted
         * @param {string} filePath 删除的文件路径
         */
        deleted: 'fileDeleted',

        all: function (event, filePath) {
            if (me.configFile === filePath) {
                /**
                 * 监控配置文件发生变化触发的事件
                 *
                 * @event watchConfigChange
                 * @param {string} filePath 发生变更的文件路径
                 */
                me.emit('watchConfigChange', filePath);
            }
            else {

                /**
                 * 文件增删改所触发的事件
                 *
                 * @event fileAll
                 * @param {string} event 发生变更的事件
                 * @param {string} filePath 发生变更的文件路径
                 * @param {Object} fileTypeInfo 发生变化的文件类型信息
                 * @param {string} fileTypeInfo.type 文件类型名，
                 *                 基于定义在配置文件 `fileTypes` 确定
                 * @param {string} fileTypeInfo.extName 文件路径的扩展名
                 */
                me.emit(
                    'fileAll',
                    event, filePath,
                    helper.getFileTypeInfo(filePath, me.options.fileTypes)
                );
            }
        },

        /**
         * 监控文件变化出错事件
         *
         * @event fileWatchError
         * @param {Object} err 出错的信息
         */
        error: 'fileWatchError'
    });
};

/**
 * 绑定socket监听器
 *
 * @param {Object} socket 连接的socket
 * @private
 */
WatchServer.prototype.bindSocketListeners = function (socket) {
    helper.proxyEvents(socket, this, this.options.client.messageTypes, true);
};

/**
 * 监听连接时间处理器
 *
 * @param {Object} socket 连接成功的socket
 */
WatchServer.prototype.onConnection = function (socket) {
    /**
     * 进入socket请求连接成功事件
     *
     * @event connection
     * @param {Object} socket 连接成功的socket
     * @param {number} connectionCount 当前连接数量
     */
    this.emit('connection', socket, this.getConnectionCount());

    // 监听socket通信
    this.bindSocketListeners(socket);
};

/**
 * 启动 socket 通信的监听
 *
 * @private
 * @param {http.Server} httpServer 启动的 httpServer 实例
 */
WatchServer.prototype.listenSocket = function (httpServer) {
    this._io = io.listen(httpServer, {
        'log level': 1 // only log warn & error information
    });

    // 监听 socket 连接请求
    helper.proxyEvents(this._io.sockets, this, {
        connection: this.onConnection
    });
};

/**
 * 启动监控Server
 *
 * @param {function()=} callback 启动完成要执行的回调
 */
WatchServer.prototype.start = function (callback) {

    // 执行启动前要执行的脚本
    this.executeShell(this.options.prestart);

    // 初始化启动访问 ip
    this.ip = helper.getIPv4()[0];

    // 启动HTTPServer和Socket通信
    var httpServer = webServer.create(this);
    this.listenSocket(httpServer);

    this._httpServer = httpServer;

    var me = this;
    var port = this.port;
    httpServer.listen(
        port,
        function () {

            /**
             * 启动监控服务器成功事件
             *
             * @event start
             */
            me.emit('start');
            callback && callback.call(me, null, port);
        }
    ).on(
        'error',
        function (e) {
            callback && callback.call(me, e, port);
        }
    );

    // 启动文件监控
    this._fileWatcher = new FileMonitor({
        basePath: this.options.basePath,
        files: this.files
    });
    this.bindFileWatchListeners();
};

/**
 * 关闭监控服务器
 */
WatchServer.prototype.close = function () {
    this._fileWatcher.close();
    this._httpServer.close();

    // close existed connection
    var clients = this._io.sockets.clients();
    for (var i = 0, len = clients.length; i < len; i++) {
        clients[i].disconnect();
    }
};

/**
 * 绑定监听器
 *
 * @param {Object} listener 要绑定的监听器，key：监听的事件名称，value：监听的事件处理器
 */
WatchServer.prototype.bindListeners = function (listener) {
    for (var event in listener) {
        if (listener.hasOwnProperty(event)) {
            this.on(event, listener[event]);
        }
    }
};

/**
 * 重新启动文件监控
 */
WatchServer.prototype.restartFileWatch = function () {
    this._fileWatcher.restart(this.files);
};

/**
 * 获取当前连接数量
 *
 * @return {number}
 */
WatchServer.prototype.getConnectionCount = function () {
    return this._io.sockets.clients().length;
};

/**
 * 向连接的客户端发送命令消息
 *
 * @param {Object} data 要发送的消息数据
 * @param {Object=} client 要发送消息的socket客户端，可选，默认会向所有client发送
 */
WatchServer.prototype.sendCommandMessage = function (data, client) {
    var cmdName = 'command';

    if (client) {
        client.emit(cmdName, data);
        return;
    }

    this._io.sockets.emit(cmdName, data);
};

/**
 * 发送客户端初始化命令消息
 *
 * @param {Object=} client 要发送的目标客户端，可选，默认全部客户端都发送
 */
WatchServer.prototype.sendInitCommandMessage = function (client) {
    var options = this.options;

    this.sendCommandMessage(
        {
            type: protocolCommand.init,
            logLevel: options.logLevel,
            livereload: options.livereload || {}
        },
        client
    );
};

module.exports = exports = WatchServer;
