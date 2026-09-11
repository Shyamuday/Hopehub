import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { prisma } from '../src/db.js';
import { importStructuredMarketingContacts } from '../src/services/email-marketing.js';
import {
  parseProfessionalDirectory,
  professionalInvitationTemplates,
  PROFESSIONAL_DIRECTORY_SEGMENT
} from '../src/services/professional-directory.js';

// Extract JSON with extract-professional-directory.py first. Dry run is the default.
// --apply writes only contacts, the private archive and templates. NEVER sends mail.
const fileIndex = process.argv.indexOf('--file');
if (!process.argv.includes('--stdin') && (fileIndex < 0 || !process.argv[fileIndex + 1])) {
  throw new Error('Usage: --file <private-json> or --stdin [--apply]');
}

try {
  let input: string;
  if (process.argv.includes('--stdin')) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    input = Buffer.concat(chunks).toString('utf8');
  } else {
    input = await readFile(process.argv[fileIndex + 1], 'utf8');
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('Invalid JSON input. Check the extractor output and UTF-8 encoding.');
  }
  const archive = parseProfessionalDirectory(decoded);
  const candidates = archive.records.flatMap((record) =>
    record.emails.map((email) => ({
      email,
      name: record.name,
      city: record.city === 'N/A' ? undefined : record.city,
      mobile: record.fields.phone === 'N/A' ? undefined : record.fields.phone?.split(/[,;/]/)[0],
      alternatePhone:
        record.fields.phone === 'N/A' ? undefined : record.fields.phone?.split(/[,;/]/)[1]?.trim(),
      addressLine1: record.fields.address === 'N/A' ? undefined : record.fields.address,
      postalCode: record.fields.address?.match(/\b\d{6}\b/)?.[0],
      sourceChannel: 'PROFESSIONAL_DIRECTORY',
      sourceSegments: [PROFESSIONAL_DIRECTORY_SEGMENT, record.category],
      tags: [record.category, 'ICALL_DIRECTORY', 'CONSENT_UNVERIFIED']
    }))
  );
  // Shared practice mailboxes must retain every associated professional segment.
  const byEmail = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    const key = candidate.email.toLowerCase();
    const existing = byEmail.get(key);
    if (existing) {
      existing.sourceSegments = [
        ...new Set([...existing.sourceSegments, ...candidate.sourceSegments])
      ];
      existing.tags = [...new Set([...existing.tags, ...candidate.tags])];
      // Avoid addressing a shared mailbox as just one of its professionals.
      if (existing.name !== candidate.name) existing.name = 'Hope Hub colleague';
    } else byEmail.set(key, candidate);
  }
  const contacts = [...byEmail.values()];
  const summary = {
    records: archive.records.length,
    uniqueEmails: new Set(contacts.map((contact) => contact.email.toLowerCase())).size,
    withoutEmail: archive.records.filter((record) => !record.emails.length).length,
    categories: Object.fromEntries(
      ['PSYCHOLOGIST', 'PSYCHIATRIST', 'THERAPIST'].map((category) => [
        category,
        archive.records.filter((record) => record.category === category).length
      ])
    )
  };
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ dryRun: true, ...summary }));
  } else {
    // Archive commit is atomic. A failed contact import can safely be retried.
    await prisma.$transaction(
      async (tx) => {
        const source = await tx.professionalDirectorySource.upsert({
          where: { sha256: archive.sha256 },
          create: {
            sha256: archive.sha256,
            filename: archive.filename,
            pdf: archive.pdf,
            pageTexts: archive.pageTexts
          },
          update: {}
        });
        await tx.professionalDirectoryRecord.createMany({
          data: archive.records.map((record) => ({ ...record, sourceId: source.id })),
          skipDuplicates: true
        });
        for (const template of professionalInvitationTemplates()) {
          // Never replace an admin's edits on subsequent imports.
          await tx.emailMarketingTemplate.upsert({
            where: { systemKey: template.systemKey },
            create: template,
            update: {}
          });
        }
      },
      { timeout: 30_000 }
    );
    const result = contacts.length
      ? await importStructuredMarketingContacts({
          contacts,
          sourceLabel: 'iCALL professional directory',
          consentBasis:
            'Administrator-requested professional directory import. Public listing is not marketing opt-in; permission must be reviewed before sending.'
        })
      : null;
    console.log(JSON.stringify({ applied: true, ...summary, contacts: result, emailsSent: 0 }));
  }
} catch (error) {
  // Do not print source data or database queries containing private directory notes.
  console.error(
    error instanceof Error && error.name === 'ZodError'
      ? 'Directory validation failed. Check source fields and email formatting.'
      : error instanceof Error && error.name === 'Error'
        ? error.message
        : 'Directory import failed. Check the database schema and connection.'
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
