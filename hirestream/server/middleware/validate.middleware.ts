import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated; // Replace with cleaned/validated data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: "Validation Error",
            details: validationError.details,
          },
        });
      }
      next(error);
    }
  };
};
