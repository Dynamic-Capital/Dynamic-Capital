import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "VIP Access – Dynamic Capital Mini App";
const DESCRIPTION =
  "Manage concierge channels, upgrade options, and exclusive perks that accompany Dynamic Capital membership.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.vip.url,
    alt: MINIAPP_MARKS.vip.name,
  },
});
