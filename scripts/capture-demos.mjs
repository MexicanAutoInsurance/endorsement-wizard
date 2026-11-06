import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = "/cursor/stores/self/media/mvp-wizard";
fs.mkdirSync(OUT, { recursive: true });

const sample = {
  id: "demo-session-002",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "draft",
  policy: {
    crtNumber: "CRT-88421",
    insuredName: "Maria Elena Vargas",
    phone: "(310) 555-0142",
    email: "maria.vargas@example.com",
    beforeNotes: "2021 Jeep Wrangler, 6 Months term, no towed units listed in FoxPro",
  },
  changeTypes: [
    "change_term",
    "change_vehicle",
    "towed_units",
    "special_dob",
    "optional_coverages",
  ],
  effectiveDate: "2026-11-15",
  priorEffectiveDate: "",
  feeAcknowledged: true,
  feeWaived: false,
  feeWaiveReason: "",
  missedInfoFeeAcknowledged: true,
  towedBringing: "yes",
  vehicleChange: {
    deleteVehicle: {
      make: "Jeep",
      year: "2021",
      model: "Wrangler",
      length: "",
      vin: "1C4HJXDG1MW123456",
      plate: "7ABC123",
      state: "CA",
      otherInsurer: "",
      lienholder: "",
      cmv: "28000",
    },
    addVehicle: {
      make: "Toyota",
      year: "2024",
      model: "4Runner",
      length: "",
      vin: "JTEBU5JR9R5123456",
      plate: "8XYZ456",
      state: "CA",
      otherInsurer: "State Farm",
      lienholder: "",
      cmv: "42000",
    },
  },
  vehicleCorrections: [{ field: "", fromValue: "", toValue: "", notes: "" }],
  towedUnits: [
    {
      id: "towed-1",
      action: "add",
      type: "watercraft_trailer",
      make: "LoadRite",
      year: "2019",
      model: "Boat Trailer",
      length: "18",
      vin: "LR2019BT88",
      plate: "TRL992",
      state: "CA",
      registeredOwner: "Maria Elena Vargas",
      lienholder: "",
      value: "0",
      notes: "",
    },
    {
      id: "towed-2",
      action: "add",
      type: "watercraft",
      make: "Bayliner",
      year: "2018",
      model: "Element",
      length: "16",
      vin: "USBLN2018EL",
      plate: "",
      state: "CA",
      registeredOwner: "Maria Elena Vargas",
      lienholder: "",
      value: "12000",
      notes: "",
    },
    {
      id: "towed-3",
      action: "add",
      type: "outboard",
      make: "Mercury",
      year: "2018",
      model: "90HP",
      length: "",
      vin: "MER90-2018",
      plate: "",
      state: "",
      registeredOwner: "",
      lienholder: "",
      value: "0",
      notes: "Separate unit from boat",
    },
  ],
  termChange: {
    currentTerm: "6 Months",
    newTerm: "Annual",
  },
  nameChange: { currentName: "", newName: "" },
  contactChange: {
    mailingAddress: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    fax: "",
    notes: "",
  },
  specialChange: {
    namedInsuredFrom: "",
    namedInsuredTo: "",
    dobFrom: "1985-04-12",
    dobTo: "1985-04-21",
    dlNumberFrom: "",
    dlNumberTo: "",
    dlStateFrom: "",
    dlStateTo: "",
    notes: "Birth certificate requested",
  },
  optionalCoverages: [
    {
      id: "cov-1",
      action: "add",
      name: "VIP / travel assistance",
      notes: "",
    },
  ],
  otherDrivers: [
    {
      id: "drv-1",
      action: "add",
      name: "",
      dob: "",
      licenseNumber: "",
      licenseState: "",
      notes: "",
    },
  ],
  attestation: {
    method: "phone",
    takenBy: "Jordan Staff",
    date: "2026-11-06",
    notes: "Client called; will confirm by email",
  },
};

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

async function clickStep(page, label) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(300);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await shot(page, "01-home-sessions");

await page.evaluate((session) => {
  localStorage.setItem("mai-endorsement-sessions-v2", JSON.stringify([session]));
  localStorage.setItem("mai-endorsement-active-v2", session.id);
}, sample);
await page.reload({ waitUntil: "networkidle" });
await shot(page, "02-policy-identity");

await clickStep(page, "2. Changes");
await shot(page, "03-stacked-changes");

await clickStep(page, "3. Towed?");
await shot(page, "04-towed-gate");
await page.getByRole("button", { name: /What is a towed unit/i }).click();
await page.waitForTimeout(500);
await shot(page, "04b-towed-helper-open");

await clickStep(page, "4. Details");
await shot(page, "05-change-details");

await clickStep(page, "5. Checklist");
await shot(page, "06-completeness-gate");

await clickStep(page, "6. Summary");
await shot(page, "07-before-after-summary");

await clickStep(page, "7. Confirm");
await shot(page, "08-email-and-export");
await page.getByRole("heading", { name: "FoxPro paste export" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await shot(page, "09-foxpro-export-status");

await page.getByRole("button", { name: "Done — back to sessions" }).click();
await page.waitForTimeout(200);
await shot(page, "10-sessions-with-draft");

// Short-term $15 fee variant
const short = {
  ...sample,
  id: "demo-session-short",
  changeTypes: ["change_term", "towed_units"],
  termChange: { currentTerm: "1–20 Days", newTerm: "1–20 Days" },
  feeAcknowledged: true,
  feeWaived: false,
  missedInfoFeeAcknowledged: true,
  towedBringing: "no",
  towedUnits: [sample.towedUnits[0]],
  specialChange: {
    namedInsuredFrom: "",
    namedInsuredTo: "",
    dobFrom: "",
    dobTo: "",
    dlNumberFrom: "",
    dlNumberTo: "",
    dlStateFrom: "",
    dlStateTo: "",
    notes: "",
  },
  optionalCoverages: [
    { id: "cov-1", action: "add", name: "", notes: "" },
  ],
};
await page.evaluate((session) => {
  localStorage.setItem("mai-endorsement-sessions-v2", JSON.stringify([session]));
  localStorage.setItem("mai-endorsement-active-v2", session.id);
}, short);
await page.reload({ waitUntil: "networkidle" });
await clickStep(page, "2. Changes");
await shot(page, "11-fee-15-short-term");

await browser.close();
console.log("done");
