import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const supabaseModule = vi.hoisted(() => {
  const getUser = vi.fn();
  const from = vi.fn();

  return {
    supabase: {
      auth: { getUser },
      from,
    },
    getUser,
    from,
  };
});

const toastModule = vi.hoisted(() => {
  const success = vi.fn();
  const error = vi.fn();

  return {
    toast: {
      success: (...args: unknown[]) => success(...args),
      error: (...args: unknown[]) => error(...args),
    },
    success,
    error,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseModule.supabase,
}));

vi.mock("sonner", () => ({
  toast: toastModule.toast,
}));

const ORIGINAL_FETCH = globalThis.fetch;

let mockAddress = "";
let walletConnected = false;

vi.mock("@tonconnect/ui-react", () => ({
  TonConnectButton: () => <div data-testid="ton-connect" />,
  useTonWallet: () => (walletConnected ? {} : null),
  useTonAddress: () => mockAddress,
}));

const getUserMock = supabaseModule.getUser;
const fromMock = supabaseModule.from;
const toastSuccess = toastModule.success;
const toastError = toastModule.error;

const loadComponent = async () =>
  import("../TonWalletButton").then((module) => module.TonWalletButton);

type TonWalletButtonComponent = Awaited<ReturnType<typeof loadComponent>>;

describe("TonWalletButton", () => {
  let TonWalletButton: TonWalletButtonComponent;

  beforeEach(async () => {
    mockAddress = "";
    walletConnected = false;
    getUserMock.mockReset();
    fromMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();

    TonWalletButton = await loadComponent();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("validates and saves TON address", async () => {
    walletConnected = true;
    mockAddress =
      "0:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const updateSpy = vi.fn();
    const eqSpy = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({
      update: (values: unknown) => {
        updateSpy(values);
        return {
          eq: (_column: string, _value: string) => eqSpy(),
        };
      },
    });

    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          normalizedAddress:
            "0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
        { status: 200 },
      )
    ) as typeof fetch;

    render(<TonWalletButton />);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
    expect(updateSpy).toHaveBeenCalledWith({
      ton_wallet_address:
        "0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    await waitFor(() => expect(eqSpy).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("shows error when validation fails", async () => {
    walletConnected = true;
    mockAddress = "invalid";
    getUserMock.mockResolvedValue({ data: { user: { id: "user-2" } } });
    fromMock.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });

    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: "invalid" }), {
        status: 400,
      })
    ) as typeof fetch;

    render(<TonWalletButton />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });
});
