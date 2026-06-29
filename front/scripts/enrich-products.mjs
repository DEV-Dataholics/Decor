/**
 * Enriquece productos.json con dimensiones y acabados simulados.
 * Ejecutar: node scripts/enrich-products.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');

const productos = JSON.parse(readFileSync(join(dataDir, 'productos.json'), 'utf-8'));
const acabados = JSON.parse(readFileSync(join(dataDir, 'acabados.json'), 'utf-8'));

// Dimension templates by category
const DIM_TEMPLATES = {
  'Nightstand': { w: [20, 24], h: [24, 28], d: [16, 20] },
  "hutch's": { w: [36, 60], h: [72, 84], d: [18, 22] },
  "CD'S": { w: [18, 24], h: [36, 48], d: [12, 16] },
  'Buffet': { w: [48, 72], h: [36, 42], d: [18, 22] },
  'Jelly´s': { w: [24, 48], h: [48, 72], d: [14, 18] },
  'Coffee Tables': { w: [36, 54], h: [16, 20], d: [24, 42] },
  'End Table': { w: [20, 26], h: [22, 26], d: [20, 26] },
  'Sofa Table': { w: [48, 72], h: [28, 32], d: [14, 18] },
  'Bookcases': { w: [18, 60], h: [36, 84], d: [12, 18] },
  "dresser's, chest & mirror": { w: [36, 66], h: [36, 48], d: [18, 22] },
  'Bench': { w: [36, 72], h: [18, 20], d: [14, 20] },
  'Desk': { w: [36, 72], h: [30, 32], d: [18, 30] },
  'Chairs': { w: [18, 22], h: [36, 44], d: [18, 22] },
  'Barstools': { w: [16, 20], h: [24, 36], d: [16, 20] },
  'Tables and islands': { w: [36, 72], h: [30, 36], d: [24, 48] },
  'Bars': { w: [48, 96], h: [42, 48], d: [20, 28] },
  'headboard & beds': { w: [54, 80], h: [48, 62], d: [2, 6] },
  'Armories': { w: [36, 54], h: [68, 78], d: [20, 24] },
  'Sideboard': { w: [48, 66], h: [34, 40], d: [16, 20] },
  'Bistros': { w: [30, 36], h: [30, 36], d: [30, 36] },
  'Tv stand': { w: [48, 72], h: [24, 32], d: [16, 22] },
  'siso': { w: [24, 36], h: [24, 36], d: [12, 18] },
  'Varios': { w: [24, 48], h: [24, 48], d: [12, 24] },
};

function randBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getFinishes(type) {
  // Return 2-4 random finishes from the available list
  const n = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...acabados].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

for (const prod of productos) {
  const template = DIM_TEMPLATES[prod.type] || DIM_TEMPLATES['Varios'];
  prod.dimensions = {
    width: randBetween(template.w[0], template.w[1]),
    height: randBetween(template.h[0], template.h[1]),
    depth: randBetween(template.d[0], template.d[1]),
  };
  prod.finishes = getFinishes(prod.type);
  prod.image_url = null;
}

writeFileSync(join(dataDir, 'productos.json'), JSON.stringify(productos, null, 2), 'utf-8');
console.log(`✅ Enriched ${productos.length} products with dimensions and finishes`);
