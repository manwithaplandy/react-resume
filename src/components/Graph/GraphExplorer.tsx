import dynamic from 'next/dynamic';
import {FC, memo, useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {match} from 'ts-pattern';

import {initialFocusId, resumeGraph} from '../../data/graphData';
import {KIND_LABELS} from '../../data/graphDef';
import FocusPanel from './FocusPanel';
import GraphListFallback from './GraphListFallback';
import {graphNavReducer, initialGraphNavState} from './graphReducer';
import GraphSkeleton from './GraphSkeleton';

// The 3D canvas (three + react-force-graph-3d) must never be evaluated during
// static export — strict ssr:false boundary.
/* eslint-disable react-memo/require-memo -- dynamic() loader thunk and loading callback are not component definitions */
const ResumeGraphCanvas = dynamic(() => import('./ResumeGraphCanvas'), {
  loading: () => <GraphSkeleton />,
  ssr: false,
});
/* eslint-enable react-memo/require-memo */

type RenderMode = 'detecting' | '3d' | 'list';

const HINT_DISMISSED_KEY = 'graphHintDismissed';

const PILL_BUTTON_CLASS =
  'pointer-events-auto rounded-full border border-neutral-700 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300 backdrop-blur-md hover:border-orange-500 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

const detectWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

const parseNodeHash = (hash: string): string | null => {
  const result = /^#node=(.+)$/.exec(hash);
  if (!result) {
    return null;
  }
  try {
    const id = decodeURIComponent(result[1]);
    return resumeGraph.nodeById.has(id) ? id : null;
  } catch {
    return null;
  }
};

/**
 * Owns the single navigation store that drives all three renderers (canvas,
 * focus card, text list), plus WebGL detection, the keyboard model,
 * URL-hash deep links, reduced-motion handling and the onboarding chrome.
 */
const GraphExplorer: FC = memo(() => {
  const [state, dispatch] = useReducer(graphNavReducer, initialFocusId, initialGraphNavState);
  const [capability, setCapability] = useState<'detecting' | 'supported' | 'unsupported' | 'performance'>('detecting');
  const [requestedView, setRequestedView] = useState<'3d' | 'list'>('3d');
  const mode: RenderMode =
    capability === 'detecting' ? 'detecting' : requestedView === 'list' || capability !== 'supported' ? 'list' : '3d';
  const listReason = requestedView === 'list' ? 'chosen' : capability === 'performance' ? 'performance' : 'unsupported';
  const textViewRef = useRef<HTMLButtonElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const threeViewRef = useRef<HTMLButtonElement>(null);
  const locationFocus = useRef<string | null | undefined>(undefined);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [manualReducedMotion, setManualReducedMotion] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const reducedMotion = systemReducedMotion || manualReducedMotion;
  // The role="application" container; the keyboard model only acts while focus
  // lives inside it, so arrows/Backspace stay free everywhere else.
  const applicationRef = useRef<HTMLDivElement>(null);

  // --- WebGL detect + hash deep link + hint state, once on mount ------------
  useEffect(() => {
    setCapability(detectWebGL() ? 'supported' : 'unsupported');
    setRequestedView(new URLSearchParams(window.location.search).get('view') === 'list' ? 'list' : '3d');
    const fromHash = parseNodeHash(window.location.hash);
    if (fromHash) {
      dispatch({id: fromHash, type: 'focusNode'});
    }
    try {
      setHintDismissed(window.localStorage.getItem(HINT_DISMISSED_KEY) === 'true');
    } catch {
      setHintDismissed(false);
    }
  }, []);

  // --- prefers-reduced-motion ------------------------------------------------
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // --- keyboard model: ←/→ scan, ↑ dive, ↓/Backspace back, Esc, Enter --------
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only act when focus is within the 3D application region; otherwise the
      // global arrow/Backspace capture would steal keys from the rest of the
      // page (and from the reducer-driven list fallback, which has its own
      // ordinary buttons). The container is focusable (tabIndex=0), so focusing
      // it or any child counts.
      const container = applicationRef.current;
      if (!container || !(document.activeElement && container.contains(document.activeElement))) {
        return;
      }
      // Let buttons, links and form fields keep their native keyboard behavior.
      if (event.target instanceof Element && event.target.closest('button, a, input, textarea, select')) {
        return;
      }
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          dispatch({direction: -1, type: 'cycleSibling'});
          break;
        case 'ArrowRight':
          event.preventDefault();
          dispatch({direction: 1, type: 'cycleSibling'});
          break;
        case 'ArrowUp':
          event.preventDefault();
          dispatch({type: 'enter'});
          break;
        case 'ArrowDown':
        case 'Backspace':
          event.preventDefault();
          dispatch({type: 'back'});
          break;
        case 'Enter':
          event.preventDefault();
          dispatch({type: 'expand'});
          break;
        case 'Escape':
          dispatch({type: 'escape'});
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- URL hash sync: deep links + browser Back navigates the focus trail ----
  const hashSyncedOnce = useRef(false);
  useEffect(() => {
    if (locationFocus.current === state.focusedId) {
      locationFocus.current = undefined;
      return;
    }
    const desired = state.focusedId ? `#node=${encodeURIComponent(state.focusedId)}` : '';
    const firstSync = !hashSyncedOnce.current;
    hashSyncedOnce.current = true;
    if (
      window.location.hash === desired ||
      (state.focusedId && parseNodeHash(window.location.hash) === state.focusedId)
    ) {
      return;
    }
    // A deep-link hash whose focusNode dispatch (mount effect) hasn't
    // committed yet must not be clobbered by the initial replaceState — once
    // it commits, this effect re-runs and finds hash === desired above.
    if (firstSync && parseNodeHash(window.location.hash)) {
      return;
    }
    const base = window.location.pathname + window.location.search;
    const url = desired ? `${base}${desired}` : base;
    // The pre-focused initial node replaces (not pushes) so the first Back
    // press leaves the page instead of just clearing the hash.
    if (firstSync) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
  }, [state.focusedId]);
  useEffect(() => {
    const handleLocationChange = () => {
      const view = new URLSearchParams(window.location.search).get('view') === 'list' ? 'list' : '3d';
      if (view !== requestedView && experienceRef.current?.contains(document.activeElement)) {
        (view === 'list' || capability !== 'supported' ? textViewRef : threeViewRef).current?.focus();
      }
      setRequestedView(view);
      const fromHash = parseNodeHash(window.location.hash);
      const target = fromHash ?? (window.location.hash ? initialFocusId : null);
      // A browser navigation already owns this URL. Do not push it back onto
      // history when its selection commits, including malformed fragments.
      locationFocus.current = target === state.focusedId ? undefined : target;
      dispatch(target ? {id: target, type: 'focusNode'} : {type: 'deselect'});
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [capability, requestedView, state.focusedId]);

  // --- debounced aria-live announcements -------------------------------------
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const focused = state.focusedId ? resumeGraph.nodeById.get(state.focusedId) : undefined;
      if (!focused) {
        setAnnouncement('Nothing selected. Overview of the full career graph.');
        return;
      }
      const neighbors = resumeGraph.adjacency.get(focused.id) ?? [];
      if (state.highlightedId) {
        const highlighted = resumeGraph.nodeById.get(state.highlightedId);
        const index = neighbors.indexOf(state.highlightedId);
        if (highlighted && index >= 0) {
          setAnnouncement(
            `Highlighting connection ${index + 1} of ${neighbors.length}: ${highlighted.label}${
              state.wrapped ? ' (wrapped around)' : ''
            }`,
          );
          return;
        }
      }
      setAnnouncement(`Focused on ${focused.label}, ${KIND_LABELS[focused.kind]}. ${neighbors.length} connections.`);
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [state.focusedId, state.highlightedId, state.wrapped]);

  const handleDismissHint = useCallback(() => {
    setHintDismissed(true);
    try {
      window.localStorage.setItem(HINT_DISMISSED_KEY, 'true');
    } catch {
      // The in-memory choice remains usable when storage is denied.
    }
  }, []);
  // Reopen the one-shot onboarding hint; the "Controls / ?" pill makes the
  // dismissed-forever hint recoverable.
  const handleShowHint = useCallback(() => {
    setHintDismissed(false);
    try {
      window.localStorage.removeItem(HINT_DISMISSED_KEY);
    } catch {
      // The in-memory choice remains usable when storage is denied.
    }
  }, []);
  // WebGL existing isn't the same as WebGL being usable — the canvas's FPS
  // probe reports back so a too-slow device falls back to the list view.
  const handlePerformanceFallback = useCallback(() => {
    threeViewRef.current?.focus();
    setCapability('performance');
  }, []);
  const handleChooseView = useCallback((view: '3d' | 'list') => {
    setRequestedView(view);
    const url = new URL(window.location.href);
    if (url.searchParams.get('view') !== view) {
      url.searchParams.set('view', view);
      window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);
  const handleTextView = useCallback(() => handleChooseView('list'), [handleChooseView]);
  const handleThreeView = useCallback(() => handleChooseView('3d'), [handleChooseView]);
  const handleToggleLegend = useCallback(() => setLegendOpen(open => !open), []);
  const handleToggleMotion = useCallback(() => setManualReducedMotion(value => !value), []);

  const breadcrumb = useMemo(() => {
    const trail = [...state.history, ...(state.focusedId ? [state.focusedId] : [])];
    return trail
      .map(id => resumeGraph.nodeById.get(id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));
  }, [state.history, state.focusedId]);

  const handleCrumbClick = useCallback((id: string) => dispatch({id, type: 'focusNode'}), []);

  return (
    <>
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      <div aria-label="Graph view" className="flex gap-x-2 px-4 pb-4 pt-40 sm:px-6" role="group">
        <button
          aria-pressed={mode === 'list'}
          className={PILL_BUTTON_CLASS}
          onClick={handleTextView}
          ref={textViewRef}
          type="button">
          Text view
        </button>
        <button
          aria-pressed={mode === '3d'}
          className={PILL_BUTTON_CLASS}
          onClick={handleThreeView}
          ref={threeViewRef}
          type="button">
          3D view
        </button>
      </div>

      {match(mode)
        .with('detecting', () => (
          <div className="relative h-[100svh]">
            <GraphSkeleton />
          </div>
        ))
        .with('3d', () => (
          <div className="relative h-[100svh] print:hidden" ref={experienceRef}>
            <div
              aria-label="Interactive 3D career graph. Use left and right arrows to scan connections, up arrow to dive in, down arrow to go back, Escape to deselect."
              aria-roledescription="3D career graph"
              className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
              ref={applicationRef}
              role="application"
              tabIndex={0}>
              <ResumeGraphCanvas
                dispatch={dispatch}
                onPerformanceFallback={handlePerformanceFallback}
                reducedMotion={reducedMotion}
                state={state}
              />
            </div>

            {/* Breadcrumb trail of focus history (last 3 crumbs). */}
            {breadcrumb.length > 0 && (
              <nav
                aria-label="Focus history"
                className="pointer-events-auto absolute left-3 top-36 z-20 flex max-w-[80vw] items-center gap-x-1 text-xs text-neutral-400 sm:left-6 sm:top-44">
                {breadcrumb.length > 3 && <span aria-hidden="true">… /</span>}
                {breadcrumb.slice(-3).map((crumb, index, visible) => (
                  <Crumb
                    id={crumb.id}
                    isLast={index === visible.length - 1}
                    key={`${crumb.id}-${index}`}
                    label={crumb.label}
                    onClick={handleCrumbClick}
                  />
                ))}
              </nav>
            )}

            {/* Collapsible legend, top-right. */}
            <div className="absolute right-3 top-16 z-20 flex flex-col items-end gap-y-2 sm:right-6 sm:top-20">
              <div className="flex items-center gap-x-2">
                {hintDismissed && (
                  <button
                    aria-label="Show controls hint"
                    className={PILL_BUTTON_CLASS}
                    onClick={handleShowHint}
                    type="button">
                    Controls ?
                  </button>
                )}
                <button
                  aria-expanded={legendOpen}
                  className={PILL_BUTTON_CLASS}
                  onClick={handleToggleLegend}
                  type="button">
                  {legendOpen ? 'Hide legend' : 'Legend'}
                </button>
              </div>
              {legendOpen && (
                <dl className="pointer-events-auto flex flex-col gap-y-1 rounded-xl border border-neutral-700 bg-neutral-900/80 p-4 text-xs text-neutral-300 backdrop-blur-md">
                  <LegendRow shape="●" text="Role (large sphere) · warm = recent" />
                  <LegendRow shape="◆" text="Certification (octahedron, yellow)" />
                  <LegendRow shape="○" text="Skill area (wireframe orb)" />
                  <LegendRow shape="•" text="Skill / tool (small sphere) · brighter = deeper" />
                  <LegendRow shape="▪" text="Highlight / achievement (cube)" />
                  <LegendRow shape="◇" text="Education (icosahedron)" />
                  <LegendRow shape="—" text="Orange = selected path · white ring = next (←/→)" />
                </dl>
              )}
              <button
                aria-pressed={manualReducedMotion}
                className={PILL_BUTTON_CLASS}
                onClick={handleToggleMotion}
                type="button">
                {reducedMotion ? 'Motion: reduced' : 'Reduce motion'}
              </button>
            </div>

            {/* Dismissible onboarding hint. */}
            {!hintDismissed && (
              <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4 sm:top-20">
                <div className="pointer-events-auto flex items-center gap-x-3 rounded-full border border-neutral-700 bg-neutral-900/80 px-4 py-2 text-xs text-neutral-300 backdrop-blur-md">
                  <span className="hidden sm:inline">Click a node · ←/→ scan connections · ↑ dive in · ↓ back</span>
                  <span className="sm:hidden">Tap a node · drag to orbit · use the card to scan & dive</span>
                  <button
                    aria-label="Dismiss hint"
                    className="text-neutral-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    onClick={handleDismissHint}
                    type="button">
                    ✕
                  </button>
                </div>
              </div>
            )}

            <FocusPanel dispatch={dispatch} state={state} />
          </div>
        ))
        .with('list', () => (
          <div className="pb-12" ref={experienceRef}>
            <GraphListFallback dispatch={dispatch} reason={listReason} state={state} />
          </div>
        ))
        .exhaustive()}
    </>
  );
});

const Crumb: FC<{id: string; label: string; isLast: boolean; onClick: (id: string) => void}> = memo(
  ({id, label, isLast, onClick}) => {
    const handleClick = useCallback(() => onClick(id), [id, onClick]);
    return (
      <span className="flex items-center gap-x-1">
        <button
          aria-current={isLast ? 'true' : undefined}
          className={`pointer-events-auto max-w-[10rem] truncate rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            isLast ? 'font-medium text-orange-400' : 'hover:text-white'
          }`}
          onClick={handleClick}
          type="button">
          {label}
        </button>
        {!isLast && <span aria-hidden="true">/</span>}
      </span>
    );
  },
);

const LegendRow: FC<{shape: string; text: string}> = memo(({shape, text}) => (
  <div className="flex items-baseline gap-x-2">
    <dt aria-hidden="true" className="w-4 text-center text-neutral-400">
      {shape}
    </dt>
    <dd>{text}</dd>
  </div>
));

GraphExplorer.displayName = 'GraphExplorer';
Crumb.displayName = 'Crumb';
LegendRow.displayName = 'LegendRow';
export default GraphExplorer;
