import { describe, expect, it } from 'vitest';
import { SCORING } from '@/config/gameConfig';
import type { CaseData } from '@/data/schema';
import { gradeFor, maxPossibleScore, scoreCase, timeBonus } from '@/systems/scoring';

const rugCase: CaseData = {
  id: 'test-rug',
  title: 'Test',
  ticker: '$TEST',
  pitch: 'pitch',
  difficulty: 1,
  verdict: 'rug',
  timeLimitSec: 100,
  debrief: 'debrief',
  documents: [
    {
      type: 'contract',
      title: 'Contract',
      content: { fileName: 'a.sol', verified: true, lines: ['a', 'b', 'c'] },
      clues: [
        {
          id: 'f1',
          label: 'mint',
          flagId: 'mint-unlimited',
          finePrint: false,
          anchor: { kind: 'line', line: 0 },
        },
        {
          id: 'f2',
          label: 'fine',
          flagId: 'honeypot',
          finePrint: true,
          text: 'x',
          anchor: { kind: 'line', line: 1 },
        },
        {
          id: 'h1',
          label: 'herring',
          herring: true,
          herringId: 'small-fixed-tax',
          finePrint: false,
          anchor: { kind: 'line', line: 2 },
        },
      ],
    },
    {
      type: 'chat',
      title: 'Chat',
      content: {
        channel: 'c',
        messages: [{ user: 'u', role: 'member', time: '1', text: 'hi', deleted: false }],
      },
      clues: [
        {
          id: 'f3',
          label: 'urgency',
          flagId: 'urgency-pressure',
          finePrint: false,
          anchor: { kind: 'message', index: 0 },
        },
      ],
    },
  ],
};

describe('scoreCase', () => {
  it('awards the correct verdict and every real flag', () => {
    const r = scoreCase({
      caseData: rugCase,
      verdict: 'rug',
      pins: { clueIds: ['f1', 'f2', 'f3'], strayPins: 0 },
      timeLeftSec: null,
    });
    expect(r.verdictCorrect).toBe(true);
    expect(r.verdictPoints).toBe(SCORING.correctVerdict);
    expect(r.flagPoints).toBe(SCORING.realFlagPinned * 3 + SCORING.finePrintBonus);
    expect(r.penaltyPoints).toBe(0);
    expect(r.timeBonus).toBe(0);
    expect(r.total).toBe(100 + 75 + 10);
    expect(r.maxPossible).toBe(185);
    expect(r.grade).toBe('S');
    expect(r.flagsFound.map((f) => f.clue.id)).toEqual(['f1', 'f2', 'f3']);
    expect(r.flagsMissed).toHaveLength(0);
  });

  it('penalises wrong verdicts, herrings and stray pins', () => {
    const r = scoreCase({
      caseData: rugCase,
      verdict: 'legit',
      pins: { clueIds: ['h1'], strayPins: 2 },
      timeLeftSec: null,
    });
    expect(r.verdictCorrect).toBe(false);
    expect(r.verdictPoints).toBe(SCORING.wrongVerdict);
    expect(r.falseAccusations.map((f) => f.clue.id)).toEqual(['h1']);
    expect(r.strayPins).toBe(2);
    expect(r.penaltyPoints).toBe(SCORING.falseAccusation * 3);
    expect(r.flagsMissed).toHaveLength(3);
    // Never below zero.
    expect(r.total).toBe(0);
    expect(r.grade).toBe('D');
  });

  it('adds a time bonus proportional to time left in timed mode', () => {
    const r = scoreCase({
      caseData: rugCase,
      verdict: 'rug',
      pins: { clueIds: [], strayPins: 0 },
      timeLeftSec: 50,
    });
    expect(r.timeBonus).toBe(SCORING.timeBonusMax / 2);
    expect(r.maxPossible).toBe(maxPossibleScore(rugCase, true));
    expect(maxPossibleScore(rugCase, true)).toBe(
      maxPossibleScore(rugCase, false) + SCORING.timeBonusMax,
    );
  });

  it('multiplies in hard mode and keeps the grade scale consistent', () => {
    const r = scoreCase({
      caseData: rugCase,
      verdict: 'rug',
      pins: { clueIds: ['f1', 'f2', 'f3'], strayPins: 0 },
      timeLeftSec: null,
      hardMode: true,
    });
    expect(r.multiplier).toBe(SCORING.hardModeMultiplier);
    expect(r.total).toBe(Math.round(185 * SCORING.hardModeMultiplier));
    expect(r.maxPossible).toBe(Math.round(185 * SCORING.hardModeMultiplier));
    expect(r.grade).toBe('S');
  });

  it('charges for hints', () => {
    const r = scoreCase({
      caseData: rugCase,
      verdict: 'rug',
      pins: { clueIds: [], strayPins: 0, hintsUsed: 2 },
      timeLeftSec: null,
    });
    expect(r.hintPoints).toBe(SCORING.hintCost * 2);
    expect(r.total).toBe(SCORING.correctVerdict + SCORING.hintCost * 2);
  });

  it('ignores pins for ids that do not exist', () => {
    const r = scoreCase({
      caseData: rugCase,
      verdict: 'rug',
      pins: { clueIds: ['nope'], strayPins: 0 },
      timeLeftSec: null,
    });
    expect(r.flagsFound).toHaveLength(0);
    expect(r.falseAccusations).toHaveLength(0);
    expect(r.total).toBe(SCORING.correctVerdict);
  });
});

describe('timeBonus / gradeFor', () => {
  it('clamps time bonus to [0, max]', () => {
    expect(timeBonus(null, 100)).toBe(0);
    expect(timeBonus(-5, 100)).toBe(0);
    expect(timeBonus(500, 100)).toBe(SCORING.timeBonusMax);
    expect(timeBonus(10, 0)).toBe(0);
  });
  it('maps percentages to letter grades', () => {
    expect(gradeFor(100, 100)).toBe('S');
    expect(gradeFor(95, 100)).toBe('S');
    expect(gradeFor(80, 100)).toBe('A');
    expect(gradeFor(60, 100)).toBe('B');
    expect(gradeFor(40, 100)).toBe('C');
    expect(gradeFor(10, 100)).toBe('D');
    expect(gradeFor(0, 0)).toBe('D');
  });
});
