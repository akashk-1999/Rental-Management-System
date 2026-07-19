import { Request, Response, NextFunction, RequestHandler } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors/ValidationError';

/**
 * Supported request locations that can be validated.
 */
export interface ValidationSchemaGroup {
  body?: Joi.Schema | object;
  params?: Joi.Schema | object;
  query?: Joi.Schema | object;
}

/**
 * Standard Joi options applied to all validations.
 * - abortEarly: false - returns all validation errors instead of stopping at the first failure.
 * - allowUnknown: false - fails validation if unknown fields are present in the input.
 * - stripUnknown: true - strips any unrecognized fields from the resulting validated object.
 */
const DEFAULT_JOI_OPTIONS: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true,
};

/**
 * Reusable request validation middleware factory.
 * Validates request data across 'body', 'params', and 'query' targets against Joi schemas.
 * Replaces the original request segments with their validated, stripped results.
 * 
 * @param schemas - An object containing Joi schemas mapped to 'body', 'params', or 'query'
 * @returns An Express RequestHandler middleware
 */
export const validateRequest = (schemas: ValidationSchemaGroup): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Keys of Request we want to validate
    const targets: ('body' | 'params' | 'query')[] = ['body', 'params', 'query'];

    for (const target of targets) {
      const rawSchema = schemas[target];
      if (!rawSchema) {
        continue; // Skip validation for target if schema is not provided
      }

      // Compile raw object to Joi schema if not already a compiled schema
      const schema = Joi.compile(rawSchema);
      const dataToValidate = req[target];

      const { value, error } = schema.validate(dataToValidate, DEFAULT_JOI_OPTIONS);

      if (error) {
        // Collect detailed, human-readable Joi validation messages
        const details = error.details.map((detail) => detail.message);
        errors.push(...details);
      } else {
        // Replace request field with the sanitized, validated, and stripped object
        req[target] = value;
      }
    }

    if (errors.length > 0) {
      // Throw ValidationError when validation fails
      next(new ValidationError('Validation failed.', errors));
    } else {
      next();
    }
  };
};

/**
 * Specialized body validation middleware factory.
 * 
 * @param schema - Joi schema or raw validation object for req.body
 */
export const validateBody = (schema: Joi.Schema | object): RequestHandler => {
  return validateRequest({ body: schema });
};

/**
 * Specialized params validation middleware factory.
 * 
 * @param schema - Joi schema or raw validation object for req.params
 */
export const validateParams = (schema: Joi.Schema | object): RequestHandler => {
  return validateRequest({ params: schema });
};

/**
 * Specialized query validation middleware factory.
 * 
 * @param schema - Joi schema or raw validation object for req.query
 */
export const validateQuery = (schema: Joi.Schema | object): RequestHandler => {
  return validateRequest({ query: schema });
};
