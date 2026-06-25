"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

/**
 * Compact pill-shaped search bar rendered inside the WikiHeader.
 * Visible on all pages. Autocomplete suggestions via /api/wiki/suggest.
 */
export function HeaderSearchBar({ lang = "en" }: { lang?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Pre-fill from URL on search page
  const currentQuery = pathname === "/search" ? (searchParams.get("q") || "") : "";

  const [query, setQuery] = useState(currentQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync query when URL changes (e.g. clicking a search result then coming back)
  useEffect(() => {
    if (pathname === "/search") {
      setQuery(searchParams.get("q") || "");
    }
  }, [pathname, searchParams]);

  const navigate = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(q.trim())}&lang=${lang}`);
    },
    [lang, router],
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      navigate(query);
    },
    [query, navigate],
  );

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/wiki/suggest?q=${encodeURIComponent(q)}&lang=${lang}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    },
    [lang],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setQuery(v);
      setSelectedIndex(-1);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(v), 150);
    },
    [fetchSuggestions],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
      if (!showSuggestions || !suggestions.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((p) => (p < suggestions.length - 1 ? p + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((p) => (p > 0 ? p - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        navigate(suggestions[selectedIndex]);
      }
    },
    [showSuggestions, suggestions, selectedIndex, navigate],
  );

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search Wiki..."
            className="h-9 w-full rounded-full border border-input bg-background/50 pl-9 pr-16 text-sm text-foreground shadow-sm placeholder:text-muted-foreground outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-background"
          />
          {loading && (
            <Loader2 className="absolute right-10 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="absolute right-10 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Search className="h-3 w-3" />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-accent ${
                  i === selectedIndex ? "bg-accent" : ""
                }`}
                onMouseDown={() => navigate(s)}
              >
                <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                {s}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
