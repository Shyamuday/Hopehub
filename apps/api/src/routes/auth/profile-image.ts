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
const MAX_USER_PROFILE_IMAGES = 8;

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

async function userProfileImageJson(image: {
  id: string;
  userId: string;
  storageKey: string;
  imageUrl: string | null;
  mimeType: string | null;
  byteSize: number | null;
  isPrimary: boolean;
  createdAt: Date;
}) {
  return {
    id: image.id,
    imageUrl:
      image.imageUrl ||
      (await assetAccessUrl(image.storageKey, `/me/profile-images/${image.id}/file`)),
    mimeType: image.mimeType,
    byteSize: image.byteSize,
    isPrimary: image.isPrimary,
    createdAt: image.createdAt.toISOString()
  };
}

async function removeUserProfileImage(userId: string, imageId: string) {
  const image = await prisma.userProfileImage.findFirst({ where: { id: imageId, userId } });
  if (!image) return null;

  await prisma.$transaction(async (tx) => {
    await tx.userProfileImage.delete({ where: { id: image.id } });
    if (!image.isPrimary) return;

    const replacement = await tx.userProfileImage.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    if (replacement) {
      await tx.userProfileImage.update({
        where: { id: replacement.id },
        data: { isPrimary: true }
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        profileImageKey: replacement?.storageKey ?? null,
        profileImageUrl:
          replacement?.imageUrl || (replacement ? userProfileImagePath(userId) : null)
      }
    });
  });

  await deleteProfileImageFile(image.storageKey);
  return image;
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

        await prisma.$transaction(async (tx) => {
          await tx.userProfileImage.updateMany({
            where: { userId, isPrimary: true },
            data: { isPrimary: false }
          });
          if (existing.profileImageKey) {
            await tx.userProfileImage.deleteMany({
              where: { userId, storageKey: existing.profileImageKey }
            });
          }
          await tx.userProfileImage.create({
            data: {
              userId,
              storageKey: saved.storageKey,
              imageUrl: saved.imageUrl,
              mimeType: saved.mimeType,
              byteSize: saved.byteSize,
              isPrimary: true
            }
          });
          await tx.user.update({
            where: { id: userId },
            data: {
              profileImageKey: saved.storageKey,
              profileImageUrl: saved.imageUrl || userProfileImagePath(userId)
            }
          });
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
        const galleryImage = await prisma.userProfileImage.findFirst({
          where: { userId, storageKey: existing.profileImageKey }
        });
        if (galleryImage) {
          await removeUserProfileImage(userId, galleryImage.id);
        } else {
          await deleteProfileImageFile(existing.profileImageKey);
          await prisma.user.update({
            where: { id: userId },
            data: { profileImageKey: null, profileImageUrl: null }
          });
        }
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
      } else {
        // External/legacy profile URLs have no storage object, but removing
        // the photo must still clear the canonical profile value.
        await prisma.user.update({
          where: { id: userId },
          data: { profileImageUrl: null }
        });
        await syncProviderVisibility(userId, req.user!.role);
      }

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { profileImageUrl: true }
      });
      res.json({
        message: 'Profile photo removed.',
        profileImageUrl: updated.profileImageUrl
      });
    })
  );

  router.get(
    '/me/profile-images',
    authRequired,
    asyncRoute(async (req, res) => {
      const images = await prisma.userProfileImage.findMany({
        where: { userId: req.user!.id },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
      });
      res.json({
        images: await Promise.all(images.map((image) => userProfileImageJson(image))),
        limit: MAX_USER_PROFILE_IMAGES
      });
    })
  );

  router.post(
    '/me/profile-images',
    authRequired,
    asyncRoute(async (req, res) => {
      const userId = req.user!.id;
      let saved: Awaited<ReturnType<typeof saveUserProfileImage>> | null = null;
      try {
        const body = await parseProfileImageUpload(req);
        saved = await saveUserProfileImage({
          userId,
          mimeType: body.mimeType,
          fileName: body.fileName,
          data: body.data,
          uploadedById: userId
        });
        const image = await prisma.$transaction(async (tx) => {
          const count = await tx.userProfileImage.count({ where: { userId } });
          if (count >= MAX_USER_PROFILE_IMAGES) throw new Error('PROFILE_IMAGE_LIMIT');
          const isPrimary = count === 0;
          const created = await tx.userProfileImage.create({
            data: {
              userId,
              storageKey: saved!.storageKey,
              imageUrl: saved!.imageUrl,
              mimeType: saved!.mimeType,
              byteSize: saved!.byteSize,
              isPrimary
            }
          });
          if (isPrimary) {
            await tx.user.update({
              where: { id: userId },
              data: {
                profileImageKey: saved!.storageKey,
                profileImageUrl: saved!.imageUrl || userProfileImagePath(userId)
              }
            });
          }
          return created;
        });
        await syncProviderVisibility(userId, req.user!.role);
        await writeAuditLog({
          actorId: userId,
          actorRole: req.user!.role,
          action: 'profile_image.gallery_upload',
          targetType: 'UserProfileImage',
          targetId: image.id,
          summary: 'User added a profile gallery image.',
          metadata: { storageKey: saved.storageKey, isPrimary: image.isPrimary }
        });
        res.status(201).json({ image: await userProfileImageJson(image) });
      } catch (error) {
        if (saved) await deleteProfileImageFile(saved.storageKey).catch(() => null);
        if (error instanceof Error && error.message === 'PROFILE_IMAGE_LIMIT') {
          return res.status(409).json({
            message: `You can keep up to ${MAX_USER_PROFILE_IMAGES} profile photos.`
          });
        }
        const mapped = mapUploadError(error);
        return res.status(mapped.status).json({ message: mapped.message });
      }
    })
  );

  router.patch(
    '/me/profile-images/:imageId/primary',
    authRequired,
    asyncRoute(async (req, res) => {
      const userId = req.user!.id;
      const imageId = routeParam(req, 'imageId');
      const image = await prisma.userProfileImage.findFirst({ where: { id: imageId, userId } });
      if (!image) return res.status(404).json({ message: 'Profile photo not found.' });

      await prisma.$transaction(async (tx) => {
        await tx.userProfileImage.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false }
        });
        await tx.userProfileImage.update({ where: { id: image.id }, data: { isPrimary: true } });
        await tx.user.update({
          where: { id: userId },
          data: {
            profileImageKey: image.storageKey,
            profileImageUrl: image.imageUrl || userProfileImagePath(userId)
          }
        });
      });
      await syncProviderVisibility(userId, req.user!.role);
      await writeAuditLog({
        actorId: userId,
        actorRole: req.user!.role,
        action: 'profile_image.primary_change',
        targetType: 'UserProfileImage',
        targetId: image.id,
        summary: 'User changed their primary profile photo.'
      });
      res.json({ profileImageUrl: image.imageUrl || userProfileImagePath(userId) });
    })
  );

  router.delete(
    '/me/profile-images/:imageId',
    authRequired,
    asyncRoute(async (req, res) => {
      const userId = req.user!.id;
      const imageId = routeParam(req, 'imageId');
      const removed = await removeUserProfileImage(userId, imageId);
      if (!removed) return res.status(404).json({ message: 'Profile photo not found.' });
      await syncProviderVisibility(userId, req.user!.role);
      await writeAuditLog({
        actorId: userId,
        actorRole: req.user!.role,
        action: 'profile_image.gallery_delete',
        targetType: 'UserProfileImage',
        targetId: removed.id,
        summary: 'User removed a profile gallery image.',
        metadata: { storageKey: removed.storageKey, wasPrimary: removed.isPrimary }
      });
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { profileImageUrl: true }
      });
      res.json({ message: 'Profile photo removed.', profileImageUrl: user.profileImageUrl });
    })
  );

  router.get(
    '/me/profile-images/:imageId/file',
    authRequired,
    asyncRoute(async (req, res) => {
      const image = await prisma.userProfileImage.findFirst({
        where: { id: routeParam(req, 'imageId'), userId: req.user!.id },
        select: { storageKey: true }
      });
      if (!image) return res.status(404).json({ message: 'Profile photo not found.' });
      return serveProfileImage(image.storageKey, res);
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

async function storeStaffProfileImageJson(image: {
  id: string;
  storeStaffId: string;
  storageKey: string;
  imageUrl: string | null;
  mimeType: string | null;
  byteSize: number | null;
  isPrimary: boolean;
  createdAt: Date;
}) {
  return {
    id: image.id,
    imageUrl:
      image.imageUrl ||
      (await assetAccessUrl(image.storageKey, `/store/me/profile-images/${image.id}/file`)),
    mimeType: image.mimeType,
    byteSize: image.byteSize,
    isPrimary: image.isPrimary,
    createdAt: image.createdAt.toISOString()
  };
}

async function removeStoreStaffProfileImage(storeStaffId: string, imageId: string) {
  const image = await prisma.storeStaffProfileImage.findFirst({
    where: { id: imageId, storeStaffId }
  });
  if (!image) return null;
  await prisma.$transaction(async (tx) => {
    await tx.storeStaffProfileImage.delete({ where: { id: image.id } });
    if (!image.isPrimary) return;
    const replacement = await tx.storeStaffProfileImage.findFirst({
      where: { storeStaffId },
      orderBy: { createdAt: 'desc' }
    });
    if (replacement) {
      await tx.storeStaffProfileImage.update({
        where: { id: replacement.id },
        data: { isPrimary: true }
      });
    }
    await tx.storeStaff.update({
      where: { id: storeStaffId },
      data: {
        profileImageKey: replacement?.storageKey ?? null,
        profileImageUrl:
          replacement?.imageUrl || (replacement ? storeStaffProfileImagePath(storeStaffId) : null)
      }
    });
  });
  await deleteProfileImageFile(image.storageKey);
  return image;
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

        await prisma.$transaction(async (tx) => {
          await tx.storeStaffProfileImage.updateMany({
            where: { storeStaffId: staffId, isPrimary: true },
            data: { isPrimary: false }
          });
          if (existing.profileImageKey) {
            await tx.storeStaffProfileImage.deleteMany({
              where: { storeStaffId: staffId, storageKey: existing.profileImageKey }
            });
          }
          await tx.storeStaffProfileImage.create({
            data: {
              storeStaffId: staffId,
              storageKey: saved.storageKey,
              imageUrl: saved.imageUrl,
              mimeType: saved.mimeType,
              byteSize: saved.byteSize,
              isPrimary: true
            }
          });
          await tx.storeStaff.update({
            where: { id: staffId },
            data: {
              profileImageKey: saved.storageKey,
              profileImageUrl: saved.imageUrl || storeStaffProfileImagePath(staffId)
            }
          });
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
        const galleryImage = await prisma.storeStaffProfileImage.findFirst({
          where: { storeStaffId: staffId, storageKey: existing.profileImageKey }
        });
        if (galleryImage) {
          await removeStoreStaffProfileImage(staffId, galleryImage.id);
        } else {
          await deleteProfileImageFile(existing.profileImageKey);
          await prisma.storeStaff.update({
            where: { id: staffId },
            data: { profileImageKey: null, profileImageUrl: null }
          });
        }
        await writeStoreStaffAuditLog({
          actorStoreStaffId: staffId,
          actorStoreRole: staffActor.role,
          action: 'store_staff.profile_image.delete',
          targetType: 'StoreStaff',
          targetId: staffId,
          summary: 'Store staff profile image removed.',
          metadata: { storageKey: existing.profileImageKey }
        });
      } else {
        await prisma.storeStaff.update({
          where: { id: staffId },
          data: { profileImageUrl: null }
        });
      }

      const updated = await prisma.storeStaff.findUniqueOrThrow({
        where: { id: staffId },
        select: { profileImageUrl: true }
      });
      res.json({ message: 'Profile photo removed.', profileImageUrl: updated.profileImageUrl });
    })
  );

  router.get(
    '/me/profile-images',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const storeStaffId = getStoreStaff(req).staffId;
      const images = await prisma.storeStaffProfileImage.findMany({
        where: { storeStaffId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
      });
      res.json({
        images: await Promise.all(images.map((image) => storeStaffProfileImageJson(image))),
        limit: MAX_USER_PROFILE_IMAGES
      });
    })
  );

  router.post(
    '/me/profile-images',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const staffActor = getStoreStaff(req);
      const storeStaffId = staffActor.staffId;
      let saved: Awaited<ReturnType<typeof saveStoreStaffProfileImage>> | null = null;
      try {
        const body = await parseProfileImageUpload(req);
        saved = await saveStoreStaffProfileImage({
          staffId: storeStaffId,
          mimeType: body.mimeType,
          fileName: body.fileName,
          data: body.data,
          uploadedById: storeStaffId
        });
        const image = await prisma.$transaction(async (tx) => {
          const count = await tx.storeStaffProfileImage.count({ where: { storeStaffId } });
          if (count >= MAX_USER_PROFILE_IMAGES) throw new Error('PROFILE_IMAGE_LIMIT');
          const isPrimary = count === 0;
          const created = await tx.storeStaffProfileImage.create({
            data: {
              storeStaffId,
              storageKey: saved!.storageKey,
              imageUrl: saved!.imageUrl,
              mimeType: saved!.mimeType,
              byteSize: saved!.byteSize,
              isPrimary
            }
          });
          if (isPrimary) {
            await tx.storeStaff.update({
              where: { id: storeStaffId },
              data: {
                profileImageKey: saved!.storageKey,
                profileImageUrl: saved!.imageUrl || storeStaffProfileImagePath(storeStaffId)
              }
            });
          }
          return created;
        });
        await writeStoreStaffAuditLog({
          actorStoreStaffId: storeStaffId,
          actorStoreRole: staffActor.role,
          action: 'store_staff.profile_image.gallery_upload',
          targetType: 'StoreStaffProfileImage',
          targetId: image.id,
          summary: 'Store staff added a profile gallery image.',
          metadata: { storageKey: saved.storageKey, isPrimary: image.isPrimary }
        });
        res.status(201).json({ image: await storeStaffProfileImageJson(image) });
      } catch (error) {
        if (saved) await deleteProfileImageFile(saved.storageKey).catch(() => null);
        if (error instanceof Error && error.message === 'PROFILE_IMAGE_LIMIT') {
          return res.status(409).json({
            message: `You can keep up to ${MAX_USER_PROFILE_IMAGES} profile photos.`
          });
        }
        const mapped = mapUploadError(error);
        return res.status(mapped.status).json({ message: mapped.message });
      }
    })
  );

  router.patch(
    '/me/profile-images/:imageId/primary',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const staffActor = getStoreStaff(req);
      const storeStaffId = staffActor.staffId;
      const image = await prisma.storeStaffProfileImage.findFirst({
        where: { id: routeParam(req, 'imageId'), storeStaffId }
      });
      if (!image) return res.status(404).json({ message: 'Profile photo not found.' });
      await prisma.$transaction(async (tx) => {
        await tx.storeStaffProfileImage.updateMany({
          where: { storeStaffId, isPrimary: true },
          data: { isPrimary: false }
        });
        await tx.storeStaffProfileImage.update({
          where: { id: image.id },
          data: { isPrimary: true }
        });
        await tx.storeStaff.update({
          where: { id: storeStaffId },
          data: {
            profileImageKey: image.storageKey,
            profileImageUrl: image.imageUrl || storeStaffProfileImagePath(storeStaffId)
          }
        });
      });
      await writeStoreStaffAuditLog({
        actorStoreStaffId: storeStaffId,
        actorStoreRole: staffActor.role,
        action: 'store_staff.profile_image.primary_change',
        targetType: 'StoreStaffProfileImage',
        targetId: image.id,
        summary: 'Store staff changed their primary profile photo.'
      });
      res.json({
        profileImageUrl: image.imageUrl || storeStaffProfileImagePath(storeStaffId)
      });
    })
  );

  router.delete(
    '/me/profile-images/:imageId',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const staffActor = getStoreStaff(req);
      const storeStaffId = staffActor.staffId;
      const removed = await removeStoreStaffProfileImage(storeStaffId, routeParam(req, 'imageId'));
      if (!removed) return res.status(404).json({ message: 'Profile photo not found.' });
      await writeStoreStaffAuditLog({
        actorStoreStaffId: storeStaffId,
        actorStoreRole: staffActor.role,
        action: 'store_staff.profile_image.gallery_delete',
        targetType: 'StoreStaffProfileImage',
        targetId: removed.id,
        summary: 'Store staff removed a profile gallery image.',
        metadata: { storageKey: removed.storageKey, wasPrimary: removed.isPrimary }
      });
      const staff = await prisma.storeStaff.findUniqueOrThrow({
        where: { id: storeStaffId },
        select: { profileImageUrl: true }
      });
      res.json({ message: 'Profile photo removed.', profileImageUrl: staff.profileImageUrl });
    })
  );

  router.get(
    '/me/profile-images/:imageId/file',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const storeStaffId = getStoreStaff(req).staffId;
      const image = await prisma.storeStaffProfileImage.findFirst({
        where: { id: routeParam(req, 'imageId'), storeStaffId },
        select: { storageKey: true }
      });
      if (!image) return res.status(404).json({ message: 'Profile photo not found.' });
      return serveProfileImage(image.storageKey, res);
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
