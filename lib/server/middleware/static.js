/**
 * @file  提供静态web服务器功能中间件
 * @author sparklewhy@gmail.com
 */

var connect = require('connect');

/**
 * 获取静态web服务器中间件处理器
 *
 * @param {Object} options 选项信息
 * @param {string} options.root 启动的静态资源服务器的跟路径
 * @return {function}
 */
function serveAsStaiceServer(options) {
    return connect.static(options.root);
}

module.exports = exports = serveAsStaiceServer;