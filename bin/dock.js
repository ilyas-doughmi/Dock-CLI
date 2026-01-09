#!/usr/bin/env node

const { Command } = require('commander');
const logger = require('../src/utils/logger');
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