var chalk = require('chalk');

module.exports = {
  /**
   * log a success
   */
  ok: function(msg, submessage){
    console.log(chalk.green('\u2713'), msg);
    if(submessage){
      console.log(chalk.gray(submessage));
    }
  },

  /**
   * log info
   */
  info: function(msg, submessage){
    console.log(chalk.cyan(msg));
    if(submessage){
      console.log(chalk.gray(submessage));
    }
  },

  /**
   * log warning
   */
   warn: function(msg, submessage){
     console.log(chalk.yellow(msg));
     if(submessage){
       console.log(chalk.gray(submessage));
     }
   },


  /**
   * log an error and exit node
   */
  fail: function(msg, submessage, result){
    console.log(chalk.red('X'), msg);

    if(submessage){
      console.log(chalk.gray(submessage));
    }

    if(result && result.message){
      console.log(chalk.gray(result.message));
    }

    if (process.argv.indexOf("verbose") !== -1){
      console.log(chalk.red("statusCode:"), result.statusCode);
      if(result.details){
        console.log(chalk.red("details:"), result.details);
      }
      console.log(chalk.red("method:"), result.method);
      console.log(chalk.red("path:"), result.path);
      console.log(chalk.red("response:"), result.res);
    }

    process.exit();
  },

  notAuthenticated: function(login){
    if (!login.devtoken && !login.sid){
      module.exports.fail('Not authenticated', 'Please login using "domo login"');
    }
    else if (login.devtoken){
      module.exports.fail('Not authenticated', 'Your developer token may have expired. Remove it with `domo token remove` then login again.');
    }
    else{
      module.exports.fail('Not authenticated');
    }
  },

  handleErrorMessage: function(err, label){
    label = label || 'Error sending request'
    return label + ': ' + err.message + '\n' + 'Toe: ' + err.res.body.toe;
  }
}
