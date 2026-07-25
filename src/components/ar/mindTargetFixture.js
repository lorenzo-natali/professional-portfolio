import { encode } from "@msgpack/msgpack";
import { AR_TARGET_MIN_BYTES } from "./checkArTargetAvailable";

/** Build a structurally valid MindAR v2 .mind buffer for tests. */
export function createValidMindFixture() {
  const matchingData = Array.from({ length: 48 }, (_, index) => ({
    index,
    points: [index, index + 1, index + 2],
  }));
  const trackingData = Array.from({ length: 48 }, (_, index) => [index, index * 2]);

  let bytes = encode({
    v: 2,
    dataList: [
      {
        targetImage: { width: 320, height: 480 },
        trackingData,
        matchingData,
      },
    ],
  });

  // Keep fixtures above the runtime minimum-size gate without changing encoding version.
  if (bytes.byteLength < AR_TARGET_MIN_BYTES) {
    const paddedMatching = matchingData.concat(
      Array.from({ length: 64 }, (_, index) => ({ pad: index, blob: "x".repeat(8) })),
    );
    bytes = encode({
      v: 2,
      dataList: [
        {
          targetImage: { width: 320, height: 480 },
          trackingData,
          matchingData: paddedMatching,
        },
      ],
    });
  }

  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
