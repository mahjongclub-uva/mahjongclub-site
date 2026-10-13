import CheckIn from "@/components/CheckIn";
import { getMeetings } from "@/lib/data";

export const metadata = { title: "Check in - Mahjong Club @ UVA" };
export default function Page() {
  return <CheckIn schedule={getMeetings()} />;
}
