import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Home – Dynamic Capital Mini App";
const DESCRIPTION =
  "Welcome members to real-time trading insights, VIP offers, and concierge updates curated for Telegram.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.capital.url,
    alt: MINIAPP_MARKS.capital.name,
  },
});
