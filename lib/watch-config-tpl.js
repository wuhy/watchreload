/**
 * @file 启动监控服务器的配置信息定义
 * @author sparklewhy@gmail.com
 */
module.exports = {

    /**
     * 启动前要执行的 shell 脚本，比如启动 web服务器
     *
     * @type {string}
     */
    prestart: null,

    /**
     * 是否自动打开浏览器访问，默认false
     *
     * @type {boolean}
     */
    autoOpen: false,

    /**
     * 要自动打开的浏览器，未指定，打开默认的浏览器，可以指定多个要打开的浏览器，注意
     * 要打开的浏览器是平台独立的，因此，不同操作系统下可能会不一样。
     *
     * `autoOpen` 为true，该配置项才有效。
     *
     * windows下：['iexplorer', 'chrome', 'firefox']
     *
     * @type {Array.<string> | string}
     */
    openBrowser: null,

    /**
     * 自动打开时候，要自动打开的路径，`autoOpen` 为true，该配置项才有效。
     *
     * @type {string}
     */
    openPath: null,

    /**
     * 监控服务器使用端口
     *
     * @type {number}
     */
    port: 12345,

    /**
     * 由于默认 watchreload 会作为一个静态web服务器使用，如果不想使用默认的，可以使用
     * 自己的web服务器，通过配置该代理选项即可：
     *
     * proxy: 'localhost:8080'
     *
     * or
     *
     * proxy: {
     *     host: 'localhost',
     *     port: '8080'
     * }
     *
     * 不想使用代理，设为false即可，这也是 watchreload 默认值。
     *
     * @type {string|Object|boolean}
     */
    proxy: false,

    /**
     * 要观察的事件类型及相应的处理器的定义
     * key: 为事件类型名，value: 为相应的事件处理器
     *
     * @type {Object}
     */
    watch: {},

    /**
     * 定义发生变化的文件要reload的文件
     * key：为发生变化的路径的正则表达式，value：为要reload的文件路径
     *
     * 使用场景：
     * html页面引用的样式文件main.less，间接import多个其它样式文件，为了能够支持修改了import
     * 的文件，能够 reload main.less 文件，而不是 reload 整个文档，可以增加类似如下配置：
     *
     * livereload: {
     *  'src/.+\\.less$': 'src/common/css/main.less'
     * }
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
