import { describe, it, expect } from 'vitest';
import {
  DESCRIPTORS,
  styleNotes,
  observedNotes,
  notePreferences,
  descriptorLabel,
} from './flavorNotes';

describe('styleNotes', () => {
  it('describes a root beer as a root beer', () => {
    expect(styleNotes('Root Beer', 'A&W')).toContain('sassafras');
    expect(styleNotes('Root Beer', 'A&W')).toContain('wintergreen');
  });

  it('tells birch beer apart from root beer', () => {
    expect(styleNotes('Birch Beer', "Boylan's")).toContain('birch');
    expect(styleNotes('Root Beer', "Boylan's")).not.toContain('birch');
  });

  it('says nothing about a soda it cannot classify, rather than guessing', () => {
    // The whole point: invented notes would feed the taste profile and the
    // recommendations, and there would be no way to tell them from real ones.
    expect(styleNotes('Fizzy Lifting Drink', 'Wonka')).toEqual([]);
  });
});

describe('observedNotes', () => {
  it('picks descriptors out of free text', () => {
    const notes = observedNotes(['Really creamy, quite sweet', 'smoky finish']);
    expect(notes.map((n) => n.id).sort()).toEqual(['creamy', 'smoky', 'sweet']);
  });

  it('counts one vote per rating, however many times a rater says it', () => {
    const notes = observedNotes(['sweet, too sweet, very sweet']);
    expect(notes.find((n) => n.id === 'sweet')!.count).toBe(1);
  });

  it('counts separate raters separately', () => {
    const notes = observedNotes(['sweet', 'so sweet', 'dry']);
    expect(notes.find((n) => n.id === 'sweet')!.count).toBe(2);
    expect(notes.find((n) => n.id === 'dry')!.count).toBe(1);
  });

  it('orders by how many people said it', () => {
    const notes = observedNotes(['sweet', 'sweet', 'smoky']);
    expect(notes[0].id).toBe('sweet');
  });

  it('ignores empty and missing notes', () => {
    expect(observedNotes([null, '', undefined as unknown as string])).toEqual([]);
  });

  it('reads "not too sweet" as dry, not as sweet', () => {
    const ids = observedNotes(['not too sweet']).map((n) => n.id);
    expect(ids).toContain('dry');
  });
});

describe('notePreferences', () => {
  const rated = [
    { name: 'Root Beer', brand: 'A&W',       score: 5,   notes: 'creamy and sweet' },
    { name: 'Root Beer', brand: 'Sprecher',  score: 4.5, notes: 'creamy, honey' },
    { name: 'Tonic',     brand: 'Fever-Tree', score: 2,  notes: 'bitter' },
    { name: 'Tonic',     brand: 'Schweppes',  score: 1.5, notes: 'very bitter' },
  ];

  it('scores the notes you actually like above the ones you do not', () => {
    const prefs = notePreferences(rated);
    const creamy = prefs.find((p) => p.id === 'creamy')!;
    const bitter = prefs.find((p) => p.id === 'bitter')!;
    expect(creamy.avg).toBeGreaterThan(bitter.avg);
  });

  it('ignores a note with only one soda behind it — that is noise, not a preference', () => {
    const prefs = notePreferences(rated);
    expect(prefs.find((p) => p.id === 'honey')).toBeUndefined();
  });

  it('counts how many sodas support each note', () => {
    const prefs = notePreferences(rated);
    expect(prefs.find((p) => p.id === 'creamy')!.sodas).toBe(2);
  });

  it('returns nothing when you have barely rated anything', () => {
    expect(notePreferences([{ name: 'Root Beer', brand: 'A&W', score: 5, notes: null }])).toEqual([]);
  });

  it('is ordered best-scoring first', () => {
    const prefs = notePreferences(rated);
    for (let i = 1; i < prefs.length; i++) {
      expect(prefs[i - 1].avg).toBeGreaterThanOrEqual(prefs[i].avg);
    }
  });
});

describe('descriptor vocabulary', () => {
  it('has unique ids', () => {
    const ids = DESCRIPTORS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to the id when a label is asked for something unknown', () => {
    expect(descriptorLabel('nope')).toBe('nope');
  });
});
