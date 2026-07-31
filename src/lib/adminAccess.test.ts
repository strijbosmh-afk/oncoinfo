import { describe, expect, it } from 'vitest';

import { canAccessAdminPortal } from './adminAccess';

describe('canAccessAdminPortal', () => {
  it.each([
    { isAdmin: true, isApotheker: false, isSuperAdmin: false },
    { isAdmin: false, isApotheker: true, isSuperAdmin: false },
    { isAdmin: false, isApotheker: false, isSuperAdmin: true },
  ])('allows portal roles', (access) => {
    expect(canAccessAdminPortal(access)).toBe(true);
  });

  it('allows users with a treatment-management permission', () => {
    expect(canAccessAdminPortal({
      isAdmin: false,
      isApotheker: false,
      isSuperAdmin: false,
      permissions: { can_modify_treatments: true },
    })).toBe(true);
  });

  it('rejects users without portal rights', () => {
    expect(canAccessAdminPortal({
      isAdmin: false,
      isApotheker: false,
      isSuperAdmin: false,
      permissions: { can_modify_treatments: false },
    })).toBe(false);
  });
});
