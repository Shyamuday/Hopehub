import 'dotenv/config';
import {
  PrismaClient,
  PrescriptionOptionType,
  Role,
  ConsultationStatus,
  PrescriptionStatus,
  DoseEventStatus,
  SupportNoteCategory,
  ProductEventCategory,
  PaymentStatus,
  StoreKind,
  StockStatus,
  HomeopathicDoctorType
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { seedRepertory } from './seeds/repertory-seed.js';
import { createPurchaseOrder } from '../src/services/purchase-orders.js';
import { createStockTransfer } from '../src/services/stock-transfers.js';
import { createMedicineDelivery } from '../src/services/medicine-deliveries.js';
import { createLabReferral, publishDemoLabResults } from '../src/services/lab-referrals.js';
import {
  DEV_DEMO_ACCOUNTS,
  DEV_DEMO_PASSWORD,
  DEV_DEMO_OTP,
  DEV_PATIENT_MOBILE,
  DEV_SEED_IDS
} from '../src/dev/demo-manifest.js';
import { syncSystemMethodOptions } from '../src/services/sync-system-method-options.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

async function seedStoreStock(
  storeId: string,
  medicineId: string,
  batchNumber: string,
  qty: number,
  purchasePricePerUnit: number,
  sellingPricePerUnit: number
) {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);

  let stock = await prisma.medicineStock.findUnique({
    where: { medicineId_storeId: { medicineId, storeId } }
  });

  if (!stock) {
    stock = await prisma.medicineStock.create({
      data: {
        medicineId,
        storeId,
        currentQty: 0,
        status: StockStatus.OUT_OF_STOCK
      }
    });
  }

  const existingBatch = await prisma.stockBatch.findFirst({
    where: { stockId: stock.id, batchNumber }
  });
  if (existingBatch) return;

  await prisma.stockBatch.create({
    data: {
      stockId: stock.id,
      batchNumber,
      expiryDate,
      purchasePricePerUnit,
      sellingPricePerUnit,
      qty
    }
  });

  const medicine = await prisma.storeMedicine.findUnique({ where: { id: medicineId } });
  const newQty = stock.currentQty + qty;
  const minLevel = medicine?.minStockLevel ?? 10;
  const status =
    newQty <= 0
      ? StockStatus.OUT_OF_STOCK
      : newQty <= minLevel
        ? StockStatus.LOW_STOCK
        : StockStatus.ACTIVE;

  await prisma.medicineStock.update({
    where: { id: stock.id },
    data: { currentQty: newQty, status }
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_DEMO_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.admin.email },
    update: { isActive: true },
    create: {
      name: DEV_DEMO_ACCOUNTS.admin.name,
      email: DEV_DEMO_ACCOUNTS.admin.email,
      passwordHash,
      role: Role.ADMIN
    }
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.doctor.email },
    update: { isActive: true, mobile: DEV_DEMO_ACCOUNTS.doctor.mobile },
    create: {
      name: DEV_DEMO_ACCOUNTS.doctor.name,
      email: DEV_DEMO_ACCOUNTS.doctor.email,
      mobile: DEV_DEMO_ACCOUNTS.doctor.mobile,
      passwordHash,
      role: Role.DOCTOR,
      isActive: true
    }
  });

  await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {
      specialty: 'Homeopathy',
      registrationNo: DEV_DEMO_ACCOUNTS.doctor.registrationNo,
      doctorType: HomeopathicDoctorType.CHIEF_CONSULTANT,
      designation: 'Homeopathic Doctor (Chief Consultant)',
      department: 'Homeopathy',
      joiningDate: new Date('2024-01-15'),
      employeeId: 'DOC-001',
      employeeStatus: 'ACTIVE',
      workShift: 'FULL_DAY',
      shiftStart: '09:00',
      shiftEnd: '17:00',
      weeklyOffDays: ['Sunday'],
      salaryPerMonth: 8000000,
      consultationFee: 50000
    },
    create: {
      userId: doctorUser.id,
      specialty: 'Homeopathy',
      registrationNo: DEV_DEMO_ACCOUNTS.doctor.registrationNo,
      doctorType: HomeopathicDoctorType.CHIEF_CONSULTANT,
      designation: 'Homeopathic Doctor (Chief Consultant)',
      department: 'Homeopathy',
      joiningDate: new Date('2024-01-15'),
      employeeId: 'DOC-001',
      employeeStatus: 'ACTIVE',
      workShift: 'FULL_DAY',
      shiftStart: '09:00',
      shiftEnd: '17:00',
      weeklyOffDays: ['Sunday'],
      salaryPerMonth: 8000000,
      consultationFee: 50000
    }
  });

  const hrUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.hr.email },
    update: { isActive: true, passwordHash, role: Role.HR },
    create: {
      name: DEV_DEMO_ACCOUNTS.hr.name,
      email: DEV_DEMO_ACCOUNTS.hr.email,
      passwordHash,
      role: Role.HR,
      isActive: true
    }
  });

  await prisma.hrProfile.upsert({
    where: { userId: hrUser.id },
    update: { employeeId: DEV_DEMO_ACCOUNTS.hr.employeeId },
    create: {
      userId: hrUser.id,
      employeeId: DEV_DEMO_ACCOUNTS.hr.employeeId,
      designation: 'HR Manager',
      department: 'Human Resources'
    }
  });

  await prisma.staffProfile.upsert({
    where: { userId: admin.id },
    update: { isSuperAdmin: true, permissionCodes: [] },
    create: { userId: admin.id, isSuperAdmin: true, permissionCodes: [] }
  });

  await prisma.staffProfile.upsert({
    where: { userId: hrUser.id },
    update: {
      isSuperAdmin: false,
      permissionCodes: [
        'admin.staff.read',
        'admin.staff.write',
        'admin.doctors.read',
        'admin.doctors.write',
        'ops.hr.portal'
      ]
    },
    create: {
      userId: hrUser.id,
      isSuperAdmin: false,
      permissionCodes: [
        'admin.staff.read',
        'admin.staff.write',
        'admin.doctors.read',
        'admin.doctors.write',
        'ops.hr.portal'
      ]
    }
  });

  const ranchiStore = await prisma.store.upsert({
    where: { code: DEV_DEMO_ACCOUNTS.store.code },
    update: { kind: StoreKind.BRANCH },
    create: {
      name: DEV_DEMO_ACCOUNTS.store.name,
      code: DEV_DEMO_ACCOUNTS.store.code,
      address: DEV_DEMO_ACCOUNTS.store.address,
      kind: StoreKind.BRANCH
    }
  });

  const warehouseStore = await prisma.store.upsert({
    where: { code: DEV_DEMO_ACCOUNTS.warehouseStore.code },
    update: {
      name: DEV_DEMO_ACCOUNTS.warehouseStore.name,
      address: DEV_DEMO_ACCOUNTS.warehouseStore.address,
      kind: StoreKind.WAREHOUSE,
      isActive: true
    },
    create: {
      name: DEV_DEMO_ACCOUNTS.warehouseStore.name,
      code: DEV_DEMO_ACCOUNTS.warehouseStore.code,
      address: DEV_DEMO_ACCOUNTS.warehouseStore.address,
      kind: StoreKind.WAREHOUSE
    }
  });

  await prisma.doctor.update({
    where: { userId: doctorUser.id },
    data: { clinicStoreId: ranchiStore.id }
  });

  await prisma.hrStoreAccess.upsert({
    where: { hrUserId_storeId: { hrUserId: hrUser.id, storeId: ranchiStore.id } },
    update: {},
    create: {
      hrUserId: hrUser.id,
      storeId: ranchiStore.id,
      grantedById: admin.id
    }
  });

  const receptionistUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.receptionist.email },
    update: { isActive: true, passwordHash, role: Role.RECEPTIONIST },
    create: {
      name: DEV_DEMO_ACCOUNTS.receptionist.name,
      email: DEV_DEMO_ACCOUNTS.receptionist.email,
      passwordHash,
      role: Role.RECEPTIONIST,
      isActive: true
    }
  });

  await prisma.receptionistProfile.upsert({
    where: { userId: receptionistUser.id },
    update: { storeId: ranchiStore.id, employeeId: DEV_DEMO_ACCOUNTS.receptionist.employeeId },
    create: {
      userId: receptionistUser.id,
      storeId: ranchiStore.id,
      employeeId: DEV_DEMO_ACCOUNTS.receptionist.employeeId,
      designation: 'Receptionist'
    }
  });

  const clinicManagerUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.clinicManager.email },
    update: { isActive: true, passwordHash, role: Role.CLINIC_MANAGER },
    create: {
      name: DEV_DEMO_ACCOUNTS.clinicManager.name,
      email: DEV_DEMO_ACCOUNTS.clinicManager.email,
      passwordHash,
      role: Role.CLINIC_MANAGER,
      isActive: true
    }
  });

  await prisma.clinicManagerProfile.upsert({
    where: { userId: clinicManagerUser.id },
    update: { storeId: ranchiStore.id, employeeId: DEV_DEMO_ACCOUNTS.clinicManager.employeeId },
    create: {
      userId: clinicManagerUser.id,
      storeId: ranchiStore.id,
      employeeId: DEV_DEMO_ACCOUNTS.clinicManager.employeeId,
      designation: 'Clinic Manager'
    }
  });

  const accountantUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.accountant.email },
    update: { isActive: true, passwordHash, role: Role.ACCOUNTANT },
    create: {
      name: DEV_DEMO_ACCOUNTS.accountant.name,
      email: DEV_DEMO_ACCOUNTS.accountant.email,
      passwordHash,
      role: Role.ACCOUNTANT,
      isActive: true
    }
  });

  await prisma.accountantProfile.upsert({
    where: { userId: accountantUser.id },
    update: { employeeId: DEV_DEMO_ACCOUNTS.accountant.employeeId },
    create: {
      userId: accountantUser.id,
      employeeId: DEV_DEMO_ACCOUNTS.accountant.employeeId,
      designation: 'Accountant'
    }
  });

  const supplierEntity = await prisma.supplier.upsert({
    where: { code: DEV_DEMO_ACCOUNTS.supplier.code },
    update: {
      name: DEV_DEMO_ACCOUNTS.supplier.name,
      email: DEV_DEMO_ACCOUNTS.supplier.email,
      isActive: true
    },
    create: {
      code: DEV_DEMO_ACCOUNTS.supplier.code,
      name: DEV_DEMO_ACCOUNTS.supplier.name,
      email: DEV_DEMO_ACCOUNTS.supplier.email,
      address: 'Kolkata, West Bengal',
      gstin: '19AABCV1234F1Z5'
    }
  });

  const supplierUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.supplier.email },
    update: { isActive: true, passwordHash, role: Role.SUPPLIER },
    create: {
      name: DEV_DEMO_ACCOUNTS.supplier.name,
      email: DEV_DEMO_ACCOUNTS.supplier.email,
      passwordHash,
      role: Role.SUPPLIER,
      isActive: true
    }
  });

  await prisma.supplierProfile.upsert({
    where: { userId: supplierUser.id },
    update: { supplierId: supplierEntity.id },
    create: { userId: supplierUser.id, supplierId: supplierEntity.id }
  });

  const warehouseUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.warehouse.email },
    update: { isActive: true, passwordHash, role: Role.WAREHOUSE_MANAGER },
    create: {
      name: DEV_DEMO_ACCOUNTS.warehouse.name,
      email: DEV_DEMO_ACCOUNTS.warehouse.email,
      passwordHash,
      role: Role.WAREHOUSE_MANAGER,
      isActive: true
    }
  });

  await prisma.warehouseManagerProfile.upsert({
    where: { userId: warehouseUser.id },
    update: { warehouseId: warehouseStore.id, employeeId: DEV_DEMO_ACCOUNTS.warehouse.employeeId },
    create: {
      userId: warehouseUser.id,
      warehouseId: warehouseStore.id,
      employeeId: DEV_DEMO_ACCOUNTS.warehouse.employeeId,
      designation: 'Warehouse Manager'
    }
  });

  const deliveryUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.delivery.email },
    update: { isActive: true, passwordHash, role: Role.DELIVERY_EXECUTIVE },
    create: {
      name: DEV_DEMO_ACCOUNTS.delivery.name,
      email: DEV_DEMO_ACCOUNTS.delivery.email,
      passwordHash,
      role: Role.DELIVERY_EXECUTIVE,
      isActive: true
    }
  });

  await prisma.deliveryExecutiveProfile.upsert({
    where: { userId: deliveryUser.id },
    update: { storeId: ranchiStore.id, employeeId: DEV_DEMO_ACCOUNTS.delivery.employeeId },
    create: {
      userId: deliveryUser.id,
      storeId: ranchiStore.id,
      employeeId: DEV_DEMO_ACCOUNTS.delivery.employeeId,
      designation: 'Delivery Executive'
    }
  });

  const diagnosticEntity = await prisma.diagnosticCenter.upsert({
    where: { code: DEV_DEMO_ACCOUNTS.diagnostic.code },
    update: {
      name: DEV_DEMO_ACCOUNTS.diagnostic.name,
      email: DEV_DEMO_ACCOUNTS.diagnostic.email,
      isActive: true
    },
    create: {
      code: DEV_DEMO_ACCOUNTS.diagnostic.code,
      name: DEV_DEMO_ACCOUNTS.diagnostic.name,
      email: DEV_DEMO_ACCOUNTS.diagnostic.email,
      address: 'Ranchi, Jharkhand',
      phone: '+91 9000000099'
    }
  });

  const diagnosticUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.diagnostic.email },
    update: { isActive: true, passwordHash, role: Role.DIAGNOSTIC_PARTNER },
    create: {
      name: DEV_DEMO_ACCOUNTS.diagnostic.name,
      email: DEV_DEMO_ACCOUNTS.diagnostic.email,
      passwordHash,
      role: Role.DIAGNOSTIC_PARTNER,
      isActive: true
    }
  });

  await prisma.diagnosticCenterProfile.upsert({
    where: { userId: diagnosticUser.id },
    update: { diagnosticCenterId: diagnosticEntity.id },
    create: { userId: diagnosticUser.id, diagnosticCenterId: diagnosticEntity.id }
  });

  const branchOwnerUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.branchOwner.email },
    update: { isActive: true, passwordHash, role: Role.BRANCH_OWNER },
    create: {
      name: DEV_DEMO_ACCOUNTS.branchOwner.name,
      email: DEV_DEMO_ACCOUNTS.branchOwner.email,
      passwordHash,
      role: Role.BRANCH_OWNER,
      isActive: true
    }
  });

  await prisma.branchOwnerProfile.upsert({
    where: { userId: branchOwnerUser.id },
    update: { storeId: ranchiStore.id, employeeId: DEV_DEMO_ACCOUNTS.branchOwner.employeeId },
    create: {
      userId: branchOwnerUser.id,
      storeId: ranchiStore.id,
      employeeId: DEV_DEMO_ACCOUNTS.branchOwner.employeeId,
      designation: 'Branch Owner'
    }
  });

  const coordinatorUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.coordinator.email },
    update: { isActive: true, passwordHash, role: Role.PATIENT_COORDINATOR },
    create: {
      name: DEV_DEMO_ACCOUNTS.coordinator.name,
      email: DEV_DEMO_ACCOUNTS.coordinator.email,
      passwordHash,
      role: Role.PATIENT_COORDINATOR,
      isActive: true
    }
  });

  await prisma.patientCoordinatorProfile.upsert({
    where: { userId: coordinatorUser.id },
    update: { storeId: ranchiStore.id, employeeId: DEV_DEMO_ACCOUNTS.coordinator.employeeId },
    create: {
      userId: coordinatorUser.id,
      storeId: ranchiStore.id,
      employeeId: DEV_DEMO_ACCOUNTS.coordinator.employeeId,
      designation: 'Patient Coordinator'
    }
  });

  const callCenterUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.callCenter.email },
    update: { isActive: true, passwordHash, role: Role.CALL_CENTER },
    create: {
      name: DEV_DEMO_ACCOUNTS.callCenter.name,
      email: DEV_DEMO_ACCOUNTS.callCenter.email,
      passwordHash,
      role: Role.CALL_CENTER,
      isActive: true
    }
  });

  await prisma.callCenterProfile.upsert({
    where: { userId: callCenterUser.id },
    update: { employeeId: DEV_DEMO_ACCOUNTS.callCenter.employeeId },
    create: {
      userId: callCenterUser.id,
      employeeId: DEV_DEMO_ACCOUNTS.callCenter.employeeId,
      designation: 'Call Center Agent'
    }
  });

  const marketingUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.marketing.email },
    update: { isActive: true, passwordHash, role: Role.MARKETING },
    create: {
      name: DEV_DEMO_ACCOUNTS.marketing.name,
      email: DEV_DEMO_ACCOUNTS.marketing.email,
      passwordHash,
      role: Role.MARKETING,
      isActive: true
    }
  });

  await prisma.marketingProfile.upsert({
    where: { userId: marketingUser.id },
    update: { employeeId: DEV_DEMO_ACCOUNTS.marketing.employeeId },
    create: {
      userId: marketingUser.id,
      employeeId: DEV_DEMO_ACCOUNTS.marketing.employeeId,
      designation: 'Marketing Manager'
    }
  });

  const corporateAccount = await prisma.corporateAccount.upsert({
    where: { code: DEV_DEMO_ACCOUNTS.corporate.code },
    update: {
      name: DEV_DEMO_ACCOUNTS.corporate.name,
      contactEmail: DEV_DEMO_ACCOUNTS.corporate.email,
      isActive: true
    },
    create: {
      code: DEV_DEMO_ACCOUNTS.corporate.code,
      name: DEV_DEMO_ACCOUNTS.corporate.name,
      contactEmail: DEV_DEMO_ACCOUNTS.corporate.email
    }
  });

  const corporateUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.corporate.email },
    update: { isActive: true, passwordHash, role: Role.CORPORATE_WELLNESS },
    create: {
      name: DEV_DEMO_ACCOUNTS.corporate.name,
      email: DEV_DEMO_ACCOUNTS.corporate.email,
      passwordHash,
      role: Role.CORPORATE_WELLNESS,
      isActive: true
    }
  });

  await prisma.corporateWellnessProfile.upsert({
    where: { userId: corporateUser.id },
    update: { corporateId: corporateAccount.id },
    create: { userId: corporateUser.id, corporateId: corporateAccount.id }
  });

  const insuranceUser = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.insurance.email },
    update: { isActive: true, passwordHash, role: Role.INSURANCE_PARTNER },
    create: {
      name: DEV_DEMO_ACCOUNTS.insurance.name,
      email: DEV_DEMO_ACCOUNTS.insurance.email,
      passwordHash,
      role: Role.INSURANCE_PARTNER,
      isActive: true
    }
  });

  const insuranceProfile = await prisma.insurancePartnerProfile.upsert({
    where: { userId: insuranceUser.id },
    update: {
      companyName: DEV_DEMO_ACCOUNTS.insurance.companyName,
      companyCode: DEV_DEMO_ACCOUNTS.insurance.companyCode
    },
    create: {
      userId: insuranceUser.id,
      companyName: DEV_DEMO_ACCOUNTS.insurance.companyName,
      companyCode: DEV_DEMO_ACCOUNTS.insurance.companyCode
    }
  });

  const demoMedicineArnica = await prisma.storeMedicine.upsert({
    where: { id: 'seed-store-med-arnica-30' },
    update: { isActive: true },
    create: {
      id: 'seed-store-med-arnica-30',
      name: 'Arnica Montana',
      potency: '30C',
      manufacturer: 'HopeHub Pharma',
      minStockLevel: 20
    }
  });

  const demoMedicineSulphur = await prisma.storeMedicine.upsert({
    where: { id: 'seed-store-med-sulphur-200' },
    update: { isActive: true },
    create: {
      id: 'seed-store-med-sulphur-200',
      name: 'Sulphur',
      potency: '200C',
      manufacturer: 'HopeHub Pharma',
      minStockLevel: 15
    }
  });

  const existingDemoPo = await prisma.purchaseOrder.findFirst({
    where: { storeId: ranchiStore.id, supplierId: supplierEntity.id }
  });
  if (!existingDemoPo) {
    await createPurchaseOrder({
      supplierId: supplierEntity.id,
      storeId: ranchiStore.id,
      notes: 'Demo replenishment for Ranchi store',
      createdById: admin.id,
      send: true,
      lines: [
        { medicineId: demoMedicineArnica.id, qtyOrdered: 100, unitPriceInPaise: 4500 },
        { medicineId: demoMedicineSulphur.id, qtyOrdered: 60, unitPriceInPaise: 5200 }
      ]
    });
  }

  await seedStoreStock(warehouseStore.id, demoMedicineArnica.id, 'WH-ARN-30-001', 500, 4200, 5500);
  await seedStoreStock(
    warehouseStore.id,
    demoMedicineSulphur.id,
    'WH-SUL-200-001',
    300,
    4800,
    6200
  );

  const existingDemoTransfer = await prisma.stockTransfer.findFirst({
    where: { fromStoreId: warehouseStore.id, toStoreId: ranchiStore.id }
  });
  if (!existingDemoTransfer) {
    await createStockTransfer({
      fromStoreId: warehouseStore.id,
      toStoreId: ranchiStore.id,
      notes: 'Demo replenishment transfer to Ranchi branch',
      createdById: admin.id,
      lines: [
        { medicineId: demoMedicineArnica.id, qtyRequested: 40 },
        { medicineId: demoMedicineSulphur.id, qtyRequested: 25 }
      ]
    });
  }

  const managerPinHash = await bcrypt.hash(DEV_DEMO_PASSWORD, 10);
  await prisma.storeStaff.upsert({
    where: { staffCode: DEV_DEMO_ACCOUNTS.storeManager.staffCode },
    update: {
      email: DEV_DEMO_ACCOUNTS.storeManager.email,
      pinHash: managerPinHash,
      role: 'MANAGER',
      isActive: true
    },
    create: {
      name: DEV_DEMO_ACCOUNTS.storeManager.name,
      staffCode: DEV_DEMO_ACCOUNTS.storeManager.staffCode,
      email: DEV_DEMO_ACCOUNTS.storeManager.email,
      pinHash: managerPinHash,
      role: 'MANAGER',
      storeId: ranchiStore.id,
      designation: 'Store Manager',
      department: 'Operations',
      joiningDate: new Date()
    }
  });

  await prisma.storeStaff.upsert({
    where: { staffCode: DEV_DEMO_ACCOUNTS.storeStaff.staffCode },
    update: {
      email: DEV_DEMO_ACCOUNTS.storeStaff.email,
      pinHash: managerPinHash,
      isActive: true
    },
    create: {
      name: DEV_DEMO_ACCOUNTS.storeStaff.name,
      staffCode: DEV_DEMO_ACCOUNTS.storeStaff.staffCode,
      email: DEV_DEMO_ACCOUNTS.storeStaff.email,
      pinHash: managerPinHash,
      role: 'STAFF',
      storeId: ranchiStore.id,
      designation: 'Dispensary Staff'
    }
  });

  const patientOne = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.patientRahul.email },
    update: {
      patientCode: DEV_DEMO_ACCOUNTS.patientRahul.patientCode,
      homeClinicStoreId: ranchiStore.id,
      mobile: DEV_PATIENT_MOBILE,
      passwordHash,
      allergies: 'Sulfa drugs (rash)',
      currentMedications: 'None',
      chronicConditions: 'Seasonal hair fall, mild dandruff'
    },
    create: {
      name: DEV_DEMO_ACCOUNTS.patientRahul.name,
      email: DEV_DEMO_ACCOUNTS.patientRahul.email,
      mobile: DEV_PATIENT_MOBILE,
      passwordHash,
      role: Role.PATIENT,
      patientCode: DEV_DEMO_ACCOUNTS.patientRahul.patientCode,
      homeClinicStoreId: ranchiStore.id,
      allergies: 'Sulfa drugs (rash)',
      currentMedications: 'None',
      chronicConditions: 'Seasonal hair fall, mild dandruff'
    }
  });

  const patientTwo = await prisma.user.upsert({
    where: { email: DEV_DEMO_ACCOUNTS.patientPriya.email },
    update: {
      patientCode: DEV_DEMO_ACCOUNTS.patientPriya.patientCode,
      homeClinicStoreId: ranchiStore.id,
      mobile: DEV_PATIENT_MOBILE,
      passwordHash
    },
    create: {
      name: DEV_DEMO_ACCOUNTS.patientPriya.name,
      email: DEV_DEMO_ACCOUNTS.patientPriya.email,
      mobile: DEV_PATIENT_MOBILE,
      passwordHash,
      role: Role.PATIENT,
      patientCode: DEV_DEMO_ACCOUNTS.patientPriya.patientCode,
      homeClinicStoreId: ranchiStore.id
    }
  });

  await prisma.corporateEnrollment.upsert({
    where: {
      corporateId_patientId: { corporateId: corporateAccount.id, patientId: patientOne.id }
    },
    update: {},
    create: { corporateId: corporateAccount.id, patientId: patientOne.id }
  });

  await prisma.corporateEnrollment.upsert({
    where: {
      corporateId_patientId: { corporateId: corporateAccount.id, patientId: patientTwo.id }
    },
    update: {},
    create: { corporateId: corporateAccount.id, patientId: patientTwo.id }
  });

  await prisma.insuranceClaim.upsert({
    where: { claimNumber: 'CLM-DEMO-RAHUL' },
    update: { status: 'SUBMITTED' },
    create: {
      claimNumber: 'CLM-DEMO-RAHUL',
      partnerId: insuranceProfile.id,
      patientId: patientOne.id,
      claimAmountInPaise: 250000,
      description: 'Demo consultation reimbursement — Rahul Verma',
      status: 'SUBMITTED'
    }
  });

  await prisma.disease.upsert({
    where: { name: 'Hair Fall Treatment' },
    update: {},
    create: {
      name: 'Hair Fall Treatment',
      description:
        'First MVP niche focused on hair fall diagnosis, prescription, and follow-up guidance.',
      feeInPaise: 49900,
      intakeQuestions: [
        'How long have you had hair fall?',
        'Do you have dandruff, itching, or scalp infection?',
        'Any recent fever, stress, weight loss, or medication?',
        'Do you have family history of baldness?',
        'Upload photos during chat if the doctor asks.'
      ]
    }
  });

  await prisma.disease.upsert({
    where: { name: 'Skin Issues' },
    update: {},
    create: {
      name: 'Skin Issues',
      description: 'Secondary category for acne, rashes, pigmentation, and allergy complaints.',
      feeInPaise: 59900,
      intakeQuestions: [
        'What skin issue are you facing?',
        'How long has it been present?',
        'Is there itching, pain, discharge, or fever?',
        'Have you used any medicine or cream already?'
      ]
    }
  });

  const hairFall = await prisma.disease.findUnique({ where: { name: 'Hair Fall Treatment' } });
  if (hairFall) {
    const consultation = await prisma.consultation.upsert({
      where: { id: DEV_SEED_IDS.consultationRahul },
      update: {},
      create: {
        id: DEV_SEED_IDS.consultationRahul,
        patientId: patientOne.id,
        assignedDoctorId: doctorUser.id,
        diseaseId: hairFall.id,
        clinicStoreId: ranchiStore.id,
        status: ConsultationStatus.IN_PROGRESS,
        intakeAnswers: []
      }
    });

    await prisma.payment.upsert({
      where: { consultationId: consultation.id },
      update: { status: PaymentStatus.PAID, amountInPaise: hairFall.feeInPaise },
      create: {
        consultationId: consultation.id,
        amountInPaise: hairFall.feeInPaise,
        billingPlanCode: 'ONE_TIME',
        status: PaymentStatus.PAID,
        providerPaymentId: 'demo_seed_payment_rahul',
        lineItems: {
          purchaseType: 'ONE_TIME',
          diseaseName: hairFall.name,
          diseaseFeeInPaise: hairFall.feeInPaise,
          planCode: 'ONE_TIME',
          planName: 'One-time consultation',
          consultationsLimit: 1
        }
      }
    });

    const existingRx = await prisma.prescription.findFirst({
      where: { consultationId: consultation.id, isLatest: true }
    });

    if (!existingRx) {
      const prescription = await prisma.prescription.create({
        data: {
          consultationId: consultation.id,
          uploadedById: doctorUser.id,
          patientId: patientOne.id,
          version: 1,
          isLatest: true,
          diagnosis: 'Hair Fall',
          notes: 'Demo prescription for store scan testing.',
          status: PrescriptionStatus.PUBLISHED,
          items: {
            create: [
              {
                medicineName: 'Arnica Montana',
                strength: '30C',
                dose: '4 pills',
                frequency: 'Twice daily',
                duration: '7 days',
                durationDays: 7,
                intakeTimes: ['09:00', '21:00'],
                sortOrder: 0
              }
            ]
          }
        },
        include: { items: true }
      });

      const item = prescription.items[0];
      const today = new Date();
      const morning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
      const evening = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 21, 0, 0);

      await prisma.medicineDoseEvent.createMany({
        data: [
          {
            patientId: patientOne.id,
            prescriptionId: prescription.id,
            prescriptionItemId: item.id,
            scheduledFor: morning,
            status: DoseEventStatus.PENDING
          },
          {
            patientId: patientOne.id,
            prescriptionId: prescription.id,
            prescriptionItemId: item.id,
            scheduledFor: evening,
            status: DoseEventStatus.PENDING
          }
        ],
        skipDuplicates: true
      });

      const yesterdayMorning = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1,
        9,
        0,
        0
      );
      await prisma.medicineDoseEvent.upsert({
        where: {
          prescriptionItemId_scheduledFor: {
            prescriptionItemId: item.id,
            scheduledFor: yesterdayMorning
          }
        },
        update: { status: DoseEventStatus.MISSED, note: null },
        create: {
          patientId: patientOne.id,
          prescriptionId: prescription.id,
          prescriptionItemId: item.id,
          scheduledFor: yesterdayMorning,
          status: DoseEventStatus.MISSED
        }
      });

      for (let dayOffset = 2; dayOffset <= 8; dayOffset++) {
        const base = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
        const slots: Array<{ hour: number; status: DoseEventStatus; note?: string }> = [
          {
            hour: 9,
            status: dayOffset % 2 === 0 ? DoseEventStatus.MISSED : DoseEventStatus.SKIPPED
          },
          { hour: 21, status: DoseEventStatus.MISSED }
        ];
        if (dayOffset === 7) {
          slots[0] = { hour: 9, status: DoseEventStatus.TAKEN };
          slots[1] = { hour: 21, status: DoseEventStatus.TAKEN };
        }
        for (const slot of slots) {
          const scheduledFor = new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate(),
            slot.hour,
            0,
            0
          );
          await prisma.medicineDoseEvent.upsert({
            where: {
              prescriptionItemId_scheduledFor: {
                prescriptionItemId: item.id,
                scheduledFor
              }
            },
            update: { status: slot.status, note: slot.note ?? null },
            create: {
              patientId: patientOne.id,
              prescriptionId: prescription.id,
              prescriptionItemId: item.id,
              scheduledFor,
              status: slot.status,
              note: slot.note ?? null
            }
          });
        }
      }
    }

    const followUpDue = new Date();
    followUpDue.setDate(followUpDue.getDate() - 1);
    followUpDue.setHours(12, 0, 0, 0);

    await prisma.prescription.updateMany({
      where: { consultationId: consultation.id, status: PrescriptionStatus.PUBLISHED },
      data: { followUpDate: followUpDue }
    });

    await prisma.consultation.upsert({
      where: { id: DEV_SEED_IDS.consultationPriya },
      update: {},
      create: {
        id: DEV_SEED_IDS.consultationPriya,
        patientId: patientTwo.id,
        assignedDoctorId: doctorUser.id,
        diseaseId: hairFall.id,
        clinicStoreId: ranchiStore.id,
        status: ConsultationStatus.ASSIGNED,
        intakeAnswers: []
      }
    });
  }

  await syncSystemMethodOptions(prisma);

  const defaultDiagnoses = [
    'Hair Fall',
    'Dandruff',
    'Alopecia',
    'Acne',
    'Eczema',
    'Psoriasis',
    'Migraine',
    'Sinusitis',
    'Hypertension',
    'Diabetes Mellitus',
    'Piles',
    'Chronic Gastritis'
  ];

  const classicalMethod = await prisma.prescriptionOption.findFirst({
    where: { type: PrescriptionOptionType.METHOD, normalizedLabel: 'classical homeopathy' }
  });
  if (classicalMethod) {
    await prisma.doctor.update({
      where: { userId: doctorUser.id },
      data: { defaultMethodOptionId: classicalMethod.id }
    });
  }

  for (const label of defaultDiagnoses) {
    await prisma.prescriptionOption.upsert({
      where: {
        type_normalizedLabel: {
          type: PrescriptionOptionType.DIAGNOSED_DISEASE,
          normalizedLabel: label.toLowerCase()
        }
      },
      update: {},
      create: {
        type: PrescriptionOptionType.DIAGNOSED_DISEASE,
        label,
        normalizedLabel: label.toLowerCase(),
        isSystem: true
      }
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        actorRole: Role.ADMIN,
        action: 'doctor.approve',
        targetType: 'doctor',
        targetId: doctorUser.id,
        summary: 'Doctor approved by admin (seed demo).'
      },
      {
        actorId: admin.id,
        actorRole: Role.ADMIN,
        action: 'doctor.update',
        targetType: 'doctor',
        targetId: doctorUser.id,
        summary: 'Doctor profile updated by admin (seed demo).',
        metadata: {
          before: { specialty: 'Dermatology' },
          after: { specialty: 'Dermatology', clinicStoreId: ranchiStore.id }
        }
      }
    ],
    skipDuplicates: true
  });

  await prisma.supportCaseNote.upsert({
    where: { id: DEV_SEED_IDS.supportNoteRahul },
    update: {},
    create: {
      id: DEV_SEED_IDS.supportNoteRahul,
      patientId: patientOne.id,
      authorId: admin.id,
      consultationId: DEV_SEED_IDS.consultationRahul,
      category: SupportNoteCategory.ADHERENCE,
      body: 'Demo: patient reported missed evening dose. Confirmed SMS reminders are on; suggested reviewing snooze presets in the patient app.'
    }
  });

  const daysAgo = (n: number) => {
    const date = new Date();
    date.setDate(date.getDate() - n);
    date.setHours(12, 0, 0, 0);
    return date;
  };

  const demoFunnelEvents = [
    {
      id: 'seed-event-login',
      name: 'patient.login',
      actorId: patientOne.id,
      actorRole: Role.PATIENT,
      createdAt: daysAgo(6)
    },
    {
      id: 'seed-event-booked',
      name: 'consultation.booked',
      actorId: patientOne.id,
      actorRole: Role.PATIENT,
      createdAt: daysAgo(6),
      properties: { consultationId: DEV_SEED_IDS.consultationRahul }
    },
    {
      id: 'seed-event-pay-init',
      name: 'payment.initiated',
      actorId: patientOne.id,
      actorRole: Role.PATIENT,
      createdAt: daysAgo(6),
      properties: { consultationId: DEV_SEED_IDS.consultationRahul }
    },
    {
      id: 'seed-event-pay-done',
      name: 'payment.completed',
      actorId: patientOne.id,
      actorRole: Role.PATIENT,
      createdAt: daysAgo(5),
      properties: { consultationId: DEV_SEED_IDS.consultationRahul }
    },
    {
      id: 'seed-event-assigned',
      name: 'consultation.assigned',
      actorId: admin.id,
      actorRole: Role.ADMIN,
      createdAt: daysAgo(5),
      properties: { consultationId: DEV_SEED_IDS.consultationRahul, doctorId: doctorUser.id }
    },
    {
      id: 'seed-event-rx',
      name: 'prescription.published',
      actorId: doctorUser.id,
      actorRole: Role.DOCTOR,
      createdAt: daysAgo(4),
      properties: { consultationId: DEV_SEED_IDS.consultationRahul }
    },
    {
      id: 'seed-event-dose',
      name: 'dose.taken',
      actorId: patientOne.id,
      actorRole: Role.PATIENT,
      createdAt: daysAgo(3),
      properties: { consultationId: DEV_SEED_IDS.consultationRahul }
    },
    {
      id: 'seed-event-worklist',
      name: 'doctor.worklist_viewed',
      actorId: doctorUser.id,
      actorRole: Role.DOCTOR,
      category: ProductEventCategory.ENGAGEMENT,
      createdAt: daysAgo(2),
      properties: { view: 'ALL' }
    }
  ];

  for (const event of demoFunnelEvents) {
    await prisma.productEvent.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        name: event.name,
        category: event.category ?? ProductEventCategory.FUNNEL,
        actorId: event.actorId,
        actorRole: event.actorRole,
        properties: event.properties ?? undefined,
        createdAt: event.createdAt
      }
    });
  }

  await seedRepertory(prisma);

  const existingDemoDelivery = await prisma.medicineDelivery.findFirst({
    where: { storeId: ranchiStore.id, patientId: patientOne.id, status: 'PENDING' }
  });
  if (!existingDemoDelivery) {
    await createMedicineDelivery({
      storeId: ranchiStore.id,
      patientId: patientOne.id,
      deliveryAddress: 'Flat 4B, Harmu Housing Colony, Ranchi, Jharkhand',
      deliveryPhone: DEV_PATIENT_MOBILE,
      notes: 'Demo home medicine delivery for Rahul Verma',
      otp: DEV_DEMO_OTP,
      lines: [
        { medicineId: demoMedicineArnica.id, label: 'Arnica Montana 30C', qty: 2 },
        { medicineId: demoMedicineSulphur.id, label: 'Sulphur 200C', qty: 1 }
      ]
    });
  }

  const existingDemoLabReferral = await prisma.labReferral.findFirst({
    where: {
      storeId: ranchiStore.id,
      patientId: patientOne.id,
      diagnosticCenterId: diagnosticEntity.id
    }
  });
  let demoLabReferralId = existingDemoLabReferral?.id;
  if (!demoLabReferralId) {
    const created = await createLabReferral({
      diagnosticCenterId: diagnosticEntity.id,
      storeId: ranchiStore.id,
      patientId: patientOne.id,
      consultationId: DEV_SEED_IDS.consultationRahul,
      clinicalNotes: 'Rule out thyroid imbalance; baseline CBC for hair fall workup',
      createdById: admin.id,
      lines: [
        { testName: 'Complete Blood Count (CBC)', testCode: 'CBC', specimen: 'Blood' },
        { testName: 'Thyroid Profile (TSH, T3, T4)', testCode: 'THY', specimen: 'Blood' }
      ],
      send: true
    });
    demoLabReferralId = created.id;
  }
  await publishDemoLabResults(demoLabReferralId);

  console.log('── Dev demo seed complete ──');
  console.log(`Shared password/PIN: ${DEV_DEMO_PASSWORD}`);
  console.log(
    `Patient OTP (dev): ${process.env.DEV_OTP || '123456'} · mobile ${DEV_PATIENT_MOBILE}`
  );
  console.log(`Admin: ${DEV_DEMO_ACCOUNTS.admin.email}`);
  console.log(`Doctor: ${DEV_DEMO_ACCOUNTS.doctor.email}`);
  console.log(`HR: ${DEV_DEMO_ACCOUNTS.hr.email}`);
  console.log(
    `Patients: ${DEV_DEMO_ACCOUNTS.patientRahul.patientCode} (Rahul), ${DEV_DEMO_ACCOUNTS.patientPriya.patientCode} (Priya)`
  );
  console.log(`Store manager: ${DEV_DEMO_ACCOUNTS.storeManager.email}`);
  console.log(`Store staff: ${DEV_DEMO_ACCOUNTS.storeStaff.email} / ${DEV_DEMO_PASSWORD}`);
  console.log(`Scan QR: http://localhost:4000/go/p/${DEV_DEMO_ACCOUNTS.patientRahul.patientCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
