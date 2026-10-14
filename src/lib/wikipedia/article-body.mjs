/**
 * Embed article content without the upstream document head. Its relative
 * ResourceLoader stylesheet URLs belong to Wikipedia, not the app origin.
 * Article fragments (including their scoped inline styles) remain intact.
 * @param {string} html
 * @returns {string}
 */
export function articleBody(html) {
  return html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1]
    ?? html.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, "");
}
