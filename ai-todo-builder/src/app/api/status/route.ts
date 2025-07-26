import { NextResponse } from 'next/server';
import { shouldUseMemoryDB } from '@/lib/memory-database';

export async function GET() {
  const status = {
    database: shouldUseMemoryDB() ? 'memory' : 'postgresql',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  };

  return NextResponse.json(status);
}