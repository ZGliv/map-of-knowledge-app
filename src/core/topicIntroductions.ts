import { catalog, type AtlasNode } from './catalog';

export type IntroSection = 'overview' | 'ideas' | 'example';
export interface TopicIntroduction {
  readonly preview: true;
  readonly overview: string;
  readonly ideas: readonly { title: string; description: string }[];
  readonly example: { title: string; prompt: string; reflection: string };
}

function introduction(overview: string, ideas: readonly [string, string][], prompt: string, reflection: string): TopicIntroduction {
  return { preview: true, overview, ideas: ideas.map(([title, description]) => ({ title, description })), example: { title: 'A small thought experiment', prompt, reflection } };
}

/** Illustrative editorial copy for the browsing interface, not published lessons. */
export const TOPIC_INTRODUCTIONS: Readonly<Record<string, TopicIntroduction>> = {
  'knowledge': introduction(
    'Begin with a question, follow a connection, or wander into an unfamiliar subject. The map gives each idea a place to return to.',
    [['Perspective', 'A wide view shows how subjects sit beside one another.'], ['Depth', 'Entering a region reveals more focused ideas within it.'], ['Connections', 'One question can lead through several different subjects.']],
    'Choose something ordinary—a song, a bicycle, a cup of water. How many subjects could help you understand it?',
    'A bicycle brings together forces, materials, design, and human choices. A useful map offers several ways into the same object.'),
  'knowledge.science': introduction(
    'Science builds explanations of the world by connecting questions, observations, and tests. Its models help us predict what might happen next.',
    [['Observation', 'Notice a pattern carefully enough to describe it.'], ['Explanation', 'Propose a model that could account for the pattern.'], ['Testing', 'Look for evidence that distinguishes competing explanations.']],
    'Two identical ice cubes melt at different speeds. What would you change or measure to investigate why?',
    'List the conditions first: surface, temperature, airflow, and starting size. Changing one condition makes the comparison easier to interpret.'),
  'knowledge.technology': introduction(
    'Technology turns knowledge into working tools and systems. Explore how a purpose becomes a design, and how parts cooperate to make it work.',
    [['Purpose', 'Start with the job a tool is meant to do.'], ['Systems', 'Understand the inputs, parts, and outputs together.'], ['Tradeoffs', 'Improving one property can put pressure on another.']],
    'Design a traffic light for a one-lane bridge. What information does it need before allowing a car to enter?',
    'It needs a rule for direction and a way to know the bridge is clear. The useful question is how the whole system prevents conflicting actions.'),
  'knowledge.humanities': introduction(
    'The humanities explore human expression, experience, and interpretation. They ask how people have made meaning—and how we understand their traces.',
    [['Context', 'Place a text, object, or idea in its surroundings.'], ['Interpretation', 'Explain what the evidence could mean.'], ['Perspective', 'Notice whose experience is present and whose is missing.']],
    'Imagine two people describe the same event differently. What would help you understand the disagreement?',
    'Consider what each person could observe, their purpose in telling the story, and the evidence supporting each account.'),
  'knowledge.society': introduction(
    'Society takes shape through relationships, shared rules, and collective choices. This territory explores how individual lives and larger institutions affect one another.',
    [['Relationships', 'People influence one another through networks and groups.'], ['Norms', 'Shared expectations guide behavior, sometimes without written rules.'], ['Institutions', 'Organized systems shape what people can do together.']],
    'A queue has no signs or barriers, yet people usually know where to stand. What keeps it working?',
    'Shared expectations, visible examples, and responses to cutting in all matter. The same space can behave differently when those expectations change.'),
  'knowledge.mathematics': introduction(
    'Mathematics studies quantity, structure, space, and change. It gives us precise ways to describe relationships and follow their consequences.',
    [['Abstraction', 'Find a relationship that survives a change of objects.'], ['Representation', 'Use symbols, diagrams, or models to make an idea visible.'], ['Reasoning', 'Explain why a conclusion follows, not just what it is.']],
    'One person measures a span as three units; another measures it as six. Can both be right?',
    'Yes, if the second unit is half as long. A numerical measurement becomes meaningful when its unit is stated.'),
  'knowledge.arts': introduction(
    'The arts explore how form, material, and expression shape experience. Making and interpreting are both ways to notice what a work can do.',
    [['Form', 'Arrangement gives a work its structure.'], ['Material', 'Sound, movement, words, and images offer different possibilities.'], ['Expression', 'Choices of form and material can change what we feel or notice.']],
    'Read the same sentence once quickly and once with long pauses. What changes even though the words stay the same?',
    'Timing can shift emphasis, expectation, and mood. The material remains familiar while its arrangement changes the experience.'),
  'knowledge.earth': introduction(
    'Earth is a set of connected systems: rock, water, air, and living things. Follow how matter and energy move across their boundaries.',
    [['Cycles', 'Materials move through places and change form.'], ['Interactions', 'A change in one system can affect another.'], ['Scale', 'Local observations connect to larger patterns over time.']],
    'Rain falls on a hillside. Where could that water go next?',
    'It might flow downhill, soak into the ground, enter a living thing, or evaporate. Following those routes connects several Earth systems.'),
  'knowledge.economics': introduction(
    'Economics explores choices under constraints and the ways people coordinate them. It asks how resources, incentives, and institutions shape outcomes.',
    [['Scarcity', 'Time and resources limit the choices available.'], ['Opportunity cost', 'Choosing one use means giving up another.'], ['Coordination', 'Rules and exchange help many separate decisions fit together.']],
    'You have two free hours and three things you want to do. What is the cost of choosing one?',
    'Some costs are not prices. The next-best use of those same hours is part of what the choice gives up.'),
  'knowledge.arts.music': introduction(
    'Music gives shape to sound and silence. Patterns in time, pitch, and tone create expectations that a piece can fulfill, delay, or surprise.',
    [['Rhythm', 'The placement and duration of sounds create patterns in time.'], ['Pitch', 'Relationships between notes help form melody and harmony.'], ['Timbre', 'The character of a sound distinguishes one voice or instrument from another.']],
    'Tap four evenly spaced beats. Now leave the third beat silent while keeping the pulse. What do you still expect to hear?',
    'The missing beat can remain part of your expectation. Silence has a place inside the pattern rather than simply ending it.'),
  'knowledge.arts.design': introduction(
    'Design connects an intention with someone’s experience of a thing. It brings purpose, form, and constraints into choices that can be tried and improved.',
    [['Purpose', 'Be clear about the person and the task.'], ['Affordance', 'A form can suggest how something is used.'], ['Feedback', 'A response helps someone understand what their action did.']],
    'A door must be pushed, but everyone tries to pull it. What could you change before adding a sign?',
    'Try a shape that invites a push, such as a plate. The design can communicate the action through the object itself.'),
};

/** Every finite catalog layer gets context without inventing a lesson or an assessment. */
export function getTopicIntroduction(node: AtlasNode): TopicIntroduction {
  const curated = TOPIC_INTRODUCTIONS[node.id];
  if (curated) return curated;
  const parent = catalog.getParent(node);
  const children = catalog.getChildren(node);
  const siblings = parent ? catalog.getChildren(parent).filter(sibling => sibling.id !== node.id).slice(0, 3) : [];
  const parentName = parent?.name ?? 'the map';
  // Three names at most; with more, say how many more so the list never reads as the whole topic.
  // A comma before the count: a name with its own "and" ("Knowledge and concepts") would otherwise
  // run into it ("Knowledge and concepts and 3 more").
  const named = children.slice(0, 3).map(child => child.name);
  const inside = children.length > named.length ? `${named.join(', ')}, and ${children.length - named.length} more` : named.join(', ');
  const nearby = siblings.map(sibling => sibling.name).join(', ');
  return introduction(
    node.description ?? `${node.name} is a closer view within ${parentName}.${inside ? ` From here, explore ${inside}.` : ' Start with a concrete example, then connect it back to the wider topic.'}`,
    [
      ['The wider view', `Return to ${parentName} to see the context around ${node.name}.`],
      children.length ? ['Within this topic', `Follow ${inside} to explore more specific ideas.`] : ['One useful example', `Choose a situation or object that could make ${node.name} easier to explain.`],
      nearby ? ['Nearby on the map', `${nearby} offer other directions within ${parentName}.`] : ['A connection to follow', `Ask which other idea would help you make sense of ${node.name}.`],
    ],
    `Choose a concrete example of ${node.name}. What would you point to or change to explain it to someone else?`,
    `Start by naming the example and what it shows. Then ask how that observation connects to ${parentName}. This is an invitation to explore, not a scored exercise.`,
  );
}
