import {Login} from '../util/login';
import {Command} from 'commander';
import {log} from '../util/log';
import * as chalk from 'chalk';

module.exports = function (program: Command) {
  program
    .command('ls')
    .description('get a list of all your Custom App designs')
    .option(
      '-a, --all',
      'List all designs on current instance (admin role required)',
    )
    .option('-d, --deleted', 'Include deleted designs on current instance')
    .action(options => {
      const params = {
        deleted: options.deleted ?? false,
        checkAdminAuthority: options.all ?? false,
      };
      new Login().getClient().then(client => {
        client
          .getDesigns(params)
          .then(designs => {
            if (designs.length === 0) {
              log.fail(
                'No Designs Published',
                "`domo ls` will list designs once they're published to Domo",
              );
            }

            const windowWidth = process.stdout.columns;
            if (windowWidth >= 130) {
              const Table = require('cli-table');

              // instantiate
              const table = new Table({
                head: [
                  chalk.cyan('Design Name'),
                  chalk.cyan('Design Id'),
                  chalk.cyan('Date Created'),
                  chalk.cyan('Last Updated'),
                ],
                colWidths: [windowWidth - 105, 38, 31, 31],
              });

              designs.forEach(function (design) {
                table.push([
                  design.name,
                  design.id,
                  new Date(design.createdDate).toUTCString(),
                  new Date(design.updatedDate).toUTCString(),
                ]);
              });

              console.log(table.toString());
            } else {
              designs.forEach(design => {
                console.log('Design Name: ' + design.name);
                console.log('Design Id: ' + design.id);
                console.log(
                  'Date Created: ' + new Date(design.createdDate).toUTCString(),
                );
                console.log(
                  'Last Updated: ' +
                    new Date(design.updatedDate).toUTCString() +
                    '\n',
                );
              });
            }
          })
          .catch(function (e) {
            log.fail(
              'Unable to fetch designs',
              'You may not have any designs published yet.',
            );
          });
      });
    });
};
