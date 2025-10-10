import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { useWalletConnect } from "../useWalletConnect";

const onboardModule = vi.hoisted(() => ({
  getOnboard: vi.fn(),
}));

vi.mock("@/integrations/web3-onboard", () => onboardModule);

type ConnectFn = (options?: { planId?: string }) => Promise<boolean>;
type TestComponentProps = { onReady: (connect: ConnectFn) => void };

function TestComponent({ onReady }: TestComponentProps) {
  const connect = useWalletConnect();

  useEffect(() => {
    onReady(connect);
  }, [connect, onReady]);

  return null;
}

const getOnboardMock = onboardModule.getOnboard;

beforeEach(() => {
  getOnboardMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("useWalletConnect", () => {
  it("dispatches the wallet-connect event when Onboard is unavailable", async () => {
    const onReady = vi.fn<TestComponentProps["onReady"]>();
    const fallbackListener = vi.fn();
    const handleEvent = (event: Event) => {
      fallbackListener(event);
    };

    window.addEventListener("wallet-connect:open", handleEvent);

    try {
      getOnboardMock.mockResolvedValue(null);

      render(<TestComponent onReady={onReady} />);

      await waitFor(() => {
        expect(onReady).toHaveBeenCalled();
      });

      const [[connect]] = onReady.mock.calls as [[ConnectFn]];
      const result = await connect({ planId: "vip" });

      expect(result).toBe(true);
      await waitFor(() => {
        expect(fallbackListener).toHaveBeenCalledTimes(1);
      });
    } finally {
      window.removeEventListener("wallet-connect:open", handleEvent);
    }
  });
});
