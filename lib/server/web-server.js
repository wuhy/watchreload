/**
 * @file 创建 web server 实例
 * @author sparklewhy@gmail.com
 */

var http = require('http');
var connect = require('connect');

var helper = require('../common/helper');

var proxy = require('./middleware/proxy');
var staticServer = require('./middleware/static');
var watchreloadResponser = require('./middleware/watchreload-responser');
var watchreloadInjector = require('./middleware/watchreload-injector');
var autoCompile = require('./middleware/auto-compile');

/**
 * 初始化自动编译中间件
 *
 * @param {Object} app 要初始化的app对象
 * @param {string} rootPath web server 启动的根路径
 * @param {Object} options 要启动的自动编译选项
 */
function initAutoCompileMiddleware(app, rootPath, options) {
    if (!options) {
        return;
    }

    for (var type in options) {
        if (options.hasOwnProperty(type)) {
            var compiler = autoCompile(rootPath, type, options[type]);
            compiler && app.use(compiler);
        }
    }
}

/**
 * 创建 web 服务器
 *
 * @param {WatchServer} watchServer watchserver 实例
 * @return {http.Server}
 */
exports.create = function (watchServer) {
    var app = connect();

    var watchOption = watchServer.options;
    var clientConf = watchOption.client;
    var basePath = watchOption.basePath;
    var ip = watchServer.ip;
    var port = watchServer.port;

    // 初始化响应 watchreload 客户端脚本中间件
    app.use(watchreloadResponser({
        ip: ip,
        port: port,
        basePath: basePath,
        path: clientConf.path,
        name: clientConf.name,
        plugins: clientConf.plugins
    }));

    // 初始化注入 watchreload 客户端脚本的中间件
    var url = 'http://' + ip + ':' + port + '/' + clientConf.name;
    app.use(watchreloadInjector({
        snippet: '<script src="' + url + '"></script>'
    }));

    // 初始化代理中间件
    var proxyInfo = watchOption.proxy;
    var proxyMiddleware;
    if (proxyInfo && typeof proxyInfo === 'string') {
        proxyMiddleware = proxy({target: proxyInfo});
    }
    else if (proxyInfo && typeof proxyInfo === 'object') {
        proxyMiddleware = proxy({
            host: proxyInfo.host,
            port: proxyInfo.port
        });
    }

    if (proxyMiddleware) {
        app.use(proxyMiddleware);
    }

    // 如果未配置代理，web服务器作为静态服务器使用
    if (!proxyMiddleware) {
        var rootPath = helper.resolvePath(basePath, '.');

        // 初始化自动编译中间件
        initAutoCompileMiddleware(app, rootPath, watchOption.autoCompile);

        app.use(staticServer({
            root: rootPath
        }));
    }

    return http.createServer(app);
};
