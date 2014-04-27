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

    /**
     * 要观察的事件类型及相应的处理器的定义
     * key: 为事件类型名，value: 为相应的事件处理器
     *
     * @type {Object}
     */
    watch: {},

    /**
     * 定义发生变化的样式文件要reload的文件
     * key：为发生变化的路径的正则表达式，value：为要reload的文件路径
     *
     * @type {Object}
     */
    livereload: {},

    /**
     * 要监控的文件
     *
     * @type {Array.<Object>}
     */
    files: {
        include: [ 
            'src/**/*.{js,html,less,styl,css}',
            '*.html'
        ],
        exclude: []
    }
};