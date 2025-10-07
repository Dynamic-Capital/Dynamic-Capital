import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Signals – Dynamic Capital Mini App";
const DESCRIPTION =
  "Follow live desk alerts, refresh feeds instantly, and route into VIP upgrades when signals fire.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.agi.url,
    alt: MINIAPP_MARKS.agi.name,
  },
});
