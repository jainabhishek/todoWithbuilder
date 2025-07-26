import { NextResponse } from 'next/server';

export interface APIError {
  error: string;
  details?: string | string[];
  code?: string;
}

// Standard error responses
export function createErrorResponse(
  message: string, 
  status: number, 
  details?: string | string[],
  code?: string
): NextResponse {
  const errorBody: APIError = { error: message };
  
  if (details) {
    errorBody.details = details;
  }
  
  if (code) {
    errorBody.code = code;
  }
  
  return NextResponse.json(errorBody, { status });
}

// Handle database errors
export function handleDatabaseError(error: unknown): NextResponse {
  console.error('Database error:', error);
  
  if (error instanceof Error) {
    // Handle specific PostgreSQL errors
    if (error.message.includes('duplicate key')) {
      return createErrorResponse(
        'Resource already exists',
        409,
        'A resource with this identifier already exists',
        'DUPLICATE_KEY'
      );
    }
    
    if (error.message.includes('connection')) {
      return createErrorResponse(
        'Database connection error',
        503,
        'Unable to connect to the database. Please try again later.',
        'CONNECTION_ERROR'
      );
    }
    
    if (error.message.includes('timeout')) {
      return createErrorResponse(
        'Database timeout',
        504,
        'The database operation timed out. Please try again.',
        'TIMEOUT_ERROR'
      );
    }
    
    if (error.message.includes('foreign key')) {
      return createErrorResponse(
        'Invalid reference',
        400,
        'Referenced resource does not exist',
        'FOREIGN_KEY_ERROR'
      );
    }
  }
  
  // Generic database error
  return createErrorResponse(
    'Database operation failed',
    500,
    error instanceof Error ? error.message : 'Unknown database error',
    'DATABASE_ERROR'
  );
}

// Handle validation errors
export function handleValidationError(errors: string[]): NextResponse {
  return createErrorResponse(
    'Validation failed',
    400,
    errors,
    'VALIDATION_ERROR'
  );
}

// Handle JSON parsing errors
export function handleJSONParseError(): NextResponse {
  return createErrorResponse(
    'Invalid JSON',
    400,
    'Request body contains invalid JSON',
    'JSON_PARSE_ERROR'
  );
}

// Handle not found errors
export function handleNotFoundError(resource: string = 'Resource'): NextResponse {
  return createErrorResponse(
    `${resource} not found`,
    404,
    `The requested ${resource.toLowerCase()} could not be found`,
    'NOT_FOUND'
  );
}

// Handle invalid ID format errors
export function handleInvalidIdError(idType: string = 'ID'): NextResponse {
  return createErrorResponse(
    `Invalid ${idType} format`,
    400,
    `The provided ${idType.toLowerCase()} is not in the correct format`,
    'INVALID_ID_FORMAT'
  );
}

// Handle missing required fields
export function handleMissingFieldsError(message: string = 'Required fields missing'): NextResponse {
  return createErrorResponse(
    message,
    400,
    'One or more required fields are missing from the request',
    'MISSING_FIELDS'
  );
}

// Generic error handler
export function handleGenericError(error: unknown, operation: string): NextResponse {
  console.error(`Error during ${operation}:`, error);
  
  return createErrorResponse(
    `Failed to ${operation}`,
    500,
    error instanceof Error ? error.message : 'Unknown error occurred',
    'INTERNAL_ERROR'
  );
}