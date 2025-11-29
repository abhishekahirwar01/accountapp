export function sanitizeInput(value) {
  if (typeof value !== 'string') return value;
  if (!value) return value;

  const allowedTags = ['b', 'i', 'strong', 'em', 'u', 'br', 'p', 'ul', 'li'];

  return value.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?>/g,
    (match, tagName) => {
      const lowerTagName = tagName.toLowerCase();

      if (allowedTags.includes(lowerTagName)) {
        // Closing tag
        if (match.startsWith('</')) {
          return `</${lowerTagName}>`;
        }

        // Self-closing BR
        if (lowerTagName === 'br') {
          return `<br>`;
        }

        // Opening tag without attributes
        return `<${lowerTagName}>`;
      }

      // Disallowed tags are removed entirely
      return '';
    },
  );
}
