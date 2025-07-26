// Simple API test utility for development
// This can be run in the browser console or used in tests

import { TodoAPIClient } from './api-client';

export async function testTodoAPI() {
  const api = new TodoAPIClient();
  
  console.log('🧪 Starting Todo API Tests...');
  
  try {
    // Test 1: Get all todos
    console.log('📋 Test 1: Getting all todos...');
    const todos = await api.getTodos();
    console.log('✅ Success:', todos);
    
    // Test 2: Create a new todo
    console.log('➕ Test 2: Creating a new todo...');
    const newTodo = await api.createTodo({
      title: 'Test Todo',
      description: 'This is a test todo item',
      completed: false,
      metadata: { test: true }
    });
    console.log('✅ Success:', newTodo);
    
    // Test 3: Get the created todo
    console.log('🔍 Test 3: Getting the created todo...');
    const fetchedTodo = await api.getTodo(newTodo.id);
    console.log('✅ Success:', fetchedTodo);
    
    // Test 4: Update the todo
    console.log('✏️ Test 4: Updating the todo...');
    const updatedTodo = await api.updateTodo(newTodo.id, {
      title: 'Updated Test Todo',
      completed: true
    });
    console.log('✅ Success:', updatedTodo);
    
    // Test 5: Toggle todo completion
    console.log('🔄 Test 5: Toggling todo completion...');
    const toggledTodo = await api.toggleTodo(newTodo.id, false);
    console.log('✅ Success:', toggledTodo);
    
    // Test 6: Delete the todo
    console.log('🗑️ Test 6: Deleting the todo...');
    await api.deleteTodo(newTodo.id);
    console.log('✅ Success: Todo deleted');
    
    // Test 7: Try to get deleted todo (should fail)
    console.log('❌ Test 7: Trying to get deleted todo (should fail)...');
    try {
      await api.getTodo(newTodo.id);
      console.log('❌ Unexpected success - todo should not exist');
    } catch (error) {
      console.log('✅ Expected error:', error);
    }
    
    console.log('🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Validation tests
export async function testValidation() {
  const api = new TodoAPIClient();
  
  console.log('🔍 Starting Validation Tests...');
  
  // Test invalid todo creation
  try {
    console.log('❌ Test: Creating todo without title...');
    await api.createTodo({
      title: '',
      description: 'No title',
      completed: false,
      metadata: {}
    });
    console.log('❌ Unexpected success - should have failed');
  } catch (error) {
    console.log('✅ Expected validation error:', error);
  }
  
  // Test invalid UUID
  try {
    console.log('❌ Test: Getting todo with invalid ID...');
    await api.getTodo('invalid-uuid');
    console.log('❌ Unexpected success - should have failed');
  } catch (error) {
    console.log('✅ Expected validation error:', error);
  }
  
  // Test title too long
  try {
    console.log('❌ Test: Creating todo with title too long...');
    await api.createTodo({
      title: 'a'.repeat(300), // Too long
      description: 'Long title test',
      completed: false,
      metadata: {}
    });
    console.log('❌ Unexpected success - should have failed');
  } catch (error) {
    console.log('✅ Expected validation error:', error);
  }
  
  console.log('🎉 Validation tests completed!');
}

// Run all tests
export async function runAllTests() {
  await testTodoAPI();
  await testValidation();
}