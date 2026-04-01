interface SlopesDetail {
  green?: number;
  blue?: number;
  red?: number;
  black?: number;
}

export function getStationLevels(slopesDetail: SlopesDetail | null | undefined): string[] {
  if (!slopesDetail) return [];
  const levels: string[] = [];
  if ((slopesDetail.green ?? 0) >= 3) levels.push('beginner');
  if ((slopesDetail.blue ?? 0) >= 3) levels.push('intermediate');
  if ((slopesDetail.red ?? 0) >= 3) levels.push('advanced');
  if ((slopesDetail.black ?? 0) >= 3) levels.push('expert');
  return levels;
}
