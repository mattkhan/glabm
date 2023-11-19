#!/usr/bin/env node

import yargs from "yargs/yargs";
import { TemplateCommand, ConfigCommand } from "./src/commands";

const argv = yargs(process.argv.slice(2))
  .command(new ConfigCommand())
  .command(new TemplateCommand())
  .parseAsync();

async function main() {
  await argv;
}

main();
