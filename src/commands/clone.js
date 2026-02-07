const chalk = require('chalk');
const inquirer = require('inquirer');
const axios = require('axios');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const config = require('../lib/config');
const { API_URL } = require('../lib/constants');

async function cloneCommand(projectName) {
    const token = config.get('token');
    if (!token) {
        console.log(chalk.red('You are not logged in. Run `dock login` first.'));
        return;
    }

    const spinner = ora('Fetching projects...').start();
    let projects = [];
    try {
        const res = await axios.get(`${API_URL}/projects`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        spinner.stop();
        projects = res.data;
    } catch (error) {
        spinner.stop();
        console.log(chalk.red('Failed to fetch projects.'));
        return;
    }

    if (projects.length === 0) {
        console.log(chalk.yellow('No projects found.'));
        return;
    }

    let selectedProject;

    if (projectName) {
        const matches = projects.filter(p => p.name === projectName);
        if (matches.length === 0) {
            console.log(chalk.red(`Project "${projectName}" not found.`));
            return;
        } else {
            selectedProject = matches[0];
        }
    } else {
        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedId',
                message: 'Select project to clone:',
                choices: projects.map(p => ({ name: p.name + (p.github_repo ? ` (${p.github_repo})` : ''), value: p.id }))
            }
        ]);
        selectedProject = projects.find(p => p.id === answer.selectedId);
    }

    if (!selectedProject) return;

    console.log(chalk.blue(`Cloning ${selectedProject.name}...`));

    const targetDir = path.join(process.cwd(), selectedProject.name);
    if (fs.existsSync(targetDir)) {
        const { overwrite } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: `Directory "${selectedProject.name}" already exists. Overwrite?`,
                default: false
            }
        ]);
        if (!overwrite) {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
        }
        fs.rmSync(targetDir, { recursive: true, force: true });
    }

    fs.mkdirSync(targetDir, { recursive: true });

    const downloadSpinner = ora('Downloading project files...').start();
    try {
        const res = await axios.get(`${API_URL}/projects/${selectedProject.id}/download`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'arraybuffer'
        });

        const zipPath = path.join(targetDir, 'project.zip');
        fs.writeFileSync(zipPath, res.data);

        downloadSpinner.succeed(chalk.green('Project downloaded!'));

        const extractSpinner = ora('Extracting files...').start();
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(targetDir, true);
        fs.unlinkSync(zipPath);
        extractSpinner.succeed(chalk.green('Files extracted!'));

        const dockDir = path.join(targetDir, '.dock');
        if (!fs.existsSync(dockDir)) {
            fs.mkdirSync(dockDir);
        }
        fs.writeFileSync(
            path.join(dockDir, 'dock.json'),
            JSON.stringify({ projectId: selectedProject.id }, null, 2)
        );

        console.log(chalk.green(`\n✓ Project "${selectedProject.name}" cloned successfully!`));
        console.log(chalk.gray(`  cd ${selectedProject.name}`));
        console.log(chalk.gray(`  dock deploy`));

    } catch (error) {
        downloadSpinner.fail(chalk.red('Failed to download project.'));
        if (error.response) {
            console.log(chalk.red(`Error: ${error.response.status} - ${error.response.statusText}`));
        } else {
            console.log(chalk.red(`Error: ${error.message}`));
        }
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }
    }
}

module.exports = cloneCommand;
