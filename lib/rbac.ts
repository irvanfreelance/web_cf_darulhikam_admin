import { query } from '@/lib/db';

export type AppModule = 'fins' | 'crm' | 'penyaluran';
export type ModuleRole = 'admin' | 'supervisor' | 'akunting' | 'staff' | 'zisco';

export async function getUserModuleRoles(userId: number): Promise<Record<string, ModuleRole>> {
  try {
    const res = await query(
      `SELECT module, role FROM user_module_roles WHERE user_id = $1`,
      [userId]
    );
    const map: Record<string, ModuleRole> = {};
    for (const row of res.rows) {
      map[row.module] = row.role;
    }
    return map;
  } catch {
    return {};
  }
}

export function isSuperadminRole(role: string | undefined | null): boolean {
  const r = (role || '').toLowerCase();
  return r === 'superadmin';
}

export async function getModuleRole(
  userId: number | undefined,
  globalRole: string | undefined,
  module: AppModule
): Promise<ModuleRole | null> {
  const g = (globalRole || '').toLowerCase();
  if (g === 'admin' || g === 'superadmin') return 'admin';
  if (!userId) return null;
  const roles = await getUserModuleRoles(userId);
  return roles[module] ?? null;
}

export function isModuleSupervisor(role: ModuleRole | null): boolean {
  return role === 'admin' || role === 'supervisor' || role === 'akunting';
}

