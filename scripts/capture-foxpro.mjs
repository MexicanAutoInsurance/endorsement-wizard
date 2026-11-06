import { chromium } from "playwright";

const OUT = "/cursor/stores/self/media/mvp-wizard/09-foxpro-export-status.png";
const sample = {
  id: "demo-session-001",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "confirmation_sent",
  policy: {
    crtNumber: "CRT-88421",
    insuredName: "Maria Elena Vargas",
    phone: "(310) 555-0142",
    email: "maria.vargas@example.com",
    beforeNotes: "2021 Jeep Wrangler, Six Month term",
  },
  changeTypes: ["change_vehicle", "add_change_towed", "change_term"],
  effectiveDate: "2026-11-15",
  feeAcknowledged: true,
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
  towedUnits: [
    {
      id: "towed-1",
      type: "trailer_other",
      make: "LoadRite",
      year: "2019",
      model: "Utility",
      length: "16",
      vin: "LR2019UT88",
      plate: "TRL992",
      state: "CA",
      registeredOwner: "Maria Elena Vargas",
      lienholder: "",
      value: "0",
    },
  ],
  termChange: { currentTerm: "Six Month", newTerm: "Annual" },
  attestation: {
    method: "phone",
    takenBy: "Jordan Staff",
    date: "2026-11-06",
    notes: "Client called",
  },
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.evaluate((session) => {
  localStorage.setItem("mai-endorsement-sessions-v1", JSON.stringify([session]));
  localStorage.setItem("mai-endorsement-active-v1", session.id);
}, sample);
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "7. Confirm", exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole("heading", { name: "FoxPro paste export" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.screenshot({ path: OUT });
console.log("wrote", OUT);
await browser.close();
