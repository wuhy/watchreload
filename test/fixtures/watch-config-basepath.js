
module.exports = {

    basePath: 'test/fixtures',
    port: 12345,

    
    watch: {
        
        fileAll: function (event, filePath) {

        }
    },

    client: {
        name: 'livereload.js',
        path: 'resource/livereload.js',
        messageTypes: ['command', 'reloadPage'],
        plugins: [
            'resource/plugins/a.js'
        ]
    },

    
    files: {
        include: [
            'resource/**/*'
        ],
        exclude: []
    }
};