import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  DEFAULT_EDIT_ENDPOINT,
  DEFAULT_GENERATE_ENDPOINT,
  VERSION,
  collectImageUrls,
  endpointForCommand,
  noPollPayload,
  requestJson,
  runCli,
  submissionRecoveryDiagnostic,
  submitQueue,
  validateDefaultEditInput,
} from "./generate-image";

const realFetch = globalThis.fetch;
const realLog = console.log;
const realError = console.error;

afterEach(() => {
  globalThis.fetch = realFetch;
  console.log = realLog;
  console.error = realError;
});

describe("endpoint selection", () => {
  it("uses separate generate and edit defaults", () => {
    expect(endpointForCommand("generate", {})).toBe(DEFAULT_GENERATE_ENDPOINT);
    expect(endpointForCommand("edit", {})).toBe(DEFAULT_EDIT_ENDPOINT);
  });

  it("preserves an explicit endpoint override", () => {
    const flags = { endpoint: "/custom/image-model/" };
    expect(endpointForCommand("generate", flags)).toBe("custom/image-model");
    expect(endpointForCommand("edit", flags)).toBe("custom/image-model");
  });
});

describe("default Grok edit validation", () => {
  const input = (image_urls: unknown) => ({ prompt: "adjust the lighting", image_urls });

  it.each([
    ["missing", { prompt: "adjust the lighting" }],
    ["non-array", input("https://example.com/a.png")],
    ["empty", input([])],
    ["four URLs", input(["a", "b", "c", "d"])],
    ["whitespace URL", input(["   "])],
    ["non-string URL", input(["a", 2])],
  ])("rejects %s image_urls", (_label, value) => {
    expect(() => validateDefaultEditInput(DEFAULT_EDIT_ENDPOINT, value)).toThrow();
  });

  it.each([
    ["one URL", ["https://example.com/a.png"]],
    ["three URLs", ["a", "b", "c"]],
  ])("accepts %s", (_label, urls) => {
    expect(() => validateDefaultEditInput(DEFAULT_EDIT_ENDPOINT, input(urls))).not.toThrow();
  });

  it("requires a non-empty prompt", () => {
    expect(() => validateDefaultEditInput(DEFAULT_EDIT_ENDPOINT, {
      prompt: " ",
      image_urls: ["https://example.com/a.png"],
    })).toThrow("non-empty prompt");
  });

  it("does not apply Grok-specific validation to alternate edit endpoints", () => {
    expect(() => validateDefaultEditInput("custom/edit", { raw: true })).not.toThrow();
  });
});

describe("result and recovery formatting", () => {
  it("collects Grok image result URLs", () => {
    const urls = new Set<string>();
    collectImageUrls({
      images: [
        { url: "https://v3.fal.media/files/result.png" },
        { url: "https://v3.fal.media/files/result-id", content_type: "image/jpeg" },
      ],
      metadata: { url: "https://example.com/job" },
    }, urls);
    expect([...urls]).toEqual([
      "https://v3.fal.media/files/result.png",
      "https://v3.fal.media/files/result-id",
    ]);
  });

  it("includes endpoint in no-poll JSON and recovery stderr text", () => {
    const payload = noPollPayload(
      DEFAULT_EDIT_ENDPOINT,
      "req-123",
      "https://status",
      "https://response",
      "https://cancel",
    );
    const stdout = JSON.stringify(payload);
    expect(JSON.parse(stdout)).toEqual(payload);
    expect(payload.endpoint).toBe(DEFAULT_EDIT_ENDPOINT);

    const stderr = submissionRecoveryDiagnostic(DEFAULT_EDIT_ENDPOINT, "req-123");
    expect(stderr).toContain(`endpoint=${DEFAULT_EDIT_ENDPOINT}`);
    expect(stderr).toContain("request_id=req-123");
  });
});

describe("request retries", () => {
  it("attempts a queue submit only once and warns on ambiguous failure", async () => {
    const fetchMock = mock(() => Promise.reject(new TypeError("connection reset")));
    const errorMock = mock(() => {});
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    console.error = errorMock;

    await expect(submitQueue(DEFAULT_GENERATE_ENDPOINT, "test-key", { prompt: "test" }))
      .rejects.toThrow("connection reset");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(String(errorMock.mock.calls[0]?.[0])).toContain("check fal history before retrying");
  });

  it("does not retry a queue submit after a retryable HTTP response", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response("busy", { status: 503 })));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(submitQueue(DEFAULT_GENERATE_ENDPOINT, "test-key", { prompt: "test" }))
      .rejects.toThrow("HTTP 503");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a safe GET after a retryable response", async () => {
    let calls = 0;
    const fetchMock = mock(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(new Response("busy", { status: 503 }));
      return Promise.resolve(new Response('{"status":"ok"}', {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(requestJson("https://example.test/status", {})).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("non-operational CLI paths", () => {
  it("prints help without network access", async () => {
    const fetchMock = mock(() => Promise.reject(new Error("network must not run")));
    const logMock = mock(() => {});
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    console.log = logMock;

    await runCli(["--help"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(logMock.mock.calls[0]?.[0])).toContain("Generate default:");
    expect(String(logMock.mock.calls[0]?.[0])).toContain("Edit default:");
  });

  it("prints version without network access", async () => {
    const fetchMock = mock(() => Promise.reject(new Error("network must not run")));
    const logMock = mock(() => {});
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    console.log = logMock;

    await runCli(["--version"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(VERSION);
  });
});
