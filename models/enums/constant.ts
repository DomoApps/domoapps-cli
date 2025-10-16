export enum constant {
  CLIENT_ID = 'domo:internal:devstudio',
  THUMBNAIL_CREATE_WARNING = 'A thumbnail is required before creating ' +
    'a card with this design. This is used to represent the App in the ' +
    'mobile application and the Appstore experience.',
  CREATE_THUMBNAIL = 'Place a 300x300 image named thumbnail.png in the ' +
    'base directory of your design.',
}

import * as chalk from 'chalk';

export const logo = `
    ____                      
   / __ \\____  ____ ___  ____ 
  / / / / __ \\/ __ \`__ \\/ __ \\
 / /_/ / /_/ / / / / / / /_/ /
/_____/\\____/_/ /_/ /_/\\____/ 
                              `;

export const getRainbowLogo = () => {
  const lines = logo.trim().split('\n');
  const colors = [
    chalk.red,
    chalk.yellow,
    chalk.green,
    chalk.cyan,
    chalk.blue,
    chalk.magenta
  ];
  
  return lines.map((line, index) => {
    const color = colors[index % colors.length];
    return color(line);
  }).join('\n');
};
