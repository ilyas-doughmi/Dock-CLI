const chalk = require('chalk');
const config = require('../lib/config');

function logoutCommand() {
    const user = config.get('user');
    config.delete('token');
    config.delete('user');

    if (user && user.username) {
        console.log(chalk.green(`Logged out ${user.username} successfully!`));
    } else {
        console.log(chalk.green('Logged out successfully!'));
    }
}

module.exports = logoutCommand;
