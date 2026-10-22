import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const targetUrl = new URL("/nutricion", baseUrl).toString();
const profileDirectory = join(process.cwd(), ".playwright-profile");
const artifactsDirectory = join(process.cwd(), ".playwright-artifacts");
const bundledChromium = join(process.env.LOCALAPPDATA ?? "", "ms-playwright", "chromium-1228", "chrome-win64", "chrome.exe");
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? (existsSync(bundledChromium) ? bundledChromium : undefined);
mkdirSync(profileDirectory, { recursive: true }); mkdirSync(artifactsDirectory, { recursive: true });

const context = await chromium.launchPersistentContext(profileDirectory, { headless: true, executablePath, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const page = context.pages()[0] ?? await context.newPage();
const report = [];
for (const viewport of [{ name: "mobile-390", width: 390, height: 844 }, { name: "tablet-768", width: 768, height: 1024 }, { name: "desktop-1440", width: 1440, height: 900 }]) {
  await page.setViewportSize(viewport); await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (new URL(page.url()).pathname === "/login") throw new Error("La auditoría necesita una sesión guardada en .playwright-profile.");
  await page.locator(".nutrition-day-panel").waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1_000);
  const measurements = await page.evaluate(() => {
    const visible = (element) => { const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0; };
    const all = [...document.querySelectorAll(".nutrition-page *")].filter(visible);
    const overflow = all.filter((element) => { const rect = element.getBoundingClientRect(); return rect.left < -1 || rect.right > window.innerWidth + 1; }).slice(0, 20).map((element) => ({ tag: element.tagName.toLowerCase(), className: element.className, text: element.textContent?.trim().slice(0, 50) }));
    const smallTargets = [...document.querySelectorAll(".nutrition-page button, .nutrition-page a, .nutrition-page summary, .nutrition-page input")].filter(visible).map((element) => { const rect = element.getBoundingClientRect(); return { text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 40), width: Math.round(rect.width), height: Math.round(rect.height) }; }).filter(({ width, height }) => width < 44 || height < 44);
    return { pathname: location.pathname, documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth, hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, overflow, smallTargets };
  });
  const screenshot = join(artifactsDirectory, `nutrition-${viewport.name}.png`); await page.screenshot({ path: screenshot, fullPage: true }); report.push({ viewport, screenshot, ...measurements });
}
console.log(JSON.stringify(report, null, 2)); await context.close();
