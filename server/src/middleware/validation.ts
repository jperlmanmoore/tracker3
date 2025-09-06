import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Validation schemas
const registrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const passwordResetSchema = Joi.object({
  password: Joi.string().min(6).required()
});

const packageSchema = Joi.object({
  trackingNumber: Joi.string().required(),
  carrier: Joi.string().valid('USPS', 'FedEx').required(),
  customer: Joi.string().required(),
  packageType: Joi.string().valid('LOR', 'demand', 'spol', 'AL', 'other').required(),
  dateSent: Joi.date().required(),
  notes: Joi.string().max(500).allow('')
});

// Validation middleware functions
export const validateRegistration = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = registrationSchema.validate(req.body);
  if (error) {
    res.status(400).json({ 
      success: false,
      message: 'Validation error', 
      error: error.details[0]?.message 
    });
    return;
  }
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ 
      success: false,
      message: 'Validation error', 
      error: error.details[0]?.message 
    });
    return;
  }
  next();
};

export const validatePasswordReset = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = passwordResetSchema.validate(req.body);
  if (error) {
    res.status(400).json({ 
      success: false,
      message: 'Validation error', 
      error: error.details[0]?.message 
    });
    return;
  }
  next();
};

export const validatePackage = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = packageSchema.validate(req.body);
  if (error) {
    res.status(400).json({ 
      success: false,
      message: 'Validation error', 
      error: error.details[0]?.message 
    });
    return;
  }
  next();
};
