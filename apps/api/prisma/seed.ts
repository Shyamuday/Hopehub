import { PrismaClient, PrescriptionOptionType, Role, ConsultationStatus, PrescriptionStatus, DoseEventStatus, SupportNoteCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vitalisclinic.local' },
    update: {},
    create: {
      name: 'Clinic Admin',
      email: 'admin@vitalisclinic.local',
      passwordHash,
      role: Role.ADMIN
    }
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@vitalisclinic.local' },
    update: {},
    create: {
      name: 'Dr. Meera Sharma',
      email: 'doctor@vitalisclinic.local',
      mobile: '9000000001',
      passwordHash,
      role: Role.DOCTOR
    }
  });

  await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      specialty: 'Dermatology',
      registrationNo: 'MCI-DEMO-001'
    }
  });

  const ranchiStore = await prisma.store.upsert({
    where: { code: 'RNC' },
    update: {},
    create: {
      name: 'Vitalis Care — Ranchi',
      code: 'RNC',
      address: 'Ranchi, Jharkhand'
    }
  });

  await prisma.doctor.update({
    where: { userId: doctorUser.id },
    data: { clinicStoreId: ranchiStore.id }
  });

  const managerPinHash = await bcrypt.hash('Password@123', 10);
  await prisma.storeStaff.upsert({
    where: { staffCode: 'RNC-MGR' },
    update: {
      email: 'manager@ranchi.vitalis.local',
      pinHash: managerPinHash,
      role: 'MANAGER',
      isActive: true
    },
    create: {
      name: 'Ranchi Store Manager',
      staffCode: 'RNC-MGR',
      email: 'manager@ranchi.vitalis.local',
      pinHash: managerPinHash,
      role: 'MANAGER',
      storeId: ranchiStore.id,
      designation: 'Store Manager',
      department: 'Operations',
      joiningDate: new Date()
    }
  });

  await prisma.storeStaff.upsert({
    where: { staffCode: 'RNC-STF1' },
    update: { pinHash: managerPinHash, isActive: true },
    create: {
      name: 'Counter Staff Demo',
      staffCode: 'RNC-STF1',
      pinHash: managerPinHash,
      role: 'STAFF',
      storeId: ranchiStore.id,
      designation: 'Dispensary Staff'
    }
  });

  const sharedMobile = '9876543210';
  const patientOne = await prisma.user.upsert({
    where: { email: 'patient1@vitalisclinic.local' },
    update: {
      patientCode: 'RNC-000001',
      homeClinicStoreId: ranchiStore.id,
      mobile: sharedMobile,
      allergies: 'Sulfa drugs (rash)',
      currentMedications: 'None',
      chronicConditions: 'Seasonal hair fall, mild dandruff'
    },
    create: {
      name: 'Rahul Verma',
      email: 'patient1@vitalisclinic.local',
      mobile: sharedMobile,
      passwordHash,
      role: Role.PATIENT,
      patientCode: 'RNC-000001',
      homeClinicStoreId: ranchiStore.id,
      allergies: 'Sulfa drugs (rash)',
      currentMedications: 'None',
      chronicConditions: 'Seasonal hair fall, mild dandruff'
    }
  });

  const patientTwo = await prisma.user.upsert({
    where: { email: 'patient2@vitalisclinic.local' },
    update: { patientCode: 'RNC-000002', homeClinicStoreId: ranchiStore.id, mobile: sharedMobile },
    create: {
      name: 'Priya Verma',
      email: 'patient2@vitalisclinic.local',
      mobile: sharedMobile,
      passwordHash,
      role: Role.PATIENT,
      patientCode: 'RNC-000002',
      homeClinicStoreId: ranchiStore.id
    }
  });

  const hairFall = await prisma.disease.findUnique({ where: { name: 'Hair Fall Treatment' } });
  if (hairFall) {
    const consultation = await prisma.consultation.upsert({
      where: { id: 'seed-consultation-rahul' },
      update: {},
      create: {
        id: 'seed-consultation-rahul',
        patientId: patientOne.id,
        assignedDoctorId: doctorUser.id,
        diseaseId: hairFall.id,
        clinicStoreId: ranchiStore.id,
        status: ConsultationStatus.IN_PROGRESS,
        intakeAnswers: []
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

      // Demo adherence cohort: Rahul — mostly missed/skipped over prior 7 days (high risk)
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
      where: { id: 'seed-consultation-priya-assigned' },
      update: {},
      create: {
        id: 'seed-consultation-priya-assigned',
        patientId: patientTwo.id,
        assignedDoctorId: doctorUser.id,
        diseaseId: hairFall.id,
        clinicStoreId: ranchiStore.id,
        status: ConsultationStatus.ASSIGNED,
        intakeAnswers: []
      }
    });
  }

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
    where: { id: 'seed-support-note-rahul' },
    update: {},
    create: {
      id: 'seed-support-note-rahul',
      patientId: patientOne.id,
      authorId: admin.id,
      consultationId: 'seed-consultation-rahul',
      category: SupportNoteCategory.ADHERENCE,
      body: 'Demo: patient reported missed evening dose. Confirmed SMS reminders are on; suggested reviewing snooze presets in the patient app.'
    }
  });

  console.log('Seeded demo admin, doctor, disease catalog, and demo patients.');
  console.log(`Admin login: ${admin.email} / Password@123`);
  console.log(`Demo patients: ${patientOne.patientCode} (Rahul), ${patientTwo.patientCode} (Priya) — shared mobile ${sharedMobile}`);
  console.log('Store manager login: manager@ranchi.vitalis.local / Password@123');
  console.log('Store staff PIN: RNC-STF1 / Password@123');
  console.log('Scan QR: http://localhost:4000/go/p/RNC-000001');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
