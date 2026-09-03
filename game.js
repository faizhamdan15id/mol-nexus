/* ============================================================
   MOL-NEXUS GAME CONTROLLER
   Version 2.1
   Multiplayer + Supabase + Multi-Step Diagnostic Gameplay
   ============================================================ */


/* ============================================================
   1. SUPABASE CONFIG
   ============================================================ */

const SUPABASE_URL = "https://snlpdwqdjfnborsorspd.supabase.co";
const SUPABASE_KEY = "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* ============================================================
   2. URL / PLAYER DATA
   ============================================================ */

const urlParams = new URLSearchParams(window.location.search);

const student =
  urlParams.get("student") ||
  localStorage.getItem("molNexusStudent") ||
  "";

const room =
  urlParams.get("room") ||
  localStorage.getItem("molNexusRoom") ||
  "";

if (student) {
  localStorage.setItem("molNexusStudent", student);
}

if (room) {
  localStorage.setItem("molNexusRoom", room);
}


/* ============================================================
   3. DOM
   ============================================================ */

const gameRoom = document.getElementById("gameRoom");
const gameStudent = document.getElementById("gameStudent");
const gameEnergy = document.getElementById("gameEnergy");
const sideEnergy = document.getElementById("sideEnergy");
const crystalCount = document.getElementById("crystalCount");

const gamePlayersList =
  document.getElementById("gamePlayersList");

const currentPlayerName =
  document.getElementById("currentPlayerName");

const turnStatus =
  document.getElementById("turnStatus");

const gameMessage =
  document.getElementById("gameMessage");

const caseZone =
  document.getElementById("caseZone");

const caseTitle =
  document.getElementById("caseTitle");

const caseDifficulty =
  document.getElementById("caseDifficulty");

const caseQuestion =
  document.getElementById("caseQuestion");

const selectedPathElement =
  document.getElementById("selectedPath");

const calculationAnswer =
  document.getElementById("calculationAnswer");

const unitAnswer =
  document.getElementById("unitAnswer");

const hintButton =
  document.getElementById("hintButton");

const submitCaseButton =
  document.getElementById("submitCaseButton");

const caseFeedback =
  document.getElementById("caseFeedback");


/* ============================================================
   4. GAME STATE
   ============================================================ */

let currentPlayer = null;
let currentQuestion = null;

// =============================================
// RESEARCH / DIAGNOSTIC IDENTIFIERS
// =============================================

let currentStudentId = null;
let currentSessionId = null;
let selectedPath = [];
let selectedFormulas = [];

let hintCount = 0;
let questionStartTime = null;


/* ============================================================
   5. UTILITIES
   ============================================================ */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getPlayerName(player) {
  if (!player) return "";

  return (
    player.student_name ||
    player.player_name ||
    player.name ||
    ""
  );
}


/* ============================================================
   6. BASIC DATA
   ============================================================ */

function renderBasicData() {

  if (gameRoom) {
    gameRoom.textContent = room || "----";
  }

  if (gameStudent) {
    gameStudent.textContent =
      student
        ? student.toUpperCase()
        : "PLAYER";
  }
}


/* ============================================================
   7. LOAD ROOM
   ============================================================ */

async function loadGameRoom() {

  if (!room) return null;

  const { data, error } =
    await supabaseClient
      .from("game_rooms")
      .select("*")
      .eq("room_code", room)
      .maybeSingle();

  if (error) {

    console.error(
      "LOAD GAME ROOM ERROR:",
      error
    );

    if (gameMessage) {
      gameMessage.textContent =
        "Gagal membaca data room.";
    }

    return null;
  }

  if (!data) {

    if (gameMessage) {
      gameMessage.textContent =
        "Room tidak ditemukan.";
    }

    return null;
  }

  if (
    String(data.status || "")
      .toUpperCase() === "PLAYING"
  ) {

    if (gameMessage) {
      gameMessage.textContent =
        "Nexus synchronized. Game is active.";
    }

    if (turnStatus) {
      turnStatus.textContent =
        "NEXUS ACTIVE";
    }

  } else {

    if (gameMessage) {
      gameMessage.textContent =
        "Waiting for Nexus activation.";
    }
  }

  return data;
}


/* ============================================================
   8. LOAD PLAYERS
   ============================================================ */

async function loadGamePlayers() {

  if (!room) return [];

  const { data: players, error } =
    await supabaseClient
      .from("room_players")
      .select("*")
      .eq("room_code", room)
      .order(
        "player_slot",
        { ascending: true }
      );

  if (error) {

    console.error(
      "LOAD PLAYERS ERROR:",
      error
    );

    if (gameMessage) {
      gameMessage.textContent =
        "Gagal membaca data pemain.";
    }

    return [];
  }

  const safePlayers =
    players || [];

  renderPlayers(safePlayers);
  findCurrentPlayer(safePlayers);

  return safePlayers;
}


/* ============================================================
   9. RENDER PLAYERS
   ============================================================ */

function renderPlayers(players) {

  if (!gamePlayersList) return;

  const colors = [
    "cyan",
    "purple",
    "green",
    "orange"
  ];

  let html = "";

  for (
    let slot = 1;
    slot <= 4;
    slot++
  ) {

    const player =
      players.find(
        item =>
          Number(item.player_slot) === slot
      );

    const playerName =
      player
        ? getPlayerName(player)
        : "WAITING...";

    const ready =
      player?.is_ready === true;

    html += `
      <div class="game-player-card">

        <div class="game-player-avatar ${colors[slot - 1]}">
          ${String(slot).padStart(2, "0")}
        </div>

        <div class="game-player-info">

          <strong>
            ${escapeHTML(
              playerName || "WAITING..."
            )}
          </strong>

          <small>
            ${
              player
                ? (
                    ready
                      ? "NEXUS EXPLORER • READY"
                      : "NEXUS EXPLORER"
                  )
                : "WAITING FOR PLAYER"
            }
          </small>

        </div>

      </div>
    `;
  }

  gamePlayersList.innerHTML = html;
}


/* ============================================================
   10. CURRENT PLAYER
   ============================================================ */

function findCurrentPlayer(players) {

  if (!student) return;

  const target =
    normalizeText(student);

  currentPlayer =
    players.find(player => {

      return (
        normalizeText(
          getPlayerName(player)
        ) === target
      );

    }) || null;

  if (!currentPlayer) {

    if (currentPlayerName) {
      currentPlayerName.textContent =
        student.toUpperCase();
    }

    return;
  }

  renderCurrentPlayer();
}
async function ensureStudentRecord() {
  if (!currentPlayer) {
    console.warn("STUDENT RECORD: currentPlayer belum tersedia.");
    return null;
  }

  const playerId =
    currentPlayer.id ??
    currentPlayer.player_slot;

  if (playerId === null || playerId === undefined) {
    console.error("STUDENT RECORD: ID pemain tidak ditemukan.");
    return null;
  }

  const displayName =
    getPlayerName(currentPlayer) ||
    student ||
    `PLAYER ${playerId}`;

  const studentCode =
    `${String(room).trim().toUpperCase()}-P${playerId}`;

  try {
    // Cari dulu berdasarkan student_code
    const { data: existingStudent, error: findError } =
      await supabaseClient
        .from("students")
        .select("student_id, student_code, display_name")
        .eq("student_code", studentCode)
        .maybeSingle();

    if (findError) {
      console.error(
        "FIND STUDENT ERROR:",
        findError
      );
      return null;
    }

    if (existingStudent) {
      currentStudentId =
        existingStudent.student_id;

      console.log(
        "STUDENT FOUND:",
        existingStudent
      );

      return existingStudent;
    }

    // Belum ada → buat student baru
    const { data: newStudent, error: insertError } =
      await supabaseClient
        .from("students")
        .insert({
          student_code: studentCode,
          display_name: displayName,
          username: displayName
        })
        .select(
          "student_id, student_code, display_name"
        )
        .single();

    if (insertError) {
      console.error(
        "CREATE STUDENT ERROR:",
        insertError
      );
      return null;
    }

    currentStudentId =
      newStudent.student_id;

    console.log(
      "STUDENT CREATED:",
      newStudent
    );

    return newStudent;

  } catch (error) {
    console.error(
      "ENSURE STUDENT RECORD ERROR:",
      error
    );

    return null;
  }
  }
/* =========================================================
   GAME SESSION
   Memastikan setiap room memiliki session aktif
========================================================= */

async function ensureGameSession() {
  if (!room) {
    console.warn("GAME SESSION: room belum tersedia.");
    return null;
  }

  try {
    // Cari session aktif untuk room ini
    const { data: existingSessions, error: findError } =
      await supabaseClient
        .from("game_sessions")
        .select("session_id, room_code, status, created_at")
        .eq("room_code", room)
        .in("status", ["WAITING", "PLAYING"])
        .order("created_at", { ascending: false })
        .limit(1);

    if (findError) {
      console.error(
        "FIND GAME SESSION ERROR:",
        findError
      );
      return null;
    }

    if (
      Array.isArray(existingSessions) &&
      existingSessions.length > 0
    ) {
      currentSessionId =
        existingSessions[0].session_id;

      console.log(
        "GAME SESSION FOUND:",
        existingSessions[0]
      );

      return existingSessions[0];
    }

    // Belum ada session → buat session baru
    const { data: newSession, error: insertError } =
      await supabaseClient
        .from("game_sessions")
        .insert({
          room_code: room,
          status: "PLAYING",
          started_at: new Date().toISOString()
        })
        .select(
          "session_id, room_code, status, created_at"
        )
        .single();

    if (insertError) {
      console.error(
        "CREATE GAME SESSION ERROR:",
        insertError
      );
      return null;
    }

    currentSessionId =
      newSession.session_id;

    console.log(
      "GAME SESSION CREATED:",
      newSession
    );

    return newSession;

  } catch (error) {
    console.error(
      "ENSURE GAME SESSION ERROR:",
      error
    );

    return null;
  }
}
function renderCurrentPlayer() {

  if (!currentPlayer) return;

  const name =
    getPlayerName(currentPlayer);

  const energy =
    Number(
      currentPlayer.nexus_energy || 0
    );

  if (currentPlayerName) {
    currentPlayerName.textContent =
      name.toUpperCase();
  }

  if (gameStudent) {
    gameStudent.textContent =
      name.toUpperCase();
  }

  if (gameEnergy) {
    gameEnergy.textContent =
      energy;
  }

  if (sideEnergy) {
    sideEnergy.textContent =
      energy;
  }

  renderCrystals(currentPlayer);
}


/* ============================================================
   11. CRYSTALS
   ============================================================ */

function renderCrystals(player) {

  const crystalMap = [

    {
      id: "massCrystal",
      fields: [
        "mass_crystal",
        "crystal_mass"
      ]
    },

    {
      id: "particleCrystal",
      fields: [
        "particle_crystal",
        "crystal_particle"
      ]
    },

    {
      id: "gasCrystal",
      fields: [
        "gas_crystal",
        "crystal_gas"
      ]
    },

    {
      id: "solutionCrystal",
      fields: [
        "solution_crystal",
        "crystal_solution"
      ]
    }

  ];

  let total = 0;

  crystalMap.forEach(item => {

    const element =
      document.getElementById(item.id);

    const collected =
      item.fields.some(
        field =>
          player[field] === true
      );

    if (collected) {

      total++;

      element?.classList.add(
        "collected"
      );

    } else {

      element?.classList.remove(
        "collected"
      );
    }
  });

  if (crystalCount) {
    crystalCount.textContent =
      total;
  }
}


/* ============================================================
   12. PATH BUILDER
   ============================================================ */

function initializePathBuilder() {

  document
    .querySelectorAll(".path-block")
    .forEach(button => {

      button.addEventListener(
        "click",
        function() {

          const value =
            this.dataset.path;

          if (!value) return;

          /*
             Satu node tidak boleh masuk
             dua kali pada path yang sama.
          */

          if (
            selectedPath.includes(value)
          ) {

            const index =
              selectedPath.indexOf(value);

            selectedPath =
              selectedPath.slice(
                0,
                index
              );

          } else {

            selectedPath.push(value);
          }

          renderSelectedPath();
          renderPathSelection();
        }
      );
    });
}


function renderSelectedPath() {

  if (!selectedPathElement) return;

  if (
    selectedPath.length === 0
  ) {

    selectedPathElement.textContent =
      "PATH: —";

    return;
  }

  selectedPathElement.textContent =
    "PATH: " +
    selectedPath.join(" → ");
}


function renderPathSelection() {

  document
    .querySelectorAll(".path-block")
    .forEach(button => {

      const value =
        button.dataset.path;

      if (
        selectedPath.includes(value)
      ) {

        button.classList.add(
          "selected"
        );

      } else {

        button.classList.remove(
          "selected"
        );
      }
    });
}


function resetPath() {

  selectedPath = [];

  document
    .querySelectorAll(".path-block")
    .forEach(button => {

      button.classList.remove(
        "selected"
      );
    });

  renderSelectedPath();
}


/* ============================================================
   13. FORMULA LIBRARY
   ============================================================ */

const FORMULA_LIBRARY = [

  {
    id: "MASS_TO_MOL",
    label: "n = m / Mr"
  },

  {
    id: "MOL_TO_MASS",
    label: "m = n × Mr"
  },

  {
    id: "MOL_TO_PARTICLE",
    label: "N = n × NA"
  },

  {
    id: "PARTICLE_TO_MOL",
    label: "n = N / NA"
  },

  {
    id: "GAS_TO_MOL",
    label: "n = V / 22.4"
  },

  {
    id: "MOL_TO_GAS",
    label: "V = n × 22.4"
  },

  {
    id: "SOLUTION_TO_MOL",
    label: "n = M × V"
  },

  {
    id: "MOL_TO_SOLUTION",
    label: "M = n / V"
  },

  {
    id: "SOLUTION_VOLUME",
    label: "V = n / M"
  },

  {
    id: "ML_TO_L",
    label: "V(L) = V(mL) / 1000"
  }

];


/* ============================================================
   14. FORMULA DISPLAY AREA
   ============================================================ */

function getFormulaDisplayElement() {

  let element =
    document.getElementById(
      "selectedFormulaPath"
    );

  if (element) {
    return element;
  }

  const builder =
    document.getElementById(
      "formulaBuilder"
    );

  if (!builder) {
    return null;
  }

  element =
    document.createElement("div");

  element.id =
    "selectedFormulaPath";

  element.className =
    "selected-formula-path";

  element.style.marginTop =
    "16px";

  element.style.fontSize =
    "14px";

  element.style.lineHeight =
    "1.7";

  element.style.color =
    "#25d9e8";

  builder.insertAdjacentElement(
    "afterend",
    element
  );

  return element;
}


function renderSelectedFormulas() {

  const element =
    getFormulaDisplayElement();

  if (!element) return;

  if (
    selectedFormulas.length === 0
  ) {

    element.textContent =
      "FORMULA: —";

    return;
  }

  const labels =
    selectedFormulas.map(
      formulaId => {

        const formula =
          FORMULA_LIBRARY.find(
            item =>
              item.id === formulaId
          );

        return formula
          ? formula.label
          : formulaId;
      }
    );

  element.textContent =
    "FORMULA: " +
    labels.join(" → ");
}


/* ============================================================
   15. RENDER FORMULA BUTTONS
   ============================================================ */

function renderDynamicFormulaBuilder() {

  const builder =
    document.getElementById(
      "formulaBuilder"
    );

  if (!builder) {

    console.warn(
      "formulaBuilder element not found"
    );

    return;
  }

  /*
     Tombol diacak agar siswa tidak
     menghafal posisi jawaban.
  */

  const shuffled =
    [...FORMULA_LIBRARY]
      .sort(
        () =>
          Math.random() - 0.5
      );

  builder.innerHTML =
    shuffled.map(item => {

      return `
        <button
          type="button"
          class="formula-block"
          data-formula="${escapeHTML(item.id)}"
        >
          ${escapeHTML(item.label)}
        </button>
      `;

    }).join("");

  renderSelectedFormulas();
}


/* ============================================================
   16. FORMULA BUILDER — MULTI STEP
   ============================================================ */

function initializeFormulaBuilder() {

  /*
     Event delegation dipasang ke document.
     Dengan cara ini tombol formula yang
     dibuat ulang secara dinamis tetap
     dapat diklik.
  */

  document.addEventListener(
    "click",
    function(event) {

      const button =
        event.target.closest(
          ".formula-block"
        );

      if (!button) return;

      const formulaId =
        button.dataset.formula;

      if (!formulaId) return;


      const existingIndex =
        selectedFormulas.indexOf(
          formulaId
        );


      /*
         Jika belum dipilih:
         masukkan ke urutan terakhir.
      */

      if (existingIndex === -1) {

        selectedFormulas.push(
          formulaId
        );

      } else {

        /*
           Jika ditekan lagi:
           hapus formula tersebut dan
           formula sesudahnya.

           Contoh:
           1 → 2 → 3

           Tekan 2 lagi:
           menjadi 1.
        */

        selectedFormulas =
          selectedFormulas.slice(
            0,
            existingIndex
          );
      }


      renderFormulaSelection();
      renderSelectedFormulas();


      console.log(
        "FORMULA PATH:",
        selectedFormulas
      );
    }
  );
}


function renderFormulaSelection() {

  document
    .querySelectorAll(
      ".formula-block"
    )
    .forEach(button => {

      const formulaId =
        button.dataset.formula;

      const index =
        selectedFormulas.indexOf(
          formulaId
        );

      if (index >= 0) {

        button.classList.add(
          "selected"
        );

        button.setAttribute(
          "data-step",
          String(index + 1)
        );

      } else {

        button.classList.remove(
          "selected"
        );

        button.removeAttribute(
          "data-step"
        );
      }
    });
}


function resetFormula() {

  selectedFormulas = [];

  document
    .querySelectorAll(
      ".formula-block"
    )
    .forEach(button => {

      button.classList.remove(
        "selected"
      );

      button.removeAttribute(
        "data-step"
      );
    });

  renderSelectedFormulas();
}


/* ============================================================
   17. NORMALIZE PATH
   ============================================================ */

function normalizePath(value) {

  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {

    return value
      .map(item =>
        String(item)
          .trim()
          .toUpperCase()
      )
      .join(">");
  }

  /*
     expected_path dari Supabase dapat
     berupa JSON string.
  */

  const text =
    String(value).trim();

  try {

    const parsed =
      JSON.parse(text);

    if (Array.isArray(parsed)) {

      return parsed
        .map(item =>
          String(item)
            .trim()
            .toUpperCase()
        )
        .join(">");
    }

  } catch (error) {
    // bukan JSON — lanjut normalisasi biasa
  }

  return text
    .replaceAll("→", ">")
    .replaceAll("↔", ">")
    .replace(/[\[\]"']/g, "")
    .replaceAll(",", ">")
    .replace(/\s+/g, "")
    .toUpperCase();
}


/* ============================================================
   18. EVALUATE PATH
   ============================================================ */

function evaluatePath() {

  if (!currentQuestion) {
    return null;
  }

  const expected =
    currentQuestion.expected_path ||
    currentQuestion.correct_path;

  if (!expected) {
    return null;
  }

  return (
    normalizePath(selectedPath) ===
    normalizePath(expected)
  );
}


/* ============================================================
   19. NORMALIZE FORMULA
   ============================================================ */

function normalizeFormula(value) {

  let text =
    String(value ?? "")
      .trim()
      .toLowerCase();

  text = text
    .replace(/\s+/g, "")
    .replace(/[×x]/g, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".")
    .replace(/₂/g, "2")
    .replace(/₃/g, "3");

  /*
     Database menggunakan Vm,
     sedangkan UI menggunakan 22.4.
     Keduanya dianggap hubungan
     yang sama untuk gas STP.
  */

  text = text
    .replace(
      "n=v/vm",
      "n=v/22.4"
    )
    .replace(
      "v=n*vm",
      "v=n*22.4"
    );

  return text;
}


function splitExpectedFormulas(value) {

  if (!value) return [];

  if (Array.isArray(value)) {

    return value
      .map(item =>
        String(item).trim()
      )
      .filter(Boolean);
  }

  return String(value)
    .split(/[;|]+/)
    .map(item =>
      item.trim()
    )
    .filter(Boolean);
}


function formulaIdToLabel(id) {

  const formula =
    FORMULA_LIBRARY.find(
      item =>
        item.id === id
    );

  return formula
    ? formula.label
    : "";
}


/* ============================================================
   20. EVALUATE FORMULA SEQUENCE
   ============================================================ */

function evaluateFormula() {

  if (!currentQuestion) {
    return null;
  }

  const expected =
    currentQuestion.expected_formula ||
    currentQuestion.correct_formula;

  if (!expected) {
    return null;
  }

  if (
    selectedFormulas.length === 0
  ) {
    return false;
  }

  const expectedParts =
    splitExpectedFormulas(
      expected
    );

  if (
    selectedFormulas.length !==
    expectedParts.length
  ) {

    return false;
  }

  for (
    let i = 0;
    i < expectedParts.length;
    i++
  ) {

    const selectedLabel =
      formulaIdToLabel(
        selectedFormulas[i]
      );

    if (
      normalizeFormula(
        selectedLabel
      ) !==
      normalizeFormula(
        expectedParts[i]
      )
    ) {

      return false;
    }
  }

  return true;
}


/* ============================================================
   21. CALCULATION
   ============================================================ */

function evaluateCalculation() {

  if (!currentQuestion) {
    return null;
  }

  const expected =
    Number(
      currentQuestion.correct_answer
    );

  if (
    !Number.isFinite(expected)
  ) {

    return null;
  }

  const raw =
    String(
      calculationAnswer?.value ?? ""
    )
      .trim()
      .replace(",", ".");

  if (!raw) {
    return false;
  }

  const answer =
    Number(raw);

  if (
    !Number.isFinite(answer)
  ) {

    return false;
  }

  const databaseTolerance =
    Number(
      currentQuestion.answer_tolerance
    );

  const tolerance =
    Number.isFinite(
      databaseTolerance
    ) &&
    databaseTolerance >= 0

      ? databaseTolerance

      : Math.max(
          Math.abs(expected) * 0.01,
          0.000001
        );

  return (
    Math.abs(
      answer - expected
    ) <= tolerance
  );
}


/* ============================================================
   22. UNIT
   ============================================================ */

function normalizeUnit(value) {

  const text =
    String(value ?? "")
      .trim()
      .toLowerCase();

  const aliases = {

    "m": "molar",
    "mol/l": "molar",
    "mol·l-1": "molar",
    "mol·l⁻¹": "molar",
    "mol l-1": "molar",

    "molekul": "molekul",
    "molecule": "molekul",
    "molecules": "molekul",

    "partikel": "partikel",
    "particle": "partikel",
    "particles": "partikel",

    "liter": "l",
    "litre": "l",

    "milliliter": "ml",
    "millilitre": "ml"

  };

  return aliases[text] || text;
}


function evaluateUnit() {

  if (!currentQuestion) {
    return null;
  }

  const expected =
    currentQuestion.correct_unit;

  if (!expected) {
    return null;
  }

  const answer =
    unitAnswer?.value || "";

  return (
    normalizeUnit(answer) ===
    normalizeUnit(expected)
  );
}


/* ============================================================
   23. FIRST FAILURE POINT
   ============================================================ */

function determineErrorType(
  pathCorrect,
  formulaCorrect,
  calculationCorrect,
  unitCorrect
) {

  if (pathCorrect === false) {
    return "PATH_ERROR";
  }

  if (formulaCorrect === false) {
    return "FORMULA_ERROR";
  }

  if (
    calculationCorrect === false
  ) {
    return "CALCULATION_ERROR";
  }

  if (unitCorrect === false) {
    return "UNIT_ERROR";
  }

  return "NONE";
}


/* ============================================================
   24. FINAL CORRECT
   ============================================================ */

function determineFinalCorrect(
  pathCorrect,
  formulaCorrect,
  calculationCorrect,
  unitCorrect
) {

  const checks = [
    pathCorrect,
    formulaCorrect,
    calculationCorrect,
    unitCorrect
  ].filter(
    value =>
      value !== null
  );

  if (
    checks.length === 0
  ) {
    return false;
  }

  return checks.every(
    value =>
      value === true
  );
}


/* ============================================================
   25. LOAD QUESTION
   ============================================================ */

async function loadQuestion() {

  const { data, error } =
    await supabaseClient
      .from("questions")
      .select("*")
      .eq("active", true)
      .limit(100);

  if (error) {

    console.error(
      "QUESTION ERROR:",
      error
    );

    if (caseQuestion) {
      caseQuestion.textContent =
        "Gagal mengambil soal dari database.";
    }

    return;
  }

  if (
    !data ||
    data.length === 0
  ) {

    if (caseTitle) {
      caseTitle.textContent =
        "WAITING FOR CHALLENGE";
    }

    if (caseQuestion) {
      caseQuestion.textContent =
        "Belum ada soal aktif pada database.";
    }

    return;
  }

  const randomIndex =
    Math.floor(
      Math.random() *
      data.length
    );

  currentQuestion =
    data[randomIndex];

  console.log(
    "CURRENT QUESTION:",
    currentQuestion
  );

  renderQuestion(
    currentQuestion
  );
}


/* ============================================================
   26. RENDER QUESTION
   ============================================================ */

function renderQuestion(question) {

  if (!question) return;

  const zone =
    question.nexus_zone ||
    question.zone ||
    "NEXUS";

  const difficulty =
    question.difficulty ||
    question.level ||
    "EXPLORER";

  const title =
    question.title ||
    question.question_title ||
    zone + " CHALLENGE";

  const text =
    question.question_text ||
    question.question ||
    question.case_text ||
    question.prompt ||
    "Selesaikan tantangan stoikiometri berikut.";

  if (caseZone) {
    caseZone.textContent =
      zone + " NEXUS";
  }

  if (caseDifficulty) {
    caseDifficulty.textContent =
      String(difficulty)
        .toUpperCase();
  }

  if (caseTitle) {
    caseTitle.textContent =
      title;
  }

  if (caseQuestion) {
    caseQuestion.textContent =
      text;
  }

  /*
     Reset sebelum formula buttons
     dibuat kembali.
  */

  selectedPath = [];
  selectedFormulas = [];
  hintCount = 0;

  if (calculationAnswer) {
    calculationAnswer.value = "";
  }

  if (unitAnswer) {
    unitAnswer.value = "";
  }

  if (caseFeedback) {
    caseFeedback.textContent = "";
  }

  renderSelectedPath();
  renderPathSelection();

  renderDynamicFormulaBuilder();
  renderDynamicUnits();

  questionStartTime =
    Date.now();
}


/* ============================================================
   27. UNIT OPTIONS
   ============================================================ */

function renderDynamicUnits() {

  if (!unitAnswer) return;

  const units = [

    {
      value: "",
      label: "UNIT"
    },

    {
      value: "mol",
      label: "mol"
    },

    {
      value: "g",
      label: "g"
    },

    {
      value: "L",
      label: "L"
    },

    {
      value: "mL",
      label: "mL"
    },

    {
      value: "M",
      label: "M"
    },

    {
      value: "partikel",
      label: "partikel"
    },

    {
      value: "molekul",
      label: "molekul"
    },

    {
      value: "atom",
      label: "atom"
    }

  ];

  unitAnswer.innerHTML =
    units.map(unit => {

      return `
        <option value="${escapeHTML(unit.value)}">
          ${escapeHTML(unit.label)}
        </option>
      `;

    }).join("");
}


/* ============================================================
   28. HINT
   ============================================================ */

function initializeHintButton() {

  if (!hintButton) return;

  hintButton.addEventListener(
    "click",
    function() {

      hintCount++;

      if (!caseFeedback) return;

      if (hintCount === 1) {

        caseFeedback.textContent =
          "HINT 1: Identifikasi besaran awal dan besaran yang ditanyakan.";

      } else if (
        hintCount === 2
      ) {

        caseFeedback.textContent =
          "HINT 2: Hubungkan besaran melalui MOL sebagai pusat Nexus.";

      } else {

        caseFeedback.textContent =
          "HINT 3: Periksa kembali urutan PATH, FORMULA, perhitungan, dan satuan.";
      }
    }
  );
}


/* ============================================================
   29. SUBMIT
   ============================================================ */

function initializeSubmitButton() {

  if (!submitCaseButton) return;

  submitCaseButton.addEventListener(
    "click",
    submitCurrentCase
  );
}


async function submitCurrentCase() {

  if (!currentQuestion) {

    showFeedback(
      "Belum ada challenge aktif."
    );

    return;
  }

  if (
    selectedPath.length === 0
  ) {

    showFeedback(
      "Bangun Nexus Path terlebih dahulu."
    );

    return;
  }

  if (
    selectedFormulas.length === 0
  ) {

    showFeedback(
      "Pilih formula terlebih dahulu."
    );

    return;
  }

  if (
    String(
      calculationAnswer?.value ?? ""
    ).trim() === ""
  ) {

    showFeedback(
      "Masukkan hasil perhitungan."
    );

    return;
  }

  if (!unitAnswer?.value) {

    showFeedback(
      "Pilih satuan jawaban."
    );

    return;
  }


  const responseTimeMs =
    questionStartTime
      ? Date.now() -
        questionStartTime
      : null;


  const pathCorrect =
    evaluatePath();

  const formulaCorrect =
    evaluateFormula();

  const calculationCorrect =
    evaluateCalculation();

  const unitCorrect =
    evaluateUnit();


  const finalCorrect =
    determineFinalCorrect(
      pathCorrect,
      formulaCorrect,
      calculationCorrect,
      unitCorrect
    );


  const errorType =
    determineErrorType(
      pathCorrect,
      formulaCorrect,
      calculationCorrect,
      unitCorrect
    );


  const diagnosticResult = {

    question_id:
      currentQuestion.question_id ||
      currentQuestion.id ||
      null,

    question_code:
      currentQuestion.question_code ||
      null,

    nexus_zone:
      currentQuestion.nexus_zone ||
      null,

    difficulty:
      currentQuestion.difficulty ||
      null,

    selected_path:
      [...selectedPath],

    selected_formulas:
      selectedFormulas.map(
        formulaId =>
          formulaIdToLabel(
            formulaId
          )
      ),

    calculation_answer:
      calculationAnswer?.value ||
      null,

    selected_unit:
      unitAnswer?.value ||
      null,

    path_correct:
      pathCorrect,

    formula_correct:
      formulaCorrect,

    calculation_correct:
      calculationCorrect,

    unit_correct:
      unitCorrect,

    final_correct:
      finalCorrect,

    first_failure_point:
      errorType,

    response_time_ms:
      responseTimeMs,

    hint_count:
      hintCount

  };


  console.log(
    "MOL-NEXUS DIAGNOSTIC RESULT:",
    diagnosticResult
  );


  if (finalCorrect) {

    showFeedback(
      "NEXUS CLEAR ✓"
    );


    /*
       ENERGY RULE

       Correct tanpa hint = +3
       Correct dengan hint = +2

       Retry +1 akan ditambahkan
       setelah sistem attempt database aktif.
    */

    const reward =
      hintCount === 0
        ? 3
        : 2;

    await addEnergy(
      reward
    );

  } else {

    showFeedback(
      "NEXUS UNSTABLE — lanjutkan eksplorasi."
    );
  }


  /*
     BELUM MENULIS KE case_attempts.

     Ini disengaja.

     Setelah v2.1 lolos uji Explorer
     dan Connector, baru kita hubungkan
     ke tabel diagnostik.
  */
}


/* ============================================================
   30. FEEDBACK
   ============================================================ */

function showFeedback(message) {

  if (caseFeedback) {
    caseFeedback.textContent =
      message;
  }
}


/* ============================================================
   31. ENERGY
   ============================================================ */

async function addEnergy(amount) {

  if (!currentPlayer) return;

  if (!currentPlayer.id) {

    console.warn(
      "PLAYER ID NOT FOUND"
    );

    return;
  }

  const oldEnergy =
    Number(
      currentPlayer.nexus_energy || 0
    );

  const newEnergy =
    oldEnergy +
    Number(amount || 0);

  const { error } =
    await supabaseClient
      .from("room_players")
      .update({
        nexus_energy:
          newEnergy
      })
      .eq(
        "id",
        currentPlayer.id
      );

  if (error) {

    console.error(
      "UPDATE ENERGY ERROR:",
      error
    );

    return;
  }

  currentPlayer.nexus_energy =
    newEnergy;

  renderCurrentPlayer();
}


/* ============================================================
   32. ZONE BUTTONS
   ============================================================ */

function initializeZoneButtons() {

  document
    .querySelectorAll(
      ".nexus-zone"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        function() {

          const zone =
            this.dataset.zone;

          if (gameMessage) {

            gameMessage.textContent =
              zone +
              " NEXUS selected.";
          }
        }
      );
    });
}


/* ============================================================
   33. GAME ACTIONS
   ============================================================ */

function initializeGameActions() {

  document
    .querySelectorAll(
      ".game-action-bar button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        function() {

          const action =
            this.textContent
              .trim()
              .toUpperCase();

          if (!gameMessage) {
            return;
          }

          if (action === "EVENT") {

            gameMessage.textContent =
              "EVENT NEXUS akan tersedia pada tahap berikutnya.";

          }

          else if (
            action === "DUEL"
          ) {

            gameMessage.textContent =
              "NEXUS DUEL akan tersedia pada tahap berikutnya.";

          }

          else if (
            action === "MAP"
          ) {

            gameMessage.textContent =
              "Stoichiometry Nexus Map active.";

          }

          else if (
            action === "HELP"
          ) {

            gameMessage.textContent =
              "Bangun PATH → pilih FORMULA secara berurutan → hitung → pilih UNIT → LOCK ANSWER.";
          }
        }
      );
    });
}


/* ============================================================
   34. REALTIME PLAYERS
   ============================================================ */

function subscribePlayers() {

  if (!room) return;

  supabaseClient
    .channel(
      "mol-nexus-game-players-" +
      room
    )

    .on(

      "postgres_changes",

      {
        event: "*",
        schema: "public",
        table: "room_players",
        filter:
          "room_code=eq." +
          room
      },

      async function(payload) {

        console.log(
          "PLAYER REALTIME:",
          payload
        );

        await loadGamePlayers();
      }

    )

    .subscribe();
}


/* ============================================================
   35. REALTIME ROOM
   ============================================================ */

function subscribeRoom() {

  if (!room) return;

  supabaseClient
    .channel(
      "mol-nexus-game-room-" +
      room
    )

    .on(

      "postgres_changes",

      {
        event: "UPDATE",
        schema: "public",
        table: "game_rooms",
        filter:
          "room_code=eq." +
          room
      },

      function(payload) {

        const status =
          String(
            payload.new?.status || ""
          ).toUpperCase();

        if (
          status === "PLAYING"
        ) {

          if (gameMessage) {

            gameMessage.textContent =
              "Nexus synchronized. Game is active.";
          }

          if (turnStatus) {

            turnStatus.textContent =
              "NEXUS ACTIVE";
          }
        }
      }

    )

    .subscribe();
}


/* ============================================================
   36. INITIALIZE
   ============================================================ */

function initializeInterface() {

  renderBasicData();

  initializePathBuilder();

  /*
     Formula Builder v2.1 menggunakan
     document event delegation.
  */

  initializeFormulaBuilder();

  initializeZoneButtons();

  initializeHintButton();

  initializeSubmitButton();

  initializeGameActions();
}


/* ============================================================
   37. START GAME
   ============================================================ */

async function startMolNexusGame() {

  console.log(
    "================================"
  );

  console.log(
    "MOL-NEXUS GAME CONTROLLER v2.1"
  );

  console.log(
    "STUDENT:",
    student
  );

  console.log(
    "ROOM:",
    room
  );

  console.log(
    "================================"
  );


  initializeInterface();


  if (
    !student ||
    !room
  ) {

    if (gameMessage) {

      gameMessage.textContent =
        "Data pemain/room tidak ditemukan. Masuklah melalui Multiplayer Lobby.";
    }

    if (turnStatus) {

      turnStatus.textContent =
        "WAITING FOR LOBBY";
    }

    return;
  }


  await loadGameRoom();

  await loadGamePlayers();
await ensureStudentRecord();
await ensureGameSession();
  subscribePlayers();

  subscribeRoom();


  await loadQuestion();


  console.log(
    "MOL-NEXUS GAME READY v2.1"
  );
}


/* ============================================================
   38. START AFTER DOM READY
   ============================================================ */

window.addEventListener(
  "DOMContentLoaded",
  startMolNexusGame
);


/* ============================================================
   END
   MOL-NEXUS GAME CONTROLLER v2.1
   ============================================================ */
