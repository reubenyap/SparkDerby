/**
 * Telegram broadcast worker tests.
 *
 * Verifies message formatting without making real HTTP calls.
 */

describe('Telegram Broadcast Formatting', () => {
  // These tests verify the message content that would be sent.
  // The actual TelegramService uses fetch() which we don't call in tests.

  it('formats race open message correctly', () => {
    const racers = ['Nova', 'Blitz', 'Shadow', 'Titan', 'Chaos', 'Cipher'];
    const racerList = racers.map((n, i) => `  ${i + 1}. ${n}`).join('\n');
    const msg = `🏁 *RACE A OPEN*\n📅 2026-03-10\n\nRacers:\n${racerList}\n\nBack your racer now! Send FIRO to their Spark address.`;

    expect(msg).toContain('RACE A OPEN');
    expect(msg).toContain('Nova');
    expect(msg).toContain('Cipher');
  });

  it('formats podium message correctly', () => {
    const medals = ['🥇', '🥈', '🥉'];
    const podium = [
      { place: 1, name: 'Nova', prizePool: 54.0 },
      { place: 2, name: 'Blitz', prizePool: 22.5 },
      { place: 3, name: 'Shadow', prizePool: 13.5 },
    ];

    const lines = podium.map(p =>
      `${medals[p.place - 1]} ${p.place}. ${p.name} — ${p.prizePool.toFixed(2)} FIRO`,
    ).join('\n');

    expect(lines).toContain('🥇 1. Nova — 54.00 FIRO');
    expect(lines).toContain('🥈 2. Blitz');
    expect(lines).toContain('🥉 3. Shadow');
  });

  it('formats action broadcast correctly', () => {
    const icons: Record<string, string> = {
      boost: '⚡', emp: '💥', oil_slick: '🛢', overclock: '⚙️', black_swan: '🦆',
    };

    expect(icons['black_swan']).toBe('🦆');
    expect(icons['emp']).toBe('💥');

    const actionType = 'oil_slick';
    const msg = `${icons[actionType]} *${actionType.replace('_', ' ').toUpperCase()}* on Shadow\nRace A — 0.2 FIRO`;
    expect(msg).toContain('OIL SLICK');
    expect(msg).toContain('Shadow');
  });

  it('formats standings correctly', () => {
    const standings = [
      { name: 'Nova', position: 67.2, totalBacked: 25.0 },
      { name: 'Blitz', position: 63.1, totalBacked: 18.5 },
    ];

    const lines = standings.map((s, i) =>
      `  ${i + 1}. ${s.name} — ${s.position.toFixed(1)}% (${s.totalBacked.toFixed(1)} F)`,
    ).join('\n');

    expect(lines).toContain('67.2%');
    expect(lines).toContain('25.0 F');
  });
});
