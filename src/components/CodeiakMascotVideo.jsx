import mascotImage from "../assets/codeiak-banner-wide.png";

export default function CodeiakMascotVideo({ mood = "idle", size = 140 }) {
  return (
    <div
      className={`codeiakMascotVideo codeiakMascotVideo--${mood}`}
      style={{ "--mascot-size": `${size}px` }}
      aria-label={`CodeIAK mascot ${mood}`}
      role="img"
    >
      <img className="codeiakMascotVideoMedia" src={mascotImage} alt="" draggable="false" />
    </div>
  );
}
