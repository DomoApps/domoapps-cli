#!/usr/bin/env node

/**
 * Domo Apps CLI - Integration Test Setup Validator
 *
 * This script validates that the integration test environment is properly configured
 * before running the full integration test suite.
 */

import fs from 'fs-extra';
import path from 'path';
import {execSync} from 'child_process';
import dotenv from 'dotenv';

// Configuration validation
class IntegrationSetupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.config = {};
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };
    console.log(`${icons[type]} ${message}`);
  }

  async validateEnvironment() {
    this.log('🔍 Validating integration test environment...');

    // Check for integration-test.env file
    const envFile = path.join(process.cwd(), 'integration-test.env');
    if (!(await fs.pathExists(envFile))) {
      this.errors.push(
        'Missing integration-test.env file. Copy integration-test.env.sample to integration-test.env and configure it.',
      );
      return false;
    }

    // Load environment variables from integration-test.env
    dotenv.config({path: envFile});

    // Validate required variables
    this.validateRequiredVariables();
    this.validateOptionalVariables();
    this.validateTestData();
    this.validateNetworkConnectivity();

    return this.errors.length === 0;
  }

  validateRequiredVariables() {
    const required = [
      'DOMO_INSTANCE_1',
      'DOMO_USERNAME_1',
      'DOMO_PASSWORD_1',
      'DOMO_TOKEN_1',
      'TEST_APP_NAME_1',
    ];

    for (const variable of required) {
      if (!process.env[variable]) {
        this.errors.push(`Missing required environment variable: ${variable}`);
      }
    }
  }

  validateOptionalVariables() {
    const optional = [
      'DOMO_INSTANCE_2',
      'DOMO_USERNAME_2',
      'DOMO_PASSWORD_2',
      'DOMO_TOKEN_2',
      'TEST_DATASET_ID_1',
      'TEST_DATASET_ID_2',
    ];

    for (const variable of optional) {
      if (!process.env[variable]) {
        this.warnings.push(`Optional variable not set: ${variable}`);
      }
    }
  }

  validateTestData() {
    // Validate app names
    const appNames = [
      process.env.TEST_APP_NAME_1,
      process.env.TEST_APP_NAME_2,
      process.env.TEST_APP_NAME_3,
    ].filter(Boolean);

    for (const appName of appNames) {
      if (!/^[a-zA-Z0-9-_]+$/.test(appName)) {
        this.errors.push(
          `Invalid app name format: ${appName}. Use only alphanumeric characters, hyphens, and underscores.`,
        );
      }
    }

    // Validate dataset IDs
    const datasetIds = [
      process.env.TEST_DATASET_ID_1,
      process.env.TEST_DATASET_ID_2,
    ].filter(Boolean);

    for (const datasetId of datasetIds) {
      if (!/^\d+$/.test(datasetId)) {
        this.errors.push(
          `Invalid dataset ID format: ${datasetId}. Use only numeric characters.`,
        );
      }
    }
  }

  async validateNetworkConnectivity() {
    const instance = process.env.DOMO_INSTANCE_1;
    if (!instance) return;

    try {
      this.log(`Testing connectivity to ${instance}...`);
      execSync(`ping -c 1 ${instance}`, {stdio: 'pipe', timeout: 10000});
      this.log(`✅ Successfully connected to ${instance}`);
    } catch (error) {
      this.warnings.push(
        `Cannot ping ${instance}. This may indicate network issues.`,
      );
    }
  }

  async validateCLIInstallation() {
    try {
      this.log('Testing CLI installation...');
      const version = execSync('domo --version', {
        encoding: 'utf8',
        timeout: 5000,
      });
      this.log(`✅ CLI version: ${version.trim()}`);
    } catch (error) {
      this.errors.push('CLI not properly installed or not in PATH');
    }
  }

  async validateTestDirectory() {
    const testDir = path.join(process.cwd(), 'integration-test-temp');

    try {
      await fs.ensureDir(testDir);
      this.log(`✅ Test directory created: ${testDir}`);
    } catch (error) {
      this.errors.push(`Cannot create test directory: ${error.message}`);
    }
  }

  async validateDependencies() {
    const required = ['fs-extra', 'dotenv'];

    for (const dep of required) {
      try {
        await import(dep);
        this.log(`✅ Dependency available: ${dep}`);
      } catch (error) {
        this.errors.push(`Missing dependency: ${dep}`);
      }
    }
  }

  displayResults() {
    console.log('\n📊 Validation Results:');

    if (this.errors.length === 0) {
      this.log(
        '🎉 All validations passed! Integration tests should run successfully.',
        'success',
      );
    } else {
      this.log(`❌ Found ${this.errors.length} errors:`, 'error');
      this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
    }

    if (this.warnings.length > 0) {
      this.log(`⚠️  Found ${this.warnings.length} warnings:`, 'warning');
      this.warnings.forEach(warning => this.log(`  - ${warning}`, 'warning'));
    }

    console.log('\n📋 Next Steps:');
    if (this.errors.length === 0) {
      console.log('1. Run integration tests: npm run test:integration');
      console.log('2. Monitor test results in integration-test-results.log');
      console.log(
        '3. Review any failed tests and adjust configuration as needed',
      );
    } else {
      console.log('1. Fix the errors listed above');
      console.log(
        '2. Re-run this validator: node scripts/validate-integration-setup.js',
      );
      console.log(
        '3. Once all errors are resolved, run: npm run test:integration',
      );
    }
  }

  async run() {
    try {
      const isValid = await this.validateEnvironment();
      await this.validateCLIInstallation();
      await this.validateTestDirectory();
      await this.validateDependencies();

      this.displayResults();

      process.exit(isValid ? 0 : 1);
    } catch (error) {
      this.log(`Validation failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validator if called directly
const validator = new IntegrationSetupValidator();
validator.run();

export default IntegrationSetupValidator;
