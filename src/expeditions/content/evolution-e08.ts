import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const GUBBIO = 'Der_Aufschluss_der_KP-Grenze_bei_Gubbio_(43.36555_N,_12.58266_E)._Proben_von_diesem_Ort_zeigten_erstmals_die_Iridium-Anomalie,_die_zur_Annahme_eines_Asteroideneinschlags_führte.jpg';

// E08 "Five times the world almost ended": the long build-up of life's big firsts, the five
// great crashes as data (Sepkoski 1996 genus losses, as tabulated on Wikipedia's "Extinction
// event"), then how the last crash was solved: the Alvarez iridium clay (facts read from
// Alvarez et al. 1980 itself, no quotation) and the Chicxulub crater. Misconceptions targeted:
// #12 (evolution as progress), "the dinosaurs all died out" (birds are dinosaurs) and
// "extinction means failure".
export const evolutionE08: Pack = {
  id: 'evolution-e08',
  title: 'Five times the world almost ended',
  question: 'What do life’s biggest turning points and its worst disasters have in common?',
  path: ['Life', 'Evolution', 'Transitions and extinctions', 'Mass extinctions'],
  hue: 130,
  minutes: 9,
  media: {
    alvarez: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/LWA_with_Walt.JPG/1280px-LWA_with_Walt.JPG',
      alt: 'Luis Alvarez, left, and his son Walter, right, standing at a tilted rock face in the Bottaccione Gorge, each with a hand on the rock',
      credit: 'Lawrence Berkeley Laboratory · Public domain',
      page: commons('LWA_with_Walt.JPG'), date: '1981', license: 'Public domain',
    },
    stromatolites: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Living_stromatolites%2C_Shark_Bay%2C_Western_Australia.png/1280px-Living_stromatolites%2C_Shark_Bay%2C_Western_Australia.png',
      alt: 'A snorkeller swims over rounded mounds of living stromatolites in clear shallow water at Shark Bay',
      credit: 'Ed Landing and Markes E. Johnson, Journal of Marine Science and Engineering, 2024 · CC BY 4.0',
      page: commons('Living_stromatolites,_Shark_Bay,_Western_Australia.png'), license: 'CC BY 4.0',
    },
    geulhem: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Cretaceous_Paleogene_clay_at_Geulhemmergroeve.jpg/1280px-Cretaceous_Paleogene_clay_at_Geulhemmergroeve.jpg',
      alt: 'A finger points just below a thin grey band of clay running through pale yellow rock in a tunnel wall',
      credit: 'Wilson44691 · CC0', page: commons('Cretaceous_Paleogene_clay_at_Geulhemmergroeve.jpg'), license: 'CC0',
    },
    gubbio: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Der_Aufschluss_der_KP-Grenze_bei_Gubbio_%2843.36555_N%2C_12.58266_E%29._Proben_von_diesem_Ort_zeigten_erstmals_die_Iridium-Anomalie%2C_die_zur_Annahme_eines_Asteroideneinschlags_f%C3%BChrte.jpg/1280px-thumbnail.jpg',
      alt: 'The tilted limestone outcrop in the Bottaccione Gorge near Gubbio, with a red arrow marking the boundary clay',
      credit: 'Biandh · CC BY 4.0 · zoomed and panned', page: commons(GUBBIO), date: '2018', license: 'CC BY 4.0',
    },
    drumheller: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/KT_boundary_054.jpg/1280px-KT_boundary_054.jpg',
      alt: 'Striped badlands near Drumheller, Alberta, where erosion has exposed the boundary layer',
      credit: 'Glen Larson · Public domain', page: commons('KT_boundary_054.jpg'), license: 'Public domain',
    },
    chicxulub: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Chicxulub_radar_topography.jpg',
      alt: 'Shaded relief of Mexico’s Yucatán Peninsula from the Space Shuttle radar, with a faint curved trough and a ring of sinkholes marking the buried crater',
      credit: 'NASA/JPL-Caltech, Shuttle Radar Topography Mission · Public domain',
      page: commons('Chicxulub_radar_topography.jpg'), date: '2000', license: 'Public domain',
    },
    trex: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Tyrannosaurus_skeleton.jpg/1280px-Tyrannosaurus_skeleton.jpg',
      alt: 'A 1905 drawing of a Tyrannosaurus skeleton standing upright, with a human skeleton beside its foot for scale',
      credit: 'William D. Matthew, 1905 · Public domain', page: commons('Tyrannosaurus_skeleton.jpg'), date: '1905',
      license: 'Public domain', backdrop: 'paper',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'alvarez', title: 'Five times the world almost ended',
      hook: 'In the 1970s, geologist Walter Alvarez told his father Luis about a centimetre of clay in an Italian gorge. Below it, the limestone is packed with the shells of tiny sea creatures. Above it, most of those kinds are gone.',
      focus: [50, 28],
    },
    {
      kind: 'order', gradeId: 'big-firsts', media: 'stromatolites',
      prompt: 'Before any great extinction came the long build-up. Put life’s big firsts in order.',
      items: [
        { id: 'mats', label: 'Microbes build mats that leave the first undisputed traces of life' },
        { id: 'oxygen', label: 'Microbes start filling the air with oxygen' },
        { id: 'complex', label: 'Complex cells appear, powered by bacteria they captured' },
        { id: 'large', label: 'Large, complex creatures appear in the sea' },
        { id: 'plants', label: 'Plants spread onto land' },
        { id: 'limbs', label: 'Four-limbed animals walk on land' },
      ],
      answer: ['mats', 'oxygen', 'complex', 'large', 'plants', 'limbs'],
      ends: ['First', 'Last'],
      explain: 'Mats like these, stromatolites, left the first undisputed traces of life at least 3.5 billion years ago. Oxygen began building up about 2.46 billion years ago. Complex cells followed, their date still debated; the bacteria they took in became the mitochondria that power your cells today. Large, complex creatures appear about 600 million years ago, plants reach land about 470 million years ago, and four-limbed animals by about 390 to 370 million years ago. For most of that time, nearly all life was too small to see.',
    },
    {
      kind: 'sim', sim: 'lifeChart', title: 'Five crashes in 540 million years',
      goal: 'Since large animals appeared, the fossil record shows times when much of the life in the sea vanished at once. In 1982 David Raup and Jack Sepkoski picked out five such times, now known as the big five.',
      params: {
        span: [540, 0], max: 60,
        measure: 'Sea-animal genera lost', axis: 'Million years ago',
        eras: [
          { name: 'Paleozoic', from: 538.8, to: 251.9 },
          { name: 'Mesozoic', from: 251.9, to: 66 },
          { name: 'Cenozoic', from: 66, to: 0 },
        ],
        events: [
          { id: 'ordovician', name: 'End-Ordovician', short: 'Ordovician', ma: 445, value: 49, big: true, facts: [
            { label: 'Share of species lost (estimate)', text: 'About 85%' },
            { label: 'What happened', text: 'Two pulses: the first with cooling and a great southern glaciation, the second with the thaw. Some studies blame volcanism, warming and oxygen-starved seas instead.' },
          ] },
          { id: 'lau', name: 'Lau event', short: 'Lau', ma: 424, value: 23 },
          { id: 'kacak', name: 'Kačák event', short: 'Kačák', ma: 388, value: 24 },
          { id: 'taghanic', name: 'Taghanic event', short: 'Taghanic', ma: 384, value: 30 },
          { id: 'devonian', name: 'Late Devonian', short: 'Devonian', ma: 372, value: 35, big: true, facts: [
            { label: 'Share of species lost (estimate)', text: 'At least 70%, across this event and the Hangenberg event 359 million years ago' },
            { label: 'What happened', text: 'Both events are linked to seas losing their oxygen. Exactly why is still debated.' },
            { label: 'Lost', text: 'Coral reefs and many trilobites and jawless fish; at the Hangenberg event, the armoured placoderm fish.' },
          ] },
          { id: 'hangenberg', name: 'Hangenberg event', short: 'Hangenberg', ma: 359, value: 28 },
          { id: 'serpukhovian', name: 'Serpukhovian', short: 'Serpukhovian', ma: 327.5, value: 23 },
          { id: 'capitanian', name: 'Capitanian', short: 'Capitanian', ma: 260, value: 47 },
          { id: 'permian', name: 'End-Permian, “the Great Dying”', short: 'Permian', ma: 252, value: 58, big: true, facts: [
            { label: 'Share of species lost (estimate)', text: 'About 81% of sea species and 70% of land vertebrate species' },
            { label: 'What happened', text: 'The consensus cause is the Siberian Traps, vast volcanic eruptions that warmed the world and stripped the seas of oxygen.' },
            { label: 'Lost', text: 'The last trilobites, and the main coral groups of the time.' },
            { label: 'Afterwards', text: 'By some estimates, land vertebrates took 30 million years to recover. Archosaurs, the line of crocodiles and dinosaurs, spread into the emptied world. A separate crash eight million years earlier, the Capitanian, may have been as large as some of the big five.' },
          ] },
          { id: 'triassic', name: 'End-Triassic', short: 'Triassic', ma: 201, value: 37, big: true, facts: [
            { label: 'Share of species lost (estimate)', text: '70 to 75%' },
            { label: 'What happened', text: 'Generally put down to huge eruptions in the Central Atlantic magmatic province, which released carbon dioxide, warming the world and acidifying the oceans.' },
            { label: 'Afterwards', text: 'With most of their rivals gone, dinosaurs had little competition on land.' },
          ] },
          { id: 'toarcian', name: 'Pliensbachian–Toarcian', short: 'Toarcian', ma: 182, value: 14 },
          { id: 'tithonian', name: 'End-Jurassic', short: 'Tithonian', ma: 145, value: 18 },
          { id: 'cenomanian', name: 'Cenomanian–Turonian', short: 'Cenomanian', ma: 94, value: 15 },
          { id: 'cretaceous', name: 'End-Cretaceous', short: 'Cretaceous', ma: 66, value: 39, big: true, facts: [
            { label: 'Share of species lost (estimate)', text: 'About 75%' },
            { label: 'What happened', text: 'An asteroid about 10 kilometres across hit what is now Mexico’s Yucatán Peninsula.' },
            { label: 'Lost', text: 'Every non-bird dinosaur, the ammonites, plesiosaurs and mosasaurs.' },
            { label: 'Afterwards', text: 'Mammals spread into the large-animal roles the dinosaurs had held.' },
          ] },
          { id: 'eocene', name: 'Eocene–Oligocene', short: 'Eocene', ma: 34, value: 11 },
        ],
        pick: {
          ask: 'Which of the five wiped out the largest share of sea life?',
          answer: 'permian',
          right: 'The end-Permian, 252 million years ago, was the worst of all. The asteroid that ended the dinosaurs ranks lower.',
          wrong: 'It was the end-Permian, 252 million years ago: about 81% of sea species vanished. The asteroid that ended the dinosaurs, famous as it is, ranks lower.',
        },
        source: 'Data: J. J. Sepkoski Jr. (1996), share of sea-animal genera lost in each event, as tabulated on Wikipedia’s “Extinction event”. Two of the five mark the ends of whole eras.',
      },
      grades: [{ gradeId: 'worst-crash' }],
    },
    {
      kind: 'predict', gradeId: 'iridium', media: 'geulhem',
      prompt: 'Here is the boundary clay in a tunnel in the Netherlands. In Italy, the Alvarez team found about 30 times the normal background level of iridium in it. Iridium is rare in Earth’s crust but more common in asteroids. What best explains the spike?',
      parts: [
        { id: 'why', label: '', answer: 'impact', choices: [
          { id: 'slow', label: 'The clay took ages to form, slowly collecting dust from space',
            feedback: 'That is the question the team set out to answer: they hoped the iridium would show how long the clay took to settle. But the boundary clay is chemically unlike the ordinary clay in the limestone, and the same spike turned up in Denmark and New Zealand. Something sudden had happened.' },
          { id: 'impact', label: 'Something from space hit Earth and spread its dust around the world' },
          { id: 'volcano', label: 'A volcano erupted nearby',
            feedback: 'One local eruption can’t put the same spike into rocks on the other side of the world.' },
          { id: 'shells', label: 'Dying sea creatures concentrated iridium in their shells',
            feedback: 'The clay holds almost none of the shell material that makes up the rock around it. It records a moment when the shell-builders had stopped.' },
        ] },
      ],
      explain: 'In 1980 Luis and Walter Alvarez, with the chemists Frank Asaro and Helen Michel, proposed that an asteroid about 10 kilometres across struck Earth. Its dust, spread around the world, would have darkened the sky and suppressed photosynthesis.',
    },
    {
      kind: 'documentary', title: 'From a clay seam to a crater',
      frames: [
        { media: 'gubbio', x: 30, y: 52, zoom: 1.3, seconds: 7, text: 'The Bottaccione Gorge near Gubbio. Limestone built from tiny shells, layer on layer, and at the boundary a bed of clay about a centimetre thick.' },
        { media: 'alvarez', x: 50, y: 30, zoom: 1.12, seconds: 7.5, text: 'Luis and Walter Alvarez at the boundary in 1981. Their 1980 paper reported the iridium spike in Italy, Denmark and New Zealand, and blamed an asteroid.' },
        { media: 'drumheller', x: 50, y: 42, zoom: 1.15, seconds: 7, text: 'The same layer turned up around the world, in rocks laid down on land and at sea. Here it runs through the badlands of Alberta.' },
        { media: 'chicxulub', x: 50, y: 74, zoom: 1.35, seconds: 8, text: 'But where was the crater? Oil prospectors had mapped a buried ring under Mexico’s Yucatán in 1978. In the early 1990s, old drill cores showed shock damage: an impact crater about 200 kilometres across.' },
        { media: 'drumheller', x: 46, y: 70, zoom: 1.3, seconds: 8.5, text: 'In the darkness that followed, plants and plankton stopped growing. Plant-eaters starved, then the meat-eaters. The survivors were mostly small, and many lived on dead matter, in burrows, streams and lakes.' },
      ],
    },
    {
      kind: 'match', gradeId: 'impact-winter', transfer: true, buckets: true,
      prompt: 'Imagine another impact winter: months of darkness, then years of cold. Sort these imaginary creatures by their likely fate.',
      left: [
        { id: 'insects', label: 'A rat-sized animal that eats insects and worms' },
        { id: 'grazer', label: 'A three-tonne plant-eater that needs fresh leaves every day' },
        { id: 'hunter', label: 'A big hunter that feeds on the three-tonne plant-eaters' },
        { id: 'lake', label: 'A lake fish that feeds on dead plant matter washed in from the shore' },
        { id: 'fasting', label: 'A cold-blooded reptile that can go months without eating' },
        { id: 'plankton', label: 'An open-ocean fish that eats only living plankton' },
      ],
      right: [{ id: 'through', label: 'Likely to pull through' }, { id: 'die', label: 'Likely to die out' }],
      pairs: { insects: 'through', grazer: 'die', hunter: 'die', lake: 'through', fasting: 'through', plankton: 'die' },
      explain: 'Darkness stops photosynthesis, so food chains built on living plants and plankton collapse from the bottom up. Food chains built on dead matter keep running. That is the pattern in the real record: small insect- and worm-eaters, stream and lake life, and crocodiles that can go months without food came through.',
    },
    {
      kind: 'flaw', gradeId: 'failure',
      prompt: '“The dinosaurs died out because they were failures, and mammals took over because mammals were better.” Which step breaks?',
      steps: [
        { id: 'a', text: 'Dinosaurs were the main large land animals for about 135 million years.' },
        { id: 'b', text: 'After the asteroid, every non-bird dinosaur vanished.' },
        { id: 'c', text: 'So they must have been badly built for survival all along.' },
        { id: 'd', text: 'So mammals took over because they were better designed.' },
      ],
      answer: 'c',
      explain: 'A group that thrived for 135 million years was no failure. The impact changed the rules almost overnight, and survival came down to traits that happened to suit a dark, cold world: small size, a varied diet, somewhere to shelter. Mammals had lived alongside dinosaurs the whole time but could not break into the large-animal roles until the dinosaurs were gone.',
    },
    {
      kind: 'predict', gradeId: 'living-dinosaur', transfer: true, media: 'trex',
      prompt: 'Tyrannosaurus rex. Of the animals alive today, which is its closest relative?',
      parts: [
        { id: 'kin', label: '', answer: 'chicken', choices: [
          { id: 'crocodile', label: 'A crocodile',
            feedback: 'Close: crocodiles and dinosaurs share an ancestor. But one living group shares a more recent ancestor with T. rex.' },
          { id: 'komodo', label: 'A Komodo dragon',
            feedback: 'Lizards are reptiles, but crocodiles, dinosaurs and birds form a closer group, the archosaurs, that lizards sit outside.' },
          { id: 'chicken', label: 'A chicken' },
          { id: 'elephant', label: 'An elephant',
            feedback: 'Elephants are mammals, on a separate branch from every reptile and bird. Size is no guide to kinship.' },
        ] },
      ],
      explain: 'Birds evolved from earlier theropods, the same branch of dinosaurs as T. rex, and are the only dinosaurs still alive. So the dinosaurs did not all die out: one small branch came through and spread across the world.',
    },
    {
      kind: 'payoff',
      idea: 'Life’s history turns on rare big firsts and sudden crashes. Five times most species vanished, and the survivors, often lucky rather than better, inherited the emptied world.',
      connections: [
        { title: 'Earth’s history in one day', place: 'Life › Evolution › Deep time', to: 'evolution-e06' },
        { title: 'Four witnesses, one story', place: 'Life › Evolution › Evidence', to: 'evolution-e07' },
        { title: 'Who’s your closest cousin? Reading the tree', place: 'Life › Evolution › Tree thinking' },
        { title: 'Is a sixth extinction underway?', place: 'Earth › Ecology' },
      ],
    },
  ],
  provenance: [
    { claim: 'Walter Alvarez found a gorge in central Italy in the 1970s with a thin clay layer exactly at the K–Pg boundary and told his father about it; photo of Luis and Walter at the boundary, 1981', source: 'Wikipedia: Luis Walter Alvarez (rev. 1379166099); Alvarez hypothesis (rev. 1378645628)' },
    { claim: 'Bottaccione Gorge near Gubbio (the first boundary-clay iridium samples came from the Contessa section 2 km away); clay bed about 1 cm thick between the highest Cretaceous and lowest Tertiary limestone; Globotruncana forams disappear abruptly at the boundary; planktonic forams and nannoplankton nearly exterminated; the clay is free of primary calcium carbonate; the team measured iridium hoping to learn the time the clay represented', source: 'Alvarez, Alvarez, Asaro & Michel 1980, Science 208:1095, doi:10.1126/science.208.4448.1095 (pp. 1095–1096; read, not quoted)' },
    { claim: 'Iridium increases of about 30, 160 and 20 times above the background level in Italy, Denmark and New Zealand at precisely the time of the extinction; iridium extraterrestrial; boundary clay chemically unlike the clay mixed into the limestones; impact dust would suppress photosynthesis; asteroid diameter 10 ± 4 km', source: 'Alvarez et al. 1980, abstract (PubMed 17783054)' },
    { claim: 'Iridium is more common in asteroids than in Earth’s crust; the boundary layer is found worldwide in marine and terrestrial rocks; about 75% of species lost; all non-avian dinosaurs extinct; impact winter halted photosynthesis', source: 'Wikipedia: Cretaceous–Paleogene extinction event (rev. 1379830492)' },
    { claim: 'Survival pattern: omnivores, insectivores and carrion-eaters survived; surviving mammals and birds fed on insects, worms and snails that fed on detritus; stream and lake ecosystems lost few groups; crocodilians can survive months without food; water-column animals hit harder than sea-floor ones; surviving mammals were generally rat-sized', source: 'Wikipedia: Cretaceous–Paleogene extinction event (Extinction patterns; Mammals)' },
    { claim: 'Chicxulub: asteroid about 10 km; crater about 200 km wide, buried about 1 km; found by Camargo and Penfield in a 1978 Pemex magnetic survey; drill samples obtained with Hildebrand from 1990 showed shock metamorphism; confirmed in the early 1990s', source: 'Wikipedia: Chicxulub crater (rev. 1379989654); Cretaceous–Paleogene extinction event' },
    { claim: 'Raup and Sepkoski (1982) identified five intervals of excessive diversity loss', source: 'Wikipedia: Extinction event (rev. 1379759322)' },
    { claim: 'Genus-loss percentages (Sepkoski 1996) and ages for 15 events: Late Ordovician 445 Ma ~49%; Lau 424 ~23%; Kačák 388 ~24%; Taghanic 384 ~30%; Late Devonian/Kellwasser 372 ~35%; Hangenberg 359 ~28%; Serpukhovian 330–325 ~23%; Capitanian 260 ~47%; Permian–Triassic 252 ~58%; Triassic–Jurassic 201 ~37%; Pliensbachian–Toarcian 186–178 ~14%; End-Jurassic 145 ~18%; Cenomanian–Turonian 94 ~15%; Cretaceous–Paleogene 66 ~39%; Eocene–Oligocene 34 ~11%', source: 'Wikipedia: Extinction event, table of extinction proportions (Sepkoski 1996 column)' },
    { claim: 'Species estimates: Late Ordovician 85% (Bambach 2006); Late Devonian at least 70%; Permian–Triassic about 81% of marine species and 70% of terrestrial vertebrates; Triassic–Jurassic 70–75%; Cretaceous–Paleogene 75%', source: 'Wikipedia: Extinction event' },
    { claim: 'Late Ordovician two pulses (cooling and glaciation, then thaw), with 2020 studies proposing volcanism, warming and anoxia; Late Devonian events linked to anoxia, causes debated, reefs, jawless fish, trilobites and placoderms lost; trilobites and rugose and tabulate corals lost at the end-Permian; vertebrate recovery took 30 million years and archosaurs diversified; Capitanian may be larger than some of the big five; vertebrate recovery estimates are debated (a thriving ecosystem 75,000 years after the event has been reported); end-Triassic left dinosaurs with little competition; mammals expanded into large niches after the end-Cretaceous', source: 'Wikipedia: Extinction event' },
    { claim: 'End-Permian cause: consensus is the Siberian Traps flood basalts; end-Triassic generally attributed to the Central Atlantic magmatic province', source: 'Wikipedia: Permian–Triassic extinction event (rev. 1380638197); Triassic–Jurassic extinction' },
    { claim: 'Era boundaries 538.8, 251.9 and 66.0 Ma; the Paleozoic–Mesozoic boundary is the Permian–Triassic boundary; the K–Pg event ended the Mesozoic', source: 'Paleobiology Database time scale (API, 2026-10-16); Wikipedia: Paleozoic; Cretaceous–Paleogene extinction event' },
    { claim: 'Stromatolites: earliest undisputed life at least 3.5 Ga; Great Oxidation Event began about 2.46 Ga; eukaryotes arose by symbiogenesis with an alphaproteobacterium (proto-mitochondrion) after the GOE, timing debated; Ediacaran organisms about 600 Ma; land plants about 470 Ma; oldest four-limbed trackways Middle Devonian (about 390 Ma), body fossils common about 370–360 Ma', source: 'Wikipedia: Earliest known life forms; Great Oxidation Event; Eukaryote (rev. 1377320053); Ediacaran biota; Evolutionary history of plants; Tetrapod (rev. 1379823950)' },
    { claim: 'Dinosaurs as the main large land animals from the end-Triassic (about 201 Ma) to 66 Ma, about 135 million years', source: 'Computed from the event ages above; Wikipedia: Extinction event (dinosaurs monopolised large terrestrial niches)' },
    { claim: 'Birds evolved from earlier theropods and are the only living dinosaurs; their closest living relatives are crocodilians, together the archosaurs; all extant reptiles are more closely related to each other and birds than to synapsids (mammals)', source: 'Wikipedia: Bird (rev. 1380656033); Synapsida' },
    { claim: 'Misconception #12 (progress); “dinosaurs all died out” and “extinction means failure” are flagged plausible errors', source: 'mok-content-lab docs/research/appendix-evolution.md §2; EVOLUTION-SLICE brief' },
    { claim: 'Images: Luis and Walter Alvarez (LBL, public domain); living stromatolites (CC BY 4.0); Geulhem boundary clay (CC0); Gubbio outcrop (CC BY 4.0); Drumheller badlands (public domain); Chicxulub radar topography PIA03379 (NASA, public domain); Matthew’s 1905 Tyrannosaurus (public domain)', source: 'Wikimedia Commons file pages, licenses checked via the Commons API 2026-10-16' },
  ],
};
