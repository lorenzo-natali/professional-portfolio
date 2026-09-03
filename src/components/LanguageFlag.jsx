/**
 * Inline SVG flags — Windows (and some corporate browsers) render flag emoji
 * as regional-indicator letter pairs (IT, GB, …) instead of glyphs.
 */
const FLAGS = {
  it: (
    <svg viewBox="0 0 36 27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="12" height="27" fill="#009246" />
      <rect x="12" width="12" height="27" fill="#fff" />
      <rect x="24" width="12" height="27" fill="#ce2b37" />
    </svg>
  ),
  gb: (
    <svg viewBox="0 0 36 27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="27" fill="#012169" />
      <path d="M0 0 L36 27 M36 0 L0 27" stroke="#fff" strokeWidth="5.4" />
      <path d="M0 0 L36 27 M36 0 L0 27" stroke="#C8102E" strokeWidth="1.8" />
      <path d="M18 0 V27 M0 13.5 H36" stroke="#fff" strokeWidth="9" />
      <path d="M18 0 V27 M0 13.5 H36" stroke="#C8102E" strokeWidth="5.4" />
    </svg>
  ),
  fr: (
    <svg viewBox="0 0 36 27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="12" height="27" fill="#002395" />
      <rect x="12" width="12" height="27" fill="#fff" />
      <rect x="24" width="12" height="27" fill="#ED2939" />
    </svg>
  ),
  cn: (
    <svg viewBox="0 0 36 27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="27" fill="#DE2910" />
      <polygon
        fill="#FFDE00"
        points="7.2,3.2 8.1,5.9 10.9,5.9 8.65,7.55 9.55,10.25 7.2,8.6 4.85,10.25 5.75,7.55 3.5,5.9 6.3,5.9"
      />
    </svg>
  ),
};

export default function LanguageFlag({ code }) {
  const flag = FLAGS[code];
  if (!flag) return null;

  return (
    <span className="language-flag-icon" data-flag={code}>
      {flag}
    </span>
  );
}
