/* Purpose: Color-code crochet stitch terms while preserving the pattern text. */

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

  // Stitch definitions and default colors.
  // Add or remove entries here to customize the supported vocabulary.
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
      terms: [
        "hdc",
        "half double crochet",
        "half double crochets"
      ]
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
        "sl sts",
        "slst",
        "sl sts",
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

  // Render dynamic content as text or DOM nodes, never as pattern HTML.
  // This keeps pasted instructions from being interpreted as markup.
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildPatternMatcher() {
    const terms = [];

    stitches.forEach(function (stitch) {
      stitch.terms.forEach(function (term) {
        terms.push({
          term: term,
          stitch: stitch
        });
      });
    });

    // Match longer terms first so "single crochet" is matched before "sc".
    terms.sort(function (a, b) {
      return b.term.length - a.term.length;
    });

    const alternatives = terms.map(function (item) {
      return escapeRegExp(item.term)
        .replace(/\\ /g, "\\s+");
    });

    // Require word boundaries so "sc" won't match inside unrelated words.
    return new RegExp(
      "\\b(" + alternatives.join("|") + ")\\b",
      "gi"
    );
  }

  const patternMatcher = buildPatternMatcher();

  function findStitch(term) {
    const normalized = term.toLowerCase().replace(/\s+/g, " ");

    return stitches.find(function (stitch) {
      return stitch.terms.some(function (candidate) {
        return candidate.toLowerCase().replace(/\s+/g, " ") === normalized;
      });
    });
  }

  function getStitchColor(stitch) {
    return stitch.color;
  }

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "");

    return {
      r: parseInt(normalized.substring(0, 2), 16),
      g: parseInt(normalized.substring(2, 4), 16),
      b: parseInt(normalized.substring(4, 6), 16)
    };
  }

  function getHighlightColor(hex) {
    const rgb = hexToRgb(hex);

    return "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.17)";
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

    // Split into lines so row spacing and line breaks are preserved.
    text.split("\n").forEach(function (line) {
      const lineElement = document.createElement("div");
      lineElement.className = "crochet-line";

      let lastIndex = 0;
      let match;

      patternMatcher.lastIndex = 0;

      while ((match = patternMatcher.exec(line)) !== null) {
        // Keep all original text before the matched stitch.
        lineElement.appendChild(
          document.createTextNode(line.slice(lastIndex, match.index))
        );

        const stitch = findStitch(match[0]);

        if (stitch) {
          const span = document.createElement("span");
          span.className = "stitch";

          span.textContent = match[0];

          const color = getStitchColor(stitch);
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
        } else {
          lineElement.appendChild(
            document.createTextNode(match[0])
          );
        }

        lastIndex = match.index + match[0].length;
      }

      // Preserve all remaining punctuation, numbers, and wording.
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

      const text = document.createElement("span");
      text.textContent = stitch.label + " (" + stitch.description + ")";

      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = stitch.color;
      picker.setAttribute(
        "aria-label",
        "Color for " + stitch.description
      );

      picker.addEventListener("input", function () {
        stitch.color = picker.value;
        renderLegend();
        renderPreview();
      });

      label.append(text, picker);
      colorInputs.appendChild(label);
    });
  }

  const examplePattern = [
    "Row 1: Ch 2, 6 sc in magic ring.",
    "Row 2: Inc in each st (12).",
    "Row 3: *Sc, inc* around (18).",
    "Row 4: Ch 1, (2 sc, inc) x 6, sl st to join.",
    "Row 5: Ch 3, dc in next st, dc in next st,",
    "        (2 dc in next st) x 5, sl st to join.",
    "Row 6: Ch 2, hdc in each st around, sl st to join.",
    "Row 7: Ch 1, (hdc, dc, hdc) in next st,",
    "        (hdc, dc, hdc) x 6, sl st to join.",
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

  // Update as the user types or pastes new instructions.
  input.addEventListener("input", renderPreview);

  renderLegend();
  renderPreview();
})();