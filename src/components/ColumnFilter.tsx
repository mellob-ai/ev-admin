import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FilterValue {
  type: 'enum' | 'text';
  value: string[] | string;
}

interface ColumnDef {
  key: string;
  label: string;
  type?: 'enum' | 'text' | string;
  accessor?: (row: Record<string, unknown>) => string;
}

type FiltersMap = Record<string, FilterValue>;

export interface FilterHook {
  filters: FiltersMap;
  open: boolean;
  setOpen: (open: boolean) => void;
  applyEnum: (key: string, vals: string[]) => void;
  applyText: (key: string, text: string) => void;
  clearKey: (key: string) => void;
  clearAll: () => void;
  match: (key: string, val: unknown) => boolean;
  isFiltered: (key: string) => boolean;
  anyFiltered: boolean;
  filterCount: number;
}

// ---------------------------------------------------------------------------
// useFilterPanel – manages filter state for the slide-in panel
// ---------------------------------------------------------------------------
export function useFilterPanel(): FilterHook {
  const [filters, setFilters] = useState<FiltersMap>({});
  const [open,    setOpen]    = useState(false);

  // Enum filter: array of selected exact values
  const applyEnum = (key: string, vals: string[]) =>
    setFilters((p) => ({ ...p, [key]: { type: 'enum', value: vals } }));

  // Text filter: partial/contains match string
  const applyText = (key: string, text: string) =>
    setFilters((p) => {
      if (!text.trim()) { const n = { ...p }; delete n[key]; return n; }
      return { ...p, [key]: { type: 'text', value: text } };
    });

  const clearKey = (key: string) =>
    setFilters((p) => { const n = { ...p }; delete n[key]; return n; });

  const clearAll = () => setFilters({});

  /** Returns true if row value passes the active filter for this key */
  const match = (key: string, val: unknown): boolean => {
    const f = filters[key];
    if (!f) return true;
    const str = String(val ?? '');
    if (f.type === 'text') return str.toLowerCase().includes((f.value as string ?? '').toLowerCase());
    return !(f.value as string[])?.length || (f.value as string[]).includes(str);
  };

  const isFiltered  = (key: string): boolean => { const f = filters[key]; return !!f && (f.type === 'text' ? !!(f.value as string)?.trim() : (f.value as string[])?.length > 0); };
  const anyFiltered = Object.keys(filters).some((k) => isFiltered(k));
  const filterCount = Object.keys(filters).filter((k) => isFiltered(k)).length;

  return { filters, open, setOpen, applyEnum, applyText, clearKey, clearAll, match, isFiltered, anyFiltered, filterCount };
}

// ---------------------------------------------------------------------------
// Internal: single collapsible section inside the panel
// ---------------------------------------------------------------------------
const AUTO_THRESHOLD = 12;

interface ColSectionProps { col: ColumnDef; data: Record<string, unknown>[]; hook: FilterHook; }

function ColSection({ col, data, hook }: ColSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [search,   setSearch]   = useState('');

  const get     = (row: Record<string, unknown>) => String(col.accessor ? col.accessor(row) : (row[col.key] ?? ''));
  const allVals = [...new Set(data.map(get).filter(Boolean))].sort();

  const type = col.type === 'text' ? 'text'
    : col.type === 'enum' ? 'enum'
    : (allVals.length <= AUTO_THRESHOLD ? 'enum' : 'text');

  const f          = hook.filters[col.key];
  const active     = hook.isFiltered(col.key);
  const selVals: string[]    = (f?.type === 'enum' ? f.value : []) as string[] ?? [];
  const allChecked = selVals.length === 0;
  const textVal    = f?.type === 'text' ? (f.value ?? '') as string : '';
  const shown      = search ? allVals.filter((v) => v.toLowerCase().includes(search.toLowerCase())) : allVals;
  const activeCount = f?.type === 'enum' ? (allChecked ? allVals.length : selVals.length) : (textVal ? 1 : 0);

  const toggleEnum = (val: string) => {
    if (selVals.length === 0) {
      hook.applyEnum(col.key, allVals.filter((v) => v !== val));
    } else {
      const next = selVals.includes(val)
        ? selVals.filter((v) => v !== val)
        : [...selVals, val];
      hook.applyEnum(col.key, next.length >= allVals.length ? [] : next);
    }
  };

  return (
    <div className={`fp-sec${active ? ' fp-sec-on' : ''}`}>
      <button className="fp-sec-head" onClick={() => setExpanded((p) => !p)}>
        <span className="fp-sec-lbl">
          <span className="fp-sec-name">{col.label}</span>
          <span className="fp-sec-meta">{type === 'enum' ? `${allVals.length} options` : 'Text match'}</span>
          {active && <span className="fp-dot" />}
        </span>
        {active && <span className="fp-sec-active">{activeCount}</span>}
        <i className={`fa fa-chevron-${expanded ? 'up' : 'down'}`} />
      </button>

      {expanded && (
        <div className="fp-sec-body">
          {type === 'enum' ? (
            <>
              <div className="fp-sec-tools">
                <button className="fp-mini-btn" onClick={(e) => { e.stopPropagation(); hook.clearKey(col.key); }}>
                  Select all
                </button>
                {active && (
                  <button className="fp-mini-btn" onClick={(e) => { e.stopPropagation(); hook.clearKey(col.key); }}>
                    Clear
                  </button>
                )}
              </div>
              {allVals.length > 6 && (
                <div className="fp-inner-search">
                  <i className="fa fa-magnifying-glass" />
                  <input type="text" placeholder="Search…" value={search}
                    onChange={(e) => setSearch(e.target.value)} />
                </div>
              )}
              <div className="fp-check-list">
                {shown.map((v) => (
                  <label key={v} className="fp-check-row">
                    <input type="checkbox"
                      checked={allChecked || selVals.includes(v)}
                      onChange={() => toggleEnum(v)} />
                    <span>{v}</span>
                  </label>
                ))}
                {shown.length === 0 && <span className="fp-none">No matches</span>}
              </div>
            </>
          ) : (
            <div className="fp-txt-row">
              <i className="fa fa-magnifying-glass" />
              <input type="text" placeholder="Search here..." value={textVal}
                onChange={(e) => hook.applyText(col.key, e.target.value)} />
              {textVal && (
                <button className="fp-txt-clr" onClick={() => hook.clearKey(col.key)}>
                  <i className="fa fa-xmark" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterPanel – slide-in right drawer
// ---------------------------------------------------------------------------
interface FilterPanelProps {
  hook: FilterHook;
  columns: ColumnDef[];
  data: Record<string, unknown>[];
}

export function FilterPanel({ hook, columns, data }: FilterPanelProps) {
  const [colSearch, setColSearch] = useState('');

  useEffect(() => {
    if (!hook.open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') hook.setOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [hook.open]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleCols = colSearch
    ? columns.filter((c) => c.label.toLowerCase().includes(colSearch.toLowerCase()))
    : columns;

  return (
    <>
      {/* Backdrop */}
      <div className={`fp-backdrop${hook.open ? ' fp-visible' : ''}`}
        onClick={() => hook.setOpen(false)} />

      {/* Drawer */}
      <aside className={`fp-drawer${hook.open ? ' fp-open' : ''}`} aria-label="Filter panel">
        <div className="fp-hd">
          <span className="fp-hd-title-wrap">
            <span className="fp-hd-title">Filters</span>
            <span className="fp-hd-sub">Refine table results</span>
          </span>
          <span className="fp-hd-right">
            {hook.anyFiltered && <span className="fp-hd-badge">{hook.filterCount}</span>}
          </span>
          <button className="fp-hd-close" onClick={() => hook.setOpen(false)}>
            <i className="fa fa-xmark" />
          </button>
        </div>

        <div className="fp-top-tools">
          <div className="fp-top-search">
            <i className="fa fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search fields..."
              value={colSearch}
              onChange={(e) => setColSearch(e.target.value)}
            />
          </div>
          <button className="fp-top-clear" onClick={hook.clearAll} disabled={!hook.anyFiltered}>
            Clear all
          </button>
        </div>

        <div className="fp-body">
          {visibleCols.map((col) => (
            <ColSection key={col.key} col={col} data={data} hook={hook} />
          ))}
          {visibleCols.length === 0 && <div className="fp-empty">No fields found</div>}
        </div>

        {hook.anyFiltered && (
          <div className="fp-ft">
            <button className="btn-outline fp-clear-all" onClick={hook.clearAll}>
              <i className="fa fa-rotate-left" /> Clear All Filters
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
