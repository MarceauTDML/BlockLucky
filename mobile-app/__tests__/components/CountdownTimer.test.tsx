import { formatRemainingTime } from '../../src/utils/date.util';

describe('CountdownTimer time calculation', () => {
  it('calcule les heures, minutes et secondes restantes avec padding', () => {
    const res = formatRemainingTime(3665);
    expect(res.hours).toBe('01');
    expect(res.minutes).toBe('01');
    expect(res.seconds).toBe('05');
  });

  it('ne descend jamais sous zero', () => {
    const res = formatRemainingTime(-50);
    expect(res.hours).toBe('00');
    expect(res.minutes).toBe('00');
    expect(res.seconds).toBe('00');
  });
});
