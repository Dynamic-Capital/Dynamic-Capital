import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Portfolio Overview – Dynamic Capital Mini App";
const DESCRIPTION =
  "Track equity curves, automation priorities, and risk telemetry powering Dynamic Capital intelligence.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.intelligence.url,
    alt: MINIAPP_MARKS.intelligence.name,
  },
});
