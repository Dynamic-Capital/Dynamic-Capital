import { IconLibrary } from "../icons";
export declare const IconContext: import("react").Context<{
  icons: IconLibrary;
}>;
export declare const IconProvider: ({ icons, children }: {
  icons?: Partial<IconLibrary>;
  children: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useIcons: () => {
  icons: IconLibrary;
};
//# sourceMappingURL=IconProvider.d.ts.map
