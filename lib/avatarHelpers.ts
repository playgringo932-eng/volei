/**
 * Generates reliable athlete avatar SVGs or data URLs for volleyball players.
 */
export function getAthletePhoto(name: string, gender: string, jersey?: number): string {
  const seed = encodeURIComponent(name.trim().toLowerCase());
  // Professional clean UI avatars with athletic volleyball styling
  const bg = gender === 'Feminino' ? '1e40af' : '1d4ed8'; // Royal blue
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${bg}&clothingColor=2563eb`;
}

/**
 * Reads local file as base64 Data URL for real user photo upload
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
