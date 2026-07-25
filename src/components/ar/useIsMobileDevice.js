import { useEffect, useState } from "react";

function detectMobile() {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const narrow = window.matchMedia?.("(max-width: 1024px)").matches;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  return Boolean(mobileUa || (coarse && narrow));
}

export function useIsMobileDevice() {
  const [isMobile, setIsMobile] = useState(detectMobile);

  useEffect(() => {
    const update = () => setIsMobile(detectMobile());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}
