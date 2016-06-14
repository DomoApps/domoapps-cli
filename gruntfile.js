var shell = require('shelljs');

module.exports = function(grunt) {

  grunt.initConfig({
    shell: {
      changelog: {
        command: 'npm run changelog; git add CHANGELOG.md'
      }
    },
    release: {
      options: {
        npm: true,
        tagName: 'v<%= version %>',
        commitMessage: 'v<%= version %>',
        beforeRelease: ['shell:changelog'],
        github: {
          repo: 'DomoApps/domoapps-cli',
          usernameVar: 'GITHUB_USERNAME', //ENVIRONMENT VARIABLE that contains Github username
          passwordVar: 'GITHUB_PASSWORD' //ENVIRONMENT VARIABLE that contains Github password
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-release');
};
