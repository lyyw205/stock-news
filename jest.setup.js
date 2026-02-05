import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder (needed for Resend)
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;
