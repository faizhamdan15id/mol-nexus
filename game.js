/* ============================================================
   MOL-NEXUS GAME CONTROLLER
   Version 2.0
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

const pathBuilder =
  document.getElementById("pathBuilder");

const selectedPathElement =
  document.getElementById("selectedPath");

const formulaBuilder =
  document.getElementById("formulaBuilder");

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


function getPlayerName(player) {
  if (!player) return "";

  return (
    player.student_name ||
    player.player_name ||
    player.name ||
    ""
  );
}


function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
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
      student ? student.toUpperCase() : "PLAYER";
  }
}


/* ============================================================
   7. LOAD GAME ROOM
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
    console.error("ROOM ERROR:", error);

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
    String(data.status).toUpperCase() === "PLAYING"
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
      .order("player_slot", {
        ascending: true
      });

  if (error) {
    console.error("PLAYER ERROR:", error);

    if (gameMessage) {
      gameMessage.textContent =
        "Gagal membaca data pemain.";
    }

    return [];
  }

  const safePlayers = players || [];

  renderPlayers(safePlayers);
  findCurrentPlayer(safePlayers);

  return safePlayers;
}


/* ============================================================
   9. PLAYER LIST
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

  for (let slot = 1; slot <= 4; slot++) {

    const player =
      players.find(
        item =>
          Number(item.player_slot) === slot
      );

    const name =
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
            ${escapeHTML(name || "WAITING...")}
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
    players.find(player =>
      normalizeText(
        getPlayerName(player)
      ) === target
    ) || null;

  if (!currentPlayer) {

    if (currentPlayerName) {
      currentPlayerName.textContent =
        student.toUpperCase();
    }

    return;
  }

  renderCurrentPlayer();
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
    gameEnergy.textContent = energy;
  }

  if (sideEnergy) {
    sideEnergy.textContent = energy;
  }

  renderCrystals(currentPlayer);
}


/* ============================================================
   11. CRYSTALS
   ============================================================ */

function renderCrystals(player) {

  const map = [
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

  map.forEach(item => {

    const element =
      document.getElementById(item.id);

    const collected =
      item.fields.some(
        field =>
          player[field] === true
      );

    if (collected) {
      total++;
      element?.classList.add("collected");
    } else {
      element?.classList.remove("collected");
    }
  });

  if (crystalCount) {
    crystalCount.textContent = total;
  }
}


/* ============================================================
   12. QUESTION LOADER
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

  if (!data || data.length === 0) {

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
      Math.random() * data.length
    );

  currentQuestion =
    data[randomIndex];

  console.log(
    "CURRENT QUESTION:",
    currentQuestion
  );

  renderQuestion(currentQuestion);
}


/* ============================================================
   13. RENDER QUESTION
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
    `${zone} CHALLENGE`;

  const text =
    question.question_text ||
    question.question ||
    question.case_text ||
    question.prompt ||
    "Selesaikan tantangan stoikiometri berikut.";

  if (caseZone) {
    caseZone.textContent =
      `${zone} NEXUS`;
  }

  if (caseDifficulty) {
    caseDifficulty.textContent =
      String(difficulty).toUpperCase();
  }

  if (caseTitle) {
    caseTitle.textContent = title;
  }

  if (caseQuestion) {
    caseQuestion.textContent = text;
  }

  resetDiagnosticInput();

  renderDynamicFormulaBuilder();

  renderDynamicUnits();

  questionStartTime = Date.now();
}


/* ============================================================
   14. PATH BUILDER
   ============================================================ */

function initializePathBuilder() {

  if (!pathBuilder) return;

  pathBuilder.addEventListener(
    "click",
    function(event) {

      const button =
        event.target.closest(
          ".path-block"
        );

      if (!button) return;

      const value =
        button.dataset.path;

      if (!value) return;

      /*
       * Jika tombol yang sama ditekan sebagai
       * node terakhir, hapus node tersebut.
       */

      if (
        selectedPath.length > 0 &&
        selectedPath[
          selectedPath.length - 1
        ] === value
      ) {

        selectedPath.pop();

      } else {

        selectedPath.push(value);
      }

      renderSelectedPath();
      renderPathButtonState();
    }
  );
}


function renderSelectedPath() {

  if (!selectedPathElement) return;

  if (selectedPath.length === 0) {
    selectedPathElement.textContent =
      "PATH: —";
    return;
  }

  selectedPathElement.textContent =
    "PATH: " +
    selectedPath.join(" → ");
}


function renderPathButtonState() {

  document
    .querySelectorAll(".path-block")
    .forEach(button => {

      const value =
        button.dataset.path;

      if (selectedPath.includes(value)) {
        button.classList.add("selected");
      } else {
        button.classList.remove("selected");
      }
    });
}


function resetPath() {

  selectedPath = [];

  document
    .querySelectorAll(".path-block")
    .forEach(button =>
      button.classList.remove("selected")
    );

  renderSelectedPath();
}


/* ============================================================
   15. FORMULA LIBRARY
   ============================================================ */

const FORMULA_LIBRARY = [

  {
    id: "mass/mr",
    label: "n = m / Mr"
  },

  {
    id: "mol*mr",
    label: "m = n × Mr"
  },

  {
    id: "mol*na",
    label: "N = n × NA"
  },

  {
    id: "particle/na",
    label: "n = N / NA"
  },

  {
    id: "volume/22.4",
    label: "n = V / 22.4"
  },

  {
    id: "mol*22.4",
    label: "V = n × 22.4"
  },

  {
    id: "molarity*volume",
    label: "n = M × V"
  },

  {
    id: "mol/volume",
    label: "M = n / V"
  },

  {
    id: "mol/molarity",
    label: "V = n / M"
  },

  {
    id: "ml/1000",
    label: "V(L) = V(mL) / 1000"
  }
];


/* ============================================================
   16. FORMULA NORMALIZATION
   ============================================================ */

function normalizeFormula(value) {

  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[×x]/g, "*")
    .replace(/÷/g, "/")
    .replace(/nₐ/g, "na")
    .replace(/n_a/g, "na")
    .replace(/avogadro/g, "na")
    .replace(/liter/g, "l")
    .replace(/litre/g, "l");
}


function splitExpectedFormulas(value) {

  if (!value) return [];

  return String(value)
    .split(/[;|]+/)
    .map(item => item.trim())
    .filter(Boolean);
}


/* ============================================================
   17. FORMULA MATCHING
   ============================================================ */

function formulaMatches(
  selectedId,
  expectedFormula
) {

  const expected =
    normalizeFormula(
      expectedFormula
    );

  const selected =
    FORMULA_LIBRARY.find(
      item =>
        item.id === selectedId
    );

  if (!selected) return false;

  const label =
    normalizeFormula(
      selected.label
    );


  if (expected === label) {
    return true;
  }


  const aliases = {

    "mass/mr": [
      "n=m/mr",
      "mol=massa/mr"
    ],

    "mol*mr": [
      "m=n*mr",
      "massa=n*mr"
    ],

    "mol*na": [
      "npartikel=n*na",
      "jumlahpartikel=n*na",
      "n=n*na"
    ],

    "particle/na": [
      "n=npartikel/na",
      "n=jumlahpartikel/na"
    ],

    "volume/22.4": [
      "n=v/22.4",
      "n=v/22,4"
    ],

    "mol*22.4": [
      "v=n*22.4",
      "v=n*22,4"
    ],

    "molarity*volume": [
      "n=m*v"
    ],

    "mol/volume": [
      "m=n/v"
    ],

    "mol/molarity": [
      "v=n/m"
    ],

    "ml/1000": [
      "v(l)=v(ml)/1000",
      "v=vml/1000"
    ]
  };


  const candidateAliases =
    aliases[selectedId] || [];


  return candidateAliases.some(
    alias =>
      normalizeFormula(alias) ===
      expected
  );
}


/* ============================================================
   18. DYNAMIC FORMULA BUILDER
   ============================================================ */

function renderDynamicFormulaBuilder() {

  if (!formulaBuilder) return;

  /*
   * Semua rumus dasar tersedia.
   * Urutan pilihan diacak agar posisi tombol
   * tidak menjadi petunjuk jawaban.
   */

  const formulas =
    [...FORMULA_LIBRARY]
      .sort(() => Math.random() - 0.5);

  formulaBuilder.innerHTML =
    formulas
      .map(item => `
        <button
          class="formula-block"
          data-formula="${escapeHTML(item.id)}"
          type="button"
        >
          ${escapeHTML(item.label)}
        </button>
      `)
      .join("");
}


/* ============================================================
   19. MULTI-STEP FORMULA BUILDER
   ============================================================ */

function initializeFormulaBuilder() {

  if (!formulaBuilder) return;

  formulaBuilder.addEventListener(
    "click",
    function(event) {

      const button =
        event.target.closest(
          ".formula-block"
        );

      if (!button) return;

      const formula =
        button.dataset.formula;

      if (!formula) return;


      const existingIndex =
        selectedFormulas.indexOf(
          formula
        );


      if (existingIndex >= 0) {

        selectedFormulas.splice(
          existingIndex,
          1
        );

        button.classList.remove(
          "selected"
        );

      } else {

        selectedFormulas.push(
          formula
        );

        button.classList.add(
          "selected"
        );
      }


      console.log(
        "SELECTED FORMULAS:",
        selectedFormulas
      );
    }
  );
}


function resetFormula() {

  selectedFormulas = [];

  document
    .querySelectorAll(
      ".formula-block"
    )
    .forEach(button =>
      button.classList.remove(
        "selected"
      )
    );
}


/* ============================================================
   20. UNIT OPTIONS
   ============================================================ */

function renderDynamicUnits() {

  if (!unitAnswer) return;

  const units = [
    { value: "", label: "UNIT" },
    { value: "mol", label: "mol" },
    { value: "g", label: "g" },
    { value: "L", label: "L" },
    { value: "mL", label: "mL" },
    { value: "M", label: "M" },
    {
      value: "particle",
      label: "partikel"
    },
    {
      value: "molecule",
      label: "molekul"
    },
    {
      value: "atom",
      label: "atom"
    }
  ];

  unitAnswer.innerHTML =
    units
      .map(unit => `
        <option value="${escapeHTML(unit.value)}">
          ${escapeHTML(unit.label)}
        </option>
      `)
      .join("");
}


/* ============================================================
   21. RESET DIAGNOSTIC INPUT
   ============================================================ */

function resetDiagnosticInput() {

  resetPath();
  resetFormula();

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
}


/* ============================================================
   22. PATH EVALUATION
   ============================================================ */

function normalizePath(value) {

  if (!value) return "";

  if (Array.isArray(value)) {

    return value
      .map(item =>
        String(item)
          .trim()
          .toUpperCase()
      )
      .join(">");
  }

  return String(value)
    .replace(/→/g, ">")
    .replace(/↔/g, ">")
    .replace(/\s+/g, "")
    .toUpperCase();
}


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
   23. FORMULA EVALUATION
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
    !Array.isArray(selectedFormulas) ||
    selectedFormulas.length === 0
  ) {
    return false;
  }

  const expectedParts =
    splitExpectedFormulas(expected);

  if (expectedParts.length === 0) {
    return null;
  }


  /*
   * Jumlah rumus harus sama.
   * Ini mencegah siswa memilih semua rumus.
   */

  if (
    selectedFormulas.length !==
    expectedParts.length
  ) {
    return false;
  }


  /*
   * Urutan formula juga diperiksa.
   * Penting untuk diagnosis prosedural.
   */

  return expectedParts.every(
    (expectedFormula, index) => {

      const selectedId =
        selectedFormulas[index];

      return formulaMatches(
        selectedId,
        expectedFormula
      );
    }
  );
}


/* ============================================================
   24. CALCULATION EVALUATION
   ============================================================ */

function evaluateCalculation() {

  if (!currentQuestion) {
    return null;
  }

  const expected =
    Number(
      currentQuestion.correct_answer
    );

  const rawAnswer =
    calculationAnswer?.value;

  if (
    !Number.isFinite(expected)
  ) {
    return null;
  }

  if (
    rawAnswer === undefined ||
    rawAnswer === null ||
    rawAnswer === ""
  ) {
    return false;
  }

  const answer =
    Number(rawAnswer);

  if (!Number.isFinite(answer)) {
    return false;
  }


  /*
   * Gunakan answer_tolerance dari database.
   * Jika kosong, fallback 1% dari jawaban.
   */

  const databaseTolerance =
    Number(
      currentQuestion.answer_tolerance
    );

  const tolerance =
    Number.isFinite(databaseTolerance) &&
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
   25. UNIT EVALUATION
   ============================================================ */

function normalizeUnit(value) {

  const unit =
    String(value ?? "")
      .trim()
      .toLowerCase();

  const aliases = {

    "m": "molar",
    "mol/l": "molar",
    "mol·l-1": "molar",
    "mol l-1": "molar",

    "molecule": "particle",
    "molecules": "particle",
    "molekul": "particle",

    "particles": "particle",
    "partikel": "particle",

    "liter": "l",
    "litre": "l",
    "liters": "l",

    "milliliter": "ml",
    "millilitre": "ml"
  };

  return aliases[unit] || unit;
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
   26. FIRST FAILURE POINT
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

  if (calculationCorrect === false) {
    return "CALCULATION_ERROR";
  }

  if (unitCorrect === false) {
    return "UNIT_ERROR";
  }

  return "NONE";
}


/* ============================================================
   27. FINAL CORRECT
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
    value => value !== null
  );

  return (
    checks.length > 0 &&
    checks.every(
      value => value === true
    )
  );
}


/* ============================================================
   28. HINT SYSTEM
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

      } else if (hintCount === 2) {

        caseFeedback.textContent =
          "HINT 2: MOL adalah pusat hubungan pada Nexus stoikiometri.";

      } else {

        caseFeedback.textContent =
          "HINT 3: Periksa urutan PATH dan hubungan matematis pada FORMULA.";
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


  if (selectedPath.length === 0) {

    showFeedback(
      "Bangun Nexus Path terlebih dahulu."
    );

    return;
  }


  if (selectedFormulas.length === 0) {

    showFeedback(
      "Pilih formula terlebih dahulu."
    );

    return;
  }


  if (
    calculationAnswer?.value === ""
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
      ? Date.now() - questionStartTime
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


  const result = {

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

    selected_path:
      [...selectedPath],

    selected_formulas:
      [...selectedFormulas],

    calculation_answer:
      calculationAnswer?.value || null,

    selected_unit:
      unitAnswer?.value || null,

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

    error_type:
      errorType,

    response_time_ms:
      responseTimeMs,

    hint_count:
      hintCount
  };


  console.log(
    "MOL-NEXUS DIAGNOSTIC RESULT:",
    result
  );


  if (finalCorrect) {

    showFeedback(
      "NEXUS CLEAR ✓"
    );

    /*
     * Energy:
     * tanpa hint = +3
     * dengan hint = +2
     */

    const reward =
      hintCount === 0 ? 3 : 2;

    await addEnergy(reward);

  } else {

    /*
     * Jangan tampilkan diagnosis kepada siswa.
     */

    showFeedback(
      "NEXUS UNSTABLE — lanjutkan eksplorasi."
    );
  }


  /*
   * BELUM INSERT case_attempts.
   * Akan diaktifkan setelah struktur tabel
   * case_attempts diverifikasi.
   */
}


function showFeedback(message) {

  if (caseFeedback) {
    caseFeedback.textContent = message;
  }
}


/* ============================================================
   30. ENERGY
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
        nexus_energy: newEnergy
      })
      .eq(
        "id",
        currentPlayer.id
      );


  if (error) {

    console.error(
      "ENERGY UPDATE ERROR:",
      error
    );

    return;
  }


  currentPlayer.nexus_energy =
    newEnergy;

  renderCurrentPlayer();
}


/* ============================================================
   31. ZONE BUTTONS
   ============================================================ */

function initializeZoneButtons() {

  document
    .querySelectorAll(".nexus-zone")
    .forEach(button => {

      button.addEventListener(
        "click",
        function() {

          const zone =
            this.dataset.zone;

          if (gameMessage) {
            gameMessage.textContent =
              `${zone} NEXUS selected.`;
          }
        }
      );
    });
}


/* ============================================================
   32. GAME ACTIONS
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

          if (!gameMessage) return;


          switch (action) {

            case "EVENT":

              gameMessage.textContent =
                "EVENT NEXUS akan tersedia pada tahap berikutnya.";

              break;


            case "DUEL":

              gameMessage.textContent =
                "NEXUS DUEL akan tersedia pada tahap berikutnya.";

              break;


            case "MAP":

              gameMessage.textContent =
                "Stoichiometry Nexus Map active.";

              break;


            case "HELP":

              gameMessage.textContent =
                "Bangun PATH → pilih FORMULA secara berurutan → hitung → pilih UNIT → LOCK ANSWER.";

              break;
          }
        }
      );
    });
}


/* ============================================================
   33. REALTIME PLAYERS
   ============================================================ */

function subscribePlayers() {

  if (!room) return;

  supabaseClient
    .channel(
      `mol-nexus-game-players-${room}`
    )
    .on(
      "postgres_changes",

      {
        event: "*",
        schema: "public",
        table: "room_players",
        filter:
          `room_code=eq.${room}`
      },

      async function() {
        await loadGamePlayers();
      }
    )
    .subscribe();
}


/* ============================================================
   34. REALTIME ROOM
   ============================================================ */

function subscribeRoom() {

  if (!room) return;

  supabaseClient
    .channel(
      `mol-nexus-game-room-${room}`
    )
    .on(
      "postgres_changes",

      {
        event: "UPDATE",
        schema: "public",
        table: "game_rooms",
        filter:
          `room_code=eq.${room}`
      },

      function(payload) {

        const status =
          String(
            payload.new?.status || ""
          ).toUpperCase();

        if (status === "PLAYING") {

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
   35. INITIALIZE INTERFACE
   ============================================================ */

function initializeInterface() {

  renderBasicData();

  initializePathBuilder();

  initializeFormulaBuilder();

  initializeZoneButtons();

  initializeHintButton();

  initializeSubmitButton();

  initializeGameActions();
}


/* ============================================================
   36. START
   ============================================================ */

async function startMolNexusGame() {

  console.log(
    "MOL-NEXUS GAME CONTROLLER v2.0"
  );

  initializeInterface();


  if (!student || !room) {

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

  subscribePlayers();

  subscribeRoom();

  await loadQuestion();


  console.log(
    "MOL-NEXUS GAME READY"
  );
}


/* ============================================================
   37. START AFTER DOM READY
   ============================================================ */

window.addEventListener(
  "DOMContentLoaded",
  startMolNexusGame
);


/* ============================================================
   END — MOL-NEXUS GAME CONTROLLER v2.0
   ============================================================ */
