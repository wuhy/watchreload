/**
 * @file 客户端和服务端通信协议定义
 * @author  sparklewhy@gmail.com
 */

/**
 * 服务器发送给客户端命令类型定义
 *
 * @type {Object}
 */
exports.Command = {
    // 初始化客户端上下文信息
    init: 'init',
    // 页面重新加载(刷新)
    reloadPage: 'reloadPage',
    // 重新加载页面样式文件
    reloadCSS: 'reloadCSS',
    // 重新加载图片
    reloadImage: 'reloadImage'
};
