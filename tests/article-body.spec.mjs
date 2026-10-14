import test from "node:test";
import assert from "node:assert/strict";
import { articleBody } from "../src/lib/wikipedia/article-body.mjs";

test("full Wikipedia documents embed only article content", () => {
  const body = '<section><h2>History</h2><p>Article text</p><style>.article{color:inherit}</style></section>';
  const document = '<!DOCTYPE html><html><head><base href="https://en.wikipedia.org/wiki/">'
    + '<link rel="stylesheet" href="/w/load.php?modules=skins.vector.styles"></head><body class="mw-content-ltr">'
    + body + '</body></html>';
  assert.equal(articleBody(document), body);
});

test("fragments and case-insensitive document tags retain article content", () => {
  const fragment = '<section><p>Content</p><style>.mw{display:block}</style></section>';
  assert.equal(articleBody(fragment), fragment);
  assert.equal(articleBody('<HTML><HEAD><title>Title</title></HEAD><BODY>\n' + fragment + '\n</BODY></HTML>'), '\n' + fragment + '\n');
  assert.equal(articleBody('<head><link href="/w/load.php"></head>' + fragment), fragment);
});
