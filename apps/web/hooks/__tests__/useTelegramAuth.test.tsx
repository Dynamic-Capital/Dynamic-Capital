import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/supabase", () => ({
  buildFunctionUrl: vi.fn(() => "https://functions.test/admin-check"),
  callEdgeFunction: vi.fn(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { TelegramAuthProvider } from "../useTelegramAuth";
import { AdminGate } from "@/components/admin/AdminGate";
import { callEdgeFunction } from "@/config/supabase";

describe("TelegramAuthProvider admin token validation", () => {
  const callEdgeFunctionMock = vi.mocked(callEdgeFunction);

  beforeEach(() => {
    callEdgeFunctionMock.mockReset();
    localStorage.clear();
  });

  it("renders children when a stored admin token is validated", async () => {
    callEdgeFunctionMock.mockResolvedValueOnce({ data: { ok: true } });

    localStorage.setItem("dc_admin_token", "valid-token");

    render(
      <TelegramAuthProvider>
        <AdminGate>
          <div>Admin dashboard</div>
        </AdminGate>
      </TelegramAuthProvider>,
    );

    await waitFor(() =>
      expect(callEdgeFunctionMock).toHaveBeenCalledWith(
        "ADMIN_CHECK",
        expect.objectContaining({ method: "GET", token: "valid-token" }),
      )
    );

    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();
    expect(localStorage.getItem("dc_admin_token")).toBe("valid-token");
  });

  it("rejects tampered admin tokens and keeps the gate closed", async () => {
    callEdgeFunctionMock.mockResolvedValueOnce({
      error: { status: 401, message: "Invalid token" },
    });

    localStorage.setItem("dc_admin_token", "tampered-token");

    render(
      <TelegramAuthProvider>
        <AdminGate>
          <div>Admin dashboard</div>
        </AdminGate>
      </TelegramAuthProvider>,
    );

    expect(
      await screen.findByText("Admin token rejected"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Admin dashboard")).not.toBeInTheDocument();
    expect(localStorage.getItem("dc_admin_token")).toBeNull();
  });
});
