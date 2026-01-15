# Domo Apps CLI

The Domo Apps Command Line Interface (CLI) is your primary tool to:

- Create
- Publish
- Edit

Custom App designs in your Domo instance.

## Installation

The Domo Apps CLI is available for installation via Homebrew, Chocolatey, or npm.

For long-term support (LTS), we recommend using Homebrew or Chocolatey. If you prefer the latest features, you can install the canary version via npm.

For more details on installing the CLI, see the [Setup and Installation Guide](https://developer.domo.com/portal/1h1m3fhvr4v0t-domo-apps-cli).

## Usage

For a complete list of available commands, use `domo --help`

### Global Options

| Option | Description |
|--------|-------------|
| `-v, --version` | Output the version number |
| `-s, --ssl` | Disable SSL |
| `-m, --manifest <filename>` | Specify a manifest file. Defaults to `manifest.json` in the current working directory |
| `-h, --help` | Output usage information |

---

## Authentication Commands

### Login

Authenticate to your Domo instance from the CLI. This is required before running other commands like `publish`, or for fetching data during `domo dev`. If no options are provided, you'll be prompted to choose from a list of previous instances or a "new instance", at which point you'll be prompted for instance name, username, and password.

```
domo login [options]
```

| Option | Description |
|--------|-------------|
| `-i, --instance <value>` | Domo instance (e.g. customer.domo.com) |
| `-u, --user-email <value>` | User email address |
| `-t, --token <value>` | Developer token for authentication |
| `--token-only` | Force token-only authentication mode (will prompt for token) |
| `-f, --manifest-file <file>` | Use a specific manifest file |
| `--migrate` | Migrate login files from ryuu 3.x |
| `--no-upgrade-check` | Prevent the CLI from checking for new versions |
| `--upgrade-download` | Automatically download newer version if available |

### Logout

Log out of a Domo instance. If no instance is specified, logs out of the current instance.

```
domo logout [options]
```

| Option | Description |
|--------|-------------|
| `-i, --instance <value>` | Domo instance to logout from |

### Token

Add or remove developer tokens for authentication. Developer tokens are useful for CI/CD pipelines where interactive OAuth login is not possible.

```
domo token <add|remove> [options]
```

| Option | Description |
|--------|-------------|
| `-i, --instance <value>` | Domo instance |
| `-t, --token <value>` | Token value (used with `add` command) |

**Example:**
```bash
# Add a token for an instance
domo token add -i mycompany.domo.com -t YOUR_TOKEN_HERE

# Remove a token from an instance
domo token remove -i mycompany.domo.com
```

### Remove

Remove saved login instances from your local configuration.

```
domo remove [options]
```

| Option | Description |
|--------|-------------|
| `--instance <value>` | Name of instance to remove |
| `-a, --all` | Remove all saved instances |

If neither option is provided, you'll be prompted to select an instance interactively.

---

## Development Commands

### Init

Initialize a new Custom App design template. Once complete, follow the "Next Steps" provided.

```
domo init [options]
```

| Option | Description |
|--------|-------------|
| `-n, --design_name <value>` | App name |
| `-t, --template <value>` | Template selection |
| `--no-datasets` | Skip dataset prompting |
| `-i, --dataset-id [value...]` | Dataset IDs as arguments |
| `-a, --dataset-alias [value...]` | Dataset aliases as arguments |

> **Note:** `domo init` will create the folder for you - no `mkdir` necessary.

#### Prompts

- **Design name**: The name of your Custom App
- **Select a starter**: Choose from available templates (see below)
- **Connect to datasets**: Optionally connect to datasets

#### Starters

| Template | Description |
|----------|-------------|
| `hello world` | Basic project with `app.css`, `app.js`, `domo.js`, `index.html`, and `manifest.json` |
| `manifest only` | Adds a single `manifest.json` file to the current directory |
| `basic chart` | Starter for rendering a basic Domo Phoenix bar chart |
| `map chart` | Starter for rendering a Domo Phoenix world map chart |
| `sugarforce` | Complex app with multiple screens, tabbing, database CRUD operations, and more |

#### Dataset Mapping Prompts

If you choose to connect to datasets, you'll be prompted for:

- **Dataset ID**: Found in the URL of the DataSet detail page: `https://[customer].domo.com/datasources/[dataset id]/details/overview`
- **Dataset alias**: The alias your app uses when requesting data. Must not contain spaces or special characters.

> **Note:** Complete the field mapping in `manifest.json`. Refer to the [manifest reference documentation](https://developer.domo.com/portal/2j27lwrqkfr21-manifest-json-reference) for details.

### Dev

Start a local development server with live reload and data proxying.

```
domo dev [options]
```

| Option | Description |
|--------|-------------|
| `-u, --userId <value>` | Use a specific userId. Helpful for testing app states where user ID is important |
| `-e, --external` | Expose the dev server on a public IP address |

**Features:**

- **Live Reload**: Automatically reloads when code changes are detected
- **App Sizing**: Renders the app in a frame that honors the sizing and fullpage settings from the manifest
- **Data Proxy**: Proxies basic XHR requests for data to the appropriate Domo instance, enabling local development with live data

### Download

Download an existing Custom App design from your Domo instance.

```
domo download [options]
```

| Option | Description |
|--------|-------------|
| `-i, --design-id <id>` | Design ID to download |
| `-d, --design-version <version>` | Design version (defaults to 'latest') |

If options are not provided, you'll be prompted interactively.

---

## Publishing Commands

### Publish

Upload all assets from your current working directory as a Custom App design.

```
domo publish [options]
```

| Option | Description |
|--------|-------------|
| `-g, --go` | Open the design in Asset Library after publishing |
| `-d, --build-dir <path>` | Path to build directory containing the app files |

**Notes:**

- Files can be ignored by adding patterns to the `ignore` array in `manifest.json`. All `node_modules` directories are ignored by default.
- If no existing ID is found in the manifest, a new design is created and the manifest is updated with the new design ID.
- Existing designs are updated when the manifest contains a design ID.

#### Supported File Extensions

The following file types are supported for upload:

| Category | Extensions |
|----------|------------|
| **Web** | `.html`, `.css`, `.js`, `.jsx`, `.ts`, `.tsx`, `.vue`, `.json`, `.map` |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.ico`, `.webp`, `.bmp`, `.tiff`, `.tif`, `.eps` |
| **Config** | `.yaml`, `.yml`, `.toml`, `.xml`, `.graphql` |
| **Other** | `.md`, `.py`, `.sh`, `.sql`, `.dockerfile`, `.sass` |

Files with extensions not in this list will still be uploaded but may not have the correct content type set.

### Release

Lock a design version for submitting to the Domo Appstore. Once a version is released, you cannot make further changes to it. To continue development, bump the version in the manifest file.

```
domo release [options]
```

| Option | Description |
|--------|-------------|
| `-v, --version <value>` | Version to release (bypasses interactive prompt, defaults to 'latest') |

### Delete

Delete a published design by its ID.

```
domo delete [id] [options]
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Delete the design even if it is referenced by Custom Apps |
| `-c, --confirm` | Auto-confirm without prompting |

If no ID is provided, the design ID from the manifest file is used.

### Undelete

Restore a soft-deleted design.

```
domo undelete [id]
```

If no ID is provided, the design ID from the manifest file is used. You'll be prompted to confirm before restoring.

---

## Management Commands

### Ls

List all your Custom App designs.

```
domo ls [options]
```

| Option | Description |
|--------|-------------|
| `-a, --all` | List all designs on current instance (admin role required) |
| `-d, --deleted` | Include deleted designs |

The output includes design name, ID, creation date, last updated date, and a link to the Asset Library.

### Owner

Manage the owners of a Custom App design.

Only owners of a design can manage it from the CLI or the Asset Library within the Domo instance. Additionally, only owners are authorized to deploy new apps based on that design.

```
domo owner <add|rm|ls> [user-emails...] [options]
```

| Option | Description |
|--------|-------------|
| `-i, --designId <id>` | Specify a design ID (defaults to ID from manifest file) |

**Examples:**
```bash
# List owners
domo owner ls

# Add an owner
domo owner add user@company.com

# Remove an owner
domo owner rm user@company.com
```

---

## Configuration Commands

### Proxy

Configure a proxy through which all CLI commands will be routed. Useful for corporate networks that require proxy access.

```
domo proxy [host] [port] [options]
```

| Option | Description |
|--------|-------------|
| `-r, --remove-proxy` | Remove current proxy settings |
| `-a, --auth` | Enable proxy authentication (password will be prompted on each command) |

**Examples:**
```bash
# Set a proxy
domo proxy proxy.company.com 8080

# Set a proxy with authentication
domo proxy proxy.company.com 8080 -a

# Remove proxy settings
domo proxy -r
```

---

## Developer Token Authentication

Developer tokens provide an alternative to OAuth for authentication, making them ideal for CI/CD pipelines and automated workflows.

### Token Requirements

- **Format**: Alphanumeric characters only (letters and numbers)
- **Minimum length**: 20 characters
- **Location**: Generate tokens in the Admin section of your Domo instance

### Using Tokens

**Method 1: Using the `token` command**
```bash
# Add a token
domo token add -i mycompany.domo.com -t YOUR_TOKEN_HERE

# All subsequent commands will use the token automatically
domo publish
```

**Method 2: Using the `login` command with `--token`**
```bash
domo login -i mycompany.domo.com -t YOUR_TOKEN_HERE
```

Once a token is set for an instance, all subsequent CLI commands to that instance will use the token for authentication without requiring interactive login.

---

## Advanced Data Proxy for Local Development

To enable proxying for advanced requests (like AppDB, Files, Code Engine, and Workflows APIs), you must provide the ID of an app in your instance that the CLI can proxy to.

### Setup

1. Add the app ID to your `manifest.json` under the `proxyId` property
2. Find proxy IDs on the App Design page under the "Cards" tab
3. Run `domo dev` - advanced request proxying will work automatically

### Important Notes

- Proxy IDs tie apps to Cards
- If you delete the Card from which you retrieved the ID, you'll need to get a new one from another card created from your app design
- The `proxyId` is automatically set when you first run `domo dev` if you have a design ID
