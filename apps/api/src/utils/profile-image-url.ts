import { assetAccessUrl } from '../services/asset-storage.js';

export function userProfileImagePath(userId: string) {
  return `/profile-images/users/${userId}`;
}

export function storeStaffProfileImagePath(staffId: string) {
  return `/store/profile-images/${staffId}`;
}

export function enrichWithProfileImageUrl<
  T extends { id: string; profileImageKey?: string | null; profileImageUrl?: string | null }
>(entity: T, pathFor: (id: string) => string) {
  const { profileImageKey, profileImageUrl, ...rest } = entity;
  return {
    ...rest,
    profileImageUrl: profileImageUrl || (profileImageKey ? pathFor(entity.id) : null)
  };
}

export async function enrichWithProfileImageAccessUrl<
  T extends { id: string; profileImageKey?: string | null; profileImageUrl?: string | null }
>(entity: T, pathFor: (id: string) => string) {
  const enriched = enrichWithProfileImageUrl(entity, pathFor);
  return {
    ...enriched,
    profileImageUrl: await assetAccessUrl(entity.profileImageKey, enriched.profileImageUrl)
  };
}
