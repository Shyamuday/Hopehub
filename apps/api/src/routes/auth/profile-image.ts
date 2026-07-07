import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../../auth.js';
import { STORE_ROLES } from '../../constants/store-api-routes.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import {
  deleteProfileImageFile,
  profileImageMimeType,
  readProfileImageFile,
  saveStoreStaffProfileImage,
  saveUserProfileImage
} from '../../services/profile-image-storage.js';
import {
  enrichWithProfileImageUrl,
  storeStaffProfileImagePath,
  userProfileImagePath
} from '../../utils/profile-image-url.js';
import { getStoreStaff, storeAuthMiddleware } from '../store/shared.js';

const uploadSchema = z.object({
  mimeType: z.string().min(3).max(80),
  fileName: z.string().max(200).optional(),
  dataBase64: z.string().min(1)
});

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

async function serveProfileImage(storageKey: string | null | undefined, res: import('express').Response) {
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
      const body = uploadSchema.parse(req.body);
      const userId = req.user!.id;

      try {
        const existing = await prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { profileImageKey: true }
        });

        const saved = await saveUserProfileImage({
          userId,
          mimeType: body.mimeType,
          fileName: body.fileName,
          dataBase64: body.dataBase64
        });

        await prisma.user.update({
          where: { id: userId },
          data: { profileImageKey: saved.storageKey }
        });

        if (existing.profileImageKey && existing.profileImageKey !== saved.storageKey) {
          await deleteProfileImageFile(existing.profileImageKey);
        }

        res.json({
          profileImageUrl: userProfileImagePath(userId),
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
          data: { profileImageKey: null }
        });
      }

      res.json({ message: 'Profile photo removed.', profileImageUrl: null });
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
      const body = uploadSchema.parse(req.body);
      const staffId = getStoreStaff(req).staffId;

      try {
        const existing = await prisma.storeStaff.findUniqueOrThrow({
          where: { id: staffId },
          select: { profileImageKey: true }
        });

        const saved = await saveStoreStaffProfileImage({
          staffId,
          mimeType: body.mimeType,
          fileName: body.fileName,
          dataBase64: body.dataBase64
        });

        await prisma.storeStaff.update({
          where: { id: staffId },
          data: { profileImageKey: saved.storageKey }
        });

        if (existing.profileImageKey && existing.profileImageKey !== saved.storageKey) {
          await deleteProfileImageFile(existing.profileImageKey);
        }

        res.json({
          profileImageUrl: storeStaffProfileImagePath(staffId),
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
      const staffId = getStoreStaff(req).staffId;
      const existing = await prisma.storeStaff.findUniqueOrThrow({
        where: { id: staffId },
        select: { profileImageKey: true }
      });

      if (existing.profileImageKey) {
        await deleteProfileImageFile(existing.profileImageKey);
        await prisma.storeStaff.update({
          where: { id: staffId },
          data: { profileImageKey: null }
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
        staff: enrichWithProfileImageUrl(staff, storeStaffProfileImagePath)
      });
    })
  );
}
