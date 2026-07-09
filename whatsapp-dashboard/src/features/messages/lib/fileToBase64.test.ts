import { describe, it, expect } from "vitest";
import { fileToBase64 } from "./fileToBase64";

describe("fileToBase64", () => {
  it("strips the data URL prefix and returns only the base64 payload", async () => {
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const base64 = await fileToBase64(file);

    expect(base64).not.toContain("data:");
    expect(Buffer.from(base64, "base64").toString("utf-8")).toBe("hello");
  });

  it("preserves binary content round-trip for non-text files", async () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const file = new File([bytes], "blob.bin", { type: "application/octet-stream" });
    const base64 = await fileToBase64(file);

    expect(Array.from(Buffer.from(base64, "base64"))).toEqual(Array.from(bytes));
  });
});
