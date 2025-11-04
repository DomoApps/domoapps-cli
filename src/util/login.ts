import glob = require('glob');
import fs = require('fs-extra');
import path = require('path');
import {login, constant} from '../models';
import Domo = require('ryuu-client');
import {log} from './log';
const Configstore = require('configstore');
const inquirer = require('inquirer');
const prompt = inquirer.createPromptModule();
const home = Domo.getHomeDir();

export class Login {
  login: any;
  proxy: any;
  instance: string;

  constructor(instance?: string) {
    this.instance = instance ?? Login.getCurrentLogin().instance;
    this.login = new Configstore.default(`ryuu/${this.instance}`);
    this.proxy = new Configstore.default('proxy');
    if (this.instance === '')
      log.fail('You have not logged into any Domo instances');
  }
  static getCurrentLogin = (): login => {
    const allLogins = glob.sync(home + '/ryuu/*.json');
    // If there are no logins, return an empty object
    if (allLogins.length === 0) {
      return {instance: ''};
    }
    const currentLogin = allLogins.reduce((prev, next) => {
      return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
    });
    return fs.readJsonSync(currentLogin);
  };

  static getPreviousLogins(): Array<login> {
    const logins = (glob.sync(home + '/ryuu/*.json') || []).map(
      (file: string) => {
        return fs.readJsonSync(file);
      },
    );
    return logins;
  }

  /**
   * persist login to user's domo home
   */
  persistLogin(refreshToken: string, devToken?: boolean | undefined) {
    this.login.set('instance', this.instance);
    this.login.set('refreshToken', refreshToken);
    this.login.set('devToken', !!devToken);
    return {instance: this.instance, refreshToken, devToken};
  }

  removeDevToken() {
    this.deleteRefreshToken();
    this.login.set('devToken', false);
  }
  deleteRefreshToken() {
    this.login.delete('refreshToken');
  }

  static removeLogin(instance: string) {
    const loginFile = path.resolve(home + '/ryuu/' + instance + '.json');
    fs.ensureFileSync(loginFile);
    return fs.unlink(loginFile);
  }

  static removeAllLogins() {
    fs.emptyDirSync(home + '/ryuu/');
  }

  static verifyLogin(login: login): void {
    verifyLoginLocal(login);
  }

  logout() {
    log.info(`Attempting to log out from ${this.instance}`);
    if (this.login.has('refreshToken')) {
      this.deleteRefreshToken();
      if (!this.login.has('refreshToken')) {
        log.ok('Successful logout from ' + this.instance);
      } else {
        log.fail(`Failed logout from ${this.instance}`);
      }
    } else {
      log.ok(`Not currently logged into ${this.instance}`);
    }
  }

  async getClient() {
    const refreshToken = this.login.get('refreshToken');

    try {
      const username = this.proxy.get('username');
      const host = this.proxy.get('host');
      const port = this.proxy.get('port');

      if (!username)
        return new Domo(
          this.instance,
          refreshToken,
          constant.CLIENT_ID,
          {host, port},
          this.login.get('devToken'),
        );

      const answers = await prompt([
        {
          type: 'password',
          message: 'Please enter your password:',
          name: 'pass',
        },
      ]);
      return new Domo(
        this.instance,
        refreshToken,
        constant.CLIENT_ID,
        {
          host,
          port,
          username,
          password: answers.pass,
        } as any,
        this.login.get('devToken'),
      );
    } catch {
      return new Domo(this.instance, refreshToken, constant.CLIENT_ID);
    }
  }
}

//const getLogin =

function verifyLoginLocal(login: login): void {
  if (!login.refreshToken)
    log.fail('Not authenticated', 'Please login using "domo login"');
}
