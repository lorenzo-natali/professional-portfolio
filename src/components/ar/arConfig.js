const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

/** Single replaceable target path — swap the .mind file without code changes. */
export const AR_TARGET_SRC = publicAsset("ar/targets/cv-page-1.mind");

export const AR_VCARD_SRC = publicAsset("ar/assets/Lorenzo_Natali.vcf");

export const AR_SEQUENCE_MS = {
  documentRecognized: 1000,
  riskNode: 700,
  controlsNode: 700,
  technologyNode: 700,
  connections: 900,
  governance: 900,
  trajectory: 1100,
  callouts: 1100,
  finalStatus: 900,
};

export const INTERPRETATION_STATES = ["Identified", "Mapped", "Connected", "Interpreted"];

export const INTERPRETATION_DIMENSIONS = ["Risk", "Controls", "Technology", "Governance"];
