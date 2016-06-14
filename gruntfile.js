var shell = require('shelljs');

module.exports = function(grunt) {

  grunt.initConfig({
    release: {
      options: {
        npm: true,
        tagName: 'v<%= version %>',
        commitMessage: 'v<%= version %>',
        beforeRelease: 'npm run changelog',
        files: ['CHANGELOG.md'],
        github: {
          repo: 'DomoApps/domoapps-cli',
          usernameVar: 'GITHUB_USERNAME', //ENVIRONMENT VARIABLE that contains Github username
          passwordVar: 'GITHUB_PASSWORD' //ENVIRONMENT VARIABLE that contains Github password
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-release');
};
