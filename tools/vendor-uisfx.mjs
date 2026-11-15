// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// Copies the uisfx browser bundle into app/ (the page loads plain ES modules, no bundler).   npm run vendor
import { readFileSync, writeFileSync } from "node:fs";
const v = JSON.parse(readFileSync("node_modules/uisfx/package.json", "utf8")).version;
const src = readFileSync("node_modules/uisfx/dist/index.js", "utf8").replace(/\/\/# sourceMappingURL=\S*/g, "").trimEnd();
writeFileSync("app/uisfx.js", `// uisfx ${v} (https://github.com/romainsimon/uisfx), MIT licensed code; its synthesized sounds are CC0. Vendored unchanged from\n// node_modules/uisfx/dist/index.js by \`npm run vendor\`. Not covered by this project's proprietary license.\n${src}\n`);
console.log(`app/uisfx.js <- uisfx ${v}`);
