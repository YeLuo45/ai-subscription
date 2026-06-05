/**
 * SchemaValidator — JSON Schema validation (subset)
 *
 * Inspired by: JSON Schema Draft 7 / Ajv
 *
 * Validate JSON values against a schema.
 * Supports subset:
 *   - type: string, number, integer, boolean, null, array, object
 *   - properties: field rules
 *   - required: list of required fields
 *   - items: array element schema
 *   - minLength, maxLength, pattern
 *   - minimum, maximum, exclusiveMinimum, exclusiveMaximum
 *   - minItems, maxItems, uniqueItems
 *   - enum
 *   - const
 *   - anyOf, allOf, oneOf
 *   - $ref (local refs)
 *   - nullable: allow null in addition to type
 */

export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'array' | 'object';

export interface JsonSchema {
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  nullable?: boolean;
  $ref?: string;
  description?: string;
  default?: unknown;
}

export interface SchemaError {
  path: string;
  message: string;
  schemaPath: string;
  keyword: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: SchemaError[];
}

export class SchemaValidator {
  private definitions: Map<string, JsonSchema> = new Map();

  /**
   * Register a definition for $ref lookup.
   */
  define(name: string, schema: JsonSchema): void {
    this.definitions.set(name, schema);
  }

  /**
   * Validate a value against a schema.
   */
  validate(value: unknown, schema: JsonSchema): ValidationResult {
    const errors: SchemaError[] = [];
    this.validateValue(value, schema, '', '', errors);
    return { valid: errors.length === 0, errors };
  }

  private validateValue(value: unknown, schema: JsonSchema, path: string, schemaPath: string, errors: SchemaError[]): void {
    // Handle $ref
    if (schema.$ref) {
      const def = this.definitions.get(schema.$ref);
      if (!def) {
        errors.push({ path, schemaPath, message: `unresolved $ref: ${schema.$ref}`, keyword: '$ref' });
        return;
      }
      this.validateValue(value, def, path, schemaPath, errors);
      return;
    }

    // anyOf
    if (schema.anyOf) {
      const subResults = schema.anyOf.map((s) => this.validate(value, s));
      if (!subResults.some((r) => r.valid)) {
        errors.push({ path, schemaPath, message: 'value does not match anyOf', keyword: 'anyOf' });
      }
      return;
    }
    if (schema.allOf) {
      for (const s of schema.allOf) {
        const r = this.validate(value, s);
        if (!r.valid) errors.push(...r.errors);
      }
      return;
    }
    if (schema.oneOf) {
      const validCount = schema.oneOf.filter((s) => this.validate(value, s).valid).length;
      if (validCount !== 1) {
        errors.push({ path, schemaPath, message: `value matches ${validCount} schemas (expected 1)`, keyword: 'oneOf' });
      }
      return;
    }

    // Type check
    if (schema.type !== undefined) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const actualType = this.getJsonType(value);
      // number type accepts integer (since all integers are numbers)
      const compatibleTypes = types.map((t) => (t === 'number' ? ['number', 'integer'] : [t])).flat();
      if (!compatibleTypes.includes(actualType) && !(schema.nullable && value === null)) {
        errors.push({ path, schemaPath, message: `expected ${types.join('|')}, got ${actualType}`, keyword: 'type' });
        return;
      }
    }

    // Null check
    if (value === null) return;

    // String constraints
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({ path, schemaPath, message: `string length < ${schema.minLength}`, keyword: 'minLength' });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({ path, schemaPath, message: `string length > ${schema.maxLength}`, keyword: 'maxLength' });
      }
      if (schema.pattern !== undefined) {
        const re = new RegExp(schema.pattern);
        if (!re.test(value)) {
          errors.push({ path, schemaPath, message: `string does not match pattern ${schema.pattern}`, keyword: 'pattern' });
        }
      }
    }

    // Number constraints
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({ path, schemaPath, message: `number < ${schema.minimum}`, keyword: 'minimum' });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({ path, schemaPath, message: `number > ${schema.maximum}`, keyword: 'maximum' });
      }
      if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
        errors.push({ path, schemaPath, message: `number <= ${schema.exclusiveMinimum}`, keyword: 'exclusiveMinimum' });
      }
      if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
        errors.push({ path, schemaPath, message: `number >= ${schema.exclusiveMaximum}`, keyword: 'exclusiveMaximum' });
      }
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        errors.push({ path, schemaPath, message: 'not an integer', keyword: 'type' });
      }
    }

    // Array constraints
    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push({ path, schemaPath, message: `array length < ${schema.minItems}`, keyword: 'minItems' });
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push({ path, schemaPath, message: `array length > ${schema.maxItems}`, keyword: 'maxItems' });
      }
      if (schema.uniqueItems) {
        const seen = new Set();
        for (let i = 0; i < value.length; i++) {
          if (seen.has(JSON.stringify(value[i]))) {
            errors.push({ path: `${path}/${i}`, schemaPath: `${schemaPath}/uniqueItems`, message: 'duplicate item', keyword: 'uniqueItems' });
            break;
          }
          seen.add(JSON.stringify(value[i]));
        }
      }
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          this.validateValue(value[i], schema.items, `${path}/${i}`, `${schemaPath}/items`, errors);
        }
      }
    }

    // Object constraints
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      const obj = value as Record<string, unknown>;
      if (schema.required) {
        for (const key of schema.required) {
          if (!(key in obj)) {
            errors.push({ path, schemaPath: `${schemaPath}/required`, message: `missing required field: ${key}`, keyword: 'required' });
          }
        }
      }
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in obj) {
            this.validateValue(obj[key], propSchema, `${path}/${key}`, `${schemaPath}/properties/${key}`, errors);
          }
        }
      }
    }

    // enum
    if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
      errors.push({ path, schemaPath, message: `value not in enum`, keyword: 'enum' });
    }

    // const
    if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(value)) {
      errors.push({ path, schemaPath, message: `value does not match const`, keyword: 'const' });
    }
  }

  private getJsonType(value: unknown): JsonSchemaType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (Number.isInteger(value)) return 'integer';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'object';
    return 'null';
  }
}
