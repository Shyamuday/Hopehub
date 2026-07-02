import { PrismaClient, PrescriptionOptionType, Role, ConsultationStatus, PrescriptionStatus, DoseEventStatus, SupportNoteCategory, ProductEventCategory, PaymentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import {
  DEV_DEMO_ACCOUNTS,
  DEV_DEMO_PASSWORD,
  DEV_PATIENT_MOBILE,
  DEV_SEED_IDS
} from '../src/dev/demo-manifest.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

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
      specialty: DEV_DEMO_ACCOUNTS.doctor.specialty,
      registrationNo: DEV_DEMO_ACCOUNTS.doctor.registrationNo
    },
    create: {
      userId: doctorUser.id,
      specialty: DEV_DEMO_ACCOUNTS.doctor.specialty,
      registrationNo: DEV_DEMO_ACCOUNTS.doctor.registrationNo
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

  const ranchiStore = await prisma.store.upsert({
    where: { code: DEV_DEMO_ACCOUNTS.store.code },
    update: {},
    create: {
      name: DEV_DEMO_ACCOUNTS.store.name,
      code: DEV_DEMO_ACCOUNTS.store.code,
      address: DEV_DEMO_ACCOUNTS.store.address
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
    update: { pinHash: managerPinHash, isActive: true },
    create: {
      name: DEV_DEMO_ACCOUNTS.storeStaff.name,
      staffCode: DEV_DEMO_ACCOUNTS.storeStaff.staffCode,
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

  await prisma.disease.upsert({
    where: { name: 'Hair Fall Treatment' },
    update: {},
    create: {
      name: 'Hair Fall Treatment',
      description: 'First MVP niche focused on hair fall diagnosis, prescription, and follow-up guidance.',
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

      const yesterdayMorning = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 0, 0);
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
          { hour: 9, status: dayOffset % 2 === 0 ? DoseEventStatus.MISSED : DoseEventStatus.SKIPPED },
          { hour: 21, status: DoseEventStatus.MISSED }
        ];
        if (dayOffset === 7) {
          slots[0] = { hour: 9, status: DoseEventStatus.TAKEN };
          slots[1] = { hour: 21, status: DoseEventStatus.TAKEN };
        }
        for (const slot of slots) {
          const scheduledFor = new Date(base.getFullYear(), base.getMonth(), base.getDate(), slot.hour, 0, 0);
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

  const defaultMethods = [
    'Classical Homeopathy',
    'Clinical Homeopathy',
    'Constitutional Approach',
    'Miasmatic Approach',
    'Kentian Method',
    'Boenninghausen Method',
    'Boger Method',
    'Sensation Method',
    'Scholten Method',
    'Banerji Protocols',
    'Predictive Homeopathy',
    'Protocol-Based Prescribing',
    'Integrated Hybrid Approach'
  ];

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

  for (const label of defaultMethods) {
    await prisma.prescriptionOption.upsert({
      where: { type_normalizedLabel: { type: PrescriptionOptionType.METHOD, normalizedLabel: label.toLowerCase() } },
      update: {},
      create: {
        type: PrescriptionOptionType.METHOD,
        label,
        normalizedLabel: label.toLowerCase(),
        isSystem: true
      }
    });
  }

  for (const label of defaultDiagnoses) {
    await prisma.prescriptionOption.upsert({
      where: {
        type_normalizedLabel: { type: PrescriptionOptionType.DIAGNOSED_DISEASE, normalizedLabel: label.toLowerCase() }
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
    { id: 'seed-event-login', name: 'patient.login', actorId: patientOne.id, actorRole: Role.PATIENT, createdAt: daysAgo(6) },
    { id: 'seed-event-booked', name: 'consultation.booked', actorId: patientOne.id, actorRole: Role.PATIENT, createdAt: daysAgo(6), properties: { consultationId: DEV_SEED_IDS.consultationRahul } },
    { id: 'seed-event-pay-init', name: 'payment.initiated', actorId: patientOne.id, actorRole: Role.PATIENT, createdAt: daysAgo(6), properties: { consultationId: DEV_SEED_IDS.consultationRahul } },
    { id: 'seed-event-pay-done', name: 'payment.completed', actorId: patientOne.id, actorRole: Role.PATIENT, createdAt: daysAgo(5), properties: { consultationId: DEV_SEED_IDS.consultationRahul } },
    { id: 'seed-event-assigned', name: 'consultation.assigned', actorId: admin.id, actorRole: Role.ADMIN, createdAt: daysAgo(5), properties: { consultationId: DEV_SEED_IDS.consultationRahul, doctorId: doctorUser.id } },
    { id: 'seed-event-rx', name: 'prescription.published', actorId: doctorUser.id, actorRole: Role.DOCTOR, createdAt: daysAgo(4), properties: { consultationId: DEV_SEED_IDS.consultationRahul } },
    { id: 'seed-event-dose', name: 'dose.taken', actorId: patientOne.id, actorRole: Role.PATIENT, createdAt: daysAgo(3), properties: { consultationId: DEV_SEED_IDS.consultationRahul } },
    { id: 'seed-event-worklist', name: 'doctor.worklist_viewed', actorId: doctorUser.id, actorRole: Role.DOCTOR, category: ProductEventCategory.ENGAGEMENT, createdAt: daysAgo(2), properties: { view: 'ALL' } }
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

  console.log('── Dev demo seed complete ──');
  console.log(`Shared password/PIN: ${DEV_DEMO_PASSWORD}`);
  console.log(`Patient OTP (dev): ${process.env.DEV_OTP || '123456'} · mobile ${DEV_PATIENT_MOBILE}`);
  console.log(`Admin: ${DEV_DEMO_ACCOUNTS.admin.email}`);
  console.log(`Doctor: ${DEV_DEMO_ACCOUNTS.doctor.email}`);
  console.log(`HR: ${DEV_DEMO_ACCOUNTS.hr.email}`);
  console.log(`Patients: ${DEV_DEMO_ACCOUNTS.patientRahul.patientCode} (Rahul), ${DEV_DEMO_ACCOUNTS.patientPriya.patientCode} (Priya)`);
  console.log(`Store manager: ${DEV_DEMO_ACCOUNTS.storeManager.email}`);
  console.log(`Store staff PIN: ${DEV_DEMO_ACCOUNTS.storeStaff.staffCode} / ${DEV_DEMO_PASSWORD}`);
  console.log(`Demo guide: http://localhost:4000/dev/demo-guide`);
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
