import { LOGO, FULL_NAME } from "@/lib/site";
import { asset } from "@/lib/asset";

/** Club logo above the wordmark. Holds its space when empty so adding a logo later doesn't shift the page; decorative (alt="") since the name is already in the <h1> below it. */
export default function Logo() {
  return (
    <div className="logo" role="presentation">
      {LOGO ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset(LOGO)} alt="" width={176} height={176} />
      ) : (
        <span className="logo-empty" aria-hidden="true" title={FULL_NAME} />
      )}
    </div>
  );
}
