
/* Purpose: Color-code crochet stitches and their associated counts. */

(function () {
  "use strict";

  const app = document.getElementById("crochetApp");
  if (!app) return;

  const input = app.querySelector("#crochetInput");
  const preview = app.querySelector("#crochetPreview");
  const legend = app.querySelector("#crochetLegend");
  const updateButton = app.querySelector("#crochetUpdate");
  const exampleButton = app.querySelector("#crochetExample");
  const clearButton = app.querySelector("#crochetClear");
  const customizeButton = app.querySelector("#crochetCustomize");
  const colorSettings = app.querySelector("#crochetColorSettings");
  const colorInputs = app.querySelector("#crochetColorInputs");
  const resetColorsButton = app.querySelector("#crochetResetColors");
  const highlightToggle = app.querySelector("#crochetHighlight");
  const textStyle = app.querySelector("#crochetTextStyle");

  // How it works:
  // Stitch definitions control the abbreviations, descriptions, and colors.
  // Stitch counts are included in the same highlight as their stitch type.
  // Chain counts follow the abbreviation; other stitch counts precede it.

  const stitches = [
    {
      key: "ch",
      label: "ch",
      description: "Chain",
      color: "#16b8c5",
      terms: ["ch", "chain", "chains"]
    },
    {
      key: "sc",
      label: "sc",
      description: "Single crochet",
      color: "#3478f6",
      terms: ["sc", "single crochet", "single crochets"]
    },
    {
      key: "hdc",
      label: "hdc",
      description: "Half double crochet",
      color: "#f04468",
      terms: ["hdc", "half double crochet", "half double crochets"]
    },
    {
      key: "dc",
      label: "dc",
      description: "Double crochet",
      color: "#4caf50",
      terms: ["dc", "double crochet", "double crochets"]
    },
    {
      key: "tr",
      label: "tr",
      description: "Treble crochet",
      color: "#9061ed",
      terms: ["tr", "trc", "treble crochet", "treble crochets"]
    },
    {
      key: "inc",
      label: "inc",
      description: "Increase",
      color: "#ffad32",
      terms: ["inc", "increase", "increases", "increasing"]
    },
    {
      key: "dec",
      label: "dec",
      description: "Decrease",
      color: "#e84ba8",
      terms: ["dec", "decrease", "decreases", "decreasing"]
    },
    {
      key: "slst",
      label: "sl st",
      description: "Slip stitch",
      color: "#bf55e8",
      terms: [
        "sl st",
        "slst",
        "slip stitch",
        "slip stitches"
      ]
    },
    {
      key: "st",
      label: "st",
      description: "Stitch / stitch space",
      color: "#aeb9c8",
      terms: ["st", "sts", "stitch", "stitches"]
    }
  ];

  const originalColors = {};

  stitches.forEach(function (stitch) {
    originalColors[stitch.key] = stitch.color;
  });

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Match longer terms first to avoid matching abbreviations
  // inside longer stitch names.
  const termEntries = [];

  stitches.forEach(function (stitch) {
    stitch.terms.forEach(function (term) {
      termEntries.push({
        term: term,
        stitch: stitch
      });
    });
  });

  termEntries.sort(function (a, b) {
    return b.term.length - a.term.length;
  });

  const patternMatcher = new RegExp(
    "\\b(?:" +
      termEntries.map(function (entry) {
        return escapeRegExp(entry.term).replace(/\\ /g, "\\s+");
      }).join("|") +
    ")\\b",
    "gi"
  );

  function findStitch(term) {
    const normalized = term.toLowerCase().replace(/\s+/g, " ");

    return stitches.find(function (stitch) {
      return stitch.terms.some(function (candidate) {
        return candidate.toLowerCase().replace(/\s+/g, " ") === normalized;
      });
    });
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");

    return {
      r: parseInt(value.substring(0, 2), 16),
      g: parseInt(value.substring(2, 4), 16),
      b: parseInt(value.substring(4, 6), 16)
    };
  }

  function getHighlightColor(hex) {
    const rgb = hexToRgb(hex);

    return "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.17)";
  }

  // Determine the full range to highlight for each stitch.
  function getHighlightRange(line, match, stitch, lastIndex) {
    let start = match.index;
    let end = match.index + match[0].length;

    if (stitch.key === "ch") {
      // Chains use the format Ch 5 or chain 5.
      // Include the number immediately following the abbreviation.
      const following = line.slice(end).match(/^(\s+\d+)\b/);

      if (following) {
        end += following[0].length;
      }
    } else {
      // Other stitches usually use the format 16 dc or 2 sc.
      // Include the number immediately before the stitch abbreviation.
      const preceding = line.slice(0, start).match(/(\d+)\s+$/);

      if (preceding) {
        const numberStart = start - preceding[0].length;

        // Do not overlap text already rendered.
        if (numberStart >= lastIndex) {
          start = numberStart;
        }
      }
    }

    return {
      start: start,
      end: end
    };
  }

  function renderPreview() {
    const text = input.value;
    const style = textStyle.value;
    const useHighlight = highlightToggle.checked;

    preview.replaceChildren();

    if (!text.trim()) {
      const placeholder = document.createElement("p");
      placeholder.className = "preview-placeholder";
      placeholder.textContent =
        "Your color-coded instructions will appear here.";

      preview.appendChild(placeholder);
      return;
    }

    text.split("\n").forEach(function (line) {
      const lineElement = document.createElement("div");
      lineElement.className = "crochet-line";

      let lastIndex = 0;
      let match;

      patternMatcher.lastIndex = 0;

      while ((match = patternMatcher.exec(line)) !== null) {
        const stitch = findStitch(match[0]);
        if (!stitch) continue;

        const range = getHighlightRange(
          line,
          match,
          stitch,
          lastIndex
        );

        // Skip overlapping matches.
        if (range.start < lastIndex) continue;

        // Preserve all original text before the highlighted section.
        lineElement.appendChild(
          document.createTextNode(line.slice(lastIndex, range.start))
        );

        const span = document.createElement("span");
        span.className = "stitch";
        span.textContent = line.slice(range.start, range.end);

        const color = stitch.color;
        span.style.color = color;

        if (useHighlight && style !== "text") {
          span.style.backgroundColor = getHighlightColor(color);
        }

        if (style === "text") {
          span.classList.add("text-only");
        } else if (style === "highlight") {
          span.classList.add("highlight-only");
        }

        lineElement.appendChild(span);
        lastIndex = range.end;
      }

      // Preserve remaining wording, punctuation, and stitch counts.
      lineElement.appendChild(
        document.createTextNode(line.slice(lastIndex))
      );

      preview.appendChild(lineElement);
    });
  }

  function renderLegend() {
    legend.replaceChildren();

    stitches.forEach(function (stitch) {
      const item = document.createElement("div");
      item.className = "legend-item";

      const swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.backgroundColor = stitch.color;
      swatch.setAttribute("aria-hidden", "true");

      const abbreviation = document.createElement("span");
      abbreviation.className = "legend-abbreviation";
      abbreviation.textContent = stitch.label;

      const description = document.createElement("span");
      description.className = "legend-description";
      description.textContent = "(" + stitch.description + ")";

      item.append(swatch, abbreviation, description);
      legend.appendChild(item);
    });
  }

  function renderColorSettings() {
    colorInputs.replaceChildren();

    stitches.forEach(function (stitch) {
      const label = document.createElement("label");
      label.className = "color-setting";

      const name = document.createElement("span");
      name.textContent = stitch.label + " (" + stitch.description + ")";

      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = stitch.color;
      picker.setAttribute("aria-label", "Color for " + stitch.description);

      picker.addEventListener("input", function () {
        stitch.color = picker.value;
        renderLegend();
        renderPreview();
      });

      label.append(name, picker);
      colorInputs.appendChild(label);
    });
  }

  const examplePattern = [
    "Row 1: Ch 5, 6 sc in magic ring.",
    "Row 2: 2 sc in each st (12).",
    "Row 3: *1 sc, 1 inc* around (18).",
    "Row 4: Ch 1, 2 sc, 1 inc x 6, sl st to join.",
    "Row 5: Ch 3, 16 dc in next round.",
    "Row 6: Ch 2, 12 hdc in each st around, sl st to join.",
    "Row 7: Ch 1, 3 dc in next st, 2 sc in next st.",
    "Row 8: Ch 1, sc in each st around, sl st to join."
  ].join("\n");

  updateButton.addEventListener("click", renderPreview);

  exampleButton.addEventListener("click", function () {
    input.value = examplePattern;
    renderPreview();
  });

  clearButton.addEventListener("click", function () {
    input.value = "";
    renderPreview();
    input.focus();
  });

  customizeButton.addEventListener("click", function () {
    colorSettings.hidden = !colorSettings.hidden;

    if (!colorSettings.hidden) {
      renderColorSettings();
    }

    customizeButton.textContent = colorSettings.hidden
      ? "Customize Colors"
      : "Hide Color Settings";
  });

  resetColorsButton.addEventListener("click", function () {
    stitches.forEach(function (stitch) {
      stitch.color = originalColors[stitch.key];
    });

    renderColorSettings();
    renderLegend();
    renderPreview();
  });

  highlightToggle.addEventListener("change", renderPreview);
  textStyle.addEventListener("change", renderPreview);
  input.addEventListener("input", renderPreview);

  renderLegend();
  renderPreview();
})();
