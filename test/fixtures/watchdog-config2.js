
module.exports = {

    
    port: 12345,

    
    watch: {
        
        fileAll: function (event, filePath) {

        }
    },

    debug: true,

    client: {
//        path: 'sd/asd.js',
        messageTypes: ['command', 'reloadPage']
    },

    
    files: {
        include: [
            'test/fixtures/resource/**/*'
        ],
        exclude: []
    }
};