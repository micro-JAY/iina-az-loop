// Looper - IINA A-B Loop Plugin
// Saveable A-B loop points with quick recall via keyboard shortcuts

const { core, mpv, menu, event, preferences, sidebar, console } = iina;

const STORAGE_KEY = "loops_data";

// ── State ──────────────────────────────────────────────────────

let allLoops = {};          // { [videoKey]: [{name, a, b}, ...] }
let currentVideoKey = "";
let activeLoopIndex = -1;

// ── Data Persistence ───────────────────────────────────────────

function loadAllLoops() {
  try {
    const raw = preferences.get(STORAGE_KEY);
    if (raw && typeof raw === "string") {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.log("Failed to load loops: " + e);
  }
  return {};
}

function saveAllLoops() {
  try {
    preferences.set(STORAGE_KEY, JSON.stringify(allLoops));
  } catch (e) {
    console.log("Failed to save loops: " + e);
  }
}

function getCurrentLoops() {
  return allLoops[currentVideoKey] || [];
}

// ── Time Formatting ────────────────────────────────────────────

function formatTime(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "--:--";
  const neg = seconds < 0;
  seconds = Math.abs(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  const prefix = neg ? "-" : "";
  if (h > 0) {
    return prefix + h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + "." + ms;
  }
  return prefix + m + ":" + String(s).padStart(2, "0") + "." + ms;
}

// ── MPV Helpers ────────────────────────────────────────────────

function getLoopA() {
  const val = mpv.getString("ab-loop-a");
  if (!val || val === "no" || val === "none") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function getLoopB() {
  const val = mpv.getString("ab-loop-b");
  if (!val || val === "no" || val === "none") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function getCurrentTime() {
  const val = mpv.getString("time-pos");
  if (!val) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

// ── Loop Operations ────────────────────────────────────────────

function activateLoop(index) {
  const loops = getCurrentLoops();
  if (index < 0 || index >= loops.length) return;

  const loop = loops[index];
  mpv.set("ab-loop-a", loop.a);
  mpv.set("ab-loop-b", loop.b);
  activeLoopIndex = index;

  const shouldJump = preferences.get("jumpToLoopStart");
  if (shouldJump !== false && shouldJump !== "false") {
    mpv.command("seek", [String(loop.a), "absolute+exact"]);
  }

  core.osd("Loop: " + loop.name + " (" + formatTime(loop.a) + " → " + formatTime(loop.b) + ")");
  notifySidebar();
}

function clearLoop() {
  mpv.set("ab-loop-a", "no");
  mpv.set("ab-loop-b", "no");
  activeLoopIndex = -1;
  core.osd("Loop cleared");
  notifySidebar();
}

function saveCurrentLoop(name) {
  if (!currentVideoKey) {
    core.osd("No video loaded");
    return;
  }

  const a = getLoopA();
  const b = getLoopB();

  if (a === null || b === null) {
    core.osd("Set both A and B points first");
    return;
  }
  if (a >= b) {
    core.osd("A point must be before B point");
    return;
  }

  const maxLoops = parseInt(preferences.get("maxLoopsPerVideo"), 10) || 10;
  const loops = getCurrentLoops();
  if (loops.length >= maxLoops) {
    core.osd("Max loops (" + maxLoops + ") reached for this video");
    return;
  }

  const loopName = (name && name.trim()) || ("Loop " + (loops.length + 1));

  if (!allLoops[currentVideoKey]) {
    allLoops[currentVideoKey] = [];
  }
  allLoops[currentVideoKey].push({ name: loopName, a: a, b: b });
  saveAllLoops();
  core.osd("Saved: " + loopName);
  notifySidebar();
}

function deleteLoop(index) {
  const loops = getCurrentLoops();
  if (index < 0 || index >= loops.length) return;

  const wasActive = activeLoopIndex === index;
  loops.splice(index, 1);

  if (loops.length === 0) {
    delete allLoops[currentVideoKey];
  }
  saveAllLoops();

  if (wasActive) {
    clearLoop();
    return; // clearLoop already calls notifySidebar
  } else if (activeLoopIndex > index) {
    activeLoopIndex--;
  }
  notifySidebar();
}

function renameLoop(index, newName) {
  const loops = getCurrentLoops();
  if (index < 0 || index >= loops.length) return;
  if (!newName || !newName.trim()) return;

  loops[index].name = newName.trim();
  saveAllLoops();
  notifySidebar();
}

function setPointA() {
  const pos = getCurrentTime();
  if (pos === null) return;
  mpv.set("ab-loop-a", pos);
  activeLoopIndex = -1; // manual change breaks saved-loop association
  core.osd("Loop A: " + formatTime(pos));
  notifySidebar();
}

function setPointB() {
  const pos = getCurrentTime();
  if (pos === null) return;
  mpv.set("ab-loop-b", pos);
  activeLoopIndex = -1;
  core.osd("Loop B: " + formatTime(pos));
  notifySidebar();
}

// ── Sidebar Communication ──────────────────────────────────────

function notifySidebar() {
  sidebar.postMessage("looper-state", {
    videoKey: currentVideoKey,
    loops: getCurrentLoops(),
    activeLoopIndex: activeLoopIndex,
    currentA: getLoopA(),
    currentB: getLoopB()
  });
}

// ── Initialization ─────────────────────────────────────────────

allLoops = loadAllLoops();

event.on("iina.window-loaded", function () {

  sidebar.loadFile("src/sidebar.html");

  // ── Sidebar message handlers ──

  sidebar.onMessage("looper-init", function () {
    notifySidebar();
  });

  sidebar.onMessage("looper-set-a", function () {
    setPointA();
  });

  sidebar.onMessage("looper-set-b", function () {
    setPointB();
  });

  sidebar.onMessage("looper-save", function (data) {
    saveCurrentLoop(data ? data.name : undefined);
  });

  sidebar.onMessage("looper-activate", function (data) {
    if (data && typeof data.index === "number") {
      activateLoop(data.index);
    }
  });

  sidebar.onMessage("looper-delete", function (data) {
    if (data && typeof data.index === "number") {
      deleteLoop(data.index);
    }
  });

  sidebar.onMessage("looper-rename", function (data) {
    if (data && typeof data.index === "number" && typeof data.name === "string") {
      renameLoop(data.index, data.name);
    }
  });

  sidebar.onMessage("looper-clear", function () {
    clearLoop();
  });

  // ── Menu items ──

  menu.addItem(menu.item("Set Loop Point A", setPointA));
  menu.addItem(menu.item("Set Loop Point B", setPointB));
  menu.addItem(menu.item("Save Current Loop", function () { saveCurrentLoop(); }));
  menu.addItem(menu.item("Clear Loop", clearLoop));
  menu.addItem(menu.separator());

  for (var i = 0; i < 5; i++) {
    (function (idx) {
      menu.addItem(menu.item(
        "Activate Loop " + (idx + 1),
        function () { activateLoop(idx); },
        { keyBinding: "Ctrl+" + (idx + 1) }
      ));
    })(i);
  }

  menu.addItem(menu.separator());

  var toggleKey = preferences.get("keybind") || "Meta+l";
  menu.addItem(menu.item("Show Looper", function () {
    sidebar.show();
  }, { keyBinding: toggleKey }));

  console.log("Looper plugin loaded");
});

// ── MPV Event Listeners ────────────────────────────────────────

event.on("iina.file-loaded", function () {
  currentVideoKey = mpv.getString("filename") || "";
  activeLoopIndex = -1;
  notifySidebar();
});

event.on("mpv.ab-loop-a.changed", function () {
  // Check if externally changed loop still matches a saved loop
  var a = getLoopA();
  var b = getLoopB();
  if (activeLoopIndex >= 0) {
    var loops = getCurrentLoops();
    if (activeLoopIndex < loops.length) {
      var saved = loops[activeLoopIndex];
      if (a !== saved.a || b !== saved.b) {
        activeLoopIndex = -1;
      }
    }
  }
  notifySidebar();
});

event.on("mpv.ab-loop-b.changed", function () {
  var a = getLoopA();
  var b = getLoopB();
  if (activeLoopIndex >= 0) {
    var loops = getCurrentLoops();
    if (activeLoopIndex < loops.length) {
      var saved = loops[activeLoopIndex];
      if (a !== saved.a || b !== saved.b) {
        activeLoopIndex = -1;
      }
    }
  }
  notifySidebar();
});
