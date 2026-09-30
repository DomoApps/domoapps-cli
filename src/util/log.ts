import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {getHomeDir} from 'ryuu-client';

const LOG_DIR = path.join(getHomeDir(), 'ryuu', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'error.log');

// Best-effort append of the real error to a persistent log, since console
// output alone gets lost and users can't diagnose or file issues without it.
function writeErrorLog(entry: Record<string, unknown>): void {
  try {
    fs.ensureDirSync(LOG_DIR);
    fs.appendFileSync(
      LOG_FILE,
      JSON.stringify({timestamp: new Date().toISOString(), ...entry}) + '\n',
    );
  } catch {
    // logging must never crash the CLI
  }
}

export class log {
  /**
   * log a success
   */
  static ok(msg: string, submessage?: string): void {
    console.log(chalk.green('\u2713'), msg);
    if (submessage) {
      console.log(submessage);
    }
  }

  /**
   * log info
   */
  static info(msg: string, submessage?: string) {
    console.log(chalk.cyan(msg));
    if (submessage) {
      console.log(submessage);
    }
  }

  /**
   * log warning
   */
  static warn(msg: string, submessage?: string) {
    console.log(chalk.yellow(msg));
    if (submessage) {
      console.log(submessage);
    }
  }

  /**
   * log an error and exit node
   */
  static fail(msg: string, submessage?: string, result?: any) {
    console.log(chalk.red('X'), msg);

    if (submessage) {
      console.log(submessage);
    }

    if (result && result.message) {
      console.log(result.message);
    }

    if (result) {
      if (result.statusCode) {
        console.log(chalk.red('statusCode:'), result.statusCode);
      }
      if (result.method) {
        console.log(chalk.red('method:'), result.method);
      }
      if (result.url) {
        console.log(chalk.red('path:'), result.url);
      }
      if (result.failureMessage) {
        console.log(chalk.red('failureMessage:'), result.failureMessage);
      }

      writeErrorLog({
        command: process.argv.slice(2).join(' '),
        msg,
        submessage,
        error: {
          name: result.name,
          message: result.message,
          statusCode: result.statusCode,
          url: result.url,
          stack: result.stack,
        },
      });

      console.log(chalk.dim(`Full error details logged to ${LOG_FILE}`));
    }

    process.exit(1);
  }

  static notAuthenticated(refreshToken?: string) {
    if (!refreshToken) {
      log.fail(
        'Failure to authenticate',
        'Missing refresh token, please login using `domo login`',
      );
    } else if (refreshToken) {
      log.fail(
        'Not authenticated',
        'Your refresh token may have been revoked. Please login again with `domo login`.',
      );
    } else {
      log.fail('Not authenticated');
    }
  }

  // ERR SHOULD BE AN ERROR?
  static clientRequestFailed(err: string, failureMessage?: string) {
    let message =
      'You are not authenticated or your refresh token may have been revoked. Please login again with `domo login`';
    if (failureMessage) {
      message = failureMessage;
    }
    log.fail(err, message);
  }

  static handleErrorMessage(err: any, label: string): string {
    label = label || 'Error sending request';
    if (!err) return label;

    const detail = err.statusCode
      ? `HTTP ${err.statusCode}${err.message ? `: ${err.message}` : ''}`
      : err.message;

    return detail ? `${label} - ${detail}` : label;
  }
}
