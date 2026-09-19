// Copies the single-file build up to printvault/index.html, which is the
// artifact that actually gets opened and hosted.
import { copyFileSync, statSync } from "node:fs";
copyFileSync("dist/index.html", "../index.html");
const kb = (statSync("../index.html").size / 1024).toFixed(0);
console.log(`shipped ../index.html (${kb} KB)`);
