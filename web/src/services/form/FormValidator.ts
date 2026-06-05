/**
 * FormValidator — declarative form validation
 *
 * Inspired by: react-hook-form, formik, yup
 *
 * Define rules for each field, then validate a values object.
 * Rules:
 *   - required, minLength, maxLength, pattern
 *   - min, max (numeric)
 *   - email, url, uuid
 *   - oneOf (enum)
 *   - custom validator function
 *   - matches (compare with another field)
 */

export type FieldValue = string | number | boolean | null | undefined;
export type FormValues = Record<string, FieldValue>;

export interface FieldRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  uuid?: boolean;
  oneOf?: FieldValue[];
  matches?: string; // field name to match
  custom?: (value: FieldValue, all: FormValues) => string | null;
  label?: string;
}

export type FormSchema = Record<string, FieldRules>;

export interface ValidationError {
  field: string;
  message: string;
  rule: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Map of field name -> first error message */
  errorMap: Record<string, string>;
}

export class FormValidator {
  /**
   * Validate a values object against a schema.
   */
  validate(values: FormValues, schema: FormSchema): ValidationResult {
    const errors: ValidationError[] = [];
    const errorMap: Record<string, string> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = values[field];
      const label = rules.label ?? field;
      const fieldErrors = this.validateField(field, value, rules, values);
      for (const err of fieldErrors) {
        errors.push(err);
        if (!errorMap[field]) errorMap[field] = err.message;
      }
    }

    return { valid: errors.length === 0, errors, errorMap };
  }

  /**
   * Validate a single field.
   */
  validateField(field: string, value: FieldValue, rules: FieldRules, allValues: FormValues = {}): ValidationError[] {
    const errors: ValidationError[] = [];
    const label = rules.label ?? field;

    // Required check
    if (rules.required) {
      if (value === undefined || value === null || value === '') {
        errors.push({ field, rule: 'required', message: `${label} is required` });
        // Don't run further rules on empty required fields
        return errors;
      }
    }

    // Skip other rules if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    const str = String(value);
    const num = Number(value);

    if (rules.minLength !== undefined && str.length < rules.minLength) {
      errors.push({ field, rule: 'minLength', message: `${label} must be at least ${rules.minLength} characters` });
    }
    if (rules.maxLength !== undefined && str.length > rules.maxLength) {
      errors.push({ field, rule: 'maxLength', message: `${label} must be at most ${rules.maxLength} characters` });
    }
    if (rules.min !== undefined && !isNaN(num) && num < rules.min) {
      errors.push({ field, rule: 'min', message: `${label} must be at least ${rules.min}` });
    }
    if (rules.max !== undefined && !isNaN(num) && num > rules.max) {
      errors.push({ field, rule: 'max', message: `${label} must be at most ${rules.max}` });
    }
    if (rules.pattern && !rules.pattern.test(str)) {
      errors.push({ field, rule: 'pattern', message: `${label} format is invalid` });
    }
    if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      errors.push({ field, rule: 'email', message: `${label} must be a valid email` });
    }
    if (rules.url) {
      try {
        new URL(str);
      } catch {
        errors.push({ field, rule: 'url', message: `${label} must be a valid URL` });
      }
    }
    if (rules.uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
      errors.push({ field, rule: 'uuid', message: `${label} must be a valid UUID` });
    }
    if (rules.oneOf && !rules.oneOf.includes(value)) {
      errors.push({ field, rule: 'oneOf', message: `${label} must be one of: ${rules.oneOf.join(', ')}` });
    }
    if (rules.matches !== undefined) {
      if (String(value) !== String(allValues[rules.matches])) {
        errors.push({ field, rule: 'matches', message: `${label} must match ${rules.matches}` });
      }
    }
    if (rules.custom) {
      const msg = rules.custom(value, allValues);
      if (msg) errors.push({ field, rule: 'custom', message: msg });
    }
    return errors;
  }

  /** Check if a single field is valid. */
  isFieldValid(field: string, value: FieldValue, rules: FieldRules, allValues: FormValues = {}): boolean {
    return this.validateField(field, value, rules, allValues).length === 0;
  }
}
