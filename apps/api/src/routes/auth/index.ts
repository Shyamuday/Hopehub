import { Router } from 'express';
import { registerAuthDoctorRoutes } from './doctor.js';
import { registerAuthGoogleRoutes } from './google.js';
import { registerAuthHealthRoutes } from './health.js';
import { registerAuthOtpRoutes } from './otp.js';
import { registerAuthPatientRoutes } from './patient.js';
import { registerAuthProfileRoutes } from './profile.js';
import { registerProfileImageRoutes } from './profile-image.js';
import { registerPatientAddressRoutes } from '../patient-addresses.js';
import { registerPatientRewardsRoutes } from '../patient-rewards.js';
import { registerPatientDeliveryRoutes } from '../patient-deliveries.js';
import { registerAuthStaffRoutes } from './staff.js';

export const router = Router();

registerAuthHealthRoutes(router);
registerAuthOtpRoutes(router);
registerAuthDoctorRoutes(router);
registerAuthStaffRoutes(router);
registerAuthGoogleRoutes(router);
registerAuthPatientRoutes(router);
registerAuthProfileRoutes(router);
registerProfileImageRoutes(router);
registerPatientAddressRoutes(router);
registerPatientRewardsRoutes(router);
registerPatientDeliveryRoutes(router);
