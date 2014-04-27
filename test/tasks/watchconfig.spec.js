var expect = require('expect.js');
var helper = require('./helper');
var http = require('http');
var Buffer = require('buffer').Buffer;

describe('Watch files with basePath', function () {

    var port = 12347;
    var watchServer = helper.createWatchServer({
        port: port,
        configFile: helper.getConfigFile('watch-config-basepath.js')
    });

    it('should file change event fire', function (done) {
        var jsFile = 'test-edit2.js';
        watchServer.once('fileAll', function (event, filePath) {
            expect((new RegExp(jsFile + '$')).test(filePath)).to.be(true);

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

                        expect(script).to.contain('__customBrowserReloadClient__');
                        expect(script).to.contain('__browserReloadClientPlugin__');

                        done();
                    }
                );
            }
        });
    });
});
