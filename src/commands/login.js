import ora from 'ora';
import * as logger from '../utils/logger.js';
import {login} from '../lib/auth.js';

export default async function loginCommand()
{
    const spinner = ora('launching browser...').start();

    try{
        const username = await login();

        spinner.succeed();
        logger.success(`login succ as ${username}`);
    }catch(error){
        spinner.fail('login failed');
        logger.error(error.message);
    }
}