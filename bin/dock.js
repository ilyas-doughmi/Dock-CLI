#!/usr/bin/env node

import { Command } from 'commander';
import * as logger from '../src/utils/logger.js';
import loginCommand from '../src/commands/login.js';
import deployCommand from '../src/commands/deploy.js';
import logoutCommand from '../src/commands/logout.js';


const program = new Command();

program
  .version('1.0.0')
  .description('Dock Hosting - CLI');

program
    .command('login')
    .description('Login to your Dock Hosting account')
    .action(async ()=>{
        await loginCommand();
    })
program
    .command('deploy')
    .description('Deploy your files easly with deploy command')
    .action( async () =>{
        await deployCommand();
    })
program
  .command('logout')
  .description('Log out and remove stored credentials')
  .action(async () => {
    await logoutCommand();
  });
program.parse(process.argv);