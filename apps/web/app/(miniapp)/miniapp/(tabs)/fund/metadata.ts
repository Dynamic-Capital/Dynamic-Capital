import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Fund Transparency – Dynamic Capital Mini App";
const DESCRIPTION =
  "Audit DCT supply splits, burn cadence, and investor metrics backing the Dynamic Capital treasury.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.token.url,
    alt: MINIAPP_MARKS.token.name,
  },
});
