import { describe, expect, it } from "vitest";

import { readForm } from "@/lib/auth/api";

const REQUEST_ID = "test-request-id";

function formRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/v1/auth/verify-email", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    body,
  });
}

describe("readForm", () => {
  it("разбирает application/x-www-form-urlencoded", async () => {
    const result = await readForm(formRequest("token=abc%20123&other=value"), REQUEST_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("ожидался успешный разбор формы");
    expect(result.body).toEqual({ token: "abc 123", other: "value" });
  });

  it("возвращает 413 при превышении content-length", async () => {
    const result = await readForm(
      formRequest("token=abc", { "content-length": String(33 * 1024) }),
      REQUEST_ID,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("ожидалась ошибка 413");
    expect(result.response.status).toBe(413);
    await expect(result.response.json()).resolves.toMatchObject({
      error: { code: "payload_too_large" },
      requestId: REQUEST_ID,
    });
  });

  it("возвращает 413, если тело без content-length превышает 32 КБ", async () => {
    const body = `token=${"a".repeat(33 * 1024)}`;
    const result = await readForm(formRequest(body), REQUEST_ID);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("ожидалась ошибка 413");
    expect(result.response.status).toBe(413);
    await expect(result.response.json()).resolves.toMatchObject({
      error: { code: "payload_too_large" },
    });
  });
});
