import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired } from '../../auth.js';
import { providerPublicReadiness } from '../../doctor-capabilities.js';
import { STORE_ROLES } from '../../constants/store-api-routes.constants.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  routeParam,
  writeAuditLog,
  writeStoreStaffAuditLog
} from '../../utils/helpers.js';
import { parseMultipartForm } from '../../utils/multipart.js';
import { assetAccessUrl } from '../../services/asset-storage.js';
import {
  deleteProfileImageFile,
  profileImageMimeType,
  readProfileImageFile,
  saveStoreStaffProfileImage,
  saveUserProfileImage
} from '../../services/profile-image-storage.js';
import { submitHomeopathyProviderForApprovalIfReady } from '../../services/homeopathy-provider-approval.js';
import {
  enrichWithProfileImageAccessUrl,
  enrichWithProfileImageUrl,
  storeStaffProfileImagePath,
  userProfileImagePath
} from '../../utils/profile-image-url.js';
import { getStoreStaff, storeAuthMiddleware } from '../store/shared.js';

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

async function syncProviderVisibility(userId: string, role: Role) {
  if (role !== Role.DOCTOR) return;
  await submitHomeopathyProviderForApprovalIfReady(userId);
  const readiness = await providerPublicReadiness(userId);
  await prisma.doctor.updateMany({
    where: { userId },
    data: { showOnWebsite: readiness.ready }
  });
}

async function parseProfileImageUpload(req: import('express').Request) {
  const form = await parseMultipartForm(req, { maxFileBytes: MAX_PROFILE_IMAGE_BYTES });
  if (!form.file) {
    throw new Error('EMPTY_FILE');
  }
  return {
    mimeType: form.file.mimeType,
    fileName: form.fields['fileName'] || form.file.fileName,
    data: form.file.buffer
  };
}

function mapUploadError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'UNSUPPORTED_MIME') {
    return { status: 400, message: 'Only JPEG, PNG, and WebP images are allowed.' };
  }
  if (code === 'EMPTY_FILE') {
    return { status: 400, message: 'Image file is empty.' };
  }
  if (code === 'FILE_TOO_LARGE') {
    return { status: 400, message: 'Image must be 2 MB or smaller.' };
  }
  return { status: 500, message: 'Could not save profile image.' };
}

async function serveProfileImage(
  storageKey: string | null | undefined,
  res: import('express').Response
) {
  if (!storageKey) {
    return res.status(404).json({ message: 'Profile image not found.' });
  }

  try {
    const buffer = await readProfileImageFile(storageKey);
    res.setHeader('Content-Type', profileImageMimeType(storageKey));
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(buffer);
  } catch {
    return res.status(404).json({ message: 'Profile image not found.' });
  }
}

export function registerProfileImageRoutes(router: Router) {
  router.put(
    '/me/profile-image',
    authRequired,
    asyncRoute(async (req, res) => {
      const userId = req.user!.id;

      try {
        const body = await parseProfileImageUpload(req);
        const existing = await prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { profileImageKey: true }
        });

        const saved = await saveUserProfileImage({
          userId,
          mimeType: body.mimeType,
          fileName: body.fileName,
          data: body.data,
          uploadedById: userId
        });

        await prisma.user.update({
          where: { id: userId },
          data: {
            profileImageKey: saved.storageKey,
            profileImageUrl: saved.imageUrl || userProfileImagePath(userId)
          }
        });
        await syncProviderVisibility(userId, req.user!.role);

        if (existing.profileImageKey && existing.profileImageKey !== saved.storageKey) {
          await deleteProfileImageFile(existing.profileImageKey);
        }

        await writeAuditLog({
          actorId: userId,
          actorRole: req.user!.role,
          action: 'profile_image.upload',
          targetType: 'User',
          targetId: userId,
          summary: 'User profile image uploaded.',
          metadata: {
            storageKey: saved.storageKey,
            byteSize: saved.byteSize,
            mimeType: saved.mimeType
          }
        });

        res.json({
          profileImageUrl:
            saved.imageUrl ||
            (await assetAccessUrl(saved.storageKey, userProfileImagePath(userId))),
          message: 'Profile photo saved.'
        });
      } catch (error) {
        const mapped = mapUploadError(error);
        return res.status(mapped.status).json({ message: mapped.message });
      }
    })
  );

  router.delete(
    '/me/profile-image',
    authRequired,
    asyncRoute(async (req, res) => {
      const userId = req.user!.id;
      const existing = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { profileImageKey: true }
      });

      if (existing.profileImageKey) {
        await deleteProfileImageFile(existing.profileImageKey);
        await prisma.user.update({
          where: { id: userId },
          data: { profileImageKey: null, profileImageUrl: null }
        });
        await syncProviderVisibility(userId, req.user!.role);
        await writeAuditLog({
          actorId: userId,
          actorRole: req.user!.role,
          action: 'profile_image.delete',
          targetType: 'User',
          targetId: userId,
          summary: 'User profile image removed.',
          metadata: { storageKey: existing.profileImageKey }
        });
      }

      res.json({ message: 'Profile photo removed.', profileImageUrl: null });
    })
  );

  router.get(
    '/me/profile-image/url',
    authRequired,
    asyncRoute(async (req, res) => {
      const userId = req.user!.id;
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { profileImageKey: true, profileImageUrl: true }
      });

      res.json({
        profileImageUrl:
          user.profileImageUrl ||
          (user.profileImageKey
            ? await assetAccessUrl(user.profileImageKey, userProfileImagePath(userId))
            : null)
      });
    })
  );

  router.get(
    '/profile-images/users/:userId',
    authRequired,
    asyncRoute(async (req, res) => {
      const userId = routeParam(req, 'userId');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileImageKey: true }
      });
      return serveProfileImage(user?.profileImageKey, res);
    })
  );
}

export function registerStoreProfileImageRoutes(router: Router) {
  router.get(
    '/profile-images/:staffId',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const staffId = routeParam(req, 'staffId');
      const viewer = getStoreStaff(req);
      if (viewer.role !== STORE_ROLES.MANAGER && viewer.staffId !== staffId) {
        return res.status(403).json({ message: 'You can only view your own profile photo.' });
      }

      const staff = await prisma.storeStaff.findFirst({
        where: { id: staffId, storeId: viewer.storeId },
        select: { profileImageKey: true }
      });
      return serveProfileImage(staff?.profileImageKey, res);
    })
  );
  router.put(
    '/me/profile-image',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const staffActor = getStoreStaff(req);
      const staffId = staffActor.staffId;

      try {
        const body = await parseProfileImageUpload(req);
        const existing = await prisma.storeStaff.findUniqueOrThrow({
          where: { id: staffId },
          select: { profileImageKey: true }
        });

        const saved = await saveStoreStaffProfileImage({
          staffId,
          mimeType: body.mimeType,
          fileName: body.fileName,
          data: body.data,
          uploadedById: staffId
        });

        await prisma.storeStaff.update({
          where: { id: staffId },
          data: {
            profileImageKey: saved.storageKey,
            profileImageUrl: saved.imageUrl || storeStaffProfileImagePath(staffId)
          }
        });

        if (existing.profileImageKey && existing.profileImageKey !== saved.storageKey) {
          await deleteProfileImageFile(existing.profileImageKey);
        }

        await writeStoreStaffAuditLog({
          actorStoreStaffId: staffId,
          actorStoreRole: staffActor.role,
          action: 'store_staff.profile_image.upload',
          targetType: 'StoreStaff',
          targetId: staffId,
          summary: 'Store staff profile image uploaded.',
          metadata: {
            storageKey: saved.storageKey,
            byteSize: saved.byteSize,
            mimeType: saved.mimeType
          }
        });

        res.json({
          profileImageUrl:
            saved.imageUrl ||
            (await assetAccessUrl(saved.storageKey, storeStaffProfileImagePath(staffId))),
          message: 'Profile photo saved.'
        });
      } catch (error) {
        const mapped = mapUploadError(error);
        return res.status(mapped.status).json({ message: mapped.message });
      }
    })
  );

  router.delete(
    '/me/profile-image',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const staffActor = getStoreStaff(req);
      const staffId = staffActor.staffId;
      const existing = await prisma.storeStaff.findUniqueOrThrow({
        where: { id: staffId },
        select: { profileImageKey: true }
      });

      if (existing.profileImageKey) {
        await deleteProfileImageFile(existing.profileImageKey);
        await prisma.storeStaff.update({
          where: { id: staffId },
          data: { profileImageKey: null, profileImageUrl: null }
        });
        await writeStoreStaffAuditLog({
          actorStoreStaffId: staffId,
          actorStoreRole: staffActor.role,
          action: 'store_staff.profile_image.delete',
          targetType: 'StoreStaff',
          targetId: staffId,
          summary: 'Store staff profile image removed.',
          metadata: { storageKey: existing.profileImageKey }
        });
      }

      res.json({ message: 'Profile photo removed.', profileImageUrl: null });
    })
  );

  router.get(
    '/me',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const staffId = getStoreStaff(req).staffId;
      const staff = await prisma.storeStaff.findUniqueOrThrow({
        where: { id: staffId },
        include: { store: { select: { id: true, name: true } } }
      });

      res.json({
        staff: await enrichWithProfileImageAccessUrl(staff, storeStaffProfileImagePath)
      });
    })
  );
}
