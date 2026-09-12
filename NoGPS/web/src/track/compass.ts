export interface CompassHandle {
  canvas: HTMLCanvasElement;
  setHeading: (deg: number) => void;
}

export function mountCompass(host: HTMLElement): CompassHandle {
  const canvas = document.createElement("canvas");
  canvas.className = "compass-ticks";
  host.appendChild(canvas);
  let heading = 0;

  const draw = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const w = host.clientWidth;
    const h = host.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pxPerDeg = w / 90;
    const start = heading - 45;
    for (let deg = Math.floor(start / 5) * 5; deg <= heading + 45; deg += 5) {
      const x = w / 2 + (deg - heading) * pxPerDeg;
      const major = deg % 15 === 0;
      ctx.strokeStyle = major ? "rgba(243,246,251,0.65)" : "rgba(243,246,251,0.2)";
      ctx.lineWidth = major ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(x, major ? h * 0.12 : h * 0.32);
      ctx.lineTo(x, h * 0.88);
      ctx.stroke();
    }
  };

  const setHeading = (deg: number): void => {
    heading = deg;
    draw();
  };

  const ro = new ResizeObserver(draw);
  ro.observe(host);
  draw();
  return { canvas, setHeading };
}
