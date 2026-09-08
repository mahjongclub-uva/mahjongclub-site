import { LOGO, FULL_NAME } from "@/lib/site";

/**
 * The club logo, in a circular frame above the wordmark.
 *
 * Holds its space whether or not there is a logo yet, so dropping one in
 * later cannot shift the page. Decorative when present — the club's name is
 * already carried by the <h1> below it, so repeating it here would just make
 * a screen reader say it twice.
 */
export default function Logo() {
  return (
    <div className="logo" role="presentation">
      {LOGO ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={LOGO} alt="" width={96} height={96} />
      ) : (
        <span className="logo-empty" aria-hidden="true" title={FULL_NAME} />
      )}
    </div>
  );
}
