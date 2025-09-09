"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface UserProfileProps {
  name: string;
  email?: string;
  avatarUrl?: string;
}

export default function UserProfile({ name, email, avatarUrl }: UserProfileProps) {
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowEmail(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center space-x-4">
      {avatarUrl && (
        <Image
          src={avatarUrl}
          alt={name}
          width={48}
          height={48}
          className="h-12 w-12 rounded-full object-cover"
        />
      )}
      <div>
        <p className="font-semibold">{name}</p>
        {showEmail && email && (
          <p className="text-sm text-muted-foreground">{email}</p>
        )}
      </div>
    </div>
  );
}

