const syllabus = globalThis.BIOLOGY_2028_SYLLABUS ?? globalThis.BIOLOGY_2025_SYLLABUS;
const themes = Object.values(syllabus.themes);
const levels = Object.values(syllabus.levels);
const topics = syllabus.topics;
const understandings = syllabus.understandings;

const state = {
  scopes: new Set(["all"]),
  search: "",
  fontSize: 17
};

const fontSizeBounds = {
  min: 15,
  max: 22
};

const els = {
  fontSizeMinus: document.querySelector("#fontSizeMinus"),
  fontSizePlus: document.querySelector("#fontSizePlus"),
  fontSizeValue: document.querySelector("#fontSizeValue"),
  searchInput: document.querySelector("#searchInput"),
  teachingFilters: document.querySelector("#teachingFilters"),
  outlineTree: document.querySelector("#outlineTree"),
  toggleOutline: document.querySelector("#toggleOutline"),
  readerTitle: document.querySelector("#readerTitle"),
  readerCount: document.querySelector("#readerCount"),
  readerContent: document.querySelector("#readerContent")
};

const mobileOutlineQuery = window.matchMedia("(max-width: 760px)");

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

function getUnderstanding(code) {
  return syllabus.understandingByCode[code];
}

function getTopicForUnderstanding(understanding) {
  return syllabus.topicByCode[understanding.topicCode];
}

function topicId(topicCode) {
  return `topic:${topicCode}`;
}

function levelId(themeCode, levelCode) {
  return `level:${themeCode}:${levelCode}`;
}

function themeId(themeCode) {
  return `theme:${themeCode}`;
}

function organizationLevelId(levelCode) {
  return `organization:${levelCode}`;
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
    understanding.figures?.map((figure) => `${figure.alt || ""} ${figure.caption || ""}`).join(" "),
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
  if (scope === topicId(topic.code)) return true;
  if (scope === levelId(topic.theme, topic.organizationLevel)) return true;
  if (scope === themeId(topic.theme)) return true;
  if (scope === organizationLevelId(topic.organizationLevel)) return true;
  if (scope === `teaching:${understanding.teachingLevel}`) return true;
  return false;
}

function isTeachingScope(scope) {
  return scope.startsWith("teaching:");
}

function isLevelScope(scope) {
  return scope.startsWith("level:");
}

function isTopicScope(scope) {
  return scope.startsWith("topic:");
}

function isThemeScope(scope) {
  return scope.startsWith("theme:");
}

function isOrganizationLevelScope(scope) {
  return scope.startsWith("organization:");
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

function isScopeChecked(scope) {
  if (scope !== "all" && state.scopes.has("all")) return false;
  return state.scopes.has(scope);
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

  if (isThemeScope(scope)) {
    const themeCode = scope.slice("theme:".length);
    topics
      .filter((topic) => topic.theme === themeCode)
      .forEach((topic) => {
        state.scopes.delete(levelId(topic.theme, topic.organizationLevel));
        state.scopes.delete(topicId(topic.code));
      });
  }

  if (isOrganizationLevelScope(scope)) {
    const levelCode = scope.slice("organization:".length);
    topics
      .filter((topic) => topic.organizationLevel === levelCode)
      .forEach((topic) => {
        state.scopes.delete(levelId(topic.theme, topic.organizationLevel));
        state.scopes.delete(topicId(topic.code));
      });
  }

  if (isLevelScope(scope)) {
    const [, themeCode, levelCode] = scope.split(":");
    state.scopes.delete(themeId(themeCode));
    state.scopes.delete(organizationLevelId(levelCode));
    getLevelTopics(themeCode, levelCode).forEach((topic) => state.scopes.delete(topicId(topic.code)));
  }

  if (isTopicScope(scope)) {
    const topic = syllabus.topicByCode[scope.slice("topic:".length)];
    if (topic) {
      state.scopes.delete(themeId(topic.theme));
      state.scopes.delete(organizationLevelId(topic.organizationLevel));
      state.scopes.delete(levelId(topic.theme, topic.organizationLevel));
    }
  }

  if (state.scopes.has(scope)) {
    state.scopes.delete(scope);
  } else {
    state.scopes.add(scope);
  }

  if (state.scopes.size === 0) state.scopes.add("all");
  renderAll();
}

function setSearch(query) {
  state.search = query;
  els.searchInput.value = query;
  renderAll();
}

function renderOutline() {
  els.outlineTree.innerHTML = `
    <div class="topic-matrix" aria-label="Topics by theme and organization level">
      <span class="matrix-corner" aria-hidden="true"></span>
      ${levels.map((level) => {
        const scope = organizationLevelId(level.code);
        const active = !state.search.trim() && isScopeChecked(scope);
        return `<button class="matrix-axis-button matrix-level${active ? " active" : ""}"
          data-toggle-scope="${escapeHtml(scope)}" type="button"
          title="Select all organization level ${escapeHtml(level.code)} topics">${escapeHtml(level.code)}</button>`;
      }).join("")}
      ${themes.map((theme) => `
        ${(() => {
          const scope = themeId(theme.code);
          const active = !state.search.trim() && isScopeChecked(scope);
          return `<button class="matrix-axis-button matrix-theme theme-${escapeHtml(theme.code)}${active ? " active" : ""}"
            data-toggle-scope="${escapeHtml(scope)}" type="button"
            title="${escapeHtml(`Select all ${theme.code} ${theme.name} topics`)}">${escapeHtml(theme.code)}</button>`;
        })()}
        ${levels.map((level) => `
          <div class="matrix-cell theme-${escapeHtml(theme.code)}">
            ${(() => {
              const scope = levelId(theme.code, level.code);
              const active = !state.search.trim() && isScopeChecked(scope);
              return `<button class="level-button${active ? " active" : ""}"
                data-toggle-scope="${escapeHtml(scope)}" type="button"
                title="Select all ${escapeHtml(theme.code + level.code)} topics">${escapeHtml(theme.code + level.code)}</button>`;
            })()}
            ${getLevelTopics(theme.code, level.code).map((topic) => {
              const scope = topicId(topic.code);
              const active = !state.search.trim() && isScopeChecked(scope);
              return `<button class="topic-button${active ? " active" : ""}"
                data-toggle-scope="${escapeHtml(scope)}" type="button"
                title="${escapeHtml(`${topic.code} ${topic.title}`)}">${escapeHtml(topic.code)}</button>`;
            }).join("")}
          </div>
        `).join("")}
      `).join("")}
    </div>
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

function renderFigures(figures) {
  if (!figures?.length) return "";
  return `
    <div class="syllabus-figures">
      ${figures.map((figure) => `
        <figure class="syllabus-figure${figure.layout === "wide" ? " wide" : ""}">
          <img src="${escapeHtml(figure.src)}" alt="${escapeHtml(figure.alt || "")}" loading="lazy">
          ${figure.caption ? `<figcaption>${escapeHtml(figure.caption)}</figcaption>` : ""}
        </figure>
      `).join("")}
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
      ${renderFigures(understanding.figures)}
      ${textBlock("Application of skills", understanding.official.applicationOfSkills)}
      ${textBlock("Nature of science", understanding.official.natureOfScience)}
      ${textBlock("Note", understanding.official.note)}
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
  els.readerTitle.textContent = state.search.trim()
    ? `Matches for "${state.search.trim()}"`
    : "Selected syllabus";

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

function renderFontSize() {
  document.documentElement.style.setProperty("--reader-font-size", `${state.fontSize}px`);
  els.fontSizeValue.textContent = `${state.fontSize}px`;
  els.fontSizeMinus.disabled = state.fontSize <= fontSizeBounds.min;
  els.fontSizePlus.disabled = state.fontSize >= fontSizeBounds.max;
}

function changeFontSize(delta) {
  state.fontSize = Math.min(fontSizeBounds.max, Math.max(fontSizeBounds.min, state.fontSize + delta));
  renderFontSize();
}

function syncMobileOutlineState() {
  const collapsed = mobileOutlineQuery.matches && !document.body.classList.contains("mobile-outline-open");
  document.body.classList.toggle("mobile-outline-collapsed", collapsed);
  els.toggleOutline.setAttribute("aria-expanded", String(!collapsed));
  els.toggleOutline.textContent = collapsed ? "Show" : "Hide";
}

function renderAll() {
  renderOutline();
  renderReader();
  els.teachingFilters.querySelectorAll("[data-toggle-scope]").forEach((button) => {
    button.classList.toggle("active", !state.search.trim() && isScopeChecked(button.dataset.toggleScope));
  });
  renderFontSize();
  syncMobileOutlineState();
}

document.body.addEventListener("click", (event) => {
  const scope = event.target.closest("[data-toggle-scope]");
  if (scope) {
    toggleScope(scope.dataset.toggleScope);
    return;
  }

  const searchTerm = event.target.closest("[data-search-term]");
  if (searchTerm) {
    setSearch(searchTerm.dataset.searchTerm);
  }
});

els.toggleOutline.addEventListener("click", () => {
  document.body.classList.toggle("mobile-outline-open");
  syncMobileOutlineState();
});

mobileOutlineQuery.addEventListener("change", syncMobileOutlineState);

els.searchInput.addEventListener("input", (event) => {
  setSearch(event.target.value);
});

els.fontSizeMinus.addEventListener("click", () => {
  changeFontSize(-1);
});

els.fontSizePlus.addEventListener("click", () => {
  changeFontSize(1);
});

renderAll();
