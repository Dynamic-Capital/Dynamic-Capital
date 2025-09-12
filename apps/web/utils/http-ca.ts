import { readFileSync } from "fs";
import { Agent } from "https";

const extraCa = process.env.NODE_EXTRA_CA_CERTS;

let httpsAgent: Agent;

if (extraCa) {
  try {
    httpsAgent = new Agent({ ca: readFileSync(extraCa) });
  } catch (error) {
    console.warn(`Failed to read extra CA certificate from ${extraCa}`, error);
    httpsAgent = new Agent();
  }
} else {
  httpsAgent = new Agent();
}

export { httpsAgent };
