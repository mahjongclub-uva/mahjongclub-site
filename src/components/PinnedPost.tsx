import { PINNED_POST } from "@/lib/site";
import { clubDate } from "@/lib/format";
import { ClubPhoto } from "@/components/Photos";

/**
 * The Instagram post an officer pinned, under the account link. Decided at
 * build time like the next meeting, so the daily deploy is what takes it down
 * after its last day. Renders nothing when no post is pinned.
 */
export default function PinnedPost() {
  const post = PINNED_POST;
  if (!post) return null;
  // Fails the build: a malformed date would never expire, and nobody would notice.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.until))
    throw new Error("PINNED_POST.until must look like 2026-10-30");
  if (!post.url.startsWith("https://www.instagram.com/"))
    throw new Error("PINNED_POST.url must be an instagram.com post link");
  if (clubDate(new Date()) > post.until) return null;
  return (
    <article className="pinned" aria-labelledby="pinned-caption">
      <figure className="pinned-photo">
        <ClubPhoto photo={post.photo} sizes="(min-width: 560px) 12rem, 90vw" />
      </figure>
      <div className="pinned-body">
        <p className="pinned-label">Pinned from Instagram</p>
        <p className="pinned-caption" id="pinned-caption">
          {post.caption}
        </p>
        <a
          className="action-link"
          href={post.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          See the post
        </a>
      </div>
    </article>
  );
}
