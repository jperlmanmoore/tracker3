"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePackage = exports.validatePasswordReset = exports.validateLogin = exports.validateRegistration = void 0;
const joi_1 = __importDefault(require("joi"));
const registrationSchema = joi_1.default.object({
    username: joi_1.default.string().alphanum().min(3).max(30).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    firstName: joi_1.default.string().min(2).max(50).required(),
    lastName: joi_1.default.string().min(2).max(50).required()
});
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required()
});
const passwordResetSchema = joi_1.default.object({
    password: joi_1.default.string().min(6).required()
});
const packageSchema = joi_1.default.object({
    trackingNumber: joi_1.default.string().required(),
    carrier: joi_1.default.string().valid('USPS', 'FedEx').required(),
    customer: joi_1.default.string().required(),
    packageType: joi_1.default.string().valid('LOR', 'demand', 'spol', 'AL', 'other').required(),
    dateSent: joi_1.default.date().required(),
    notes: joi_1.default.string().max(500).allow('')
});
const validateRegistration = (req, res, next) => {
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
exports.validateRegistration = validateRegistration;
const validateLogin = (req, res, next) => {
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
exports.validateLogin = validateLogin;
const validatePasswordReset = (req, res, next) => {
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
exports.validatePasswordReset = validatePasswordReset;
const validatePackage = (req, res, next) => {
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
exports.validatePackage = validatePackage;
//# sourceMappingURL=validation.js.map