import { createMiniAppMetadata } from "../metadata-utils";
import { MINIAPP_MARKS } from "../marks";

const TITLE = "Learn & Earn – Dynamic Capital Mini App";
const DESCRIPTION =
  "Access trading curriculum, mentor tasks, and reward unlocks that compound your desk performance.";

export const metadata = createMiniAppMetadata({
  title: TITLE,
  description: DESCRIPTION,
  image: {
    url: MINIAPP_MARKS.learnEarn.url,
    alt: MINIAPP_MARKS.learnEarn.name,
  },
});
