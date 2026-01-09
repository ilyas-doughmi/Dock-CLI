#!/usr/bin/env node

const { Command } = require('commander');
const logger = require('../src/utils/logger');
const program = new Command();

program
  .version('1.0.0')
  .description('Dock Hosting - CLI');
program.parse(process.argv);