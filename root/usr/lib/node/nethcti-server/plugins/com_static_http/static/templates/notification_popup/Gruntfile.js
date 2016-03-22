module.exports = function(grunt) {
    grunt.initConfig({
      inline: {
        call: {
          options: {
            cssmin: true,
            uglify: true
          },
          src: 'call.html',
          dest: 'dist/call.html'
        },
        streaming: {
          options: {
            cssmin: true,
            uglify: true
          },
          src: 'streaming.html',
          dest: 'dist/streaming.html'
        }
      }
    })

    grunt.loadNpmTasks('grunt-inline');

    // Default task(s).
    grunt.registerTask('default', ['inline:call', 'inline:streaming']);
};
