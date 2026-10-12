import TableRooms from "@/components/TableRooms";
import { MAX_TABLES } from "@/lib/meeting";

export const metadata = { title: "Table - Mahjong Club @ UVA" };
// Static export: every physical table's page is generated at build time.
export const dynamicParams = false;
export function generateStaticParams() {
  return Array.from({ length: MAX_TABLES }, (_, i) => ({
    table: String(i + 1),
  }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  return <TableRooms table={Number((await params).table)} />;
}
