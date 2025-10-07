import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Live Market – Dynamic Capital Mini App";
const DESCRIPTION =
  "Stream market pulse metrics, cross-asset heatmaps, and regime diagnostics directly from the trading desk.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.liveMarket.url,
    alt: MINIAPP_MARKS.liveMarket.name,
  },
});
