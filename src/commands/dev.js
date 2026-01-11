import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as logger from '../utils/logger.js';
import ora from 'ora';

export default async function devCommand() {
    try {
        execSync('docker info', { stdio: 'ignore' });
    } catch (e) {
        logger.error('Docker is not running or not installed. Please start Docker and try again.');
        return;
    }

    let config = {
        phpVersion: '8.2',
        port: 3000
    };

    const configPath = path.join(process.cwd(), 'dock.json');
    if (fs.existsSync(configPath)) {
        try {
            const fileContent = fs.readFileSync(configPath, 'utf-8');
            const userConfig = JSON.parse(fileContent);
            if (userConfig.phpVersion) config.phpVersion = userConfig.phpVersion;
            if (userConfig.port) config.port = userConfig.port;
        } catch (e) {
            logger.warning('Could not parse dock.json, using defaults.');
        }
    }

    const imageName = `php:${config.phpVersion}-apache`;

    logger.info(`Starting development environment...`);
    logger.info(`PHP: ${config.phpVersion}`);
    logger.info(`Port: http://localhost:${config.port}`);
    
    const spinner = ora(`Pulling image ${imageName}...`).start();
    
    try {
        execSync(`docker pull ${imageName}`, { stdio: 'ignore' });
        spinner.succeed('Image ready');
    } catch (e) {
        spinner.fail(`Failed to pull image ${imageName}`);
        return;
    }

    console.log('');
    
    const containerName = `dock-dev-local`;

    try {
        execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
    } catch (e) {}

    const args = [
        'run',
        '--rm',
        '--name', containerName,
        '-p', `${config.port}:80`,
        '-v', `${process.cwd()}:/var/www/html`,
        imageName
    ];

    logger.success(`Server running at http://localhost:${config.port}`);
    logger.info('Press Ctrl+C to stop.');

    const child = spawn('docker', args, { stdio: 'inherit' });

    child.on('close', () => {
        logger.info('Server stopped.');
    });
}
