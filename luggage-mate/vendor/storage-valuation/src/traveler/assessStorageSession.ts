import {
  StorageSessionSchema,
  parseTraveler,
  validateSession,
  type StorageSession,
} from "./schemas.js";
export function assessStorageSession(
  input: StorageSession,
  dependencies: { now?: () => Date } = {},
) {
  const session = parseTraveler(StorageSessionSchema, input);
  const durationMinutes = validateSession(
    session,
    (dependencies.now ?? (() => new Date()))(),
  );
  const type = session.storage.type;
  const status =
    type === "unattended"
      ? ("ineligible" as const)
      : type === "private_host" || type === "unknown"
        ? ("requires_review" as const)
        : ("eligible_for_demo_quote" as const);
  const blockingReasons =
    status === "ineligible"
      ? ["unattended_storage_ineligible"]
      : status === "requires_review"
        ? ["storage_requires_verification"]
        : [];
  return {
    type: "demo_only" as const,
    status,
    durationMinutes,
    session,
    blockingReasons,
    storageVerified: false as const,
    nextAction:
      status === "ineligible"
        ? "choose_eligible_storage"
        : status === "requires_review"
          ? "verify_storage"
          : "photograph_bag_and_visible_contents",
  };
}
