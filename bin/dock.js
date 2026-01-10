#!/usr/bin/env node

import { Command } from 'commander';
import * as logger from '../src/utils/logger.js';
import loginCommand from '../src/commands/login.js';
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
program.parse(process.argv);