import { IconButton, Row, Text } from "@/components/dynamic-ui-system";
import { schema, social } from "@/resources";
import styles from "./Footer.module.scss";
import { MobileFooterNav } from "./MobileFooterNav";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const organizationName = schema.name;

  return (
    <>
      <Row
        as="footer"
        fillWidth
        padding="8"
        horizontal="center"
        s={{ direction: "column" }}
      >
        <Row
          className={styles.mobile}
          maxWidth="m"
          paddingY="8"
          paddingX="16"
          gap="16"
          horizontal="between"
          vertical="center"
          s={{
            direction: "column",
            horizontal: "center",
            align: "center",
          }}
        >
          <Text variant="body-default-s" onBackground="neutral-strong">
            <Text onBackground="neutral-weak">© {currentYear} /</Text>
            <Text paddingX="4">{organizationName}</Text>
          </Text>
          <Row gap="16">
            {social.map(
              (item) =>
                item.link && (
                  <IconButton
                    key={item.name}
                    href={item.link}
                    icon={item.icon}
                    tooltip={item.name}
                    size="s"
                    variant="ghost"
                  />
                ),
            )}
          </Row>
        </Row>
        <Row height={96} hide s={{ hide: false }} />
      </Row>
      <MobileFooterNav />
    </>
  );
};
