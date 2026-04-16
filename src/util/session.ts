import {log} from './log.js';
import type {RyuuClient} from 'ryuu-client';

export class Session {
  static async check(domo: RyuuClient): Promise<boolean> {
    try {
      await domo.users.getUserInfo();
      return true;
    } catch (err: any) {
      if (err.statusCode) {
        log.clientRequestFailed(
          err.statusCode + ' - ' + err.message,
          err.failureMessage ?? '',
        );
      }
      throw false;
    }
  }
}
