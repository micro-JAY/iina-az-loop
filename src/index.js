// A-Z Loop — IINA Multi A-B Looper Plugin
// Saveable A-B loop slots with quick recall via Ctrl+1–0

const { core, mpv, menu, event, preferences, sidebar, console } = iina;

const STORAGE_KEY = "loops_data";

// ── State ──────────────────────────────────────────────────────

var allLoops = {};          // { [videoKey]: [{name, a, b}, ...] }
var currentVideoKey = "";
var activeLoopIndex = -1;

// Tracks a slot being created via hotkey (first press = A, second = B)
// { slotIndex: number, a: number } or null
var pendingSlot = null;

// ── Data Persistence ───────────────────────────────────────────

function loadAllLoops() {
  try {
    var raw = preferences.get(STORAGE_KEY);
    if (raw && typeof raw === "string") {
      var parsed = JSON.parse(raw);
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

function getActiveSlotCount() {
  var n = parseInt(preferences.get("activeSlots"), 10);
  if (isNaN(n) || n < 1) return 5;
  if (n > 10) return 10;
  return n;
}

// ── Time Formatting ────────────────────────────────────────────

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
    return prefix + h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + "." + ms;
  }
  return prefix + m + ":" + String(s).padStart(2, "0") + "." + ms;
}

// ── MPV Helpers ────────────────────────────────────────────────

function getLoopA() {
  var val = mpv.getString("ab-loop-a");
  if (!val || val === "no" || val === "none") return null;
  var num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function getLoopB() {
  var val = mpv.getString("ab-loop-b");
  if (!val || val === "no" || val === "none") return null;
  var num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function getCurrentTime() {
  var val = mpv.getString("time-pos");
  if (!val) return null;
  var num = parseFloat(val);
  return isNaN(num) ? null : num;
}

// ── Slot Label Helper ──────────────────────────────────────────

function slotLabel(slotIndex) {
  // Slots 0–8 → "1"–"9", slot 9 → "0"
  return slotIndex < 9 ? String(slotIndex + 1) : "0";
}

function slotKeyBinding(slotIndex) {
  return "Ctrl+" + slotLabel(slotIndex);
}

// ── Loop Operations ────────────────────────────────────────────

function activateLoop(index) {
  var loops = getCurrentLoops();
  if (index < 0 || index >= loops.length) return;

  var loop = loops[index];
  mpv.set("ab-loop-a", loop.a);
  mpv.set("ab-loop-b", loop.b);
  activeLoopIndex = index;

  var shouldJump = preferences.get("jumpToLoopStart");
  if (shouldJump !== false && shouldJump !== "false") {
    mpv.command("seek", [String(loop.a), "absolute+exact"]);
  }

  core.osd("[" + slotKeyBinding(index) + "] " + loop.name +
    " (" + formatTime(loop.a) + " → " + formatTime(loop.b) + ")");
  notifySidebar();
}

function clearLoop() {
  mpv.set("ab-loop-a", "no");
  mpv.set("ab-loop-b", "no");
  activeLoopIndex = -1;
  pendingSlot = null;
  core.osd("A-Z Loop cleared");
  notifySidebar();
}

function saveCurrentLoop(name) {
  if (!currentVideoKey) {
    core.osd("No video loaded");
    return;
  }

  var a = getLoopA();
  var b = getLoopB();

  if (a === null || b === null) {
    core.osd("Set both A and B points first");
    return;
  }
  if (a >= b) {
    core.osd("A point must be before B point");
    return;
  }

  var maxSlots = getActiveSlotCount();
  var loops = getCurrentLoops();
  if (loops.length >= maxSlots) {
    core.osd("All " + maxSlots + " slots filled for this video");
    return;
  }

  var loopName = (name && name.trim()) || ("Loop " + slotLabel(loops.length));

  if (!allLoops[currentVideoKey]) {
    allLoops[currentVideoKey] = [];
  }
  allLoops[currentVideoKey].push({ name: loopName, a: a, b: b });
  saveAllLoops();
  pendingSlot = null;
  core.osd("Saved: " + loopName + " [Slot " + slotLabel(loops.length - 1) + "]");
  notifySidebar();
}

function deleteLoop(index) {
  var loops = getCurrentLoops();
  if (index < 0 || index >= loops.length) return;

  var wasActive = activeLoopIndex === index;
  loops.splice(index, 1);

  if (loops.length === 0) {
    delete allLoops[currentVideoKey];
  }
  saveAllLoops();

  if (wasActive) {
    clearLoop();
    return;
  } else if (activeLoopIndex > index) {
    activeLoopIndex--;
  }
  notifySidebar();
}

function renameLoop(index, newName) {
  var loops = getCurrentLoops();
  if (index < 0 || index >= loops.length) return;
  if (!newName || !newName.trim()) return;

  loops[index].name = newName.trim();
  saveAllLoops();
  notifySidebar();
}

function setPointA() {
  var pos = getCurrentTime();
  if (pos === null) return;
  mpv.set("ab-loop-a", pos);
  activeLoopIndex = -1;
  pendingSlot = null;
  core.osd("A-Z Loop A: " + formatTime(pos));
  notifySidebar();
}

function setPointB() {
  var pos = getCurrentTime();
  if (pos === null) return;
  mpv.set("ab-loop-b", pos);
  activeLoopIndex = -1;
  pendingSlot = null;
  core.osd("A-Z Loop B: " + formatTime(pos));
  notifySidebar();
}

// ── 3-Press Slot Hotkey Handler ────────────────────────────────
//
// Press 1: Set A point for this slot
// Press 2: Set B point → saves the loop
// Press 3+: Activate/jump to the saved loop
//

function handleSlotKey(slotIndex) {
  if (!currentVideoKey) return;

  var maxSlots = getActiveSlotCount();
  if (slotIndex >= maxSlots) return;

  var loops = getCurrentLoops();

  // ── Case 1: Loop already exists at this slot → activate it
  if (slotIndex < loops.length) {
    pendingSlot = null;
    activateLoop(slotIndex);
    return;
  }

  // ── Can only create the next sequential slot (no gaps)
  if (slotIndex > loops.length) {
    core.osd("Fill slot " + slotLabel(loops.length) + " first");
    return;
  }

  // slotIndex === loops.length → this is the next available slot

  // ── Case 2: No pending for this slot → set A point (first press)
  if (!pendingSlot || pendingSlot.slotIndex !== slotIndex) {
    var posA = getCurrentTime();
    if (posA === null) return;

    pendingSlot = { slotIndex: slotIndex, a: posA };
    mpv.set("ab-loop-a", posA);
    mpv.set("ab-loop-b", "no");
    activeLoopIndex = -1;

    core.osd("[" + slotKeyBinding(slotIndex) + "] A: " + formatTime(posA) +
      "  — press again for B");
    notifySidebar();
    return;
  }

  // ── Case 3: Pending exists for this slot → set B point (second press)
  var posB = getCurrentTime();
  if (posB === null) return;

  if (posB <= pendingSlot.a) {
    core.osd("B must be after A (" + formatTime(pendingSlot.a) + ")");
    return;
  }

  mpv.set("ab-loop-a", pendingSlot.a);
  mpv.set("ab-loop-b", posB);

  if (!allLoops[currentVideoKey]) {
    allLoops[currentVideoKey] = [];
  }
  allLoops[currentVideoKey].push({
    name: "Loop " + slotLabel(slotIndex),
    a: pendingSlot.a,
    b: posB
  });
  saveAllLoops();

  activeLoopIndex = slotIndex;
  var savedA = pendingSlot.a;
  pendingSlot = null;

  core.osd("[" + slotKeyBinding(slotIndex) + "] Saved: " +
    formatTime(savedA) + " → " + formatTime(posB));
  notifySidebar();
}

// ── Sidebar Communication ──────────────────────────────────────

function notifySidebar() {
  sidebar.postMessage("looper-state", {
    videoKey: currentVideoKey,
    loops: getCurrentLoops(),
    activeLoopIndex: activeLoopIndex,
    currentA: getLoopA(),
    currentB: getLoopB(),
    pendingSlot: pendingSlot,
    activeSlots: getActiveSlotCount()
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

  // Register all 10 slot hotkeys: Ctrl+1 through Ctrl+9, then Ctrl+0
  for (var i = 0; i < 10; i++) {
    (function (idx) {
      menu.addItem(menu.item(
        "Loop Slot " + slotLabel(idx),
        function () { handleSlotKey(idx); },
        { keyBinding: slotKeyBinding(idx) }
      ));
    })(i);
  }

  menu.addItem(menu.separator());

  var toggleKey = preferences.get("keybind") || "Meta+l";
  menu.addItem(menu.item("Show A-Z Loop", function () {
    sidebar.show();
  }, { keyBinding: toggleKey }));

  console.log("A-Z Loop plugin loaded");
});

// ── MPV Event Listeners ────────────────────────────────────────

event.on("iina.file-loaded", function () {
  currentVideoKey = mpv.getString("filename") || "";
  activeLoopIndex = -1;
  pendingSlot = null;
  notifySidebar();
});

event.on("mpv.ab-loop-a.changed", function () {
  if (activeLoopIndex >= 0) {
    var a = getLoopA();
    var b = getLoopB();
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
  if (activeLoopIndex >= 0) {
    var a = getLoopA();
    var b = getLoopB();
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
