// ADMIN-2: unión de las acciones conocidas hoy (ver AdminAuditAction en
// agro-score-api/src/admin/audit-log.service.ts) + string genérico como
// fallback — así una acción nueva agregada en el backend no rompe el
// tipado ni el render acá, solo pierde el label "lindo".
export type AdminAuditAction =
  | 'admin.user.created'
  | 'admin.user.updated'
  | 'admin.user.deactivated'
  | 'admin.user.role_changed'
  | 'admin.access_request.updated'
  | 'admin.access_request.converted'
  | 'admin.invitation.created'
  | 'admin.password_reset.created'
  | 'admin.analysis.retry_requested'
  | 'admin.analysis.marked_reviewed'
  | (string & {});

export interface AdminAuditLog {
  id: string;
  actorUserId: string | null;
  action: AdminAuditAction;
  targetType: string;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
