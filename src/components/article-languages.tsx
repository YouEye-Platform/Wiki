/**
 * Article Language Switcher — Shows available languages for a Wikipedia article
 * as a horizontal list of language codes, similar to Wikipedia's interlanguage links.
 */

"use client";

import { useState } from "react";
import { Globe, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface ArticleLanguagesProps {
  title: string;
  currentLang: string;
  /** Array of {lang, title} from Wikipedia's langlinks */
  languages: Array<{ lang: string; title: string }>;
}

export function ArticleLanguages({
  title,
  currentLang,
  languages,
}: ArticleLanguagesProps) {
  const [expanded, setExpanded] = useState(false);

  if (languages.length === 0) return null;

  const shown = expanded ? languages : languages.slice(0, 10);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {shown.map((l) => (
        <Link
          key={l.lang}
          href={`/wiki/${encodeURIComponent(l.title.replace(/ /g, "_"))}?lang=${l.lang}`}
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            l.lang === currentLang
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border hover:border-primary/50 hover:text-primary text-muted-foreground"
          }`}
          title={l.title}
        >
          {l.lang}
        </Link>
      ))}
      {languages.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              +{languages.length - 10} more <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
