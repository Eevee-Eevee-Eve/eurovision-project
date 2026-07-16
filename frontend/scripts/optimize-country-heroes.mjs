import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("public/stats-assets/country-heroes");
const thumbnailDirectory = path.join(sourceDirectory, "thumbs");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

await fs.mkdir(thumbnailDirectory, { recursive: true });

const sourceFiles = new Map();
(await fs.readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
  .forEach((entry) => {
    const basename = path.parse(entry.name).name;
    const existing = sourceFiles.get(basename);
    const extension = path.extname(entry.name).toLowerCase();
    if (!existing || (path.extname(existing.name).toLowerCase() === ".webp" && extension !== ".webp")) {
      sourceFiles.set(basename, entry);
    }
  });

for (const entry of sourceFiles.values()) {
  const sourcePath = path.join(sourceDirectory, entry.name);
  const basename = path.parse(entry.name).name;
  const fullPath = path.join(sourceDirectory, `${basename}.webp`);
  const thumbnailPath = path.join(thumbnailDirectory, `${basename}.webp`);
  const sourceBuffer = await fs.readFile(sourcePath);

  if (sourcePath !== fullPath) {
    await sharp(sourceBuffer)
      .rotate()
      .resize(1280, 800, { fit: "cover", position: "centre", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(fullPath);
  }

  await sharp(sourceBuffer)
    .rotate()
    .resize(640, 400, { fit: "cover", position: "centre", withoutEnlargement: true })
    .webp({ quality: 76, effort: 5 })
    .toFile(thumbnailPath);
}

console.log(`Optimized ${sourceFiles.size} country hero images.`);
