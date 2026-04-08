import {Login} from '../util/login.js';
import {Command} from 'commander';
import {log} from '../util/log.js';
import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Format a date to a shorter, more readable format
 * @param date Date to format
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
function formatDate(date: Date): string {
  const month = date.toLocaleString('en-US', {month: 'short'});
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Generate the asset library URL for a design
 * @param instance The Domo instance (e.g., "domo-jon-tiritilli" or "domo-jon-tiritilli.domo.com")
 * @param designId The design ID
 * @returns Full URL to the design in the asset library
 */
function getDesignUrl(instance: string, designId: string): string {
  // Handle cases where instance already includes .domo.com
  const baseUrl = instance.includes('.domo.com')
    ? `https://${instance}`
    : `https://${instance}.domo.com`;
  return `${baseUrl}/assetlibrary/${designId}/overview`;
}

export default (program: Command) => {
  program
    .command('ls')
    .description('get a list of all your Custom App designs')
    .option(
      '-a, --all',
      'List all designs on current instance (admin role required)',
    )
    .option('-d, --deleted', 'Include deleted designs on current instance')
    .action(options => {
      const params = {
        deleted: String(options.deleted ?? false),
        checkAdminAuthority: String(options.all ?? false),
      };
      const login = new Login();
      const instance = login.instance;

      if (!instance) {
        log.fail(
          'Not logged in',
          'Please run `domo login` to authenticate before listing designs.',
        );
        return;
      }

      login
        .getClient()
        .then(client => {
          client.designs
            .list(params)
            .then(designs => {
              if (designs.length === 0) {
                log.fail(
                  'No Designs Published',
                  '`domo ls` will list designs once they are published to Domo',
                );
              }

              const windowWidth = process.stdout.columns || 100;

              // Calculate column widths based on terminal width
              const minWidth = 80;

              // Calculate available width after borders/padding
              const availableWidth = windowWidth - 10; // 10 for borders and padding

              // Distribute widths proportionally
              let nameWidth, idWidth, dateWidth, linkWidth;

              if (availableWidth >= 180) {
                // Wide terminal - show all columns comfortably
                nameWidth = Math.floor(availableWidth * 0.25);
                idWidth = 38;
                dateWidth = 15;
                linkWidth =
                  availableWidth - nameWidth - idWidth - dateWidth * 2;
              } else if (availableWidth >= 140) {
                // Medium terminal - compress dates
                nameWidth = Math.floor(availableWidth * 0.2);
                idWidth = 38;
                dateWidth = 13;
                linkWidth =
                  availableWidth - nameWidth - idWidth - dateWidth * 2;
              } else {
                // Narrower terminal - minimal dates
                nameWidth = Math.floor(availableWidth * 0.2);
                idWidth = 36;
                dateWidth = 12;
                linkWidth =
                  availableWidth - nameWidth - idWidth - dateWidth * 2;
              }

              // For narrow terminals, use a simpler layout with URL
              if (windowWidth < minWidth) {
                const table = new Table({
                  head: [chalk.cyan('Design Name'), chalk.cyan('URL')],
                  style: {
                    head: [],
                    border: [],
                    'padding-left': 1,
                    'padding-right': 1,
                  },
                  chars: {
                    top: '─',
                    'top-mid': '┬',
                    'top-left': '┌',
                    'top-right': '┐',
                    bottom: '─',
                    'bottom-mid': '┴',
                    'bottom-left': '└',
                    'bottom-right': '┘',
                    left: '│',
                    'left-mid': '│',
                    mid: ' ',
                    'mid-mid': '│',
                    right: '│',
                    'right-mid': '│',
                    middle: '│',
                  },
                  wordWrap: true,
                });

                designs.forEach(design => {
                  const url = getDesignUrl(instance, design.id);
                  // Show the URL directly for narrow terminals
                  table.push([design.name, chalk.blue(url)]);
                });

                console.log(table.toString());
              } else {
                // Full width table with all columns and clickable link
                const table = new Table({
                  head: [
                    chalk.cyan('Design Name'),
                    chalk.cyan('Design Id'),
                    chalk.cyan('Date Created'),
                    chalk.cyan('Last Updated'),
                    chalk.cyan('Link'),
                  ],
                  colWidths: [
                    nameWidth,
                    idWidth,
                    dateWidth,
                    dateWidth,
                    linkWidth,
                  ],
                  style: {
                    head: [],
                    border: [],
                    'padding-left': 1,
                    'padding-right': 1,
                  },
                  chars: {
                    top: '─',
                    'top-mid': '┬',
                    'top-left': '┌',
                    'top-right': '┐',
                    bottom: '─',
                    'bottom-mid': '┴',
                    'bottom-left': '└',
                    'bottom-right': '┘',
                    left: '│',
                    'left-mid': '│',
                    mid: ' ',
                    'mid-mid': '│',
                    right: '│',
                    'right-mid': '│',
                    middle: '│',
                  },
                  wordWrap: true,
                });

                designs.forEach(design => {
                  const url = getDesignUrl(instance, design.id);
                  // Show URL in blue (removing hyperlink wrapper to avoid terminal state issues)
                  table.push([
                    design.name,
                    design.id,
                    formatDate(new Date(design.createdDate)),
                    formatDate(new Date(design.updatedDate)),
                    chalk.blue(url),
                  ]);
                });

                console.log(table.toString());
              }

              // Reset terminal state after table output
              process.stdout.write('\x1b[0m');
            })
            .catch((error: any) => {
              // Better error handling for common scenarios
              if (error.statusCode === 401 || error.statusCode === 403) {
                log.fail(
                  'Authentication failed',
                  'Please run `domo login` to re-authenticate.',
                );
              } else if (
                error.code === 'ENOTFOUND' ||
                error.code === 'ECONNREFUSED'
              ) {
                log.fail(
                  'Network error',
                  'Unable to connect to Domo. Please check your internet connection.',
                );
              } else {
                console.error('Error details:', error);
                log.fail(
                  'Unable to fetch designs',
                  error.message || 'An unexpected error occurred.',
                );
              }
            });
        })
        .catch(() => {
          log.fail(
            'Login error',
            'Unable to get authenticated client. Please run `domo login`.',
          );
        });
    });
};
