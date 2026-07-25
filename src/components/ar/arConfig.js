const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

/** Single replaceable target path — swap the .mind file without code changes. */
export const AR_TARGET_SRC = publicAsset("ar/targets/cv-page-1.mind");

export const AR_VCARD_SRC = publicAsset("ar/assets/Lorenzo_Natali.vcf");
