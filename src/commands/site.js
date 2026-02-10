const chalk = require('chalk');
const inquirer = require('inquirer');
const axios = require('axios');
const ora = require('ora');
const readline = require('readline');
const config = require('../lib/config');
const { API_URL } = require('../lib/constants');

function getHeaders() {
    const token = config.get('token');
    return { Authorization: `Bearer ${token}` };
}

// ─── dock site list ─────────────────────────────────────────────
async function siteListCommand() {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const spinner = ora('Fetching projects...').start();
    try {
        const res = await axios.get(`${API_URL}/projects`, { headers: getHeaders() });
        spinner.stop();

        const projects = res.data;
        if (!projects || projects.length === 0) {
            console.log(chalk.yellow('No projects found.'));
            return;
        }

        console.log(chalk.bold('\n  Your Projects\n'));
        console.log(chalk.gray('  ' + '─'.repeat(70)));

        for (const p of projects) {
            const statusColor = p.status === 'running' ? chalk.green : chalk.red;
            const domain = p.custom_domain || p.subdomain || '';
            console.log(
                `  ${chalk.bold(p.name)}  ${chalk.gray('|')}  ${chalk.cyan(p.type)}  ${chalk.gray('|')}  ${statusColor(p.status)}  ${chalk.gray('|')}  ${chalk.blue(domain)}`
            );
        }
        console.log(chalk.gray('  ' + '─'.repeat(70)));
        console.log(chalk.gray(`\n  ${projects.length} project(s) total\n`));

    } catch (error) {
        spinner.stop();
        if (error.response && error.response.status === 401) {
            console.log(chalk.red('Session expired. Run `dock login` again.'));
        } else {
            console.log(chalk.red('Failed to fetch projects: ' + (error.response?.data?.error || error.message)));
        }
    }
}

// ─── dock site exec <name> <command> ────────────────────────────
async function siteExecCommand(projectName, command) {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const project = await selectProject(projectName);
    if (!project) return;

    if (!command) {
        const answer = await inquirer.prompt([
            {
                type: 'input',
                name: 'command',
                message: 'Enter command to execute:',
                validate: input => input.trim() ? true : 'Command cannot be empty.'
            }
        ]);
        command = answer.command;
    }

    await executeInProject(project.id, command);
}

// ─── dock site shell <name> (interactive) ───────────────────────
async function siteShellCommand(projectName) {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const project = await selectProject(projectName);
    if (!project) return;

    const pType = String(project.type || '').toLowerCase();
    console.log(chalk.bold(`\n  Connected to ${chalk.cyan(project.name)} (${pType})`));
    console.log(chalk.gray(`  URL: ${project.subdomain}`));
    console.log(chalk.gray('  Type your commands below. Use "exit" or Ctrl+C to quit.\n'));

    const promptStr = getShellPrompt(pType, project.name);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: promptStr,
        terminal: true,
    });

    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();

        if (!input) {
            rl.prompt();
            return;
        }

        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            console.log(chalk.gray('  Disconnected.'));
            rl.close();
            return;
        }

        if (input.toLowerCase() === 'help' || input === '?') {
            printSiteHelp(pType);
            rl.prompt();
            return;
        }

        if (input.toLowerCase() === 'clear') {
            console.clear();
            rl.prompt();
            return;
        }

        await executeInProject(project.id, input);
        rl.prompt();
    });

    rl.on('close', () => {
        process.exit(0);
    });
}

// ─── Helpers ────────────────────────────────────────────────────

async function selectProject(projectName) {
    const spinner = ora('Fetching projects...').start();
    let projects;
    try {
        const res = await axios.get(`${API_URL}/projects`, { headers: getHeaders() });
        spinner.stop();
        projects = res.data;
    } catch (error) {
        spinner.stop();
        console.log(chalk.red('Failed to fetch projects.'));
        return null;
    }

    if (!projects || projects.length === 0) {
        console.log(chalk.yellow('No projects found. Create one from the dashboard first.'));
        return null;
    }

    if (projectName) {
        const match = projects.find(s =>
            s.name === projectName ||
            s.id === projectName ||
            s.display_name === projectName ||
            s.name.toLowerCase() === projectName.toLowerCase()
        );
        if (!match) {
            console.log(chalk.red(`Project "${projectName}" not found.`));
            console.log(chalk.gray('Available: ' + projects.map(s => s.name).join(', ')));
            return null;
        }
        return match;
    }

    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'projectId',
            message: 'Select a project:',
            choices: projects.map(p => ({
                name: `${p.name} (${p.type}) - ${p.status === 'running' ? chalk.green('running') : chalk.red(p.status)}`,
                value: p.id
            }))
        }
    ]);

    return projects.find(p => p.id === answer.projectId);
}

async function executeInProject(projectId, command) {
    const spinner = ora('Executing...').start();
    try {
        const res = await axios.post(`${API_URL}/projects/${projectId}/exec`, {
            command: command
        }, { headers: getHeaders() });

        spinner.stop();
        const { output, exit_code } = res.data;

        if (output) {
            process.stdout.write(output);
            if (!output.endsWith('\n')) console.log('');
        }
        if (exit_code !== 0) {
            console.log(chalk.yellow(`  Exit code: ${exit_code}`));
        }
    } catch (error) {
        spinner.stop();
        console.log(chalk.red('  Error: ' + (error.response?.data?.error || error.message)));
    }
}

function getShellPrompt(projectType, name) {
    switch (projectType) {
        case 'laravel':  return chalk.magenta(`${name}:laravel$ `);
        case 'php':      return chalk.magenta(`${name}:php$ `);
        case 'nodejs':   return chalk.green(`${name}:node$ `);
        case 'python':   return chalk.yellow(`${name}:python$ `);
        case 'go':       return chalk.cyan(`${name}:go$ `);
        case 'react':    return chalk.blue(`${name}:react$ `);
        case 'static':   return chalk.white(`${name}:static$ `);
        case 'wordpress':return chalk.blue(`${name}:wp$ `);
        case 'java':     return chalk.red(`${name}:java$ `);
        default:         return chalk.white(`${name}$ `);
    }
}

function printSiteHelp(projectType) {
    console.log(chalk.bold('\n  Dock Site Shell Commands:\n'));
    console.log('  exit, quit         Exit the shell');
    console.log('  help, ?            Show this help');
    console.log('  clear              Clear the screen');
    console.log('');

    switch (projectType) {
        case 'laravel':
            console.log(chalk.gray('  Laravel tips:'));
            console.log(chalk.gray('    php artisan storage:link       Create storage symlink'));
            console.log(chalk.gray('    php artisan migrate            Run migrations'));
            console.log(chalk.gray('    php artisan cache:clear        Clear application cache'));
            console.log(chalk.gray('    php artisan route:list         List all routes'));
            console.log(chalk.gray('    php artisan tinker             (not interactive via CLI)'));
            console.log(chalk.gray('    composer install               Install dependencies'));
            break;
        case 'php':
            console.log(chalk.gray('  PHP tips:'));
            console.log(chalk.gray('    php -v                         Check PHP version'));
            console.log(chalk.gray('    composer install                Install dependencies'));
            console.log(chalk.gray('    ls -la /var/www/html           List web root'));
            break;
        case 'nodejs':
            console.log(chalk.gray('  Node.js tips:'));
            console.log(chalk.gray('    node -v                        Check Node version'));
            console.log(chalk.gray('    npm list --depth=0             List installed packages'));
            console.log(chalk.gray('    ls -la /app                    List app directory'));
            break;
        case 'python':
            console.log(chalk.gray('  Python tips:'));
            console.log(chalk.gray('    python --version               Check Python version'));
            console.log(chalk.gray('    pip list                       List installed packages'));
            console.log(chalk.gray('    python manage.py migrate       Django migrations'));
            break;
        case 'wordpress':
            console.log(chalk.gray('  WordPress tips:'));
            console.log(chalk.gray('    wp plugin list                 List plugins (if WP-CLI available)'));
            console.log(chalk.gray('    wp theme list                  List themes'));
            console.log(chalk.gray('    ls -la /var/www/html/wp-content'));
            break;
        default:
            console.log(chalk.gray('  Common commands:'));
            console.log(chalk.gray('    ls -la             List files'));
            console.log(chalk.gray('    cat <file>         View file contents'));
            console.log(chalk.gray('    pwd                Print working directory'));
            console.log(chalk.gray('    env                Show environment variables'));
            break;
    }
    console.log('');
}

module.exports = {
    siteListCommand,
    siteExecCommand,
    siteShellCommand,
};
