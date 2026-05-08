import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { ConsultationAttachmentKind, Role } from '@prisma/client';
import { supabaseAdmin } from './supabase.js';

export const ATTACHMENT_BUCKET = 'consultation-attachments';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPG, PNG, WebP images or PDF files are allowed.'));
  }
}).single('file');

export function attachmentUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  attachmentUpload(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      res.status(400).json({ message });
      return;
    }
    next();
  });
}

export function sanitizeStoredFileName(name: string) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return (base || 'file').slice(0, 160);
}

export function defaultAttachmentKind(role: Role): ConsultationAttachmentKind {
  if (role === Role.PATIENT) return ConsultationAttachmentKind.PATIENT_REPORT;
  if (role === Role.DOCTOR) return ConsultationAttachmentKind.DOCTOR_CLINICAL;
  return ConsultationAttachmentKind.OTHER;
}

export function coerceAttachmentKind(role: Role, requested: string | undefined): ConsultationAttachmentKind {
  const allowed = new Set(Object.values(ConsultationAttachmentKind));
  const raw = typeof requested === 'string' && allowed.has(requested as ConsultationAttachmentKind)
    ? (requested as ConsultationAttachmentKind)
    : defaultAttachmentKind(role);

  if (role === Role.PATIENT && raw === ConsultationAttachmentKind.DOCTOR_CLINICAL) {
    return ConsultationAttachmentKind.PATIENT_REPORT;
  }
  if (role === Role.DOCTOR && raw === ConsultationAttachmentKind.PATIENT_REPORT) {
    return ConsultationAttachmentKind.DOCTOR_CLINICAL;
  }
  return raw;
}

export async function persistConsultationAttachment(
  storagePath: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.storage.from(ATTACHMENT_BUCKET).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false
    });
    if (error) {
      throw error;
    }
    return;
  }

  const uploadsRoot = path.join(process.cwd(), 'uploads', 'consultation-attachments');
  const fullPath = path.join(uploadsRoot, storagePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
}

export async function resolveAttachmentFileUrl(storagePath: string, apiPublicBase: string): Promise<string> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (error || !data?.signedUrl) {
      console.warn('[attachments] signed URL failed', error?.message);
      return '';
    }
    return data.signedUrl;
  }

  const safePath = storagePath.split(/[/\\]/).filter(Boolean).join('/');
  return `${apiPublicBase.replace(/\/$/, '')}/uploads/consultation-attachments/${safePath}`;
}

export function buildDoctorCredentialStoragePath(userId: string, kind: string, originalName: string) {
  const idPart = crypto.randomUUID();
  const safe = sanitizeStoredFileName(originalName);
  const k = kind.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'doc';
  return `doctor-credentials/${userId}/${k}-${idPart}-${safe}`;
}

export function buildAttachmentStoragePath(consultationId: string, originalName: string) {
  const idPart = crypto.randomUUID();
  const safe = sanitizeStoredFileName(originalName);
  return `${consultationId}/${idPart}-${safe}`;
}

type HydratableConsultation = {
  attachments?: Array<
    Record<string, unknown> & {
      storagePath?: string;
      uploadedBy?: { id?: string; name?: string; role?: string };
    }
  >;
};

export async function hydrateConsultationAttachments<T extends HydratableConsultation>(
  consultation: T | null | undefined,
  apiPublicBase: string
): Promise<T | null | undefined> {
  if (!consultation?.attachments?.length) {
    return consultation;
  }

  const attachments = await Promise.all(
    consultation.attachments.map(async (att) => {
      const storagePath = att.storagePath as string;
      const fileUrl = await resolveAttachmentFileUrl(storagePath, apiPublicBase);
      const { storagePath: _omit, ...rest } = att as Record<string, unknown>;
      return { ...rest, fileUrl };
    })
  );

  return { ...consultation, attachments };
}

export async function hydrateConsultationsAttachments<T extends HydratableConsultation>(
  consultations: T[],
  apiPublicBase: string
): Promise<T[]> {
  return Promise.all(consultations.map((c) => hydrateConsultationAttachments(c, apiPublicBase))) as Promise<T[]>;
}

export async function serializeAttachmentRecord(att: Record<string, unknown>, apiPublicBase: string) {
  const storagePath = att.storagePath as string;
  const fileUrl = await resolveAttachmentFileUrl(storagePath, apiPublicBase);
  const { storagePath: _s, ...rest } = att;
  return { ...rest, fileUrl };
}
