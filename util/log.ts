import chalk from 'chalk';
import { DomoRequestError } from 'ryuu-client/models';

export class log {
  /**
   * log a success
   */
  static ok(msg: string, submessage?: string): void {
    console.log(chalk.green('\u2713'), msg);
    if(submessage){
      console.log(chalk.gray(submessage));
    }
  }

  /**
   * log info
   */
  static info(msg: string, submessage?: string) {
    console.log(chalk.cyan(msg));
    if(submessage){
      console.log(chalk.gray(submessage));
    }
  }

  /**
   * log warning
   */
   static warn(msg: string, submessage?: string) {
     console.log(chalk.yellow(msg));
     if(submessage){
       console.log(chalk.gray(submessage));
     }
   }


  /**
   * log an error and exit node
   */
  static fail(msg: string, submessage?: string, result?: DomoRequestError) {
    console.log(chalk.red('X'), msg);

    if(submessage){
      console.log(chalk.gray(submessage));
    }

    if(result && result.message){
      console.log(chalk.gray(result.message));
    }

    if (process.argv.indexOf("verbose") !== -1){
      console.log(chalk.red("statusCode:"), result.statusCode);
      console.log(chalk.red("method:"), result.method);
      console.log(chalk.red("path:"), result.url);
      console.log(chalk.red("failureMessage:"), result.failureMessage);
    }

    process.exit(1);
  }

  static notAuthenticated(refreshToken?: string) {
    if (!refreshToken){
      module.exports.fail('Not authenticated', 'Please login using "domo login"');
    }
    else if (refreshToken){
      module.exports.fail('Not authenticated', 'Your refresh token may have been revoked. Please login again with "domo login".');
    }
    else{
      module.exports.fail('Not authenticated');
    }
  }

// ERR SHOULD BE AN ERROR?
  static clientRequestFailed(err: string, failureMessage?: string) {
    let message = "You are not authenticated or your refresh token may have been revoked. Please login again with \"domo login\"";
    if (failureMessage) {
      message = failureMessage;
    }
    module.exports.fail(err, message);
  }

  static handleErrorMessage(err: Error, label: string): string {
    label = label || 'Error sending request'
    //const toe = err && err.res && err.res.body;

    return label; //+ toe
  }
}
