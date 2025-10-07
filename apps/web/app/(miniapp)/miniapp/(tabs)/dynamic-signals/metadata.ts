import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Dynamic Signals – Dynamic Capital Mini App";
const DESCRIPTION =
  "Receive AI-orchestrated trade signals, confidence scores, and upgrade prompts without leaving Telegram.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.agi.url,
    alt: MINIAPP_MARKS.agi.name,
  },
});
