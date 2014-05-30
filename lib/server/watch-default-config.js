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
     * 是否要捕获启动前执行的 shell 的命令行输出，如果想关闭输出，置为false，对于错误的输出
     * 不能关闭。
     *
     * @type {boolean}
     */
    capturePrestartOutput: true,

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
	 * 监控服务器名称
	 * 
	 * @type {string}
	 */
	name: 'watchreload-server',

	/**
	 * 使用协议名称
	 * 
	 * @type {Array.<string>}
	 */
	protocols: [],

    /**
     * 要监控的文件包括自定义的插件路径相对的 base 路径，默认基于当前执行 watch 的工作目录
     *
     * @type {string}
     */
    basePath: null,

    /**
     * 是否开启调试模式
     *
     * @type {boolean}
     */
    debug: false,

    /**
     * 要加载的客户端配置选项信息
     *
     * @type {Object}
     */
    client: {
        /**
         * 浏览器端脚本文件名，确保注入的客户端脚本的名称跟这里配置一样，watchreload 服务器
         * 才能正确响应客户端脚本内容。
         *
         * @type {string}
         */
        name: 'browser-reload.js',

        /**
         * 要加载的客户端脚本路径，可以指定自己的客户端脚本，如果不想使用默认的话。
         * 文件路径基于 `basePath`，未设置 `bathPath`，基于当前工作目录。
         *
         * @type {string}
         */
        path: null,

        /**
         * 客户端附加加载的插件的路径列表，文件路径基于 `basePath`，未设置 `bathPath`，基于
         * 当前工作目录。
         *
         * @type {Array.<string>}
         */
        plugins: [],

        /**
         * 客户端定制的消息类型，服务端可以捕获这里注册的消息类型
         *
         * @type {Array.<string>}
         */
        messageTypes: ['disconnect', 'register', 'action']
    },

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
     * 定义文件类型的后缀名，多个以逗号分隔，可以为function，自行判断
     *
     * @type {string|function ({path: string, extName: string}):boolean}
     */
    fileTypes: {
        style: 'css,less,styl',
        script: 'js',
        image: 'jpg,jpeg,png,gif'
    },

	/**
	 * 要监控的文件
	 * 
	 * @type {Array.<Object>}
	 */
	files: {
		include: [ '**/*' ],
		exclude: []
	}
};