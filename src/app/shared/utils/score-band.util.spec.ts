import { scoreBandLabel, scoreBandTone } from './score-band.util';

describe('score-band.util (Admin PR 5)', () => {
  it('score >= 70 → Favorable / success', () => {
    expect(scoreBandLabel(72)).toBe('Favorable');
    expect(scoreBandTone(72)).toBe('success');
    expect(scoreBandLabel(70)).toBe('Favorable');
  });

  it('40 <= score < 70 → Variable / warning', () => {
    expect(scoreBandLabel(41)).toBe('Variable');
    expect(scoreBandTone(41)).toBe('warning');
    expect(scoreBandLabel(40)).toBe('Variable');
  });

  it('score < 40 → Bajo desempeño / error', () => {
    expect(scoreBandLabel(20)).toBe('Bajo desempeño');
    expect(scoreBandTone(20)).toBe('error');
    expect(scoreBandLabel(0)).toBe('Bajo desempeño');
  });
});
