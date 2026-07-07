import { Router } from 'express';
import { registerAuthDoctorRoutes } from './doctor.js';
import { registerAuthGoogleRoutes } from './google.js';
import { registerAuthHealthRoutes } from './health.js';
import { registerAuthOtpRoutes } from './otp.js';
import { registerAuthPatientRoutes } from './patient.js';
import { registerAuthProfileRoutes } from './profile.js';
import { registerPatientAddressRoutes } from '../patient-addresses.js';
import { registerAuthStaffRoutes } from './staff.js';

export const router = Router();

registerAuthHealthRoutes(router);
registerAuthOtpRoutes(router);
registerAuthDoctorRoutes(router);
registerAuthStaffRoutes(router);
registerAuthGoogleRoutes(router);
registerAuthPatientRoutes(router);
registerAuthProfileRoutes(router);
registerPatientAddressRoutes(router);
