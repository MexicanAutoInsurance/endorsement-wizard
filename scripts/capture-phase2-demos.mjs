import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.DEMO_BASE || "http://127.0.0.1:3000";
const OUT =
  process.env.DEMO_OUT ||
  "/cursor/stores/bc-3a54a910-b23d-4304-ad9e-d9cb50adc9fa/media/mvp-wizard/phase2";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

async function enterStaff(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const unlock = page.getByRole("button", { name: /Continue to staff wizard|Unlock/i });
  if (await unlock.count()) await unlock.click();
  await page.getByRole("heading", { name: "Sessions" }).waitFor();
}

// Desktop staff flow
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await enterStaff(page);
await shot(page, "01-staff-home.png");

await page.getByRole("button", { name: "New endorsement session" }).click();
await page.getByRole("heading", { name: "Basics" }).waitFor();
await page.getByPlaceholder("e.g. CRT-123456").fill("CRT-778899");
await page.getByRole("textbox", { name: /Insured name/i }).fill("Alex Rivera").catch(async () => {
  await page.locator(".field input").nth(1).fill("Alex Rivera");
});
await page.getByPlaceholder("client@email.com").fill("alex.rivera@example.com");
await page.getByPlaceholder("(555) 555-5555").fill("(310) 555-0142");
await page.waitForTimeout(400);
await shot(page, "02-staff-basics.png");

await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("heading", { name: "What needs to change?" }).waitFor();
await page.getByRole("button", { name: "Term amount" }).click();
await page.getByRole("button", { name: /Towed units/ }).click();
await page.waitForTimeout(300);
await shot(page, "03-staff-optional-changes.png");

const sendBtn = page.getByRole("button", { name: "Send client fill-out link" });
await sendBtn.waitFor({ state: "visible" });
await page.waitForFunction(() => {
  const buttons = [...document.querySelectorAll("button")];
  const b = buttons.find((el) => el.textContent?.includes("Send client fill-out link"));
  return b && !b.disabled;
}, null, { timeout: 15000 });
await sendBtn.click();
await page.getByText(/Client link ready|Awaiting client|Link:/i).first().waitFor({ timeout: 15000 });
await shot(page, "04-staff-send-link.png");

const linkText = await page.locator(".invite-card .session-meta").innerText();
const match = linkText.match(/\/client\/([a-z0-9]+)/i);
if (!match) throw new Error("No client token in invite panel: " + linkText);
const token = match[1];
console.log("token", token);

// Mobile client flow (phone-first)
const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await phone.goto(`${BASE}/client/${token}`, { waitUntil: "networkidle" });
await phone.getByRole("heading", { name: /Complete your endorsement/i }).waitFor();
await shot(phone, "05-client-welcome-mobile.png");

await phone.getByRole("button", { name: "Continue" }).click();
await phone.getByRole("heading", { name: /Your requested changes|What needs to change/i }).waitFor();
await shot(phone, "06-client-locked-types-mobile.png");

await phone.locator("label.checkbox-row").nth(0).click();
await phone.locator("label.checkbox-row").nth(1).click();
await phone.locator('input[type="date"]').first().fill("2026-12-15");
await shot(phone, "07-client-fee-ack-mobile.png");

await phone.getByRole("button", { name: "Continue" }).click();
await phone.getByRole("heading", { name: /towed unit/i }).waitFor();
await phone.getByRole("button", { name: /What is a towed unit/i }).click();
await phone.waitForTimeout(400);
await shot(phone, "08-client-towed-helper-mobile.png");

await phone.getByRole("button", { name: "Close" }).click();
await phone.getByRole("button", { name: /Nothing towed/i }).click();
await phone.getByRole("button", { name: "Continue" }).click();

// details — fill term if present
await phone.waitForTimeout(300);
const selects = phone.locator("select");
if ((await selects.count()) >= 1) {
  await selects.nth(0).selectOption({ label: "6 Months" }).catch(() => {});
}
if ((await selects.count()) >= 2) {
  await selects.nth(1).selectOption({ label: "Annual" }).catch(() => {});
}
await shot(phone, "09-client-details-mobile.png");
await phone.getByRole("button", { name: "Continue" }).click();

await phone.getByRole("heading", { name: /Check before you send/i }).waitFor();
await shot(phone, "10-client-review-mobile.png");

const submit = phone.getByRole("button", { name: /Submit to Lewis and Lewis/i });
if (await submit.isDisabled()) {
  console.log("submit disabled — dumping gate");
  console.log(await phone.locator(".gate-list").innerText());
  // go back and fix
  await phone.getByRole("button", { name: "Back" }).click();
  const sels = phone.locator("select");
  if ((await sels.count()) >= 1) await sels.nth(0).selectOption({ index: 3 }).catch(() => {});
  if ((await sels.count()) >= 2) await sels.nth(1).selectOption({ index: 4 }).catch(() => {});
  await phone.getByRole("button", { name: "Continue" }).click();
}
await phone.getByRole("button", { name: /Submit to Lewis and Lewis/i }).click();
await phone.getByRole("heading", { name: "Thank you" }).waitFor({ timeout: 15000 });
await shot(phone, "11-client-thank-you-mobile.png");

// Staff sees submitted
await enterStaff(page);
await page.getByRole("button", { name: "Refresh" }).click();
await page.waitForTimeout(600);
await shot(page, "12-staff-client-submitted.png");
await page.getByText("Alex Rivera").first().click();
await page.waitForTimeout(500);
await shot(page, "13-staff-review-answers.png");

// Staff basics on small screen
const staffPhone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await enterStaff(staffPhone);
await staffPhone.getByRole("button", { name: "New endorsement session" }).click();
await staffPhone.getByRole("heading", { name: "Basics" }).waitFor();
await staffPhone.getByPlaceholder("e.g. CRT-123456").fill("CRT-MOBILE");
await staffPhone.locator(".field input").nth(1).fill("Sam Lee");
await staffPhone.getByPlaceholder("client@email.com").fill("sam.lee@example.com");
await shot(staffPhone, "14-staff-basics-mobile.png");
await staffPhone.getByRole("button", { name: "Continue" }).click();
await staffPhone.getByRole("button", { name: "Term amount" }).click();
await staffPhone.waitForTimeout(200);
await shot(staffPhone, "15-staff-send-link-mobile.png");

await browser.close();
console.log("done");
