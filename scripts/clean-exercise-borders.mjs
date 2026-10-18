import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("public/exercises");
const libraries = ["", "femenino", "masculino"];

async function validateBorders() {
  const issues = [];
  for (const library of libraries) {
    for (const folder of [path.join(root, library), path.join(root, "frames", library)]) {
      const names = (await fs.readdir(folder)).filter((name) => name.endsWith(".webp") && !name.includes(".clean."));
      for (const name of names) {
        const file = path.join(folder, name);
        const source = await fs.readFile(file);
        const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const columns = name.includes("-inicio.")
          ? [info.width - 1, info.width - 2]
          : name.includes("-final.")
            ? [0, 1]
            : Array.from({ length: 9 }, (_, index) => Math.floor(info.width / 2) - 4 + index);
        for (const x of columns) {
          if (averageBrightness(data, info.width, info.height, x) > 150) {
            issues.push(`${path.relative(root, file)} (x=${x})`);
            break;
          }
        }
      }
    }
  }
  if (issues.length) {
    console.error(`Persisten bordes claros en ${issues.length} archivos:\n${issues.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log("Validación correcta: no quedan franjas blancas en centros ni uniones de fotogramas.");
  }
}

function averageBrightness(raw, width, height, x) {
  let brightness = 0;
  for (let y = 0; y < height; y += 1) {
    const offset = (y * width + x) * 3;
    brightness += (raw[offset] + raw[offset + 1] + raw[offset + 2]) / 3;
  }
  return brightness / height;
}

async function cleanImage(file, frameDirectory) {
  const source = await fs.readFile(file);
  const image = sharp(source);
  const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const center = Math.floor(info.width / 2);
  const candidates = [];

  for (let x = Math.max(0, center - 18); x <= Math.min(info.width - 1, center + 18); x += 1) {
    if (averageBrightness(data, info.width, info.height, x) > 150) candidates.push(x);
  }

  const dividerStart = candidates.length ? Math.max(1, Math.min(...candidates) - 1) : center;
  const dividerEnd = candidates.length ? Math.min(info.width - 2, Math.max(...candidates) + 1) : center - 1;
  const leftWidth = dividerStart;
  const rightStart = dividerEnd + 1;
  const rightWidth = info.width - rightStart;

  if (leftWidth < 1 || rightWidth < 1) throw new Error(`División inválida en ${file}`);

  const base = sharp(data, { raw: info });
  const [left, right] = await Promise.all([
    base.clone().extract({ left: 0, top: 0, width: leftWidth, height: info.height }).webp({ quality: 86 }).toBuffer(),
    base.clone().extract({ left: rightStart, top: 0, width: rightWidth, height: info.height }).webp({ quality: 86 }).toBuffer(),
  ]);
  const full = await sharp({
    create: { width: leftWidth + rightWidth, height: info.height, channels: 3, background: "#080c0d" },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: leftWidth, top: 0 },
    ])
    .webp({ quality: 86 })
    .toBuffer();

  await fs.writeFile(file, full);
  await fs.mkdir(frameDirectory, { recursive: true });
  const name = path.basename(file, ".webp");
  await Promise.all([
    fs.writeFile(path.join(frameDirectory, `${name}-inicio.webp`), left),
    fs.writeFile(path.join(frameDirectory, `${name}-final.webp`), right),
  ]);
  return candidates.length;
}

if (process.argv.includes("--check")) {
  await validateBorders();
  process.exit();
}

let cleaned = 0;
let separators = 0;
for (const library of libraries) {
  const sourceDirectory = path.join(root, library);
  const frameDirectory = path.join(root, "frames", library);
  const files = (await fs.readdir(sourceDirectory))
    .filter((name) => name.endsWith(".webp") && !name.includes(".clean."))
    .map((name) => path.join(sourceDirectory, name));

  for (const file of files) {
    separators += await cleanImage(file, frameDirectory);
    cleaned += 1;
  }
}

const temporary = path.join(root, "dead-bug-casa.webp.clean.webp");
await fs.rm(temporary, { force: true });
console.log(`Procesadas ${cleaned} referencias; eliminadas ${separators} columnas claras; regenerados ${cleaned * 2} fotogramas.`);
