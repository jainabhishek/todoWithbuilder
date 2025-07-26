// Validation utilities for API endpoints

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// UUID validation
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Todo input validation for creation
export function validateTodoInput(data: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format');
    return { isValid: false, errors };
  }
  
  const todoData = data as Record<string, unknown>;
  
  if (!todoData.title || typeof todoData.title !== 'string') {
    errors.push('Title is required and must be a string');
  } else if (todoData.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  } else if (todoData.title.length > 255) {
    errors.push('Title must be 255 characters or less');
  }
  
  if (todoData.description !== undefined && todoData.description !== null) {
    if (typeof todoData.description !== 'string') {
      errors.push('Description must be a string');
    } else if (todoData.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }
  }
  
  if (todoData.metadata !== undefined && todoData.metadata !== null) {
    if (typeof todoData.metadata !== 'object' || Array.isArray(todoData.metadata)) {
      errors.push('Metadata must be an object');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Todo input validation for updates
export function validateTodoUpdateInput(data: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format');
    return { isValid: false, errors };
  }
  
  const todoData = data as Record<string, unknown>;
  
  if (todoData.title !== undefined) {
    if (typeof todoData.title !== 'string') {
      errors.push('Title must be a string');
    } else if (todoData.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (todoData.title.length > 255) {
      errors.push('Title must be 255 characters or less');
    }
  }
  
  if (todoData.description !== undefined && todoData.description !== null) {
    if (typeof todoData.description !== 'string') {
      errors.push('Description must be a string');
    } else if (todoData.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }
  }
  
  if (todoData.completed !== undefined) {
    if (typeof todoData.completed !== 'boolean') {
      errors.push('Completed must be a boolean');
    }
  }
  
  if (todoData.metadata !== undefined && todoData.metadata !== null) {
    if (typeof todoData.metadata !== 'object' || Array.isArray(todoData.metadata)) {
      errors.push('Metadata must be an object');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Sanitize string inputs
export function sanitizeString(input: string | undefined | null): string | null {
  if (input === undefined || input === null) {
    return null;
  }
  return input.trim() || null;
}

// Check if update request has at least one field
export function hasUpdateFields(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const todoData = data as Record<string, unknown>;
  
  return todoData.title !== undefined || 
         todoData.description !== undefined || 
         todoData.completed !== undefined || 
         todoData.metadata !== undefined;
}