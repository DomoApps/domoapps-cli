module.exports = function(grunt) {

  grunt.initConfig({
    
    babel: {
      options: {
        sourceMap: true,
        stage: 0
      },
      dist: {
        files: {
          'dist/domo-dist': 'bin/domo',
          'dist/server-dist.js': 'server/server.js'
        }
      }
    },
    
    release: {
      options: {
        npm: true,
        tagName: 'v<%= version %>',
        commitMessage: 'v<%= version %>',
        github: {
          repo: 'DomoApps/domoapps-cli',
          usernameVar: 'GITHUB_USERNAME', //ENVIRONMENT VARIABLE that contains Github username
          passwordVar: 'GITHUB_PASSWORD' //ENVIRONMENT VARIABLE that contains Github password
        },
        beforeRelease: ['babel']
      }
    }
  });

  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-babel');
};