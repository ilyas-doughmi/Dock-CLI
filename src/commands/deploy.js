import fs from 'fs';
import ora from 'ora';
import * as config from '../utils/config.js';
import * as logger from '../utils/logger.js';
import { zipDirectory } from '../lib/zipper.js';
import { deploy } from '../lib/api.js';

export default async function deployCommand() {
    const token = config.get('auth.token');
    
    if(!token){
        logger.warning('Authentication required. Please run "dock login" to continue.');
    }
    else{
        const spinner = ora('Packaging project files...').start();

        let zipPath = null;

        try {

            zipPath = await zipDirectory();
            spinner.succeed('Project successfully packaged.');

            spinner.start('Uploading deployment artifacts...');
            const result = await deploy(zipPath);

            spinner.succeed('Deployment completed successfully.');
            logger.success(`Application deployed! Access it at: ${result.url}`);

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