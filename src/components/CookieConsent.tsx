'use client';

import { useEffect, useState } from 'react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )cookie_consent=([^;]+)/);
    if (!match) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    document.cookie = `cookie_consent=true; path=/; max-age=${60 * 60 * 24 * 365}`;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 text-center z-50">
      <span>We use cookies to enhance your experience.</span>
      <button onClick={accept} className="ml-2 underline">
        Accept
      </button>
    </div>
  );
}
