#!/usr/bin/env node

import { Command } from 'commander';
import * as logger from '../src/utils/logger.js';
const program = new Command();

program
  .version('1.0.0')
  .description('Dock Hosting - CLI');

program
    .command('test')
    .description('testing cli')
    .action(()=>{
        logger.success("All Good");
    })
program.parse(process.argv);