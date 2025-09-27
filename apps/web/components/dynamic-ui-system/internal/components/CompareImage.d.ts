import { Flex } from ".";
interface SideContent {
  src: string | React.ReactNode;
  alt?: string;
}
interface CompareImageProps extends React.ComponentProps<typeof Flex> {
  leftContent: SideContent;
  rightContent: SideContent;
}
declare const CompareImage: {
  (
    { leftContent, rightContent, ...rest }: CompareImageProps,
  ): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
export { CompareImage };
//# sourceMappingURL=CompareImage.d.ts.map
