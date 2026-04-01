interface SlopesDetail {
  green?: number;
  blue?: number;
  red?: number;
  black?: number;
}

export interface LevelProfile {
  beginner: number; // % pistes vertes
  intermediate: number; // % pistes bleues
  advanced: number; // % pistes rouges
  expert: number; // % pistes noires
}

export function getStationLevelProfile(
  slopesDetail: SlopesDetail | null | undefined,
): LevelProfile | null {
  if (!slopesDetail) return null;
  const total =
    (slopesDetail.green ?? 0) +
    (slopesDetail.blue ?? 0) +
    (slopesDetail.red ?? 0) +
    (slopesDetail.black ?? 0);
  if (total === 0) return null;
  return {
    beginner: Math.round(((slopesDetail.green ?? 0) / total) * 100),
    intermediate: Math.round(((slopesDetail.blue ?? 0) / total) * 100),
    advanced: Math.round(((slopesDetail.red ?? 0) / total) * 100),
    expert: Math.round(((slopesDetail.black ?? 0) / total) * 100),
  };
}
