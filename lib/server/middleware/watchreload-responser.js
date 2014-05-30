/**
 * @file 处理请求 watchreload 客户端脚本的中间件
 * @author sparklewhy@gmail.com
 */

var url = require('url');
var pathUtil = require('path');

var log = require('../../common/log');
var helper = require('../../common/helper');

var baseDir = __dirname;

/**
 * 默认的客户端脚本文件
 *
 * @type {string}
 * @const
 */
var DEFAULT_CLIENT_SCRIPT = pathUtil.resolve(baseDir, '../../client/browser-reload.js');

/**
 * socket.io客户端脚本文件(压缩版本)
 *
 * @type {string}
 * @const
 */
var SOCKET_IO_CLIENT_COMPRESSED = pathUtil.resolve(
    require.resolve('socket.io'), '../node_modules/socket.io-client/dist/socket.io.min.js'
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
 * @param {Object} options 选项信息
 * @return {Buffer}
 */
function rewriteBrowserReloadScript(script, options) {

    // 设置socket连接的端口信息
    return new Buffer('\n' + script.replace(
        /{{port}}/g, options.port
    ).replace(/{{ip}}/g, options.ip));
}


/**
 * 处理文件监控服务器客户端脚本请求
 *
 * @param {http.IncomingMessage} request 请求对象
 * @param {http.ServerResponse}  response 响应对象
 * @param {Object} options 选项信息
 */
function handleClientScriptRequest(request, response, options) {
    log.info('Serving client script...');

    var basePath = options.basePath;
    var clientScriptPath = options.path;

    if (clientScriptPath) {
        clientScriptPath = helper.resolvePath(
            basePath, clientScriptPath
        );
    }
    else {
        clientScriptPath = DEFAULT_CLIENT_SCRIPT;
    }

    var scriptPaths = [ SOCKET_IO_CLIENT_COMPRESSED, clientScriptPath ];
    var clientPlugins = options.plugins || [];
    clientPlugins.forEach(function (plugin) {
        scriptPaths.push(helper.resolvePath(basePath, plugin));
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
            data[1] = rewriteBrowserReloadScript(data[1].toString('utf8'), options);

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
 * 请求 watchreload 客户端脚本
 *
 * @param {Object} options 选项信息
 * @param {string} options.ip 启动的server的ip地址
 * @param {string} options.port 启动的server的端口
 * @param {string} options.name 客户端脚本名称
 * @param {string=} options.path 自定义的客户端脚本路径，可选
 * @param {string=} options.basePath 相对的基路径，可选
 * @param {Array.<string>=} options.plugins 自定义的客户端插件路径列表，可选
 * @return {function}
 */
function requestWatchreloadClient(options) {
    var clientScriptName = options.name;

    return function (req, res, next) {
        var path = req.url || '';
        var urlInfo = url.parse(path, true);
        var pathSegments = urlInfo.pathname.split(/\//);

        var notEmptySegments = [];
        pathSegments.forEach(function (item) {
            item && notEmptySegments.push(item);
        });

        var reqFileName = pathSegments[pathSegments.length - 1];
        if (reqFileName === clientScriptName) {
            handleClientScriptRequest(req, res, options);
        }
        else {
            next();
        }
    };
}

module.exports = exports = requestWatchreloadClient;