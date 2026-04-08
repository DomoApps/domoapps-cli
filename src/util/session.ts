import {log} from './log.js';
import type {RyuuClient, RyuuHttpError} from 'ryuu-client';

export class Session {
  static async check(domo: RyuuClient): Promise<boolean> {
    try {
      const res = await domo.request<{isValid?: boolean}>(
        `https://${domo.instance}/auth/validate`,
        {method: 'GET'},
      );
      if (res.isValid) {
        return true;
      }
      throw false;
    } catch (err: any) {
      if (err === false) throw false;
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
