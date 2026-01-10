import fs from 'fs';
import ora from 'ora';
import * as config from '../utils/config.js';
import * as logger from '../utils/logger.js';
import { zipDirectory } from '../lib/zipper.js';
import { deploy } from '../lib/api.js';
import { getProjectConfig, saveProjectConfig } from '../utils/projectConfig.js';

export default async function deployCommand() {
    const token = config.get('auth.token');
    
    if(!token){
        logger.warning('Authentication required. Please run "dock login" to continue.');
    }
    else{
        const spinner = ora('Initializing deployment...').start();

        let zipPath = null;

        try {

            const localConfig = getProjectConfig();
            const projectId = localConfig ? localConfig.projectId : null;

            spinner.text = 'Compressing project files...';
            zipPath = await zipDirectory();
            spinner.succeed('Project successfully packaged.');

            spinner.start('Uploading to Dock Hosting server...');
            const result = await deploy(zipPath, projectId);
            

            const deployedName = result.project_name || 'Project';

            if (result.project_id) {
                saveProjectConfig(result.project_id, deployedName);
            }

            spinner.succeed('Deployment Successful!');
            logger.success(`Deployed to: ${deployedName}`);
            if (result.url) logger.info(`Link: ${result.url}`);

        } catch (error) {
            spinner.fail('Deployment failed.');
            logger.error(error.message);
        } finally {
            if (zipPath && fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
        }     
    }
}