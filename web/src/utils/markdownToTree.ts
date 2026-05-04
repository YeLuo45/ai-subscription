/**
 * markdownToTree - Parse markdown tree structure into JS object
 * 
 * Input: markdown string with # heading (root), ## headings (level 1), ### headings (level 2)
 * Output: { root: string, children: [{ label: string, children: [] }] }
 * 
 * Example:
 *   # 主题
 *   ## 关键词1
 *   ### 要点1
 *   ### 要点2
 *   ## 关键词2
 *   ### 要点3
 */

export interface TreeNode {
  label: string;
  children: TreeNode[];
}

export interface TreeRoot {
  root: string;
  children: TreeNode[];
}

export function markdownToTree(markdown: string): TreeRoot | null {
  const lines = markdown.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return null;
  
  // First line should be the root (# heading)
  const rootMatch = lines[0].match(/^#\s+(.+)$/);
  if (!rootMatch) return null;
  
  const root: TreeRoot = {
    root: rootMatch[1].trim(),
    children: []
  };
  
  // Track current level 1 and level 2 nodes
  let currentLevel1: TreeNode | null = null;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Level 1 (##)
    const level1Match = line.match(/^##\s+(.+)$/);
    if (level1Match) {
      currentLevel1 = { label: level1Match[1].trim(), children: [] };
      root.children.push(currentLevel1);
      continue;
    }
    
    // Level 2 (###)
    const level2Match = line.match(/^###\s+(.+)$/);
    if (level2Match) {
      const level2Node: TreeNode = { label: level2Match[1].trim(), children: [] };
      if (currentLevel1) {
        currentLevel1.children.push(level2Node);
      } else {
        // If no level 1 exists, add directly to root
        root.children.push(level2Node);
      }
      continue;
    }
    
    // Handle list items under level 2 (- item)
    const listMatch = line.match(/^-\s+(.+)$/);
    if (listMatch && currentLevel1) {
      const listNode: TreeNode = { label: listMatch[1].trim(), children: [] };
      if (currentLevel1.children.length > 0) {
        // Add as child of last level 2 node
        currentLevel1.children[currentLevel1.children.length - 1].children.push(listNode);
      } else {
        currentLevel1.children.push(listNode);
      }
    }
  }
  
  return root;
}
