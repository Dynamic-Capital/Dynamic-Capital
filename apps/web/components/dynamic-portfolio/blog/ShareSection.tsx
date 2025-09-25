"use client";

import { Button, Row, Text, useToast } from "@once-ui-system/core";
import { socialSharing } from "@/resources";

interface ShareSectionProps {
  title: string;
  url: string;
}

interface SocialPlatform {
  name: string;
  icon: string;
  label: string;
  generateUrl: (title: string, url: string) => string;
}

const socialPlatforms = {
  x: {
    name: "x",
    icon: "twitter",
    label: "X",
    generateUrl: (title, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${
        encodeURIComponent(url)
      }`,
  },
  linkedin: {
    name: "linkedin",
    icon: "linkedin",
    label: "LinkedIn",
    generateUrl: (title, url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${
        encodeURIComponent(url)
      }`,
  },
  facebook: {
    name: "facebook",
    icon: "facebook",
    label: "Facebook",
    generateUrl: (title, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  pinterest: {
    name: "pinterest",
    icon: "pinterest",
    label: "Pinterest",
    generateUrl: (title, url) =>
      `https://pinterest.com/pin/create/button/?url=${
        encodeURIComponent(url)
      }&description=${encodeURIComponent(title)}`,
  },
  whatsapp: {
    name: "whatsapp",
    icon: "whatsapp",
    label: "WhatsApp",
    generateUrl: (title, url) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  reddit: {
    name: "reddit",
    icon: "reddit",
    label: "Reddit",
    generateUrl: (title, url) =>
      `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${
        encodeURIComponent(title)
      }`,
  },
  telegram: {
    name: "telegram",
    icon: "telegram",
    label: "Telegram",
    generateUrl: (title, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${
        encodeURIComponent(title)
      }`,
  },
  email: {
    name: "email",
    icon: "email",
    label: "Email",
    generateUrl: (title, url) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${
        encodeURIComponent(`Check out this post: ${url}`)
      }`,
  },
} satisfies Record<string, SocialPlatform>;

export function ShareSection({ title, url }: ShareSectionProps) {
  const { addToast } = useToast();
  // Don't render if sharing is disabled
  if (!socialSharing.display) {
    return null;
  }

  const handleCopy = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(url);
      addToast({
        variant: "success",
        message: "Link copied to clipboard",
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to copy link", err);
      }
      addToast({
        variant: "danger",
        message: "Failed to copy link",
      });
    }
  };

  type PlatformKey = keyof typeof socialSharing.platforms;

  const enabledPlatforms = (
    Object.entries(socialSharing.platforms) as Array<[PlatformKey, boolean]>
  ).reduce<Array<SocialPlatform & { key: PlatformKey }>>(
    (acc, [platformKey, enabled]) => {
      if (!enabled || platformKey === "copyLink") {
        return acc;
      }

      if (!(platformKey in socialPlatforms)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `Share platform "${platformKey}" is enabled but has no configuration.`,
          );
        }
        return acc;
      }

      const platform =
        socialPlatforms[platformKey as keyof typeof socialPlatforms];
      acc.push({ key: platformKey, ...platform });
      return acc;
    },
    [],
  );

  return (
    <Row fillWidth center gap="16" marginTop="32" marginBottom="16">
      <Text variant="label-default-m" onBackground="neutral-weak">
        Share this post:
      </Text>
      <Row data-border="rounded" gap="16" horizontal="center" wrap>
        {enabledPlatforms.map((platform) => (
          <Button
            key={platform.key}
            variant="secondary"
            size="s"
            href={platform.generateUrl(title, url)}
            prefixIcon={platform.icon}
            aria-label={`Share on ${platform.label}`}
          />
        ))}

        {socialSharing.platforms.copyLink && (
          <Button
            variant="secondary"
            size="s"
            onClick={handleCopy}
            prefixIcon="openLink"
            aria-label="Copy share link"
          />
        )}
      </Row>
    </Row>
  );
}
