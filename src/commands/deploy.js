const chalk = require('chalk');
const inquirer = require('inquirer');
const axios = require('axios');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const FormData = require('form-data');
const WebSocket = require('ws');
const config = require('../lib/config');
const { API_URL, WEB_URL } = require('../lib/constants');

async function deployCommand() {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const dockDir = path.join(process.cwd(), '.dock');
    const dockConfigPath = path.join(dockDir, 'dock.json');
    let projectId;

    if (fs.existsSync(dockConfigPath)) {
        try {
            const dockConfig = JSON.parse(fs.readFileSync(dockConfigPath, 'utf8'));
            projectId = dockConfig.projectId;
            console.log(chalk.gray(`Found existing project link: ${projectId}`));
        } catch (e) {
            console.log(chalk.yellow('Invalid .dock configuration found.'));
        }
    }

    if (!projectId) {
        console.log(chalk.cyan('No existing project link found.'));

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: 'Link to existing project', value: 'link' },
                    { name: 'Create new project', value: 'create' }
                ]
            }
        ]);

        if (action === 'link') {
            const spinner = ora('Fetching projects...').start();
            try {
                const res = await axios.get(`${API_URL}/projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                spinner.stop();

                const projects = res.data;
                if (projects.length === 0) {
                    console.log(chalk.yellow('No projects found. Please create one first.'));
                    return;
                }

                const answer = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selectedId',
                        message: 'Select project to deploy to:',
                        choices: projects.map(p => ({ name: p.name + (p.github_repo ? ` (${p.github_repo})` : ''), value: p.id }))
                    }
                ]);
                projectId = answer.selectedId;

            } catch (error) {
                spinner.stop();
                console.log(chalk.red('Failed to fetch projects.'));
                return;
            }
        } else {
            const defaults = {
                name: path.basename(process.cwd()),
                type: 'node'
            };

            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Project Name:',
                    default: defaults.name,
                    validate: input => /^[a-zA-Z0-9-_]+$/.test(input) ? true : 'Name can only contain letters, numbers, dashes and underscores.'
                },
                {
                    type: 'list',
                    name: 'type',
                    message: 'Project Type:',
                    choices: ['node', 'python', 'php', 'go', 'static', 'html'],
                    default: defaults.type
                }
            ]);

            const spinner = ora('Creating project...').start();
            try {
                const res = await axios.post(`${API_URL}/projects`, {
                    name: answers.name,
                    type: answers.type,
                    skip_deploy: true
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                spinner.succeed(chalk.green(`Project ${answers.name} created!`));
                projectId = res.data.id;
            } catch (error) {
                spinner.fail(chalk.red('Failed to create project.'));
                if (error.response) {
                    console.log(chalk.red(`Error: ${error.response.data.error || error.response.statusText}`));
                } else {
                    console.log(chalk.red(`Error: ${error.message}`));
                }
                return;
            }
        }

        if (projectId) {
            if (!fs.existsSync(dockDir)) {
                fs.mkdirSync(dockDir);
            }
            fs.writeFileSync(dockConfigPath, JSON.stringify({ projectId }, null, 2));
            console.log(chalk.green(`Linked to project ${projectId} (saved to .dock/dock.json)`));
        }
    }

    if (!projectId) return;

    const zipPath = path.join(process.cwd(), 'project.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
        console.log(chalk.gray(`\nZipped ${archive.pointer()} total bytes`));

        const uploadSpinner = ora('Uploading and building project...').start();

        const form = new FormData();
        form.append('file', fs.createReadStream(zipPath));

        try {
            await axios.post(`${API_URL}/projects/${projectId}/deploy-file`, form, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...form.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            uploadSpinner.succeed(chalk.green('Deployment triggered successfully!'));

            console.log(chalk.blue(`Monitor your deployment at: ${WEB_URL}/projects/${projectId}`));
            console.log(chalk.yellow('Waiting for build logs...'));

            const wsUrl = API_URL.replace('http', 'ws') + '/ws?token=' + token;
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
                ws.send(JSON.stringify({ channel: `project:${projectId}:build`, data: 'subscribe' }));
            });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data);
                    if (msg.channel === `project:${projectId}:build`) {
                        const log = msg.data;
                        if (typeof log === 'string') {
                            process.stdout.write(chalk.gray(log + '\n'));

                            if (log.includes('Deployment Complete') || log.includes('Success')) {
                                console.log(chalk.green('\nDeployment Successful! 🚀'));
                                ws.close();
                                process.exit(0);
                            }
                            if (log.includes('Deployment crashed unexpectedly')) {
                                console.log(chalk.red('\nDeployment Failed! ❌'));
                                ws.close();
                                process.exit(1);
                            }
                        }
                    }
                } catch (e) {
                }
            });

            ws.on('error', (err) => {
                console.log(chalk.red('Log stream error: ' + err.message));
                process.exit(0); // Exit gracefully, deployment continues on server
            });

            setTimeout(() => {
                console.log(chalk.yellow('Log stream timeout. Deployment continues on server.'));
                process.exit(0);
            }, 600000);

        } catch (error) {
            uploadSpinner.fail(chalk.red('Deployment failed'));
            if (error.response) {
                console.log(chalk.red(`Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`));
            } else {
                console.log(chalk.red(`Error: ${error.message}`));
            }
            fs.unlinkSync(zipPath);
            process.exit(1);
        }
    });

    archive.on('error', (err) => {
        console.log(chalk.red('Archiving error: ' + err.message));
        process.exit(1);
    });

    archive.pipe(output);

    console.log(chalk.cyan('Zipping project files...'));
    archive.glob('**/*', {
        cwd: process.cwd(),
        ignore: ['node_modules/**', '.git/**', '.dock/**', 'project.zip', '.env']
    });

    archive.finalize();
}

module.exports = deployCommand;
