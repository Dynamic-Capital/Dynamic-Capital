import { readFileSync } from "fs";
import { Agent } from "https";

const extraCa = import.meta.env.VITE_NODE_EXTRA_CA_CERTS as string | undefined;
export const httpsAgent = extraCa
  ? new Agent({ ca: readFileSync(extraCa) })
  : new Agent();
