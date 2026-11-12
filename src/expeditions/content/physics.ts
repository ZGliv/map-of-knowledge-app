import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const APOLLO_VIDEO = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e8/Apollo_15_feather_and_hammer_drop.ogv/Apollo_15_feather_and_hammer_drop.ogv';

export const physics: Pack = {
  id: 'physics',
  title: 'The hammer and the feather',
  question: 'Does a heavier thing fall faster?',
  path: ['Science', 'Physics', 'Mechanics', 'Free fall'],
  hue: 182,
  minutes: 6,
  media: {
    moon: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/AS15-88-11866_-_Apollo_15_flag%2C_rover%2C_LM%2C_Irwin_-_restoration1.jpg/1920px-AS15-88-11866_-_Apollo_15_flag%2C_rover%2C_LM%2C_Irwin_-_restoration1.jpg',
      alt: 'Apollo 15 on the Moon: the lunar module Falcon, the rover, the flag and astronaut James Irwin',
      credit: 'NASA, Apollo 15 · Public domain', page: commons('AS15-88-11866_-_Apollo_15_flag,_rover,_LM,_Irwin_-_restoration1.jpg'), date: '1971',
    },
    drop: {
      src: `${APOLLO_VIDEO}.480p.vp9.webm`,
      alt: 'Television footage of David Scott dropping a hammer and a feather on the Moon',
      credit: 'NASA · Public domain', page: commons('Apollo_15_feather_and_hammer_drop.ogv'), date: '2 August 1971',
      sources: [
        { src: `${APOLLO_VIDEO}.480p.vp9.webm`, type: 'video/webm' },
        { src: `${APOLLO_VIDEO}.360p.mpeg4.mov`, type: 'video/mp4' },
      ],
    },
    scott: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Astronaut_David_Scott_watching_hammer_and_feather_fall_to_lunar_surface_%28S71-43788%29.jpg/1920px-Astronaut_David_Scott_watching_hammer_and_feather_fall_to_lunar_surface_%28S71-43788%29.jpg',
      alt: 'David Scott watching the hammer and feather fall', credit: 'NASA · Public domain',
      page: commons('Astronaut_David_Scott_watching_hammer_and_feather_fall_to_lunar_surface_(S71-43788).jpg'), date: '1971',
    },
    galileo: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg/1920px-Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg',
      alt: 'Portrait of Galileo Galilei by Justus Sustermans', credit: 'Justus Sustermans, c. 1636 · Public domain',
      page: commons('Justus_Sustermans_-_Portrait_of_Galileo_Galilei,_1636.jpg'), date: 'c. 1636',
    },
    stevin: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Portret_van_Simon_Stevin%2C_RP-P-1907-3467.jpg/1920px-Portret_van_Simon_Stevin%2C_RP-P-1907-3467.jpg',
      alt: 'Engraved portrait of Simon Stevin', credit: 'Portrait of Simon Stevin, print, 1821 · Rijksmuseum · CC0',
      page: commons('Portret_van_Simon_Stevin,_RP-P-1907-3467.jpg'), date: '1821',
    },
    pisa: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/The_Leaning_Tower_of_Pisa_SB.jpeg/1920px-The_Leaning_Tower_of_Pisa_SB.jpeg',
      alt: 'The Leaning Tower of Pisa', credit: 'Saffron Blaze · CC BY-SA 3.0', page: commons('The_Leaning_Tower_of_Pisa_SB.jpeg'),
    },
  },
  beats: [
    { kind: 'cover', media: 'moon', title: 'The hammer and the feather', hook: 'Drop a hammer and a feather at the same moment. Which one lands first?', focus: [50, 45] },
    {
      kind: 'predict', gradeId: 'drop-predict',
      prompt: 'A geologist’s hammer and a falcon feather, released together from shoulder height.',
      parts: [
        { id: 'earth', label: 'In a room on Earth', answer: 'hammer', choices: [
          { id: 'hammer', label: 'Hammer first' }, { id: 'together', label: 'Same moment' }, { id: 'feather', label: 'Feather first' }] },
        { id: 'moon', label: 'On the Moon, where there is no air', answer: 'together', choices: [
          { id: 'hammer', label: 'Hammer first' }, { id: 'together', label: 'Same moment' }, { id: 'feather', label: 'Feather first' }] },
      ],
    },
    {
      kind: 'footage', media: 'drop', poster: 'scott',
      caption: 'Hadley Plain, the Moon · 2 August 1971. Commander David Scott, at the end of the last moonwalk.',
      reveal: { predictGrade: 'drop-predict', part: 'moon', text: 'They hit the dust together. With no air to push against the feather, nothing held it back.' },
    },
    {
      kind: 'sim', sim: 'dropTower', title: 'The drop tower',
      goal: 'Make the feather land at the same moment as the hammer.',
      params: {
        height: 1.6,
        worlds: [
          { id: 'earth', label: 'Earth', g: 9.81, air: true, flash: 0.1 },
          { id: 'vacuum', label: 'Earth, air pumped out', g: 9.81, air: false, flash: 0.1 },
          { id: 'moon', label: 'Moon', g: 1.62, air: false, flash: 0.25 },
        ],
        featherTerminal: 0.6,
        strobe: {
          ask: 'Each flash is the same time apart. How do the gaps between the hammer’s flashes grow?',
          choices: [
            { id: 'equal', label: 'They stay equal' }, { id: 'linear', label: '1, 2, 3, 4 …' },
            { id: 'odd', label: '1, 3, 5, 7 …' }, { id: 'double', label: 'Each gap doubles' },
          ],
          answer: 'odd',
          explain: 'Add the gaps and you get 1, 4, 9, 16: the squares. Distance grows with time squared. On Earth a dropped thing falls 4.9 m in the first second, and 4.9 × t × t metres after t seconds.',
        },
      },
      grades: [{ gradeId: 'strobe-gaps' }],
    },
    {
      kind: 'documentary', title: 'Who actually checked?',
      frames: [
        { media: 'galileo', x: 50, y: 30, zoom: 1.12, seconds: 6.5, text: 'For nearly two thousand years the standard answer came from Aristotle: a heavier body falls faster.' },
        { media: 'pisa', x: 50, y: 42, zoom: 1.15, seconds: 7, text: 'The famous story says Galileo dropped two balls from this tower to prove him wrong. Most historians think he never did.' },
        { media: 'stevin', x: 50, y: 34, zoom: 1.35, seconds: 8, text: 'Others really did. In 1586, Simon Stevin and Jan Cornets de Groot dropped two lead balls in Delft, one ten times heavier. They landed together.' },
        { media: 'galileo', x: 56, y: 26, zoom: 1.55, seconds: 7, text: 'Galileo’s sharper weapon was an argument. He printed it in 1638 as a conversation between three friends.' },
      ],
    },
    {
      kind: 'dialogue',
      source: { title: 'Two New Sciences, First Day (1638)', detail: 'Galileo Galilei · translated by Henry Crew and Alfonso de Salvio, 1914 · pp. 62–63', page: 'https://archive.org/details/dialoguesconcern00galiuoft' },
      cast: {
        SALV: { name: 'Salviati', note: 'speaks for Galileo' },
        SAGR: { name: 'Sagredo', note: 'a curious friend' },
        SIMP: { name: 'Simplicio', note: 'defends Aristotle · you' },
      },
      learner: 'SIMP',
      script: [
        { who: 'SALV', text: 'I greatly doubt that Aristotle ever tested by experiment whether it be true that two stones, one weighing ten times as much as the other, if allowed to fall, at the same instant, from a height of, say, 100 cubits, would so differ in speed that when the heavier had reached the ground, the other would not have fallen more than 10 cubits.' },
        { who: 'SIMP', text: 'His language would seem to indicate that he had tried the experiment, because he says: We see the heavier; now the word see shows that he had made the experiment.' },
        { who: 'SAGR', text: 'But I, Simplicio, who have made the test can assure you that a cannon ball weighing one or two hundred pounds, or even more, will not reach the ground by as much as a span ahead of a musket ball weighing only half a pound, provided both are dropped from a height of 200 cubits.' },
        { who: 'SALV', text: 'If then we take two bodies whose natural speeds are different, it is clear that on uniting the two, the more rapid one will be partly retarded by the slower, and the slower will be somewhat hastened by the swifter. Do you not agree with me in this opinion?' },
        {
          gradeId: 'tie-together', ask: 'Tie a fast stone to a slow one. What does the pair do?',
          choices: [
            { id: 'between', label: 'The slow one drags the fast one. The pair lands in between.' },
            { id: 'fast', label: 'The pair falls as fast as the fast stone.' },
            { id: 'slow', label: 'The pair falls as slowly as the slow stone.' },
          ],
          answer: 'between',
          then: [{ who: 'SIMP', text: 'You are unquestionably right.' }],
        },
        { who: 'SALV', text: 'But if this is true, and if a large stone moves with a speed of, say, eight while a smaller moves with a speed of four, then when they are united, the system will move with a speed less than eight; but the two stones when tied together make a stone larger than that which before moved with a speed of eight.' },
        {
          gradeId: 'tie-contradiction', ask: 'So what follows?',
          choices: [
            { id: 'contradiction', label: 'The heavier pair must fall slower than the lighter stone. That contradicts the starting idea.' },
            { id: 'eight', label: 'The pair falls at exactly eight.' },
            { id: 'faster', label: 'The extra weight makes the pair faster than eight, so Aristotle wins.' },
          ],
          answer: 'contradiction',
          then: [{ who: 'SALV', text: 'Hence the heavier body moves with less speed than the lighter; an effect which is contrary to your supposition. Thus you see how, from your assumption that the heavier body moves more rapidly than the lighter one, I infer that the heavier body moves more slowly.' }],
        },
        {
          gradeId: 'which-assumption', transfer: true, ask: 'The argument has you trapped. Which idea has to go?',
          choices: [
            { id: 'tying', label: 'That two stones can be tied together' },
            { id: 'heavier', label: 'That heavier things fall faster' },
            { id: 'speed', label: 'That a falling body has a speed at all' },
          ],
          answer: 'heavier',
          then: [{ who: 'SIMP', text: 'I am all at sea because it appears to me that the smaller stone when added to the larger increases its weight and by adding weight I do not see how it can fail to increase its speed or, at least, not to diminish it.' }],
        },
      ],
    },
    {
      kind: 'number', gradeId: 'well-depth', transfer: true, generator: 'fallDistance',
      params: {
        scenarios: [
          { place: 'earth', g: 9.81, prompt: 'You drop a stone into a dry well and hear it hit the bottom {t} seconds later.', ask: 'How deep is the well?' },
          { place: 'moon', g: 1.62, prompt: 'An astronaut drops a rock into a pit on the Moon. It lands {t} seconds later.', ask: 'How deep is the pit?' },
        ],
        seconds: [2, 1.5, 2.5, 3],
        unit: 'm', tolerance: 0.06,
        hint: 'Use the rule from the flashes: distance = ½ × g × t × t. On Earth ½g is about 4.9; on the Moon about 0.81.',
        aside: 'Ignore the time the sound takes to travel back up.',
      },
    },
    {
      kind: 'payoff',
      idea: 'Without air, everything falls at the same rate, and the distance grows with the square of the time.',
      connections: [
        { title: 'Orbits: the Moon is falling too', place: 'Physics › Gravitation' },
        { title: 'Air resistance and terminal speed', place: 'Physics › Fluids' },
        { title: 'Why some notes agree', place: 'Arts › Music', to: 'music' },
      ],
    },
  ],
  provenance: [
    { claim: 'Apollo 15 hammer-and-feather demonstration, 2 August 1971', source: 'NASA footage, Wikimedia Commons' },
    { claim: 'The Pisa drop is probably a thought experiment; Stevin and de Groot’s 1586 Delft drop', source: 'Wikipedia: Galileo’s Leaning Tower of Pisa experiment' },
    { claim: 'Dialogue text', source: 'Crew & de Salvio translation (1914), Internet Archive, pp. 62–63' },
    { claim: 'Free-fall distance d = ½ g t²; g = 9.81 m/s² (Earth), 1.62 m/s² (Moon)', source: 'Standard values' },
  ],
};
