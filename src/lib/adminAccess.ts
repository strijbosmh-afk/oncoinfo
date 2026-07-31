interface AdminAccess {
  isAdmin: boolean;
  isApotheker: boolean;
  isSuperAdmin: boolean;
  permissions?: {
    can_add_treatments?: boolean;
    can_modify_treatments?: boolean;
    can_delete_treatments?: boolean;
  } | null;
}

export function canAccessAdminPortal({
  isAdmin,
  isApotheker,
  isSuperAdmin,
  permissions,
}: AdminAccess): boolean {
  return Boolean(
    isAdmin
    || isApotheker
    || isSuperAdmin
    || permissions?.can_add_treatments
    || permissions?.can_modify_treatments
    || permissions?.can_delete_treatments
  );
}
