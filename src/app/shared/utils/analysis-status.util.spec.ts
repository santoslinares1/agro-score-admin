import { AnalysisStatus } from '../../core/models/analysis.model';
import { analysisStatusLabel, analysisStatusTone } from './analysis-status.util';

describe('analysis-status.util (ADR-001)', () => {
  it('Queued tiene label "En cola" y el mismo tono no terminal que Procesando', () => {
    expect(analysisStatusLabel('Queued')).toBe('En cola');
    expect(analysisStatusTone('Queued')).toBe('info');
    expect(analysisStatusTone('Queued')).toBe(analysisStatusTone('Procesando'));
  });

  it('conserva labels y tonos existentes', () => {
    const cases: Array<[AnalysisStatus, string, string]> = [
      ['Procesando', 'Procesando', 'info'],
      ['Finalizado', 'Finalizado', 'success'],
      ['Error', 'Error', 'error'],
    ];

    for (const [status, label, tone] of cases) {
      expect(analysisStatusLabel(status)).toBe(label);
      expect(analysisStatusTone(status)).toBe(tone);
    }
  });

  it('null/undefined (p. ej. corrida programada sin análisis) no rompe', () => {
    expect(analysisStatusLabel(null)).toBe('');
    expect(analysisStatusTone(undefined)).toBe('neutral');
  });
});
