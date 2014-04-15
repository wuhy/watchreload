/**
 * @file 用于和客户端进行通信的服务端
 * @author  sparklewhy@gmail.com
 */
var http = require('http');
var io = require('socket.io');
var _ = require('lodash');
var util = require('util');
var url = require('url');
var pathUtil = require('path');
var EventEmitter = require('events').EventEmitter;

var watchdog = require('../watchdog');
var helper = require('../common/helper');
var log = require('../common/log');
var FileMonitor = require('./file-monitor');
var protocolCommand = require('./protocol').Command;

/**
 * 默认的自定义的监控配置文件
 *
 * @type {string}
 */
var WATCHER_CONFIG_FILE = watchdog.customConfigFile;

/**
 * 文件监控默认配置信息
 *
 * @type {Object}
 */
var DEFAULT_OPTIONS = require('./watch-default-config');

/**
 * 创建监控Server实例
 *
 * @param {Object=} options 创建server的选项信息，更详细的选项信息，
 *                         参见 `watch-default-config.js`
 * @param {number=} options.port 启动的server监听的端口
 * @param {{ include: Array.<string>, exclude: Array.<string> }=} options.files
 *                 要监控的文件
 * @param {string=} options.configFile 自定义的配置文件路径
 * @constructor
 * @extends {EventEmitter}
 */
function WatchServer(options) {
    options || (options = {});
    var config = _.merge(this.readWatchConf(options.configFile), options);
    this.init(config);
}

util.inherits(WatchServer, EventEmitter);

/**
 * 读取文件监控相关配置信息
 *
 * @param {string=} 自定义的配置文件路径，可选
 * @return {Object}
 */
WatchServer.prototype.readWatchConf = function (configFile) {
    this.configFile = pathUtil.resolve(configFile || WATCHER_CONFIG_FILE);

    var watcherOptions = {};
    var customOption;

    try {
        // 删除缓存
        delete require.cache[require.resolve(this.configFile)];
        customOption = require(this.configFile);
    }
    catch (ex) {
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
}

/**
 * 初始化监控服务器选项信息
 *
 * @param {Object} options 初始化选项信息，说明见构造函数
 */
WatchServer.prototype.init = function (options) {
    this.port = options.port;
    this.clientScriptName = options.client.name;
    this.options = options;

    this.initWatchFiles(options.basePath, options.files);
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
                 */
                me.emit('fileAll', event, filePath);
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
 * 处理HTTP请求
 *
 * @param {http.IncomingMessage} request 请求对象
 * @param {http.ServerResponse}  response 响应对象
 */
WatchServer.prototype.handleRequest = function (request, response) {
    var path = request.url || '';
    var urlInfo = url.parse(path, true);
    var pathSegments = urlInfo.pathname.split(/\//);

    var notEmptySegments = [];
    pathSegments.forEach(function (item) {
        item && notEmptySegments.push(item);
    });

    var reqFileName = pathSegments[pathSegments.length - 1];
    if (reqFileName === this.clientScriptName) {

        /**
         * 请求客户端脚本事件
         *
         * @event client.js
         * @param {http.IncomingMessage} request 请求对象
         * @param {http.ServerResponse}  response 响应对象
         * @param {Object} query 附加查询参数信息
         */
        this.emit('client.js', request, response, urlInfo.query);
    }
    else {
        response.writeHead(404);
        response.end();
    }
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
 * 启动监控Server
 *
 * @param {function()=} callback 启动完成要执行的回调
 */
WatchServer.prototype.start = function (callback) {
    try {

        // 启动HTTPServer和Socket通信
        var httpServer = http.createServer(this.handleRequest.bind(this));
        this._httpServer = httpServer;

        this._io = io.listen(httpServer, {
            'log level': 1 // only log warn & error information
        });
        httpServer.listen(this.port);

        // 开始监听连接请求
        helper.proxyEvents(this._io.sockets, this, {
            connection: this.onConnection
        });

        // 启动文件监控
        this._fileWatcher = new FileMonitor({
            basePath: this.options.basePath,
            files: this.files
        });
        this.bindFileWatchListeners();

        callback && callback.call(this, null, this.port);
    }
    catch (e) {
        if (callback) {
            callback.call(this, e, this.port);
        }
        else {
            throw e;
        }
    }
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

    // 调试模式把发给客户端消息，通过server端也抛出来
    if (this.options.debug) {
        this.emit(cmdName, data);
    }

    if (client) {
        client.emit(cmdName, data);
        return;
    }

    var clients = this._io.sockets.clients();
    for (var i = 0, len = clients.length; i < len; i++) {
        var socket = clients[i];
        socket.emit(cmdName, data);
    }
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
            debug: options.debug,
            livereload: options.livereload || {}
        },
        client
    );
}

module.exports = exports = WatchServer;
