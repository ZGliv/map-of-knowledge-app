// The curated half of the place matcher: Wikidata items and classes → atlas places, plus what the
// engine never makes a reel about. Every QID here was checked against Wikidata's English label on
// 2026-10-23 (the label sits beside it); placeTable.test.mjs checks every place exists in the atlas.
// Order inside a place does not matter: the matcher prefers the closest hit, then the deeper place.

const S = 'knowledge.science', T = 'knowledge.technology', H = 'knowledge.humanities', SO = 'knowledge.society';
const M = 'knowledge.mathematics', A = 'knowledge.arts', E = 'knowledge.earth', EC = 'knowledge.economics';
const BIO = `${S}.biology`, EVO = `${BIO}.evolution`;

/** place → [QID, label][] */
const BY_PLACE = {
  [S]: [['Q336', 'science'], ['Q201486', 'history of science'], ['Q7991', 'natural science'], ['Q101965', 'experiment'], ['Q3239681', 'scientific theory'], ['Q3099911', 'scientific instrument'], ['Q2041172', 'measuring instrument']],
  [`${S}.physics`]: [['Q413', 'physics'], ['Q169470', 'physicist']],
  [`${S}.physics.mechanics`]: [['Q41217', 'mechanics']],
  [`${S}.physics.mechanics.motion.acceleration`]: [['Q11376', 'acceleration'], ['Q140028', 'free fall'], ['Q5518616', 'Galileo’s Leaning Tower of Pisa experiment']],
  [`${S}.physics.thermodynamics`]: [['Q11473', 'thermodynamics']],
  [`${S}.physics.electromagnetism`]: [['Q11406', 'electromagnetism'], ['Q12725', 'electricity'], ['Q3294789', 'magnetism'], ['Q11408', 'magnetic field']],
  [`${S}.physics.optics`]: [['Q14620', 'optics'], ['Q9128', 'light']],
  [`${S}.physics.relativity`]: [['Q43514', 'theory of relativity'], ['Q11455', 'special relativity'], ['Q11452', 'general relativity']],
  [`${S}.physics.quantum-physics`]: [['Q944', 'quantum mechanics']],
  [`${S}.astronomy`]: [
    ['Q333', 'astronomy'], ['Q11063', 'astronomer'], ['Q6999', 'astronomical object'], ['Q634', 'planet'], ['Q523', 'star'], ['Q318', 'galaxy'],
    ['Q3559', 'comet'], ['Q3863', 'asteroid'], ['Q2537', 'natural satellite'], ['Q40218', 'spacecraft'], ['Q26529', 'space probe'], ['Q5916', 'spaceflight'],
    ['Q752783', 'human spaceflight'], ['Q3937', 'supernova'], ['Q3887', 'solar eclipse'], ['Q44235', 'lunar eclipse'], ['Q62832', 'observatory'],
    ['Q11631', 'astronaut'], ['Q60186', 'meteorite'], ['Q55818', 'impact crater'], ['Q105000', 'meteor shower'], ['Q41291', 'rocket'],
    ['Q26540', 'artificial satellite'], ['Q4213', 'telescope'], ['Q180046', 'space exploration'], ['Q797476', 'rocket launch'], ['Q495307', 'Moon landing'],
    ['Q338', 'cosmology'], ['Q589', 'black hole'], ['Q42372', 'nebula'], ['Q44559', 'exoplanet'], ['Q544', 'Solar System'],
  ],
  [`${S}.chemistry`]: [['Q2329', 'chemistry'], ['Q593644', 'chemist'], ['Q11344', 'chemical element'], ['Q11173', 'chemical compound'], ['Q79529', 'chemical substance']],
  [`${S}.medicine`]: [
    ['Q11190', 'medicine'], ['Q39631', 'physician'], ['Q12136', 'disease'], ['Q18123741', 'infectious disease'], ['Q12140', 'medication'],
    ['Q44512', 'epidemic'], ['Q12184', 'pandemic'], ['Q134808', 'vaccine'], ['Q133780', 'plague'], ['Q217519', 'bubonic plague'],
  ],
  [BIO]: [['Q420', 'biology'], ['Q864503', 'biologist'], ['Q7239', 'organism'], ['Q484591', 'natural history'], ['Q18805', 'naturalist']],
  [`${BIO}.molecules-cells`]: [['Q7868', 'cell'], ['Q7202', 'molecular biology']],
  [`${BIO}.genetics-genomes`]: [['Q7162', 'genetics'], ['Q7187', 'gene'], ['Q7430', 'deoxyribonucleic acid'], ['Q7020', 'genome']],
  [`${BIO}.genetics-genomes.dominance`]: [['Q19615136', 'dominance'], ['Q185055', 'Mendelian inheritance']],
  [`${BIO}.plants-fungi`]: [['Q756', 'plant'], ['Q764', 'fungi'], ['Q441', 'botany'], ['Q2374149', 'botanist']],
  [`${BIO}.animals`]: [['Q729', 'animal'], ['Q7377', 'mammal'], ['Q5113', 'bird'], ['Q10811', 'Reptilia'], ['Q10908', 'Amphibia'], ['Q152', 'fish'], ['Q1390', 'insect'], ['Q431', 'zoology'], ['Q350979', 'zoologist']],
  [`${BIO}.microbes`]: [['Q10876', 'Bacteria'], ['Q808', 'virus'], ['Q39833', 'microorganism']],
  [`${BIO}.development-physiology`]: [['Q521', 'physiology']],
  [EVO]: [['Q1063', 'evolution'], ['Q840400', 'evolutionary biology'], ['Q7205', 'paleontology'], ['Q1035', 'Charles Darwin']],
  [`${EVO}.tree-thinking`]: [['Q242125', 'phylogenetic tree'], ['Q171184', 'phylogenetics'], ['Q333018', 'common descent'], ['Q849168', 'last universal common ancestor']],
  [`${EVO}.variation-heredity`]: [['Q178694', 'heredity'], ['Q349856', 'genetic variation']],
  [`${EVO}.natural-selection`]: [['Q43478', 'natural selection']],
  [`${EVO}.chance-drift`]: [['Q486420', 'genetic drift']],
  [`${EVO}.new-species`]: [['Q39350', 'speciation'], ['Q281325', 'ring species']],
  [`${EVO}.deep-time`]: [['Q43521', 'geologic time scale'], ['Q935310', 'age of the Earth'], ['Q1909845', 'deep time']],
  [`${EVO}.evidence`]: [['Q40614', 'fossil'], ['Q1439423', 'fossil record']],
  [`${EVO}.transitions-extinctions`]: [['Q55814', 'extinction event'], ['Q55811', 'Cretaceous–Paleogene mass extinction'], ['Q430', 'dinosaur']],
  [`${EVO}.human-evolution`]: [['Q83944', 'human evolution'], ['Q7206', 'paleoanthropology'], ['Q635162', 'Hominidae']],
  [`${EVO}.evolution-now`]: [['Q21698220', 'antimicrobial resistance'], ['Q3610615', 'pesticide resistance']],
  [`${EVO}.sexual-selection`]: [['Q206913', 'sexual selection']],
  [T]: [['Q11016', 'technology']],
  [`${T}.computing`]: [['Q21198', 'computer science'], ['Q68', 'computer'], ['Q7397', 'software'], ['Q9143', 'programming language'], ['Q82594', 'computer scientist']],
  [`${T}.engineering`]: [
    ['Q11023', 'engineering'], ['Q81096', 'engineer'], ['Q39546', 'physical tool'], ['Q11019', 'machine'], ['Q1420', 'car'], ['Q11442', 'bicycle'],
    ['Q870', 'train'], ['Q11436', 'aircraft'], ['Q11446', 'ship'], ['Q205375', 'inventor'], ['Q765633', 'aviation'], ['Q7590', 'transport'],
    ['Q376', 'clock'], ['Q144334', 'printing press'], ['Q11034', 'printing'], ['Q39715', 'lighthouse'], ['Q12284', 'canal'], ['Q12323', 'dam'], ['Q728937', 'railway line'],
  ],
  [`${T}.materials`]: [['Q228736', 'materials science']],
  [`${T}.energy`]: [['Q11379', 'energy'], ['Q159719', 'power station'], ['Q12739', 'nuclear power'], ['Q12705', 'renewable energy']],
  [`${T}.networks`]: [['Q75', 'Internet'], ['Q11035', 'telephone'], ['Q872', 'radio'], ['Q289', 'television']],
  [`${H}.history`]: [
    ['Q309', 'history'], ['Q201788', 'historian'], ['Q198', 'war'], ['Q178561', 'battle'], ['Q3024240', 'historical country'],
    ['Q11514315', 'historical period'], ['Q13418847', 'historical event'], ['Q831663', 'military campaign'], ['Q645883', 'military operation'],
    ['Q124734', 'rebellion'], ['Q10931', 'revolution'], ['Q131569', 'treaty'], ['Q8473', 'military'], ['Q164950', 'dynasty'],
    ['Q41493', 'ancient history'], ['Q4692', 'Renaissance'], ['Q2269', 'Industrial Revolution'], ['Q3839081', 'disaster'], ['Q168983', 'conflagration'],
    ['Q906512', 'shipwrecking'], ['Q852190', 'shipwreck'], ['Q57821', 'fortification'], ['Q16748868', 'city walls'],
  ],
  [`${H}.history.medieval-world`]: [['Q12554', 'Middle Ages']],
  [`${H}.history.medieval-world.black-death`]: [['Q42005', 'Black Death']],
  [`${H}.philosophy`]: [['Q5891', 'philosophy'], ['Q4964182', 'philosopher']],
  [`${H}.languages`]: [['Q34770', 'language']],
  [`${H}.languages.writing-systems`]: [['Q8192', 'writing system']],
  [`${H}.languages.linguistics`]: [['Q14467526', 'linguist']],
  [`${H}.literature`]: [['Q8242', 'literature'], ['Q7725634', 'literary work'], ['Q571', 'book'], ['Q36180', 'writer'], ['Q49757', 'poet'], ['Q6625963', 'novelist'], ['Q5185279', 'poem']],
  [`${H}.archaeology`]: [['Q23498', 'archaeology'], ['Q839954', 'archaeological site'], ['Q3621491', 'archaeologist'], ['Q220659', 'archaeological artefact'], ['Q178743', 'stele'], ['Q43616', 'mummy']],
  [`${SO}.psychology`]: [['Q9418', 'psychology'], ['Q212980', 'psychologist']],
  [`${SO}.sociology`]: [['Q21201', 'sociology']],
  [`${SO}.politics`]: [['Q7163', 'politics'], ['Q82955', 'politician']],
  [`${SO}.anthropology`]: [['Q23404', 'anthropology']],
  [`${SO}.education`]: [['Q8434', 'education'], ['Q3918', 'university']],
  [M]: [['Q395', 'mathematics'], ['Q170790', 'mathematician']],
  [`${M}.algebra`]: [['Q3968', 'algebra']],
  [`${M}.geometry`]: [['Q8087', 'geometry']],
  [`${M}.analysis`]: [['Q7754', 'mathematical analysis']],
  [`${M}.probability`]: [['Q9492', 'probability']],
  [`${M}.logic`]: [['Q8078', 'logic']],
  [`${A}.music`]: [['Q638', 'music'], ['Q36834', 'composer'], ['Q2188189', 'musical work'], ['Q1344', 'opera'], ['Q34379', 'musical instrument'], ['Q639669', 'musician']],
  [`${A}.music.harmony`]: [['Q184421', 'harmony'], ['Q858576', 'musical tuning'], ['Q3029382', 'consonance and dissonance'], ['Q1242926', 'Pythagorean hammers']],
  [`${A}.visual-arts`]: [
    ['Q36649', 'visual arts'], ['Q735', 'art'], ['Q3305213', 'painting'], ['Q1028181', 'painter'], ['Q860861', 'sculpture'], ['Q11634', 'art of sculpture'],
    ['Q1281618', 'sculptor'], ['Q125191', 'photograph'], ['Q33231', 'photographer'], ['Q11633', 'photography'], ['Q838948', 'work of art'],
  ],
  [`${A}.architecture`]: [
    ['Q12271', 'architecture'], ['Q42973', 'architect'], ['Q41176', 'building'], ['Q12280', 'bridge'], ['Q16970', 'church building'],
    ['Q2977', 'cathedral'], ['Q23413', 'castle'], ['Q12518', 'tower'], ['Q4989906', 'monument'], ['Q811979', 'built structure'],
  ],
  [`${A}.theatre`]: [['Q11635', 'theatre'], ['Q25379', 'play'], ['Q214917', 'playwright']],
  [`${A}.design`]: [['Q82604', 'design']],
  [E]: [['Q8008', 'Earth science'], ['Q8065', 'natural disaster']],
  [`${E}.geology`]: [['Q1069', 'geology'], ['Q520549', 'geologist'], ['Q8072', 'volcano'], ['Q7692360', 'volcanic eruption'], ['Q7944', 'earthquake'], ['Q7946', 'mineral'], ['Q8063', 'rock'], ['Q8070', 'tsunami'], ['Q35509', 'cave'], ['Q159954', 'caldera']],
  [`${E}.climate`]: [['Q7937', 'climate'], ['Q8092', 'tropical cyclone'], ['Q8081', 'tornado'], ['Q11663', 'weather'], ['Q25261', 'meteorology'], ['Q8068', 'flood'], ['Q43059', 'drought'], ['Q81054', 'storm'], ['Q35666', 'glacier']],
  [`${E}.oceans`]: [['Q9430', 'ocean'], ['Q165', 'sea'], ['Q11292', 'coral reef']],
  [`${E}.ecology`]: [['Q7150', 'ecology']],
  [`${E}.ecology.conservation`]: [['Q473972', 'protected area'], ['Q179049', 'nature reserve'], ['Q46169', 'national park']],
  [`${E}.geography`]: [
    ['Q1071', 'geography'], ['Q8502', 'mountain'], ['Q4022', 'river'], ['Q23397', 'lake'], ['Q23442', 'island'], ['Q5107', 'continent'],
    ['Q8514', 'desert'], ['Q11900058', 'explorer'], ['Q42515', 'cartography'], ['Q4006', 'map'], ['Q102066', 'navigation'],
    ['Q2401485', 'expedition'], ['Q1640995', 'polar exploration'],
  ],
  [EC]: [['Q8134', 'economics'], ['Q188094', 'economist']],
  [`${EC}.money`]: [['Q1368', 'money'], ['Q8142', 'currency'], ['Q41207', 'coin']],
  [`${EC}.markets`]: [['Q37654', 'market']],
  [`${EC}.institutions`]: [['Q22687', 'bank']],
  [`${EC}.exchange`]: [['Q601401', 'trade']],
  [`${EC}.decision-theory.game-theory`]: [['Q44455', 'game theory']],
};

/** QID → { node, label }. */
export const PLACES = Object.fromEntries(Object.entries(BY_PLACE).flatMap(([node, pairs]) => pairs.map(([qid, label]) => [qid, { node, label }])));

/** Kinds of thing the engine never makes a reel about: entertainment, sport, commerce, wiki plumbing. */
export const EXCLUDED_CLASSES = {
  Q11424: 'film', Q5398426: 'television series', Q21191270: 'television series episode', Q15416: 'television program', Q7889: 'video game',
  Q482994: 'album', Q134556: 'single', Q7366: 'song', Q215380: 'musical group', Q349: 'sport', Q2736: 'association football',
  Q13406554: 'sports competition', Q16510064: 'sporting event', Q27020041: 'sports season', Q847017: 'sports club', Q476028: 'association football club',
  Q783794: 'company', Q4830453: 'business', Q431289: 'brand', Q35127: 'website', Q40231: 'public election', Q95074: 'character',
  Q13406463: 'Wikimedia list article', Q4167410: 'Wikimedia disambiguation page', Q618779: 'award', Q4504495: 'award ceremony',
  Q18127: 'record label', Q17558136: 'YouTube channel', Q744913: 'aviation accident',
};

/** People known only for these are left to the entertainment and sports press. */
export const EXCLUDED_OCCUPATIONS = {
  Q33999: 'actor', Q10800557: 'film actor', Q10798782: 'television actor', Q177220: 'singer', Q2252262: 'rapper', Q937857: 'association football player',
  Q3665646: 'basketball player', Q19204627: 'American football player', Q10871364: 'baseball player', Q2066131: 'athlete', Q378622: 'racing driver',
  Q3014296: 'motorcycle racer', Q4610556: 'model', Q17125263: 'YouTuber', Q245068: 'comedian', Q947873: 'television presenter',
  Q2526255: 'film director', Q3282637: 'film producer', Q28389: 'screenwriter',
};

/** The same rule for items Wikidata barely describes ("2024 song by …"): their short description. */
export const EXCLUDED_DESCRIPTIONS = /\b(song|single|album|EP|mixtape|music video|film|movie|television|TV series|sitcom|soap opera|episode|video game|band|rapper|singer|actor|actress|footballer|cricketer|basketball|baseball|wrestler|boxer|racing driver|beauty pageant|reality show|YouTuber|influencer|podcast|esports|streamer|fashion model|record producer)\b/i;

export const HUMAN = 'Q5';
export const TAXON = 'Q16521';

/** Stories that belong to a place with an expedition, read from what they say. Checked first, so a
 * day's "Archbishop Ussher dated the Creation to 23 October 4004 BC" lands on Deep time (where a
 * case waits), not on History in general. Deterministic, like the rest. */
export const EXPEDITION_RULES = [
  [/\b(age of the earth|first day of the world|date of (the )?creation|creation of the world|geologic(al)? time ?scale|deep time|radiometric dating|zircons?)\b/i, `${EVO}.deep-time`],
  [/\b(black death|bubonic plague|yersinia pestis)\b/i, `${H}.history.medieval-world.black-death`],
  [/\b(natural selection|survival of the fittest|peppered moths?)\b/i, `${EVO}.natural-selection`],
  [/\b(speciation|ring species)\b/i, `${EVO}.new-species`],
  [/\b(genetic drift|founder effect|population bottleneck)\b/i, `${EVO}.chance-drift`],
  [/\b(phylogenetic|tree of life|last universal common ancestor)\b/i, `${EVO}.tree-thinking`],
  [/\b(heredity|heritability|heritable)\b/i, `${EVO}.variation-heredity`],
  [/\b(transitional fossils?|fossil record|homologous)\b/i, `${EVO}.evidence`],
  [/\b(mass extinction|extinction event|chicxulub)\b/i, `${EVO}.transitions-extinctions`],
  [/\b(hominins?|australopith\w*|homo erectus|neanderthals?|denisovans?|human evolution|out of africa)\b/i, `${EVO}.human-evolution`],
  [/\b(antibiotic resistance|antimicrobial resistance|drug[- ]resistant|pesticide resistance|superbugs?)\b/i, `${EVO}.evolution-now`],
  [/\b(sexual selection|mate choice)\b/i, `${EVO}.sexual-selection`],
  [/\b(on the origin of species|theory of evolution|evolutionary theory)\b/i, `${EVO}.how-we-know`],
  [/\b(mendel(ian)?|recessive|dominant (allele|gene|trait)s?|incomplete dominance|co-?dominance)\b/i, `${BIO}.genetics-genomes.dominance`],
  [/\b(free fall|falling bodies|leaning tower of pisa|hammer and (the )?feather)\b/i, `${S}.physics.mechanics.motion.acceleration`],
  [/\b(musical tuning|consonance|pythagorean (tuning|hammers|comma)|octaves?)\b/i, `${A}.music.harmony`],
];

/** The "categories" half: when Wikidata's classes lead nowhere, a page's short description often
 * names its field ("English astronomer", "species of moth"). First match wins. */
export const DESCRIPTION_RULES = [
  [/\b(astronom|astrophysic|planet|comet|asteroid|galaxy|nebula|star cluster|spacecraft|space probe|space telescope|satellite|eclipse|meteor)/i, `${S}.astronomy`],
  [/\b(species|genus|family) of (bird|mammal|fish|frog|lizard|snake|insect|moth|butterfly|beetle|spider|crab|mollusc|snail|animal|reptile|amphibian|shark|whale)/i, `${BIO}.animals`],
  [/\b(species|genus|family) of (plant|tree|flowering plant|fungus|fungi|moss|fern|grass|orchid|mushroom)/i, `${BIO}.plants-fungi`],
  [/\b(species|genus) of (bacteri|virus|archae)/i, `${BIO}.microbes`],
  [/\b(dinosaur|pterosaur|ichthyosaur|plesiosaur|extinct)\b/i, `${EVO}.transitions-extinctions`],
  [/\b(volcan|earthquake|geolog|mineral|rock formation)/i, `${E}.geology`],
  [/\b(hurricane|typhoon|cyclone|tornado|storm|blizzard|heat wave|climate)/i, `${E}.climate`],
  [/\b(physicist|physics)\b/i, `${S}.physics`],
  [/\b(chemist|chemical|element)\b/i, `${S}.chemistry`],
  [/\b(mathematician|mathematics|theorem)\b/i, M],
  [/\b(physician|surgeon|disease|epidemic|pandemic|vaccine|medical)\b/i, `${S}.medicine`],
  [/\b(naturalist|biologist|botanist|zoologist)\b/i, BIO],
  [/\b(composer|symphony|opera|concerto|musical instrument)\b/i, `${A}.music`],
  [/\b(painter|painting|sculptor|sculpture|photographer)\b/i, `${A}.visual-arts`],
  [/\b(architect|cathedral|church|castle|bridge|tower|palace|temple|mosque)\b/i, `${A}.architecture`],
  [/\b(poet|novelist|novel|poem|writer)\b/i, `${H}.literature`],
  [/\b(philosopher|philosophy)\b/i, `${H}.philosophy`],
  [/\b(archaeolog|ancient city|hoard)\b/i, `${H}.archaeology`],
  [/\b(battle|siege|war|treaty|empire|dynasty|kingdom|revolt|rebellion)\b/i, `${H}.history`],
  [/\b(engineer|inventor|locomotive|aircraft|steamship|railway)\b/i, `${T}.engineering`],
  [/\b(island|river|lake|mountain|desert|explorer)\b/i, `${E}.geography`],
];
