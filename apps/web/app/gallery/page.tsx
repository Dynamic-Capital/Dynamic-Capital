import { Flex, Meta, Schema } from "@/components/dynamic-ui-system";
import GalleryView from "@/components/dynamic-capital/gallery/GalleryView";
import { baseURL, gallery, person, toAbsoluteUrl } from "@/resources";

export async function generateMetadata() {
  return Meta.generate({
    title: gallery.title,
    description: gallery.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(gallery.title)}`,
    path: gallery.path,
  });
}

export default function Gallery() {
  return (
    <Flex maxWidth="l">
      <Schema
        as="webPage"
        baseURL={baseURL}
        title={gallery.title}
        description={gallery.description}
        path={gallery.path}
        image={`/api/og/generate?title=${encodeURIComponent(gallery.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${gallery.path}`,
          image: toAbsoluteUrl(baseURL, person.avatar),
        }}
      />
      <GalleryView />
    </Flex>
  );
}
