import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

/** A member's sign-in to one clinic's club. Member tokens are per clinic. */
export type ClubSession = {
  slug: string;
  clinic: string;
  memberId: string;
  token: string;
  expiresAt: string;
};

/** Where sessions are kept: the device keychain on phones, localStorage on the web. */
export type SessionStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export const secureStore: SessionStore =
  Platform.OS === 'web'
    ? {
        get: async (key) => globalThis.localStorage?.getItem(key) ?? null,
        set: async (key, value) => globalThis.localStorage?.setItem(key, value),
        remove: async (key) => globalThis.localStorage?.removeItem(key),
      }
    : {
        get: (key) => SecureStore.getItemAsync(key),
        set: (key, value) => SecureStore.setItemAsync(key, value),
        remove: (key) => SecureStore.deleteItemAsync(key),
      };

// One entry per club, since the keychain is meant for small values, and an index of slugs.
const INDEX_KEY = 'whenue.clubs';
const sessionKey = (slug: string) => `whenue.club.${slug}`;

export async function loadSessions(store: SessionStore, now = Date.now()): Promise<ClubSession[]> {
  let slugs: string[] = [];
  try {
    slugs = JSON.parse((await store.get(INDEX_KEY)) ?? '[]');
  } catch {
    return [];
  }
  const sessions: ClubSession[] = [];
  for (const slug of slugs) {
    try {
      const raw = await store.get(sessionKey(slug));
      const session = raw ? (JSON.parse(raw) as ClubSession) : null;
      if (session && Date.parse(session.expiresAt) > now) sessions.push(session);
    } catch {
      // An unreadable entry is dropped; the member signs in again.
    }
  }
  return sessions;
}

async function saveIndex(store: SessionStore, sessions: ClubSession[]) {
  await store.set(INDEX_KEY, JSON.stringify(sessions.map((s) => s.slug)));
}

type Sessions = {
  ready: boolean;
  sessions: ClubSession[];
  session(slug: string): ClubSession | undefined;
  signIn(session: ClubSession): Promise<void>;
  signOut(slug: string): Promise<void>;
};

const SessionsContext = createContext<Sessions | null>(null);

export function SessionsProvider({
  children,
  store = secureStore,
  initial,
}: {
  children: ReactNode;
  store?: SessionStore;
  /** Skips loading from the store; for tests. */
  initial?: ClubSession[];
}) {
  const [sessions, setSessions] = useState<ClubSession[]>(initial ?? []);
  const [ready, setReady] = useState(initial !== undefined);

  useEffect(() => {
    if (initial !== undefined) return;
    let active = true;
    void loadSessions(store).then((loaded) => {
      if (!active) return;
      setSessions(loaded);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [store, initial]);

  const signIn = useCallback(
    async (session: ClubSession) => {
      const next = [...sessions.filter((s) => s.slug !== session.slug), session];
      setSessions(next);
      await store.set(sessionKey(session.slug), JSON.stringify(session));
      await saveIndex(store, next);
    },
    [sessions, store],
  );

  const signOut = useCallback(
    async (slug: string) => {
      const next = sessions.filter((s) => s.slug !== slug);
      setSessions(next);
      await store.remove(sessionKey(slug));
      await saveIndex(store, next);
    },
    [sessions, store],
  );

  const value = useMemo<Sessions>(
    () => ({ ready, sessions, session: (slug) => sessions.find((s) => s.slug === slug), signIn, signOut }),
    [ready, sessions, signIn, signOut],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const sessions = useContext(SessionsContext);
  if (!sessions) throw new Error('useSessions needs a SessionsProvider');
  return sessions;
}
