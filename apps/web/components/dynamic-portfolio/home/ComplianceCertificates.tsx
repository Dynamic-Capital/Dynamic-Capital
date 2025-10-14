import Image from "next/image";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { schema } from "@/resources";

interface Certificate {
  name: string;
  description: string;
  certificateId: string;
  issuer: string;
  logoSrc: string;
  logoAlt: string;
}

const CERTIFICATES: Certificate[] = [
  {
    name: "ISO/IEC 27001:2022",
    description: "Certificate of ISO 27001",
    certificateId: "DC-ISMS-27001-2024",
    issuer: "Apex Assurance Ltd.",
    logoSrc: "/icons/compliance/iso-27001.svg",
    logoAlt: "ISO/IEC 27001 certification badge",
  },
  {
    name: "SOC 1 Type II",
    description: "Certificate of SOC 1",
    certificateId: "DC-SOC1-2024-T2",
    issuer: "Langford & Ames, LLP",
    logoSrc: "/icons/compliance/soc-1-type-ii.svg",
    logoAlt: "SOC 1 Type II attestation seal",
  },
  {
    name: "SOC 2 Type II",
    description: "Certificate of SOC 2",
    certificateId: "DC-SOC2-2024-T2",
    issuer: "Langford & Ames, LLP",
    logoSrc: "/icons/compliance/soc-2-type-ii.svg",
    logoAlt: "SOC 2 Type II attestation seal",
  },
  {
    name: "PCI DSS Level 1",
    description: "Certificate of PCI DSS",
    certificateId: "DC-PCI-2024-L1",
    issuer: "TrustShield QSA Services",
    logoSrc: "/icons/compliance/pci-dss.svg",
    logoAlt: "PCI DSS Level 1 compliance mark",
  },
  {
    name: "HIPAA Security & Privacy",
    description: "Certificate of HIPAA",
    certificateId: "DC-HIPAA-2024",
    issuer: "Veritas Healthcare Assessors",
    logoSrc: "/icons/compliance/hipaa.svg",
    logoAlt: "HIPAA compliance shield",
  },
  {
    name: "GDPR Article 27",
    description: "Certificate of GDPR",
    certificateId: "DC-GDPR-2024",
    issuer: "EuroTrust Compliance BV",
    logoSrc: "/icons/compliance/gdpr-article-27.svg",
    logoAlt: "GDPR Article 27 badge",
  },
  {
    name: "EU–US Data Privacy Framework",
    description: "Certificate of DPF",
    certificateId: "DPF-EE-2024-8821",
    issuer: "U.S. Department of Commerce",
    logoSrc: "/icons/compliance/eu-us-dpf.svg",
    logoAlt: "EU–US Data Privacy Framework shield",
  },
];

export function ComplianceCertificates() {
  const organizationName = schema.name;

  return (
    <Column
      id="compliance"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="24"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">
          Independent security &amp; privacy certifications
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          {organizationName}{" "}
          operates under audited controls for security, privacy, and data
          residency. Each certificate below is issued by an independent assessor
          and mapped to our evidence library for rapid vendor reviews.
        </Text>
      </Column>
      <Row gap="16" wrap>
        {CERTIFICATES.map((certificate) => (
          <Column
            key={certificate.certificateId}
            flex={1}
            minWidth={18}
            background="page"
            border="neutral-alpha-weak"
            radius="l"
            padding="l"
            gap="12"
          >
            <Row gap="12" vertical="center">
              <Image
                src={certificate.logoSrc}
                alt={certificate.logoAlt}
                width={48}
                height={48}
                style={{ height: "48px", width: "48px", objectFit: "contain" }}
              />
              <Heading as="h3" variant="heading-strong-m">
                {certificate.name}
              </Heading>
            </Row>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {certificate.description}
            </Text>
            <Text variant="body-default-s" onBackground="neutral-medium">
              Issuer: {certificate.issuer}
            </Text>
            <Tag size="s" background="brand-alpha-weak">
              {certificate.certificateId}
            </Tag>
          </Column>
        ))}
      </Row>
    </Column>
  );
}

export default ComplianceCertificates;
