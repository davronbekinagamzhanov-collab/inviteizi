import { redirect } from "next/navigation";

/** Временная главная: настоящий каталог будет Mini App в Telegram. Главная ведёт в каталог. */
export default function Home() {
  redirect("/catalog");
}
