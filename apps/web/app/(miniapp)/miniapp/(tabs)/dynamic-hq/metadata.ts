import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Dynamic HQ – Dynamic Capital Mini App";
const DESCRIPTION =
  "Command center for automation status, VIP agendas, and desk announcements inside the Dynamic Capital mini app.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.capital.url,
    alt: MINIAPP_MARKS.capital.name,
  },
});
