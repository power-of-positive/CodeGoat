jest.mock('../checks/check-runners', () => ({
  runFrontendLinting: jest.fn(),
  runFrontendTests: jest.fn(),
  runRustFormatting: jest.fn(),
  runRustLinting: jest.fn(),
}));
jest.mock('../analysis/code-analysis', () => ({ runCodeAnalysis: jest.fn() }));
jest.mock('../scripts/script-checks', () => ({ runScriptChecks: jest.fn() }));
jest.mock('../analysis/code-results', () => ({ collectCodeResults: jest.fn() }));
jest.mock('../security/security-runners', () => ({
  runDuplicateCodeDetection: jest.fn(),
  runDeadCodeDetection: jest.fn(),
  runDependencyVulnerabilityCheck: jest.fn(),
}));
jest.mock('../security/security-checks', () => ({
  runSecurityChecks: jest.fn(),
}));

// Import the modules after mocking
import { runAllChecks } from './precommit-checks';
import { runCodeAnalysis } from '../analysis/code-analysis';
import { collectCodeResults } from '../analysis/code-results';
import { runSecurityChecks } from '../security/security-checks';

describe('precommit-checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runAllChecks', () => {
    beforeEach(() => {
      (collectCodeResults as jest.Mock).mockResolvedValue({
        failed: false,
        output: '',
      });
      (runSecurityChecks as jest.Mock).mockReturnValue({
        securityFailure: false,
        securityOutput:
          '\nSECURITY CHECKS:\nDuplicate Code Detection: ✅ No duplicate code detected\nDead Code Detection: ✅ No dead code detected\nDependency Vulnerabilities: ✅ No dependency vulnerabilities found\n',
      });
    });

    it('should handle code analysis blocking', async () => {
      (runCodeAnalysis as jest.Mock).mockResolvedValue({
        blocked: true,
        details: 'Critical issues found',
      });

      const stagedFiles = {
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      };
      const result = await runAllChecks('/test/project', stagedFiles);

      expect(result.allOutput).toContain('Critical issues found');
      expect(result.analysisResult.blocked).toBe(true);
    });

    it('should handle code analysis errors', async () => {
      (runCodeAnalysis as jest.Mock).mockRejectedValue(new Error('Analysis failed'));

      const stagedFiles = {
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      };
      const result = await runAllChecks('/test/project', stagedFiles);

      expect(result.allOutput).toContain('Code analysis error: Analysis failed');
    });

    it('should handle security check failures', async () => {
      delete process.env.SKIP_SECURITY_CHECKS;
      (runCodeAnalysis as jest.Mock).mockResolvedValue({
        blocked: false,
        details: 'All good',
      });
      (runSecurityChecks as jest.Mock).mockReturnValue({
        securityFailure: true,
        securityOutput:
          '\nSECURITY CHECKS:\nDuplicate Code Detection: 🔍 DUPLICATE CODE DETECTED\n',
      });

      const stagedFiles = {
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      };
      const result = await runAllChecks('/test/project', stagedFiles);

      expect(result.criticalFailure).toBe(true);
      expect(result.securityFailure).toBe(true);
      expect(result.allOutput).toContain('SECURITY CHECKS');
    });

    it('should skip security checks when environment variable is set', async () => {
      process.env.SKIP_SECURITY_CHECKS = 'true';
      (runCodeAnalysis as jest.Mock).mockResolvedValue({
        blocked: false,
        details: 'All good',
      });
      (runSecurityChecks as jest.Mock).mockReturnValue({
        securityFailure: false,
        securityOutput:
          '\nSECURITY CHECKS SKIPPED: Disabled via SKIP_SECURITY_CHECKS environment variable\n',
      });

      const stagedFiles = {
        frontendFiles: [],
        backendFiles: [],
        scriptFiles: [],
        allFiles: [],
      };
      const result = await runAllChecks('/test/project', stagedFiles);

      expect(result.allOutput).toContain('SECURITY CHECKS SKIPPED');

      delete process.env.SKIP_SECURITY_CHECKS;
    });
  });
});
