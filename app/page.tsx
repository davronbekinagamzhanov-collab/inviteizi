import { redirect } from "next/navigation";

/** Временная главная: настоящий каталог будет Mini App в Telegram. Пока — витрина пилотов. */
export default function Home() {
  redirect("/pilots");
}
