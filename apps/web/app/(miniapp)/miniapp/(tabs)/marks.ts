export const MINIAPP_MARKS = {
  capital: {
    name: "Dynamic Capital Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DC-Mark.svg",
  },
  agi: {
    name: "Dynamic AGI Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DAGI-Mark.svg",
  },
  token: {
    name: "Dynamic Capital Token Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DCT-Mark.svg",
  },
  fundPool: {
    name: "Dynamic Fund Pool Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DFP-Mark.svg",
  },
  intelligence: {
    name: "Dynamic Intelligence Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DI-Mark.svg",
  },
  learnEarn: {
    name: "Dynamic Learn & Earn Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DLE-Mark.svg",
  },
  liveMarket: {
    name: "Dynamic Live Market Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DLM-Mark.svg",
  },
  nft: {
    name: "Dynamic NFT Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DNFT-Mark.svg",
  },
  trade: {
    name: "Dynamic Trade Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DT-Mark.svg",
  },
  vip: {
    name: "Dynamic VIP Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DV-Mark.svg",
  },
  wallet: {
    name: "Dynamic Wallet Mark",
    url:
      "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DW-Mark.svg",
  },
} as const;

export type MiniAppMarkKey = keyof typeof MINIAPP_MARKS;
