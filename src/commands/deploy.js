import fs from 'fs';
import ora from 'ora';
import * as config from '../utils/config.js';
import * as logger from '../utils/logger.js';
import { zipDirectory } from '../lib/zipper.js';
import { deploy } from '../lib/api.js';

export default async function deployCommand() {
    const token = config.get('auth.token');
    
    if(!token){
        logger.warning('You are not currently logged in.');
    }
    else{
        const spinner = ora('Packaging your project...').start();

        let zipPath = null;

        try {

            zipPath = await zipDirectory();
            spinner.succeed('Project packed!');

            spinner.start('Uploading to Dock Hosting...');
            const result = await deploy(zipPath);

            spinner.succeed('Deployment complete!');
            logger.success(`Your site is live at: ${result.url}`);

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