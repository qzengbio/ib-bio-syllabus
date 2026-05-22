const syllabus = globalThis.BIOLOGY_2025_SYLLABUS;
const themes = Object.values(syllabus.themes);
const levels = Object.values(syllabus.levels);
const topics = syllabus.topics;
const understandings = syllabus.understandings;

const state = {
  expanded: new Set(["theme:A", "level:A:1", "topic:A1.1"]),
  scopes: new Set(["all"]),
  search: "",
  fontSize: 17
};

const els = {
  fontSizeInput: document.querySelector("#fontSizeInput"),
  fontSizeValue: document.querySelector("#fontSizeValue"),
  searchInput: document.querySelector("#searchInput"),
  outlineTree: document.querySelector("#outlineTree"),
  expandAll: document.querySelector("#expandAll"),
  collapseAll: document.querySelector("#collapseAll"),
  readerEyebrow: document.querySelector("#readerEyebrow"),
  readerTitle: document.querySelector("#readerTitle"),
  readerCount: document.querySelector("#readerCount"),
  readerContent: document.querySelector("#readerContent")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const italicScientificTerms = [
  "Aptenodytes forsteri",
  "Bacillus",
  "Cerastium arcticum",
  "Dendroctonus micans",
  "Dinornis novaezealandiae",
  "Euglena",
  "Gavia arctica",
  "Homo floresiensis",
  "Homo sapiens",
  "Ips typographus",
  "Mirabilis jalapa",
  "Neomonachus tropicalis",
  "Paranthropus robustus",
  "Parus major",
  "Persicaria",
  "Pusa hispida",
  "Rangifer tarandus",
  "Staphylococcus",
  "Strix aluco",
  "Vibrio fischeri"
].sort((a, b) => b.length - a.length);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSearchTerm(value) {
  const query = state.search.trim();
  if (!query) return value;
  const pattern = new RegExp(escapeRegExp(escapeHtml(query)), "gi");
  return value.replace(pattern, (match) => `<mark>${match}</mark>`);
}

function formatOfficialText(value) {
  const markTokens = [];
  let formatted = highlightSearchTerm(escapeHtml(value));
  formatted = formatted.replace(/<mark>[\s\S]*?<\/mark>/g, (match) => {
    const token = `@@MARK_${markTokens.length}@@`;
    markTokens.push(match);
    return token;
  });
  italicScientificTerms.forEach((term) => {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "g");
    formatted = formatted.replace(pattern, `<i>${term}</i>`);
  });
  markTokens.forEach((mark, index) => {
    formatted = formatted.replace(`@@MARK_${index}@@`, mark);
  });
  return formatted;
}

function getHours(topic) {
  const slHl = topic.official.teachingHours.slHl ?? 0;
  const ahl = topic.official.teachingHours.additionalHl ?? 0;
  return { slHl, ahl, total: slHl + ahl };
}

function getTeachingLevel(topic) {
  if (topic.isHLOnly) return "HL only";
  if ((topic.official.teachingHours.additionalHl ?? 0) > 0) return "SL + AHL";
  return "SL/HL core";
}

function getUnderstanding(code) {
  return syllabus.understandingByCode[code];
}

function getTopicForUnderstanding(understanding) {
  return syllabus.topicByCode[understanding.topicCode];
}

function levelId(themeCode, levelCode) {
  return `level:${themeCode}:${levelCode}`;
}

function topicId(topicCode) {
  return `topic:${topicCode}`;
}

function understandingId(code) {
  return `understanding:${code}`;
}

function getLevelTopics(themeCode, levelCode) {
  return topics.filter((topic) => topic.theme === themeCode && topic.organizationLevel === levelCode);
}

function getUnderstandingSearchText(understanding) {
  const topic = getTopicForUnderstanding(understanding);
  return [
    understanding.code,
    understanding.displayTitle,
    understanding.teachingLevel,
    understanding.official.statement,
    understanding.official.guidance,
    understanding.official.applicationOfSkills,
    understanding.official.natureOfScience,
    understanding.official.note,
    understanding.learningFocus?.join(" "),
    understanding.searchTerms?.join(" "),
    understanding.skillCodes?.join(" "),
    understanding.notes,
    topic?.code,
    topic?.title,
    topic?.themeName,
    topic?.organizationLevelName
  ].join(" ").toLowerCase();
}

const displayTagStopwords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "due",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "include",
  "includes",
  "into",
  "is",
  "it",
  "its",
  "may",
  "of",
  "on",
  "or",
  "role",
  "roles",
  "that",
  "the",
  "their",
  "these",
  "this",
  "to",
  "used",
  "using",
  "when",
  "which",
  "with",
  "within",
  "without",
  "example",
  "examples",
  "process",
  "processes",
  "specific",
  "common",
  "different",
  "various"
]);

function normalizeTag(term) {
  return String(term ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function isUsefulDisplayTag(term) {
  const normalized = normalizeTag(term);
  const key = normalized.toLowerCase();
  return normalized.length >= 4 && !displayTagStopwords.has(key) && !/^\d+$/.test(key);
}

function getDisplayTags(understanding) {
  const seen = new Set();
  return (understanding.searchTerms ?? [])
    .map(normalizeTag)
    .filter(isUsefulDisplayTag)
    .filter((term) => {
      const key = term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function matchesSearch(understanding) {
  const query = state.search.trim().toLowerCase();
  return query === "" || getUnderstandingSearchText(understanding).includes(query);
}

function scopeContainsUnderstanding(scope, understanding) {
  const topic = getTopicForUnderstanding(understanding);
  if (!topic) return false;
  if (scope === "all") return true;
  if (scope === `theme:${topic.theme}`) return true;
  if (scope === levelId(topic.theme, topic.organizationLevel)) return true;
  if (scope === topicId(topic.code)) return true;
  if (scope === understandingId(understanding.code)) return true;
  if (scope === `teaching:${understanding.teachingLevel}`) return true;
  return false;
}

function isTeachingScope(scope) {
  return scope.startsWith("teaching:");
}

function getActiveScopeGroups() {
  const scopes = [...state.scopes].filter((scope) => scope !== "all");
  return {
    content: scopes.filter((scope) => !isTeachingScope(scope)),
    teaching: scopes.filter(isTeachingScope)
  };
}

function matchesScopeGroup(scopes, understanding) {
  return scopes.length === 0 || scopes.some((scope) => scopeContainsUnderstanding(scope, understanding));
}

function getScopedUnderstandings() {
  if (state.search.trim()) {
    return understandings.filter(matchesSearch);
  }

  if (state.scopes.has("all") || state.scopes.size === 0) {
    return understandings;
  }

  const { content, teaching } = getActiveScopeGroups();
  return understandings.filter(
    (understanding) => matchesScopeGroup(content, understanding) && matchesScopeGroup(teaching, understanding)
  );
}

function getScopeLabel(scope) {
  if (scope === "all") return "All syllabus";
  if (scope === "teaching:SL/HL") return "SL";
  if (scope === "teaching:AHL") return "HL";
  if (scope.startsWith("theme:")) {
    const theme = syllabus.themes[scope.split(":")[1]];
    return `${theme.code} ${theme.name}`;
  }
  if (scope.startsWith("level:")) {
    const [, themeCode, levelCode] = scope.split(":");
    return `${themeCode}${levelCode} ${syllabus.levels[levelCode].name}`;
  }
  if (scope.startsWith("topic:")) {
    const topic = syllabus.topicByCode[scope.slice("topic:".length)];
    return `${topic.code} ${topic.title}`;
  }
  if (scope.startsWith("understanding:")) return scope.slice("understanding:".length);
  return scope;
}

function isScopeChecked(scope) {
  if (scope !== "all" && state.scopes.has("all")) return false;
  return state.scopes.has(scope);
}

function setSingleScope(scope) {
  state.search = "";
  els.searchInput.value = "";
  state.scopes = new Set([scope]);
  expandScope(scope);
  renderAll();
}

function toggleScope(scope) {
  state.search = "";
  els.searchInput.value = "";

  if (scope === "all") {
    state.scopes = new Set(["all"]);
    renderAll();
    return;
  }

  state.scopes.delete("all");
  if (state.scopes.has(scope)) {
    state.scopes.delete(scope);
  } else {
    state.scopes.add(scope);
    expandScope(scope);
  }

  if (state.scopes.size === 0) state.scopes.add("all");
  renderAll();
}

function setSearch(query) {
  state.search = query;
  els.searchInput.value = query;
  renderAll();
}

function expandScope(scope) {
  if (scope.startsWith("theme:")) {
    state.expanded.add(scope);
  }
  if (scope.startsWith("level:")) {
    const [, themeCode] = scope.split(":");
    state.expanded.add(`theme:${themeCode}`);
    state.expanded.add(scope);
  }
  if (scope.startsWith("topic:")) {
    const topic = syllabus.topicByCode[scope.slice("topic:".length)];
    state.expanded.add(`theme:${topic.theme}`);
    state.expanded.add(levelId(topic.theme, topic.organizationLevel));
    state.expanded.add(scope);
  }
  if (scope.startsWith("understanding:")) {
    const understanding = getUnderstanding(scope.slice("understanding:".length));
    const topic = getTopicForUnderstanding(understanding);
    state.expanded.add(`theme:${topic.theme}`);
    state.expanded.add(levelId(topic.theme, topic.organizationLevel));
    state.expanded.add(topicId(topic.code));
  }
}

function autoExpandSearchResults() {
  if (!state.search.trim()) return;
  understandings.filter(matchesSearch).forEach((understanding) => {
    const topic = getTopicForUnderstanding(understanding);
    state.expanded.add(`theme:${topic.theme}`);
    state.expanded.add(levelId(topic.theme, topic.organizationLevel));
    state.expanded.add(topicId(topic.code));
  });
}

function nodeButton(id, hasChildren = true) {
  const expanded = state.expanded.has(id);
  const disabled = hasChildren ? "" : " disabled";
  return `<button class="twisty${expanded ? " open" : ""}" data-toggle="${escapeHtml(id)}" type="button"${disabled} aria-label="Toggle"></button>`;
}

function checkbox(scope) {
  return `
    <button class="scope-check${isScopeChecked(scope) ? " checked" : ""}" data-scope="${escapeHtml(scope)}" type="button" aria-label="Toggle scope"></button>
  `;
}

function outlineRow({ id, scope, depth, label, meta, theme, hasChildren = true }) {
  return `
    <div class="outline-row depth-${depth} theme-${escapeHtml(theme ?? "")}" data-label-scope="${escapeHtml(scope)}">
      ${nodeButton(id, hasChildren)}
      ${checkbox(scope)}
      <button class="outline-label" data-focus-scope="${escapeHtml(scope)}" type="button">
        <strong>${escapeHtml(label)}</strong>
        ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
      </button>
    </div>
  `;
}

function renderTopic(topic) {
  const id = topicId(topic.code);
  const open = state.expanded.has(id);
  const understandingItems = topic.understandingCodes
    .map(getUnderstanding)
    .filter(Boolean)
    .filter((understanding) => !state.search.trim() || matchesSearch(understanding));

  if (state.search.trim() && understandingItems.length === 0 && !matchesTopicSearch(topic)) return "";

  const { slHl, ahl } = getHours(topic);
  const hours = ahl ? `${slHl}+${ahl} hr` : `${slHl} hr`;

  return `
    ${outlineRow({
      id,
      scope: id,
      depth: 2,
      theme: topic.theme,
      label: `${topic.code} ${topic.title}`,
      meta: `${getTeachingLevel(topic)} · ${hours} · ${topic.understandingCodes.length} U`
    })}
    ${open ? understandingItems.map((understanding) => renderUnderstandingRow(understanding, topic)).join("") : ""}
  `;
}

function matchesTopicSearch(topic) {
  const query = state.search.trim().toLowerCase();
  if (!query) return true;
  return [
    topic.code,
    topic.title,
    topic.themeName,
    topic.organizationLevelName,
    topic.official.guidingQuestions.join(" "),
    topic.official.linkingQuestions.join(" ")
  ].join(" ").toLowerCase().includes(query);
}

function renderUnderstandingRow(understanding, topic) {
  return outlineRow({
    id: understandingId(understanding.code),
    scope: understandingId(understanding.code),
    depth: 3,
    theme: topic.theme,
    label: `${understanding.code} ${understanding.displayTitle ?? understanding.official.statement}`,
    meta: understanding.teachingLevel,
    hasChildren: false
  });
}

function renderOutline() {
  autoExpandSearchResults();

  els.outlineTree.innerHTML = `
    ${outlineRow({
      id: "all",
      scope: "all",
      depth: 0,
      label: "All syllabus",
      meta: `${understandings.length} understandings`,
      hasChildren: false
    })}
    ${themes.map((theme) => {
      const themeScope = `theme:${theme.code}`;
      const themeOpen = state.expanded.has(themeScope);
      const themeUnderstandingCount = understandings.filter((understanding) => {
        const topic = getTopicForUnderstanding(understanding);
        return topic?.theme === theme.code;
      }).length;
      const levelHtml = levels.map((level) => renderLevel(theme, level)).join("");

      if (state.search.trim() && !levelHtml.trim()) return "";

      return `
        ${outlineRow({
          id: themeScope,
          scope: themeScope,
          depth: 0,
          theme: theme.code,
          label: `${theme.code} ${theme.name}`,
          meta: `${themeUnderstandingCount} U`
        })}
        ${themeOpen ? levelHtml : ""}
      `;
    }).join("")}
  `;
}

function renderLevel(theme, level) {
  const id = levelId(theme.code, level.code);
  const open = state.expanded.has(id);
  const levelTopics = getLevelTopics(theme.code, level.code);
  const topicHtml = levelTopics.map(renderTopic).join("");
  if (state.search.trim() && !topicHtml.trim()) return "";

  return `
    ${outlineRow({
      id,
      scope: id,
      depth: 1,
      theme: theme.code,
      label: `${theme.code}${level.code} ${level.name}`,
      meta: `${levelTopics.length} topics`
    })}
    ${open ? topicHtml : ""}
  `;
}

function groupUnderstandings(items) {
  const groups = [];
  const byTopic = new Map();

  items.forEach((understanding) => {
    const topic = getTopicForUnderstanding(understanding);
    if (!topic) return;
    if (!byTopic.has(topic.code)) {
      byTopic.set(topic.code, { topic, understandings: [] });
      groups.push(byTopic.get(topic.code));
    }
    byTopic.get(topic.code).understandings.push(understanding);
  });

  return groups;
}

function textBlock(title, text) {
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return "";
  return `
    <div class="supplement-block">
      <h4>${escapeHtml(title)}</h4>
      <p>${formatOfficialText(cleaned)}</p>
    </div>
  `;
}

function questionBlock(title, questions) {
  if (!questions?.length) return "";
  return `
    <div class="question-block">
      <h4>${escapeHtml(title)}</h4>
      ${questions.map((question) => `<span>${formatOfficialText(question)}</span>`).join("")}
    </div>
  `;
}

function listBlock(title, items) {
  if (!items?.length) return "";
  return `
    <div class="detail-list">
      <h4>${escapeHtml(title)}</h4>
      <ul>${items.map((item) => `<li>${formatOfficialText(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderUnderstandingCard(understanding) {
  return `
    <article class="understanding-card full" id="${escapeHtml(understanding.code)}">
      <header>
        <span>${escapeHtml(understanding.code)}</span>
        <strong>${escapeHtml(understanding.teachingLevel)}</strong>
      </header>
      <h3>${formatOfficialText(understanding.official.statement)}</h3>
      ${understanding.official.guidance ? `<p>${formatOfficialText(understanding.official.guidance)}</p>` : ""}
      ${textBlock("Application of skills", understanding.official.applicationOfSkills)}
      ${textBlock("Nature of science", understanding.official.natureOfScience)}
      ${textBlock("Note", understanding.official.note)}
      ${listBlock("Learning focus", understanding.learningFocus)}
      ${getDisplayTags(understanding).length ? `
        <div class="term-row">
          ${getDisplayTags(understanding).map((term) => `
            <button data-search-term="${escapeHtml(term)}" type="button">${escapeHtml(term)}</button>
          `).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

function renderReader() {
  const items = getScopedUnderstandings();
  const groups = groupUnderstandings(items);

  els.readerCount.textContent = items.length;
  els.readerEyebrow.textContent = state.search.trim() ? "Search results" : "Reader";
  els.readerTitle.textContent = state.search.trim()
    ? `Matches for "${state.search.trim()}"`
    : "Syllabus understandings";

  if (!items.length) {
    els.readerContent.innerHTML = `<p class="empty-state">No understandings match this search.</p>`;
    return;
  }

  els.readerContent.innerHTML = groups.map(({ topic, understandings: topicUnderstandings }) => {
    const { slHl, ahl } = getHours(topic);
    return `
      <section class="topic-section theme-${escapeHtml(topic.theme)}">
        <div class="topic-section-head">
          <div>
            <span>${escapeHtml(topic.themeName)} / ${escapeHtml(topic.organizationLevelName)}</span>
            <h3>${escapeHtml(topic.code)} ${escapeHtml(topic.title)}</h3>
          </div>
          <p>${slHl} SL/HL${ahl ? ` + ${ahl} AHL` : ""}</p>
        </div>
        <div class="topic-questions">
          ${questionBlock("Guiding questions", topic.official.guidingQuestions)}
          ${questionBlock("Linking questions", topic.official.linkingQuestions)}
        </div>
        <div class="understanding-flow">
          ${topicUnderstandings.map(renderUnderstandingCard).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function renderQuickScopes() {
  document.querySelectorAll("[data-quick-scope]").forEach((button) => {
    const scope = button.dataset.quickScope;
    button.classList.toggle("active", state.search.trim() === "" && isScopeChecked(scope));
  });
}

function renderFontSize() {
  document.documentElement.style.setProperty("--reader-font-size", `${state.fontSize}px`);
  els.fontSizeInput.value = state.fontSize;
  els.fontSizeValue.textContent = `${state.fontSize}px`;
}

function renderAll() {
  renderOutline();
  renderReader();
  renderQuickScopes();
  renderFontSize();
}

document.body.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-toggle]");
  if (toggle && !toggle.disabled) {
    const id = toggle.dataset.toggle;
    state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    renderAll();
    return;
  }

  const scope = event.target.closest("[data-scope]");
  if (scope) {
    toggleScope(scope.dataset.scope);
    return;
  }

  const focus = event.target.closest("[data-focus-scope]");
  if (focus) {
    setSingleScope(focus.dataset.focusScope);
    return;
  }

  const quickScope = event.target.closest("[data-quick-scope]");
  if (quickScope) {
    toggleScope(quickScope.dataset.quickScope);
    return;
  }

  const searchTerm = event.target.closest("[data-search-term]");
  if (searchTerm) {
    setSearch(searchTerm.dataset.searchTerm);
  }
});

els.searchInput.addEventListener("input", (event) => {
  setSearch(event.target.value);
});

els.fontSizeInput.addEventListener("input", (event) => {
  state.fontSize = Number(event.target.value);
  renderFontSize();
});

els.expandAll.addEventListener("click", () => {
  themes.forEach((theme) => {
    state.expanded.add(`theme:${theme.code}`);
    levels.forEach((level) => state.expanded.add(levelId(theme.code, level.code)));
  });
  topics.forEach((topic) => state.expanded.add(topicId(topic.code)));
  renderAll();
});

els.collapseAll.addEventListener("click", () => {
  state.expanded.clear();
  renderAll();
});

renderAll();
