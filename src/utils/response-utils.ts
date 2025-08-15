/**
 * Response utility functions for creating standardized API responses
 */

import { z } from 'zod';
import { ApiResponse } from '../types/kanban.types';

/**
 * Create a successful API response
 * @param data - Response data
 * @param message - Optional success message
 * @returns Standardized success response
 */
export function createSuccessResponse<T>(
  data: T, 
  message?: string | null
): ApiResponse<T> {
  return {
    success: true,
    data,
    error_data: null,
    message: message || null,
  };
}

/**
 * Create an error API response
 * @param message - Error message
 * @param errorData - Optional additional error data
 * @returns Standardized error response
 */
export function createErrorResponse<T = null>(
  message: string, 
  errorData: any = null
): ApiResponse<T> {
  return {
    success: false,
    data: null as T,
    error_data: errorData,
    message,
  };
}

/**
 * Create a validation error response from Zod error
 * @param error - Zod validation error
 * @returns Standardized validation error response
 */
export function createValidationErrorResponse<T = null>(
  error: z.ZodError
): ApiResponse<T> {
  const message = `Validation error: ${error.issues
    .map(issue => issue.message)
    .join(', ')}`;
    
  return createErrorResponse<T>(message, {
    validationErrors: error.issues,
  });
}

/**
 * Create a "not found" error response
 * @param resourceType - Type of resource that wasn't found (e.g., "Project", "Task")
 * @returns Standardized not found error response
 */
export function createNotFoundResponse<T = null>(
  resourceType: string
): ApiResponse<T> {
  return createErrorResponse<T>(`${resourceType} not found`);
}

/**
 * Create a Prisma error response with appropriate message
 * @param error - Prisma error
 * @param defaultMessage - Default error message if error type not recognized
 * @returns Standardized error response
 */
export function createPrismaErrorResponse<T = null>(
  error: any,
  defaultMessage = 'Database operation failed'
): ApiResponse<T> {
  // Handle unique constraint violations
  if (error.code === 'P2002') {
    const target = error.meta?.target;
    if (Array.isArray(target) && target.length > 0) {
      const field = target[0].replace('_', ' ');
      return createErrorResponse<T>(`${field} already exists`);
    }
    return createErrorResponse<T>('Resource already exists');
  }

  // Handle record not found
  if (error.code === 'P2025') {
    return createErrorResponse<T>('Resource not found');
  }

  // Handle foreign key constraint failures
  if (error.code === 'P2003') {
    return createErrorResponse<T>('Invalid reference to related resource');
  }

  // Handle required field missing
  if (error.code === 'P2012') {
    return createErrorResponse<T>('Required field is missing');
  }

  // Default error response
  return createErrorResponse<T>(defaultMessage, {
    prismaCode: error.code,
    prismaMessage: error.message,
  });
}

/**
 * Handle project creation specific errors
 * @param error - Error from project creation
 * @returns Appropriate error response for project creation
 */
export function handleCreateProjectError(error: any): ApiResponse<any> {
  if (error.code === 'P2002') {
    const target = error.meta?.target;
    if (
      target?.includes('gitRepoPath') || 
      target?.includes('git_repo_path')
    ) {
      return createErrorResponse('Git repository path already exists');
    }
  }

  return createPrismaErrorResponse(error, 'Failed to create project');
}

/**
 * Create response for invalid ID format
 * @param idType - Type of ID (e.g., "project", "task")
 * @returns Error response for invalid ID
 */
export function createInvalidIdResponse<T = null>(
  idType = 'resource'
): ApiResponse<T> {
  return createErrorResponse<T>(`Invalid ${idType} ID format`);
}