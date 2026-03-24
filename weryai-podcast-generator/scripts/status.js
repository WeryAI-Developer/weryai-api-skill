#!/usr/bin/env node

import { runScript } from '../../../core/weryai-podcast/cli.js';
import { execute } from '../../../core/weryai-podcast/status.js';

const HELP = `Usage: node {baseDir}/scripts/status.js [options]

Options:
  --task-id <id>  Required podcast task ID
  --verbose       Print debug info to stderr
  --help          Show this help message

Examples:
  node {baseDir}/scripts/status.js --task-id <task-id>
`;

await runScript(process.argv.slice(2), execute, HELP);
