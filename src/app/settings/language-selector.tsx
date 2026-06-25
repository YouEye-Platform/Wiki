/**
 * Language Selector — Client component for choosing Wikipedia language
 */

"use client";

import { useState, useMemo } from "react";
import { Check, Search, Globe } from "lucide-react";

interface WikiLanguage {
  code: string;
  name: string;
  localName: string;
}

interface LanguageSelectorProps {
  languages: WikiLanguage[];
  currentLanguage: string;
}

export function LanguageSelector({
  languages,
  currentLanguage,
}: LanguageSelectorProps) {
  const [selected, setSelected] = useState(currentLanguage);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return languages;
    const q = search.toLowerCase();
    return languages.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.localName.toLowerCase().includes(q)
    );
  }, [languages, search]);

  const handleSelect = async (code: string) => {
    setSelected(code);
    setSaving(true);

    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { language: code } }),
      });
    } catch {
      // Revert on failure
      setSelected(currentLanguage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Current selection */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-accent/50 border border-border/40">
        <Globe className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          Current:{" "}
          {languages.find((l) => l.code === selected)?.localName ?? selected} (
          {selected})
        </span>
        {saving && (
          <span className="text-xs text-muted-foreground ml-auto">
            Saving...
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search languages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Language list */}
      <div className="max-h-80 overflow-y-auto rounded-lg border border-border/40">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No matching languages
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors ${
                  selected === lang.code ? "bg-accent/30" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{lang.localName}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {lang.name} ({lang.code})
                  </span>
                </div>
                {selected === lang.code && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
