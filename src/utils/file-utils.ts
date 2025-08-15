/**
 * File and directory search utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { SearchResult } from '../types/kanban.types';

/**
 * Configuration for file search operations
 */
interface SearchConfig {
  maxResults: number;
  skipHidden: boolean;
  ignorePatterns: string[];
}

/**
 * Default search configuration
 */
const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  maxResults: 100,
  skipHidden: true,
  ignorePatterns: ['node_modules', 'target', 'dist', '.git'],
};

/**
 * Search for files and directories in a project directory
 * @param projectPath - Root directory to search in
 * @param query - Search query to match against file/directory names
 * @param config - Optional search configuration
 * @returns Array of search results
 */
export async function searchFiles(
  projectPath: string,
  query: string,
  config: Partial<SearchConfig> = {}
): Promise<SearchResult[]> {
  const searchConfig = { ...DEFAULT_SEARCH_CONFIG, ...config };
  const results: SearchResult[] = [];

  await searchRecursively(projectPath, '', query, results, searchConfig);
  return results;
}

/**
 * Recursively search directories for matching files
 * @param currentPath - Current directory being searched
 * @param relativePath - Relative path from project root
 * @param query - Search query
 * @param results - Array to collect results
 * @param config - Search configuration
 */
async function searchRecursively(
  currentPath: string,
  relativePath: string,
  query: string,
  results: SearchResult[],
  config: SearchConfig
): Promise<void> {
  if (results.length >= config.maxResults) {
    return;
  }

  try {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= config.maxResults) {
        break;
      }

      if (shouldSkipEntry(entry, config)) {
        continue;
      }

      const fullPath = path.join(currentPath, entry.name);
      const entryRelativePath = relativePath 
        ? path.join(relativePath, entry.name) 
        : entry.name;

      const matchResult = checkForMatch(entry, entryRelativePath, query);
      if (matchResult) {
        results.push(matchResult);
      }

      // Recursively search directories
      if (entry.isDirectory() && results.length < config.maxResults) {
        await searchRecursively(fullPath, entryRelativePath, query, results, config);
      }
    }
  } catch {
    // Skip directories we can't read (permission issues, etc.)
  }
}

/**
 * Determine if an entry should be skipped based on configuration
 * @param entry - Directory entry to check
 * @param config - Search configuration
 * @returns True if entry should be skipped
 */
function shouldSkipEntry(entry: fs.Dirent, config: SearchConfig): boolean {
  // Skip hidden files unless specifically allowed
  if (config.skipHidden && entry.name.startsWith('.') && entry.name !== '.gitignore') {
    return true;
  }

  // Skip ignore patterns
  return config.ignorePatterns.includes(entry.name);
}

/**
 * Check if an entry matches the search query
 * @param entry - Directory entry to check
 * @param relativePath - Relative path of the entry
 * @param query - Search query
 * @returns SearchResult if match found, null otherwise
 */
function checkForMatch(
  entry: fs.Dirent,
  relativePath: string,
  query: string
): SearchResult | null {
  const normalizedQuery = query.toLowerCase();
  const nameMatch = entry.name.toLowerCase().includes(normalizedQuery);
  const pathMatch = relativePath.toLowerCase().includes(normalizedQuery);

  if (!nameMatch && !pathMatch) {
    return null;
  }

  let matchType: 'FileName' | 'DirectoryName' | 'FullPath' = 'FullPath';

  if (nameMatch) {
    matchType = entry.isDirectory() ? 'DirectoryName' : 'FileName';
  }

  return {
    path: relativePath,
    is_file: entry.isFile(),
    match_type: matchType,
  };
}

/**
 * Check if a path is a valid git repository
 * @param repoPath - Path to check
 * @returns True if path exists and contains .git directory
 */
export function isValidGitRepository(repoPath: string): boolean {
  if (!fs.existsSync(repoPath)) {
    return false;
  }

  const gitDir = path.join(repoPath, '.git');
  return fs.existsSync(gitDir);
}

/**
 * Validate that a directory path exists
 * @param dirPath - Path to validate
 * @returns True if path exists and is a directory
 */
export function isValidDirectory(dirPath: string): boolean {
  try {
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}