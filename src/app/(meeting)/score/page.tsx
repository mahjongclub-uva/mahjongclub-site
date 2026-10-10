import Forward from "@/components/Forward";
import { MEETING_PATHS } from "@/lib/meeting";

export default function Page() {
  return <Forward to={MEETING_PATHS.score} />;
}
