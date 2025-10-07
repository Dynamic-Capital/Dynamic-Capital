import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Mentorship – Dynamic Capital Mini App";
const DESCRIPTION =
  "Coordinate mentor chat, escalate calls, and log collectible progress badges for your trading journey.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.nft.url,
    alt: MINIAPP_MARKS.nft.name,
  },
});
