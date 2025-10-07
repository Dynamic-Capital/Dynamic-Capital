import { notFound } from "next/navigation";
import { brandProjectTitle, getPosts } from "@/utils/dynamic-portfolio/utils";
import {
  AvatarGroup,
  Column,
  Heading,
  Line,
  Media,
  Meta,
  Row,
  Schema,
  SmartLink,
  Text,
} from "@/components/dynamic-ui-system";
import { about, baseURL, person, toAbsoluteUrl, work } from "@/resources";
import { formatDate } from "@/utils/dynamic-portfolio/formatDate";
import { CustomMDX, ScrollToHash } from "@/components/dynamic-portfolio";
import type { Metadata } from "next";
import { cache } from "react";
import { Projects } from "@/components/dynamic-portfolio/work";
import { Badge } from "@/components/ui/badge";

type WorkPageParams = { slug: string | string[] };
type WorkPageProps = {
  params?: Promise<WorkPageParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const WORK_POSTS_PATH = ["app", "work", "projects"] as const;

const loadWorkPosts = cache(() => getPosts(Array.from(WORK_POSTS_PATH)));

const resolveSlugFromParams = async (
  params: WorkPageProps["params"],
): Promise<string> => {
  if (!params) return "";

  const resolved = await params;
  const slug = Array.isArray(resolved.slug)
    ? resolved.slug.join("/")
    : resolved.slug;

  return slug || "";
};

const findWorkPost = (slug: string) =>
  loadWorkPosts().find((post) => post.slug === slug);

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return loadWorkPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  { params }: WorkPageProps,
): Promise<Metadata> {
  const slugPath = await resolveSlugFromParams(params);
  const post = findWorkPost(slugPath);

  if (!post) return {};

  const brandedTitle = brandProjectTitle(
    post.metadata.title,
    post.metadata.link,
  );

  return Meta.generate({
    title: brandedTitle,
    description: post.metadata.summary,
    baseURL: baseURL,
    image: post.metadata.image ||
      `/api/og/generate?title=${encodeURIComponent(brandedTitle)}`,
    path: `${work.path}/${post.slug}`,
  });
}

export default async function Project({ params }: WorkPageProps) {
  const slugPath = await resolveSlugFromParams(params);
  const post = findWorkPost(slugPath);

  if (!post) {
    notFound();
  }

  const avatars = post.metadata.team?.map((person) => ({
    src: person.avatar,
  })) || [];

  const brandedTitle = brandProjectTitle(
    post.metadata.title,
    post.metadata.link,
  );

  return (
    <Column as="section" maxWidth="m" horizontal="center" gap="l">
      <Schema
        as="blogPosting"
        baseURL={baseURL}
        path={`${work.path}/${post.slug}`}
        title={brandedTitle}
        description={post.metadata.summary}
        datePublished={post.metadata.publishedAt}
        dateModified={post.metadata.publishedAt}
        image={post.metadata.image ||
          `/api/og/generate?title=${encodeURIComponent(brandedTitle)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: toAbsoluteUrl(baseURL, person.avatar),
        }}
      />
      <Column maxWidth="s" gap="16" horizontal="center" align="center">
        <Badge
          variant="outline"
          className="self-center border-dc-brand/30 bg-dc-brand/10 px-4 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-dc-brand-dark"
        >
          Dynamic Capital • ISO 27001
        </Badge>
        <SmartLink href="/work">
          <Text variant="label-strong-m">Projects</Text>
        </SmartLink>
        <Text
          variant="body-default-xs"
          onBackground="neutral-weak"
          marginBottom="12"
        >
          {post.metadata.publishedAt && formatDate(post.metadata.publishedAt)}
        </Text>
        <Heading variant="display-strong-m">{brandedTitle}</Heading>
      </Column>
      <Row marginBottom="32" horizontal="center">
        <Row gap="16" vertical="center">
          {post.metadata.team && (
            <AvatarGroup reverse avatars={avatars} size="s" />
          )}
          <Text variant="label-default-m" onBackground="brand-weak">
            {post.metadata.team?.map((member, idx) => (
              <span key={idx}>
                {idx > 0 && (
                  <Text as="span" onBackground="neutral-weak">
                    ,{" "}
                  </Text>
                )}
                <SmartLink href={member.linkedIn}>{member.name}</SmartLink>
              </span>
            ))}
          </Text>
        </Row>
      </Row>
      {post.metadata.images.length > 0 && (
        <Media
          priority
          aspectRatio="16 / 9"
          radius="m"
          alt="image"
          src={post.metadata.images[0]}
        />
      )}
      <Column style={{ margin: "auto" }} as="article" maxWidth="xs">
        <CustomMDX source={post.content} />
      </Column>
      <Column fillWidth gap="40" horizontal="center" marginTop="40">
        <Line maxWidth="40" />
        <Heading as="h2" variant="heading-strong-xl" marginBottom="24">
          Related projects
        </Heading>
        <Projects exclude={[post.slug]} range={[2]} />
      </Column>
      <ScrollToHash />
    </Column>
  );
}
