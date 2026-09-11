import { createHash } from 'node:crypto';
import { z } from 'zod';

export const PROFESSIONAL_DIRECTORY_SEGMENT = 'MENTAL_HEALTH_PROFESSIONALS';
export const PROVIDER_INVITATION_URL = 'https://earn.hopehub.in';

const recordSchema = z.object({
  sourceRecordId: z.string().min(1).max(100),
  category: z.enum(['PSYCHOLOGIST', 'PSYCHIATRIST', 'THERAPIST']),
  name: z.string().min(1).max(300),
  city: z.string().max(500),
  professionalTitle: z.string().max(500),
  emails: z.array(z.string().email()).max(20),
  fields: z.record(z.string(), z.string()),
  rawCells: z.array(z.string()).min(1)
});

export function parseProfessionalDirectory(value: unknown) {
  const archive = z
    .object({
      version: z.literal(1),
      filename: z.string().min(1).max(500),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      pdfBase64: z.string().max(35_000_000),
      pageTexts: z.array(z.string()).min(1),
      records: z.array(recordSchema).min(1).max(5000)
    })
    .parse(value);
  const pdf = Buffer.from(archive.pdfBase64, 'base64');
  if (
    !pdf.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
    createHash('sha256').update(pdf).digest('hex') !== archive.sha256
  ) {
    throw new Error('Source PDF checksum mismatch');
  }
  if (
    new Set(archive.records.map((record) => record.sourceRecordId)).size !== archive.records.length
  ) {
    throw new Error('Duplicate directory record IDs');
  }
  return { ...archive, pdf };
}

export function professionalInvitationTemplates() {
  const variants = [
    [
      'invitation',
      'Join Hope Hub as a mental health professional',
      'An invitation to explore joining Hope Hub',
      'We would like to invite you to explore joining Hope Hub as a mental health professional. If this is relevant to your practice, you can review the provider signup process and submit your professional details for review.'
    ],
    [
      'overview',
      'Explore the Hope Hub provider platform',
      'Could Hope Hub be a fit for your practice?',
      'Hope Hub welcomes applications from mental health professionals interested in supporting people seeking care. Visit our provider platform to explore joining. Please review the current terms and onboarding requirements before deciding.'
    ],
    [
      'application',
      'Start your provider application',
      'Share your professional profile with Hope Hub',
      'If you are interested in joining Hope Hub, you can begin by submitting your professional profile through our provider platform. Our team will review your application. Submitting an application does not guarantee approval, bookings or income.'
    ],
    [
      'questions',
      'Questions before joining Hope Hub?',
      'Would you like to know more about joining Hope Hub?',
      'Choosing a platform for your practice deserves careful consideration. You can visit our provider platform and use the contact options on our website if you have questions about joining, eligibility or the application process.'
    ],
    [
      'follow-up',
      'A follow-up invitation to join Hope Hub',
      'Following up on our Hope Hub invitation',
      'We are following up on our earlier invitation to explore joining Hope Hub. If you are interested, you can submit your details through the provider platform. If this is not relevant, please use the unsubscribe link below; there is no obligation to apply.'
    ]
  ];
  return variants.map(([key, name, subject, body], index) => ({
    systemKey: `professional-${key}`,
    name,
    category: PROFESSIONAL_DIRECTORY_SEGMENT,
    description:
      'Editable professional recruitment email. Review eligibility and permission before sending. Follow-up is for previously contacted recipients only.',
    subject,
    previewText: 'Explore joining the Hope Hub provider community.',
    htmlBody: `<p>Hello {{fullName}},</p><p>${body}</p><p><a href="${PROVIDER_INVITATION_URL}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px">Explore joining Hope Hub</a></p><p>Best wishes,<br>Hope Hub team</p>`,
    textBody: `Hello {{fullName}},\n\n${body}\n\nExplore joining Hope Hub: ${PROVIDER_INVITATION_URL}\n\nBest wishes,\nHope Hub team`,
    isSystem: true,
    isActive: true,
    sortOrder: 200 + index
  }));
}
