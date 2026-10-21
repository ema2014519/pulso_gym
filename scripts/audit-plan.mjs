import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const targetUrl = new URL("/plan", baseUrl).toString();
const interactive = process.argv.includes("--login");
const profileDirectory = join(process.cwd(), ".playwright-profile");
const artifactsDirectory = join(process.cwd(), ".playwright-artifacts");
const bundledChromium = join(process.env.LOCALAPPDATA ?? "", "ms-playwright", "chromium-1228", "chrome-win64", "chrome.exe");
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? (existsSync(bundledChromium) ? bundledChromium : undefined);

mkdirSync(profileDirectory, { recursive: true });
mkdirSync(artifactsDirectory, { recursive: true });

const context = await chromium.launchPersistentContext(profileDirectory, {
  headless: !interactive,
  executablePath,
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const page = context.pages()[0] ?? await context.newPage();

await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
if (new URL(page.url()).pathname === "/login") {
  if (!interactive) {
    await context.close();
    throw new Error("La auditoría necesita una sesión. Ejecuta `npm run audit:plan -- --login` una vez.");
  }
  console.log("LOGIN_REQUIRED: inicia sesión en la ventana; la auditoría continuará automáticamente.");
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 300_000 });
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
}

const viewports = [
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
];
const report = [];

for (const viewport of viewports) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator(".plan-view").waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1_000);

  const measurements = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const identify = (element) => {
      const id = element.id ? `#${element.id}` : "";
      const classes = [...element.classList].slice(0, 3).map((name) => `.${name}`).join("");
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };
    const all = [...document.querySelectorAll(".plan-view *")].filter(visible);
    const overflow = all.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > window.innerWidth + 1;
    }).slice(0, 20).map((element) => {
      const rect = element.getBoundingClientRect();
      return { element: identify(element), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    });
    const smallTargets = [...document.querySelectorAll(".plan-view button, .plan-view a, .plan-view summary, .plan-view input, .plan-view select")]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element: identify(element), text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 70), width: Math.round(rect.width), height: Math.round(rect.height) };
      })
      .filter(({ width, height }) => width < 44 || height < 44)
      .slice(0, 30);
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      overflow,
      smallTargets,
    };
  });

  const screenshot = join(artifactsDirectory, `plan-${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  report.push({ viewport, screenshot, ...measurements });
}

console.log(JSON.stringify(report, null, 2));
await context.close();
