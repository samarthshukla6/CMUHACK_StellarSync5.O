"use client";

import { memo, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "@/app/page.module.css";

function StudioMainAreaInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const routes = ["/vision"];
    const idle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback
        : (cb: IdleRequestCallback) => window.setTimeout(cb, 1500);
    const id = idle(() => {
      for (const href of routes) {
        if (href !== pathname) void router.prefetch(href);
      }
    });
    return () => {
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(id as number);
      else clearTimeout(id as number);
    };
  }, [pathname, router]);

  return (
    <div className={styles.mainContainer}>
      <main className={styles.content}>{children}</main>
    </div>
  );
}

export const StudioMainArea = memo(StudioMainAreaInner);
