import {CommandOptions as BaseCommandOptions} from 'commander';

/**
 * Base interface for all CLI command options.
 * Extends Commander's CommandOptions with common CLI option properties.
 *
 * @interface CliCommandOptions
 * @extends {BaseCommandOptions}
 */
export interface CliCommandOptions extends BaseCommandOptions {
  /**
   * Path to a specific manifest file.
   * @type {string}
   * @example './public/manifest.json'
   */
  manifest?: string;

  /**
   * Disable SSL verification (development only).
   * @type {boolean}
   * @default false
   */
  ssl?: boolean;
}

/**
 * Options for the 'token' command.
 * Manages developer tokens for password-less authentication.
 *
 * @interface TokenCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo token add --instance company.domo.com --token abc123
 * domo token remove --instance company.domo.com
 * ```
 */
export interface TokenCommandOptions extends CliCommandOptions {
  /**
   * Domo instance hostname (e.g., company.domo.com).
   * @type {string}
   */
  instance?: string;

  /**
   * Developer token value (used with 'token add').
   * Can be found in the Admin section of Domo.
   * @type {string}
   */
  token?: string;
}

/**
 * Options for the 'proxy' command.
 * Configures corporate proxy settings for all CLI commands.
 *
 * @interface ProxyCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo proxy proxy.company.com 8080 --auth
 * domo proxy --remove-proxy
 * ```
 */
export interface ProxyCommandOptions extends CliCommandOptions {
  /**
   * Remove current proxy settings.
   * @type {boolean}
   * @default false
   */
  removeProxy?: boolean;

  /**
   * Enable authentication for corporate proxy.
   * Password will be prompted on each command.
   * @type {boolean}
   * @default false
   */
  auth?: boolean;
}

/**
 * Options for the 'publish' command.
 * Publishes a new or existing Custom App design to Domo.
 *
 * @interface PublishCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo publish
 * domo publish --go
 * ```
 */
export interface PublishCommandOptions extends CliCommandOptions {
  /**
   * Navigate to design in Asset Library after publishing.
   * Opens the browser automatically to the published app.
   * @type {boolean}
   * @default false
   */
  go?: boolean;

  /**
   * Path to build directory containing the app files.
   * If not specified, uses the current working directory.
   * @type {string}
   * @example './dist' or './build'
   */
  buildDir?: string;
}

/**
 * Options for the 'login' command.
 * Authenticate with a Domo instance using OAuth or token-based authentication.
 *
 * @interface LoginCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * # Traditional username/password login
 * domo login
 * domo login --instance company.domo.com
 *
 * # Token-based login
 * domo login --instance company.domo.com --token abc123
 * domo login --token-only
 *
 * # Transfer old logins
 * domo login --transfer
 * ```
 */
export interface LoginCommandOptions extends CliCommandOptions {
  /**
   * Domo instance hostname to login to.
   * @type {string}
   * @example 'company.domo.com'
   */
  instance?: string;

  /**
   * User email address for login.
   * @type {string}
   */
  userEmail?: string;

  /**
   * Path to a specific manifest file.
   * @type {string}
   */
  manifestFile?: string;

  /**
   * Migrate login files from ryuu 3.x to ryuu 4.x.
   * @type {boolean}
   * @default false
   */
  migrate?: boolean;

  /**
   * @deprecated Use migrate instead. Transfer login files from ryuu 3.x.
   * @type {boolean}
   * @default false
   */
  transfer?: boolean;

  /**
   * Developer token for token-based authentication.
   * Must be an alphanumeric string (letters and numbers only).
   * Minimum length: 20 characters.
   * Can be found in the Admin section of Domo.
   * @type {string}
   * @example 'DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34'
   */
  token?: string;

  /**
   * Force token-only authentication mode.
   * Will prompt for token input if not provided.
   * @type {boolean}
   * @default false
   */
  tokenOnly?: boolean;

  /**
   * Skip upgrade check.
   * @type {boolean}
   * @default true
   */
  upgradeCheck?: boolean;

  /**
   * Automatically download newer version if available.
   * @type {boolean}
   * @default false
   */
  upgradeDownload?: boolean;
}

/**
 * Options for the 'logout' command.
 * Sign out from a Domo instance.
 *
 * @interface LogoutCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo logout
 * domo logout --instance company.domo.com
 * ```
 */
export interface LogoutCommandOptions extends CliCommandOptions {
  /**
   * Domo instance hostname to logout from.
   * @type {string}
   */
  instance?: string;
}

/**
 * Options for the 'init' command.
 * Creates a new Custom App project with starter template.
 *
 * @interface InitCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo init my-app
 * domo init --starter "hello world"
 * ```
 */
export interface InitCommandOptions extends CliCommandOptions {
  /**
   * Name of the design/app.
   * @type {string}
   */
  designName?: string;

  /**
   * Name of the starter template to use.
   * Options: 'hello world', 'basic chart', 'map chart', 'sugarforce'.
   * @type {string}
   */
  starter?: string;

  /**
   * Skip the prompt for dataset connections.
   * @type {boolean}
   * @default false
   */
  datasetPrompt?: boolean;
}

/**
 * Options for the 'dev' command.
 * Starts a local development server with hot reload.
 *
 * @interface DevCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo dev
 * domo dev --port 4000
 * domo dev --fullpage
 * ```
 */
export interface DevCommandOptions extends CliCommandOptions {
  /**
   * Port number for the development server.
   * @type {number}
   * @default 3000
   */
  port?: number;

  /**
   * Enable fullpage/immersive view mode.
   * @type {boolean}
   * @default false
   */
  fullpage?: boolean;
}

/**
 * Options for the 'download' command.
 * Downloads an existing app design from Domo.
 *
 * @interface DownloadCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo download
 * domo download --id abc-123
 * domo download --id abc-123 --version 2
 * ```
 */
export interface DownloadCommandOptions extends CliCommandOptions {
  /**
   * Design ID (UUID) to download.
   * @type {string}
   */
  id?: string;

  /**
   * Specific version number to download.
   * @type {string}
   */
  version?: string;
}

/**
 * Options for the 'delete' command.
 * Deletes a published Custom App design.
 *
 * @interface DeleteCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo delete
 * domo delete --id abc-123
 * domo delete --force
 * ```
 */
export interface DeleteCommandOptions extends CliCommandOptions {
  /**
   * Design ID (UUID) to delete.
   * @type {string}
   */
  id?: string;

  /**
   * Skip confirmation prompt.
   * @type {boolean}
   * @default false
   */
  force?: boolean;
}

/**
 * Options for the 'undelete' command.
 * Restores a soft-deleted Custom App design.
 *
 * @interface UndeleteCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo undelete --id abc-123
 * ```
 */
export interface UndeleteCommandOptions extends CliCommandOptions {
  /**
   * Design ID (UUID) to restore.
   * @type {string}
   */
  id?: string;
}

/**
 * Options for the 'ls' command.
 * Lists all Custom App designs.
 *
 * @interface LsCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo ls
 * domo ls --all
 * domo ls --deleted
 * ```
 */
export interface LsCommandOptions extends CliCommandOptions {
  /**
   * Show all designs (admin view).
   * @type {boolean}
   * @default false
   */
  all?: boolean;

  /**
   * Show deleted designs only.
   * @type {boolean}
   * @default false
   */
  deleted?: boolean;
}

/**
 * Options for the 'release' command.
 * Prepares an app for release to the app store.
 *
 * @interface ReleaseCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo release
 * domo release --id abc-123 --version 2
 * ```
 */
export interface ReleaseCommandOptions extends CliCommandOptions {
  /**
   * Design ID (UUID) to release.
   * @type {string}
   */
  id?: string;

  /**
   * Version number to release.
   * @type {string}
   */
  version?: string;
}

/**
 * Options for the 'owner' command.
 * Manages app ownership (add/remove/list owners).
 *
 * @interface OwnerCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo owner ls --id abc-123
 * domo owner add --id abc-123
 * domo owner rm --id abc-123
 * ```
 */
export interface OwnerCommandOptions extends CliCommandOptions {
  /**
   * Design ID (UUID) to manage owners for.
   * @type {string}
   */
  id?: string;
}

/**
 * Options for the 'remove' command.
 * Removes saved Domo instance login credentials.
 *
 * @interface RemoveCommandOptions
 * @extends {CliCommandOptions}
 * @example
 * ```bash
 * domo remove
 * domo remove --all
 * ```
 */
export interface RemoveCommandOptions extends CliCommandOptions {
  /**
   * Remove all saved instances.
   * @type {boolean}
   * @default false
   */
  all?: boolean;
}
