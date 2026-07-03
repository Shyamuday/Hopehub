export type RubricPathInput = {
  chapter: string;
  subchapter?: string | null;
  text: string;
  parentPath?: string | null;
};

function leafSegment(text: string) {
  const segments = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return segments[segments.length - 1] || text;
}

export function formatRubricPath(rubric: RubricPathInput): string {
  const leaf = leafSegment(rubric.text);

  if (rubric.parentPath) {
    const pathParts = rubric.parentPath
      .split(' > ')
      .map((part) => part.trim())
      .filter(Boolean);
    const lastPath = pathParts[pathParts.length - 1];

    if (lastPath && lastPath.toLowerCase() === leaf.toLowerCase()) {
      return pathParts.join(' › ');
    }

    if (rubric.text && !rubric.parentPath.toLowerCase().includes(leaf.toLowerCase())) {
      return `${pathParts.join(' › ')} › ${leaf}`;
    }

    return pathParts.join(' › ');
  }

  if (rubric.subchapter) {
    return `${rubric.chapter} › ${rubric.subchapter} › ${leaf}`;
  }

  if (rubric.chapter && rubric.chapter.toLowerCase() !== leaf.toLowerCase()) {
    return `${rubric.chapter} › ${leaf}`;
  }

  return rubric.text;
}

export function rubricPathSegments(rubric: RubricPathInput): string[] {
  return formatRubricPath(rubric)
    .split(' › ')
    .map((part) => part.trim())
    .filter(Boolean);
}
