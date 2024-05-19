import {AxiosRequestConfig} from 'axios';
import {log} from './log';
import Domo = require('ryuu-client');

export class Session {
  static check(domo: Domo) {
    return new Promise((resolve, reject) => {
      var options: AxiosRequestConfig = {
        url: 'https://' + domo.getInstance() + '/auth/validate',
        method: 'GET',
      };
      domo
        .processRequest(options)
        .then((res: any) => {
          try {
            if (res.isValid) {
              resolve(true);
            } else {
              reject(false);
            }
          } catch (e) {
            // couldn't parse as JSON which means the service doesn't exist yet.
            // TODO: remove this once the /domoweb/auth/validate service has shipped to prod
            resolve(true);
          }
        })
        .catch(err => {
          log.clientRequestFailed(
            err.statusCode + ' - ' + err.message,
            err.failureMessage,
          );
        });
    });
  }
}
