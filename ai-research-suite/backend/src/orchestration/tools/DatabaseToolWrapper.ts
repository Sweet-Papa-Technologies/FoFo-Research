import { DatabaseTool } from './DatabaseTool';
import { logger } from '../../utils/logger';

/**
 * Wrapper for DatabaseTool that handles both string and object inputs
 * This solves the issue where KaibanJS sometimes passes parameters as JSON strings
 */
export class DatabaseToolWrapper extends DatabaseTool {
  /**
   * Override the call method to intercept and parse string inputs before schema validation
   */
  async call(
    arg: string | Record<string, any>,
    configArg?: any,
    tags?: string[]
  ): Promise<string> {
    try {
      // Log the raw input
      logger.debug('DatabaseToolWrapper.call: Raw input type:', typeof arg);
      logger.debug('DatabaseToolWrapper.call: Raw input:', JSON.stringify(arg, null, 2));
      
      let parsedInput: any = arg;
      
      // If input is a string, try to parse it as JSON
      if (typeof arg === 'string') {
        logger.debug('DatabaseToolWrapper.call: Received string input, parsing as JSON');
        try {
          parsedInput = JSON.parse(arg);
          logger.debug('DatabaseToolWrapper.call: Parsed input:', JSON.stringify(parsedInput, null, 2));
        } catch (e) {
          logger.error('DatabaseToolWrapper.call: Failed to parse string input as JSON', e);
          throw new Error('Invalid input format: expected object or valid JSON string');
        }
      }
      
      // Validate the parsed input structure
      logger.debug('DatabaseToolWrapper.call: Input structure check:', {
        hasAction: 'action' in parsedInput,
        hasSessionId: 'sessionId' in parsedInput,
        hasData: 'data' in parsedInput,
        actionType: parsedInput.action,
        dataKeys: parsedInput.data ? Object.keys(parsedInput.data) : []
      });
      
      // Call the parent class method with the parsed input
      return super.call(parsedInput, configArg, tags);
    } catch (error) {
      logger.error('DatabaseToolWrapper.call error:', error);
      throw error;
    }
  }
  
  /**
   * Override the invoke method to intercept and parse string inputs before schema validation
   */
  async invoke(
    input: string | Record<string, any>,
    config?: any
  ): Promise<string> {
    try {
      // Log the raw input
      logger.debug('DatabaseToolWrapper.invoke: Raw input type:', typeof input);
      logger.debug('DatabaseToolWrapper.invoke: Raw input:', JSON.stringify(input, null, 2));
      
      let parsedInput:any = input;
      
      // If input is a string, try to parse it as JSON
      if (typeof input === 'string') {
        logger.debug('DatabaseToolWrapper.invoke: Received string input, parsing as JSON');
        try {
          parsedInput = JSON.parse(input);
          logger.debug('DatabaseToolWrapper.invoke: Parsed input:', JSON.stringify(parsedInput, null, 2));
        } catch (e) {
          logger.error('DatabaseToolWrapper.invoke: Failed to parse string input as JSON', e);
          throw new Error('Invalid input format: expected object or valid JSON string');
        }
      }
      
      // Validate the parsed input structure
      logger.debug('DatabaseToolWrapper.invoke: Input structure check:', {
        hasAction: 'action' in parsedInput,
        hasSessionId: 'sessionId' in parsedInput,
        hasData: 'data' in parsedInput,
        actionType: (parsedInput as any).action,
        dataKeys: (parsedInput as any).data ? Object.keys((parsedInput as any).data) : []
      });
      
      // Call the parent class method with the parsed input
      return super.invoke(parsedInput, config);
    } catch (error) {
      logger.error('DatabaseToolWrapper.invoke error:', error);
      throw error;
    }
  }
  
  /**
   * Keep the _call override for logging purposes
   */
  async _call(input: any): Promise<string> {
    try {
      // Log the input that reaches _call
      logger.debug('DatabaseToolWrapper._call: Input type:', typeof input);
      logger.debug('DatabaseToolWrapper._call: Input:', JSON.stringify(input, null, 2));
      
      // Call the parent class method
      return super._call(input);
    } catch (error) {
      logger.error('DatabaseToolWrapper._call error:', error);
      throw error;
    }
  }
}