import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { PlayerId } from '../types/card';
import { PLAYER_IDS } from '../types/card';
import type { RoundResult, RankingDirection } from '../types/game';
import type { PlayerScores } from './types';
import { cumulativeScores, markerTally } from './round';
import { placementPoints } from './placement';
import { pentaTally, pentaStandings, champion } from './penta';
import { roundTo2dp } from './display';

// Seat aliases matching the worked examples.
const [FERDI, ADI, BUDI, CITA] = PLAYER_IDS as [PlayerId, PlayerId, PlayerId, PlayerId];

function scores(f: number, a: number, b: number, c: number): PlayerScores {
  return { [FERDI]: f, [ADI]: a, [BUDI]: b, [CITA]: c } as PlayerScores;
}

// ---------------------------------------------------------------------------
// Round recording
// ---------------------------------------------------------------------------

describe('cumulativeScores', () => {
  it('sums round scores per player', () => {
    const rounds: RoundResult[] = [
      { scores: scores(5, -2, 3, -1), winners: [FERDI], losers: [ADI] },
      { scores: scores(8, -4, 3, 4), winners: [FERDI], losers: [ADI] },
    ];
    expect(cumulativeScores(rounds)).toEqual(scores(13, -6, 6, 3));
  });

  it('is zero for no rounds', () => {
    expect(cumulativeScores([])).toEqual(scores(0, 0, 0, 0));
  });
});

describe('markerTally', () => {
  it('accumulates □ and ▼ across rounds, including multi-marker rounds', () => {
    const rounds: RoundResult[] = [
      { scores: scores(0, 0, 0, 0), winners: [FERDI, BUDI], losers: [CITA] }, // tied □
      { scores: scores(0, 0, 0, 0), winners: [BUDI], losers: [ADI, CITA] }, // tied ▼
    ];
    const { squares, triangles } = markerTally(rounds);
    expect(squares).toEqual(scores(1, 0, 2, 0));
    expect(triangles).toEqual(scores(0, 1, 0, 2));
  });

  it('awards nothing for an all-four-tied round (no winners, no losers)', () => {
    const rounds: RoundResult[] = [{ scores: scores(3, 3, 3, 3), winners: [], losers: [] }];
    const { squares, triangles } = markerTally(rounds);
    expect(squares).toEqual(scores(0, 0, 0, 0));
    expect(triangles).toEqual(scores(0, 0, 0, 0));
  });
});

// ---------------------------------------------------------------------------
// Worked examples (specs/mechanics/worked-examples.md) — the acceptance
// fixtures. An implementation that disagrees with one of these is wrong.
// ---------------------------------------------------------------------------

describe('worked example 4 — Seven (low), tie for 1st', () => {
  // Four rounds engineered to reproduce the fixture's cumulative scores and
  // markers exactly: totals 40/55/40/71, markers Ferdi 1□1▼, Adi —, Budi 2□,
  // Cita 1□3▼ (4□ and 4▼ total, as four rounds must produce).
  const rounds: RoundResult[] = [
    { scores: scores(10, 15, 10, 20), winners: [BUDI], losers: [CITA] },
    { scores: scores(10, 15, 10, 20), winners: [BUDI], losers: [CITA] },
    { scores: scores(10, 15, 10, 20), winners: [FERDI], losers: [CITA] },
    { scores: scores(10, 10, 10, 11), winners: [CITA], losers: [FERDI] },
  ];

  it('reproduces the fixture cumulative scores', () => {
    expect(cumulativeScores(rounds)).toEqual(scores(40, 55, 40, 71));
  });

  it('reproduces the fixture markers (4□, 4▼)', () => {
    const { squares, triangles } = markerTally(rounds);
    expect(squares).toEqual(scores(1, 0, 2, 1));
    expect(triangles).toEqual(scores(1, 0, 0, 3));
  });

  it('tallies placement 4/2/4/0 and penta 4/2/6/−2', () => {
    const { placement, markers, penta } = pentaTally(rounds, 'low');
    expect(placement).toEqual(scores(4, 2, 4, 0));
    expect(markers).toEqual(scores(0, 0, 2, -2));
    expect(penta).toEqual(scores(4, 2, 6, -2));
  });
});

describe('worked example 5 — Rumpun (high), three-way tie, rounding', () => {
  const totals = scores(12, 12, 12, -3);

  it('splits (5+3+2)/3 = 3.33… for the three tied, 0 for 4th', () => {
    const points = placementPoints(totals, 'high');
    expect(points[FERDI]).toBeCloseTo(10 / 3, 10);
    expect(points[ADI]).toBeCloseTo(10 / 3, 10);
    expect(points[BUDI]).toBeCloseTo(10 / 3, 10);
    expect(points[CITA]).toBe(0);
  });

  it('displays 3.33 each; displayed points total 9.99, not 10', () => {
    const points = placementPoints(totals, 'high');
    expect(roundTo2dp(points[FERDI])).toBe(3.33);
    const displayedTotal = PLAYER_IDS.reduce<number>((s, p) => s + roundTo2dp(points[p]), 0);
    expect(displayedTotal).toBeCloseTo(9.99, 10);
  });
});

// ---------------------------------------------------------------------------
// Placement — direction and specific tie shapes
// ---------------------------------------------------------------------------

describe('placementPoints — ranking direction', () => {
  it('high: highest total places 1st', () => {
    expect(placementPoints(scores(10, 7, 4, 1), 'high')).toEqual(scores(5, 3, 2, 0));
  });

  it('low: lowest total places 1st', () => {
    expect(placementPoints(scores(1, 4, 7, 10), 'low')).toEqual(scores(5, 3, 2, 0));
  });

  it('two-way tie for 2nd shares (3+2)/2 = 2.5; next is 4th', () => {
    // high: 10 > 5 = 5 > 1
    expect(placementPoints(scores(10, 5, 5, 1), 'high')).toEqual(scores(5, 2.5, 2.5, 0));
  });

  it('all four tied share 10/4 = 2.5 each', () => {
    expect(placementPoints(scores(9, 9, 9, 9), 'high')).toEqual(scores(2.5, 2.5, 2.5, 2.5));
  });
});

// ---------------------------------------------------------------------------
// Champion / shared victory
// ---------------------------------------------------------------------------

describe('champion', () => {
  it('single highest penta score wins', () => {
    expect(champion(scores(7, 1, 3, 0))).toEqual([FERDI]);
  });

  it('equal top scores share the victory', () => {
    expect(champion(scores(5, 5, 3, 0))).toEqual([FERDI, ADI]);
  });

  it('all equal is a four-way shared victory', () => {
    expect(champion(scores(2, 2, 2, 2))).toEqual([FERDI, ADI, BUDI, CITA]);
  });
});

describe('pentaStandings', () => {
  it('sums penta points across tallied games', () => {
    const a = pentaTally(
      [{ scores: scores(1, 2, 3, 4), winners: [CITA], losers: [FERDI] }],
      'high',
    );
    const b = pentaTally(
      [{ scores: scores(4, 3, 2, 1), winners: [FERDI], losers: [CITA] }],
      'high',
    );
    const standings = pentaStandings([a, b]);
    for (const p of PLAYER_IDS) {
      expect(standings[p]).toBeCloseTo(a.penta[p] + b.penta[p], 10);
    }
  });
});

// ---------------------------------------------------------------------------
// Property tests — the tie shapes are where the bugs live (scoring.md)
// ---------------------------------------------------------------------------

const arbTotals = fc
  .array(fc.integer({ min: -50, max: 50 }), { minLength: 4, maxLength: 4 })
  .map(([f, a, b, c]) => scores(f, a, b, c));

const arbDirection: fc.Arbitrary<RankingDirection> = fc.constantFrom('high', 'low');

describe('placementPoints — invariants (property)', () => {
  it('always distributes exactly 10 points, ties included', () => {
    fc.assert(
      fc.property(arbTotals, arbDirection, (totals, direction) => {
        const points = placementPoints(totals, direction);
        const sum = PLAYER_IDS.reduce<number>((s, p) => s + points[p], 0);
        expect(sum).toBeCloseTo(10, 10);
      }),
    );
  });

  it('equal totals always receive equal points', () => {
    fc.assert(
      fc.property(arbTotals, arbDirection, (totals, direction) => {
        const points = placementPoints(totals, direction);
        for (const p of PLAYER_IDS) {
          for (const q of PLAYER_IDS) {
            if (totals[p] === totals[q]) expect(points[p]).toBeCloseTo(points[q], 10);
          }
        }
      }),
    );
  });

  it('is monotonic: a better total never scores fewer points', () => {
    fc.assert(
      fc.property(arbTotals, arbDirection, (totals, direction) => {
        const points = placementPoints(totals, direction);
        for (const p of PLAYER_IDS) {
          for (const q of PLAYER_IDS) {
            const pBetter = direction === 'high' ? totals[p] > totals[q] : totals[p] < totals[q];
            if (pBetter) expect(points[p]).toBeGreaterThanOrEqual(points[q]);
          }
        }
      }),
    );
  });

  it('reversing direction reverses the ranking (negate totals ⇒ same points)', () => {
    fc.assert(
      fc.property(arbTotals, (totals) => {
        const high = placementPoints(totals, 'high');
        const negated = scores(-totals[FERDI], -totals[ADI], -totals[BUDI], -totals[CITA]);
        const low = placementPoints(negated, 'low');
        for (const p of PLAYER_IDS) expect(high[p]).toBeCloseTo(low[p], 10);
      }),
    );
  });
});
