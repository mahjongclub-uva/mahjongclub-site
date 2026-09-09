/** Small, readable tile examples shared by the introduction and guide. */
export default function SuitTiles() {
  return (
    <div className="suit-study" aria-label="The three numbered mahjong suits">
      <figure>
        <div className="sample-tile sample-characters" aria-hidden="true">
          <span>三</span><span>萬</span>
        </div>
        <figcaption>Characters</figcaption>
      </figure>
      <figure>
        <div className="sample-tile sample-dots" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </div>
        <figcaption>Dots</figcaption>
      </figure>
      <figure>
        <div className="sample-tile sample-bamboo" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </div>
        <figcaption>Bamboo</figcaption>
      </figure>
    </div>
  );
}
