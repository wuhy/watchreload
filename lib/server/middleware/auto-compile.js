/**
 * @file 自动编译文件中间件
 * @author sparklewhy@gmail.com
 */

var url = require('url');
var injector = require('connect-injector');
var _ = require('lodash');

var log = require('../../common/log');

/**
 * 内置的预定义的编译器
 *
 * @type {Object}
 */
var buildinCompiler = {
    less: require('./less-compiler')
};

/**
 * 查找编译器
 *
 * @inner
 * @param {string} type 编译器类型
 * @param {Object} conf 编译器配置
 * @return {?{compiler: Object, option: Object}}
 */
function findCompiler(type, config) {
    if (!config) {
        return;
    }

    var compiler;
    var customOption;
    if (config.hasOwnProperty('compiler')) {
        compiler = config.compiler;
        customOption = config.option;
    }
    else {
        compiler = buildinCompiler[type];
        if (compiler && typeof config === 'object') {
            customOption = config;
        }
    }

    if (compiler) {
        return {
            compiler: compiler,
            option: customOption
        };
    }
}

/**
 * 获取编译请求的less文件的中间件处理器
 *
 * @inner
 * @param {Object} options 选项信息
 * @param {string} options.root 请求的静态资源的根路径
 * @param {Object} options.compileOption 编译的选项
 * @param {function(URL, http.IncomingMessage, http.ServerResponse):boolean}
 *                 options.when 判断是否要自动编译
 * @param {function(Function, Buffer, Object, http.IncomingMessage, http.ServerResponse)}
 *                 options.compile 编译方法，传入参数为callback, 编译内容content,
 *                                 编译选项options，请求对象req和响应对象res
 * @return {function}
 */
function autoCompile(options) {
    return injector(
        function (req, res) {
            return options.when(url.parse(req.url, true), req, res);
        },

        function (callback, content, req, res) {
            options.compile(callback, content, options, req, res);
            // FIXME error happen caused stack call overflow, connect-injector bug?
            // callback('error compile file..');
        }
    );
}

/**
 * 获取自动编译中间件处理器
 *
 * @param {string} rootPath 要编译的静态资源的根路径
 * @param {string} type 编译器类型
 * @param {Object} conf 编译器配置
 * @return {?function}
 */
function getAutoCompiler(rootPath, type, conf) {
    var compilerInfo = findCompiler(type, conf);
    if (compilerInfo) {
        var compiler = compilerInfo.compiler;
        return autoCompile({
            root: rootPath,
            compileOption: _.merge({
            }, compiler.defaultOption || {}, compilerInfo.option || {}),
            when: compiler.when,
            compile: compiler.compile
        });
    }
    else {
        log.error('Cannot load compiler type: %s', type);
    }
}

module.exports = exports = getAutoCompiler;