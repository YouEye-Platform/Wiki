import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

// Execute the actual route body: importing it must not read release metadata;
// each request must read again, even when the immutable build stays unchanged.
test("manifest reads accepted labels per request and preserves build identity", async () => {
  const source = readFileSync(new URL("../src/app/api/manifest/route.ts", import.meta.url), "utf8")
    .replace(/^import .*;\n/gm, "").replace("export async function GET", "async function GET");
  let accepted = null;
  let reads = 0;
  const context = vm.createContext({
    packageJson: {version:"1.2.3"},
    NextResponse: {json: value => value},
    process: {env:{npm_package_version:"obsolete-build-label"}},
    installedRelease: async (product, buildVersion) => {
      assert.equal(product, "wiki"); assert.equal(buildVersion, "1.2.3");
      reads++; return accepted;
    },
  });
  vm.runInContext(source, context);
  assert.equal(reads, 0);
  const unknown = await context.GET();
  assert.equal(unknown.version, "unknown");
  assert.equal(unknown.buildVersion, "1.2.3");
  for (const version of ["1.2.4-alpha.1", "1.2.4-beta.1", "1.2.4"]) {
    accepted = {version, buildVersion:"1.2.3"};
    const manifest = await context.GET();
    assert.equal(manifest.version, version);
    assert.equal(manifest.release, accepted);
    assert.equal(manifest.buildVersion, "1.2.3");
    assert.equal(manifest.id, "ye-wiki");
  }
  accepted = null;
  assert.equal((await context.GET()).version, "unknown");
  assert.equal(reads, 5);
});
