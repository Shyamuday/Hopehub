import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  parseProfessionalDirectory,
  professionalInvitationTemplates
} from './professional-directory.js';

function fixture() {
  const pdf = Buffer.from('%PDF-test archive');
  return {
    version: 1,
    filename: 'directory.pdf',
    pdfBase64: pdf.toString('base64'),
    sha256: createHash('sha256').update(pdf).digest('hex'),
    pageTexts: ['All source text'],
    records: [
      {
        sourceRecordId: '1',
        category: 'PSYCHOLOGIST',
        name: 'Example Professional',
        city: 'Pune',
        professionalTitle: 'Clinical Psychologist',
        emails: [],
        fields: { qualifications: 'Example qualification', email: 'N/A' },
        rawCells: ['original', 'cells']
      }
    ]
  };
}

test('retains every field and professionals without email', () => {
  const input = fixture();
  const result = parseProfessionalDirectory(input);
  assert.deepEqual(result.records, input.records);
  assert.equal(result.pdf.toString(), '%PDF-test archive');
});

test('rejects changed PDF bytes, duplicate records and invalid emails', () => {
  const input = fixture();
  assert.throws(() => parseProfessionalDirectory({ ...input, sha256: '0'.repeat(64) }), /checksum/);
  assert.throws(
    () => parseProfessionalDirectory({ ...input, records: [input.records[0], input.records[0]] }),
    /Duplicate/
  );
  assert.throws(() =>
    parseProfessionalDirectory({
      ...input,
      records: [{ ...input.records[0], emails: ['invalid'] }]
    })
  );
});

test('provides five distinct editable invitation templates with the provider URL', () => {
  const templates = professionalInvitationTemplates();
  assert.equal(templates.length, 5);
  assert.equal(new Set(templates.map((template) => template.systemKey)).size, 5);
  for (const template of templates) {
    assert.equal(template.category, 'MENTAL_HEALTH_PROFESSIONALS');
    assert.match(template.htmlBody, /https:\/\/earn\.hopehub\.in/);
    assert.match(template.textBody, /https:\/\/earn\.hopehub\.in/);
    assert.match(template.htmlBody, /\{\{fullName\}\}/);
  }
});
