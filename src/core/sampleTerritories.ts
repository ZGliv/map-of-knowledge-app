/** Illustrative routes for the spatial prototype; these are not authored curricula. Every row holds real topics,
 * first the one the route follows; a route ends at its last row with more than one, where its discovery sits. */
export const SAMPLE_TERRITORIES = [
 {subject:'science',parent:'physics',levels:[
 ['Mechanics','Thermodynamics','Electromagnetism','Optics','Relativity','Quantum physics'],
 ['Motion','Forces','Energy','Momentum','Equilibrium','Oscillation'],
 ['Velocity','Position','Acceleration','Trajectories','Reference frames','Time'],
 ['Constant velocity','Relative velocity','Average velocity','Instantaneous velocity','Velocity vectors'],
 ]},
 {subject:'technology',parent:'computing',levels:[
 ['Programming','Computer hardware','Operating systems','Databases','Computer networks','Human-computer interaction'],
 ['Algorithms','Data structures','Programming languages','Software design','Testing','Debugging'],
 ['Sorting','Searching','Graph algorithms','Recursion','Optimization','Computational complexity'],
 ['Comparison sorting','Counting sort','Radix sort','Sorting networks','External sorting','Stable ordering'],
 ['Merge sort','Quicksort','Heapsort','Insertion sort','Selection sort','Bubble sort'],
 ]},
 {subject:'humanities',parent:'languages',levels:[
 ['Linguistics','Language families','Translation','Writing systems','Language learning','Historical change'],
 ['Phonetics','Phonology','Morphology','Syntax','Semantics','Pragmatics'],
 ['Speech sounds','Articulation','Acoustics','Transcription','Perception','Prosody'],
 ['Consonants','Vowels','Syllables','Stress','Tone','Intonation'],
 ['Place of articulation','Manner of articulation','Voicing','Airflow','Coarticulation','Sound contrasts'],
 ]},
 {subject:'society',parent:'psychology',levels:[
 ['Cognition','Development','Social psychology','Personality','Biological psychology','Research methods'],
 ['Memory','Attention','Perception','Language','Reasoning','Decision making'],
 ['Remembering experiences','Working memory','Knowledge and concepts','Skill memory','Retrieval','Forgetting'],
 ['Encoding','Context','Retrieval cues','Reconstruction','Sequence','Source memory'],
 ['Connecting a new experience','Distinctiveness','Rehearsal'],
 ]},
 {subject:'mathematics',parent:'geometry',levels:[
 ['Plane geometry','Solid geometry','Coordinate geometry','Transformations','Geometric proof','Non-Euclidean geometry'],
 ['Triangles','Circles','Polygons','Lines','Angles','Constructions'],
 ['Right triangles','Triangle congruence','Triangle similarity','Triangle centers','Triangle area','Triangle inequalities'],
 ['The Pythagorean theorem','Trigonometric ratios','Special right triangles','The altitude','Inscribed right triangles','Distance'],
 ['A geometric proof','Pythagorean triples'],
 ]},
 {subject:'arts',parent:'music',levels:[
 ['Rhythm','Melody','Harmony','Timbre','Form','Performance'],
 ['Pulse and meter','Note durations','Syncopation','Polyrhythm','Tempo','Phrasing'],
 ['Simple meter','Compound meter','Irregular meter','Changing meter','Accent','Subdivision'],
 ['Four beats','Bar lines'],
 ]},
 {subject:'earth',parent:'ecology',levels:[
 ['Ecosystems','Populations','Communities','Biodiversity','Conservation','Biogeography'],
 ['Energy flow','Nutrient cycles','Habitats','Disturbance','Productivity','Ecosystem services'],
 ['Food webs','Primary production','Consumption','Decomposition','Trophic levels','Energy budgets'],
 ['Tracing a food web','Producers','Herbivores','Predators','Detritivores','Omnivores'],
 ]},
 {subject:'economics',parent:'decision-theory',levels:[
 ['Choices under constraints','Choices under uncertainty','Preferences','Game theory','Social choice','Behavioral economics'],
 ['Opportunity cost','Trade-offs','Marginal choices','Feasible sets','Resource allocation','Intertemporal choice'],
 ['The next-best alternative','Explicit costs','Implicit costs','Sunk costs','Comparative advantage'],
 ]},
] as const;
export const slug=(text:string)=>text.toLowerCase().replaceAll(/[^a-z0-9]+/g,'-').replaceAll(/^-|-$/g,'');
export const samplePath=(subject:string):string[]=>{
 const sample=SAMPLE_TERRITORIES.find(s=>s.subject===subject)||SAMPLE_TERRITORIES[1];
 const path=['knowledge',`knowledge.${sample.subject}`,`knowledge.${sample.subject}.${sample.parent}`];
 for(const names of sample.levels)path.push(path[path.length-1]+'.'+slug(names[0]));
 return path;
};
export const sampleLeaf=(subject:string)=>samplePath(subject).at(-1)!;
