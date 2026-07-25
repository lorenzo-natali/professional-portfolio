import { useContext } from "react";
import { ARTrackingContext } from "./ARTrackingContext";

export function useARTracking() {
  const ctx = useContext(ARTrackingContext);
  if (!ctx) {
    throw new Error("useARTracking must be used within ARTrackingProvider");
  }
  return ctx;
}
