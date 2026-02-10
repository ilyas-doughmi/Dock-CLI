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

// ─── dock db list ───────────────────────────────────────────────
async function dbListCommand() {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const spinner = ora('Fetching database services...').start();
    try {
        const res = await axios.get(`${API_URL}/services`, { headers: getHeaders() });
        spinner.stop();

        const services = res.data;
        if (!services || services.length === 0) {
            console.log(chalk.yellow('No database services found.'));
            return;
        }

        console.log(chalk.bold('\n  Your Database Services\n'));
        console.log(chalk.gray('  ' + '─'.repeat(70)));

        for (const s of services) {
            const statusColor = s.status === 'running' ? chalk.green : chalk.red;
            console.log(
                `  ${chalk.bold(s.name)}  ${chalk.gray('|')}  ${chalk.cyan(s.type)}  ${chalk.gray('|')}  ${statusColor(s.status)}  ${chalk.gray('|')}  ID: ${chalk.gray(s.id)}`
            );
        }
        console.log(chalk.gray('  ' + '─'.repeat(70)));
        console.log(chalk.gray(`\n  ${services.length} service(s) total\n`));

    } catch (error) {
        spinner.stop();
        if (error.response && error.response.status === 401) {
            console.log(chalk.red('Session expired. Run `dock login` again.'));
        } else {
            console.log(chalk.red('Failed to fetch services: ' + (error.response?.data?.error || error.message)));
        }
    }
}

// ─── dock db info <name> ────────────────────────────────────────
async function dbInfoCommand(serviceName) {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const service = await selectService(serviceName);
    if (!service) return;

    // Fetch full details (includes password)
    const spinner = ora('Fetching service details...').start();
    try {
        const res = await axios.get(`${API_URL}/services/${service.id}`, { headers: getHeaders() });
        spinner.stop();

        const s = res.data;
        console.log(chalk.bold(`\n  Database: ${s.name}\n`));
        console.log(`  Type:             ${chalk.cyan(String(s.type))}`);
        console.log(`  Version:          ${chalk.white(s.version || 'latest')}`);
        console.log(`  Status:           ${s.status === 'running' ? chalk.green(s.status) : chalk.red(s.status)}`);
        console.log(`  Username:         ${chalk.white(s.username)}`);
        console.log(`  Password:         ${chalk.white(s.password)}`);
        console.log(`  Database Name:    ${chalk.white(s.database_name)}`);
        console.log(`  External Port:    ${chalk.white(String(s.external_port))}`);
        console.log(`  Container:        ${chalk.gray(s.container_name)}`);
        if (s.connection_string) {
            console.log(`  Connection:       ${chalk.yellow(s.connection_string)}`);
        }
        if (s.api_url) {
            console.log(`  API URL:          ${chalk.blue(s.api_url)}`);
        }
        console.log('');
    } catch (error) {
        spinner.stop();
        console.log(chalk.red('Failed to fetch service details: ' + (error.response?.data?.error || error.message)));
    }
}

// ─── dock db exec <name> <query> ────────────────────────────────
async function dbExecCommand(serviceName, query) {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const service = await selectService(serviceName);
    if (!service) return;

    if (!query) {
        const answer = await inquirer.prompt([
            {
                type: 'input',
                name: 'query',
                message: 'Enter SQL/command to execute:',
                validate: input => input.trim() ? true : 'Command cannot be empty.'
            }
        ]);
        query = answer.query;
    }

    await executeQuery(service.id, query);
}

// ─── dock db connect <name> (interactive REPL) ─────────────────
async function dbConnectCommand(serviceName) {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const service = await selectService(serviceName);
    if (!service) return;

    // Fetch full details for display
    let details;
    try {
        const res = await axios.get(`${API_URL}/services/${service.id}`, { headers: getHeaders() });
        details = res.data;
    } catch (e) {
        details = service;
    }

    const dbType = String(details.type || service.type);
    console.log(chalk.bold(`\n  Connected to ${chalk.cyan(service.name)} (${dbType})`));
    console.log(chalk.gray(`  Database: ${details.database_name || 'N/A'} | User: ${details.username || 'N/A'}`));
    console.log(chalk.gray('  Type your queries below. Use "exit" or Ctrl+C to quit.\n'));

    const promptStr = getPrompt(dbType, details.database_name);

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

        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit' || input === '\\q') {
            console.log(chalk.gray('  Disconnected.'));
            rl.close();
            return;
        }

        if (input.toLowerCase() === 'help' || input === '\\?') {
            printHelp(dbType);
            rl.prompt();
            return;
        }

        if (input.toLowerCase() === 'clear' || input === '\\!') {
            console.clear();
            rl.prompt();
            return;
        }

        await executeQuery(service.id, input);
        rl.prompt();
    });

    rl.on('close', () => {
        process.exit(0);
    });
}

// ─── dock db shell <name> <command> ─────────────────────────────
async function dbShellCommand(serviceName, command) {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const service = await selectService(serviceName);
    if (!service) return;

    if (!command) {
        const answer = await inquirer.prompt([
            {
                type: 'input',
                name: 'command',
                message: 'Enter shell command to execute:',
                validate: input => input.trim() ? true : 'Command cannot be empty.'
            }
        ]);
        command = answer.command;
    }

    const spinner = ora('Executing...').start();
    try {
        const res = await axios.post(`${API_URL}/services/${service.id}/shell`, {
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
        console.log(chalk.red('Exec failed: ' + (error.response?.data?.error || error.message)));
    }
}

// ─── Helpers ────────────────────────────────────────────────────

async function selectService(serviceName) {
    const spinner = ora('Fetching services...').start();
    let services;
    try {
        const res = await axios.get(`${API_URL}/services`, { headers: getHeaders() });
        spinner.stop();
        services = res.data;
    } catch (error) {
        spinner.stop();
        console.log(chalk.red('Failed to fetch services.'));
        return null;
    }

    if (!services || services.length === 0) {
        console.log(chalk.yellow('No database services found. Create one from the dashboard first.'));
        return null;
    }

    if (serviceName) {
        const match = services.find(s => s.name === serviceName || s.id === serviceName);
        if (!match) {
            console.log(chalk.red(`Service "${serviceName}" not found.`));
            console.log(chalk.gray('Available: ' + services.map(s => s.name).join(', ')));
            return null;
        }
        return match;
    }

    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'serviceId',
            message: 'Select a database service:',
            choices: services.map(s => ({
                name: `${s.name} (${s.type}) - ${s.status === 'running' ? chalk.green('running') : chalk.red(s.status)}`,
                value: s.id
            }))
        }
    ]);

    return services.find(s => s.id === answer.serviceId);
}

async function executeQuery(serviceId, command) {
    const spinner = ora('Executing...').start();
    try {
        const res = await axios.post(`${API_URL}/services/${serviceId}/exec`, {
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

function getPrompt(dbType, dbName) {
    const name = dbName || 'db';
    switch (dbType) {
        case 'postgres':  return chalk.cyan(`${name}=# `);
        case 'mysql':     return chalk.cyan(`mysql> `);
        case 'mariadb':   return chalk.cyan(`MariaDB [${name}]> `);
        case 'mongodb':   return chalk.green(`${name}> `);
        case 'redis':     return chalk.red(`redis> `);
        default:          return chalk.white(`${dbType}> `);
    }
}

function printHelp(dbType) {
    console.log(chalk.bold('\n  Dock DB Shell Commands:\n'));
    console.log('  exit, quit, \\q     Exit the shell');
    console.log('  help, \\?           Show this help');
    console.log('  clear, \\!          Clear the screen');
    console.log('');
    switch (dbType) {
        case 'postgres':
            console.log(chalk.gray('  PostgreSQL tips:'));
            console.log(chalk.gray('    \\dt             List tables'));
            console.log(chalk.gray('    \\d <table>      Describe table'));
            break;
        case 'mysql':
        case 'mariadb':
            console.log(chalk.gray('  MySQL/MariaDB tips:'));
            console.log(chalk.gray('    SHOW TABLES;    List tables'));
            console.log(chalk.gray('    DESCRIBE <tbl>; Describe table'));
            break;
        case 'mongodb':
            console.log(chalk.gray('  MongoDB tips:'));
            console.log(chalk.gray('    show collections   List collections'));
            console.log(chalk.gray('    db.col.find()      Query documents'));
            break;
        case 'redis':
            console.log(chalk.gray('  Redis tips:'));
            console.log(chalk.gray('    KEYS *          List all keys'));
            console.log(chalk.gray('    GET <key>       Get a value'));
            break;
    }
    console.log('');
}

// Handle psql-style backslash commands by translating them to SQL
function translateBackslashCommand(input, dbType) {
    if (dbType !== 'postgres') return input;

    const trimmed = input.trim();
    if (trimmed === '\\dt') return 'SELECT tablename FROM pg_tables WHERE schemaname = \'public\';';
    if (trimmed === '\\l') return 'SELECT datname FROM pg_database WHERE datistemplate = false;';
    if (trimmed === '\\du') return 'SELECT usename FROM pg_user;';
    if (trimmed.startsWith('\\d ')) {
        const table = trimmed.substring(3).trim();
        return `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}';`;
    }
    return input;
}

module.exports = {
    dbListCommand,
    dbInfoCommand,
    dbExecCommand,
    dbConnectCommand,
    dbShellCommand,
};
