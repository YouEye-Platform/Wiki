import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";

const source = readFileSync(new URL("../src/lib/locale.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, resolveJsonModule: true } }).outputText;
const exports = {};
new Function("exports", "require", compiled)(exports, createRequire(new URL("../src/lib/locale.ts", import.meta.url)));

test("authorized supported locale propagates and untrusted or absent values fall back", () => {
  for (const locale of ["en", "ru", "es", "de", "fr"]) assert.equal(exports.resolveAppLocale(locale), locale);
  for (const value of [null, undefined, "", "../private", { locale: "ru" }]) {
    assert.equal(exports.resolveAppLocale(value), "en");
  }
  assert.deepEqual(["ru", "fr", undefined, "de"].map(exports.resolveAppLocale), ["ru", "fr", "en", "de"]);
});

test("request locale loads real bundled headings, with English fallback", async () => {
  const requestUrl = new URL("../src/i18n/request.ts", import.meta.url);
  const requestCode = ts.transpileModule(readFileSync(requestUrl, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const require = createRequire(requestUrl);
  const requestExports = {};
  new Function("require", "exports", requestCode)((id) => {
    if (id === "next-intl/server") return { getRequestConfig: (callback) => callback };
    if (id === "../lib/locale") return exports;
    if (id === "./runtime") return { getAppLocale: async () => "en" };
    return require(id);
  }, requestExports);
  for (const value of ["en", "ru", "fr", "es", "de", "../private", undefined]) {
    const config = await requestExports.default({ requestLocale: Promise.resolve(value) });
    const locale = exports.resolveAppLocale(value);
    assert.equal(config.locale, locale);
    assert.equal(config.messages.wiki.featuredArticle, require(`../../messages/${locale}.json`).wiki.featuredArticle);
    assert.ok(config.messages.wiki.readArticle);
  }
});

test("regional variants use a shipped base catalogue", () => {
  assert.equal(exports.resolveAppLocale("ru-RU"), "ru");
  assert.equal(exports.resolveAppLocale("FR-ca"), "fr");
});
