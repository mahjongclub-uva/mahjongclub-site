import { mkdir, readFile, readdir, rename, stat } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = process.cwd();
const INBOX = join(ROOT, "photo-inbox");
const PROCESSED = join(INBOX, "processed");
const PUBLIC_PHOTOS = join(ROOT, "public", "photos");
const INPUT_EXTENSIONS = new Set([
  ".avif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);
const PUBLIC_EXTENSIONS = new Set([
  ".avif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);
const FORBIDDEN_MARKERS = [
  /<x:xmpmeta/i,
  /GPSLatitude/i,
  /GPSLongitude/i,
  /SerialNumber/i,
  /photoshop:History/i,
  /Canva/i,
];

function slug(filename) {
  return basename(filename, extname(filename))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A free path next to `path`, since rename() would overwrite an existing
 *  archived original without a word. Two cameras really do both produce
 *  IMG_0001.jpg. */
async function freePath(path) {
  const extension = extname(path);
  const stem = path.slice(0, -extension.length || undefined);
  for (let n = 0; ; n++) {
    const candidate = n === 0 ? path : `${stem}-${n}${extension}`;
    try {
      await stat(candidate);
    } catch (error) {
      if (error.code === "ENOENT") return candidate;
      throw error;
    }
  }
}

async function filesIn(directory, extensions) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter(
      (entry) =>
        entry.isFile() && extensions.has(extname(entry.name).toLowerCase()),
    )
    .map((entry) => join(directory, entry.name))
    .sort();
}

async function prepare() {
  await mkdir(INBOX, { recursive: true });
  await mkdir(PROCESSED, { recursive: true });
  await mkdir(PUBLIC_PHOTOS, { recursive: true });
  const inputs = await filesIn(INBOX, INPUT_EXTENSIONS);
  if (!inputs.length) {
    console.log("No photos found in photo-inbox/.");
    return;
  }

  for (const input of inputs) {
    const name = slug(input);
    if (!name)
      throw new Error(`Cannot make a safe filename from ${basename(input)}`);
    const output = join(PUBLIC_PHOTOS, `${name}.webp`);
    const temporary = `${output}.tmp`;
    const info = await sharp(input)
      .autoOrient()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86, effort: 4 })
      .toFile(temporary);
    await rename(temporary, output);
    console.log(`Prepared ${relative(ROOT, output)}`);
    console.log(`  src: "/photos/${basename(output)}",`);
    console.log(`  width: ${info.width},`);
    console.log(`  height: ${info.height},`);

    // Clear the original out of the inbox, so a second run is a no-op rather
    // than re-encoding every photo ever added. Archived rather than deleted:
    // this is usually the only full-resolution copy, and the public WebP is
    // resized and stripped, so it cannot be turned back into the original.
    // photo-inbox/ is gitignored in full, archive included.
    const archived = await freePath(join(PROCESSED, basename(input)));
    await rename(input, archived);
    console.log(`  original moved to ${relative(ROOT, archived)}`);
  }
}

async function check() {
  const images = await filesIn(PUBLIC_PHOTOS, PUBLIC_EXTENSIONS);
  const unsafe = [];

  for (const image of images) {
    const [metadata, bytes] = await Promise.all([
      sharp(image).metadata(),
      readFile(image),
    ]);
    const fields = ["exif", "iptc", "xmp", "comments"].filter((field) => {
      const value = metadata[field];
      return Array.isArray(value)
        ? value.length > 0
        : Boolean(value?.length ?? value);
    });
    const text = bytes.toString("latin1");
    const markers = FORBIDDEN_MARKERS.filter((pattern) =>
      pattern.test(text),
    ).map((pattern) => pattern.source);
    if (fields.length || markers.length) {
      unsafe.push(
        `${relative(ROOT, image)} (${[...fields, ...markers].join(", ")})`,
      );
    }
  }

  if (unsafe.length) {
    console.error("Public images contain private or editor metadata:");
    for (const image of unsafe) console.error(`  - ${image}`);
    console.error(
      "Move originals to photo-inbox/ and run npm run photos:prepare.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Checked ${images.length} public image${images.length === 1 ? "" : "s"}; no prohibited metadata found.`,
  );
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "check") await check();
else {
  console.error("Usage: node scripts/photos.mjs <prepare|check>");
  process.exitCode = 1;
}
