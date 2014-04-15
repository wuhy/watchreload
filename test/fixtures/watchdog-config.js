/**
 * @file 启动监控服务器的配置信息定义
 */
module.exports = {

    /**
     * 监控服务器使用端口
     *
     * @type {number}
     */
    port: 12345,

    debug: true,

    client: {
        messageTypes: ['command', 'reloadPage']
    },

    /**
     * 要监控的文件sdsd
     *
     * @type {Array.<Object>}
     */
    files: {
        include: [
            'test/fixtures/resource/**/*'
        ],
        exclude: []
    }
};