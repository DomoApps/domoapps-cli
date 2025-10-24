---
stoplight-id: rmfbkwje8kmqj
---

# Domo Apps CLI

The Domo Apps Command Line Interface (CLI) is your primary tool to:

- create
- publish
- edit

Custom App designs in your Domo instance.

## Installation

The Domo Apps CLI is available for installation via npm:

```bash
npm install -g ryuu
```

**Note:** Homebrew and Chocolatey installation methods have been deprecated. Please use npm for all new installations.

For more details on installing the CLI, see the [Setup and Installation Guide](../Quickstart/Setup-and-Installation.md).

## Usage

For a **complete** list of available commands, use `domo --help`

### Domo

| Option                      | Description                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `-v, --version`             | Output the version number. `domo -v`                                                             |
| `-s, --ssl`                 | Disable SSL. `domo -s`                                                                           |
| `-m, --manifest <filename>` | Specify a manifest file. Defaults to `manifest.json` in the current working directory. `domo -m` |
| `-h, --help`                | Output usage information. `domo -h`/`domo [command] -h`                                          |

### Dev

Starts a local development server with the following features:

```sh
domo dev [options]
```

- **Live Reload**: Reloads when code changes are detected.
- **App Sizing**: Renders the app in a frame that honors the sizing and fullpage settings from the app manifest.
- **Data Proxy**: Proxies basic XHR requests for data to the appropriate Domo instance, enabling local development with live data.

| Option           | Description                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ |
| `-u, --userId`   | Utilizes a specific user. Helpful for testing app states where user ID is important. |
| `-e, --external` | Exposes the dev server on a public IP address.                                       |

### Init

Asks you questions to initialize a new Custom App design template. Once complete, be sure to follow the "Next Steps" provided.

```sh
domo init
```

<!-- theme: info -->

> No `mkdir` necessary
>
> `domo init` will create the folder for you.

#### Prompts

1. design name
1. select a starter: see "STARTERS" section
1. would you like to connect to any datasets? (Y/n): see "DATASET MAPPING PROMPTS"

#### Starters

- hello world: creates a basic project in a new directory with the following content

```
<design-name>
  - app.css
  - app.js
  - domo.js
  - index.html
  - manifest.json
```

- manifest only: Adds a single `manifest.json` file to the current working directory.

- basic chart: Gets you started rendering a basic [Domo Phoenix] bar chart.

- map chart: Gets you started rendering a [Domo Phoenix] world map chart.

- sugarforce: Creates an app with multiple screens; demonstrates tabbing between screens, database CRUD operations, and more.

[Domo Phoenix]: https://domoapps.github.io/domo-phoenix/

#### Dataset Mapping Prompts

If you choose to connect to datasets, you'll be prompted for the following:

- dataset id: Can be found in the URL of the DataSet detail page in your Domo instance. `https://[customer].domo.com/datasources/[dataset id]/details/overview`
- dataset alias: The alias your app will use when requesting data from Domo. Make sure it has no spaces or special characters.

**Note**: Be sure to complete the field mapping portion in the `manifest.json`. Refer to the [manifest](../Guides/manifest.md) reference documentation for more details on data mapping.

### Login

Authenticate to your Domo instance from the CLI. This is required before running other commands like `publish`, or for fetching data during `domo dev`.

The CLI supports two authentication methods:

#### OAuth Login (Interactive)

If no options are provided, you'll be prompted to choose from a list of previous instances or a "new instance", at which point you'll be prompted for instance name, username, and password.

```sh
domo login [options]
```

| Option               | Description                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `-i, --instance`     | Domo instance (e.g. customer.domo.com)                                                        |
| `-u, --user-email`   | User email                                                                                    |
| `--no-upgrade-check` | Prevent the CLI from checking for new versions and prompting for user input to upgrade or not |

#### Token-Based Login (CI/CD)

For automated workflows and CI/CD pipelines, use developer token authentication:

```sh
domo login -i company.domo.com -t YOUR-DEVELOPER-TOKEN
```

Or use interactive token prompt:

```sh
domo login -i company.domo.com --token-only
```

| Option          | Description                                          |
| --------------- | ---------------------------------------------------- |
| `-t, --token`   | Developer token for authentication                   |
| `--token-only`  | Force token-only mode (will prompt for token input)  |

**Getting Your Developer Token:**
Developer tokens can be found in the Admin section of your Domo instance under the "Developer" or "Access Tokens" area. Tokens are alphanumeric strings (letters and numbers only). Token-based authentication is ideal for CI/CD pipelines and automated workflows.

### Token

Manage developer tokens for CI/CD pipelines and automated deployments. Tokens provide a secure way to authenticate without interactive prompts.

```sh
domo token <add|remove> [options]
```

#### Add Token

Add or update a developer token for a Domo instance:

```sh
# Interactive mode
domo token add

# Non-interactive mode
domo token add -i company.domo.com -t YOUR-DEVELOPER-TOKEN
```

| Option            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `-i, --instance`  | Domo instance (e.g. company.domo.com)                |
| `-t, --token`     | Developer token value (found in Domo Admin section)  |

#### Remove Token

Remove a stored developer token:

```sh
# Interactive mode
domo token remove

# Non-interactive mode
domo token remove -i company.domo.com
```

| Option            | Description                               |
| ----------------- | ----------------------------------------- |
| `-i, --instance`  | Domo instance to remove token from        |

### Logout

Sign out from your Domo instance and clear the authentication session.

```sh
domo logout [options]
```

| Option            | Description                               |
| ----------------- | ----------------------------------------- |
| `-i, --instance`  | Domo instance to logout from              |

### Remove

Remove saved login credentials from the CLI. This is useful for cleaning up old instances or switching accounts.

```sh
domo remove [options]
```

| Option            | Description                               |
| ----------------- | ----------------------------------------- |
| `--instance`      | Remove specific instance                  |
| `--all`           | Remove all saved login credentials        |

### Owner

Manage the owners of the Custom App design.

Only owners of a design can manage that design from the CLI or the Asset Library within the Domo instance. Additionally, only owners of a design are authorized to deploy new apps based on that design.

```sh
domo owner [options] [add|rm|ls] example.user@companyname.com
```

| Option            | Description                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `-i, --design_id` | Specify a design ID, or defaults to the ID from the manifest file in the current working directory |

### Publish

Uploads all the assets of your current working directory as a Custom App design.

You can choose to [ignore certain files](../Guides/manifest.md#ignore), meaning `domo publish` will not upload those files. Any node_modules directories are ignored by default. Refer to the [manifest](../Guides/manifest.md#ignore) reference docs for more details on ignoring files.

If an existing ID is not found in the manifest, a new design will be created, and the manifest file will be updated with the newly created design ID. Existing designs will be updated.

```sh
domo publish [options]
```

| Option     | Description                                             |
| ---------- | ------------------------------------------------------- |
| `-g, --go` | Opens the design in the Asset Library after publishing. |

### Release

Locks a design version for submitting to the Domo Appstore. Once a version is released, you can't make further changes to it. You can, however, work on a new version by bumping the version in the manifest file.

```sh
domo release [options]
```

| Option            | Description                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| `-v, --version`   | Version to release (bypasses interactive prompt, defaults to `latest`)            |

### Download

Download an existing Custom App design from your Domo instance to your local machine. This is useful for retrieving apps for local development or backup purposes.

```sh
domo download [options]
```

| Option                        | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `-i, --design-id <id>`        | Design ID to download                                   |
| `-d, --design-version <ver>`  | Design version (default: `latest`)                      |

### List (ls)

Get a list of all your Custom App designs published to your Domo instance.

```sh
domo ls [options]
```

Displays a table with:
- Design Name
- Design ID
- Version
- Last Published date
- URL to Asset Library

### Delete

Delete a published Custom App design by its ID. This is a soft delete and can be undone with `domo undelete`.

```sh
domo delete [options] [id]
```

| Option         | Description                                             |
| -------------- | ------------------------------------------------------- |
| `-f, --force`  | Delete even if referenced by Custom Apps                |
| `-c, --confirm`| Auto-confirm deletion (skip prompt)                     |

### Undelete

Restore a previously deleted Custom App design.

```sh
domo undelete [id]
```

### Proxy

Configure proxy settings for corporate networks or firewalls. This allows the CLI to work through network proxies.

```sh
domo proxy [host] [port] [options]
```

| Option             | Description                                   |
| ------------------ | --------------------------------------------- |
| `-r, --remove-proxy` | Remove current proxy settings               |
| `-a, --auth`       | Enable username authentication for proxy      |

**Examples:**

```sh
# Set proxy without authentication
domo proxy proxy.company.com 8080

# Set proxy with authentication (will prompt for username/password)
domo proxy proxy.company.com 8080 -a

# Remove proxy configuration
domo proxy -r
```

## Advanced Data Proxy for Developing Locally

To enable proxying for advanced requests (like the AppDB, Files, Code Engine, and Workflows APIs), you must provide the ID of an app in your instance that the CLI can proxy to (e.g., impersonate a particular Card). Add this app ID to your manifest under the property `proxyId`. If the ID is valid, proxying advanced requests with `domo dev` will work automatically.

All proxy IDs for your app can be found on the App Design page under the "Cards" tab.

Proxy IDs tie apps to Cards. If you delete the Card from which you retrieved the ID, you will have to get a new one from another card created from your app design.

## CI/CD Integration

The Domo Apps CLI supports automated deployments through CI/CD pipelines using token-based authentication. This enables you to automatically publish app updates when changes are committed to your repository.

### Getting Started with CI/CD

1. **Obtain a Developer Token** from the Admin section of your Domo instance
2. **Store the token securely** as a secret in your CI/CD platform
3. **Configure your pipeline** to authenticate and publish automatically

### CI/CD Pipeline Examples

#### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Domo
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Domo CLI
        run: npm install -g ryuu

      - name: Authenticate to Domo
        run: domo login -i ${{ secrets.DOMO_INSTANCE }} -t ${{ secrets.DOMO_TOKEN }}

      - name: Publish App
        run: domo publish
```

**Required Secrets:**
- `DOMO_INSTANCE`: Your Domo instance (e.g., `company.domo.com`)
- `DOMO_TOKEN`: Your developer token

#### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
deploy:
  stage: deploy
  image: node:18
  only:
    - main
  script:
    - npm install -g ryuu
    - domo login -i $DOMO_INSTANCE -t $DOMO_TOKEN
    - domo publish
```

**Required Variables (Settings > CI/CD > Variables):**
- `DOMO_INSTANCE`: Your Domo instance
- `DOMO_TOKEN`: Your developer token (mark as masked/protected)

#### Jenkins

Create a `Jenkinsfile`:

```groovy
pipeline {
  agent any

  environment {
    DOMO_INSTANCE = credentials('domo-instance')
    DOMO_TOKEN = credentials('domo-token')
  }

  stages {
    stage('Install CLI') {
      steps {
        sh 'npm install -g ryuu'
      }
    }

    stage('Authenticate') {
      steps {
        sh 'domo login -i $DOMO_INSTANCE -t $DOMO_TOKEN'
      }
    }

    stage('Publish') {
      steps {
        sh 'domo publish'
      }
    }
  }
}
```

#### Azure DevOps

Create `azure-pipelines.yml`:

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: npm install -g ryuu
    displayName: 'Install Domo CLI'

  - script: domo login -i $(DOMO_INSTANCE) -t $(DOMO_TOKEN)
    displayName: 'Authenticate to Domo'

  - script: domo publish
    displayName: 'Publish App to Domo'
```

**Required Pipeline Variables:**
- `DOMO_INSTANCE`: Your Domo instance
- `DOMO_TOKEN`: Your developer token (mark as secret)

### Best Practices for CI/CD

1. **Secure Token Storage**: Always store developer tokens as encrypted secrets in your CI/CD platform
2. **Branch Protection**: Only deploy from protected branches (e.g., `main`, `production`)
3. **Version Management**: Update the version in `manifest.json` before publishing
4. **Build Verification**: Run tests before deploying to ensure code quality
5. **Deployment Notifications**: Configure notifications for successful/failed deployments
6. **Token Rotation**: Regularly rotate developer tokens and update CI/CD secrets

### Advanced CI/CD Workflow Example

```yaml
name: Build, Test, and Deploy
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g ryuu
      - run: domo login -i ${{ secrets.DOMO_STAGING_INSTANCE }} -t ${{ secrets.DOMO_STAGING_TOKEN }}
      - run: domo publish

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g ryuu
      - run: domo login -i ${{ secrets.DOMO_PROD_INSTANCE }} -t ${{ secrets.DOMO_PROD_TOKEN }}
      - run: domo publish
      - run: domo release -v latest
```

This workflow:
- Runs tests on all pushes and PRs
- Deploys to staging when pushing to `develop`
- Deploys to production when pushing to `main`
- Creates a release after production deployment

### Troubleshooting CI/CD

**Authentication Failures:**
- Verify token format (alphanumeric only, minimum 20 characters)
- Ensure token has not expired
- Check instance name is correct (e.g., `company.domo.com`)

**Publish Failures:**
- Verify `manifest.json` is present and valid
- Check design ownership permissions
- Ensure all required files are committed to repository

**Token Security:**
- Never commit tokens to your repository
- Use environment variables or secrets management
- Rotate tokens regularly and update CI/CD configurations
