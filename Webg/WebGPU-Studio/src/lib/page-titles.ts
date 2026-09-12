/**
 * Document titles per path (pathname → title).
 */
export const SECTION_TITLES: Record<string, string> = {
  "/": "Chat | WebGPU Studio",
  "/chat": "Chat | WebGPU Studio",
  "/vision": "Vision | WebGPU Studio",
} as const;

export function getPageTitle(pathname: string): string {
  const normalized = pathname === "" ? "/" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  return SECTION_TITLES[normalized] ?? "WebGPU Studio";
}
