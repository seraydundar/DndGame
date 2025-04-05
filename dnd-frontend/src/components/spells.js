// components/spells.js

const API_BASE = '/api/spells/'; // API endpoint'lerinizin prefiksi

// Spell isimleriyle endpoint URL'lerini eşleyen mapping
const SPELL_ENDPOINTS = {
  // 1-10
  magicMissile: 'magic-missile/',
  fireball: 'fireball/',
  lightningBolt: 'lightning-bolt/',
  healingWord: 'healing-word/',
  shield: 'shield/',
  invisibility: 'invisibility/',
  sleep: 'sleep/',
  acidArrow: 'acid-arrow/',
  magicWeapon: 'magic-weapon/',
  fly: 'fly/',
  // 11-20
  coneOfCold: 'cone-of-cold/',
  dominatePerson: 'dominate-person/',
  disintegrate: 'disintegrate/',
  earthquake: 'earthquake/',
  holdPerson: 'hold-person/',
  lightningStorm: 'lightning-storm/',
  polymorph: 'polymorph/',
  sunbeam: 'sunbeam/',
  wallOfFire: 'wall-of-fire/',
  timeStop: 'time-stop/',
  // 21-30
  blight: 'blight/',
  charmPerson: 'charm-person/',
  darkness: 'darkness/',
  haste: 'haste/',
  slow: 'slow/',
  counterspell: 'counterspell/',
  fireShield: 'fire-shield/',
  iceStorm: 'ice-storm/',
  prismaticSpray: 'prismatic-spray/',
  dispelMagic: 'dispel-magic/',
  // 31-40
  animateDead: 'animate-dead/',
  banishment: 'banishment/',
  circleOfDeath: 'circle-of-death/',
  cloudkill: 'cloudkill/',
  confusion: 'confusion/',
  delayedBlastFireball: 'delayed-blast-fireball/',
  dimensionDoor: 'dimension-door/',
  dominateMonster: 'dominate-monster/',
  feeblemind: 'feeblemind/',
  trueResurrection: 'true-resurrection/',
  // 41-50
  forcecage: 'forcecage/',
  telekinesis: 'telekinesis/',
  earthbind: 'earthbind/',
  mindBlank: 'mind-blank/',
  maze: 'maze/',
  powerWordKill: 'power-word-kill/',
  fingerOfDeath: 'finger-of-death/',
  globeOfInvulnerability: 'globe-of-invulnerability/',
  ottosIrresistibleDance: 'ottos-irresistible-dance/',
  symbol: 'symbol/',
  // 51-60
  massHeal: 'mass-heal/',
  chainLightning: 'chain-lightning/',
  reverseGravity: 'reverse-gravity/',
  fleshToStone: 'flesh-to-stone/',
  animateObjects: 'animate-objects/',
  antimagicField: 'antimagic-field/',
  eyebite: 'eyebite/',
  controlWeather: 'control-weather/',
  holyAura: 'holy-aura/',
  wish: 'wish/',
};

// Ortak POST istek fonksiyonu
const postSpell = async (endpoint, data) => {
  try {
    const response = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Spell casting failed');
    }
    return await response.json();
  } catch (error) {
    console.error(`Error casting spell at endpoint ${endpoint}:`, error);
    throw error;
  }
};

// Genel spell fonksiyonu: spellKey ve data parametrelerini alır.
export const castSpell = async (spellKey, data) => {
  const endpoint = SPELL_ENDPOINTS[spellKey];
  if (!endpoint) {
    throw new Error(`Spell "${spellKey}" is not defined.`);
  }
  return await postSpell(endpoint, data);
};

// İsteğe bağlı: Her spell için ayrı yardımcı fonksiyonlar tanımlayabilirsiniz
export const castMagicMissile = (data) => castSpell('magicMissile', data);
export const castFireball = (data) => castSpell('fireball', data);
export const castLightningBolt = (data) => castSpell('lightningBolt', data);
export const castHealingWord = (data) => castSpell('healingWord', data);
export const castShield = (data) => castSpell('shield', data);
export const castInvisibility = (data) => castSpell('invisibility', data);
export const castSleep = (data) => castSpell('sleep', data);
export const castAcidArrow = (data) => castSpell('acidArrow', data);
export const castMagicWeapon = (data) => castSpell('magicWeapon', data);
export const castFly = (data) => castSpell('fly', data);
// Diğer speller için de benzer yardımcı fonksiyonlar eklenebilir

export default {
  castSpell,
  castMagicMissile,
  castFireball,
  castLightningBolt,
  castHealingWord,
  castShield,
  castInvisibility,
  castSleep,
  castAcidArrow,
  castMagicWeapon,
  castFly,
  // Diğer fonksiyonlar...
};
