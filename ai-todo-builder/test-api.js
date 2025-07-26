#!/usr/bin/env node

// Simple API test script
const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Testing AI Todo Builder API...\n');

  try {
    // Test 1: Check status
    console.log('1. Checking system status...');
    const statusRes = await fetch(`${BASE_URL}/status`);
    const status = await statusRes.json();
    console.log(`   ✅ Database: ${status.database}`);
    console.log(`   ✅ Environment: ${status.environment}\n`);

    // Test 2: Get todos
    console.log('2. Fetching todos...');
    const todosRes = await fetch(`${BASE_URL}/todos`);
    const todos = await todosRes.json();
    console.log(`   ✅ Found ${todos.length} todos\n`);

    // Test 3: Create a todo
    console.log('3. Creating a new todo...');
    const createRes = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'API Test Todo',
        description: 'Created by test script',
        metadata: { test: true }
      })
    });
    const newTodo = await createRes.json();
    console.log(`   ✅ Created todo: ${newTodo.title} (ID: ${newTodo.id})\n`);

    // Test 4: Update the todo
    console.log('4. Updating the todo...');
    const updateRes = await fetch(`${BASE_URL}/todos/${newTodo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true })
    });
    const updatedTodo = await updateRes.json();
    console.log(`   ✅ Updated todo completion: ${updatedTodo.completed}\n`);

    // Test 5: Delete the todo
    console.log('5. Deleting the todo...');
    const deleteRes = await fetch(`${BASE_URL}/todos/${newTodo.id}`, {
      method: 'DELETE'
    });
    const deleteResult = await deleteRes.json();
    console.log(`   ✅ Deleted todo: ${deleteResult.success}\n`);

    console.log('🎉 All API tests passed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAPI();