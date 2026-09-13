"use client";

import { upload } from "@vercel/blob/client";
import { Film, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { VIDEO_DURATION_LIMIT, VIDEO_STORAGE_LIMIT, VIDEO_TYPES } from "@/lib/media-policy";

export type SelectedVideo = { file: File; preview: string; duration: number; assetId: string; uploaded?: boolean };

export async function publishVideo(video: SelectedVideo, caption: string, onProgress: (value: string) => void) {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in to share a video");
  const token = await user.getIdToken();
  if (!video.uploaded) {
    onProgress("Uploading…");
    await upload(`videos/${user.uid}/${video.assetId}.mp4`, video.file, { access: "private", contentType: video.file.type,
      handleUploadUrl: "/api/media/video-upload", headers: { Authorization: `Bearer ${token}` },
      onUploadProgress: progress => onProgress(`Uploading ${Math.round(progress.percentage)}%…`) });
    video.uploaded = true;
  }
  onProgress("Checking video safety…");
  const response = await fetch("/api/media/videos", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ assetId: video.assetId, caption }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Video could not be published");
  return result.postId as string;
}

export function VideoUploader({ value, onChange }: { value: SelectedVideo | null; onChange: (value: SelectedVideo | null) => void }) {
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const currentPreview = useRef("");
  useEffect(() => () => { requestId.current++; if (currentPreview.current) URL.revokeObjectURL(currentPreview.current); }, []);
  async function choose(file: File) {
    const selection = ++requestId.current;
    setError("");
    if (!VIDEO_TYPES.includes(file.type) || file.size > VIDEO_STORAGE_LIMIT) { setError("Choose an MP4 video up to 20 MB."); return; }
    const preview = URL.createObjectURL(file);
    const player = document.createElement("video");
    player.preload = "metadata";
    try {
      const duration = await new Promise<number>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("Could not read this video. Try an MP4 export.")), 10_000);
        player.onloadedmetadata = () => { clearTimeout(timer); resolve(player.duration); };
        player.onerror = () => { clearTimeout(timer); reject(new Error("This video cannot be played. Try an MP4 export.")); };
        player.src = preview;
      });
      if (!Number.isFinite(duration) || duration <= 0 || duration > VIDEO_DURATION_LIMIT || player.videoWidth > 1920 || player.videoHeight > 1920) throw new Error("Use a video up to 60 seconds and 1920 pixels per side. Portrait works best.");
      if (selection !== requestId.current) { URL.revokeObjectURL(preview); return; }
      if (currentPreview.current) URL.revokeObjectURL(currentPreview.current);
      currentPreview.current = preview;
      onChange({ file, preview, duration, assetId: crypto.randomUUID() });
    } catch (reason) { URL.revokeObjectURL(preview); setError(reason instanceof Error ? reason.message : "Unable to read video"); }
    finally { player.removeAttribute("src"); player.load(); }
  }
  return <section className="video-upload">
    {value ? <><video src={value.preview} controls playsInline preload="metadata" aria-label="Preview your short"/><button type="button" className="btn btn-ghost" onClick={() => { requestId.current++; onChange(null); URL.revokeObjectURL(currentPreview.current); currentPreview.current = ""; }}><X size={16}/>Remove video</button></> :
      <label className="video-drop"><Film size={32}/><strong>Give your collection a moment.</strong><span>Unbox a find. Tour your shelf. Show the details.</span><em>Choose a video</em><input type="file" accept="video/mp4" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void choose(file); }}/></label>}
    <small>Up to 60 seconds · 20 MB · MP4. Videos are checked before publishing.</small>
    {error && <p className="form-alert" role="alert">{error}</p>}
  </section>;
}
