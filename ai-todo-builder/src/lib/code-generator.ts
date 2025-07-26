import { 
  GeneratedCode, 
  CodeFile, 
  TestFile, 
  ComponentSpec, 
  APISpec, 
  CodeContext,
  Migration 
} from '@/types';
import { ClaudeCodeSDK } from './claude-sdk';

export interface CodeGenerationOptions {
  sessionId?: string;
  testingFramework?: 'jest' | 'vitest';
  framework?: 'react' | 'next';
  typescript?: boolean;
  includeTests?: boolean;
}

export class CodeGenerator {
  private claudeSDK: ClaudeCodeSDK;

  constructor(claudeSDK: ClaudeCodeSDK) {
    this.claudeSDK = claudeSDK;
  }

  /**
   * Generate a React component based on specification
   */
  async generateComponent(
    specification: ComponentSpec, 
    options: CodeGenerationOptions = {}
  ): Promise<GeneratedCode> {
    const {
      sessionId,
      testingFramework = 'vitest',
      framework = 'next',
      typescript = true,
      includeTests = true
    } = options;

    const prompt = this.buildComponentPrompt(specification, {
      framework,
      typescript,
      includeTests,
      testingFramework
    });

    try {
      const response = await this.claudeSDK.query(prompt, {
        sessionId,
        streaming: false
      });

      return this.parseCodeGenerationResponse(response, sessionId || 'default');
    } catch (error) {
      console.error('Failed to generate component:', error);
      throw new Error(`Component generation failed: ${error}`);
    }
  }

  /**
   * Generate API endpoint based on specification
   */
  async generateAPI(
    specification: APISpec, 
    options: CodeGenerationOptions = {}
  ): Promise<GeneratedCode> {
    const {
      sessionId,
      testingFramework = 'vitest',
      framework = 'next',
      typescript = true,
      includeTests = true
    } = options;

    const prompt = this.buildAPIPrompt(specification, {
      framework,
      typescript,
      includeTests,
      testingFramework
    });

    try {
      const response = await this.claudeSDK.query(prompt, {
        sessionId,
        streaming: false
      });

      return this.parseCodeGenerationResponse(response, sessionId || 'default');
    } catch (error) {
      console.error('Failed to generate API:', error);
      throw new Error(`API generation failed: ${error}`);
    }
  }

  /**
   * Generate tests for existing code
   */
  async generateTests(
    codeContext: CodeContext, 
    options: CodeGenerationOptions = {}
  ): Promise<GeneratedCode> {
    const {
      sessionId,
      testingFramework = 'vitest'
    } = options;

    const prompt = this.buildTestPrompt(codeContext, testingFramework);

    try {
      const response = await this.claudeSDK.query(prompt, {
        sessionId,
        streaming: false
      });

      return this.parseCodeGenerationResponse(response, sessionId || 'default');
    } catch (error) {
      console.error('Failed to generate tests:', error);
      throw new Error(`Test generation failed: ${error}`);
    }
  }

  /**
   * Generate database migration
   */
  async generateMigration(
    description: string,
    options: CodeGenerationOptions = {}
  ): Promise<Migration> {
    const { sessionId } = options;

    const prompt = `
Generate a PostgreSQL database migration for the following requirement:

${description}

Please provide:
1. A unique migration ID (format: YYYYMMDD_HHMMSS_description)
2. The UP migration SQL (to apply the change)
3. The DOWN migration SQL (to rollback the change)

Format your response as JSON:
{
  "id": "migration_id",
  "up": "SQL for applying migration",
  "down": "SQL for rolling back migration"
}

Ensure the migration is safe and follows PostgreSQL best practices.
`;

    try {
      const response = await this.claudeSDK.query(prompt, {
        sessionId,
        streaming: false
      });

      return this.parseMigrationResponse(response);
    } catch (error) {
      console.error('Failed to generate migration:', error);
      throw new Error(`Migration generation failed: ${error}`);
    }
  }

  /**
   * Build component generation prompt
   */
  private buildComponentPrompt(
    spec: ComponentSpec, 
    options: {
      framework: string;
      typescript: boolean;
      includeTests: boolean;
      testingFramework: string;
    }
  ): string {
    return `
Generate a ${options.framework} ${options.typescript ? 'TypeScript' : 'JavaScript'} component with the following specifications:

Component Name: ${spec.name}
Props: ${JSON.stringify(spec.props, null, 2)}
Functionality: ${spec.functionality.join(', ')}
Styling: ${spec.styling}

Requirements:
- Use modern React patterns (hooks, functional components)
- Follow ${options.framework} best practices
- Include proper TypeScript types if applicable
- Use Tailwind CSS for styling
- Make the component accessible (ARIA attributes)
- Include proper error handling
- Add JSDoc comments for documentation

${options.includeTests ? `
Also generate ${options.testingFramework} tests that cover:
- Component rendering
- Props handling
- User interactions
- Edge cases
- Accessibility
` : ''}

Please structure your response as follows:
1. Component file content
2. Type definitions (if TypeScript)
3. Test file content (if requested)
4. Any additional utility files needed

Format each file section clearly with file paths and content.
`;
  }

  /**
   * Build API generation prompt
   */
  private buildAPIPrompt(
    spec: APISpec, 
    options: {
      framework: string;
      typescript: boolean;
      includeTests: boolean;
      testingFramework: string;
    }
  ): string {
    return `
Generate a ${options.framework} API endpoint with the following specifications:

Endpoint: ${spec.endpoint}
Method: ${spec.method}
Parameters: ${JSON.stringify(spec.parameters, null, 2)}
Response: ${JSON.stringify(spec.response, null, 2)}
Validation: ${spec.validation.join(', ')}

Requirements:
- Use Next.js API routes pattern
- Include proper input validation
- Add comprehensive error handling
- Use TypeScript for type safety
- Follow REST API best practices
- Include proper HTTP status codes
- Add request/response logging
- Implement rate limiting if needed

${options.includeTests ? `
Also generate ${options.testingFramework} tests that cover:
- Successful requests
- Error scenarios
- Input validation
- Edge cases
- Performance considerations
` : ''}

Please structure your response as follows:
1. API route file content
2. Type definitions
3. Validation schemas
4. Test file content (if requested)
5. Any utility functions needed

Format each file section clearly with file paths and content.
`;
  }

  /**
   * Build test generation prompt
   */
  private buildTestPrompt(codeContext: CodeContext, testingFramework: string): string {
    return `
Generate comprehensive ${testingFramework} tests for the following code context:

Files: ${codeContext.files.join(', ')}
Dependencies: ${codeContext.dependencies.join(', ')}
Framework: ${codeContext.framework}
Testing Framework: ${codeContext.testingFramework}

Please generate tests that cover:
- Unit tests for individual functions/components
- Integration tests for component interactions
- Edge cases and error scenarios
- Accessibility testing
- Performance considerations

Use modern testing patterns and best practices for ${testingFramework}.
Include proper setup, teardown, and mocking where needed.

Format your response with clear file paths and test content.
`;
  }

  /**
   * Parse code generation response from Claude
   */
  private parseCodeGenerationResponse(response: string, sessionId: string): GeneratedCode {
    // This is a simplified parser - in a real implementation, you'd want more robust parsing
    const files: CodeFile[] = [];
    const tests: TestFile[] = [];
    const dependencies: string[] = [];
    const migrations: Migration[] = [];

    // Extract file sections from the response
    const fileRegex = /```(?:typescript|javascript|tsx|jsx|ts|js)\s*\/\/ (.+?)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(response)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();

      if (filePath.includes('.test.') || filePath.includes('.spec.')) {
        tests.push({
          path: filePath,
          content,
          type: filePath.includes('e2e') ? 'e2e' : 
                filePath.includes('integration') ? 'integration' : 'unit'
        });
      } else {
        files.push({
          path: filePath,
          content,
          type: this.determineFileType(filePath)
        });
      }
    }

    // Extract dependencies from package.json mentions or import statements
    const dependencyRegex = /(?:import .+ from ['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
    while ((match = dependencyRegex.exec(response)) !== null) {
      const dep = match[1] || match[2];
      if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    }

    return {
      files,
      dependencies: [...new Set(dependencies)], // Remove duplicates
      migrations,
      tests,
      sessionId
    };
  }

  /**
   * Parse migration response from Claude
   */
  private parseMigrationResponse(response: string): Migration {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const migrationData = JSON.parse(jsonMatch[0]);
        return {
          id: migrationData.id,
          up: migrationData.up,
          down: migrationData.down
        };
      }
      
      throw new Error('No valid JSON found in migration response');
    } catch (error) {
      console.error('Failed to parse migration response:', error);
      throw new Error('Invalid migration response format');
    }
  }

  /**
   * Determine file type based on path
   */
  private determineFileType(filePath: string): 'component' | 'api' | 'utility' | 'config' {
    if (filePath.includes('/api/') || filePath.includes('route.ts')) {
      return 'api';
    }
    if (filePath.includes('/components/') || filePath.endsWith('.tsx')) {
      return 'component';
    }
    if (filePath.includes('config') || filePath.endsWith('.config.')) {
      return 'config';
    }
    return 'utility';
  }

  /**
   * Validate generated code for basic syntax and structure
   */
  async validateGeneratedCode(generatedCode: GeneratedCode): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation checks
    for (const file of generatedCode.files) {
      // Check for basic syntax issues
      if (file.content.includes('undefined') && !file.content.includes('typeof undefined')) {
        warnings.push(`File ${file.path} contains undefined references`);
      }

      // Check for missing imports
      if (file.type === 'component' && file.content.includes('React') && !file.content.includes('import React')) {
        errors.push(`File ${file.path} uses React but doesn't import it`);
      }

      // Check for TypeScript issues
      if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
        if (file.content.includes(': any')) {
          warnings.push(`File ${file.path} uses 'any' type - consider more specific types`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}