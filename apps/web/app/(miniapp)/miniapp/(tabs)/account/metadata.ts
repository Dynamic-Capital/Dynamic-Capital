import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Account – Dynamic Capital Mini App";
const DESCRIPTION =
  "Check VIP status, manage billing preferences, and open concierge support without leaving Telegram.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.wallet.url,
    alt: MINIAPP_MARKS.wallet.name,
  },
});
