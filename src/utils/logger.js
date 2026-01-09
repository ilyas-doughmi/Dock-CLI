const chalk = require('chalk');

module.exports = {
  info: (msg) => console.log(chalk.blue('ℹ') + ' ' + msg),
  success: (msg) => console.log(chalk.green('✔') + ' ' + chalk.green(msg)),
  error: (msg) => console.log(chalk.red('✖') + ' ' + chalk.red(msg)),
  warning: (msg) => console.log(chalk.yellow('⚠') + ' ' + chalk.yellow(msg))
};