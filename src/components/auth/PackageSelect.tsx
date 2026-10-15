"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Icon from "@/components/ui/Icon";
import { filterAvailablePackageGroups, findPackage, formatPackagePrice, packageGroups, type PackageOption } from "@/data/packages";

interface PackageSelectProps {
  id: string;
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
  /** Ids of the packages active in the database. Only these are offered. */
  availableIds: readonly string[];
}

/** Package picker: searchable, grouped and keyboard-friendly. The list opens in place and never has its own scrollbar. */
export default function PackageSelect({ id, value, onChange, invalid = false, availableIds }: PackageSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = findPackage(value);

  const offered = useMemo(() => filterAvailablePackageGroups(packageGroups, availableIds), [availableIds]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offered
      .map((group) => ({
        label: group.label,
        options: group.options.filter((option) => !q || `${option.name} ${option.detail ?? ""}`.toLowerCase().includes(q)),
      }))
      .filter((group) => group.options.length > 0);
  }, [query, offered]);

  const flat: PackageOption[] = groups.flatMap((group) => group.options);
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));

  // Close when the user clicks anywhere outside the picker
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function openPicker() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  function choose(option: PackageOption) {
    onChange(option.id);
    setOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(Math.min(activeIndex + 1, flat.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (event.key === "Enter" && flat[activeIndex]) {
      event.preventDefault();
      choose(flat[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`flex min-h-14 w-full items-center gap-3 rounded-xl border bg-white px-4 py-2.5 text-left shadow-[0_1px_2px_rgb(16_27_48/0.04)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-gold/70 focus:outline-none focus-visible:border-gold-dark focus-visible:ring-4 focus-visible:ring-gold/25 ${
          invalid ? "border-red-400" : open ? "border-gold-dark ring-4 ring-gold/25" : "border-line"
        }`}
      >
        <Icon name="file-check" className="h-[18px] w-[18px] shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-[0.9375rem] font-semibold text-ink">{selected.name}</span>
              {selected.detail && <span className="block text-[0.8125rem] text-muted">{selected.detail}</span>}
            </>
          ) : (
            <span className="text-[0.9375rem] text-muted/70">Choose a training package</span>
          )}
        </span>
        {selected && (
          <span className="shrink-0 rounded-lg bg-success-soft px-2.5 py-1 text-[0.8125rem] font-bold text-success">
            {formatPackagePrice(selected)}
          </span>
        )}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="rounded-2xl border border-line bg-white p-2 shadow-float">
          <div className="relative mb-2">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={`${id}-list`}
              aria-activedescendant={flat[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
              placeholder="Search packages"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className="h-10 w-full rounded-lg border border-line bg-page pl-10 pr-3 text-[0.875rem] text-ink placeholder:text-muted/70 focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25"
            />
          </div>

          <div id={`${id}-list`} role="listbox" aria-label="Training packages" className="flex flex-col">
            {groups.length === 0 && (
              <p className="px-3 py-6 text-center text-[0.875rem] text-muted">
                {offered.length === 0 ? "No packages are available for online registration right now." : "No packages match your search."}
              </p>
            )}
            {groups.map((group) => (
              <div key={group.label} role="group" aria-label={group.label} className="flex flex-col gap-0.5 pb-1">
                <p className="px-3 pb-1 pt-2 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-gold-ink">{group.label}</p>
                {group.options.map((option) => {
                  const index = flat.indexOf(option);
                  const isActive = index === activeIndex;
                  const isSelected = option.id === value;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      id={`${id}-option-${index}`}
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(option)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isActive ? "bg-page" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.875rem] font-medium text-ink">{option.name}</span>
                        {option.detail && <span className="block text-[0.75rem] text-muted">{option.detail}</span>}
                      </span>
                      <span className="shrink-0 text-right text-[0.875rem] font-bold tabular-nums text-ink">{formatPackagePrice(option)}</span>
                      <span
                        aria-hidden="true"
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                          isSelected ? "bg-gold text-ink" : "border border-line"
                        }`}
                      >
                        {isSelected && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
