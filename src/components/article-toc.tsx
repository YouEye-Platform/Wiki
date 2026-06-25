/**
 * Table of Contents — Sticky sidebar on desktop, collapsible inline on mobile.
 *
 * Parses h2/h3 headings from the article HTML and renders as a
 * hierarchical navigation list with active-section highlighting.
 */

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, List } from "lucide-react";

interface TocEntry {
  id: string;
  text: string;
  level: number;
  number: string;
}

function parseEntries(html: string): TocEntry[] {
  const results: TocEntry[] = [];
  const regex = /<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2];
    const text = match[3].replace(/<[^>]*>/g, "").trim();
    if (text && id && !id.startsWith("mw-")) {
      results.push({ id, text, level, number: "" });
    }
  }

  // Fallback: headings with span.mw-headline
  if (results.length === 0) {
    const regex2 =
      /<h([23])[^>]*>.*?<span[^>]*class="mw-headline"[^>]*id="([^"]*)"[^>]*>([^<]*)<\/span>.*?<\/h[23]>/gi;
    while ((match = regex2.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const id = match[2];
      const text = match[3].trim();
      if (text && id) {
        results.push({ id, text, level, number: "" });
      }
    }
  }

  let h2Count = 0;
  let h3Count = 0;
  for (const entry of results) {
    if (entry.level === 2) {
      h2Count++;
      h3Count = 0;
      entry.number = `${h2Count}`;
    } else {
      h3Count++;
      entry.number = `${h2Count}.${h3Count}`;
    }
  }

  return results;
}

export function ArticleToc({ html }: { html: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState<string>("");
  const entries = useMemo(() => parseEntries(html), [html]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track which section is in view
  useEffect(() => {
    if (entries.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (intersections) => {
        for (const entry of intersections) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    for (const entry of entries) {
      const el = document.getElementById(entry.id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [entries]);

  if (entries.length < 3) return null;

  return (
    <>
      {/* Desktop: sticky sidebar — rendered by parent layout, this is the content */}
      <nav className="hidden lg:block" aria-label="Table of contents">
        <div className="flex items-center gap-2 mb-3 px-1">
          <List className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Contents
          </span>
        </div>
        <ol className="list-none space-y-0.5">
          {entries.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className={`text-[13px] leading-snug py-1 px-2 -mx-1 rounded-md block transition-colors ${
                  entry.level === 3 ? "pl-5" : ""
                } ${
                  activeId === entry.id
                    ? "text-primary bg-primary/5 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mobile: collapsible inline box */}
      <div className="lg:hidden mb-4 border border-border rounded-xl bg-card/60 shadow-sm overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/30 transition-colors"
        >
          <List className="h-4 w-4 text-muted-foreground" />
          <span>Contents</span>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
          )}
        </button>

        {isOpen && (
          <nav className="px-3.5 pb-3 pt-0.5">
            <ol className="list-none space-y-px">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className={entry.level === 3 ? "pl-4" : ""}
                >
                  <a
                    href={`#${entry.id}`}
                    className="text-[13px] text-primary hover:underline leading-relaxed inline-flex gap-1.5"
                  >
                    <span className="text-muted-foreground text-xs tabular-nums min-w-[1.5rem] text-right pt-px">
                      {entry.number}
                    </span>
                    {entry.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
    </>
  );
}
