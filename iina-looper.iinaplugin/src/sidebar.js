// Looper Sidebar UI
// Runs inside the IINA sidebar webview — no direct access to iina.mpv/core

// ── DOM References ─────────────────────────────────────────────

var statusText = document.getElementById("status-text");
var loopPoints = document.getElementById("loop-points");
var pointA = document.getElementById("point-a");
var pointB = document.getElementById("point-b");

var btnSetA = document.getElementById("btn-set-a");
var btnSetB = document.getElementById("btn-set-b");
var btnClear = document.getElementById("btn-clear");
var btnSave = document.getElementById("btn-save");
var loopNameInput = document.getElementById("loop-name");

var loopsList = document.getElementById("loops-list");
var emptyState = document.getElementById("empty-state");
var loopsCount = document.getElementById("loops-count");
var videoKeyText = document.getElementById("video-key");

// ── State ──────────────────────────────────────────────────────

var state = {
  videoKey: "",
  loops: [],
  activeLoopIndex: -1,
  currentA: null,
  currentB: null
};

// ── Button Handlers ────────────────────────────────────────────

btnSetA.addEventListener("click", function () {
  iina.postMessage("looper-set-a");
});

btnSetB.addEventListener("click", function () {
  iina.postMessage("looper-set-b");
});

btnClear.addEventListener("click", function () {
  iina.postMessage("looper-clear");
});

btnSave.addEventListener("click", function () {
  var name = loopNameInput.value.trim();
  iina.postMessage("looper-save", { name: name || undefined });
  loopNameInput.value = "";
});

loopNameInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    btnSave.click();
  }
});

// ── Message Handler ────────────────────────────────────────────

iina.onMessage("looper-state", function (data) {
  state = data;
  renderAll();
});

// ── Rendering ──────────────────────────────────────────────────

function renderAll() {
  renderStatus();
  renderLoopsList();
  renderVideoInfo();
}

function renderStatus() {
  var hasA = state.currentA !== null;
  var hasB = state.currentB !== null;
  var hasLoop = hasA && hasB;

  if (state.activeLoopIndex >= 0 && state.activeLoopIndex < state.loops.length) {
    var loop = state.loops[state.activeLoopIndex];
    statusText.textContent = loop.name;
    statusText.className = "status-active";
  } else if (hasLoop) {
    statusText.textContent = "Unsaved loop";
    statusText.className = "status-unsaved";
  } else if (hasA || hasB) {
    var parts = [];
    parts.push(hasA ? "A set" : "A not set");
    parts.push(hasB ? "B set" : "B not set");
    statusText.textContent = parts.join(" / ");
    statusText.className = "status-partial";
  } else {
    statusText.textContent = "No active loop";
    statusText.className = "status-inactive";
  }

  if (hasA || hasB) {
    loopPoints.style.display = "flex";
    pointA.textContent = hasA ? formatTime(state.currentA) : "--:--";
    pointB.textContent = hasB ? formatTime(state.currentB) : "--:--";
  } else {
    loopPoints.style.display = "none";
  }

  btnSave.disabled = !hasLoop;
  btnClear.disabled = !hasA && !hasB;
}

function renderLoopsList() {
  // Remove existing loop items but keep the empty-state element
  var items = loopsList.querySelectorAll(".loop-item");
  for (var i = 0; i < items.length; i++) {
    items[i].remove();
  }

  var loops = state.loops || [];
  loopsCount.textContent = String(loops.length);

  if (loops.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  for (var i = 0; i < loops.length; i++) {
    var el = createLoopItem(loops[i], i);
    loopsList.appendChild(el);
  }
}

function createLoopItem(loop, index) {
  var item = document.createElement("div");
  item.className = "loop-item" + (index === state.activeLoopIndex ? " active" : "");

  // Badge (1-based index, shows shortcut hint for 1-5)
  var badge = document.createElement("span");
  badge.className = "loop-badge";
  badge.textContent = String(index + 1);
  if (index < 5) {
    badge.title = "Ctrl+" + (index + 1);
  }

  // Content area
  var content = document.createElement("div");
  content.className = "loop-content";

  var nameRow = document.createElement("div");
  nameRow.style.display = "flex";
  nameRow.style.alignItems = "center";
  nameRow.style.gap = "4px";

  var nameSpan = document.createElement("span");
  nameSpan.className = "loop-name";
  nameSpan.textContent = loop.name;

  nameRow.appendChild(nameSpan);

  // Show keyboard shortcut hint for first 5 loops
  if (index < 5) {
    var hint = document.createElement("span");
    hint.className = "shortcut-hint";
    hint.textContent = "^" + (index + 1);
    nameRow.appendChild(hint);
  }

  var timeSpan = document.createElement("span");
  timeSpan.className = "loop-time";
  timeSpan.textContent = formatTime(loop.a) + " \u2192 " + formatTime(loop.b);

  content.appendChild(nameRow);
  content.appendChild(timeSpan);

  // Action buttons (visible on hover)
  var actions = document.createElement("span");
  actions.className = "loop-actions";

  var renameBtn = document.createElement("button");
  renameBtn.className = "btn-icon";
  renameBtn.textContent = "Rename";
  renameBtn.title = "Rename loop";
  renameBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    startInlineRename(item, nameSpan, index, loop.name);
  });

  var deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-icon btn-icon-danger";
  deleteBtn.textContent = "\u00D7"; // × character
  deleteBtn.title = "Delete loop";
  deleteBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    iina.postMessage("looper-delete", { index: index });
  });

  actions.appendChild(renameBtn);
  actions.appendChild(deleteBtn);

  // Assemble
  item.appendChild(badge);
  item.appendChild(content);
  item.appendChild(actions);

  // Click to activate
  item.addEventListener("click", function () {
    iina.postMessage("looper-activate", { index: index });
  });

  return item;
}

function renderVideoInfo() {
  videoKeyText.textContent = state.videoKey || "No video loaded";
}

// ── Inline Rename ──────────────────────────────────────────────

function startInlineRename(item, nameSpan, index, currentName) {
  // Replace name span with an input
  var input = document.createElement("input");
  input.type = "text";
  input.className = "rename-input";
  input.value = currentName;

  nameSpan.style.display = "none";
  nameSpan.parentNode.insertBefore(input, nameSpan.nextSibling);
  input.focus();
  input.select();

  var committed = false;

  function commit() {
    if (committed) return;
    committed = true;
    var newName = input.value.trim();
    if (newName && newName !== currentName) {
      iina.postMessage("looper-rename", { index: index, name: newName });
    }
    // Restore name span
    if (input.parentNode) {
      input.remove();
    }
    nameSpan.style.display = "";
  }

  function cancel() {
    if (committed) return;
    committed = true;
    if (input.parentNode) {
      input.remove();
    }
    nameSpan.style.display = "";
  }

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  });

  input.addEventListener("blur", function () {
    commit();
  });

  // Prevent item click from firing while renaming
  input.addEventListener("click", function (e) {
    e.stopPropagation();
  });
}

// ── Utilities ──────────────────────────────────────────────────

function formatTime(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "--:--";
  var neg = seconds < 0;
  seconds = Math.abs(seconds);
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = Math.floor(seconds % 60);
  var ms = Math.floor((seconds % 1) * 10);
  var prefix = neg ? "-" : "";
  if (h > 0) {
    return prefix + h + ":" + pad(m) + ":" + pad(s) + "." + ms;
  }
  return prefix + m + ":" + pad(s) + "." + ms;
}

function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

// ── Visibility Tracking ────────────────────────────────────────

document.addEventListener("visibilitychange", function () {
  iina.postMessage("looper-visibility", !document.hidden);
  if (!document.hidden) {
    iina.postMessage("looper-init");
  }
});

// ── Init ───────────────────────────────────────────────────────

iina.postMessage("looper-init");
