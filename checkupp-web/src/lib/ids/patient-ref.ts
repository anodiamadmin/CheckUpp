const toBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return atob(`${normalized}${padding}`);
};

export const encodePatientRef = (patientId: string) => {
  if (!patientId) return "";

  try {
    return toBase64Url(patientId);
  } catch {
    return patientId;
  }
};

export const decodePatientRef = (patientRef: string) => {
  if (!patientRef) return "";

  try {
    return fromBase64Url(patientRef);
  } catch {
    return patientRef;
  }
};
