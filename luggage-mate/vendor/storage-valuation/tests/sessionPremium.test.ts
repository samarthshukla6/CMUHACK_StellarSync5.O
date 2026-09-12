import { it, expect } from "vitest";
import { calculateSessionPremium } from "../src/traveler/sessionPremium.js";
it.each([
  [360, 0.2, 0],
  [361, 0.35, 0],
  [1440, 0.35, 0],
  [1441, 0.6, 1],
  [2880, 0.6, 1],
  [2881, 0.85, 2],
  [10080, 1.85, 6],
])("duration %s uses rate %s", (minutes, rate, days) => {
  const p = calculateSessionPremium(1000, minutes, "staffed_storage");
  expect(p.ratePer100).toBe(rate);
  expect(p.additionalDays).toBe(days);
  expect(p.totalPremium).toBe(Math.round(10 * rate * 100) / 100);
});
it("minimum session charge", () =>
  expect(calculateSessionPremium(50, 360, "staffed_storage").totalPremium).toBe(
    1.49,
  ));
it("locker multiplier", () =>
  expect(
    calculateSessionPremium(1000, 360, "secured_locker").totalPremium,
  ).toBe(2.3));
it("zero limit pure calculator", () =>
  expect(calculateSessionPremium(0, 360, "staffed_storage").totalPremium).toBe(
    0,
  ));
it.each([0, -1, 10081, NaN, Infinity, 2.5])("rejects duration %s", (n) =>
  expect(() => calculateSessionPremium(50, n, "staffed_storage")).toThrow(),
);
it.each([-50, 25, 5050, NaN])("rejects limit %s", (n) =>
  expect(() => calculateSessionPremium(n, 360, "staffed_storage")).toThrow(),
);
it("cannot price unattended storage", () =>
  expect(() => calculateSessionPremium(50, 360, "unattended")).toThrow());
