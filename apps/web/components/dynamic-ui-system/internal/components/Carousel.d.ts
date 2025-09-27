import { SpacingToken } from "@/types";
import { Flex } from ".";
interface CarouselItem {
  slide: string | React.ReactNode;
  alt?: string;
}
interface ThumbnailItem {
  scaling?: number;
  height?: SpacingToken | number;
  sizes?: string;
}
interface CarouselProps extends React.ComponentProps<typeof Flex> {
  items: CarouselItem[];
  controls?: boolean;
  priority?: boolean;
  fill?: boolean;
  indicator?: "line" | "thumbnail" | false;
  translateY?: SpacingToken | number;
  aspectRatio?: string;
  sizes?: string;
  revealedByDefault?: boolean;
  thumbnail?: ThumbnailItem;
  play?: {
    auto?: boolean;
    interval?: number;
    controls?: boolean;
    progress?: boolean;
  };
}
declare const Carousel: React.FC<CarouselProps>;
export { Carousel };
//# sourceMappingURL=Carousel.d.ts.map
