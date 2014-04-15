require('should');
var helper = require('./helper');
var pathUtil = require('path');
var http = require('http');
var Buffer = require('buffer').Buffer;

describe('Watch files with basePath', function () {

    var port = 12347;
    var watchServer = helper.createWatchServer({
        port: port,
        configFile: helper.getConfigFile(pathUtil.join(__dirname, '..'), 'watchdog-config.js')
    });


    it('should file change event fire', function (done) {
        var jsFile = 'test2.js';
        watchServer.once('fileAll', function (event, filePath) {
            (new RegExp(jsFile + '$')).test(filePath).should.ok;

            done();
        });

        helper.editJSResourceFile(jsFile);
    });

    it('has the right client script', function (done) {
        http.get('http://localhost:' + port + '/livereload.js', function (res) {
            if (res.statusCode == 200) {
                res.setEncoding('utf8');
                var data = [];
                res.on('data',function (chunk) {
                    data[data.length] = chunk;
                }).on('end', function () {
                        var script = Buffer.concat([data]).toString();

                        script.indexOf('__customBrowserReloadClient__').should.be.above(0);
                        script.indexOf('__browserReloadClientPlugin__').should.be.above(0);

                        done();
                    }
                );
            }
        });
    });
});
