module.exports = {
  default: {
    // Feature files location
    requireModule: ['ts-node/register'],
    require: ['features/step_definitions/**/*.ts'],
    format: ['html:reports/cucumber-report.html', 'json:reports/cucumber-report.json'],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    paths: ['features/**/*.feature'],
    // Enable screenshot on failure
    afterStep: function (step) {
      if (step.result.status === 'failed') {
        // Screenshot logic can be added here
      }
    },
    // Parallel execution
    parallel: 2,
    // Retry failed scenarios
    retry: 1,
    // Exit on first failure
    failFast: false,
    // Strict mode - fail if there are pending steps
    strict: true
  }
};