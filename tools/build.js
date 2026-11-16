// Builds the other versions of the page from index.html (Layout A, the source of truth):
//   draft-b/index.html            Layout B ("guided"), for GitHub Pages
//   dist/water-records-finder.html     Layout A for the claude.ai preview (no <html>/<head>/<body>)
//   dist/water-records-finder-b.html   Layout B for the claude.ai preview
// Run:  node tools/build.js [claude.ai link for Layout B]
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
let src = fs.readFileSync(path.join(root, "index.html"), "utf8");
const artB = process.argv[2];
if (artB) src = src.replace("__ART_B__", artB);
fs.writeFileSync(path.join(root, "index.html"), src);

const guided = src
  .replace('<html lang="en">', '<html lang="en" data-layout="guided">')
  .replace("<title>Water Records Finder</title>", "<title>Water Records Finder B</title>");
fs.mkdirSync(path.join(root, "draft-b"), { recursive: true });
fs.writeFileSync(path.join(root, "draft-b", "index.html"), guided);

// claude.ai preview versions: the host adds its own <html>/<head>/<body>.
const strip = (html, layout) => {
  let out = html.replace(/<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/i, "")
    .replace("</head>\n<body>\n", "").replace("</body>\n</html>\n", "");
  if (layout === "guided") out = out.replace("<script>\n", '<script>\ndocument.documentElement.dataset.layout = "guided";\n');
  return out;
};
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist", "water-records-finder.html"), strip(src, "classic"));
fs.writeFileSync(path.join(root, "dist", "water-records-finder-b.html"), strip(guided, "guided"));
console.log("built draft-b/index.html and dist/");
