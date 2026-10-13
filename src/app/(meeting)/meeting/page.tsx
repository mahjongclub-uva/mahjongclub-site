import CheckIn from "@/components/CheckIn";
import { getMeetings } from "@/lib/data";

export const metadata = { title: "Meeting - Mahjong Club @ UVA" };
// Opens straight on check-in; a checked-in phone sees its next step there.
export default function Page() {
  return <CheckIn schedule={getMeetings()} />;
}
