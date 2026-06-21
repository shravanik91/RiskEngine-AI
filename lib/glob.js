function escapeRegExp(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

export function globToRegExp(pattern) {
  const normalized = pattern.replaceAll("\\", "/");
  let source = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += escapeRegExp(char);
    }
  }

  return new RegExp(`^${source}$`, "i");
}

export function matchesGlob(path, pattern) {
  const normalizedPath = path.replaceAll("\\", "/");
  return globToRegExp(pattern).test(normalizedPath);
}
