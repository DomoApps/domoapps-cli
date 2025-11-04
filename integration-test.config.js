/**
 * Integration Test Configuration
 *
 * Main configuration for the Domo Apps CLI integration test suite.
 * Credentials are loaded from integration-test.env file.
 */

module.exports = {
  // Domo instance configurations (credentials from .env)
  instances: {
    primary: {
      instance: process.env.DOMO_INSTANCE_1 || 'your-instance.domo.com',
      username: process.env.DOMO_USERNAME_1 || 'your-email@company.com',
      password: process.env.DOMO_PASSWORD_1 || 'your-password',
      token: process.env.DOMO_TOKEN_1 || 'your-dev-token',
    },
    secondary: {
      instance: process.env.DOMO_INSTANCE_2 || 'company2.domo.com',
      username: process.env.DOMO_USERNAME_2 || 'testuser2@company.com',
      password: process.env.DOMO_PASSWORD_2 || 'your-password-here',
      token: process.env.DOMO_TOKEN_2 || 'your-dev-token-here',
    },
  },

  // Test data
  testData: {
    appNames: [
      process.env.TEST_APP_NAME_1 || 'integration-test-app-1',
      'integration-test-app-2',
      'integration-test-app-3',
    ],
    datasets: {
      primary: {
        id: process.env.TEST_DATASET_ID_1 || '123456789',
        alias: 'testData1',
      },
      secondary: {
        id: process.env.TEST_DATASET_ID_2 || '987654321',
        alias: 'testData2',
      },
    },
  },

  // Timeouts (in milliseconds)
  timeouts: {
    test: 300000, // 5 minutes per test
    command: 60000, // 1 minute per command
    login: 30000, // 30 seconds for login
    publish: 180000, // 3 minutes for publish
  },

  // Cleanup options
  cleanup: {
    afterTests: true,
    deleteTestApps: true,
    removeCredentials: true,
    keepSuccessfulApps: false,
    keepFailedApps: true,
  },

  // Logging options
  logging: {
    level: 'info',
    toFile: true,
    file: 'integration-test-temp/integration-test-results.log',
    verbose: true,
    showCommandOutput: true,
  },

  // Template testing
  templates: {
    testAll: true,
    specific: ['hello world', 'basic chart', 'map chart', 'sugarforce'],
    timeout: 120000,
  },

  // Performance thresholds
  performance: {
    thresholds: {
      maxLoginTime: 5000,
      maxPublishTime: 30000,
      maxDevStartTime: 10000,
      maxCommandTime: 5000,
    },
    concurrentTests: 3,
    parallelLogins: false,
  },

  // Security testing
  security: {
    testInvalidCredentials: true,
    testInvalidTokens: true,
    testInvalidInstances: true,
    testCredentialStorage: true,
    testTokenRotation: true,
  },

  // Error handling tests
  errorHandling: {
    testOfflineMode: true,
    testNetworkTimeouts: true,
    testConnectionFailures: true,
    testInvalidAppNames: true,
    testInvalidManifests: true,
    testMissingFiles: true,
  },

  // Cross-platform testing
  crossPlatform: {
    testWindowsPaths: false,
    testMacosPaths: false,
    testLinuxPaths: true,
    shells: {
      bash: true,
      zsh: true,
      fish: true,
      powershell: false,
    },
  },

  // CI/CD options
  ci: {
    environment: false,
    githubActions: false,
    jenkins: false,
    generateReports: true,
    uploadResults: false,
    resultsWebhook: '',
  },

  // Advanced testing
  advanced: {
    testAppLifecycle: true,
    testVersionManagement: true,
    testReleaseWorkflow: true,
    testDatasetConnections: true,
    testDataRefresh: true,
    testDataValidation: true,
    testMultiUserAccess: false,
    testPermissionChanges: false,
    testSharedApps: false,
  },
};
