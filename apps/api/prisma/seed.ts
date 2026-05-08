import { PrismaClient, PrescriptionOptionType, Role } from '@prisma/client';
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

  await prisma.staffProfile.upsert({
    where: { userId: admin.id },
    update: { isSuperAdmin: true },
    create: {
      userId: admin.id,
      isSuperAdmin: true,
      permissionCodes: []
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

  const demoLocations: Array<{
    slug: string;
    name: string;
    addressLine1: string;
    city: string | null;
    state: string | null;
    pincode: string | null;
    phone: string | null;
    sortOrder: number;
  }> = [
    {
      slug: 'bengaluru-indiranagar',
      name: 'Vitalis — Indiranagar',
      addressLine1: '100 Demo Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      phone: '+91-80-0000-0001',
      sortOrder: 0
    },
    {
      slug: 'hyderabad-banjara',
      name: 'Vitalis — Banjara Hills',
      addressLine1: '200 Care Street, Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500034',
      phone: '+91-40-0000-0002',
      sortOrder: 1
    }
  ];

  for (const loc of demoLocations) {
    await prisma.clinicLocation.upsert({
      where: { slug: loc.slug },
      update: {
        name: loc.name,
        addressLine1: loc.addressLine1,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        phone: loc.phone,
        sortOrder: loc.sortOrder,
        isActive: true
      },
      create: {
        slug: loc.slug,
        name: loc.name,
        addressLine1: loc.addressLine1,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        phone: loc.phone,
        sortOrder: loc.sortOrder
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

  console.log('Seeded demo admin, doctor, diseases, clinic locations, and catalog.');
  console.log(`Admin login: ${admin.email} / Password@123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
