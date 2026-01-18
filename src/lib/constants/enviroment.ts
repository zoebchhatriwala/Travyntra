/**
 * Environment variables
 */


// Get the current process environment
const APP_ENV = process.env.NODE_ENV;

// Define environment constants
export const IS_DEVELOPMENT = APP_ENV === 'development';

// Define test environment
export const IS_TEST = APP_ENV === 'test';

// Define production environment
export const IS_PRODUCTION = APP_ENV === 'production';

/// Stage Environments

// Define stage environment
const STAGE = process.env.STAGE;

// Define staging environment
export const IS_STAGING = IS_PRODUCTION && STAGE === 'staging';

// Define QA environment
export const IS_QA = IS_PRODUCTION && STAGE === 'qa';
