import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation middleware.
 * @param schema  Zod schema to validate against
 * @param source  'body' (default) | 'query' — which part of the request to validate
 *
 * On success the parsed/coerced data is written back to req.body or req.query
 * so downstream handlers always receive typed, sanitised values.
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const input = source === 'query' ? req.query : req.body;
    const result = schema.safeParse(input);
    if (!result.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: result.error.flatten(),
      });
      return;
    }
    if (source === 'query') {
      // req.query is read-only — mutate in place so coerced values are available
      Object.assign(req.query, result.data);
    } else {
      req.body = result.data;
    }
    next();
  };
