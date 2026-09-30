import CheckIn from "@/components/CheckIn";

export const metadata = { title: "Check in - Mahjong Club @ UVA" };
export default function CheckInPage() {
  return (
    <>
      <header className="page-head">
        <div className="section-wrap">
          <p className="eyebrow">Tonight at the club</p>
          <h1 className="page-title">Take your seat.</h1>
          <p className="page-intro">
            Check in before you play. One ID, then you’re at the table.
          </p>
        </div>
      </header>
      <section className="section">
        <div className="section-wrap">
          <CheckIn />
        </div>
      </section>
    </>
  );
}
