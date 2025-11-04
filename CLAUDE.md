# Domoapps CLI Architecture Guide

> An official CLI for developing, publishing, and managing Domo Custom Apps. This guide provides deep architectural insights for Claude Code instances working on this codebase.

## Project Overview

**Name**: Ryuu (published as `domo` CLI command)
**Version**: 5.0.0-beta.4
**Type**: TypeScript-based Node.js CLI tool
**Primary Purpose**: Enable developers to create, develop, and deploy Custom Apps to the Domo platform
**NPM Package**: `ryuu` (globally installable)

### Core Philosophy
- OAuth and token-based authentication for flexibility
- Local development with hot reload via Vite
- Seamless integration with Domo's REST APIs
- Multi-instance support for enterprise users
- Strong type safety with TypeScript

---

## High-Level Architecture

```
CLI Entry Point (domo.ts)
    ↓
Commander.js Program Setup
    ↓
Dynamic Command Loading (*.ts files from /commands)
    ↓
Command Implementations
    ├── Authentication (login, logout, token, remove)
    ├── Development (dev, init, download)
    ├── Publishing (publish, release, delete, undelete)
    ├── Management (ls, owner)
    └── Utility (proxy)
    ↓
Core Services
    ├── Login/Session Management (Configstore-based)
    ├── Manifest Management
    ├── Vite Dev Server
    ├── Domo API Client (ryuu-client library)
    └── Proxy Configuration
```

---

## Directory Structure & Purposes

### `/src` - Source Code
- **`bin/domo.ts`** - CLI entry point, version, help, and command loading
- **`commands/`** - Individual command implementations (14 total)
  - Authentication: `login.ts`, `logout.ts`, `token.ts`, `remove.ts`
  - Development: `init.ts`, `dev.ts`, `download.ts`
  - Publishing: `publish.ts`, `release.ts`, `delete.ts`, `undelete.ts`
  - Management: `ls.ts`, `owner.ts`, `proxy.ts`
- **`models/`** - Type definitions and interfaces
  - `interfaces/command.ts` - All CLI command option interfaces
  - `interfaces/login.ts` - Login/session interfaces
  - `interfaces/oauth.ts` - OAuth registration types
  - `interfaces/server.ts` - Dev server configuration
  - `enums/constant.ts` - Constants, client ID, logo
  - `templates.ts` - Template definitions
- **`util/`** - Shared utility modules
  - `BaseCommand.ts` - Abstract base class for all commands
  - `login.ts` - Session management, Configstore integration
  - `session.ts` - Auth validation against Domo API
  - `manifest.ts` - Manifest JSON parsing, validation, persistence
  - `oauth.ts` - OAuth flow implementation
  - `prompts.ts` - Inquirer.js interactive prompts
  - `log.ts` - Colored console output
  - `appStructure.ts` - App structure validation
  - `systemCheck.ts` - Node version verification
- **`server/`** - Vite dev server and UI
  - `server.ts` - Vite dev server startup logic
  - `vite-plugin-domo.ts` - Custom Vite plugin for Domo integration
  - `ui/` - React-based dev server UI
    - `App.tsx`, `main.tsx` - React application
    - `components/` - AppPreview, Controls, Warning components
    - `public/` - Static assets (favicon, etc.)

### `/templates` - Starter Templates
- `hello world/` - Basic HTML/CSS/JS template
- `basic chart/` - D3.js chart template
- `map chart/` - Geographic visualization template
- `sugarforce/` - Complex CRM-style template
- `manifest only/` - Minimal template

### `/tests` - Test Infrastructure
- `setup.ts` - Jest configuration and test setup
- `commands/` - Command unit tests
- `util/` - Utility function tests
- `models/` - Model/interface tests

---

## Command Architecture

### Dynamic Command Loading Pattern

Commands are loaded dynamically at runtime from `/commands` directory:

1. **Entry Point** (`bin/domo.ts`)
   - Uses `fs.readdirSync()` to find all `.js` files in compiled commands directory
   - Fallback to multiple paths for global installations
   - Sorts commands alphabetically for consistency
   - Requires each file, passing the Commander program instance

2. **Command Module Export**
   - Commands are CommonJS modules exporting a function
   - Function receives Commander program instance as parameter
   - Registers command on program using `program.command()`
   - Defines options and action handler

3. **Example Pattern** (from `dev.ts`)
   ```typescript
   module.exports = (program: Command) => {
     program
       .command('dev')
       .description('work locally on a Custom App')
       .option('-u, --userId <value>', 'Use a specific userId')
       .option('-e, --external', 'Allow external connection')
       .action(opts => {
         // Command logic here
       });
   };
   ```

### BaseCommand Abstract Class
- Defines interface for command implementations
- Provides logging helpers: `logInfo()`, `logOk()`, `logFail()`, `logWarn()`
- Not widely used in current codebase (most commands use module.exports pattern)

---

## Authentication System

### Dual Authentication Methods

#### 1. OAuth (Default)
- Interactive login via browser
- Uses `ryuu-client` library (dependency: `ryuu-client@4.4.4`)
- Supports username/email and password
- Refresh tokens stored locally via Configstore
- Flow: `Login.getClient()` → creates Domo client → validates session

#### 2. Token-Based (CI/CD Friendly)
- Developer token authentication
- Tokens must be alphanumeric (letters & numbers only)
- Minimum length: 20 characters
- Format: `DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34`
- Stored the same way as OAuth refresh tokens
- Flag: `devToken` boolean distinguishes token vs OAuth auth

### Session Storage

**Location**: `~/.domo/ryuu/{instance}.json` files
**Manager**: Configstore library (v7.1.0)
**Storage**: JSON files with:
- `instance` - Domo instance hostname
- `refreshToken` - OAuth refresh token or developer token
- `devToken` - Boolean flag indicating token auth

**Key Classes**:
- `Login` (`util/login.ts`) - Manages session creation and retrieval
- `Session` (`util/session.ts`) - Validates auth against `/auth/validate` endpoint

### Multi-Instance Support
- Multiple Domo instances can be logged in simultaneously
- Each instance has its own config file
- Most recent login is the "current" login
- Commands can target specific instances via `-i/--instance` option

---

## Domo API Integration

### Client Library
- **Dependency**: `ryuu-client@4.4.4`
- **Usage**: All API calls go through Domo client instance
- **Client ID**: `domo:internal:devstudio` (constant)

### Key API Operations
```typescript
// From login.ts and publish.ts
client.getClient()                  // Get authenticated Domo client
client.getDomoappsData(manifest)    // Get app data for dev server
client.createDesign(manifest)       // Create new app design
client.getDesign(id, options)       // Fetch design metadata
client.uploadAllAssets(manifest)    // Upload app files
client.processRequest(options)      // Generic API request
client.createApp(designId)          // Create app instance (for proxy)
client.getInstance()                // Get current instance hostname
```

### Error Handling
Main entry point (`bin/domo.ts`) catches unhandled rejections:
- **401/403**: Authentication failures → prompt to re-login
- **404 with "No Design found"**: Design ID not found → publish first
- **Other statusCode errors**: Generic API error messages

---

## Development Server Architecture

### Vite-Based Dev Server
**File**: `src/server/server.ts`

1. **Initialization**
   - Validates session with `Session.check()`
   - Dynamically imports Vite (ESM/CommonJS interop)
   - Sets up Vite config with React plugin and custom Domo plugin

2. **Key Features**
   - Hot reload on file changes
   - React fast refresh
   - Custom middleware for Domo integration
   - Port: 3000 (default, auto-increment if in use)
   - External access option: `--external` binds to `0.0.0.0`

### Vite Plugin (`vite-plugin-domo.ts`)

**Purpose**: Bridge between Domo API and dev server

**Features**:
1. **Manifest Data Fetching**
   - Calls `client.getDomoappsData(manifest)` at startup
   - Calculates canvas size: width/height multipliers applied
   - Gets user ID and customer ID
   - Caches for template injection

2. **Proxy Management**
   - Creates temporary app instance if design ID exists
   - Stores `proxyId` in manifest
   - Supports AppDB, Files, Code Engine APIs
   - Warns if no design ID (advanced features unavailable)

3. **Middleware**
   - Favicon serving from public directory
   - Custom request/response handling
   - Server-Sent Events (SSE) support for hot reload coordination

4. **File Serving**
   - Detects if running from built or source version
   - Serves UI from `src/server/ui` or `dist/server/ui`
   - Configures public directory for static assets

### Dev Server UI (React)
**Location**: `src/server/ui/`

Components:
- **App.tsx** - Main React app component
- **AppPreview.tsx** - Displays the Custom App preview
- **Controls.tsx** - Dev controls and information
- **Warning.tsx** - Warning messages for missing config

Purpose: Provides interactive dev environment with real-time app preview

---

## Manifest Management

### Manifest File Structure
- **Location**: `manifest.json` in project root
- **Type**: Defined in `ryuu-client` library
- **Key Fields**:
  - `name` - App name (required)
  - `version` - Semantic version (required, validated)
  - `id` - Design ID (set after first publish)
  - `size` - Canvas size dimensions
  - `proxyId` - App instance ID (set after first dev server run)
  - `dataSources` - Dataset connections

### Manifest Operations (`util/manifest.ts`)

**Key Functions**:
```typescript
getManifest(manifestName?, verifyValid?)        // Load & parse manifest
hasManifest(manifestName)                       // Check if exists
persistDesignId(id, manifest)                   // Save design ID to manifest
updateManifest(manifest)                        // Write manifest to disk
validateManifest(manifest)                      // Validate required fields
```

**Validation Rules**:
- Must have `name` and `version` fields
- Version must be valid semver
- Uses `semver` package for validation

---

## Template System

### Template Definitions (`models/templates.ts`)

Five built-in templates:
1. **hello world** - Basic starter, HTML/CSS/JS
2. **basic chart** - D3.js chart visualization
3. **map chart** - Geographic visualization
4. **sugarforce** - Complex CRM-style app
5. **manifest only** - Minimal, just manifest.json

Each template has:
- Name identifier
- Description
- File list for copying

### Template Copying
- During `domo init`, template is copied to project directory
- Uses glob patterns to copy all files
- Supports dataset connection prompts

---

## Build & Distribution System

### Build Process

**Script**: `npm run build`
```bash
tsc                                    # Compile TypeScript to dist/
```

**PostBuild**: `npm run postbuild`
```bash
cp -r src/server/domodev/ dist/server/domodev      # Copy dev assets
cp -r src/server/ui/ dist/server/ui                # Copy React UI
cp src/bin/runner dist/bin/                        # Copy runner script
cp src/bin/domo.cmd dist/bin/                      # Copy Windows batch
cp -r templates/ dist/templates                    # Copy templates
```

**Executable**: 
- `bin: { "domo": "./dist/bin/domo.js" }`
- After install: `domo` command available globally

### Package Files Included
```
files: [
  "dist/",
  "dist/bin/",
  "dist/commands/",
  "dist/models/",
  "dist/server/",
  "dist/templates/",
  "dist/util/"
]
```

### Release Scripts
```
npm run release:production    # Build & publish to npm (production tag)
npm run release:alpha        # Publish with alpha tag
npm run release:beta         # Publish with beta tag
```

---

## Testing Infrastructure

### Unit Tests (Jest)

**Configuration**: `jest.config.js`
- Preset: `ts-jest` (TypeScript compilation on-the-fly)
- Environment: Node.js
- Test pattern: `**/tests/**/*.test.ts`
- Timeout: 10 seconds per test
- Setup file: `tests/setup.ts`

**Test Directories**:
- `tests/commands/` - Command unit tests
- `tests/util/` - Utility function tests
- `tests/models/` - Type and model tests

**Running Tests**:
```bash
npm test                     # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Integration Tests

**Configuration**: `integration-test.config.js`

**Scope**: Real Domo instance testing
- Multi-instance support
- Template testing
- App lifecycle (create → publish → release → delete)
- Authentication methods (OAuth, token)
- Error scenarios (invalid credentials, network failures)
- Cross-platform shell testing

**Setup**:
```bash
npm run test:integration:validate    # Validate test environment
npm run test:integration            # Run full suite
```

**Environment**: `integration-test.env` (credentials from env vars)

**Test Timeouts**:
- Per test: 5 minutes
- Per command: 1 minute
- Login: 30 seconds
- Publish: 3 minutes

---

## Code Quality & Linting

### ESLint Configuration

**File**: `eslint.config.js` (Flat ESLint format)

**Parser**: `@typescript-eslint/parser`

**Rules**:
- Strict TypeScript checking
- Unix line endings enforced
- Single quotes required
- Semicolons required
- No unused variables (warn level)
- Prettier integration for formatting

**Pre-commit Hook**:
```bash
# .husky/pre-commit
npm run build
```
Forces build before each commit via Husky

### Prettier Integration
- Configuration: `.prettierrc`
- Enforced via ESLint plugin
- Code formatting on save

---

## Key Dependencies & Versions

### Core Runtime
- **commander** (14.0.1) - CLI argument parsing
- **axios** (1.7.9) - HTTP client
- **ryuu-client** (4.4.4) - Domo API client
- **vite** (7.1.11) - Dev server & bundler
- **react** (19.2.0) - UI library
- **express** (5.1.0) - Middleware for dev server

### Authentication & Config
- **configstore** (7.1.0) - Credential storage (JSON files)
- **jwt-decode** (4.0.0) - JWT parsing
- **enquirer** (2.4.1) - Interactive prompts
- **@domoinc/ryuu-proxy** (5.0.1) - Proxy for Domo APIs

### Utilities
- **lodash** (4.17.21) - Utility functions
- **chalk** (4.1.2) - Colored console output
- **glob** (11.0.3) - File pattern matching
- **semver** (7.7.3) - Version validation
- **fs-extra** (11.3.2) - Enhanced fs operations
- **extract-zip** (2.0.1) - ZIP extraction
- **open** (10.2.0) - Open URLs in browser
- **shelljs** (0.10.0) - Shell commands
- **slug** (11.0.1) - URL-safe strings
- **validator** (13.15.15) - Input validation

### Dev Dependencies
- **typescript** (5.9.3) - TypeScript compiler
- **jest** (30.2.0) - Test framework
- **ts-jest** (29.4.5) - Jest TypeScript support
- **@typescript-eslint/** - ESLint plugins
- **eslint** (9.38.0) - Linter
- **prettier** (3.6.2) - Code formatter
- **husky** (9.1.7) - Git hooks

---

## Common Development Workflows

### Adding a New Command

1. **Create command file**: `src/commands/mycommand.ts`
   ```typescript
   import {Command} from 'commander';
   
   module.exports = (program: Command) => {
     program
       .command('mycommand')
       .description('Description of command')
       .option('-o, --option <value>', 'Option description')
       .action(async (options) => {
         // Command logic
       });
   };
   ```

2. **Add to TypeScript**: Define option interface in `src/models/interfaces/command.ts`

3. **Build**: `npm run build`

4. **Test**: Add tests in `tests/commands/mycommand.test.ts`

### Running Locally

```bash
# Install dependencies
pnpm install

# Build
npm run build

# Test build
./dist/bin/domo.js --version

# Symlink for local testing
npm link
domo --help
```

### Making Changes

1. **Edit TypeScript** in `/src`
2. **Build**: `npm run build`
3. **Test locally**: `./dist/bin/domo.js` or `domo` (if linked)
4. **Lint**: ESLint runs pre-commit hook

### Debugging

- **Verbose output**: Add `--ssl` flag to see detailed errors
- **Unhandled rejections**: Logged to console with stack traces
- **Dev server**: Logs to console with `logLevel: 'info'`

---

## Important Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, entry point |
| `tsconfig.json` | TypeScript compiler options (target: ES2020) |
| `jest.config.js` | Test runner configuration |
| `eslint.config.js` | Linting rules (Flat format) |
| `.prettierrc` | Code formatting rules |
| `vite.config.ts` | Vite bundler config for UI |
| `integration-test.config.js` | E2E test parameters |
| `integration-test.env` | E2E test credentials (local only) |

---

## Proxy Support

### Proxy Configuration (`util/login.ts`, `commands/proxy.ts`)

**Storage**: Configstore `proxy` configuration

**Fields**:
- `host` - Proxy server hostname
- `port` - Proxy server port
- `username` - Optional proxy auth username
- `password` - Prompted on each command if auth enabled

**Usage**: 
```bash
domo proxy proxy.company.com 8080          # Set proxy
domo proxy proxy.company.com 8080 -a       # Set with auth
domo proxy -r                              # Remove proxy
```

**Integration**: Passed to Domo client during initialization
- `new Domo(instance, token, CLIENT_ID, {host, port, username, password})`

---

## Key Entry Points for Claude

### For Adding Features
- **New commands**: Edit `/src/commands/*.ts`
- **New utilities**: Add to `/src/util/`
- **Type definitions**: Update `/src/models/interfaces/command.ts`
- **Tests**: Add to `/tests/`

### For Debugging
- **CLI entry**: `/src/bin/domo.ts` (command loading, error handling)
- **Authentication**: `/src/util/login.ts` and `/src/util/oauth.ts`
- **Dev server**: `/src/server/server.ts` and `/src/server/vite-plugin-domo.ts`
- **Manifest**: `/src/util/manifest.ts`

### For Understanding API Integration
- **Domo client usage**: Search for `new Login().getClient()` or `client.*`
- **Error handling**: `/src/bin/domo.ts` unhandledRejection handler
- **Session validation**: `/src/util/session.ts` uses `client.processRequest()`

---

## Quick Reference: Command Structure

All commands follow this pattern:
1. Load via dynamic require in `domo.ts`
2. Register on Commander program instance
3. Define options with `.option()`
4. Implement action handler with `.action()`
5. Use `Login().getClient()` for authenticated API access
6. Log output via `log.ok()`, `log.fail()`, `log.info()`, `log.warn()`

---

## Useful Commands for Development

```bash
# Setup
pnpm install              # Install dependencies
npm run build            # Compile TypeScript
npm link                 # Link global domo command

# Development
npm run lint             # Run ESLint
npm test                 # Run unit tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Local Testing
./dist/bin/domo.js login                 # Test auth
domo dev                                 # Test dev server
domo publish --build-dir ./test-app      # Test publish

# Release
npm run release:beta     # Release beta version
npm run release:production  # Release to npm
```

---

**Last Updated**: November 2024
**Version**: 5.0.0-beta.4
**Node Requirement**: 16+
**TypeScript Target**: ES2020
