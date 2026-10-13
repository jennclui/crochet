
/* Purpose: Organize crochet instructions and color-code stitches and counts. */

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

  // Stitch definitions, labels, and default colors.
  // Add or modify entries here to customize stitch recognition.

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
      terms: ["sl st", "slst", "slip stitch", "slip stitches"]
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

  // Build a matcher with longer terms first.
  // Word boundaries prevent abbreviations matching inside unrelated words.

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

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

  const stitchMatcher = new RegExp(
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

  function getHighlightColor(hex) {
    const value = hex.replace("#", "");
    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);

    return "rgba(" + r + ", " + g + ", " + b + ", 0.17)";
  }

  // Highlight a stitch count together with its stitch abbreviation.
  // Chains use "Ch 5"; other stitches use "16 dc".

  function getHighlightRange(line, match, stitch, lastIndex) {
    let start = match.index;
    let end = match.index + match[0].length;

    if (stitch.key === "ch") {
      const following = line.slice(end).match(/^(\s+\d+)\b/);

      if (following) {
        end += following[0].length;
      }
    } else {
      const preceding = line.slice(0, start).match(/(\d+)\s+$/);

      if (preceding) {
        const numberStart = start - preceding[0].length;

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

  // Safely render text and apply stitch colors.
  // Pasted instructions are treated as plain text, never as HTML.

  function appendColoredText(container, text) {
    let lastIndex = 0;
    let match;

    stitchMatcher.lastIndex = 0;

    while ((match = stitchMatcher.exec(text)) !== null) {
      const stitch = findStitch(match[0]);
      if (!stitch) continue;

      const range = getHighlightRange(
        text,
        match,
        stitch,
        lastIndex
      );

      if (range.start < lastIndex) continue;

      container.appendChild(
        document.createTextNode(text.slice(lastIndex, range.start))
      );

      const span = document.createElement("span");
      span.className = "stitch";
      span.textContent = text.slice(range.start, range.end);

      const color = stitch.color;
      span.style.color = color;

      if (highlightToggle.checked && textStyle.value !== "text") {
        span.style.backgroundColor = getHighlightColor(color);
      }

      if (textStyle.value === "text") {
        span.classList.add("text-only");
      } else if (textStyle.value === "highlight") {
        span.classList.add("highlight-only");
      }

      container.appendChild(span);
      lastIndex = range.end;
    }

    container.appendChild(
      document.createTextNode(text.slice(lastIndex))
    );
  }

  // Split comma-separated instructions while retaining the commas.
  // The caller decides whether each line belongs to a repeat group.

  function splitInstructions(text) {
    return text.split(/,(?!$)/).map(function (part, index, parts) {
      return index < parts.length - 1 ? part + "," : part;
    });
  }

  function appendInstruction(container, text) {
    if (!text.trim()) {
      return;
    }

    const instruction = document.createElement("div");
    instruction.className = "crochet-instruction";

    appendColoredText(instruction, text.trim());
    container.appendChild(instruction);
  }

  // Render ordinary instructions and visually group repeat markers.
  // Both *...* and **...** are supported.

  function appendBody(container, text) {
    const repeatMatcher = /(\*\*?)([\s\S]*?)\1/g;

    let lastIndex = 0;
    let match;

    while ((match = repeatMatcher.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);

      splitInstructions(before).forEach(function (part) {
        appendInstruction(container, part);
      });

      const repeat = document.createElement("div");
      repeat.className = "crochet-repeat";

      const label = document.createElement("div");
      label.className = "crochet-repeat-label";
      label.textContent = "Repeat";

      repeat.appendChild(label);

      splitInstructions(match[2]).forEach(function (part) {
        appendInstruction(repeat, part);
      });

      container.appendChild(repeat);
      lastIndex = match.index + match[0].length;
    }

    const remaining = text.slice(lastIndex);

    splitInstructions(remaining).forEach(function (part) {
      appendInstruction(container, part);
    });
  }

  // Recognize round, rnd, and row headings.
  // Each heading creates a separate container for its instructions.

  function renderPreview() {
    preview.replaceChildren();

    const text = input.value;

    if (!text.trim()) {
      const placeholder = document.createElement("p");
      placeholder.className = "preview-placeholder";
      placeholder.textContent =
        "Your color-coded instructions will appear here.";

      preview.appendChild(placeholder);
      return;
    }

    const lines = text.split("\n");
    let currentRoundBody = null;

    lines.forEach(function (line) {
      const headingMatch = line.match(
        /^\s*((?:round|rnd|row)\s*\.?\s*\d+[a-z]?)\s*:\s*/i
      );

      if (headingMatch) {
        const round = document.createElement("section");
        round.className = "crochet-round";

        const heading = document.createElement("div");
        heading.className = "crochet-round-heading";
        heading.textContent = headingMatch[1];

        currentRoundBody = document.createElement("div");
        currentRoundBody.className = "crochet-round-body";

        round.append(heading, currentRoundBody);
        preview.appendChild(round);

        appendBody(
          currentRoundBody,
          line.slice(headingMatch[0].length)
        );

        return;
      }

      if (currentRoundBody) {
        appendBody(currentRoundBody, line);
      } else if (line.trim()) {
        const intro = document.createElement("div");
        intro.className = "crochet-line";

        appendBody(intro, line);
        preview.appendChild(intro);
      }
    });
  }

  // Build the stitch color legend.

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

  // Build the customizable color picker controls.

  function renderColorSettings() {
    colorInputs.replaceChildren();

    stitches.forEach(function (stitch) {
      const label = document.createElement("label");
      label.className = "color-setting";

      const name = document.createElement("span");
      name.textContent =
        stitch.label + " (" + stitch.description + ")";

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

      label.append(name, picker);
      colorInputs.appendChild(label);
    });
  }

  // Example pattern for testing all grouping and highlighting features.

  const examplePattern = [
    "Rnd 1: Ch 5, 6 sc in magic ring.",
    "Rnd 2: 2 sc in each st (12).",
    "Rnd 3: *2 sc, inc* around (18).",
    "Rnd 4: Ch 1, *2 sc, inc* x 6, sl st to join.",
    "Rnd 5: Ch 3, 16 dc in next round.",
    "Rnd 6: Ch 2, 12 hdc in each st around, sl st to join.",
    "Rnd 7: Ch 1, **3 dc, 2 sc** repeat 6 times.",
    "Rnd 8: Ch 1, sc in each st around, sl st to join."
  ].join("\n");

  // Button and input events.

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

  // Initial render.

  renderLegend();
  renderPreview();
})();
