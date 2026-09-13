"use client";

import { useEffect, useRef, useState } from "react";

export function ShortVideoPlayer({ src, label, immersive = false }: { src: string; label: string; immersive?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry.isIntersecting) setNear(true);
      if (entry.intersectionRatio < .7) player.pause();
    }, { threshold: [0, .7] });
    observer.observe(player);
    const pause = () => { if (document.hidden) player.pause(); };
    document.addEventListener("visibilitychange", pause);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", pause); player.pause(); };
  }, []);
  return <div className={`short-player ${immersive ? "immersive" : ""}`}>
    <video ref={ref} src={near ? src : undefined} controls playsInline loop={immersive} muted preload="none" aria-label={label || "Collector video"} onError={() => setFailed(true)}/>
    {failed && <p className="video-playback-error" role="alert">This video is unavailable. Refresh to try again.</p>}
  </div>;
}
