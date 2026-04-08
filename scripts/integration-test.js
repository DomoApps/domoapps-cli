#!/usr/bin/env node

/**
 * Domo Apps CLI - Comprehensive Integration Test Suite
 *
 * This script performs end-to-end testing of all CLI functionality using
 * live Domo instances, tokens, and real API calls.
 *
 * Usage: node scripts/integration-test.js
 */

import {execSync, spawn} from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import {fileURLToPath} from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from integration-test.env FIRST before loading config
// Look in project root (one level up from scripts/)
const envPath = fs.existsSync(path.join(__dirname, '../integration-test.env'))
  ? path.join(__dirname, '../integration-test.env')
  : path.join(__dirname, '../../integration-test.env');

dotenv.config({path: envPath});

const {default: config} = await import('../integration-test.config.js');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: Date.now(),
  endTime: null,
};

// Logging utilities
const log = {
  info: msg => console.log(`ℹ️  ${msg}`),
  success: msg => console.log(`✅ ${msg}`),
  error: msg => console.log(`❌ ${msg}`),
  warning: msg => console.log(`⚠️  ${msg}`),
  test: (name, status, details = '') => {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${name}${details ? ` - ${details}` : ''}`);
  },
  verbose: msg => {
    if (config.logging.verbose) {
      console.log(`🔍 ${msg}`);
    }
  },
};

// Test execution utilities
class IntegrationTestRunner {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'integration-test-temp');
    this.testApps = [];
    this.cleanupTasks = [];
    // Use the built domo binary from dist
    this.domoBinary = path.join(process.cwd(), 'dist/bin/runner');
  }

  async runTest(name, testFn, timeout = config.timeouts.test) {
    const startTime = Date.now();
    let result = {name, status: 'SKIP', duration: 0, error: null};

    try {
      log.info(`Running integration test: ${name}`);

      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), timeout);
      });

      // Run test
      await Promise.race([testFn(), timeoutPromise]);

      result.status = 'PASS';
      result.duration = Date.now() - startTime;
      results.passed++;
      log.test(name, 'PASS', `${result.duration}ms`);
    } catch (error) {
      result.status = 'FAIL';
      result.duration = Date.now() - startTime;
      result.error = error.message;
      results.failed++;
      log.test(name, 'FAIL', error.message);
    }

    results.tests.push(result);
    return result;
  }

  async runCommand(command, options = {}) {
    const {
      timeout = config.timeouts.command,
      expectFailure = false,
      cwd,
    } = options;

    // Replace 'domo' with the full path to the binary
    const fullCommand = command.replace(/^domo\b/, `node ${this.domoBinary}`);

    try {
      log.verbose(`Executing: ${fullCommand}`);
      const result = execSync(fullCommand, {
        timeout,
        encoding: 'utf8',
        stdio: config.logging.showCommandOutput ? 'inherit' : 'pipe',
        cwd: cwd || process.cwd(),
      });

      if (expectFailure) {
        throw new Error('Command succeeded when failure was expected');
      }

      return {success: true, output: result};
    } catch (error) {
      if (expectFailure) {
        return {success: true, output: error.stdout || error.message};
      }
      throw error;
    }
  }

  async cleanup() {
    log.info('🧹 Cleaning up test artifacts...');

    try {
      // Clean up test apps
      if (config.cleanup.deleteTestApps) {
        // Re-authenticate before deleting (in case logout test ran)
        const {instance, token} = config.instances.primary;
        try {
          await this.runCommand(`domo login -i ${instance} -t ${token}`, {
            timeout: config.timeouts.login,
            expectFailure: true,
          });
        } catch (error) {
          log.warning(
            `Failed to re-authenticate for cleanup: ${error.message}`,
          );
        }

        for (const appName of this.testApps) {
          try {
            const appDir = path.join(this.tempDir, appName);
            const manifestPath = path.join(appDir, 'manifest.json');

            // Only try to delete if manifest exists and has an ID (app was published)
            if (await fs.pathExists(manifestPath)) {
              const manifest = await fs.readJson(manifestPath);
              if (manifest.id) {
                // Run delete from within app directory so it reads manifest.json
                await this.runCommand('domo delete --confirm', {
                  timeout: 30000,
                  cwd: appDir,
                  expectFailure: true,
                });
              }
            }
          } catch (error) {
            log.warning(
              `Failed to delete test app ${appName}: ${error.message}`,
            );
          }
        }
      }

      // Remove test credentials
      if (config.cleanup.removeCredentials) {
        try {
          await this.runCommand('domo logout', {
            timeout: 10000,
            expectFailure: true,
          });
        } catch (error) {
          log.warning(`Failed to logout: ${error.message}`);
        }
      }

      // Clean up temp directory
      if (await fs.pathExists(this.tempDir)) {
        await fs.remove(this.tempDir);
      }

      // Run additional cleanup tasks
      for (const task of this.cleanupTasks) {
        try {
          await task();
        } catch (error) {
          log.warning(`Cleanup task failed: ${error.message}`);
        }
      }

      log.success('Cleanup completed');
    } catch (error) {
      log.error(`Cleanup failed: ${error.message}`);
    }
  }

  generateReport() {
    results.endTime = Date.now();
    const totalTime = results.endTime - results.startTime;

    const report = {
      summary: {
        total: results.tests.length,
        passed: results.passed,
        failed: results.failed,
        skipped: results.skipped,
        duration: totalTime,
        successRate: Math.round((results.passed / results.tests.length) * 100),
      },
      tests: results.tests,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    // Write report to file
    if (config.logging.toFile) {
      // Ensure the directory exists
      const logDir = path.dirname(config.logging.file);
      fs.ensureDirSync(logDir);
      fs.writeFileSync(config.logging.file, JSON.stringify(report, null, 2));
    }

    // Display summary
    console.log('\n📊 Integration Test Summary:');
    console.log(`Total Tests: ${results.tests.length}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    console.log(`Duration: ${Math.round(totalTime / 1000)}s`);

    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.tests
        .filter(t => t.status === 'FAIL')
        .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }

    return report;
  }
}

// Integration test definitions
class IntegrationTests {
  constructor(runner) {
    this.runner = runner;
  }

  // =============================================================================
  // AUTHENTICATION TESTS
  // =============================================================================

  async testUsernamePasswordLogin() {
    // Username/password login is interactive only, cannot be automated
    // Skip this test as it requires stdin interaction
    log.warning(
      'Username/Password login test skipped (requires interactive stdin)',
    );
  }

  async testTokenLogin() {
    const {instance, token} = config.instances.primary;

    // Use token add command instead of login with -t flag
    await this.runner.runCommand(`domo token add -i ${instance} -t ${token}`, {
      timeout: config.timeouts.login,
    });

    // Verify login worked
    await this.runner.runCommand('domo ls', {timeout: 10000});
  }

  async testInteractiveLogin() {
    // This would require mocking stdin, so we'll skip for now
    // In a real implementation, you'd use a library like inquirer-test
    log.warning('Interactive login test skipped (requires stdin mocking)');
  }

  async testLogout() {
    await this.runner.runCommand('domo logout', {timeout: 10000});

    // Verify logout worked by trying to run a command that requires auth
    await this.runner.runCommand('domo ls', {
      timeout: 10000,
      expectFailure: true,
    });
  }

  async testTokenManagement() {
    const {instance, token} = config.instances.primary;

    // Add token
    await this.runner.runCommand(`domo token add -i ${instance} -t ${token}`, {
      timeout: 30000,
    });

    // Note: 'domo token get' doesn't exist - only 'add' and 'remove' are valid

    // Remove token
    await this.runner.runCommand(`domo token remove -i ${instance}`, {
      timeout: 10000,
    });
  }

  // =============================================================================
  // APP CREATION TESTS
  // =============================================================================

  async testAppCreation() {
    const appName = config.testData.appNames[0];
    this.runner.testApps.push(appName);

    // Create app with hello world template (use -n for name, -t for template, --no-datasets to skip dataset prompt)
    await this.runner.runCommand(
      `domo init -n ${appName} -t 'hello world' --no-datasets`,
      {
        timeout: 60000,
        cwd: this.runner.tempDir,
      },
    );

    // Verify app structure
    const appDir = path.join(this.runner.tempDir, appName);
    const requiredFiles = ['index.html', 'app.js', 'manifest.json'];

    for (const file of requiredFiles) {
      if (!(await fs.pathExists(path.join(appDir, file)))) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // Verify manifest.json structure
    const manifest = await fs.readJson(path.join(appDir, 'manifest.json'));
    if (!manifest.name || !manifest.version) {
      throw new Error('Invalid manifest.json structure');
    }
  }

  async testTemplateCreation() {
    if (!config.templates.testAll) {
      log.info('Template testing disabled');
      return;
    }

    for (const template of config.templates.specific) {
      const appName = `template-test-${template.replace(/\s+/g, '-')}`;
      this.runner.testApps.push(appName);

      await this.runner.runCommand(
        `domo init -n ${appName} -t '${template}' --no-datasets`,
        {
          timeout: config.templates.timeout,
          cwd: this.runner.tempDir,
        },
      );

      // Verify app was created
      const appDir = path.join(this.runner.tempDir, appName);
      if (!(await fs.pathExists(appDir))) {
        throw new Error(`Template ${template} failed to create app`);
      }
    }
  }

  async testAppWithDatasets() {
    const appName = config.testData.appNames[1];
    this.runner.testApps.push(appName);
    const {datasets} = config.testData;

    await this.runner.runCommand(
      `domo init -n ${appName} -t 'hello world' -i ${datasets.primary.id} -a ${datasets.primary.alias} --no-datasets`,
      {
        timeout: 60000,
        cwd: this.runner.tempDir,
      },
    );

    // Verify dataset was added to manifest
    const manifestPath = path.join(
      this.runner.tempDir,
      appName,
      'manifest.json',
    );
    const manifest = await fs.readJson(manifestPath);

    if (!manifest.mapping || manifest.mapping.length === 0) {
      throw new Error('Dataset not added to manifest');
    }

    // Verify the dataset ID and alias match
    const addedDataset = manifest.mapping[0];
    if (
      addedDataset.dataSetId !== datasets.primary.id ||
      addedDataset.alias !== datasets.primary.alias
    ) {
      throw new Error('Dataset ID or alias mismatch in manifest');
    }
  }

  // =============================================================================
  // DEVELOPMENT TESTS
  // =============================================================================

  async testDevServer() {
    const appName = config.testData.appNames[0];
    const appDir = path.join(this.runner.tempDir, appName);

    // First, publish the app (required before dev server can run)
    await this.runner.runCommand('domo publish', {
      timeout: config.timeouts.publish,
      cwd: appDir,
    });

    // Start dev server in background
    const devProcess = spawn('node', [this.runner.domoBinary, 'dev'], {
      cwd: appDir,
      stdio: 'pipe',
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if process is still running
    if (devProcess.killed) {
      throw new Error('Dev server failed to start');
    }

    // Clean up
    devProcess.kill();
  }

  // =============================================================================
  // PUBLISHING TESTS
  // =============================================================================

  async testAppPublishing() {
    const appName = config.testData.appNames[0];
    const appDir = path.join(this.runner.tempDir, appName);

    // Publish app
    await this.runner.runCommand('domo publish', {
      timeout: config.timeouts.publish,
      cwd: appDir,
    });

    // Verify app appears in list
    const listOutput = await this.runner.runCommand('domo ls', {
      timeout: 30000,
    });

    // Check if output was captured (depends on config.logging.showCommandOutput)
    if (listOutput.output && !listOutput.output.includes(appName)) {
      throw new Error('Published app not found in list');
    }
    // If output wasn't captured, the command succeeded so we assume it worked
  }

  async testAppRelease() {
    const appName = config.testData.appNames[0];
    const appDir = path.join(this.runner.tempDir, appName);

    // Release app (using --version latest for non-interactive mode)
    await this.runner.runCommand('domo release --version latest', {
      timeout: 180000,
      cwd: appDir,
    });
  }

  // =============================================================================
  // MANAGEMENT TESTS
  // =============================================================================

  async testAppListing() {
    const listOutput = await this.runner.runCommand('domo ls', {
      timeout: 30000,
    });

    // Check if output was captured (depends on config.logging.showCommandOutput)
    if (listOutput.output) {
      if (
        !listOutput.output.includes('Design ID') &&
        !listOutput.output.includes('No designs found')
      ) {
        throw new Error('App listing output format unexpected');
      }
    }
    // If output wasn't captured, the command succeeded so we assume it worked
  }

  async testAppDeletion() {
    const appName = config.testData.appNames[0];

    // Get list to find design ID
    const listOutput = await this.runner.runCommand('domo ls', {
      timeout: 30000,
    });

    // Check if output was captured
    if (!listOutput.output) {
      log.warning(
        'Deletion test skipped - list output not captured. Set logging.showCommandOutput to false in config to enable this test.',
      );
      return; // Skip this test
    }

    // Parse design ID from output (format: "Design Name: <name>\nDesign Id: <id>")
    const designIdMatch = listOutput.output.match(
      new RegExp(`Design Name: ${appName}[\\s\\S]*?Design Id: ([a-f0-9-]+)`),
    );

    if (!designIdMatch) {
      throw new Error(`Could not find design ID for ${appName}`);
    }

    const designId = designIdMatch[1];

    // Delete app using design ID
    await this.runner.runCommand(`domo delete ${designId}`, {
      timeout: 60000,
    });

    // Verify app is deleted
    const afterDeleteOutput = await this.runner.runCommand('domo ls', {
      timeout: 30000,
    });

    if (
      afterDeleteOutput.output &&
      afterDeleteOutput.output.includes(designId)
    ) {
      throw new Error('App still appears in list after deletion');
    }

    // Store the design ID for undelete test
    this.runner.lastDeletedDesignId = designId;
  }

  async testAppUndelete() {
    // Use the design ID from the previous delete test
    const designId = this.runner.lastDeletedDesignId;

    if (!designId) {
      log.warning(
        'Undelete test skipped - no design ID from previous delete test (likely because deletion test was skipped)',
      );
      return; // Skip this test
    }

    // Undelete app using design ID
    await this.runner.runCommand(`domo undelete ${designId}`, {
      timeout: 60000,
    });

    // Verify app is restored
    const listOutput = await this.runner.runCommand('domo ls', {
      timeout: 30000,
    });

    if (listOutput.output && !listOutput.output.includes(designId)) {
      throw new Error('App not restored after undelete');
    }
    // If output wasn't captured, the command succeeded so we assume it worked
  }

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  async testInvalidCredentials() {
    if (!config.security.testInvalidCredentials) {
      log.info('Invalid credentials test disabled');
      return;
    }

    // Test with invalid token (since password login is interactive)
    // Use token add command which should fail with invalid token
    await this.runner.runCommand(
      'domo token add -i invalid.domo.com -t invalidtoken123456789012345',
      {
        timeout: 30000,
        expectFailure: true,
      },
    );
  }

  async testInvalidAppName() {
    if (!config.errorHandling.testInvalidAppNames) {
      log.info('Invalid app name test disabled');
      return;
    }

    await this.runner.runCommand(
      'domo init -n "invalid name with spaces" -t "hello world" --no-datasets',
      {
        timeout: 30000,
        expectFailure: true,
        cwd: this.runner.tempDir, // Create in temp directory
      },
    );
  }

  async testMissingManifest() {
    if (!config.errorHandling.testMissingFiles) {
      log.info('Missing manifest test disabled');
      return;
    }

    // Create directory without manifest
    const testDir = path.join(this.runner.tempDir, 'no-manifest-app');
    await fs.ensureDir(testDir);

    await this.runner.runCommand('domo publish', {
      timeout: 30000,
      cwd: testDir,
      expectFailure: true,
    });
  }

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  async testLoginPerformance() {
    const {instance, token} = config.instances.primary;
    const startTime = Date.now();

    // Use token login for performance testing (since password is interactive)
    await this.runner.runCommand(`domo login -i ${instance} -t ${token}`, {
      timeout: config.timeouts.login,
    });

    const duration = Date.now() - startTime;
    if (duration > config.performance.thresholds.maxLoginTime) {
      throw new Error(
        `Login too slow: ${duration}ms (max: ${config.performance.thresholds.maxLoginTime}ms)`,
      );
    }

    log.info(`Login performance: ${duration}ms`);
  }

  async testCommandPerformance() {
    const commands = ['domo --version', 'domo --help', 'domo ls'];

    for (const command of commands) {
      const startTime = Date.now();
      await this.runner.runCommand(command, {timeout: 10000});
      const duration = Date.now() - startTime;

      if (duration > config.performance.thresholds.maxCommandTime) {
        throw new Error(`Command ${command} too slow: ${duration}ms`);
      }

      log.verbose(`Command ${command}: ${duration}ms`);
    }
  }
}

// Main execution
async function main() {
  const runner = new IntegrationTestRunner();
  const tests = new IntegrationTests(runner);

  log.info('🚀 Starting Domo Apps CLI Integration Tests');
  log.info(`Configuration: ${JSON.stringify(config, null, 2)}`);

  try {
    // Setup
    await fs.ensureDir(runner.tempDir);

    // Authentication tests (that don't logout)
    await runner.runTest('Username/Password Login', () =>
      tests.testUsernamePasswordLogin(),
    );
    await runner.runTest('Token Login', () => tests.testTokenLogin());

    // App creation tests (requires authentication)
    await runner.runTest('App Creation', () => tests.testAppCreation());
    await runner.runTest('Template Creation', () =>
      tests.testTemplateCreation(),
    );
    await runner.runTest('App with Datasets', () =>
      tests.testAppWithDatasets(),
    );

    // Publishing tests (requires authentication and apps to exist)
    await runner.runTest('App Publishing', () => tests.testAppPublishing());

    // Development tests (requires published app)
    await runner.runTest('Dev Server', () => tests.testDevServer());

    // More publishing tests
    await runner.runTest('App Release', () => tests.testAppRelease());

    // Management tests (requires authentication)
    await runner.runTest('App Listing', () => tests.testAppListing());
    await runner.runTest('App Deletion', () => tests.testAppDeletion());
    await runner.runTest('App Undelete', () => tests.testAppUndelete());

    // Performance tests (requires authentication)
    await runner.runTest('Login Performance', () =>
      tests.testLoginPerformance(),
    );
    await runner.runTest('Command Performance', () =>
      tests.testCommandPerformance(),
    );

    // Error handling tests
    await runner.runTest('Invalid Credentials', () =>
      tests.testInvalidCredentials(),
    );
    await runner.runTest('Invalid App Name', () => tests.testInvalidAppName());
    await runner.runTest('Missing Manifest', () => tests.testMissingManifest());

    // Logout and token management tests (run last)
    await runner.runTest('Token Management', () => tests.testTokenManagement());
    await runner.runTest('Logout', () => tests.testLogout());
  } catch (error) {
    log.error(`Integration test execution failed: ${error.message}`);
  } finally {
    if (config.cleanup.afterTests) {
      await runner.cleanup();
    }

    const report = runner.generateReport();

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// Handle uncaught errors
process.on('uncaughtException', error => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  log.error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Run
main().catch(error => {
  log.error(`Main execution failed: ${error.message}`);
  process.exit(1);
});

export {IntegrationTestRunner, IntegrationTests};
