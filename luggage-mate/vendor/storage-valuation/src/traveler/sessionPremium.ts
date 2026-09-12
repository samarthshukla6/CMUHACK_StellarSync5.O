import { roundMoney } from "../services/valuation.js";
import { StorageAnalysisError } from "../domain/errors.js";
import type { StorageSession } from "./schemas.js";
import type { SessionPremium } from "./types.js";
// Illustrative hackathon pricing, not insurer rates or actuarial estimates.
export const TRAVELER_DEMO_TERMS = Object.freeze({
  maximumSessionLimit: 5000,
  perPhysicalItemLimit: 1000,
  deductible: 0,
  minimumSessionPremium: 1.49,
});
export function calculateSessionPremium(
  coverageLimit: number,
  durationMinutes: number,
  storageType: StorageSession["storage"]["type"],
): SessionPremium {
  if (
    !Number.isFinite(coverageLimit) ||
    coverageLimit < 0 ||
    coverageLimit > 5000 ||
    coverageLimit % 50 !== 0 ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 10080
  )
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "Invalid session premium inputs.",
    );
  if (!["staffed_storage", "secured_locker"].includes(storageType))
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "This storage arrangement cannot be automatically rated.",
    );
  const durationBand =
    durationMinutes <= 360
      ? "up_to_6_hours"
      : durationMinutes <= 1440
        ? "up_to_24_hours"
        : "multi_day";
  const additionalDays = Math.max(
    0,
    Math.ceil((durationMinutes - 1440) / 1440),
  );
  const ratePer100 =
    durationMinutes <= 360 ? 0.2 : roundMoney(0.35 + 0.25 * additionalDays);
  const storageMultiplier = storageType === "secured_locker" ? 1.15 : 1;
  return {
    type: "demo_only",
    ratingVersion: "traveler-demo-v1",
    currency: "USD",
    durationMinutes,
    durationHours: Math.round((durationMinutes / 60) * 100) / 100,
    durationBand,
    additionalDays,
    ratePer100,
    storageMultiplier,
    minimumSessionPremium: 1.49,
    totalPremium:
      coverageLimit === 0
        ? 0
        : roundMoney(
            Math.max(
              1.49,
              (coverageLimit / 100) * ratePer100 * storageMultiplier,
            ),
          ),
  };
}
