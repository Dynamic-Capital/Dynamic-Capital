import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { notFound } from "next/navigation";

type Team = {
  name: string;
  role: string;
  avatar: string;
  linkedIn: string;
};

type Metadata = {
  title: string;
  publishedAt: string;
  summary: string;
  image?: string;
  images: string[];
  tag?: string;
  team: Team[];
  link?: string;
};

function normalizeImages(images: unknown, fallback?: string): string[] {
  if (Array.isArray(images)) {
    return images.filter((image): image is string => typeof image === "string");
  }

  if (typeof fallback === "string" && fallback.length > 0) {
    return [fallback];
  }

  return [];
}

function normalizeTeam(team: unknown): Team[] {
  if (!Array.isArray(team)) {
    return [];
  }

  return team
    .map((member) => {
      if (!member || typeof member !== "object") {
        return null;
      }

      const candidate = member as Partial<Team>;

      if (
        typeof candidate.name !== "string" ||
        typeof candidate.linkedIn !== "string"
      ) {
        return null;
      }

      return {
        name: candidate.name,
        role: typeof candidate.role === "string" ? candidate.role : "",
        avatar: typeof candidate.avatar === "string" ? candidate.avatar : "",
        linkedIn: candidate.linkedIn,
      } satisfies Team;
    })
    .filter((member): member is Team => member !== null);
}

function getMDXFiles(dir: string) {
  if (!fs.existsSync(dir)) {
    notFound();
  }

  return fs.readdirSync(dir).filter((file) => path.extname(file) === ".mdx");
}

function readMDXFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(rawContent);

  const metadata: Metadata = {
    title: typeof data.title === "string" ? data.title : "",
    publishedAt:
      typeof data.publishedAt === "string" && data.publishedAt.length > 0
        ? data.publishedAt
        : "1970-01-01",
    summary: typeof data.summary === "string" ? data.summary : "",
    image: typeof data.image === "string" && data.image.length > 0
      ? data.image
      : undefined,
    images: normalizeImages(data.images, data.image),
    tag: typeof data.tag === "string" && data.tag.length > 0
      ? data.tag
      : undefined,
    team: normalizeTeam(data.team),
    link: typeof data.link === "string" && data.link.length > 0
      ? data.link
      : undefined,
  };

  return { metadata, content };
}

function getMDXData(dir: string) {
  const mdxFiles = getMDXFiles(dir);
  return mdxFiles.map((file) => {
    const { metadata, content } = readMDXFile(path.join(dir, file));
    const slug = path.basename(file, path.extname(file));

    return {
      metadata,
      slug,
      content,
    };
  });
}

export function getPosts(customPath = ["", "", "", ""]) {
  const postsDir = path.join(process.cwd(), ...customPath);
  return getMDXData(postsDir);
}

const BRAND_NAME = "Dynamic Capital";
const BRAND_NAME_LOWERCASE = BRAND_NAME.toLowerCase();
const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

function toTitleCase(candidate: string): string {
  return candidate
    .split(/[-_\s]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function deriveGithubRepoName(link?: string): string | null {
  if (!link) {
    return null;
  }

  try {
    const url = new URL(link);
    if (!GITHUB_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    const repoSegment = segments[1] ?? segments[segments.length - 1];
    return toTitleCase(repoSegment ?? "");
  } catch {
    return null;
  }
}

export function brandProjectTitle(title: string, link?: string): string {
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  const branded = normalizedTitle.toLowerCase().includes(BRAND_NAME_LOWERCASE);

  if (!link) {
    return normalizedTitle || title;
  }

  const githubRepoTitle = deriveGithubRepoName(link);
  if (!githubRepoTitle) {
    return normalizedTitle || title;
  }

  if (branded) {
    return normalizedTitle;
  }

  const baseTitle = normalizedTitle || githubRepoTitle;
  return `${BRAND_NAME} – ${baseTitle}`;
}
