import ora from 'ora';
import * as logger from '../utils/logger.js';
import {login} from '../lib/auth.js';

export default async function loginCommand()
{
    const spinner = ora('Initiating authentication sequence...').start();

    try{
        const username = await login();

        spinner.succeed('Authentication successful.');
        logger.success(`Signed in as ${username}`);
    }catch(error){
        spinner.fail('Authentication failed.');
        logger.error(error.message);
    }
}