import { about, person } from "@/resources";
import { Avatar, Button, Column, Heading, Line, Row, Tag, Text } from "@dynamic-ui-system/core";

const experiences = about.work.experiences ?? [];
const highlightExperience = experiences[0];
const secondaryExperience = experiences[1] ?? experiences[0];

export function AboutShowcase() {
  if (!highlightExperience) {
    return null;
  }

  return (
    <Column
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Row gap="24" s={{ direction: "column" }}>
        <Column flex={3} gap="16">
          <Row gap="16" vertical="center">
            <Avatar src={person.avatar} size="l" />
            <Column>
              <Heading variant="display-strong-xs">Meet the desk lead</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {person.name} · {person.role}
              </Text>
            </Column>
          </Row>
          <Text variant="body-default-l" onBackground="neutral-weak">
            {about.intro.description}
          </Text>
          <Row gap="8" wrap>
            {person.languages?.map((language) => (
              <Tag key={language} size="m" prefixIcon="globe">
                {language}
              </Tag>
            ))}
            <Tag size="m" prefixIcon="location">
              {person.location}
            </Tag>
          </Row>
        </Column>
        <Column flex={4} gap="20">
          <Heading as="h3" variant="display-strong-xs">
            Institutional pedigree
          </Heading>
          <Column gap="20">
            <Column
              border="brand-alpha-weak"
              background="brand-alpha-weak"
              radius="l"
              padding="m"
              gap="12"
            >
              <Text variant="heading-strong-s">{highlightExperience.company}</Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {highlightExperience.role} · {highlightExperience.timeframe}
              </Text>
              <Column as="ul" gap="8">
                {highlightExperience.achievements.map((achievement, index) => (
                  <Text as="li" key={index} variant="body-default-m">
                    {achievement}
                  </Text>
                ))}
              </Column>
            </Column>
            {secondaryExperience ? (
              <Column border="neutral-alpha-weak" radius="l" padding="m" gap="12">
                <Text variant="heading-strong-s">{secondaryExperience.company}</Text>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {secondaryExperience.role} · {secondaryExperience.timeframe}
                </Text>
                <Column as="ul" gap="8">
                  {secondaryExperience.achievements.map((achievement, index) => (
                    <Text as="li" key={index} variant="body-default-m">
                      {achievement}
                    </Text>
                  ))}
                </Column>
              </Column>
            ) : null}
          </Column>
        </Column>
      </Row>
      <Line background="neutral-alpha-weak" />
      <Row gap="16" s={{ direction: "column" }}>
        <Button
          href="/about"
          variant="secondary"
          size="m"
          data-border="rounded"
          arrowIcon
        >
          Dive into the full story
        </Button>
        {about.calendar.display ? (
          <Button
            href={about.calendar.link}
            variant="secondary"
            size="m"
            data-border="rounded"
            prefixIcon="calendar"
          >
            Book a desk consult
          </Button>
        ) : null}
      </Row>
    </Column>
  );
}

export default AboutShowcase;
