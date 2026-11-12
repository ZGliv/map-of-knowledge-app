import type { PlaceCase, SpreadModel } from '../types';

// New cases for history (The Black Death): situations its expedition and reels never name. They
// play in the spread engine (sims/spreadMath.ts): plague travels every route at the pace of its
// kind, and a place falls sick when the fastest chain of routes reaches it. The paces are the ones
// the 1347–48 arrival dates imply (Wikipedia's Black Death articles, the same dates the expedition
// maps): about a month for some 1,000 km of sea lanes, about ten months for 600-odd km of road,
// so 35 km a day by sea and 2 by road. They are a teaching model, and each case's winner holds if
// either pace is a third slower or half again faster (the engine checks it).
// Each case turns the idea a different way: a port across the sea beats every town nearer on the
// map; the nearest port by map is not the nearest by sea; and the place that falls sick last is the
// one nearest on the map, off the sea lanes. Coordinates are approximate town centres; waypoints
// keep ships off the land.
const PACE: SpreadModel['speeds'] = { sea: 35, road: 2 };
const DATES = { label: 'Black Death (Wikipedia, revision 1377102371): arrival months across the Mediterranean and Europe, 1347–51', url: 'https://en.wikipedia.org/w/index.php?title=Black_Death&oldid=1377102371' };

export const HISTORY_CASES: readonly PlaceCase[] = [
  {
    id: 'c_d07mzs06cx',
    archetype: 'spread',
    title: 'Over the sea or up the road',
    setting: 'A model, at the pace of 1347–48',
    scenario: 'Say plague comes ashore at Barcelona. Ships leave it for Mallorca and Valencia; roads run inland to Girona, Lleida and Zaragoza.',
    ask: 'Which of these falls sick first?',
    model: {
      engine: 'spread', what: 'plague', speeds: PACE, origin: 'barcelona', measure: 'first',
      candidates: ['palma', 'valencia', 'girona', 'lleida', 'zaragoza'],
      places: [
        { id: 'barcelona', label: 'Barcelona', lat: 41.39, lon: 2.17, side: 'right' },
        { id: 'palma', label: 'Palma, Mallorca', lat: 39.57, lon: 2.65, side: 'right' },
        { id: 'valencia', label: 'Valencia', lat: 39.47, lon: -0.38, side: 'left' },
        { id: 'girona', label: 'Girona', lat: 41.98, lon: 2.82, side: 'right' },
        { id: 'lleida', label: 'Lleida', lat: 41.62, lon: 0.62, side: 'above' },
        { id: 'zaragoza', label: 'Zaragoza', lat: 41.65, lon: -0.88, side: 'below' },
      ],
      routes: [
        { from: 'barcelona', to: 'palma', via: 'sea', path: [[41.2, 2.35]] },
        { from: 'barcelona', to: 'valencia', via: 'sea', path: [[41.15, 2.0], [40.75, 1.3], [40.55, 1.0], [40.0, 0.25]] },
        { from: 'barcelona', to: 'girona', via: 'road', path: [[41.62, 2.45]] },
        { from: 'barcelona', to: 'lleida', via: 'road', path: [[41.58, 1.62]] },
        { from: 'lleida', to: 'zaragoza', via: 'road', path: [[41.55, -0.15]] },
      ],
    },
    call: { kind: 'pick', options: [
      { id: 'girona', label: 'Girona' },
      { id: 'palma', label: 'Palma' },
      { id: 'zaragoza', label: 'Zaragoza' },
      { id: 'valencia', label: 'Valencia' },
      { id: 'lleida', label: 'Lleida' },
    ] },
    run: 'Let it spread',
    reveal: 'Palma, across 200 km of sea, in under a week. Girona, under half that distance by road, waits about six weeks. In the 1340s a ship covered in a day what walkers and carts carried plague in two or three weeks, so distance along the trade routes counted, not distance on the map.',
    claim: 'Plague moved at the speed of trade: a port across the sea fell sick before towns nearer by road.',
    entities: ['Barcelona', 'Mallorca', 'Valencia', 'Girona', 'Lleida', 'Zaragoza', 'Palma'],
    sources: [DATES, { label: 'Black Death in Italy (Wikipedia): month-by-month arrivals by sea and by road, 1347–48', url: 'https://en.wikipedia.org/wiki/Black_Death_in_Italy' }],
    seed: 'history-barcelona-first',
  },
  {
    id: 'c_307mevzckt',
    archetype: 'spread',
    title: 'The long way round',
    setting: 'A model, at the pace of 1347–48',
    scenario: 'Say plague reaches Naples by ship. Ships sail on to Palermo and Cagliari across open water, and to Bari round the toe and heel of the peninsula; roads cross the hills to Benevento, Campobasso, Potenza and Bari.',
    ask: 'Which of these falls sick first?',
    model: {
      engine: 'spread', what: 'plague', speeds: PACE, origin: 'naples', measure: 'first',
      candidates: ['bari', 'palermo', 'cagliari', 'campobasso', 'potenza'],
      places: [
        { id: 'naples', label: 'Naples', lat: 40.84, lon: 14.25, side: 'left' },
        { id: 'bari', label: 'Bari', lat: 41.12, lon: 16.87, side: 'above' },
        { id: 'palermo', label: 'Palermo', lat: 38.12, lon: 13.36, side: 'left' },
        { id: 'cagliari', label: 'Cagliari', lat: 39.22, lon: 9.12, side: 'above' },
        { id: 'campobasso', label: 'Campobasso', lat: 41.56, lon: 14.66, side: 'above' },
        { id: 'potenza', label: 'Potenza', lat: 40.64, lon: 15.8, side: 'right' },
        { id: 'benevento', label: 'Benevento', lat: 41.13, lon: 14.78, side: 'right' },
      ],
      routes: [
        { from: 'naples', to: 'palermo', via: 'sea', path: [[40.55, 14.15]] },
        { from: 'naples', to: 'cagliari', via: 'sea', path: [[40.55, 14.1], [39.9, 11.6]] },
        { from: 'naples', to: 'bari', via: 'sea', path: [[40.55, 14.15], [39.95, 15.1], [39.1, 15.85], [38.6, 15.7], [38.25, 15.62], [37.9, 15.6], [37.8, 16.1], [38.45, 16.75], [39.3, 17.3], [39.7, 18.5], [40.35, 18.6], [40.95, 17.45]] },
        { from: 'naples', to: 'benevento', via: 'road' },
        { from: 'benevento', to: 'campobasso', via: 'road' },
        { from: 'benevento', to: 'bari', via: 'road', path: [[41.2, 15.55], [41.25, 16.25]] },
        { from: 'naples', to: 'potenza', via: 'road', path: [[40.68, 14.77]] },
      ],
    },
    call: { kind: 'pick', options: [
      { id: 'bari', label: 'Bari' },
      { id: 'campobasso', label: 'Campobasso' },
      { id: 'palermo', label: 'Palermo' },
      { id: 'cagliari', label: 'Cagliari' },
      { id: 'potenza', label: 'Potenza' },
    ] },
    run: 'Let it spread',
    reveal: 'Palermo, across 300 km of open sea, in about nine days. Bari is nearer on the map, yet the voyage round the peninsula is three times longer and the road over the mountains slower still, so it waits nearly four weeks. What counted was the length of the trade route, not the gap on the map.',
    claim: 'A place’s distance along the trade routes, not on the map, decided how soon plague reached it.',
    entities: ['Naples', 'Bari', 'Palermo', 'Cagliari', 'Campobasso', 'Potenza', 'Benevento'],
    sources: [DATES],
    seed: 'history-naples-first',
  },
  {
    id: 'c_gsmcgm5hhj',
    archetype: 'spread',
    title: 'The last to fall sick',
    setting: 'A model, at the pace of 1347–48',
    scenario: 'Say plague arrives by ship at Lübeck, the hub of the Baltic trade. Its ships sail to Danzig, Visby, Stockholm and Riga; the salt road runs south to Lüneburg, and another road crosses the plain to Berlin.',
    ask: 'Which of these falls sick last?',
    model: {
      engine: 'spread', what: 'plague', speeds: PACE, origin: 'lubeck', measure: 'last',
      candidates: ['danzig', 'visby', 'stockholm', 'riga', 'luneburg', 'berlin'],
      places: [
        { id: 'lubeck', label: 'Lübeck', lat: 53.87, lon: 10.69, side: 'left' },
        { id: 'luneburg', label: 'Lüneburg', lat: 53.25, lon: 10.41, side: 'left' },
        { id: 'berlin', label: 'Berlin', lat: 52.52, lon: 13.4, side: 'below' },
        { id: 'danzig', label: 'Danzig', lat: 54.35, lon: 18.65, side: 'below' },
        { id: 'visby', label: 'Visby', lat: 57.64, lon: 18.3, side: 'left' },
        { id: 'stockholm', label: 'Stockholm', lat: 59.33, lon: 18.07, side: 'left' },
        { id: 'riga', label: 'Riga', lat: 56.95, lon: 24.11, side: 'below' },
      ],
      routes: [
        { from: 'lubeck', to: 'danzig', via: 'sea', path: [[54.05, 10.95], [54.45, 11.6], [54.85, 13.5], [54.75, 16.0], [54.6, 18.75]] },
        { from: 'lubeck', to: 'visby', via: 'sea', path: [[54.05, 10.95], [54.45, 11.6], [54.85, 13.5], [55.55, 15.4], [57.0, 17.7]] },
        { from: 'visby', to: 'stockholm', via: 'sea', path: [[58.6, 19.2], [59.25, 18.75]] },
        { from: 'visby', to: 'riga', via: 'sea', path: [[57.75, 21.9], [57.3, 23.4]] },
        { from: 'lubeck', to: 'luneburg', via: 'road', path: [[53.62, 10.69]] },
        { from: 'lubeck', to: 'berlin', via: 'road', path: [[53.63, 11.41], [53.15, 12.45]] },
      ],
    },
    call: { kind: 'pick', options: [
      { id: 'riga', label: 'Riga' },
      { id: 'luneburg', label: 'Lüneburg' },
      { id: 'stockholm', label: 'Stockholm' },
      { id: 'berlin', label: 'Berlin' },
      { id: 'danzig', label: 'Danzig' },
      { id: 'visby', label: 'Visby' },
    ] },
    run: 'Let it spread',
    reveal: 'Berlin, about 240 km by road, waits nearly four months, long after Riga, some 1,000 km of sea lanes away, falls sick in about four weeks. The Baltic ports were bound to each other by ships; the towns of the plain, close as they look, were weeks of walking apart.',
    claim: 'Places off the sea lanes fell sick last, even when they were nearest on the map.',
    entities: ['Lübeck', 'Danzig', 'Visby', 'Stockholm', 'Riga', 'Lüneburg', 'Berlin'],
    sources: [DATES, { label: 'Hanseatic League (Wikipedia): Lübeck as the hub of Baltic sea trade; the salt road from Lüneburg', url: 'https://en.wikipedia.org/wiki/Hanseatic_League' }],
    seed: 'history-lubeck-last',
  },
];
