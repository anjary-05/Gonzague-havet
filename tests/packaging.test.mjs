import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { expect, it } from "vitest";

const tool = join(process.cwd(), "tools", "onirtech-template.mjs");

// Régression d'emballage : une archive contenant l'ancienne arborescence
// `chatbot-expert-ia/` exposait deux manifestes (1.5.0 à la racine, 1.3.25
// imbriqué). Les importateurs officiels ne lisent que le manifeste racine ;
// le dossier legacy polluait l'archive sans être le bundle exécuté.
it("n'embarque pas l'arborescence legacy dans l'archive packée", () => {
  const dir = mkdtempSync(join(tmpdir(), "onirtech-pack-"));
  try {
    const manifest = {
      schemaVersion: 1,
      kind: "template",
      id: "fixture",
      name: "Fixture",
      version: "9.9.9",
      compatibility: { hostProtocol: "onirtech.template-host.v1" },
      ui: {
        mode: "web-component",
        entry: "./dist/index.js",
        element: "x-fixture",
        shadowDom: "open",
        integrity: "",
      },
    };
    mkdirSync(join(dir, "dist"));
    writeFileSync(join(dir, "dist", "index.js"), "customElements.define('x-fixture', class {})");
    writeFileSync(join(dir, "onirtech.template.json"), JSON.stringify(manifest));
    mkdirSync(join(dir, "chatbot-expert-ia"));
    writeFileSync(
      join(dir, "chatbot-expert-ia", "onirtech.template.json"),
      JSON.stringify({ ...manifest, version: "1.3.25" }),
    );

    execFileSync(process.execPath, [tool, "pack", "."], { cwd: dir, stdio: "pipe" });

    const archive = join(dir, "release", "fixture-9.9.9.onirtech-template");
    const zip = unzipSync(new Uint8Array(readFileSync(archive)));
    const names = Object.keys(zip);
    expect(names).toContain("onirtech.template.json");
    expect(names.filter((name) => name.startsWith("chatbot-expert-ia/"))).toEqual([]);
    expect(names.filter((name) => name.endsWith("onirtech.template.json"))).toEqual([
      "onirtech.template.json",
    ]);
    const packed = JSON.parse(new TextDecoder().decode(zip["onirtech.template.json"]));
    expect(packed.version).toBe("9.9.9");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
