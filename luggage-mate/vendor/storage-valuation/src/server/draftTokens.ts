import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { StorageAnalysisError } from "../domain/errors.js";
import {
  TravelerDraftSchema,
  parseTraveler,
  type TravelerInventoryDraft,
} from "../traveler/schemas.js";
export function createDraftTokenCodec(
  secret: string = randomBytes(32).toString("hex"),
  now: () => Date = () => new Date(),
) {
  if (Buffer.byteLength(secret) < 32)
    throw new StorageAnalysisError(
      "INVALID_CONFIGURATION",
      "Draft signing secret must have at least 32 bytes.",
    );
  const sign = (payload: string) =>
    createHmac("sha256", secret).update(payload).digest();
  return {
    encode(draft: TravelerInventoryDraft): string {
      const expiresAt = Math.min(
        now().getTime() + 30 * 60000,
        Date.parse(draft.expiresAt),
      );
      const payload = Buffer.from(
        JSON.stringify({ expiresAt, draft }),
      ).toString("base64url");
      const token = `${payload}.${sign(payload).toString("base64url")}`;
      if (token.length > 3_000_000)
        throw new StorageAnalysisError(
          "INVALID_AI_RESPONSE",
          "Inventory is too large for the demo confirmation token.",
        );
      return token;
    },
    decode(token: string): TravelerInventoryDraft {
      if (typeof token !== "string" || token.length > 3_000_000)
        throw new StorageAnalysisError(
          "INVALID_DRAFT_TOKEN",
          "The draft token is invalid.",
        );
      const parts = token.split(".");
      if (
        parts.length !== 2 ||
        !parts[0] ||
        !parts[1] ||
        !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
      )
        throw new StorageAnalysisError(
          "INVALID_DRAFT_TOKEN",
          "The draft token is invalid.",
        );
      const actual = Buffer.from(parts[1], "base64url"),
        expected = sign(parts[0]);
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new StorageAnalysisError(
          "INVALID_DRAFT_TOKEN",
          "The draft token signature is invalid.",
        );
      let envelope: { expiresAt: number; draft: unknown };
      try {
        envelope = JSON.parse(
          Buffer.from(parts[0], "base64url").toString("utf8"),
        ) as typeof envelope;
      } catch (cause) {
        throw new StorageAnalysisError(
          "INVALID_DRAFT_TOKEN",
          "The draft token is invalid.",
          { cause },
        );
      }
      if (
        !Number.isFinite(envelope.expiresAt) ||
        envelope.expiresAt <= now().getTime()
      )
        throw new StorageAnalysisError(
          "EXPIRED_DRAFT",
          "The inventory draft expired. Create a new draft.",
        );
      return parseTraveler(TravelerDraftSchema, envelope.draft);
    },
  };
}
