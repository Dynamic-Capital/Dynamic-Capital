declare module "*.module.scss" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.scss" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
}
