// Test setup for Angular 21 with zoneless change detection and property-based testing
import { getTestBed } from '@angular/core/testing';
import {
    BrowserTestingModule,
    platformBrowserTesting
} from '@angular/platform-browser/testing';

// Initialize the Angular testing environment for zoneless
getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting()
);

// Configure fast-check for property-based testing
import * as fc from 'fast-check';

// Global configuration for property-based tests
export const PBT_CONFIG = {
    numRuns: 100, // Minimum 100 iterations as specified in design
    verbose: true,
    seed: Date.now() // Use current timestamp as seed for reproducibility
};

// Export fast-check for use in tests
export { fc };