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

    watch: {

        fileAll: function (event, filePath, fileTypeInfo) {
            console.log('file:' + event + ', on: ' + filePath);
            console.log('file Info: ' + JSON.stringify(fileTypeInfo));
        }
    },

    /**
     * 要监控的文件sdsd
     *
     * @type {Array.<Object>}
     */
    files: {
        include: [
            '**/*'
        ],
        exclude: []
    }
};