import { useEffect, useState } from 'react';
import { api } from '../api';

// Loads data from the backend when a page opens.
// const { data, loading, error, reload } = useApi('/api/items?limit=6');
// - loading is true until the first answer arrives
// - reload() fetches again (e.g. after marking a notification as read)
// - when `path` changes (new search filters), it fetches again automatically
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // If the page closes or the path changes before the answer arrives, ignore that old answer
    let ignore = false;
    api(path)
      .then((data) => !ignore && setState({ data, error: '', loading: false }))
      .catch((err) => !ignore && setState({ data: null, error: err.message, loading: false }));
    return () => {
      ignore = true;
    };
  }, [path, reloadKey]);

  return { ...state, reload: () => setReloadKey((k) => k + 1) };
}
