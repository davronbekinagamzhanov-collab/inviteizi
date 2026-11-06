import LivePreview from "./LivePreview";

export const metadata = { robots: { index: false, follow: false } };

/** Окно превью внутри приложения: дизайн и данные приходят сообщением от /app (тот же сайт) */
export default function PreviewPage() {
  return <LivePreview />;
}
