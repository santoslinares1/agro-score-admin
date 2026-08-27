import { generationStatusLabel, generationStatusTone } from './technical-verdict-labels';

// Fix (auditoría final pre-demo): generationStatusLabel devolvía el enum crudo en inglés
// ("generated"/"failed"/"pending") — sin tests previos que lo cubrieran. Ver
// analysis.component.html / scheduled-analysis.component.html para dónde se consume.
describe('generationStatusLabel', () => {
  it('traduce "generated" a "Generado"', () => {
    expect(generationStatusLabel('generated')).toBe('Generado');
  });

  it('traduce "failed" a "Falló"', () => {
    expect(generationStatusLabel('failed')).toBe('Falló');
  });

  it('traduce "pending" a "Sin veredicto"', () => {
    expect(generationStatusLabel('pending')).toBe('Sin veredicto');
  });

  it('nunca devuelve el string crudo en inglés para ninguno de los 3 estados', () => {
    (['generated', 'failed', 'pending'] as const).forEach((status) => {
      expect(generationStatusLabel(status)).not.toBe(status);
    });
  });
});

describe('generationStatusTone', () => {
  it('mantiene tonos distintos por estado (success/error/info)', () => {
    expect(generationStatusTone('generated')).toBe('success');
    expect(generationStatusTone('failed')).toBe('error');
    expect(generationStatusTone('pending')).toBe('info');
  });
});
