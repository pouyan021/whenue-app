import { loadSessions, type ClubSession, type SessionStore } from '../sessions';

function memoryStore(entries: Record<string, string> = {}): SessionStore & { entries: Record<string, string> } {
  return {
    entries,
    get: async (key) => entries[key] ?? null,
    set: async (key, value) => {
      entries[key] = value;
    },
    remove: async (key) => {
      delete entries[key];
    },
  };
}

const luna: ClubSession = {
  slug: 'luna',
  clinic: 'Luna',
  memberId: '7',
  token: 'token',
  expiresAt: '2026-11-01T00:00:00Z',
};

describe('loadSessions', () => {
  it('loads the clubs a person is signed in to, dropping expired ones', async () => {
    const store = memoryStore({
      'whenue.clubs': JSON.stringify(['luna', 'old', 'missing']),
      'whenue.club.luna': JSON.stringify(luna),
      'whenue.club.old': JSON.stringify({ ...luna, slug: 'old', expiresAt: '2026-01-01T00:00:00Z' }),
    });

    expect(await loadSessions(store, Date.parse('2026-10-27T00:00:00Z'))).toEqual([luna]);
  });

  it('starts empty when nothing or something unreadable is stored', async () => {
    expect(await loadSessions(memoryStore())).toEqual([]);
    expect(await loadSessions(memoryStore({ 'whenue.clubs': '{' }))).toEqual([]);
  });
});
