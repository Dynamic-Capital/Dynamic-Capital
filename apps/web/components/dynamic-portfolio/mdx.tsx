import { MDXRemote, MDXRemoteProps } from "next-mdx-remote/rsc";
import React, { Children, ReactNode } from "react";
import { slugify as transliterate } from "transliteration";

import {
  Accordion,
  AccordionGroup,
  Button,
  Card,
  CodeBlock,
  Column,
  Feedback,
  Grid,
  Heading,
  HeadingLink,
  Icon,
  InlineCode,
  Line,
  List,
  ListItem,
  Media,
  MediaProps,
  Row,
  SmartLink,
  Table,
  Text,
  TextProps,
} from "@/components/dynamic-ui-system";
import { SchoolCourseList } from "@/components/school/SchoolCourseList";

type CustomLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

function CustomLink({ href, children, ...props }: CustomLinkProps) {
  if (href.startsWith("/")) {
    return (
      <SmartLink href={href} {...props}>
        {children}
      </SmartLink>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function createImage({ alt, src, ...props }: MediaProps & { src: string }) {
  if (!src) {
    console.error("Media requires a valid 'src' property.");
    return null;
  }

  return (
    <Media
      marginTop="8"
      marginBottom="16"
      enlarge
      radius="m"
      border="neutral-alpha-medium"
      sizes="(max-width: 960px) 100vw, 960px"
      alt={alt}
      src={src}
      {...props}
    />
  );
}

function slugify(str: string): string {
  const strWithAnd = str.replace(/&/g, " and "); // Replace & with 'and'
  return transliterate(strWithAnd, {
    lowercase: true,
    separator: "-", // Replace spaces with -
  }).replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

function extractTextContent(
  children: ReactNode,
  { trim }: { trim?: boolean } = {}
): string {
  const text = Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      return "";
    })
    .join("");

  return trim ? text.trim() : text;
}

function createHeading(as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  const CustomHeading = ({
    children,
    ...props
  }: Omit<React.ComponentProps<typeof HeadingLink>, "as" | "id">) => {
    const textContent = extractTextContent(children, { trim: true });
    const slug = textContent ? slugify(textContent) : undefined;
    return (
      <HeadingLink
        marginTop="24"
        marginBottom="12"
        as={as}
        id={slug}
        {...props}
      >
        {children}
      </HeadingLink>
    );
  };

  CustomHeading.displayName = `${as}`;

  return CustomHeading;
}

function createParagraph({ children }: TextProps) {
  return (
    <Text
      style={{ lineHeight: "175%" }}
      variant="body-default-m"
      onBackground="neutral-medium"
      marginTop="8"
      marginBottom="12"
    >
      {children}
    </Text>
  );
}

function createInlineCode({ children }: { children: ReactNode }) {
  return <InlineCode>{children}</InlineCode>;
}

function createCodeBlock(props: any) {
  // For pre tags that contain code blocks
  if (
    props.children && props.children.props && props.children.props.className
  ) {
    const { className, children } = props.children.props;

    // Extract language from className (format: language-xxx)
    type CodeBlockLanguage = React.ComponentProps<
      typeof CodeBlock
    >["codes"][number]["language"];
    type DiffTuple = Extract<CodeBlockLanguage, ["diff", unknown]>;
    type DiffLanguage = DiffTuple extends ["diff", infer Lang]
      ? Lang
      : never;
    type SingleLanguage = Exclude<CodeBlockLanguage, DiffTuple>;

    const parsedLanguage =
      typeof className === "string" && className.startsWith("language-")
        ? className.replace("language-", "")
        : undefined;

    const normalizedLanguage: CodeBlockLanguage | null = (() => {
      if (!parsedLanguage) {
        return null;
      }

      if (parsedLanguage === "diff") {
        return parsedLanguage as SingleLanguage;
      }

      if (parsedLanguage.startsWith("diff-")) {
        const diffTarget = parsedLanguage.slice("diff-".length);
        if (!diffTarget) {
          return "diff" as SingleLanguage;
        }

        return [
          "diff",
          diffTarget as DiffLanguage extends string ? DiffLanguage : never,
        ] as CodeBlockLanguage;
      }

      return parsedLanguage as SingleLanguage;
    })();

    const label = normalizedLanguage
      ? Array.isArray(normalizedLanguage)
        ? normalizedLanguage[1].charAt(0).toUpperCase() +
          normalizedLanguage[1].slice(1)
        : normalizedLanguage.charAt(0).toUpperCase() +
          normalizedLanguage.slice(1)
      : "Code";

    const code = extractTextContent(children).replace(/\r\n/g, "\n").trimEnd();

    if (!normalizedLanguage) {
      return <pre {...props} />;
    }

    const codeInstance = {
      code,
      label,
      language: normalizedLanguage,
    } satisfies React.ComponentProps<typeof CodeBlock>["codes"][number];

    return (
      <CodeBlock
        marginTop="8"
        marginBottom="16"
        codes={[codeInstance]}
        copyButton={true}
      />
    );
  }

  // Fallback for other pre tags or empty code blocks
  return <pre {...props} />;
}

function createList({ children }: { children: ReactNode }) {
  return <List>{children}</List>;
}

function createListItem({ children }: { children: ReactNode }) {
  return (
    <ListItem marginTop="4" marginBottom="8" style={{ lineHeight: "175%" }}>
      {children}
    </ListItem>
  );
}

function createHR() {
  return (
    <Row fillWidth horizontal="center">
      <Line maxWidth="40" />
    </Row>
  );
}

const components = {
  p: createParagraph as any,
  h1: createHeading("h1") as any,
  h2: createHeading("h2") as any,
  h3: createHeading("h3") as any,
  h4: createHeading("h4") as any,
  h5: createHeading("h5") as any,
  h6: createHeading("h6") as any,
  img: createImage as any,
  a: CustomLink as any,
  code: createInlineCode as any,
  pre: createCodeBlock as any,
  ol: createList as any,
  ul: createList as any,
  li: createListItem as any,
  hr: createHR as any,
  Heading,
  Text,
  CodeBlock,
  InlineCode,
  Accordion,
  AccordionGroup,
  Table,
  Feedback,
  Button,
  Card,
  Grid,
  Row,
  Column,
  Icon,
  Media,
  SmartLink,
  SchoolCourseList,
};

type CustomMDXProps = MDXRemoteProps & {
  components?: typeof components;
};

export function CustomMDX(props: CustomMDXProps) {
  return (
    <MDXRemote
      {...props}
      components={{ ...components, ...(props.components || {}) }}
    />
  );
}
