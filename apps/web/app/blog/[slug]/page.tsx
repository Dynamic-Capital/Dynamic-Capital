import { notFound } from "next/navigation";
import { CustomMDX, ScrollToHash } from "@/components/dynamic-portfolio";
import {
  Avatar,
  Column,
  Heading,
  HeadingNav,
  Icon,
  Line,
  Media,
  Meta,
  Row,
  Schema,
  SmartLink,
  Text,
} from "@/components/dynamic-ui-system";
import { about, baseURL, blog, person, toAbsoluteUrl } from "@/resources";
import { formatDate } from "@/utils/dynamic-portfolio/formatDate";
import { getPosts } from "@/utils/dynamic-portfolio/utils";
import type { Metadata } from "next";
import { cache } from "react";
import { Posts } from "@/components/dynamic-portfolio/blog/Posts";
import { ShareSection } from "@/components/dynamic-portfolio/blog/ShareSection";

type BlogPageParams = { slug: string | string[] };
type BlogPageProps = {
  params?: Promise<BlogPageParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const BLOG_POSTS_PATH = ["app", "blog", "posts"] as const;

const loadBlogPosts = cache(() => getPosts(Array.from(BLOG_POSTS_PATH)));

const resolveSlugFromParams = async (
  params: BlogPageProps["params"],
): Promise<string> => {
  if (!params) return "";

  const resolved = await params;
  const slug = Array.isArray(resolved.slug)
    ? resolved.slug.join("/")
    : resolved.slug;

  return slug || "";
};

const findBlogPost = (slug: string) =>
  loadBlogPosts().find((post) => post.slug === slug);

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return loadBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  { params }: BlogPageProps,
): Promise<Metadata> {
  const slugPath = await resolveSlugFromParams(params);
  const post = findBlogPost(slugPath);

  if (!post) return {};

  return Meta.generate({
    title: post.metadata.title,
    description: post.metadata.summary,
    baseURL: baseURL,
    image: post.metadata.image ||
      `/api/og/generate?title=${post.metadata.title}`,
    path: `${blog.path}/${post.slug}`,
  });
}

export default async function Blog({ params }: BlogPageProps) {
  const slugPath = await resolveSlugFromParams(params);
  const post = findBlogPost(slugPath);

  if (!post) {
    notFound();
    return null;
  }

  const avatars = post.metadata.team?.map((person) => ({
    src: person.avatar,
  })) || [];

  return (
    <Row fillWidth>
      <Row maxWidth={12} m={{ hide: true }} />
      <Row fillWidth horizontal="center">
        <Column
          as="section"
          maxWidth="m"
          horizontal="center"
          gap="l"
          paddingTop="24"
        >
          <Schema
            as="blogPosting"
            baseURL={baseURL}
            path={`${blog.path}/${post.slug}`}
            title={post.metadata.title}
            description={post.metadata.summary}
            datePublished={post.metadata.publishedAt}
            dateModified={post.metadata.publishedAt}
            image={post.metadata.image ||
              `/api/og/generate?title=${
                encodeURIComponent(post.metadata.title)
              }`}
            author={{
              name: person.name,
              url: `${baseURL}${about.path}`,
              image: toAbsoluteUrl(baseURL, person.avatar),
            }}
          />
          <Column maxWidth="s" gap="16" horizontal="center" align="center">
            <SmartLink href="/blog">
              <Text variant="label-strong-m">Blog</Text>
            </SmartLink>
            <Text
              variant="body-default-xs"
              onBackground="neutral-weak"
              marginBottom="12"
            >
              {post.metadata.publishedAt &&
                formatDate(post.metadata.publishedAt)}
            </Text>
            <Heading variant="display-strong-m">{post.metadata.title}</Heading>
          </Column>
          <Row marginBottom="32" horizontal="center">
            <Row gap="16" vertical="center">
              <Avatar size="s" src={person.avatar} />
              <Text variant="label-default-m" onBackground="brand-weak">
                {person.name}
              </Text>
            </Row>
          </Row>
          {post.metadata.image && (
            <Media
              src={post.metadata.image}
              alt={post.metadata.title}
              aspectRatio="16/9"
              priority
              sizes="(min-width: 768px) 100vw, 768px"
              border="neutral-alpha-weak"
              radius="l"
              marginTop="12"
              marginBottom="8"
            />
          )}
          <Column as="article" maxWidth="s">
            <CustomMDX source={post.content} />
          </Column>

          <ShareSection
            title={post.metadata.title}
            url={`${baseURL}${blog.path}/${post.slug}`}
          />

          <Column fillWidth gap="40" horizontal="center" marginTop="40">
            <Line maxWidth="40" />
            <Heading as="h2" variant="heading-strong-xl" marginBottom="24">
              Recent posts
            </Heading>
            <Posts
              exclude={[post.slug]}
              range={[1, 2]}
              columns="2"
              thumbnail
              direction="column"
            />
          </Column>
          <ScrollToHash />
        </Column>
      </Row>
      <Column
        maxWidth={12}
        paddingLeft="40"
        fitHeight
        position="sticky"
        top="80"
        gap="16"
        m={{ hide: true }}
      >
        <Row
          gap="12"
          paddingLeft="2"
          vertical="center"
          onBackground="neutral-medium"
          textVariant="label-default-s"
        >
          <Icon name="document" size="xs" />
          On this page
        </Row>
        <HeadingNav fitHeight />
      </Column>
    </Row>
  );
}
