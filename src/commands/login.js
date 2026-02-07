const chalk = require('chalk');
const express = require('express');
const http = require('http');
const open = require('open');
const config = require('../lib/config');
const { WEB_URL } = require('../lib/constants');

async function loginCommand() {
    console.log(chalk.blue('Initiating login...'));

    const app = express();
    const server = http.createServer(app);

    const PORT = 4242;

    app.get('/callback', (req, res) => {
        const { token, user } = req.query;

        if (token) {
            config.set('token', token);
            if (user) {
                try {
                    const userData = JSON.parse(decodeURIComponent(user));
                    config.set('user', userData);
                    console.log(chalk.green(`\nSuccessfully logged in as ${userData.username || 'user'}!`));
                } catch (e) {
                    config.set('user', { name: 'User' });
                    console.log(chalk.green('\nSuccessfully logged in!'));
                }
            } else {
                console.log(chalk.green('\nSuccessfully logged in!'));
            }

            res.send(`
          <html>
            <body style="background:#111; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
              <div style="text-align:center;">
                <h1 style="color:#4ade80;">Login Successful</h1>
                <p>You can close this window and return to the terminal.</p>
              </div>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);

            server.close();
            process.exit(0);
        } else {
            res.status(400).send('Login failed: No token received');
            console.log(chalk.red('\nLogin failed: No token received'));
            server.close();
            process.exit(1);
        }
    });

    server.listen(PORT, async () => {
        const loginUrl = `${WEB_URL}/cli-login?callback=http://localhost:${PORT}/callback`;
        console.log(chalk.yellow(`Opening browser to: ${loginUrl}`));
        await open(loginUrl);
        console.log(chalk.gray('Waiting for authentication...'));
    });
}

module.exports = loginCommand;
