(function () {
  "use strict";

  var REFERENCE_NOW = "2026-11-11T09:30:00.000Z";
  var STORAGE_NAMESPACE = "handover.concept-reference.v1.reader.";

  // ─── Utilities ───────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(isoString) {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("en-GB", {
        timeZone: "UTC",
        month: "long", day: "numeric", year: "numeric",
      });
    } catch (_) { return ""; }
  }

  function slugify(text) {
    if (!text || typeof text !== "string") return "section";
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
  }

  function localStorageGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(STORAGE_NAMESPACE + key) : null; }
    catch (_) { return null; }
  }

  function localStorageSet(key, value) {
    try { if (window.localStorage) window.localStorage.setItem(STORAGE_NAMESPACE + key, value); }
    catch (_) { }
  }

  function safeReaderColor(value) {
    var color = String(value || "").trim();
    return /^#[0-9a-f]{3,8}$/i.test(color) ? color : null;
  }

  function safeReaderImageUrl(value) {
    if (!value || typeof value !== "string") return null;
    try {
      var parsed = new URL(value, window.location.href);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
    } catch (_) {
      return null;
    }
  }

  function readerBackdropConfig(value) {
    if (!value || typeof value !== "object") return null;
    var type = value.type;
    if (type === "solid") {
      var color = safeReaderColor(value.color);
      return color ? { type: type, color: color } : null;
    }
    if (type === "gradient") {
      var from = safeReaderColor(value.from);
      var to = safeReaderColor(value.to);
      var angle = Number(value.angle);
      return from && to ? { type: type, from: from, to: to, angle: isFinite(angle) ? Math.max(0, Math.min(360, angle)) : 135 } : null;
    }
    if (type === "image") {
      var image = safeReaderImageUrl(value.image);
      var overlay = Number(value.overlay);
      return image ? { type: type, image: image, overlay: isFinite(overlay) ? Math.max(0, Math.min(0.82, overlay)) : 0.46 } : null;
    }
    return null;
  }

  function applyReaderBackdrop(container, value) {
    var config = readerBackdropConfig(value);
    container.classList.remove("reader-backdrop", "reader-backdrop--solid", "reader-backdrop--gradient", "reader-backdrop--image");
    container.style.removeProperty("--reader-backdrop-color");
    container.style.removeProperty("--reader-backdrop-gradient");
    container.style.removeProperty("--reader-backdrop-image");
    if (!config) return;

    container.classList.add("reader-backdrop", "reader-backdrop--" + config.type);
    if (config.type === "solid") {
      container.style.setProperty("--reader-backdrop-color", config.color);
    } else if (config.type === "gradient") {
      container.style.setProperty("--reader-backdrop-color", config.from);
      container.style.setProperty("--reader-backdrop-gradient", "linear-gradient(" + config.angle + "deg, " + config.from + ", " + config.to + ")");
    } else {
      var shade = "linear-gradient(rgba(24, 29, 34, " + config.overlay + "), rgba(24, 29, 34, " + config.overlay + "))";
      container.style.setProperty("--reader-backdrop-color", "#788597");
      container.style.setProperty("--reader-backdrop-gradient", shade);
      container.style.setProperty("--reader-backdrop-image", "url(" + JSON.stringify(config.image) + ")");
    }
  }

  function renderBackdropLab(presets, activeIndex) {
    if (!Array.isArray(presets) || !presets.length) return "";
    var controls = presets.map(function (preset, index) {
      return '<button type="button" class="reader-backdrop-choice' + (index === activeIndex ? " is-active" : "") + '" data-reader-backdrop-index="' + index + '" aria-pressed="' + (index === activeIndex) + '">' + escapeHtml(preset.label || "Background " + (index + 1)) + "</button>";
    }).join("");
    return '<div class="reader-backdrop-lab" role="group" aria-label="Preview background options"><span>Background preview</span>' + controls + "</div>";
  }

  function trackEvent(eventType, metadata, publicId) {
    // Concept-reference fixtures are intentionally private and never emit telemetry.
    void eventType; void metadata; void publicId;
  }

  var readerScriptBase = document.currentScript && document.currentScript.src;
  function getReaderBase() {
    var base = readerScriptBase;
    if (base) {
      var idx = base.lastIndexOf("/");
      return idx >= 0 ? base.slice(0, idx) : "/reader";
    }
    return ".";
  }

  // ─── Link card badge (snapshot.badges + badgeKey) ─────────────────────────────

  /** Lucide link icon — two subpaths (stroke) */
  var GENERIC_LINK_PATH_A =
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71";
  var GENERIC_LINK_PATH_B =
    "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71";

  function badgeEntryFromSnapshot(snapshot, card) {
    if (!snapshot || !snapshot.badges || !card.badgeKey) return null;
    return snapshot.badges[card.badgeKey] || null;
  }

  function linkCardLabel(snapshot, card) {
    var entry = badgeEntryFromSnapshot(snapshot, card);
    if (entry && entry.type === "svg") return entry.title;
    if (entry && entry.type === "raster") return entry.hostname || "Link";
    return "Link";
  }

  function readerSourcePillStyle(entry) {
    if (!entry || entry.type !== "svg") return "";
    var isDark = document.documentElement.classList.contains("theme-dark");
    var paletteBySlug = {
      notion: isDark ? ["4A391A", "EFD08A"] : ["FFF0D6", "9A651F"],
      github: isDark ? ["293756", "BFCBFF"] : ["E8EDFF", "465EA8"],
    };
    var palette = paletteBySlug[entry.slug];
    if (palette) {
      return ' style="background:#' + palette[0] + ";color:#" + palette[1] + '"';
    }
    return ' style="background:#' + entry.brandHex + (isDark ? "30" : "1a") + ";color:#" + entry.brandHex + '"';
  }

  function renderLinkThumbHtml(snapshot, card) {
    var entry = badgeEntryFromSnapshot(snapshot, card);
    if (entry && entry.type === "svg") {
      var bg = "#" + entry.brandHex;
      var fill = "#" + entry.iconColor;
      return (
        '<div class="link-card-thumb-fill" style="background:' +
        bg +
        '">' +
        '<svg class="link-card-thumb-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
        '<path d="' +
        escapeHtml(entry.svgPath) +
        '" fill="' +
        fill +
        '"/>' +
        "</svg></div>"
      );
    }
    if (entry && entry.type === "raster") {
      return (
        '<div class="link-card-thumb-fill link-card-thumb-fill--raster">' +
        '<img src="' +
        escapeHtml(entry.dataUri) +
        '" width="28" height="28" alt="" />' +
        "</div>"
      );
    }
    return (
      '<div class="link-card-thumb-fill link-card-thumb-fill--generic">' +
      '<svg class="link-card-thumb-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="' +
      GENERIC_LINK_PATH_A +
      '"/>' +
      '<path d="' +
      GENERIC_LINK_PATH_B +
      '"/>' +
      "</svg></div>"
    );
  }

  /** Skip empty or literal "untitled" (case-insensitive). */
  function skipIfUntitled(str) {
    if (str == null) return null;
    var t = String(str).trim();
    if (!t) return null;
    if (t.toLowerCase() === "untitled") return null;
    return t;
  }

  /**
   * Main column header above link sections: client (optional), title (optional),
   * then one metadata line — layout rhythm from pen reference (not colors/fonts).
   */
  function projectClientName(project) {
    if (!project) return null;
    return project.clientName != null && project.clientName !== ""
      ? project.clientName
      : project.client_name != null && project.client_name !== ""
        ? project.client_name
        : null;
  }

  /** "Total links N · Last updated …" — shared by action bar and (until header refresh) main meta */
  function readerMetaLine(snapshot, cards) {
    var linkCount = cards.filter(function (c) {
      return c.type === "link" || c.type === "staging_site";
    }).length;
    var updatedDate = formatDate(snapshot.publishedAt);
    var metaBits = ["Total links " + linkCount];
    if (updatedDate) metaBits.push("Last updated " + updatedDate);
    return metaBits.join(" · ");
  }

  function renderMainColumnHeader(project, cards, snapshot) {
    var client = skipIfUntitled(projectClientName(project));
    var title = skipIfUntitled(project.title);
    var parts = ['<header class="reader-main-header">'];
    // Title text and logo sit in a horizontal row — logo floats to the right
    parts.push('<div class="reader-main-header-row">');
    parts.push('<div class="reader-main-header-text">');
    if (client) {
      parts.push('<p class="reader-main-client">' + escapeHtml(client) + "</p>");
    }
    if (title) {
      parts.push('<h1 class="reader-main-title">' + escapeHtml(title) + "</h1>");
    }
    parts.push("</div>");
    var view = localStorageGet("ho-reader-view") === "list" ? "list" : "grid";
    parts.push(
      '<div class="reader-view-toggle" role="group" aria-label="Choose how links are displayed">' +
      '<button type="button" class="reader-view-btn' + (view === "grid" ? " is-active" : "") + '" data-action="view-grid" aria-pressed="' + (view === "grid") + '"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="4" height="4" rx="1"/><rect x="10" y="2" width="4" height="4" rx="1"/><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/></svg>Grid</button>' +
      '<button type="button" class="reader-view-btn' + (view === "list" ? " is-active" : "") + '" data-action="view-list" aria-pressed="' + (view === "list") + '"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M3 8h10M3 12h10"/></svg>List</button>' +
      "</div>"
    );
    if (project.clientLogoPath) {
      parts.push(
        '<div class="reader-client-logo-wrap">' +
        '<img class="reader-client-logo" src="' + escapeHtml(project.clientLogoPath) + '" alt="" loading="lazy" />' +
        "</div>"
      );
    }
    parts.push("</div>");
    var rawDesc = project.description && String(project.description).trim();
    if (rawDesc) {
      parts.push(
        '<p class="project-description">' +
          escapeHtml(rawDesc) +
          "</p>"
      );
    }
    parts.push("</header>");
    return parts.join("");
  }

  // ─── Render helpers ───────────────────────────────────────────────────────────

  function trimStr(v) {
    if (v == null) return "";
    return String(v).trim();
  }

  /** Non-empty strings joined with " • " for aside card meta lines. */
  function joinAsideMeta(parts) {
    var bits = [];
    for (var i = 0; i < parts.length; i++) {
      var t = trimStr(parts[i]);
      if (t) bits.push(t);
    }
    return bits.join(" • ");
  }

  /** Two-letter initials for avatar circle (name, email local-part, or "?"). */
  function initialsFromLabel(s) {
    var t = trimStr(String(s || "").replace(/\s*\([^)]*\)/g, ""));
    if (!t) return "?";
    var words = t.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return t.slice(0, 2).toUpperCase();
  }

  function personalAsideInitials(cleanName, email) {
    if (cleanName) return initialsFromLabel(cleanName);
    if (email) {
      var local = trimStr(email.split("@")[0] || email);
      return initialsFromLabel(local.replace(/[.+_-]+/g, " "));
    }
    return "?";
  }

  function authorShowsBusiness(author) {
    if (!author) return false;
    var m = author.authorDisplay;
    return m !== "personal";
  }

  function authorShowsPersonal(author) {
    if (!author) return false;
    var m = author.authorDisplay;
    return m !== "business";
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimStr(value));
  }

  function isPhone(value) {
    var t = trimStr(value);
    if (!t || t.indexOf("@") >= 0) return false;
    return t.replace(/\D/g, "").length >= 6;
  }

  function wrapContactValue(value) {
    var text = trimStr(value);
    if (!text) return "";
    if (isEmail(text)) {
      return (
        '<a class="reader-contact-link" href="mailto:' +
        escapeHtml(text) +
        '">' +
        escapeHtml(text) +
        "</a>"
      );
    }
    if (isPhone(text)) {
      return (
        '<a class="reader-contact-link" href="tel:' +
        escapeHtml(text.replace(/[^\d+]/g, "")) +
        '">' +
        escapeHtml(text) +
        "</a>"
      );
    }
    return escapeHtml(text);
  }

  function contactSecondaryLineHtml(parts) {
    var bits = [];
    for (var i = 0; i < parts.length; i++) {
      var html = wrapContactValue(parts[i]);
      if (html) bits.push(html);
    }
    return bits.join(" • ");
  }

  /** Vertical divider between inline contact segments (Figma 352:989). */
  function contactInlineHtml(primary, secondaryParts) {
    var primaryText = trimStr(primary);
    var secondaryHtml = contactSecondaryLineHtml(secondaryParts || []);
    if (!primaryText && !secondaryHtml) return "";
    var parts = ['<span class="reader-contact-inline">'];
    if (primaryText) {
      parts.push(
        '<span class="reader-contact-inline-primary">' +
          escapeHtml(primaryText) +
          "</span>"
      );
    }
    if (primaryText && secondaryHtml) {
      parts.push('<span class="reader-contact-divider" aria-hidden="true"></span>');
      parts.push(
        '<span class="reader-contact-inline-secondary">' +
          secondaryHtml +
          "</span>"
      );
    } else if (secondaryHtml) {
      parts.push(
        '<span class="reader-contact-inline-secondary">' +
          secondaryHtml +
          "</span>"
      );
    }
    parts.push("</span>");
    return parts.join("");
  }

  /** Contact block inside <main> — personal left, business right (Figma 352:981). */
  function renderContactDetailsBlock(author) {
    if (!author) return "";

    var personalHtml = "";
    var businessHtml = "";

    if (authorShowsPersonal(author)) {
      var cleanName = trimStr(
        String(author.displayName || "").replace(/\s*\([^)]*\)/g, "")
      );
      var title = trimStr(author.title);
      var email = trimStr(author.email);
      var nameTitleMeta = joinAsideMeta([cleanName, title]);
      if (cleanName || title || email) {
        var initials = personalAsideInitials(cleanName, email);
        personalHtml =
          '<div class="reader-contact-personal">' +
          '<div class="aside-avatar" aria-hidden="true">' +
          escapeHtml(initials) +
          "</div>" +
          contactInlineHtml(nameTitleMeta, email ? [email] : []) +
          "</div>";
      }
    }

    if (authorShowsBusiness(author)) {
      var bizName = trimStr(author.businessName);
      var bizSecondary = [author.businessPhone, author.businessEmail];
      if (bizName || contactSecondaryLineHtml(bizSecondary)) {
        businessHtml =
          '<div class="reader-contact-business">' +
          contactInlineHtml(bizName, bizSecondary) +
          "</div>";
      }
    }

    if (!personalHtml && !businessHtml) return "";

    return (
      '<section class="reader-contact-details">' +
      '<p class="reader-contact-details-label">Contact details</p>' +
      '<div class="reader-contact-details-row">' +
      personalHtml +
      businessHtml +
      "</div></section>"
    );
  }

  /** Light wordmark on dark reader; default wordmark on light reader. */
  function readerWordmarkSrc(readerBase) {
    if (document.documentElement.classList.contains("theme-dark")) {
      return readerBase + "/logo-wordmark-reversed.svg";
    }
    return readerBase + "/logo-wordmark.svg";
  }

  /** "Powered by" line + wordmark SVG (served from reader CDN, same base as app.js). */
  function poweredByFooterHtml(readerBase) {
    var src = readerWordmarkSrc(readerBase);
    return (
      '<a class="reader-powered-by" href="' + escapeHtml(getReaderBase().replace(/\/reader$/, "") + "/") + '" target="_blank" rel="noopener">' +
      '<span class="reader-powered-by-line">Powered by</span>' +
      '<img class="reader-powered-by-wordmark" src="' +
      escapeHtml(src) +
      '" alt="Handover" />' +
      "</a>"
    );
  }

  /** Footer brand + legal below main column. */
  function renderAsideColumn(readerBase) {
    return (
      '<div class="reader-footer-row">' +
      '<p class="reader-legal">All content and materials remain the property of their respective owners.</p>' +
      poweredByFooterHtml(readerBase) +
      "</div>"
    );
  }

  function renderSection(card, cards, index, readerBase, lastVisit, visitedIds, snapshot) {
    var linkCards = [];
    for (var i = index + 1; i < cards.length; i++) {
      if (cards[i].type === "section") break;
      if (cards[i].type === "link" || cards[i].type === "staging_site") linkCards.push(cards[i]);
    }
    var sectionId = "section-" + slugify(card.title);
    var parts = [
      '<div class="section" id="' + escapeHtml(sectionId) + '">',
      '<div class="section-header">',
      '<h2 class="section-heading">' + escapeHtml(card.title || "Untitled") + '</h2>',
      '</div>',
      renderListTableHeader(),
      '<div class="card-grid">',
    ];
    linkCards.forEach(function (link) {
      parts.push(renderCard(link, readerBase, lastVisit, visitedIds, snapshot));
    });
    parts.push("</div>");
    parts.push("</div>");
    return parts.join("");
  }

  function renderListTableHeader() {
    return (
      '<div class="reader-list-table-head" aria-hidden="true">' +
      '<span>Link</span><span>Source</span><span>Notes</span><span>Status</span><span></span>' +
      '</div>'
    );
  }

  function renderCard(card, readerBase, lastVisit, visitedIds, snapshot) {
    var isStagingSite = card.type === "staging_site";
    var stagingStatus = card.stagingStatus || "live";
    var unavailable = isStagingSite && stagingStatus !== "live";
    var url = card.url || card.stagingUrl || "#";
    var label = isStagingSite ? "Staging site · " + (stagingStatus === "live" ? "Live" : "Unavailable") : linkCardLabel(snapshot, card);
    var isNew = lastVisit != null && card.publishedAt
      ? new Date(card.publishedAt).getTime() > lastVisit
      : false;
    var visited = visitedIds && visitedIds[card.id];

    var entry = badgeEntryFromSnapshot(snapshot, card);
    var tagClass = "tag-pill link-card-tag";
    var pillStyle = "";
    if (isStagingSite) {
      tagClass += " tag-live";
    } else if (entry && entry.type === "svg") {
      tagClass += " tag-pill--brand";
      pillStyle = readerSourcePillStyle(entry);
    } else {
      tagClass += " tag-generic";
    }

    var opening = unavailable
      ? '<article class="link-card link-card--staging link-card--unavailable" aria-label="' + escapeHtml((card.title || "Staging site") + " is unavailable") + '">'
      : '<a class="link-card' + (isStagingSite ? " link-card--staging" : "") + (visited ? " visited" : "") + '" href="' + escapeHtml(readerBase + "/unavailable.html") + '" target="_blank" rel="noopener noreferrer" data-card-id="' + escapeHtml(card.id) + '">';
    var thumbnail = isStagingSite
      ? '<div class="link-card-thumb-fill link-card-thumb-fill--staging" aria-hidden="true">↗</div>'
      : renderLinkThumbHtml(snapshot, card);
    var description = isStagingSite
      ? unavailable
        ? "This staging site is currently unavailable."
        : "Live staging link" + (card.versionNumber ? " · Version " + card.versionNumber : "")
      : card.note && card.note.trim()
        ? card.note
        : url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    var status = unavailable
      ? '<span class="tag-pill tag-archived">Unavailable</span>'
      : isNew
        ? '<span class="badge-new">New</span>'
        : isStagingSite
          ? '<span class="tag-pill tag-live">Live</span>'
          : '<span class="link-card-status-empty">—</span>';

    return [
      opening,
      '<div class="link-card-top">',
      '<div class="link-card-source"><span class="' + tagClass + '"' + pillStyle + '">' + escapeHtml(label) + "</span></div>",
      '<div class="link-card-top-actions">',
      '<span class="link-card-status">' + status + '</span>',
      unavailable ? '<span class="link-card-goto link-card-unavailable" aria-hidden="true">Unavailable</span>' : '<span class="link-card-goto" aria-hidden="true">↗</span>',
      "</div>",
      '</div>',
      '<div class="link-card-body">',
      '<div class="link-card-thumb">',
      thumbnail,
      '</div>',
      '<div class="link-card-info">',
      '<p class="link-card-title">' + escapeHtml(card.title || "Untitled") + '</p>',
      '<p class="link-card-desc">' + escapeHtml(description) + '</p>',
      '</div>',
      '</div>',
      '<p class="link-card-list-note">' + escapeHtml(description) + '</p>',
      unavailable ? '</article>' : '</a>',
    ].join("");
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  function render(snapshot) {
    var readerBase = getReaderBase();
    var container = document.getElementById("app");
    if (!container) return;

    var project = snapshot.project || {};
    var author = snapshot.author || null;
    var cards = snapshot.cards || [];
    var publicId = project.publicId || null;
    var hasLinks = cards.some(function (c) {
      return c.type === "link" || c.type === "staging_site";
    });
    var backdropPresets = Array.isArray(window.__READER_BACKGROUND_PRESETS__) ? window.__READER_BACKGROUND_PRESETS__ : [];
    var activeBackdropIndex = Math.max(0, Math.min(backdropPresets.length - 1, Number(localStorageGet("ho-reader-background-lab")) || 0));
    var activeBackdrop = backdropPresets.length ? backdropPresets[activeBackdropIndex].config : project.readerBackground;
    applyReaderBackdrop(container, activeBackdrop);

    // Compute visit state
    var lastVisit = null;
    var visitedIds = {};
    if (publicId) {
      var stored = localStorageGet("reader_last_visit_" + publicId);
      if (stored) lastVisit = new Date(stored).getTime();
      var visitedJson = localStorageGet("reader_visited_" + publicId);
      if (visitedJson) {
        try {
          var arr = JSON.parse(visitedJson);
          if (Array.isArray(arr)) arr.forEach(function (id) { visitedIds[id] = true; });
        } catch (_) { }
      }
    }

    var html = [];

    if (hasLinks) {
      html.push('<div class="action-bar">');
      html.push('<div class="action-bar-inner">');
      html.push(
        '<span class="action-bar-meta">' +
          escapeHtml(readerMetaLine(snapshot, cards)) +
          "</span>"
      );
      html.push('<div class="action-bar-actions">');
      html.push(
        '<button type="button" class="action-bar-btn" data-action="copy-all">Copy all</button>',
        '<button type="button" class="action-bar-btn action-bar-btn--primary" data-action="share">Share</button>'
      );
      html.push("</div>");
      html.push("</div>");
      html.push("</div>");
    }

    html.push(renderBackdropLab(backdropPresets, activeBackdropIndex));

    // Two-column body (main left, aside right)
    html.push('<div class="page-body">');

    // Main column — link cards (first in row)
    html.push("<main>");
    html.push(renderMainColumnHeader(project, cards, snapshot));

    if (cards.length > 0) {
      html.push('<div class="sections">');

      // Orphan links (before first section heading)
      var orphans = [];
      var firstSectionIdx = -1;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].type === "section") { firstSectionIdx = i; break; }
      }
      var limit = firstSectionIdx === -1 ? cards.length : firstSectionIdx;
      for (var j = 0; j < limit; j++) {
        if (cards[j].type === "link" || cards[j].type === "staging_site") orphans.push(cards[j]);
      }

      if (orphans.length > 0) {
        html.push('<div class="section">');
        html.push(renderListTableHeader());
        html.push('<div class="card-grid">');
        orphans.forEach(function (c) {
          html.push(renderCard(c, readerBase, lastVisit, visitedIds, snapshot));
        });
        html.push("</div></div>");
      }

      cards.forEach(function (card, idx) {
        if (card.type === "section") {
          html.push(renderSection(card, cards, idx, readerBase, lastVisit, visitedIds, snapshot));
        }
      });

      html.push("</div>"); // .sections
    } else {
      html.push('<div class="empty-state"><p>Nothing here yet.</p></div>');
    }

    html.push(renderContactDetailsBlock(author));

    html.push("</main>");

    // Footer — powered by + legal (below main column)
    html.push("<footer>");
    html.push(renderAsideColumn(readerBase));

    html.push("</footer>");

    html.push("</div>"); // .page-body

    container.innerHTML = html.join("");
    container.classList.toggle(
      "reader-list-view",
      localStorageGet("ho-reader-view") === "list"
    );


    if (publicId) {
      localStorageSet("reader_last_visit_" + publicId, REFERENCE_NOW);
    }

    attachHandlers(container, cards, publicId, backdropPresets);
    if (publicId) {
      trackEvent(
        "client_page_viewed",
        {
          referrer: typeof document !== "undefined" && document.referrer
            ? document.referrer
            : "",
          viewport_width:
            typeof window !== "undefined" && typeof window.innerWidth === "number"
              ? window.innerWidth
              : null,
        },
        publicId
      );
    }
  }

  // ─── Event handlers ───────────────────────────────────────────────────────────

  function attachHandlers(container, cards, publicId, backdropPresets) {
    container.addEventListener("click", function (e) {
      var cardEl = e.target.closest("a.link-card");
      if (cardEl) {
        var cardId = cardEl.getAttribute("data-card-id");
        if (publicId && cardId) {
          trackEvent("client_link_opened", { card_id: cardId }, publicId);
          markVisited(publicId, cardId);
          cardEl.classList.add("visited");
        }
        return;
      }

      var btn = e.target.closest(".action-bar-btn");
      var viewBtn = e.target.closest(".reader-view-btn");
      var backdropBtn = e.target.closest(".reader-backdrop-choice");
      if (backdropBtn && Array.isArray(backdropPresets)) {
        var backdropIndex = Number(backdropBtn.getAttribute("data-reader-backdrop-index"));
        if (backdropPresets[backdropIndex]) {
          localStorageSet("ho-reader-background-lab", String(backdropIndex));
          applyReaderBackdrop(container, backdropPresets[backdropIndex].config);
          container.querySelectorAll(".reader-backdrop-choice").forEach(function (control) {
            var isActive = Number(control.getAttribute("data-reader-backdrop-index")) === backdropIndex;
            control.classList.toggle("is-active", isActive);
            control.setAttribute("aria-pressed", String(isActive));
          });
        }
        return;
      }
      if (viewBtn) {
        var nextView = viewBtn.getAttribute("data-action") === "view-list" ? "list" : "grid";
        localStorageSet("ho-reader-view", nextView);
        container.classList.toggle("reader-list-view", nextView === "list");
        container.querySelectorAll(".reader-view-btn").forEach(function (control) {
          var active = control.getAttribute("data-action") === "view-" + nextView;
          control.classList.toggle("is-active", active);
          control.setAttribute("aria-pressed", String(active));
        });
        return;
      }
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      if (action === "share") {
        if (publicId) trackEvent("client_page_shared", {}, publicId);
        copyToClipboard(window.location.href, "Page link copied");
      } else if (action === "copy-all") {
        var parts = [];
        var currentSection = null;
        cards.forEach(function (c) {
          if (c.type === "section") { currentSection = c.title; }
          else if ((c.type === "link" || c.type === "staging_site") && (c.url || c.stagingUrl) && c.stagingStatus !== "paused" && c.stagingStatus !== "failed") {
            if (currentSection) { parts.push(currentSection); currentSection = null; }
            parts.push((c.title || "Link") + ": " + getReaderBase() + "/unavailable.html");
          }
        });
        var linkCount = cards.filter(function (c) { return c.type === "link" || c.type === "staging_site"; }).length;
        if (publicId) trackEvent("client_all_links_copied", { card_count: linkCount }, publicId);
        copyToClipboard(parts.join("\n"), "All links copied");
      }
    });
  }

  function markVisited(publicId, cardId) {
    try {
      var key = "reader_visited_" + publicId;
      var stored = localStorageGet(key);
      var ids = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(ids)) ids = [];
      if (ids.indexOf(cardId) < 0) { ids.push(cardId); localStorageSet(key, JSON.stringify(ids)); }
    } catch (_) { }
  }

  function copyToClipboard(text, successMsg) {
    if (text && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(successMsg); },
        function () { showToast("Could not copy"); }
      );
    }
  }

  function showToast(message) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    setTimeout(function () {
      el.classList.add("toast-out");
      setTimeout(function () { el.remove(); }, 200);
    }, 2000);
  }

  // ─── Loading / error ──────────────────────────────────────────────────────────

  function showLoading() {
    var container = document.getElementById("app");
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
  }

  function showUnavailable() {
    var readerBase = getReaderBase();
    var container = document.getElementById("app");
    if (!container) return;
    container.innerHTML = [
      '<div class="unavailable-state">',
      '<main class="unavailable-panel">',
      '<img class="unavailable-wordmark" src="' + escapeHtml(readerBase + "/logo-wordmark.svg") + '" alt="Handover" />',
      '<h1>Handover unavailable</h1>',
      '<p>This handover is not available. Check the link or contact the person who shared it.</p>',
      "</main>",
      "</div>",
    ].join("");
  }

  // ─── PIN access ───────────────────────────────────────────────────────────────

  var pinPromptTracked = false;

  function publicIdFromAccessUrl(url) {
    if (!url) return null;
    var match = String(url).match(/\/api\/public-access\/([^/]+)\//);
    return match ? match[1] : null;
  }

  function fetchProtectedSnapshot(snapshotUrl, unlockUrl, onUnlockRequired) {
    return fetch(snapshotUrl, { credentials: "same-origin" })
      .then(function (res) {
        if (res.status === 401) {
          onUnlockRequired();
          return null;
        }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      });
  }

  function renderProtectedSnapshot(snapshot) {
    render(snapshot);
    var publicId =
      (snapshot.project && snapshot.project.publicId) ||
      publicIdFromAccessUrl(window.__SNAPSHOT_URL__);
    if (publicId) {
      trackEvent("protected_snapshot_loaded", {}, publicId);
    }
  }

  function showPinForm(unlockUrl, snapshotUrl, publicId) {
    var readerBase = getReaderBase();
    var container = document.getElementById("app");
    if (!container) return;

    var wordmarkSrc = readerWordmarkSrc(readerBase);
    container.innerHTML = [
      '<div class="unavailable-state pin-state">',
      '<main class="unavailable-panel pin-panel">',
      '<img class="unavailable-wordmark" src="' + escapeHtml(wordmarkSrc) + '" alt="Handover" />',
      '<h1>This handover is protected</h1>',
      '<p class="pin-subtext">Enter your PIN</p>',
      '<form class="pin-form" autocomplete="off" novalidate>',
      '<div class="pin-inputs" role="group" aria-label="4-digit PIN">',
      '<div class="pin-digit-cell" data-index="0"><span class="pin-digit-dot" aria-hidden="true"></span><input class="pin-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="one-time-code" aria-label="Digit 1 of 4" data-index="0" /></div>',
      '<div class="pin-digit-cell" data-index="1"><span class="pin-digit-dot" aria-hidden="true"></span><input class="pin-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="off" aria-label="Digit 2 of 4" data-index="1" /></div>',
      '<div class="pin-digit-cell" data-index="2"><span class="pin-digit-dot" aria-hidden="true"></span><input class="pin-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="off" aria-label="Digit 3 of 4" data-index="2" /></div>',
      '<div class="pin-digit-cell" data-index="3"><span class="pin-digit-dot" aria-hidden="true"></span><input class="pin-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="off" aria-label="Digit 4 of 4" data-index="3" /></div>',
      "</div>",
      '<p class="pin-error" role="alert" aria-live="polite"></p>',
      "</form>",
      "</main>",
      "</div>",
    ].join("");

    if (!pinPromptTracked) {
      pinPromptTracked = true;
      trackEvent("pin_prompt_shown", {}, publicId);
    }

    var form = container.querySelector(".pin-form");
    var inputs = container.querySelectorAll(".pin-digit");
    var errorEl = container.querySelector(".pin-error");
    var verifying = false;

    function setError(message) {
      if (errorEl) errorEl.textContent = message || "";
    }

    function syncDigitCell(input) {
      var cell = input.closest(".pin-digit-cell");
      if (!cell) return;
      if (input.value) cell.classList.add("is-filled");
      else cell.classList.remove("is-filled");
    }

    function clearInputs() {
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].value = "";
        inputs[i].disabled = false;
        syncDigitCell(inputs[i]);
      }
      if (inputs[0]) inputs[0].focus();
    }

    function setVerifying(active) {
      verifying = active;
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].disabled = active;
      }
      if (form) {
        if (active) form.classList.add("pin-form--verifying");
        else form.classList.remove("pin-form--verifying");
      }
    }

    function collectPin() {
      var digits = "";
      for (var i = 0; i < inputs.length; i++) {
        digits += inputs[i].value;
      }
      return digits;
    }

    function submitPin() {
      if (verifying) return;
      var pin = collectPin();
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return;

      setVerifying(true);
      setError("");

      fetch(unlockUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin }),
      })
        .then(function (res) {
          if (res.status === 204) {
            showLoading();
            return fetchProtectedSnapshot(snapshotUrl, unlockUrl, function () {
              showPinForm(unlockUrl, snapshotUrl, publicId);
            })
              .then(function (data) {
                if (data) renderProtectedSnapshot(data);
              })
              .catch(function () {
                showUnavailable();
              });
          }
          if (res.status === 401) {
            setVerifying(false);
            setError("Incorrect PIN — try again.");
            clearInputs();
            return;
          }
          if (res.status === 429) {
            setVerifying(false);
            setError("Too many attempts — try again in a few minutes.");
            clearInputs();
            return;
          }
          throw new Error("Unlock failed");
        })
        .catch(function (err) {
          if (err && err.message === "Unlock failed") {
            setVerifying(false);
            setError("Something went wrong — please try again.");
            clearInputs();
            return;
          }
          if (!verifying) return;
          setVerifying(false);
          setError("Something went wrong — please try again.");
          clearInputs();
        });
    }

    function setDigitValue(input, value) {
      input.value = value;
      syncDigitCell(input);
    }

    function fillFromPaste(text, startIndex) {
      var digits = String(text || "").replace(/\D/g, "").slice(0, 4);
      if (!digits) return false;
      for (var i = 0; i < digits.length && startIndex + i < inputs.length; i++) {
        setDigitValue(inputs[startIndex + i], digits[i]);
      }
      var nextIdx = Math.min(startIndex + digits.length, inputs.length - 1);
      if (inputs[nextIdx]) inputs[nextIdx].focus();
      if (collectPin().length === 4) submitPin();
      return true;
    }

    for (var idx = 0; idx < inputs.length; idx++) {
      (function (input, index) {
        syncDigitCell(input);

        input.addEventListener("focus", function () {
          input.select();
        });

        input.addEventListener("input", function () {
          var val = input.value.replace(/\D/g, "").slice(-1);
          setDigitValue(input, val);
          setError("");
          if (val && index < inputs.length - 1) {
            inputs[index + 1].focus();
          }
          if (collectPin().length === 4) submitPin();
        });

        input.addEventListener("keydown", function (e) {
          if (/^\d$/.test(e.key)) {
            setDigitValue(input, e.key);
            setError("");
            if (index < inputs.length - 1) {
              inputs[index + 1].focus();
            }
            if (collectPin().length === 4) submitPin();
            e.preventDefault();
            return;
          }
          if (e.key === "Backspace") {
            if (input.value) {
              setDigitValue(input, "");
              e.preventDefault();
            } else if (index > 0) {
              setDigitValue(inputs[index - 1], "");
              inputs[index - 1].focus();
              e.preventDefault();
            }
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            submitPin();
          }
        });

        input.addEventListener("paste", function (e) {
          e.preventDefault();
          var text = (e.clipboardData && e.clipboardData.getData("text")) || "";
          fillFromPaste(text, index);
        });
      })(inputs[idx], idx);
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitPin();
      });
    }

    if (inputs[0]) inputs[0].focus();
  }

  function initPinProtected() {
    var snapshotUrl = window.__SNAPSHOT_URL__;
    var unlockUrl = window.__UNLOCK_URL__;
    if (!snapshotUrl || !unlockUrl) {
      showUnavailable();
      return;
    }

    var publicId = publicIdFromAccessUrl(snapshotUrl) || publicIdFromAccessUrl(unlockUrl);
    showLoading();

    fetchProtectedSnapshot(snapshotUrl, unlockUrl, function () {
      showPinForm(unlockUrl, snapshotUrl, publicId);
    })
      .then(function (data) {
        if (data) renderProtectedSnapshot(data);
      })
      .catch(function () {
        showUnavailable();
      });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    // Resolve system theme before any render
    var html = document.documentElement;
    if (html.classList.contains("theme-system")) {
      var prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      html.classList.remove("theme-system");
      html.classList.add(prefersDark ? "theme-dark" : "theme-light");
    }

    // Legacy fallback: if no theme class is present, default to light
    if (
      !html.classList.contains("theme-dark") &&
      !html.classList.contains("theme-light")
    ) {
      html.classList.add("theme-light");
    }

    var noscript = document.querySelector("#app noscript");
    if (noscript) noscript.remove();

    if (window.__ACCESS_MODE__ === "pin") {
      initPinProtected();
      return;
    }

    var url = window.__SNAPSHOT_URL__ || "snapshot.json";
    showLoading();

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(function (data) { render(data); })
      .catch(function () { showUnavailable(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
