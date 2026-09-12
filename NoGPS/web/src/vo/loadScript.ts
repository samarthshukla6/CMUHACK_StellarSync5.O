// TF.js and its models ship an internal dynamic-import graph for lazy ops
// (chained ops, gradients, backends). When loaded via a generic ESM CDN
// re-bundle (jsdelivr/esm.sh "+esm"), those internal imports resolve as
// root-relative paths against the *page's* origin instead of the CDN's,
// so every nested chunk 404s against our own server. The UMD "browser
// script" builds TF.js officially publishes are self-contained and don't
// have this problem — load those as classic <script> tags instead.

const loaded = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  let p = loaded.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.appendChild(el);
    });
    loaded.set(src, p);
  }
  return p;
}
