import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { isValidUUID, validateTodoUpdateInput, sanitizeString, hasUpdateFields } from '@/lib/validation';
import { 
  handleDatabaseError, 
  handleValidationError, 
  handleJSONParseError, 
  handleNotFoundError,
  handleInvalidIdError,
  handleMissingFieldsError
} from '@/lib/error-handler';
import { TodoItem } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format (skip for memory DB which uses simple IDs)
    if (process.env.DATABASE_URL && !isValidUUID(id)) {
      return handleInvalidIdError('Todo ID');
    }

    const todo = await db.getTodoById(id);

    if (!todo) {
      return handleNotFoundError('Todo');
    }

    return NextResponse.json(todo);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format (skip for memory DB which uses simple IDs)
    if (process.env.DATABASE_URL && !isValidUUID(id)) {
      return handleInvalidIdError('Todo ID');
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return handleJSONParseError();
    }

    const { title, description, completed, metadata } = body;
    
    // Validate input
    const validation = validateTodoUpdateInput({ title, description, completed, metadata });
    if (!validation.isValid) {
      return handleValidationError(validation.errors);
    }

    // Check if at least one field is provided for update
    if (!hasUpdateFields({ title, description, completed, metadata })) {
      return handleMissingFieldsError('At least one field must be provided for update');
    }

    // Sanitize inputs
    const sanitizedTitle = title !== undefined ? sanitizeString(title) : undefined;
    const sanitizedDescription = description !== undefined ? sanitizeString(description) : undefined;

    const updates: Partial<TodoItem> = {};
    if (sanitizedTitle !== undefined && sanitizedTitle !== null) updates.title = sanitizedTitle;
    if (sanitizedDescription !== undefined && sanitizedDescription !== null) updates.description = sanitizedDescription;
    if (completed !== undefined) updates.completed = completed;
    if (metadata !== undefined) updates.metadata = metadata;

    const todo = await db.updateTodo(id, updates);

    if (!todo) {
      return handleNotFoundError('Todo');
    }

    return NextResponse.json(todo);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format (skip for memory DB which uses simple IDs)
    if (process.env.DATABASE_URL && !isValidUUID(id)) {
      return handleInvalidIdError('Todo ID');
    }

    const success = await db.deleteTodo(id);

    if (!success) {
      return handleNotFoundError('Todo');
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return handleDatabaseError(error);
  }
}