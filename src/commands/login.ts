const chalk = require('chalk');
import * as fs from 'fs-extra';
import Domo = require('ryuu-client');
import {Login} from '../util/login';
import {BaseCommand} from '../util/BaseCommand';
import {createInstanceAutocompleteWithValidation} from '../util/prompts';
import {Command} from 'commander';
import {LoginCommandOptions} from '../models';

/**
 * Validates a developer token.
 * Tokens should be alphanumeric strings (letters and numbers only).
 * Example: DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34
 */
function validateToken(token: string): {valid: boolean; error?: string} {
  if (!token || token.trim().length === 0) {
    return {valid: false, error: 'Token cannot be empty'};
  }

  const trimmedToken = token.trim();

  // Check minimum length (tokens should be reasonably long)
  if (trimmedToken.length < 20) {
    return {
      valid: false,
      error:
        'Token is too short. Please verify you entered the complete token.',
    };
  }

  // Developer token format: alphanumeric only (letters and numbers)
  const tokenRegex = /^[a-zA-Z0-9]+$/;

  if (tokenRegex.test(trimmedToken)) {
    return {valid: true};
  }

  return {
    valid: false,
    error:
      'Invalid token format. Token should contain only letters and numbers.',
  };
}

/**
 * Validates the Domo instance domain.
 */
function validateInstance(instance: string): boolean {
  const acceptedDomains = ['domo.com', 'domotech.io', 'domorig.io'];
  return acceptedDomains.some(domain => instance.endsWith(domain));
}

class LoginCommand extends BaseCommand {
  constructor(program: Command) {
    super(program);
  }

  protected configure(): void {
    this.program
      .command('login')
      .description('Login to Domo using OAuth or token-based authentication')
      .option('-i, --instance <value>', 'Domo instance hostname')
      .option('-u, --user-email <value>', 'User email address')
      .option('-f, --manifest-file <file>', 'Use a specific manifest file')
      .option('-t, --token <value>', 'Developer token for authentication')
      .option(
        '--token-only',
        'Force token-only authentication mode (will prompt for token)',
      )
      .option('--migrate', 'Migrate login files from ryuu 3.x')
      .option('--no-upgrade-check', 'Do not check for new versions')
      .option(
        '--upgrade-download',
        'Automatically download newer version if available',
      )
      .action(this.run.bind(this));
  }

  /**
   * Handles token-based authentication.
   */
  private async handleTokenAuth(
    instance: string,
    token: string,
  ): Promise<void> {
    // Validate token format (must be GUID)
    const validation = validateToken(token);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Validate instance
    if (!validateInstance(instance)) {
      throw new Error(
        'Invalid Domo instance. Must end with .domo.com, .domotech.io, or .domorig.io',
      );
    }

    // Create login instance and persist token
    const login = new Login(instance);

    // Store token with devToken flag set to true
    login.persistLogin(token, true);

    this.logOk(
      `Successfully authenticated with token for ${instance}`,
      'Future CLI commands to this instance will not require username/password.',
    );
  }

  /**
   * Handles traditional OAuth authentication.
   */
  private async handleOAuthLogin(instance: string): Promise<void> {
    const login = new Login(instance);
    const client = await login.getClient();
    const loginData = await client.login();

    // Debug: Check if we got a refresh token
    if (!loginData || !loginData.refreshToken) {
      console.error(chalk.red('\nDEBUG: Login data:'), loginData);
      throw new Error(
        'OAuth login did not return a refresh token. The browser authentication may have timed out.',
      );
    }

    this.logOk(
      `Login to ${instance} successful.
       Welcome, ${loginData.displayName}.`,
    );

    try {
      // OAuth login should always set devToken to false
      login.persistLogin(loginData.refreshToken, false);
    } catch (persistError: any) {
      console.error(
        chalk.red('Failed to save login credentials:'),
        persistError.message || persistError,
      );
      console.error(chalk.yellow('You may need to check file permissions.'));
      throw persistError;
    }
  }

  /**
   * Handles the migration of login files from ryuu 3.x.
   */
  private handleMigrate(): void {
    const isWin = process.platform === 'win32';
    const homeEnv = process.env[isWin ? 'USERPROFILE' : 'HOME'];
    const deprecatedLoginDir = `${homeEnv}/.domo/login/`;

    if (fs.existsSync(deprecatedLoginDir)) {
      try {
        fs.copySync(deprecatedLoginDir, `${Domo.getHomeDir()}/ryuu/`, {
          overwrite: false,
        });
        this.logOk(
          'Successfully transferred login files from ryuu 3.x',
          `Login files copied to ${Domo.getHomeDir()}/ryuu/`,
        );
      } catch (error) {
        this.logFail('Failed to transfer logins:', error);
      }
    } else {
      this.logFail(
        'You do not have any ryuu 3.x logins to transfer to ryuu 4.x.',
        'Run this command without the --transfer flag to log in.',
      );
    }
  }

  /**
   * Determines the authentication mode based on options.
   */
  private determineAuthMode(
    args: LoginCommandOptions,
  ): 'token' | 'oauth' | 'migrate' {
    if (args.migrate || args.transfer) {
      return 'migrate';
    }

    if (args.token || args.tokenOnly) {
      return 'token';
    }

    return 'oauth';
  }

  public async run(args: LoginCommandOptions): Promise<void> {
    try {
      // Determine authentication mode
      const authMode = this.determineAuthMode(args);

      // Handle migrate mode
      if (authMode === 'migrate') {
        this.handleMigrate();
        process.exit(0);
        return;
      }

      // Get instance - required for both auth modes
      let instance = args.instance;

      if (!instance) {
        instance = await createInstanceAutocompleteWithValidation(
          'Domo instance (e.g. company.domo.com)',
          true,
        );
      }

      // Validate instance format
      if (!validateInstance(instance)) {
        this.logFail(
          'Invalid Domo instance format',
          'Instance must end with .domo.com, .domotech.io, or .domorig.io',
        );
        process.exit(1);
        return;
      }

      // Handle token authentication
      if (authMode === 'token') {
        let token = args.token;

        // If token-only mode but no token provided, prompt for it
        if (!token) {
          console.log(
            chalk.cyan(
              '\nToken-based authentication selected. You can find your developer token in the Admin section of Domo.\n',
            ),
          );

          const {createInput} = await import('../util/prompts');
          token = await createInput('Developer token', '', (input: string) => {
            const validation = validateToken(input);
            if (!validation.valid) {
              return validation.error || 'Invalid token format';
            }
            return true;
          });
        }

        if (!token) {
          this.logFail(
            'Token is required for token-based authentication',
            'Use -t or --token to provide a token, or run without --token-only for traditional login.',
          );
          process.exit(1);
          return;
        }

        await this.handleTokenAuth(instance, token);
        process.exit(0);
        return;
      }

      // Handle traditional OAuth login
      await this.handleOAuthLogin(instance);
      process.exit(0);
    } catch (err: any) {
      // Determine if this was a token auth failure or OAuth failure
      const authMethod =
        args.token || args.tokenOnly ? 'token' : 'username/password';

      if (authMethod === 'token') {
        this.logFail(
          'Token authentication failed',
          'Please verify your token is correct and has not expired. You can generate a new token in the Admin section of Domo.',
        );
      } else {
        this.logFail(
          'Login failed',
          'Please check your credentials and network connection.',
        );
      }

      // Log detailed error for debugging
      if (err.message) {
        console.error(chalk.red('\nError details:'), err.message);
      }
      if (process.env.DEBUG) {
        console.error(chalk.gray('\nFull error:'), err);
        if (err.stack) {
          console.error(chalk.gray('Stack trace:'));
          console.error(err.stack);
        }
      }
      process.exit(1);
    }
  }
}

module.exports = (program: Command) => {
  new LoginCommand(program);
};
