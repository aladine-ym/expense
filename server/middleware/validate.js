/**
 * Simple request validation middleware using declarative schema definition.
 * @param {{ body?: Record<string, ValidatorRule>, query?: Record<string, ValidatorRule>, params?: Record<string, ValidatorRule> }} schema
 * @returns {import('express').RequestHandler}
 */
export function validateRequest(schema) {
    return (req, _res, next) => {
        try {
            if (schema.params) {
                validateSegment(req.params, schema.params, 'params');
            }
            if (schema.body) {
                validateSegment(req.body, schema.body, 'body');
            }
            if (schema.query) {
                validateSegment(req.query, schema.query, 'query');
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * @typedef {{
 *   type: 'string'|'number'|'boolean'|'object',
 *   required?: boolean,
 *   min?: number,
 *   max?: number,
 *   enum?: any[],
 *   validator?: (value: any) => boolean,
 *   message?: string
 * }} ValidatorRule
 */

const typeCheckers = {
    string: (value) => typeof value === 'string',
    number: (value) => typeof value === 'number' && !Number.isNaN(value),
    boolean: (value) => typeof value === 'boolean',
    object: (value) => value !== null && typeof value === 'object'
};

function validateSegment(source, rules, segmentName) {
    Object.entries(rules).forEach(([key, rule]) => {
        const value = source?.[key];
        const isPresent = value !== undefined && value !== null;

        if (rule.required && !isPresent) {
            throw createValidationError(`${segmentName}.${key} is required`);
        }
        if (!isPresent) {
            return;
        }
        if (!typeCheckers[rule.type]?.(value)) {
            throw createValidationError(rule.message ?? `${segmentName}.${key} must be a ${rule.type}`);
        }
        if (rule.type === 'string') {
            if (rule.min !== undefined && value.length < rule.min) {
                throw createValidationError(`${segmentName}.${key} must be at least ${rule.min} characters`);
            }
            if (rule.max !== undefined && value.length > rule.max) {
                throw createValidationError(`${segmentName}.${key} must be at most ${rule.max} characters`);
            }
        }
        if (rule.type === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                throw createValidationError(`${segmentName}.${key} must be >= ${rule.min}`);
            }
            if (rule.max !== undefined && value > rule.max) {
                throw createValidationError(`${segmentName}.${key} must be <= ${rule.max}`);
            }
        }
        if (rule.enum && !rule.enum.includes(value)) {
            throw createValidationError(`${segmentName}.${key} must be one of ${rule.enum.join(', ')}`);
        }
        if (rule.validator && !rule.validator(value)) {
            throw createValidationError(rule.message ?? `${segmentName}.${key} is invalid`);
        }
    });
}

function createValidationError(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}
