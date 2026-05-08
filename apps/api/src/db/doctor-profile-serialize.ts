import type { Prisma } from '@prisma/client';
import { resolveAttachmentFileUrl } from '../consultation-attachments.js';
import { apiPublicBaseUrl } from '../server/config.js';
import { type doctorProfileApiDbSelect } from './prisma-includes.js';

export type DoctorProfileDb = Prisma.DoctorGetPayload<{ select: typeof doctorProfileApiDbSelect }>;

export async function serializeDoctorProfileForApi(dp: DoctorProfileDb | null) {
  if (!dp) {
    return null;
  }
  const base = apiPublicBaseUrl();
  const {
    degreeCertificatePath,
    councilRegCertificatePath,
    otherCredentialPath,
    ...rest
  } = dp;
  const [degreeCertificateUrl, councilRegCertificateUrl, otherCredentialUrl] = await Promise.all([
    degreeCertificatePath ? resolveAttachmentFileUrl(degreeCertificatePath, base) : Promise.resolve(null),
    councilRegCertificatePath ? resolveAttachmentFileUrl(councilRegCertificatePath, base) : Promise.resolve(null),
    otherCredentialPath ? resolveAttachmentFileUrl(otherCredentialPath, base) : Promise.resolve(null)
  ]);
  return {
    ...rest,
    degreeCertificateUrl: degreeCertificateUrl || null,
    councilRegCertificateUrl: councilRegCertificateUrl || null,
    otherCredentialUrl: otherCredentialUrl || null
  };
}
