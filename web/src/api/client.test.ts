import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("does not refresh and retry magic-link verification failures", async () => {
    localStorage.setItem("rolevault_refresh_token", "refresh-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid or expired magic link" }),
    } as Response);

    await expect(
      apiFetch("/api/auth/magic-link/verify", {
        method: "POST",
        body: JSON.stringify({ token: "used-token" }),
      })
    ).rejects.toThrow("Invalid or expired magic link");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/auth/magic-link/verify");
  });
});
