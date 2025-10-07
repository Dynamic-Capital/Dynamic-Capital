import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Dynamic Watchlist – Dynamic Capital Mini App";
const DESCRIPTION =
  "Review curated catalysts, bias shifts, and execution notes for the desk’s priority assets.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.trade.url,
    alt: MINIAPP_MARKS.trade.name,
  },
});
