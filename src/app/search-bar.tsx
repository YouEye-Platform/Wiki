/**
 * SearchBar — Wikipedia-style search with autocomplete
 *
 * Centered search input with magnifying glass icon, matching Wikipedia's
 * search bar width and feel. Uses shadcn Input styling.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  lang?: string;
  initialQuery?: string;
}

export function SearchBar({ lang = "en", initialQuery = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/wiki/suggest?q=${encodeURIComponent(q)}&lang=${lang}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
        }
      } catch {
        // Silently fail
      }
    },
    [lang]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const handleSubmit = (q: string) => {
    if (!q.trim()) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}&lang=${lang}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSubmit(suggestions[selectedIndex]);
      } else {
        handleSubmit(query);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative flex">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search Wiki"
            className="w-full h-10 pl-10 pr-3 text-sm border border-border rounded-l-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all placeholder:text-muted-foreground/60"
            autoComplete="off"
          />
        </div>
        <button
          onClick={() => handleSubmit(query)}
          className="h-10 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-r-md hover:bg-primary/90 transition-colors border border-l-0 border-primary"
        >
          Search
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-0.5 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
          {suggestions.map((suggestion, i) => (
            <button
              key={suggestion}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center gap-2.5 ${
                i === selectedIndex ? "bg-accent/50" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSubmit(suggestion);
              }}
            >
              <Search className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
