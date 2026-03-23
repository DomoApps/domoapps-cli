import {log} from '../util/log.js';
import {Command} from 'commander';
import Configstore from 'configstore';
import {createConfirm} from '../util/prompts.js';
import {ProxyCommandOptions} from '../models/index.js';

export default function (program: Command) {
  program
    .command('proxy [host] [port]')
    .description(
      'configure the proxy through which you wish to send all commands',
    )
    //.option('-u, --username <value>, Username for authentication based proxy')
    //.option('-p, --password <value>, Password for authentication based proxy')
    .option('-r, --remove-proxy', 'Remove current proxy settings')
    .option(
      '-a, --auth, Flag for if you wish to enter a username for your corporate proxy (password will be prompted on each command)',
    )
    .action(async function (
      host: string,
      port: string,
      options: ProxyCommandOptions,
    ) {
      if (options.removeProxy) {
        const proxy = new Configstore('/proxy');
        proxy.delete('host');
        proxy.delete('port');
        proxy.delete('username');
        log.ok('Proxy Removed!');
      } else {
        const prompts = [];
        if (options.auth) {
          prompts.push({
            type: 'input',
            message: 'Please enter your username:',
            name: 'username',
          });
        }
        const shouldSetProxy = await createConfirm(
          `You are about to set all requests to go through proxy ${host}:${port}, are you sure you want to do this?`,
          false,
        );

        if (shouldSetProxy) {
          handleUserResponse({proxy: true, username: '', password: ''});
        } else {
          log.info('Proxy not set');
        }
      }

      function handleUserResponse(answer: {
        username: string;
        password: string;
        proxy: boolean;
      }) {
        if (answer.proxy) {
          const proxy = new Configstore('/proxy');
          proxy.set('host', host);
          proxy.set('port', port);
          proxy.set('username', answer.username);
          log.ok('Proxy set for all future commands');
        } else {
          log.fail('Proxy command aborted');
        }
      }
    });
}
