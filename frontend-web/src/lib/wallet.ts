export const generateDeterministicWallet = (seed: string): string => {
  let hash = '';
  const cleanSeed = seed.toLowerCase().trim();
  for (let i = 0; i < 40; i++) {
    const charCode = cleanSeed.charCodeAt(i % cleanSeed.length) + i * 7;
    hash += (charCode % 16).toString(16);
  }
  return `0x${hash}`;
};
