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

            // Auto-detect project type
            if (fs.existsSync(path.join(process.cwd(), 'docker-compose.yml')) || fs.existsSync(path.join(process.cwd(), 'docker-compose.yaml'))) {
                defaults.type = 'docker';
            } else if (fs.existsSync(path.join(process.cwd(), 'Dockerfile'))) {
                defaults.type = 'docker';
            } else if (fs.existsSync(path.join(process.cwd(), 'artisan'))) {
                defaults.type = 'laravel'; // Laravel specific
            } else if (fs.existsSync(path.join(process.cwd(), 'pom.xml'))) {
                defaults.type = 'spring-boot';
            } else if (fs.existsSync(path.join(process.cwd(), 'requirements.txt'))) {
                defaults.type = 'python';
            } else if (fs.existsSync(path.join(process.cwd(), 'composer.json')) || fs.existsSync(path.join(process.cwd(), 'index.php'))) {
                defaults.type = 'php';
            } else if (fs.existsSync(path.join(process.cwd(), 'go.mod'))) {
                defaults.type = 'go';
            }

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
                    choices: [
                        { name: 'Node.js', value: 'node' },
                        { name: 'Python (Flask)', value: 'python' },
                        { name: 'PHP (Generic)', value: 'php' },
                        { name: 'PHP (Laravel)', value: 'laravel' },
                        { name: 'Go', value: 'go' },
                        { name: 'Java (Spring Boot)', value: 'spring-boot' },
                        { name: 'Docker (Dockerfile/Compose)', value: 'docker' },
                        { name: 'Static HTML', value: 'html' }
                    ],
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
        console.log(chalk.gray(`Zipped ${archive.pointer()} total bytes`));

        const wsUrl = API_URL.replace('http', 'ws') + '/ws?token=' + token;
        const buildChannel = `project:${projectId}:build`;
        let wsReady = false;
        let deployDone = false;
        let lineCount = 0;

        const cleanup = () => {
            try { fs.unlinkSync(zipPath); } catch (e) {}
        };

        // ── STEP 1: Connect WebSocket BEFORE triggering deploy ──
        const ws = new WebSocket(wsUrl, {
            perMessageDeflate: false,
            handshakeTimeout: 10000,
        });

        // Respond to server pings automatically (ws library does this by default)
        // Also send our own pings as extra keepalive
        let pingInterval;

        const wsReadyPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 10000);

            ws.on('open', () => {
                clearTimeout(timeout);
                ws.send(JSON.stringify({ channel: buildChannel, data: 'subscribe' }));
                wsReady = true;

                // Send client-side pings every 10s to keep connection alive
                pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        try { ws.ping(); } catch (e) {}
                    }
                }, 10000);

                resolve();
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        try {
            await wsReadyPromise;
        } catch (err) {
            console.log(chalk.yellow('Could not connect to log stream: ' + err.message));
            console.log(chalk.yellow('Deploying without live logs...'));
        }

        // ── STEP 2: Upload and trigger deploy ──
        const uploadSpinner = ora('Uploading project...').start();
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
            uploadSpinner.succeed(chalk.green('Deployment triggered!'));
            console.log(chalk.blue(`Dashboard: ${WEB_URL}/projects/${projectId}\n`));

            if (!wsReady) {
                cleanup();
                process.exit(0);
            }
        } catch (error) {
            uploadSpinner.fail(chalk.red('Upload failed'));
            const msg = error.response
                ? `${error.response.status} - ${JSON.stringify(error.response.data)}`
                : error.message;
            console.log(chalk.red(msg));
            if (ws.readyState === WebSocket.OPEN) ws.close();
            if (pingInterval) clearInterval(pingInterval);
            cleanup();
            process.exit(1);
        }

        // ── STEP 3: Stream logs ──
        const finish = (success) => {
            if (deployDone) return;
            deployDone = true;
            if (pingInterval) clearInterval(pingInterval);

            console.log('');
            if (success) {
                console.log(chalk.green.bold('  ✓ Deployment Successful! 🚀'));
            } else {
                console.log(chalk.red.bold('  ✗ Deployment Failed'));
            }
            console.log('');

            if (ws.readyState === WebSocket.OPEN) ws.close();
            cleanup();
            process.exit(success ? 0 : 1);
        };

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw);
                if (msg.channel !== buildChannel) return;

                const line = msg.data;
                if (typeof line !== 'string') return;

                // End signal
                if (line.startsWith('__DEPLOY_END__:')) {
                    finish(line.includes('success'));
                    return;
                }
                if (line.startsWith('__')) return;

                lineCount++;

                // Format output with line prefix
                const prefix = chalk.dim(`  │ `);

                if (line.includes('Deployment Complete')) {
                    console.log(prefix + chalk.green.bold(line));
                } else if (line.includes('Error') || line.includes('FAILURE') || line.includes('failed') || line.includes('FATAL')) {
                    console.log(prefix + chalk.red(line));
                } else if (line.includes('Warning') || line.includes('warning')) {
                    console.log(prefix + chalk.yellow(line));
                } else if (line.includes('Starting') || line.includes('Creating') || line.includes('Pulling') || line.includes('Waiting')) {
                    console.log(prefix + chalk.cyan(line));
                } else if (line.includes('ready') || line.includes('Complete') || line.includes('Success') || line.includes('successfully')) {
                    console.log(prefix + chalk.green(line));
                } else {
                    console.log(prefix + chalk.gray(line));
                }
            } catch (e) {}
        });

        ws.on('close', () => {
            if (!deployDone) {
                if (pingInterval) clearInterval(pingInterval);
                console.log(chalk.yellow('\n  Log stream disconnected. Deployment continues on server.'));
                console.log(chalk.blue(`  Check: ${WEB_URL}/projects/${projectId}`));
                cleanup();
                process.exit(0);
            }
        });

        ws.on('error', (err) => {
            if (!deployDone) {
                if (pingInterval) clearInterval(pingInterval);
                console.log(chalk.red('\n  Log stream error: ' + err.message));
                cleanup();
                process.exit(0);
            }
        });

        // Safety timeout: 10 minutes
        setTimeout(() => {
            if (!deployDone) {
                if (pingInterval) clearInterval(pingInterval);
                console.log(chalk.yellow(`\n  Timeout (10min). Received ${lineCount} log lines.`));
                console.log(chalk.blue(`  Check: ${WEB_URL}/projects/${projectId}`));
                if (ws.readyState === WebSocket.OPEN) ws.close();
                cleanup();
                process.exit(0);
            }
        }, 600000);
    });

    archive.on('error', (err) => {
        console.log(chalk.red('Archiving error: ' + err.message));
        process.exit(1);
    });

    archive.pipe(output);

    console.log(chalk.cyan('Zipping project files...'));

    const ignorePatterns = ['node_modules/**', 'vendor/**', '.git/**', '.dock/**', 'project.zip'];
    const dockIgnorePath = path.join(process.cwd(), '.dockignore');

    if (fs.existsSync(dockIgnorePath)) {
        console.log(chalk.gray('Using .dockignore'));
        const dockIgnore = fs.readFileSync(dockIgnorePath, 'utf8').split('\n');

        dockIgnore.forEach(line => {
            const pattern = line.trim();
            if (pattern && !pattern.startsWith('#')) {
                ignorePatterns.push(pattern);
                // Also ignore directory contents if it matches a folder
                if (pattern.endsWith('/')) {
                    ignorePatterns.push(pattern + '**');
                }
            }
        });
    }

    archive.glob('**/*', {
        cwd: process.cwd(),
        ignore: ignorePatterns,
        dot: true // Include dotfiles (like .env.example) but ignore will filter them out if needed
    });

    archive.finalize();
}

module.exports = deployCommand;
