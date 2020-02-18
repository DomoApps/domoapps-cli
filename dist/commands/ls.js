"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var login_1 = require("../util/login");
var log_1 = require("../util/log");
var session_1 = require("../util/session");
var chalk_1 = require("chalk");
module.exports = function (program) {
    program
        .command('ls')
        .description('get a list of all your Custom App designs')
        .option('-a, --all', 'List all custom apps on instance (admin role required)')
        .action(function (options) {
        login_1.Login.getMostRecentLogin().then(function (domo) {
            session_1.Session.check(domo)
                .then(function () {
                domo.getSimpleDesigns().then(function (designs) {
                    //if(options.all){}
                    //else {
                    //domo.getLoginUser().then(function(user) {
                    //@ts-ignore
                    //designs.filter(design => design.id == user.id);
                    //});
                    //}
                    var windowWidth = process.stdout.columns;
                    if (windowWidth >= 130) {
                        var Table = require('cli-table');
                        // instantiate
                        var table = new Table({
                            head: [chalk_1.default.cyan('Design Name'), chalk_1.default.cyan('Design Id'), chalk_1.default.cyan('Date Created'), chalk_1.default.cyan('Last Updated')],
                            colWidths: [(windowWidth - 105), 38, 31, 31]
                        });
                        designs.forEach(function (design) {
                            table.push([design.design.name, design.design.id, new Date(design.design.createdDate).toUTCString(), new Date(design.design.lastModifiedDate).toUTCString()]);
                        });
                        console.log(table.toString());
                    }
                    else {
                        designs.forEach(function (design) {
                            console.log('Design Name: ' + design.design.name);
                            console.log('Design Id: ' + design.design.id);
                            console.log('Date Created: ' + new Date(design.design.createdDate).toUTCString());
                            console.log('Last Updated: ' + new Date(design.design.lastModifiedDate).toUTCString() + '\n');
                        });
                    }
                    if (designs.length === 0) {
                        log_1.log.fail('No Designs Published', "`domo ls` will list designs once they're published to Domo");
                    }
                })
                    .catch(function (e) {
                    log_1.log.fail('Unable to fetch designs', 'You may not have any designs published yet.');
                })
                    .finally(process.exit);
            });
        }).catch(log_1.log.notAuthenticated);
    });
};
//# sourceMappingURL=ls.js.map