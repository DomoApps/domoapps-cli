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
- `domo login` - Interactive login with username/password
- `domo login --instance company.domo.com` - Login to specific instance

#### Token-Based Login
- `domo login -t <TOKEN>` or `domo login --token <TOKEN>` - Login with developer token
- `domo login --token-only` - Interactive token prompt
- `domo token add` - Add developer token for password-less auth
- `domo token remove` - Remove stored developer token

**Token Authentication Examples:**
```bash
# Login with developer token (short form)
domo login -i company.domo.com -t DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34

# Login with developer token (long form)
domo login --instance company.domo.com --token DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34

# Interactive token prompt
domo login --instance company.domo.com --token-only

# Traditional OAuth login (default)
domo login --instance company.domo.com
```

**Getting Your Developer Token:**
Developer tokens can be found in the Admin section of your Domo instance. Tokens are alphanumeric strings (letters and numbers only). Token-based authentication is ideal for CI/CD pipelines and automated workflows.

#### Session Management
- `domo logout` - Sign out from current instance
- `domo remove` - Remove saved login credentials

### Development

- `domo init [name]` - Create a new Custom App
- `domo dev` - Start development server
- `domo download [id]` - Download existing app

### Publishing

- `domo publish` - Publish your app to Domo
- `domo release` - Prepare app for app store
- `domo delete [id]` - Delete published app
- `domo undelete [id]` - Restore deleted app

### Management

- `domo ls` - List your apps
- `domo owner [id]` - View app ownership
- `domo remove` - Remove login instances

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

- **Hello World** - Basic starter template
- **Basic Chart** - Chart visualization template
- **Map Chart** - Geographic data visualization
- **Sugarforce** - Salesforce integration template

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
```

## 🎨 App Templates

Choose from professionally designed templates:

- **Hello World** - Perfect for learning the basics
- **Basic Chart** - Ready-to-use chart components
- **Map Chart** - Geographic data visualization
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
