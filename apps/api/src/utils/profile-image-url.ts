export function userProfileImagePath(userId: string) {
  return `/profile-images/users/${userId}`;
}

export function storeStaffProfileImagePath(staffId: string) {
  return `/store/profile-images/${staffId}`;
}

export function enrichWithProfileImageUrl<T extends { id: string; profileImageKey?: string | null }>(
  entity: T,
  pathFor: (id: string) => string
) {
  const { profileImageKey, ...rest } = entity;
  return {
    ...rest,
    profileImageUrl: profileImageKey ? pathFor(entity.id) : null
  };
}
