import { AdminField } from '../../core/models/field.model';
import {
  fieldAnalysisStatusLabel,
  fieldAnalysisStatusTone,
  fieldAttentionLabel,
  fieldAttentionTone,
  fieldMonitoringLabel,
  fieldMonitoringTone,
} from './field-status.util';

function buildField(overrides: Partial<AdminField> = {}): AdminField {
  return {
    id: 'field-1',
    name: 'Campo Norte',
    ownerId: 'user-1',
    ownerEmail: 'owner@example.com',
    ownerFullName: 'Owner Test',
    lotsCount: 3,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('field-status.util (Admin PR 5)', () => {
  describe('fieldAnalysisStatusLabel/Tone', () => {
    it('mapea los 5 estados a su label y tono', () => {
      expect(fieldAnalysisStatusLabel('without_analysis')).toBe('Sin diagnóstico');
      expect(fieldAnalysisStatusLabel('processing')).toBe('Procesando');
      expect(fieldAnalysisStatusLabel('completed')).toBe('Finalizado');
      expect(fieldAnalysisStatusLabel('error')).toBe('Error');
      expect(fieldAnalysisStatusLabel('attention')).toBe('Requiere atención');

      expect(fieldAnalysisStatusTone('completed')).toBe('success');
      expect(fieldAnalysisStatusTone('error')).toBe('error');
      expect(fieldAnalysisStatusTone('processing')).toBe('info');
      expect(fieldAnalysisStatusTone('attention')).toBe('warning');
      expect(fieldAnalysisStatusTone('without_analysis')).toBe('neutral');
    });

    it('trata analysisStatus undefined como "sin diagnóstico" (compatibilidad de backend)', () => {
      expect(fieldAnalysisStatusLabel(undefined)).toBe('Sin diagnóstico');
      expect(fieldAnalysisStatusTone(undefined)).toBe('neutral');
    });
  });

  describe('fieldAttentionLabel/Tone', () => {
    it('muestra "Sin datos" cuando el campo todavía no tiene ningún análisis', () => {
      const field = buildField({ analysisStatus: 'without_analysis', requiresAttention: false });
      expect(fieldAttentionLabel(field)).toBe('Sin datos');
      expect(fieldAttentionTone(field)).toBe('neutral');
    });

    it('muestra "Requiere atención" (error) cuando requiresAttention=true y hay análisis', () => {
      const field = buildField({ analysisStatus: 'error', requiresAttention: true });
      expect(fieldAttentionLabel(field)).toBe('Requiere atención');
      expect(fieldAttentionTone(field)).toBe('error');
    });

    it('muestra "OK" (success) cuando requiresAttention=false y hay análisis', () => {
      const field = buildField({ analysisStatus: 'completed', requiresAttention: false });
      expect(fieldAttentionLabel(field)).toBe('OK');
      expect(fieldAttentionTone(field)).toBe('success');
    });
  });

  describe('fieldMonitoringLabel/Tone', () => {
    it('"Activo" cuando weeklyMonitoring.active=true', () => {
      const field = buildField({ weeklyMonitoring: { active: true, scheduleId: 's-1', nextRunAt: null, lastRunAt: null, hasRuns: false } });
      expect(fieldMonitoringLabel(field)).toBe('Activo');
      expect(fieldMonitoringTone(field)).toBe('info');
    });

    it('"Inactivo" cuando no hay weeklyMonitoring o está desactivado', () => {
      expect(fieldMonitoringLabel(buildField())).toBe('Inactivo');
      expect(fieldMonitoringTone(buildField())).toBe('neutral');
    });
  });
});
