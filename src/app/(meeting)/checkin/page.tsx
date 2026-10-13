import CheckIn from "@/components/CheckIn";
import { getMeetings } from "@/lib/data";

export const metadata = { title: "Check in - Mahjong Club @ UVA" };
// The printed QR codes land here, so check-in opens at once rather than
// forwarding to /meeting/checkin/ and loading a second page.
export default function Page() {
  return <CheckIn schedule={getMeetings()} />;
}
