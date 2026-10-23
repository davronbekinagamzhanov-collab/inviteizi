import { notFound } from "next/navigation";
import { MusicRenderer } from "./MusicRenderer";

/** Только для разработки: запись мелодий дизайнов в файлы для списка музыки в боте (scripts/render-music.mjs) */
export default function DevMusicPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MusicRenderer />;
}
