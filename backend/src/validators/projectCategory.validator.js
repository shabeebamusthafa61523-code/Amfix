import { body } from 'express-validator';

export const createProjectCategoryValidator = [
  body('name')
    .exists({ values: 'falsy' })
    .withMessage('Category name is required')
    .trim()
    .notEmpty()
    .withMessage('Category name is required'),
  body('departmentId')
    .exists({ values: 'falsy' })
    .withMessage('Please select a department first.')
    .isMongoId()
    .withMessage('Invalid Department ID')
];
