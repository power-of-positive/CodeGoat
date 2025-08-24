import * as fs from 'fs';
import * as path from 'path';
import { gherkin, IdGenerator } from '@cucumber/gherkin';

export interface PlaywrightTest {
  file: string;
  testName: string;
  description?: string;
  tags?: string[];
}

export interface BDDScenario {
  id: string;
  title: string;
  feature: string;
  gherkinContent: string;
  playwrightTestFile?: string;
  playwrightTestName?: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
}

export class ScenarioLinker {
  private testFiles: string[] = [];
  private playwrightTests: PlaywrightTest[] = [];

  constructor(private testDirectory: string = './e2e') {
    this.scanTestFiles();
  }

  /**
   * Scan the test directory for Playwright test files
   */
  private scanTestFiles() {
    if (!fs.existsSync(this.testDirectory)) {
      console.warn(`Test directory ${this.testDirectory} does not exist`);
      return;
    }

    const files = fs.readdirSync(this.testDirectory, { recursive: true });
    this.testFiles = files
      .filter(file => typeof file === 'string' && file.endsWith('.spec.ts'))
      .map(file => path.join(this.testDirectory, file as string));

    this.extractTestInformation();
  }

  /**
   * Extract test names and descriptions from Playwright test files
   */
  private extractTestInformation() {
    this.playwrightTests = [];

    for (const testFile of this.testFiles) {
      try {
        const content = fs.readFileSync(testFile, 'utf-8');
        const tests = this.parsePlaywrightTests(content, testFile);
        this.playwrightTests.push(...tests);
      } catch (error) {
        console.warn(`Error reading test file ${testFile}:`, error);
      }
    }
  }

  /**
   * Parse Playwright test file content to extract test information
   */
  private parsePlaywrightTests(content: string, filePath: string): PlaywrightTest[] {
    const tests: PlaywrightTest[] = [];
    
    // Regular expressions to match test definitions
    const testRegex = /test\s*\(\s*['"](.*?)['"],?\s*async/g;
    const describeRegex = /test\.describe\s*\(\s*['"](.*?)['"],?\s*\(\)/g;
    
    let match;
    let currentDescribe = '';

    // Extract describe blocks
    while ((match = describeRegex.exec(content)) !== null) {
      currentDescribe = match[1];
    }

    // Reset regex lastIndex
    testRegex.lastIndex = 0;

    // Extract individual tests
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      
      tests.push({
        file: filePath,
        testName,
        description: currentDescribe ? `${currentDescribe} - ${testName}` : testName,
        tags: this.extractTags(content, testName)
      });
    }

    return tests;
  }

  /**
   * Extract tags from test content (comments or annotations)
   */
  private extractTags(content: string, testName: string): string[] {
    const tags: string[] = [];
    
    // Look for @tag annotations before the test
    const testIndex = content.indexOf(testName);
    if (testIndex > -1) {
      const beforeTest = content.substring(Math.max(0, testIndex - 500), testIndex);
      const tagMatches = beforeTest.match(/@[\w-]+/g);
      if (tagMatches) {
        tags.push(...tagMatches.map(tag => tag.substring(1)));
      }
    }

    return tags;
  }

  /**
   * Find potential matches between BDD scenarios and Playwright tests
   */
  public suggestLinks(scenarios: BDDScenario[]): Array<{
    scenario: BDDScenario;
    suggestedTests: PlaywrightTest[];
    confidence: number;
  }> {
    const suggestions: Array<{
      scenario: BDDScenario;
      suggestedTests: PlaywrightTest[];
      confidence: number;
    }> = [];

    for (const scenario of scenarios) {
      const matches = this.findMatchingTests(scenario);
      if (matches.length > 0) {
        suggestions.push({
          scenario,
          suggestedTests: matches,
          confidence: this.calculateConfidence(scenario, matches[0])
        });
      }
    }

    return suggestions;
  }

  /**
   * Find matching Playwright tests for a BDD scenario
   */
  private findMatchingTests(scenario: BDDScenario): PlaywrightTest[] {
    const matches: Array<{ test: PlaywrightTest; score: number }> = [];

    for (const test of this.playwrightTests) {
      const score = this.calculateMatchScore(scenario, test);
      if (score > 0.3) { // Minimum threshold
        matches.push({ test, score });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    
    return matches.map(m => m.test);
  }

  /**
   * Calculate a match score between a scenario and a test
   */
  private calculateMatchScore(scenario: BDDScenario, test: PlaywrightTest): number {
    let score = 0;

    // Keyword matching in titles
    const scenarioWords = this.extractKeywords(scenario.title);
    const testWords = this.extractKeywords(test.testName);
    
    const commonWords = scenarioWords.filter(word => testWords.includes(word));
    score += commonWords.length / Math.max(scenarioWords.length, testWords.length);

    // Feature matching
    const featureWords = this.extractKeywords(scenario.feature);
    const testFileWords = this.extractKeywords(path.basename(test.file, '.spec.ts'));
    
    const commonFeatureWords = featureWords.filter(word => testFileWords.includes(word));
    score += commonFeatureWords.length / Math.max(featureWords.length, testFileWords.length) * 0.5;

    // Gherkin content analysis
    const gherkinKeywords = this.extractGherkinKeywords(scenario.gherkinContent);
    const testKeywords = this.extractKeywords(test.description || test.testName);
    
    const commonGherkinWords = gherkinKeywords.filter(word => testKeywords.includes(word));
    score += commonGherkinWords.length / Math.max(gherkinKeywords.length, testKeywords.length) * 0.3;

    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Extract meaningful keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'should', 'can', 'will', 'is', 'are', 'was', 'were']);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Extract keywords specific to Gherkin content
   */
  private extractGherkinKeywords(gherkinContent: string): string[] {
    // Remove Gherkin keywords and extract meaningful content
    const cleanContent = gherkinContent
      .replace(/^\s*(Given|When|Then|And|But|Feature|Scenario|Background):/gm, '')
      .replace(/^\s*(Given|When|Then|And|But)\s+/gm, '');
    
    return this.extractKeywords(cleanContent);
  }

  /**
   * Calculate confidence score for a scenario-test link
   */
  private calculateConfidence(scenario: BDDScenario, test: PlaywrightTest): number {
    return this.calculateMatchScore(scenario, test);
  }

  /**
   * Get all available Playwright tests
   */
  public getAvailableTests(): PlaywrightTest[] {
    return this.playwrightTests;
  }

  /**
   * Parse Gherkin content to extract structured information
   */
  public parseGherkinScenario(gherkinContent: string): unknown {
    try {
      const uuidFn = IdGenerator.uuid();
      const gherkinDocument = gherkin.fromString(gherkinContent, {
        includeSource: false,
        includeGherkinDocument: true,
        includePickles: true,
        newId: uuidFn
      });

      return gherkinDocument;
    } catch (error) {
      console.warn('Error parsing Gherkin content:', error);
      return null;
    }
  }

  /**
   * Validate that a BDD scenario has proper Gherkin syntax
   */
  public validateGherkinSyntax(gherkinContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const parsed = this.parseGherkinScenario(gherkinContent);
      if (!parsed) {
        errors.push('Invalid Gherkin syntax');
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error');
    }

    // Additional validation rules
    if (!gherkinContent.includes('Feature:')) {
      errors.push('Gherkin content must include a Feature declaration');
    }

    if (!gherkinContent.includes('Scenario:')) {
      errors.push('Gherkin content must include at least one Scenario');
    }

    const hasGherkinKeywords = /\b(Given|When|Then)\b/.test(gherkinContent);
    if (!hasGherkinKeywords) {
      errors.push('Scenario must include Given, When, or Then steps');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate step definitions from Gherkin scenarios
   */
  public generateStepDefinitions(gherkinContent: string): string[] {
    const stepDefinitions: string[] = [];
    const lines = gherkinContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match Gherkin steps
      const stepMatch = trimmedLine.match(/^(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const stepType = stepMatch[1] === 'And' || stepMatch[1] === 'But' ? 'Given' : stepMatch[1];
        const stepText = stepMatch[2];
        
        // Convert step text to cucumber expression
        const expression = this.convertToRegex(stepText);
        
        const stepDef = `${stepType}('${expression}', async function() {
  // TODO: Implement this step
  throw new Error('Step not implemented');
});`;

        stepDefinitions.push(stepDef);
      }
    }

    return [...new Set(stepDefinitions)]; // Remove duplicates
  }

  /**
   * Convert step text to a cucumber expression pattern
   */
  private convertToRegex(stepText: string): string {
    return stepText
      .replace(/"/g, '{string}')
      .replace(/\d+/g, '{int}')
      .replace(/\{string\}/g, '"([^"]*)"')
      .replace(/\{int\}/g, '(\\d+)');
  }
}