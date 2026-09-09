import { writeFileSync } from 'node:fs';
import { dimensions, makeUSDZ } from '../js/court.mjs';
writeFileSync(new URL('../models/cancha-18x9.usdz', import.meta.url), makeUSDZ(dimensions()));
console.log('Generado models/cancha-18x9.usdz');
