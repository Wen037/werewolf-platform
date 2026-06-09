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
      // Express 5: req.query is a read-only computed getter — override it on this
      // specific request instance with a plain data property so coerced Zod values
      // (numbers, booleans, defaults) are visible to downstream route handlers.
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req.body = result.data;
    }
    next();
  };
