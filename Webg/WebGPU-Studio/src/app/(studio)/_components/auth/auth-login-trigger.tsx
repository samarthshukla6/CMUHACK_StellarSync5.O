"use client";

import * as React from "react";
import { removeSigningUpFlag } from "@/lib/utils/storage";

interface AuthLoginTriggerProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  className?: string;
}

export function AuthLoginTrigger({
  children,
  className,
  ...props
}: AuthLoginTriggerProps) {
  return (
    <a
      href="/auth/login"
      className={className}
      onClick={() => removeSigningUpFlag()}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      {...props}
    >
      {children}
    </a>
  );
}
