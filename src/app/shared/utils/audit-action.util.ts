import { AdminAuditAction } from '../../core/models/audit-log.model';

// ADMIN-2: labels legibles para el listado de auditoría. Una acción nueva
// que el backend agregue y esta lista no conozca simplemente se muestra
// tal cual (fallback en getAuditActionLabel), no rompe nada.
const AUDIT_ACTION_LABELS: Record<string, string> = {
  'admin.user.created': 'Usuario creado',
  'admin.user.updated': 'Usuario editado',
  'admin.user.deactivated': 'Usuario desactivado',
  'admin.user.role_changed': 'Rol de usuario cambiado',
  'admin.access_request.updated': 'Solicitud de acceso actualizada',
  'admin.access_request.converted': 'Solicitud convertida en usuario',
  'admin.invitation.created': 'Invitación creada',
  'admin.password_reset.created': 'Reset de contraseña generado',
  'admin.analysis.retry_requested': 'Reintento de diagnóstico solicitado',
  'admin.analysis.marked_reviewed': 'Diagnóstico marcado como revisado',
};

const AUDIT_ACTION_KNOWN: ReadonlySet<AdminAuditAction> = new Set(
  Object.keys(AUDIT_ACTION_LABELS),
);

export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function getKnownAuditActions(): string[] {
  return Array.from(AUDIT_ACTION_KNOWN);
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: 'Usuario',
  access_request: 'Solicitud de acceso',
  analysis: 'Diagnóstico',
  invitation: 'Invitación',
};

export function getTargetTypeLabel(targetType: string): string {
  return TARGET_TYPE_LABELS[targetType] ?? targetType;
}

export function getKnownTargetTypes(): string[] {
  return Object.keys(TARGET_TYPE_LABELS);
}
