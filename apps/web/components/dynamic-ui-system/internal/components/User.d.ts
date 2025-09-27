import React from "react";
import { AvatarProps, TagProps } from ".";
interface UserProps {
  name?: string;
  children?: React.ReactNode;
  subline?: React.ReactNode;
  tag?: string;
  tagProps?: TagProps;
  loading?: boolean;
  avatarProps?: AvatarProps;
  className?: string;
}
declare const User: React.ForwardRefExoticComponent<
  UserProps & React.RefAttributes<HTMLDivElement>
>;
export { User };
export type { UserProps };
//# sourceMappingURL=User.d.ts.map
