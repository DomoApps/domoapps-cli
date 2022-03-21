import glob = require("glob");
import fs = require("fs-extra");
import path = require("path");
import { login, constant, ProxyOptions } from "../models";
import Domo = require("ryuu-client");
import { log } from "./log";
import Configstore = require("configstore");
import inquirer = require("inquirer");
const home = Domo.getHomeDir();

export class Login {
  static getMostRecent(): Promise<string> {
    var logins = glob.sync(home + "/ryuu/*.json");
    //If there are no logins, return a rejection as the user is unauthenticated.
    if (logins.length === 0) {
      //@ts-ignore
      return Promise.resolve({});
    }
    var recent = logins.reduce(function (prev, next) {
      return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
    });
    var loginData: login = fs.readJsonSync(recent);
    return Promise.resolve(loginData.instance);
  }
  static getMostRecentLogin(mayNotBeAuthenticated?: boolean): Promise<Domo> {
    return this.getMostRecent().then((instance) => {
      return this.getLogin(instance);
    });
  }

  static getPreviousLogins(): Array<login> {
    var logins = (glob.sync(home + "/ryuu/*.json") || []).map(function (
      file: string
    ) {
      return fs.readJsonSync(file);
    });
    return logins;
  }

  /**
   * persist login to user's domo home
   */
  static persistLogin(
    instance: string,
    refreshToken: string,
    devToken?: boolean | undefined
  ): login {
    const configstore = new Configstore("/ryuu/" + instance);
    configstore.set("instance", instance);
    configstore.set("refreshToken", refreshToken);
    configstore.set("devToken", !!devToken);
    return { instance, refreshToken, devToken };
  }

  static removeDevToken(instance: string) {
    const configstore = new Configstore("/ryuu/" + instance);
    deleteRefreshToken(instance);
    configstore.set("devToken", false);
  }

  static removeLogin(instance: string) {
    const loginFile = path.resolve(home + "/ryuu/" + instance + ".json");
    fs.ensureFileSync(loginFile);
    return fs.unlink(loginFile);
  }

  static removeAllLogins() {
    fs.emptyDirSync(home + "/ryuu/");
  }

  static verifyLogin(login: login): void {
    verifyLoginLocal(login);
  }

  static logout(login: Domo) {
    const instance = login.getInstance();
    deleteRefreshToken(instance);
    const configstore = new Configstore("/ryuu/" + instance);
    if (!configstore.get("refreshToken")) {
      log.ok("Successful logout from " + instance);
      return Promise.resolve(true);
    }
    log.fail(`Failed logout from ${instance}`);
    return Promise.resolve(false);
  }

  static getLogin(instance: string) {
    const configstore = new Configstore("/ryuu/" + instance);
    const proxy = new Configstore("/proxy");
    const username = proxy.get("username");
    if (username) {
      return inquirer
        .prompt([
          {
            type: "password",
            message: "Please enter your password:",
            name: "pass",
          },
        ])
        .then((answers) => {
          return Promise.resolve(
            new Domo(
              instance,
              configstore.get("refreshToken"),
              constant.CLIENT_ID,
              {
                host: proxy.get("host"),
                port: proxy.get("port"),
                //@ts-ignore
                username: proxy.get("username"),
                password: answers.pass,
              },
              configstore.get("devToken")
            )
          );
        });
    } else {
      try {
        return Promise.resolve(
          new Domo(
            instance,
            configstore.get("refreshToken"),
            constant.CLIENT_ID,
            { host: proxy.get("host"), port: proxy.get("port") },
            configstore.get("devToken")
          )
        );
      } catch (ex) {
        return Promise.resolve(
          new Domo(
            instance,
            configstore.get("refreshToken"),
            constant.CLIENT_ID
          )
        );
      }
    }
  }
}

function verifyLoginLocal(login: login): void {
  if (!login.refreshToken)
    log.fail("Not authenticated", 'Please login using "domo login"');
}

function deleteRefreshToken(instance: string) {
  const configstore = new Configstore("/ryuu/" + instance);
  configstore.all = {
    instance: configstore.get("instance"),
    devToken: false,
  };
}
