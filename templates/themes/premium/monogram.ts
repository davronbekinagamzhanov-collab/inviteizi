const letters: Record<string,string> = {а:'A',б:'B',в:'V',г:'G',д:'D',е:'E',ё:'Y',ж:'J',з:'Z',и:'I',й:'Y',к:'K',л:'L',м:'M',н:'N',о:'O',п:'P',р:'R',с:'S',т:'T',у:'U',ф:'F',х:'X',ц:'T',ч:'C',ш:'S',щ:'S',ы:'I',э:'E',ю:'Y',я:'Y',ў:'O',қ:'Q',ғ:'G',ҳ:'H'};
export function initial(name?: string): string {
  for (const ch of (name ?? '').normalize('NFC').toLowerCase()) {
    if (letters[ch]) return letters[ch];
    const latin = ch.normalize('NFKD')[0];
    if (/[a-z]/.test(latin)) return latin.toUpperCase();
  }
  return '';
}
export function monogram(groom?: string, bride?: string): string {
  return [initial(groom), initial(bride)].filter(Boolean).join(' & ') || '♡';
}
