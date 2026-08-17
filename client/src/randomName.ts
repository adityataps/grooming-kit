const ADJECTIVES = [
  'Curious',
  'Swift',
  'Clever',
  'Bold',
  'Sunny',
  'Merry',
  'Quiet',
  'Witty',
  'Brave',
  'Gentle',
  'Nimble',
  'Jolly',
];

const NOUNS = [
  'Otter',
  'Falcon',
  'Panda',
  'Fox',
  'Koala',
  'Heron',
  'Lynx',
  'Sparrow',
  'Badger',
  'Dolphin',
  'Raven',
  'Yak',
];

/** A friendly placeholder like "Curious Otter" — used to pre-fill the display name field. */
export function generateRandomName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}
