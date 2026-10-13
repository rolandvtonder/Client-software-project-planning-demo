/**
 * Demo inventory: real codes, names, sizes, quantities and prices from Eastco's
 * September 2026 catalogues. How stock is split between the two branches is a
 * demo assumption (the catalogue's "QTY (48) PTA(10)" still needs explaining),
 * as are replacement costs, cleaning fees and store-room locations.
 */

import {rand} from '../domain/money';
import type {CollectionId, Item} from '../domain/types';

export const COLLECTIONS: {id: CollectionId; label: string; cover: string}[] = [
  {id: 'furniture', label: 'Furniture', cover: 'covers/furniture-cover.webp'},
  {id: 'linen', label: 'Linen', cover: 'covers/linen-cover.webp'},
  {id: 'decor', label: 'Décor', cover: 'covers/decor-cover.webp'},
  {id: 'props', label: 'Props', cover: 'covers/props-cover.webp'},
  {id: 'games', label: 'Lawn Games', cover: 'covers/games-cover.webp'},
];

export const collectionLabel = (id: CollectionId) => COLLECTIONS.find((c) => c.id === id)!.label;

// code, name, category, size, price (R), total qty, Pretoria qty (rest is Krugersdorp)
type Row = [string, string, string, string, number, number, number];

const furniture: Row[] = [
  ['TAB04', 'Steel trestle table', 'Tables', '1,8 m × 72 cm', 52, 48, 20],
  ['TAB16', 'Wood table', 'Tables', '2 m × 1 m', 400, 11, 5],
  ['TAB10', 'Foldable kiddies table', 'Tables', '1,2 m × 60 cm', 80, 5, 2],
  ['TAB05', 'Plastic round foldable table', 'Tables', '1,8 m', 300, 13, 5],
  ['TAB12', 'Wood trestle table – grooves', 'Tables', '2 m × 1 m', 200, 5, 2],
  ['TAB13', 'Wood trestle table – smooth', 'Tables', '2 m × 1 m', 200, 6, 2],
  ['TAB40', 'Harvest / food server table', 'Tables', '1,6 m × 1 m', 200, 3, 1],
  ['TAB45', 'S-shape table', 'Tables', '', 450, 8, 4],
  ['TAB07', 'Aluminium cocktail table', 'Tables', '60 cm × 1 m', 120, 13, 6],
  ['TAB01', 'Black cocktail table', 'Tables', '60 cm × 1 m', 190, 9, 4],
  ['TAB46', 'Bicycle table – wood & black', 'Tables', '189 × 46 × 90 cm', 600, 1, 1],
  ['FUR18', 'Black coffee table', 'Tables', '1,2 m × 80 cm', 250, 1, 1],
  ['CHA03', 'Ancona plastic chair – black', 'Chairs', '', 15, 247, 120],
  ['CHA15', 'Solid plastic chair – black', 'Chairs', '', 15, 93, 53],
  ['CHA07', 'Rustic Tolix chair – charcoal', 'Chairs', '', 60, 110, 50],
  ['CHA20', 'Cross-back plastic chair – black', 'Chairs', '', 50, 61, 30],
  ['CHA10', 'Tiffany chair – white', 'Chairs', '', 25, 150, 80],
  ['CHA12', 'Tiffany chair – gold', 'Chairs', '', 25, 43, 20],
  ['CHA22', 'Wimbledon chair – white', 'Chairs', '', 35, 66, 30],
  ['CHA09', 'Kartel ghost chair – clear', 'Chairs', '', 60, 51, 25],
  ['CHA14', 'Steel cross-back chair – wood look', 'Chairs', '', 70, 120, 60],
  ['CHA24', 'White cross-back chair', 'Chairs', '', 50, 100, 50],
  ['CHA05', 'Kiddies plastic chair – white', 'Chairs', '', 15, 22, 15],
  ['CHA18', 'Cocktail chair – white', 'Chairs', '', 70, 84, 40],
  ['CHA04', 'Cocktail chair – black', 'Chairs', '', 60, 90, 45],
  ['CHA16', 'Cane chair – natural', 'Lounge', '', 300, 1, 1],
  ['CHA11', 'Peacock chair – natural', 'Lounge', '', 500, 1, 1],
  ['FUR03', 'Chesterfield couch – grey', 'Lounge', '', 800, 1, 1],
  ['FUR38', 'Banana couch', 'Lounge', '', 380, 7, 3],
  ['FUR31', '3-seater lounger – black', 'Lounge', '', 600, 2, 1],
  ['FUR29', '2-seater rattan – black', 'Lounge', '', 800, 1, 1],
  ['FUR32', 'Bamboo outdoor 1-seater', 'Lounge', '', 550, 4, 2],
  ['FUR36', 'Velvet 2-seater – hot pink', 'Lounge', '', 500, 1, 1],
  ['AIS03', 'Aisle carpet – red', 'Carpets & rugs', '10 m', 400, 2, 1],
  ['AIS14', 'Aisle carpet – white', 'Carpets & rugs', '10 m', 550, 1, 1],
  ['BOHO01', 'Persian rug', 'Carpets & rugs', '2,3 × 1,6 m', 150, 1, 1],
  ['CAPRI21', 'Capri backdrop arch – black', 'Backdrops', '1,56 × 1 m', 250, 1, 1],
  ['CAPRI25', 'Capri backdrop arch – black, tall', 'Backdrops', '1,7 × 0,8 m', 250, 1, 0],
];

const linen: Row[] = [
  ['MINI30', 'Floor-length cloth – mini matt black', 'Tablecloths', '3,3 × 2,3 m', 110, 22, 12],
  ['MINI28', 'Floor-length cloth – mini matt white', 'Tablecloths', '3,3 × 2,3 m', 130, 19, 10],
  ['MINI29', 'Floor-length cloth – mini matt navy', 'Tablecloths', '3,3 × 2,3 m', 110, 20, 10],
  ['TBC09', 'Floor-length cloth – glitter black', 'Tablecloths', '3,3 × 2,3 m', 150, 15, 7],
  ['DAMA08', 'Floor-length cloth – damask white', 'Tablecloths', '3,3 × 2,3 m', 110, 5, 3],
  ['TBC08', 'Floor-length cloth – marble gold', 'Tablecloths', '3,3 × 2,3 m', 300, 7, 4],
  ['MINI60', 'Floor-length cloth – moonbeam', 'Tablecloths', '3,3 × 2,3 m', 110, 15, 8],
  ['MINI63', 'Floor-length cloth – bleach sand', 'Tablecloths', '3,3 × 2,3 m', 110, 9, 5],
  ['SEQ01', 'Floor-length cloth – gold sequins', 'Tablecloths', '3,3 × 2,3 m', 250, 1, 1],
  ['MINI10', 'Standard cloth – mini matt black', 'Tablecloths', '2,5 × 1,5 m', 50, 17, 9],
  ['MINI11', 'Standard cloth – mini matt white', 'Tablecloths', '2,5 × 1,5 m', 60, 20, 10],
  ['DAMA13', 'Standard cloth – damask black', 'Tablecloths', '2,5 × 1,5 m', 90, 27, 14],
  ['MINI56', 'Standard cloth – mini matt beige', 'Tablecloths', '2,5 × 1,5 m', 60, 24, 12],
  ['MINI17', 'Standard cloth – mini matt cream', 'Tablecloths', '2,5 × 1,5 m', 50, 22, 11],
  ['MINI12', 'Standard cloth – mini matt navy', 'Tablecloths', '2,5 × 1,5 m', 50, 26, 13],
  ['MINI07', 'Standard cloth – royal blue', 'Tablecloths', '2,5 × 1,5 m', 50, 33, 15],
  ['TBC14', 'Standard cloth – linen baby pink', 'Tablecloths', '2,5 × 1,5 m', 50, 8, 4],
  ['TBC24', 'Velvet cloth – mauve', 'Tablecloths', '', 45, 9, 5],
  ['TBC23', 'S-shape tablecloth', 'Tablecloths', '', 70, 8, 4],
  ['NAP17', 'Napkin – mini matt white', 'Napkins', '', 5, 389, 200],
  ['NAP22', 'Napkin – mini matt black', 'Napkins', '', 5, 206, 100],
  ['NAP79', 'Napkin – linen white', 'Napkins', '', 8, 268, 130],
  ['NAP59', 'Napkin – linen off-white', 'Napkins', '', 8, 155, 80],
  ['NAP60', 'Napkin – mini matt dark pink', 'Napkins', '', 5, 95, 45],
  ['NAP84', 'Napkin – silk black', 'Napkins', '', 7, 230, 110],
  ['RUN146', 'Crushed polly runner – chiffon white', 'Runners', '4 m', 50, 9, 5],
  ['RUN149', 'Crushed polly runner – terracotta', 'Runners', '3 m', 50, 13, 6],
  ['RUN147', 'Crushed polly runner – sage', 'Runners', '3 m', 50, 10, 5],
  ['RUN133', 'Mini matt runner – white', 'Runners', '37 cm', 35, 51, 25],
  ['RUN13', 'Mini matt runner – light pink', 'Runners', '45 cm', 35, 11, 6],
];

const decor: Row[] = [
  ['UND18', 'Underplate – stripe gold', 'Underplates', '', 10, 273, 140],
  ['UND02', 'Underplate – raindrop gold', 'Underplates', '', 10, 98, 50],
  ['UND19', 'Underplate – leaf gold', 'Underplates', '', 10, 117, 30],
  ['UND06', 'Underplate – textured rose gold', 'Underplates', '', 10, 193, 100],
  ['UND23', 'Underplate – stripe silver', 'Underplates', '', 10, 174, 90],
  ['UND15', 'Underplate – textured matt black', 'Underplates', '', 10, 77, 40],
  ['UND16', 'Underplate – organic', 'Underplates', '', 15, 288, 50],
  ['UND31', 'Underplate – thin gold rim', 'Underplates', '', 18, 153, 50],
  ['UND33', 'Underplate – frosted', 'Underplates', '', 18, 136, 30],
  ['CRO15', 'Dinner plate – white', 'Crockery', '', 5, 218, 40],
  ['CRO16', 'Side plate – white', 'Crockery', '', 5, 174, 40],
  ['CRO20', 'Dessert bowl – white', 'Crockery', '', 5, 77, 50],
  ['CRO36', 'Rimmed dinner plate – white', 'Crockery', '', 10, 111, 40],
  ['CRO21', 'Dinner plate – charcoal', 'Crockery', '', 7, 156, 80],
  ['CRO30', 'Dinner plate – stone', 'Crockery', '', 7, 131, 65],
  ['CRO10', 'Dinner plate – laurel green', 'Crockery', '', 7, 129, 65],
  ['CRO50', 'Dinner plate – Delft', 'Crockery', '', 10, 59, 30],
  ['CAKE37', 'Crystal dome cake stand', 'Cake stands', '30 × 28 cm', 150, 2, 1],
  ['CAKE31', '3-tier round Perspex stand', 'Cake stands', '26 × 32 cm', 300, 1, 1],
  ['CAKE54', '4-tier wood stand – white', 'Cake stands', '', 300, 1, 0],
  ['CAKE60', 'Wood table risers (set of 4)', 'Cake stands', '', 550, 1, 1],
  ['CAKE59', 'Mirror tray – round', 'Cake stands', '', 100, 4, 2],
  ['VAS32', 'Estrial vase – black', 'Vases', '40 cm', 20, 9, 5],
  ['VAS175', 'Pebble vase – black', 'Vases', '14 cm', 35, 26, 13],
  ['VAS197', 'Posy vase – black', 'Vases', '15 cm', 25, 24, 12],
  ['VAS231', 'Tano footed vase', 'Vases', '8 × 13 cm', 20, 30, 15],
  ['VAS207', 'Geometric square vase', 'Vases', '20 × 20 × 19 cm', 55, 14, 7],
  ['VAS98', 'Stilren vase – white', 'Vases', '22 cm', 30, 20, 10],
  ['CAN14', 'Candelabra', 'Candles & lighting', '', 120, 5, 3],
  ['CAN60', 'Elegant candle holder', 'Candles & lighting', '8 cm', 25, 13, 7],
  ['CAN79', 'Pillar candle holder', 'Candles & lighting', '14,5 cm', 20, 22, 11],
  ['VOT03', 'Crystal votive', 'Candles & lighting', '9 cm', 20, 35, 18],
  ['VOT21', 'Votive – square', 'Candles & lighting', '6,5 cm', 5, 30, 15],
  ['VOT06', 'Votive – copper', 'Candles & lighting', '7 cm', 5, 47, 24],
];

const props: Row[] = [
  ['AIS01', 'VIP rope – gold', 'VIP & red carpet', '1 m', 42, 10, 5],
  ['AIS02', 'VIP rope – red', 'VIP & red carpet', '1 m', 42, 24, 12],
  ['AIS06', 'Stanchion – gold', 'VIP & red carpet', '1 m', 100, 26, 13],
  ['AIS10', 'Stanchion – black', 'VIP & red carpet', '1 m', 100, 8, 4],
  ['AIS11', 'Green turf', 'VIP & red carpet', '5 m', 150, 5, 2],
  ['WED28', 'Audio guest book telephone', 'Wedding', '', 350, 1, 1],
  ['WED17', 'Cards & wishes box – black', 'Wedding', '', 150, 1, 1],
  ['WED18', 'Cards & wishes box – white', 'Wedding', '', 150, 1, 0],
  ['WED19', 'Crystal chandelier', 'Wedding', '60 cm', 100, 2, 1],
  ['WED01', 'Bride / Groom gold sign', 'Wedding', '', 120, 4, 2],
  ['WED25', 'This way to "I do" sign', 'Wedding', '', 50, 2, 1],
  ['PROPS125', 'Kneeling pillow', 'Wedding', '', 100, 2, 1],
  ['PRE01', 'Pulpit – white', 'Wedding', '', 130, 1, 1],
  ['BAB01', 'Baby blocks – white & gold', 'Baby shower', '', 250, 1, 1],
  ['PROPS104', 'Toy basket – pink', 'Baby shower', '', 50, 1, 1],
  ['PROPS29', 'Letter board', 'Signage', '', 80, 1, 1],
];

const games: Row[] = [
  ['GAME01', 'Cornhole (set of 2)', 'Lawn games', '', 250, 1, 0],
  ['GAME02', 'Cornhole (set of 2)', 'Lawn games', '', 250, 1, 1],
  ['GAME04', 'Giant XOXO tic-tac-toe', 'Lawn games', '', 300, 1, 1],
  ['GAME09', 'Glow-in-the-dark darts', 'Lawn games', '', 200, 1, 0],
  ['GAME05', 'Croquet – 6 player', 'Lawn games', '', 350, 1, 1],
  ['GAME10', 'Giant Jenga', 'Lawn games', '', 150, 1, 1],
  ['GAME03', 'Giant dominoes – black', 'Lawn games', '', 150, 1, 0],
];

const defaults: Record<CollectionId, {replace: number; clean: number; turnaround: number; bay: string}> = {
  furniture: {replace: 10, clean: 0.2, turnaround: 0, bay: 'Bay A'},
  linen: {replace: 6, clean: 0.5, turnaround: 1, bay: 'Linen room'},
  decor: {replace: 8, clean: 0.3, turnaround: 1, bay: 'Bay C'},
  props: {replace: 8, clean: 0, turnaround: 0, bay: 'Bay D'},
  games: {replace: 6, clean: 0, turnaround: 0, bay: 'Bay E'},
};

function build(collection: CollectionId, rows: Row[]): Item[] {
  const d = defaults[collection];
  return rows.map(([code, name, category, size, price, total, pta]) => ({
    id: code.toLowerCase(),
    code,
    name,
    collection,
    category,
    size: size || undefined,
    price: rand(price),
    replacementCost: rand(Math.max(price * d.replace, 50)),
    cleaningFee: rand(Math.round(price * d.clean)),
    turnaroundDays: d.turnaround,
    stock: {pta, kdp: total - pta},
    outOfService: {pta: 0, kdp: 0},
    location: `${d.bay} · ${category}`,
  }));
}

export const seedItems = (): Item[] => [
  ...build('furniture', furniture),
  ...build('linen', linen),
  ...build('decor', decor),
  ...build('props', props),
  ...build('games', games),
];
