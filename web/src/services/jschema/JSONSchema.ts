/**
 * JSONSchema — simplified JSON Schema validator
 *
 * Inspired by: ajv
 *
 * Supports: type, properties, required, items, minLength, maxLength,
 *   minimum, maximum, enum, pattern
 */

export interface Schema {
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  pattern?: string;
  format?: string;
  minimumItems?: number;
  maxItems?: number;
  minItems?: number;
  additionalProperties?: boolean | Schema;
}

export interface ValidationError {
  path: string;
  message: string;
}

export class JSONSchema {
  /**
   * Validate data against schema.
   */
  static validate(data: unknown, schema: Schema): ValidationError[] {
    const errors: ValidationError[] = [];
    JSONSchema.check(data, schema, '', errors);
    return errors;
  }

  /**
   * Quick check if data is valid.
   */
  static isValid(data: unknown, schema: Schema): boolean {
    return JSONSchema.validate(data, schema).length === 0;
  }

  private static check(data: unknown, schema: Schema, path: string, errors: ValidationError[]): void {
    // type
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some((t) => JSONSchema.matchesType(data, t))) {
        errors.push({ path: path || '/', message: `Expected type ${types.join('|')}, got ${typeof data}` });
        return;
      }
    }
    // enum
    if (schema.enum) {
      if (!schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(data))) {
        errors.push({ path: path || '/', message: `Not in enum` });
      }
    }
    // string constraints
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({ path, message: `Shorter than minLength ${schema.minLength}` });
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({ path, message: `Longer than maxLength ${schema.maxLength}` });
      }
      if (schema.pattern) {
        const re = new RegExp(schema.pattern);
        if (!re.test(data)) {
          errors.push({ path, message: `Doesn't match pattern ${schema.pattern}` });
        }
      }
    }
    // number constraints
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({ path, message: `Less than minimum ${schema.minimum}` });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({ path, message: `Greater than maximum ${schema.maximum}` });
      }
    }
    // array
    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.push({ path, message: `Fewer than minItems ${schema.minItems}` });
      }
      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        errors.push({ path, message: `More than maxItems ${schema.maxItems}` });
      }
      if (schema.items) {
        for (let i = 0; i < data.length; i++) {
          JSONSchema.check(data[i], schema.items, `${path}/${i}`, errors);
        }
      }
    }
    // object
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      if (schema.required) {
        for (const key of schema.required) {
          if (!(key in obj)) {
            errors.push({ path: `${path}/${key}`, message: 'Required' });
          }
        }
      }
      if (schema.properties) {
        for (const [key, sub] of Object.entries(schema.properties)) {
          if (key in obj) {
            JSONSchema.check(obj[key], sub, `${path}/${key}`, errors);
          }
        }
      }
    }
  }

  private static matchesType(data: unknown, type: string): boolean {
    if (type === 'string') return typeof data === 'string';
    if (type === 'number') return typeof data === 'number';
    if (type === 'integer') return typeof data === 'number' && Number.isInteger(data);
    if (type === 'boolean') return typeof data === 'boolean';
    if (type === 'null') return data === null;
    if (type === 'array') return Array.isArray(data);
    if (type === 'object') return typeof data === 'object' && data !== null && !Array.isArray(data);
    return true;
  }
}
