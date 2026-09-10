import { useCallback, useEffect, useState } from 'react';

const SEEN_KEY = 'bayle.whatsnew.lastSeenId';

// Compares a digest of the release notes baked in at build time against the
// one last read here, so working out whether to show the dot costs nothing —
// the notes themselves are only fetched when the panel opens.
export default function useWhatsNew() {
  const changelogId = process.env.NEXT_PUBLIC_CHANGELOG_ID;
  // `loaded` keeps the dot from flashing on the first paint, before the stored
  // value is known.
  const [{ loaded, seenId }, setSeen] = useState({
    loaded: false,
    seenId: null
  });

  useEffect(() => {
    let stored = null;
    try {
      stored = window.localStorage.getItem(SEEN_KEY);
    } catch (error) {
      stored = null;
    }
    setSeen({ loaded: true, seenId: stored });
  }, []);

  const markSeen = useCallback(() => {
    if (!changelogId) {
      return;
    }
    setSeen({ loaded: true, seenId: changelogId });
    try {
      window.localStorage.setItem(SEEN_KEY, changelogId);
    } catch (error) {
      // A browser refusing storage just means the dot comes back next visit.
    }
  }, [changelogId]);

  return {
    hasUnseen: loaded && !!changelogId && seenId !== changelogId,
    markSeen
  };
}
