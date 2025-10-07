import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Dynamic Pool Trading – Dynamic Capital Mini App";
const DESCRIPTION =
  "Review managed pool performance, guardrails, and allocation requests with institutional transparency.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.fundPool.url,
    alt: MINIAPP_MARKS.fundPool.name,
  },
});
