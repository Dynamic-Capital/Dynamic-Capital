const SITE_URL = process.env.SITE_URL || 'http://localhost:8080';

const config = {
  titleTemplate: '%s | Dynamic Capital VIP',
  defaultTitle: 'Dynamic Capital VIP',
  description: 'Premium trading platform with Next.js',
  canonical: SITE_URL,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    site_name: 'Dynamic Capital VIP',
    description: 'Premium trading platform with Next.js'
  },
  twitter: {
    cardType: 'summary_large_image'
  }
};

export default config;
