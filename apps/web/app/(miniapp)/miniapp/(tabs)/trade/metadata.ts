import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Trade Panel – Dynamic Capital Mini App";
const DESCRIPTION =
  "Launch desk playbooks, tune risk profiles, and route trades directly to the Dynamic Capital operators.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.trade.url,
    alt: MINIAPP_MARKS.trade.name,
  },
});
