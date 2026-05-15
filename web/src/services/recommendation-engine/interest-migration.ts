// Interest migration - expand user interests to related topics
import type { InterestVector } from './types';

// Topic hierarchy/relationships
const TOPIC_RELATIONS: Record<string, string[]> = {
  'AI': ['machine-learning', 'deep-learning', 'nlp', 'computer-vision', 'robotics'],
  'machine-learning': ['deep-learning', 'nlp', 'computer-vision', 'data-science', 'AI'],
  'deep-learning': ['machine-learning', 'nlp', 'computer-vision', 'transformers', 'neural-networks'],
  'web-dev': ['javascript', 'react', 'nodejs', 'css', 'frontend'],
  'javascript': ['typescript', 'react', 'nodejs', 'web-dev'],
  'startup': ['entrepreneurship', 'venture-capital', 'product', 'growth'],
  'crypto': ['blockchain', 'defi', 'web3', 'bitcoin', 'ethereum'],
  'health': ['fitness', 'nutrition', 'mental-health', 'wellness'],
};

export function expandInterests(profile: InterestVector): string[] {
  const expanded: string[] = [];
  const visited = new Set<string>();

  // Start with user's top interests
  const topInterests = getTopInterests(profile, 3);
  
  for (const interest of topInterests) {
    expandTopic(interest, visited, expanded, 2);
  }

  return expanded;
}

function getTopInterests(profile: InterestVector, n: number): string[] {
  const all = [
    ...Object.entries(profile.categories).map(([k, v]) => ({ name: k, weight: v })),
    ...Object.entries(profile.topics).map(([k, v]) => ({ name: k, weight: v })),
  ];
  
  return all
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n)
    .map(x => x.name);
}

function expandTopic(topic: string, visited: Set<string>, expanded: string[], depth: number): void {
  if (depth <= 0 || visited.has(topic)) return;
  
  visited.add(topic);
  expanded.push(topic);

  const related = TOPIC_RELATIONS[topic] || [];
  for (const rel of related.slice(0, 2)) { // Only take top 2 related topics per level
    expandTopic(rel, visited, expanded, depth - 1);
  }
}

export function getInterestSuggestions(profile: InterestVector): Array<{ topic: string; reason: string }> {
  const expanded = expandInterests(profile);
  const existingTopics = new Set([
    ...Object.keys(profile.categories),
    ...Object.keys(profile.topics),
  ]);

  const suggestions: Array<{ topic: string; reason: string }> = [];
  const topInterests = getTopInterests(profile, 2);

  for (const topic of expanded) {
    if (existingTopics.has(topic)) continue;
    if (suggestions.length >= 5) break;

    // Find the parent interest that led to this suggestion
    let reason = 'Related to your interests';
    for (const [parent, children] of Object.entries(TOPIC_RELATIONS)) {
      if (children.includes(topic) && topInterests.includes(parent)) {
        reason = `Because you like ${parent}`;
        break;
      }
    }

    suggestions.push({ topic, reason });
  }

  return suggestions;
}
