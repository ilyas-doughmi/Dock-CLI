import chalk from 'chalk';

export const info = (msg) => console.log(chalk.blue('ℹ') + ' ' + msg);
export const success = (msg) => console.log(chalk.green('✔') + ' ' + chalk.green(msg));
export const error = (msg) => console.log(chalk.red('✖') + ' ' + chalk.red(msg));
export const warning = (msg) => console.log(chalk.yellow('⚠') + ' ' + chalk.yellow(msg));
