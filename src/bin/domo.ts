#!/usr/bin/env node
/**
 * This executable will take care of capturing user input,
 * passing data on to the domo lib and informing user of results.
 * First it will check for supported Node versions.
 *
 */

import path = require('path');
import {program} from 'commander';
import glob = require('glob');
import {version} from '../../package.json';
import {checkSystemRequirements} from '../util/systemCheck';
import {getRainbowLogo} from '../models/enums/constant';

// Force colors for chalk
process.env.FORCE_COLOR = '1';

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (reason: any) => {
  // Handle common Domo API errors gracefully
  if (reason && typeof reason === 'object') {
    if (reason.statusCode === 401 || reason.statusCode === 403) {
      console.error(
        '\n❌ Authentication failed. Your session may have expired.',
      );
      console.error('   Please run "domo login" to authenticate again.\n');
      process.exit(1);
    } else if (
      reason.statusCode === 404 &&
      reason.message?.includes('No Design found')
    ) {
      console.error('\n❌ Design not found:', reason.message);
      console.error(
        '   Please make sure you have logged in with "domo login" and published your app first with "domo publish".',
      );
      console.error(
        '   Or remove the "id" field from your manifest.json to work without a design ID.\n',
      );
      process.exit(1);
    } else if (reason.statusCode) {
      console.error(
        `\n❌ API Error (${reason.statusCode}):`,
        reason.message || reason,
      );
      console.error('');
      process.exit(1);
    }
  }

  // For other unhandled rejections, log and exit
  console.error('\n❌ Unexpected error:', reason);
  if (reason instanceof Error && reason.stack) {
    console.error(reason.stack);
  }
  process.exit(1);
});

// Show logo for main command, version, or help
const args = process.argv.slice(2);
const shouldShowLogo =
  args.length === 0 || // No arguments (just 'domo')
  (args.length === 1 && (args.includes('--version') || args.includes('-v'))) || // Version command only
  (args.length === 1 && (args.includes('--help') || args.includes('-h'))) || // Help command only
  (args.length === 1 && args.includes('help')); // Help subcommand only

if (shouldShowLogo) {
  console.log(getRainbowLogo());
}

checkSystemRequirements();

program
  .version(version, '-v, --version')
  .option('-s, --ssl', 'disable SSL')
  .hook('preAction', preliminaryCommand => {
    if (preliminaryCommand.opts().ssl)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  })
  .option('-m, --manifest <id>', 'supply a filepath to a manifest')
  .helpOption('-h, --help', 'display help for command');

// import all commands in alphabetical order
// Handle both local development and global installation paths
let commandsPath = path.resolve(__dirname, '../commands');

// Helper function to find .js files in a directory
function findJSFiles(dirPath: string): string[] {
  try {
    const files = require('fs').readdirSync(dirPath);
    return files
      .filter((file: string) => file.endsWith('.js'))
      .map((file: string) => path.join(dirPath, file));
  } catch (error) {
    return [];
  }
}

// If commands not found, try alternative paths for global installation
// Use fs.readdirSync instead of glob.sync for better Windows compatibility
let commandFiles = findJSFiles(commandsPath);

if (commandFiles.length === 0) {
  // Try the package root relative to this file
  const packageRoot = path.resolve(__dirname, '../..');
  commandsPath = path.resolve(packageRoot, 'dist/commands');
  commandFiles = findJSFiles(commandsPath);

  // If still not found, try looking for the package in node_modules
  if (commandFiles.length === 0) {
    const possiblePaths = [
      path.resolve(__dirname, '../../dist/commands'),
      path.resolve(__dirname, '../../../dist/commands'),
      path.resolve(process.cwd(), 'node_modules/ryuu/dist/commands'),
      path.resolve(process.cwd(), '../node_modules/ryuu/dist/commands'),
      // Windows-specific paths
      path.resolve(__dirname, '../../commands'),
      path.resolve(__dirname, '../../../commands'),
      path.resolve(packageRoot, 'commands'),
    ];

    for (const possiblePath of possiblePaths) {
      const testFiles = findJSFiles(possiblePath);
      if (testFiles.length > 0) {
        commandsPath = possiblePath;
        commandFiles = testFiles;
        break;
      }
    }
  }
}

if (commandFiles.length === 0) {
  console.error(`[ERROR] No command files found in: ${commandsPath}`);
  console.error(
    '[ERROR] Make sure the project has been built with: npm run build',
  );
  process.exit(1);
}

commandFiles.sort().forEach(command => {
  try {
    require(command)(program);
  } catch (error) {
    console.error(`[ERROR] Failed to load command: ${command}`);
    console.error(`[ERROR] ${error.message}`);
  }
});

program.parse(process.argv);
