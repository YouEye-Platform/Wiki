import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createTranslator } from "next-intl";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const code = ts.transpileModule(
  readFileSync(new URL("../src/components/layout/header-search-bar.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function renderSearch(locale, query) {
  const messages = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));
  const api = {};
  runInNewContext(code, {
    exports: api,
    require(id) {
      if (id === "next-intl") return {
        useTranslations: namespace => createTranslator({
          locale, messages, namespace, onError(error) { throw error; },
        }),
      };
      if (id === "next/navigation") return {
        useRouter: () => ({ push() {} }),
        usePathname: () => "/search",
        useSearchParams: () => new URLSearchParams({ q: query }),
      };
      return require(id);
    },
  });
  // The Wikipedia edition must not override the interface language.
  return renderToStaticMarkup(createElement(api.HeaderSearchBar, { lang: "ja" }));
}

for (const [locale, clear, search] of [
  ["en", "Clear search", "Search Wiki"],
  ["ru", "Очистить поиск", "Поиск в Вики"],
  ["es", "Borrar búsqueda", "Buscar en Wiki"],
  ["de", "Suche löschen", "Wiki durchsuchen"],
  ["fr", "Effacer la recherche", "Rechercher dans Wiki"],
]) {
  test(`header search exposes localized control names in ${locale}`, () => {
    const populated = renderSearch(locale, "Kepler");
    assert.ok(populated.includes(`type="button" aria-label="${clear}"`), `${locale}: clear search name`);
    assert.ok(populated.includes(`type="submit" aria-label="${search}"`), `${locale}: submit search name`);
    assert.ok(populated.includes('value="Kepler"'));

    const empty = renderSearch(locale, "");
    assert.ok(!empty.includes(`aria-label="${clear}"`), `${locale}: hide clear for an empty query`);
    assert.ok(empty.includes(`type="submit" aria-label="${search}"`));
  });
}
