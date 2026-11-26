import { useSearchParams } from 'react-router';

/**
 * A dashboard tab stored in the URL (?tab=cars), so menus can link straight to it and Back/refresh keep it.
 * Unknown values fall back to the first tab.
 */
export function useTabParam<T extends string>(tabs: readonly T[]): [T, (tab: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab = tabs.includes(raw as T) ? (raw as T) : tabs[0];
  const setTab = (next: T) => setParams(next === tabs[0] ? {} : { tab: next }, { replace: true });
  return [tab, setTab];
}
