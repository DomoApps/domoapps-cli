# Domo Apps CLI

[![npm version](https://img.shields.io/npm/v/ryuu.svg?style=flat-square)](https://www.npmjs.org/package/ryuu)
[![install size](https://img.shields.io/badge/dynamic/json?url=https://packagephobia.com/v2/api.json?p=ryuu&query=$.install.pretty&label=install%20size&style=flat-square)](https://packagephobia.com/result?p=ryuu)
[![npm downloads](https://img.shields.io/npm/dm/ryuu.svg?style=flat-square)](https://npm-stat.com/charts.html?package=ryuu)
[![Known Vulnerabilities](https://snyk.io/test/npm/ryuu/badge.svg)](https://snyk.io/test/npm/ryuu)

The official command-line interface for developing, publishing, and managing Domo Custom Apps. Build powerful data applications with modern web technologies and deploy them directly to the Domo platform.

## 🚀 Quick Start

### Installation

```bash
npm install -g ryuu
```

### First Steps

1. **Login to Domo:**

   ```bash
   # OAuth (interactive)
   domo login

   # Or token-based (CI/CD friendly)
   domo login -t YOUR-DEVELOPER-TOKEN
   ```

2. **Create a new app:**

   ```bash
   domo init my-app
   ```

3. **Start developing:**

   ```bash
   domo dev
   ```

4. **Publish your app:**

   ```bash
   domo publish
   ```

## 📖 Documentation

- **[CLI Documentation](https://developer.domo.com/portal/rmfbkwje8kmqj-domo-apps-cli)** - Complete CLI reference
- **[Installation Guide](https://developer.domo.com/portal/6hlzv1hinkq19-setup-and-installation)** - Detailed setup instructions
- **[App Framework Guide](https://developer.domo.com/portal/d54m2ohkacza0-welcome)** - Learn the Domo App Framework

## 🛠️ Commands

### Authentication

The CLI supports two authentication methods:

#### OAuth Login (Default)

```bash
domo login                                    # Interactive login
domo login -i company.domo.com               # Login to specific instance
```

**Options:**

- `-i, --instance <value>` - Domo instance hostname
- `-u, --user-email <value>` - User email address
- `--migrate` - Migrate login files from ryuu 3.x
- `--no-upgrade-check` - Skip version check
- `--upgrade-download` - Auto-download newer version

#### Token-Based Login

```bash
# Login with developer token
domo login -i company.domo.com -t DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34

# Interactive token prompt
domo login -i company.domo.com --token-only
```

**Options:**

- `-t, --token <value>` - Developer token for authentication
- `--token-only` - Force token-only mode (will prompt)

**Getting Your Developer Token:**
Developer tokens can be found in the Admin section of your Domo instance. Tokens are alphanumeric strings (letters and numbers only). Token-based authentication is ideal for CI/CD pipelines and automated workflows.

#### Token Management

```bash
domo token add                               # Add developer token
domo token add -i company.domo.com -t TOKEN  # Add token non-interactively
domo token remove                            # Remove stored token
domo token remove -i company.domo.com        # Remove token for specific instance
```

**Options:**

- `-i, --instance <value>` - Domo instance
- `-t, --token <value>` - Developer token value

#### Session Management

```bash
domo logout                                  # Sign out from current instance
domo logout -i company.domo.com             # Sign out from specific instance
domo remove                                  # Remove saved login (interactive)
domo remove --instance company.domo.com     # Remove specific instance
domo remove --all                            # Remove all saved logins
```

### Development

#### Initialize New App

```bash
domo init                                    # Interactive app creation
domo init -n "My App" -t "hello world"      # Non-interactive creation
domo init --no-datasets                      # Skip dataset prompts
```

**Options:**

- `-n, --design_name <value>` - Name of the design
- `-t, --template <value>` - Starter template (choices: `hello world`, `manifest only`, `basic chart`, `map chart`, `sugarforce`)
- `--no-datasets` - Skip dataset prompting
- `-i, --dataset-id [value...]` - Dataset IDs (multiple)
- `-a, --dataset-alias [value...]` - Dataset aliases (multiple)

#### Development Server

```bash
domo dev                                     # Start dev server
domo dev -u USER_ID                          # Use specific user ID
domo dev -e                                  # Allow external connections
```

**Options:**

- `-u, --userId <value>` - Use a specific userId
- `-e, --external` - Allow external connections to dev server

#### Download Existing App

```bash
domo download                                # Interactive download
domo download -i DESIGN_ID                   # Download specific design
domo download -i DESIGN_ID -d latest         # Download specific version
```

**Options:**

- `-i, --design-id <id>` - Design ID to download
- `-d, --design-version <version>` - Design version (default: `latest`)

### Publishing

#### Publish App

```bash
domo publish                                 # Publish app
domo publish -g                              # Publish and open in browser
domo publish --build-dir ./dist              # Publish from build directory
domo publish --build-dir ./build -g          # Publish from build directory and open in browser
```

**Options:**

- `-g, --go` - Navigate to design in Asset Library after publishing
- `-d, --build-dir <path>` - Path to build directory containing the app files (defaults to current directory)

#### Release to App Store

```bash
domo release                                 # Interactive version selection
domo release -v latest                       # Release latest version (non-interactive)
domo release -v 1.0.0                        # Release specific version
```

**Options:**

- `-v, --version <value>` - Version to release (bypasses interactive prompt, defaults to `latest`)

#### Delete App

```bash
domo delete                                  # Delete app in current directory
domo delete DESIGN_ID                        # Delete specific design
domo delete -f                               # Force delete (skip confirmation)
```

**Options:**

- `-f, --force` - Delete even if referenced by Custom Apps
- `-c, --confirm` - Auto-confirm deletion (skip prompt)

#### Restore Deleted App

```bash
domo undelete                                # Undelete app in current directory
domo undelete DESIGN_ID                      # Undelete specific design
```

### Management

#### List Apps

```bash
domo ls                                      # List all your published apps
```

Displays a table with:

- Design Name
- Design ID
- Version
- Last Published date
- URL to Asset Library

#### Manage Owners

```bash
domo owner ls                                # List owners
domo owner add user@company.com              # Add owner
domo owner rm user@company.com               # Remove owner
domo owner add user1@co.com user2@co.com    # Add multiple owners
```

**Options:**

- `-i, --designId <id>` - Specify design ID (otherwise reads from manifest)

#### Configure Proxy

```bash
domo proxy proxy.company.com 8080            # Set proxy
domo proxy proxy.company.com 8080 -a         # Set proxy with authentication
domo proxy -r                                # Remove proxy
```

**Options:**

- `-r, --remove-proxy` - Remove current proxy settings
- `-a, --auth` - Enable username authentication for proxy

## 🎯 Features

### Flexible Authentication

- **OAuth Login** - Traditional username/password authentication
- **Token-Based Login** - Developer token for CI/CD pipelines
- **Multi-Instance Support** - Manage multiple Domo instances
- **Secure Credential Storage** - Encrypted token storage

### Modern Development Experience

- **Real-time autocomplete** for instance selection
- **Single-key confirmations** (y/n without Enter)
- **Interactive prompts** with modern UX
- **TypeScript support** with full type safety

### App Templates

- **Hello World** - Basic starter template with HTML/JS/CSS
- **Manifest Only** - Minimal template with just manifest.json
- **Basic Chart** - Chart visualization template with D3.js
- **Map Chart** - Geographic data visualization with mapping
- **Sugarforce** - Salesforce integration with pre-built components

### Development Tools

- **Hot reload** during development
- **Live preview** with browser sync
- **Asset optimization** and bundling
- **Source maps** for debugging

## 🔧 Configuration

### Environment Variables

```bash
# Disable SSL verification (development only)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Force color output
FORCE_COLOR=1
```

### Proxy Support

```bash
# Configure proxy for corporate networks
domo proxy [host] [port]
```

## 📦 Requirements

- **Node.js** 16+
- **npm** 7+
- **Domo account** with developer access

## 🚀 Getting Started

### 1. Install the CLI

```bash
npm install -g ryuu
```

### 2. Login to Domo

**Option A: OAuth (Interactive)**

```bash
domo login
# Follow the prompts to authenticate with username/password
```

**Option B: Token-Based (Recommended for CI/CD)**

```bash
domo login -i company.domo.com -t YOUR-DEVELOPER-TOKEN
# Or use --token-only for interactive token prompt
```

### 3. Create Your First App

```bash
domo init my-first-app
cd my-first-app
```

### 4. Start Development

```bash
domo dev
# Opens browser at http://localhost:3000
```

### 5. Publish to Domo

```bash
domo publish
# Your app is now live on Domo!

# Or publish from a build directory
domo publish --build-dir ./dist
```

## 🎨 App Templates

Choose from professionally designed templates:

- **Hello World** - Perfect for learning the basics (HTML/JS/CSS)
- **Manifest Only** - Minimal setup with just manifest.json
- **Basic Chart** - Ready-to-use D3.js chart components
- **Map Chart** - Geographic data visualization with mapping
- **Sugarforce** - Salesforce integration with pre-built components

## 🔍 Troubleshooting

### Common Issues

**Login Problems:**

```bash
# Clear stored credentials and re-login
domo logout
domo login

# For token authentication issues
domo login -i company.domo.com --token-only
```

**Token Validation Errors:**

Tokens must be alphanumeric strings (letters and numbers only):

- Valid example: `DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34`
- Minimum length: 20 characters
- No special characters, spaces, or dashes allowed

If you receive an "Invalid token format" error, verify your token from the Admin section of Domo contains only letters and numbers.

**Build Errors:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Proxy Issues:**

```bash
# Configure corporate proxy
domo proxy your-proxy.com 8080
```

### Getting Help

- 📚 [Documentation](https://developer.domo.com/portal/rmfbkwje8kmqj-domo-apps-cli)
- 💬 [Community Forum](https://developer.domo.com/community)
- 🐛 [Report Issues](https://github.com/domoinc/domoapps-cli/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

**Built with ❤️ by the Domo team**
