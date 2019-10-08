'use strict';
var fs = require('fs');
var compareFunc = require('compare-func');
var resolve = require('path').resolve;
var path = require('path');
var pkgJson = {};
var gufg = require('github-url-from-git');
try {
    pkgJson = require(path.resolve(process.cwd(), './package.json'));
}
catch (err) {
    console.error('no root package.json found');
}
var parserOpts = {
    headerPattern: /^\((.*)\)((.*))$/,
    headerCorrespondence: [
        'type',
        'subject'
    ],
    noteKeywords: 'BREAKING CHANGE'
};
function issueUrl() {
    var url = null;
    if (pkgJson.repository && pkgJson.repository.url && ~pkgJson.repository.url.indexOf('github.com')) {
        var gitUrl = gufg(pkgJson.repository.url);
        if (gitUrl) {
            return gitUrl + '/issues/';
        }
        else {
            return url;
        }
    }
}
var writerOpts = {
    transform: function (commit) {
        if (commit.body) {
            var match = commit.body.match(/(https:\/\/trello.com\/.*)/);
            if (match) {
                commit.ticket = match[1];
            }
        }
        if (commit.type === 'feature') {
            commit.type = 'Features';
        }
        else if (commit.type === 'fix') {
            commit.type = 'Bug Fixes';
        }
        else if (commit.type === 'perf') {
            commit.type = 'Performance Improvements';
        }
        else if (commit.type === 'mana') {
            commit.type = 'Technical Improvements';
        }
        else if (commit.type === 'polish') {
            commit.type = 'User Experience Polish';
        }
        else if (commit.type === 'test') {
            commit.type = 'Tests';
        }
        else if (commit.header.indexOf(commit.version) !== -1) {
            // don't display version commits
            return;
        }
        else {
            commit.type = 'Technical Improvements';
        }
        if (commit.scope === '*') {
            commit.scope = '';
        }
        if (typeof commit.hash === 'string') {
            commit.hash = commit.hash.substring(0, 7);
        }
        if (typeof commit.subject === 'string') {
            var url = issueUrl();
            if (url) {
                // GitHub issue URLs.
                commit.subject = commit.subject.replace(/( ?)#([0-9]+)(\b|^)/g, '$1[#$2](' + url + '$2)$3');
            }
            // GitHub user URLs.
            commit.subject = commit.subject.replace(/( ?)@([a-zA-Z0-9_]+)(\b|^)/g, '$1[@$2](https://github.com/$2)$3');
            commit.subject = commit.subject;
        }
        return commit;
    },
    groupBy: 'type',
    commitGroupsSort: 'title',
    commitsSort: ['subject'],
    noteGroupsSort: 'title',
    notesSort: compareFunc
};
writerOpts.mainTemplate = fs.readFileSync(resolve(__dirname, 'templates/template.hbs'), 'utf-8');
writerOpts.headerPartial = fs.readFileSync(resolve(__dirname, 'templates/header.hbs'), 'utf-8');
writerOpts.commitPartial = fs.readFileSync(resolve(__dirname, 'templates/commit.hbs'), 'utf-8');
writerOpts.footerPartial = fs.readFileSync(resolve(__dirname, 'templates/footer.hbs'), 'utf-8');
module.exports = {
    parserOpts: parserOpts,
    writerOpts: writerOpts
};
//# sourceMappingURL=changelog.js.map