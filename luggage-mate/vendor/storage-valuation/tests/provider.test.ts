import { it, expect, vi } from "vitest";
import { GeminiInventoryVisionProvider } from "../src/providers/GeminiInventoryVisionProvider.js";
import { fixture } from "./helpers.js";
const response = {
  status: "completed",
  output_text: JSON.stringify(fixture()),
};
const images = [
  {
    buffer: Buffer.from("mock transport bytes"),
    mimeType: "image/jpeg" as const,
  },
];
it("one structured interaction with every image", async () => {
  const transport = vi.fn(
    async (
      _request: import("../src/providers/GeminiInventoryVisionProvider.js").GeminiRequest,
    ) => response,
  );
  await new GeminiInventoryVisionProvider({ transport }).analyze([
    ...images,
    ...images,
  ]);
  expect(transport).toHaveBeenCalledTimes(1);
  const request = transport.mock.calls[0]![0];
  expect(request).toMatchObject({
    store: false,
    stream: false,
    response_format: { type: "text", mime_type: "application/json" },
    generation_config: { thinking_level: "low" },
  });
  expect(request.input.filter((p) => p.type === "image")).toHaveLength(2);
  expect(request.system_instruction).toContain(
    "Do not count the same physical item more than once",
  );
});
it.each([429, 500, 503])("retries transient %s", async (status) => {
  const transport = vi
    .fn()
    .mockRejectedValueOnce({ status })
    .mockResolvedValue(response);
  const sleep = vi.fn(async () => {});
  await new GeminiInventoryVisionProvider({ transport, sleep }).analyze(images);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledWith(250);
});
it("caps attempts", async () => {
  const transport = vi.fn().mockRejectedValue({ statusCode: 503 });
  await expect(
    new GeminiInventoryVisionProvider({
      transport,
      sleep: async () => {},
    }).analyze(images),
  ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
  expect(transport).toHaveBeenCalledTimes(3);
});
it.each([400, 401, 403, 404])("does not retry permanent %s", async (status) => {
  const transport = vi.fn().mockRejectedValue({ status });
  await expect(
    new GeminiInventoryVisionProvider({ transport }).analyze(images),
  ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
  expect(transport).toHaveBeenCalledTimes(1);
});
it("retries network failure", async () => {
  const transport = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("fetch failed"))
    .mockResolvedValue(response);
  await new GeminiInventoryVisionProvider({
    transport,
    sleep: async () => {},
  }).analyze(images);
  expect(transport).toHaveBeenCalledTimes(2);
});
it.each([{ output_text: "not json" }, { output_text: '{"items":[{}]}' }])(
  "does not retry malformed response",
  async (output) => {
    const transport = vi.fn(async () => output);
    await expect(
      new GeminiInventoryVisionProvider({ transport }).analyze(images),
    ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE" });
    expect(transport).toHaveBeenCalledTimes(1);
  },
);
it("empty response", async () =>
  expect(
    new GeminiInventoryVisionProvider({
      transport: async () => ({ output_text: "" }),
    }).analyze(images),
  ).rejects.toMatchObject({ code: "EMPTY_AI_RESPONSE" }));
it("incomplete response cannot be quoted", async () =>
  expect(
    new GeminiInventoryVisionProvider({
      transport: async () => ({ ...response, status: "failed" }),
    }).analyze(images),
  ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" }));

it("uses the live-compatible schema while local validation stays strict", async () => {
  const transport = vi.fn(
    async (
      _request: import("../src/providers/GeminiInventoryVisionProvider.js").GeminiRequest,
    ) => response,
  );
  await new GeminiInventoryVisionProvider({ transport }).analyze(images);
  const schema = transport.mock.calls[0]![0].response_format.schema;
  expect(JSON.stringify(schema)).not.toMatch(
    /"(?:maxLength|maxItems|maximum|\$schema)"/,
  );
  expect(schema).toMatchObject({
    type: "object",
    required: ["items"],
    additionalProperties: false,
  });
  const invalid = fixture();
  invalid.items[0]!.name = "x".repeat(501);
  await expect(
    new GeminiInventoryVisionProvider({
      transport: async () => ({
        ...response,
        output_text: JSON.stringify(invalid),
      }),
    }).analyze(images),
  ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE" });
});

it("traveler context narrows scope and excludes worn clothing", async () => {
  const transport = vi.fn(
    async (
      _request: import("../src/providers/GeminiInventoryVisionProvider.js").GeminiRequest,
    ) => response,
  );
  await new GeminiInventoryVisionProvider({ transport }).analyze(images, {
    useCase: "traveler_storage",
    coverageScope: "bag_only",
    photoCoverage: "bag_exterior_only",
  });
  const request = transport.mock.calls[0]![0];
  expect(request.system_instruction).toContain("Exclude clothing being worn");
  expect(request.system_instruction).toContain(
    "Never infer anything inside a closed bag",
  );
  expect(request.system_instruction).toContain("Coverage scope: bag_only");
});
