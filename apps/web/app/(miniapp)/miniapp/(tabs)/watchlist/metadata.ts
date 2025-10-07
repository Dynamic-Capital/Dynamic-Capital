import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Watchlist – Dynamic Capital Mini App";
const DESCRIPTION =
  "Monitor live quotes, directional bias, and alerting windows for every tracked instrument.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.trade.url,
    alt: MINIAPP_MARKS.trade.name,
  },
});
