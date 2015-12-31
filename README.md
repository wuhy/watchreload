
watchreload
========

[![Build Status](https://travis-ci.org/wuhy/watchreload.svg?branch=master)](https://travis-ci.org/wuhy/watchreload) [![Dependency Status](https://david-dm.org/wuhy/watchreload.svg)](https://david-dm.org/wuhy/watchreload)

> Yet another livereload tool for web development

watchreload 是用来监控web项目中静态资源变化，同时内置支持实现浏览器同步更新。
基于 [gaze](https://github.com/shama/gaze) 实现文件变化监听，
基于 [socket.io](http://socket.io/) 实现浏览器和监控服务器通信。

## 功能特性

1. 支持的浏览器: IE, Firefox, Chrome
2. 支持css的注入刷新
3. 支持image的注入刷新
4. 支持静态资源变化自动刷新页面
5. 内置web服务器，支持代理，支持自动编译各种中间文件比如 `less`

## 开始使用

### 安装

1. 安装 `node.js` 
    
2. 安装 watchreload

    ```shell
    npm install watchreload -g
    ```
    
    安装成功后，可以执行如下命令，查看可用的命令和选项：
    
    ```shell
    watchreload -h
    ```
    
    也可以简写为：
    
    ```shell
    wr -h
    ```
    
### 简单 web 项目下使用

1. `cd` 到 web 目录

2. 执行如下命令：

    ```shell
    wr start --open
    ```

上面两步可以合成一步执行，直接执行如下命令：
```shell
wr start --open --base xx/xx/webroot
```

上述命令会在当前 web 目录下启动一个本地的静态 web 服务器，同时监控 web资源的变化。

`--open` 表示自动打开默认的浏览器访问，如果不想自动打开，去掉该选项即可。

`--base` 用来指定启动的根目录。

### 复杂 web 项目下使用

1. 生成配置文件

    `cd` 到 web 目录，执行如下命令：
    
    ```shell
    wr init
    ```

    上述命令会在当前 web 目录下生成一个 `watch-config.js` 配置文件，更多关于配置文件说明见下面选项部分。

2. 配置代理 （如果没有使用自己的 web 服务器，可以跳过这步）

    在 `watch-config.js` 加上自己的 web 服务器作为代理：
    
    ```javascript
    proxy: 'localhost:8888'
    ```
    
    或者
    
    ```javascript
    proxy: {
        host: 'localhost',
        port: 8888
    }
    ```

3. 配置要监听变化的文件

    可以对默认生成的要监听变化的文件进行修改，`pattern` 使用可以参考<a href="https://github.com/isaacs/minimatch" target="_blank">minimatch</a>
    
    ```javascript
    files: {
        include: [
            'src/**/*.{js,html,less,styl,css}',
            '*.html'
        ],
        exclude: []
    }
    ```

4. 启动监控服务器

    ```shell
    wr start --open
    ```
    
    由于配置了代理，因此可以直接访问 `watchreload` 启动的 server。

## 配置文件选项说明

* 自定义启动前要执行的脚本

    ```javascript
    /**
     * 自定义启动要执行的脚本，比如启动本地的 web 服务器，
     * 这样只需一个命令就能启动 web 项目了
     */
    prestart: 'edp webserver start'
    ```

* 启动的端口

    ```javascript
    port: 12345
    ```
* 代理配置

    ```javascript
    proxy: 'localhost:8888'
    ```
    
    或者
    
    ```javascript
    proxy: {
        host: 'localhost',
        port: 8888
    }
    ```

* 自动打开浏览器，默认 false
    
    ```javascript
    autoOpen: false
    ```

* 自动打开的浏览器类型

    ```javascript
    /**
     * 要自动打开的浏览器，未指定，打开默认的浏览器，
     * 可以指定多个要打开的浏览器，注意要打开的浏览器是平台独立的，
     * 因此，不同操作系统下可能会不一样。
     *
     * `autoOpen` 为true，该配置项才有效。
     *
     * windows下：['iexplorer', 'chrome', 'firefox']
     *
     * @type {Array.<string> | string}
     */
    openBrowser: 'chrome'
    ```

* 自动打开的浏览器默认访问的 path

    ```javascript
    /**
     * 自动打开时候，要自动访问的路径，`autoOpen` 为true，该配置项才有效。
     */
    openPath: './main.html?uid=98'
    ```
        
* 自定义 livereload 文件

    项目中对于样式开发，如果使用 `less` 开发，可能会有很多文件，但 `html` 中引用的样式可能就只有一个文件，比如 `main.less`，该样式文件会 `@import` 其它样式文件。为了确保样式文件修改之后，也能实现只是重新 `reload css`，可以在 `watch-config.js` 添加类似如下的配置：
    
    ```javascript
    /**
     * 定义发生变化的样式文件要reload的文件
     * key：为发生变化的路径的正则表达式，value：为要 reload 的文件路径
     *
     * @type {Object}
     */
    livereload: {
        'src/.+\\.less$': 'src/common/css/main.less'
    }
    ```

* 自定义任务

    ```javascript
    watch: {
        // 监听所有文件类型的变化：added/changed/deleted
        fileAll: function (event, filePath, fileTypeInfo) {
            console.log('file:' + event + ', on: ' + filePath);
            console.log('file Info: ' + JSON.stringify(fileTypeInfo));
            // 执行自定义的任务...
        }
    }
    ```

* 自动编译

    对于使用 `watchrleoad` 内置 web 静态服务器，未使用代理的，可以基于如下配置项，开启要自动编译的资源类型，当前内置实现只提供了`less` 处理器，后续会不断完善。
    
    ```javascript
     /**
     * 启用自动编译功能，可以指定当前要启用的编译类型
     *
     * e.g.,
     * autoCompile: {
     *     less: true
     * }
     *
     * or custom compile option
     * autoCompile: {
     *     less: {
     *         relativeUrls: false
     *     }
     * }
     *
     * or custom compiler plugin
     * autoCompiler: {
     *     coffescript: {
     *         compiler: require('yourcompiler'),
     *         option: {} // your compiler compile option
     *     }
     * }
     *
     * NOTE:
     * custom compiler interface, please refer buildin less compiler implementation.
     *
     * @type {Object}
     */
    autoCompile: {}
    ```
    
## 其它配置选项

可以参考 `watch-default-config.js` 文件。

## 其它

### 客户端脚本注入

如果通过 `watchserver` 启动 server 访问 web 站点，`watchreload` 会自动对 `html` 资源文件注入 `watchreload` 客户端脚本。

如果不想通过 `watchserver` 来访问 web 站点，要求自行注入脚本到 `html` 资源文件，以确保 server 和 web 站点能进行通信。

1. 手动注入脚本

    对 web 项目访问的 `html` 页面 `</body>` 前添加如下脚本：
    
    ```html
    <script src="http://localhost:12345/browser-reload.js"></script>
    ```
    
    上述脚本 `localhost` 可以改成本机的 IP 地址，port 端口号如果没有定制修改，默认就是 `12345` 。
    
2. 自动注入脚本
    
    使用浏览器扩展自动注入，参见<a href="https://github.com/wuhy/watchreload-extensions" target="_blank">watchreload extension</a>。
    
    如果你使用 [edp webserver](https://github.com/ecomfe/edp-webserver)，在 `edp-webserver-config.js` 文件里加上类似于如下配置：
    
    ```javascript
    exports.getLocations = function () {
        return [
            {
                location: '/',
                handler: home( 'index.html' )
            },
            {
                // 为 html 文件添加 livereload 脚本
                location: /\/index\.html/,
                handler: [
                    file(),
                    livereload({
                        ip: 'localhost',
                        port: 12345
                    })
                ]
            }
            // ...
        ];
    };
    ```
    
    由于上述注入的 `livereload` 脚本名称为 `livereload.js`，因此需要修改下 `watch-config.js`
    配置文件，加上 `client.name` 属性，确保能正确加载客户端脚本：
    
    ```javascript
    module.exports = {
    
        client: {
            // 设置浏览器器端脚本文件名
            name: 'livereload.js'
        },
    
        files: {
            include: [
                'webroot/src/**/*'
            ],
            exclude: []
        }
    };
    ```
