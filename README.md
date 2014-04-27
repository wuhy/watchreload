
watchreload
========

[![Build Status](https://travis-ci.org/wuhy/watchreload.svg?branch=master)](https://travis-ci.org/wuhy/watchreload) [![Dependencies Status](https://david-dm.org/wuhy/watchreload.png)](https://david-dm.org/wuhy/watchreload)

> Yet another livereload tool for web development

watchreload 是用来监控web项目中静态资源变化，同时内置支持实现浏览器同步更新。
基于 [gaze@0.5.1](https://github.com/shama/gaze) 实现文件变化监听，
基于 [socket.io](http://socket.io/) 实现浏览器和监控服务器通信。

类似的工具：[livereload] (https://github.com/livereload/livereload-js)，但 `livereload`
只支持一些现代浏览器，而且 `livereload` 对于 `css` 和 `image` 的注入刷新实现上有些问题。

## 功能特性

1. 支持的浏览器: IE6/7/8/9/10/11, Firefox, Chrome
2. 支持css的注入刷新
3. 支持image的注入刷新
4. 支持静态资源变化自动刷新页面
5. 支持静态资源变化监听，并完成一些自定义任务

## 开始使用

### 安装

watchdog是基于node.js，因此得确保已经安装了node，如果已确认安装，执行如下命令：

```shell
npm install watchreload -g
```

### 初始化

在要监控的web项目根目录下执行如下命令：

```shell
watchreload init
```

执行结束，默认会生成 `watch-config.js` 配置文件，下述是一个最简单的配置例子，只需配置要监听
的静态资源文件即可：

```javascript
module.exports = {
    files: {
        include: [
            'webroot/src/**/*'
        ],
        exclude: []
    }
};
```

### 启动

```shell
watchreload start
```

### 添加脚本

在要进行livereload的html页面body后面引入如下脚本：

```html
<script src="http://localhost:12345/browser-reload.js"></script>
```

如果你使用 [edp webserver](https://github.com/ecomfe/edp-webserver)，在
 `edp-webserver-config.js` 文件里加上如下配置：

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
配置文件，加上 `client.name` 属性：

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

## 自定义 livereload 文件

项目中对于样式开发，如果使用 `less` 开发，可能会有很多文件，但 `html` 中引用的样式可能就只有
一个文件，比如 `main.less`，该样式文件会 `@import` 其它样式文件。为了确保样式文件修改之后，也能
实现只是重新 `reload css`，可以在 `watch-config.js` 添加如下配置：

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

## 自定义任务

在 `watch-config.js` 添加如下配置：

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

## 其它配置选项

TODO




