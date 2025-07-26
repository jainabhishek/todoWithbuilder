import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { validateTodoInput, sanitizeString } from '@/lib/validation';
import { 
  handleDatabaseError, 
  handleValidationError, 
  handleJSONParseError, 
  handleGenericError 
} from '@/lib/error-handler';
import { TodoItem } from '@/types';

export async function GET() {
  try {
    const todos = await db.getTodos();
    return NextResponse.json(todos);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return handleJSONParseError();
    }

    const { title, description, metadata = {} } = body;
    
    // Validate input
    const validation = validateTodoInput({ title, description, metadata });
    if (!validation.isValid) {
      return handleValidationError(validation.errors);
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(title)!; // We know it's valid from validation
    const sanitizedDescription = sanitizeString(description) || undefined;

    const todo = await db.createTodo({
      title: sanitizedTitle,
      description: sanitizedDescription,
      completed: false,
      metadata
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}