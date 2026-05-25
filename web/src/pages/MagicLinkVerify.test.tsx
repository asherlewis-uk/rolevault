import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const authMock = vi.hoisted(() => ({
  verifyMagicLink: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ verifyMagicLink: authMock.verifyMagicLink }),
}));

import MagicLinkVerify from "./MagicLinkVerify";

function renderMagicLinkVerify() {
  return render(
    <MemoryRouter initialEntries={["/magic-link?token=token-123"]}>
      <Routes>
        <Route path="/magic-link" element={<MagicLinkVerify />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("MagicLinkVerify", () => {
  afterEach(() => {
    vi.clearAllMocks();
    authMock.verifyMagicLink = vi.fn();
  });

  it("verifies a one-time token only once when auth context rerenders", async () => {
    const firstVerify = vi.fn().mockResolvedValue(undefined);
    authMock.verifyMagicLink = firstVerify;

    const { rerender } = renderMagicLinkVerify();

    await waitFor(() => expect(firstVerify).toHaveBeenCalledTimes(1));
    expect(firstVerify).toHaveBeenCalledWith("token-123");
    await screen.findByText("You're signed in!");

    const secondVerify = vi.fn().mockResolvedValue(undefined);
    authMock.verifyMagicLink = secondVerify;

    rerender(
      <MemoryRouter initialEntries={["/magic-link?token=token-123"]}>
        <Routes>
          <Route path="/magic-link" element={<MagicLinkVerify />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(secondVerify).not.toHaveBeenCalled();
  });
});
