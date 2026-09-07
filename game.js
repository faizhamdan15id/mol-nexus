/* ============================================================
   MOL-NEXUS GAME CONTROLLER
   Version 3.0 CLEAN
   Multiplayer + Supabase + Secure Student Session
   ============================================================ */

"use strict";

/* ============================================================
   1. SUPABASE
   ============================================================ */

const SUPABASE_URL =
  "https://snlpdwqdjfnborsorspd.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* ============================================================
   2. SESSION CONTEXT
   ============================================================ */

const sessionToken =
  sessionStorage.getItem(
    "mol_nexus_session_token"
  ) || "";

let room =
  sessionStorage.getItem(
    "mol_nexus_room"
  ) || "";

const storedSlot =
  Number(
    sessionStorage.getItem(
      "mol_nexus_player_slot"
    ) || 0
  );

let student = "";

let currentStudentId = null;
let currentPlayer = null;
let currentPlayers = [];
let currentQuestion = null;

let currentTurn = 1;
let isMyTurn = false;

let selectedZone = null;
let selectedPath = [];
let selectedFormulas = [];

let hintCount = 0;
let retryCount = 0;
let attemptSequence = 1;

let questionStartTime = null;
let pathStageStartTime = null;
let formulaStageStartTime = null;
let calculationStageStartTime = null;

let pathTimeMs = null;
let formulaTimeMs = null;
let calculationTimeMs = null;

let isSubmitting = false;
let lastQuestionId = null;

let playersChannel = null;
let roomChannel = null;


/* ============================================================
   3. DOM HELPERS
   ============================================================ */

const $ = id =>
  document.getElementById(id);

const gameRoom =
  $("gameRoom");

const gameStudent =
  $("gameStudent");

const gameEnergy =
  $("gameEnergy");

const sideEnergy =
  $("sideEnergy");

const crystalCount =
  $("crystalCount");

const gamePlayersList =
  $("gamePlayersList");

const currentPlayerName =
  $("currentPlayerName");

const turnStatus =
  $("turnStatus");

const gameMessage =
  $("gameMessage");

const caseZone =
  $("caseZone");

const caseTitle =
  $("caseTitle");

const caseDifficulty =
  $("caseDifficulty");

const caseQuestion =
  $("caseQuestion");

const selectedPathElement =
  $("selectedPath");

const calculationAnswer =
  $("calculationAnswer");

const unitAnswer =
  $("unitAnswer");

const hintButton =
  $("hintButton");

const submitCaseButton =
  $("submitCaseButton");

const caseFeedback =
  $("caseFeedback");


/* ============================================================
   4. UTILITIES
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

  return (
    player?.student_name ||
    player?.player_name ||
    player?.name ||
    ""
  );
}


function nowMs() {

  return Date.now();
}


function elapsedMs(start) {

  return start
    ? Math.max(
        0,
        nowMs() - start
      )
    : null;
}


function wait(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


function setMessage(text) {

  if (gameMessage) {

    gameMessage.textContent =
      text;
  }
}


function showFeedback(text) {

  if (caseFeedback) {

    caseFeedback.textContent =
      text;
  }
}


function setSubmitDisabled(
  disabled
) {

  if (submitCaseButton) {

    submitCaseButton.disabled =
      disabled;
  }
}


/* ============================================================
   5. FORMULA LIBRARY
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
    label:
      "V(L) = V(mL) / 1000"
  }

];


function formulaIdToLabel(id) {

  return (
    FORMULA_LIBRARY.find(
      item =>
        item.id === id
    )?.label ||
    id
  );
}


/* ============================================================
   6. SECURE STUDENT SESSION
   ============================================================ */

async function validateStudentSession() {

  if (!sessionToken) {

    throw new Error(
      "SESSION_TOKEN_MISSING"
    );
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "validate_student_session",
      {
        p_session_token:
          sessionToken
      }
    );


  if (error) {

    throw error;
  }


  const record =
    Array.isArray(data)
      ? data[0]
      : data;


  if (
    !record ||
    !record.student_id
  ) {

    throw new Error(
      "SESSION_INVALID_OR_EXPIRED"
    );
  }


  currentStudentId =
    record.student_id;


  student =
    record.display_name || "";


  /*
    Nama hanya digunakan
    untuk tampilan.

    Identitas utama tetap
    berasal dari token server.
  */

  sessionStorage.setItem(
    "mol_nexus_display_name",
    student
  );


  return record;
}


/* ============================================================
   7. LOAD GAME ROOM
   ============================================================ */

async function loadGameRoom() {

  if (!room) {

    return null;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("game_rooms")
      .select("*")
      .eq(
        "room_code",
        room
      )
      .maybeSingle();


  if (error) {

    console.error(
      "LOAD ROOM ERROR:",
      error
    );


    setMessage(
      "Gagal membaca data room."
    );


    return null;
  }


  if (!data) {

    setMessage(
      "Room tidak ditemukan."
    );


    return null;
  }


  currentTurn =
    Number(
      data.current_turn || 1
    );


  const status =
    String(
      data.status || ""
    ).toUpperCase();


  if (
    status === "PLAYING"
  ) {

    setMessage(
      "Nexus synchronized. Game is active."
    );

  } else {

    setMessage(
      "Waiting for Nexus activation."
    );
  }


  return data;
}


/* ============================================================
   8. LOAD PLAYERS
   ============================================================ */

async function loadGamePlayers() {

  if (!room) {

    return [];
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("room_players")
      .select("*")
      .eq(
        "room_code",
        room
      )
      .order(
        "player_slot",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "LOAD PLAYERS ERROR:",
      error
    );


    setMessage(
      "Gagal membaca data pemain."
    );


    return [];
  }


  currentPlayers =
    data || [];


  renderPlayers(
    currentPlayers
  );


  /*
    Prioritas pencarian:
    1. student_id
    2. slot dari lobby
    3. nama siswa

    student_id adalah
    identitas utama.
  */

  currentPlayer =

    currentPlayers.find(
      player =>
        player.student_id ===
        currentStudentId
    )

    ||

    currentPlayers.find(
      player =>
        Number(
          player.player_slot
        ) ===
        storedSlot
    )

    ||

    currentPlayers.find(
      player =>
        normalizeText(
          getPlayerName(player)
        ) ===
        normalizeText(student)
    )

    ||

    null;


  if (currentPlayer) {

    renderCurrentPlayer();
  }


  return currentPlayers;
}


/* ============================================================
   9. RENDER PLAYERS
   ============================================================ */

function renderPlayers(players) {

  if (!gamePlayersList) {

    return;
  }


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
          Number(
            item.player_slot
          ) === slot
      );


    const name =
      player
        ? getPlayerName(
            player
          )
        : "WAITING...";


    const status =
      player
        ? (
            player.is_ready
              ? "NEXUS EXPLORER • READY"
              : "NEXUS EXPLORER"
          )
        : "WAITING FOR PLAYER";


    html += `
      <div class="game-player-card">

        <div
          class="game-player-avatar ${colors[slot - 1]}"
        >
          ${String(slot).padStart(2, "0")}
        </div>

        <div class="game-player-info">

          <strong>
            ${escapeHTML(
              name ||
              "WAITING..."
            )}
          </strong>

          <small>
            ${escapeHTML(status)}
          </small>

        </div>

      </div>
    `;
  }


  gamePlayersList.innerHTML =
    html;
}


/* ============================================================
   10. CURRENT PLAYER
   ============================================================ */

function renderCurrentPlayer() {

  if (!currentPlayer) {

    return;
  }


  const name =
    getPlayerName(
      currentPlayer
    ) ||
    student;


  const energy =
    Number(
      currentPlayer.nexus_energy ||
      0
    );


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


  renderCrystals(
    currentPlayer
  );
}


/* ============================================================
   11. CRYSTALS
   ============================================================ */

function renderCrystals(player) {

  const items = [

    [
      "massCrystal",
      [
        "mass_crystal",
        "crystal_mass"
      ]
    ],

    [
      "particleCrystal",
      [
        "particle_crystal",
        "crystal_particle"
      ]
    ],

    [
      "gasCrystal",
      [
        "gas_crystal",
        "crystal_gas"
      ]
    ],

    [
      "solutionCrystal",
      [
        "solution_crystal",
        "crystal_solution"
      ]
    ]

  ];


  let total = 0;


  for (
    const [
      id,
      fields
    ]
    of items
  ) {

    const element =
      $(id);


    const collected =
      fields.some(
        field =>
          player?.[field] ===
          true
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
  }


  if (crystalCount) {

    crystalCount.textContent =
      total;
  }
}


/* ============================================================
   12. BASIC DATA
   ============================================================ */

function renderBasicData() {

  if (gameRoom) {

    gameRoom.textContent =
      room || "----";
  }


  if (gameStudent) {

    gameStudent.textContent =
      student
        ? student.toUpperCase()
        : "PLAYER";
  }
}


/* ============================================================
   END BAGIAN 1
   ============================================================ */
/* ============================================================
   13. TURN STATE
   ============================================================ */

function applyTurnState(roomData) {

  if (
    !roomData ||
    !currentPlayer
  ) {
    return;
  }


  currentTurn =
    Number(
      roomData.current_turn || 1
    );


  const mySlot =
    Number(
      currentPlayer.player_slot
    );


  isMyTurn =
    mySlot === currentTurn;


  const activePlayer =
    currentPlayers.find(
      player =>
        Number(
          player.player_slot
        ) === currentTurn
    );


  if (currentPlayerName) {

    currentPlayerName.textContent =
      activePlayer
        ? getPlayerName(
            activePlayer
          ).toUpperCase()
        : `PLAYER ${currentTurn}`;
  }


  if (isMyTurn) {

    if (turnStatus) {

      turnStatus.textContent =
        `YOUR TURN • PLAYER ${mySlot}`;
    }


    setMessage(
      "Giliran Anda. Pilih Nexus dan selesaikan challenge."
    );


    setSubmitDisabled(
      false
    );

  } else {

    if (turnStatus) {

      turnStatus.textContent =
        `PLAYER ${currentTurn} TURN`;
    }


    setMessage(
      `Menunggu giliran Player ${currentTurn}.`
    );


    setSubmitDisabled(
      true
    );
  }
}


/* ============================================================
   14. PATH BUILDER
   ============================================================ */

function renderSelectedPath() {

  if (!selectedPathElement) {

    return;
  }


  selectedPathElement.textContent =
    selectedPath.length
      ? "PATH: " +
        selectedPath.join(
          " → "
        )
      : "PATH: —";
}


function renderPathSelection() {

  document
    .querySelectorAll(
      ".path-block"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "selected",
          selectedPath.includes(
            button.dataset.path
          )
        );
      }
    );
}


function initializePathBuilder() {

  document
    .querySelectorAll(
      ".path-block"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          function() {

            if (!isMyTurn) {

              showFeedback(
                "Tunggu giliran Anda."
              );

              return;
            }


            const value =
              this.dataset.path;


            if (!value) {

              return;
            }


            if (
              pathStageStartTime ===
              null
            ) {

              pathStageStartTime =
                nowMs();
            }


            const index =
              selectedPath.indexOf(
                value
              );


            if (index >= 0) {

              /*
                Jika blok yang sudah dipilih
                ditekan lagi, potong PATH
                mulai dari blok tersebut.
              */

              selectedPath =
                selectedPath.slice(
                  0,
                  index
                );

            } else {

              selectedPath.push(
                value
              );
            }


            pathTimeMs =
              elapsedMs(
                pathStageStartTime
              );


            renderSelectedPath();

            renderPathSelection();
          }
        );
      }
    );
}


/* ============================================================
   15. FORMULA DISPLAY
   ============================================================ */

function getFormulaDisplayElement() {

  let element =
    $("selectedFormulaPath");


  if (element) {

    return element;
  }


  const builder =
    $("formulaBuilder");


  if (!builder) {

    return null;
  }


  element =
    document.createElement(
      "div"
    );


  element.id =
    "selectedFormulaPath";


  element.className =
    "selected-formula-path";


  builder.insertAdjacentElement(
    "afterend",
    element
  );


  return element;
}


function renderSelectedFormulas() {

  const element =
    getFormulaDisplayElement();


  if (!element) {

    return;
  }


  element.textContent =
    selectedFormulas.length
      ? "FORMULA: " +
        selectedFormulas
          .map(
            formulaIdToLabel
          )
          .join(
            " → "
          )
      : "FORMULA: —";
}


function renderFormulaSelection() {

  document
    .querySelectorAll(
      ".formula-block"
    )
    .forEach(
      button => {

        const index =
          selectedFormulas.indexOf(
            button.dataset.formula
          );


        button.classList.toggle(
          "selected",
          index >= 0
        );


        if (index >= 0) {

          button.setAttribute(
            "data-step",
            String(
              index + 1
            )
          );

        } else {

          button.removeAttribute(
            "data-step"
          );
        }
      }
    );
}


/* ============================================================
   16. DYNAMIC FORMULA BUILDER
   ============================================================ */

function renderDynamicFormulaBuilder() {

  const builder =
    $("formulaBuilder");


  if (!builder) {

    return;
  }


  /*
    Acak posisi formula agar siswa
    tidak hanya menghafal posisi tombol.
  */

  const shuffled =
    [...FORMULA_LIBRARY]
      .sort(
        () =>
          Math.random() - 0.5
      );


  builder.innerHTML =
    shuffled
      .map(
        item => `
          <button
            type="button"
            class="formula-block"
            data-formula="${escapeHTML(
              item.id
            )}"
          >
            ${escapeHTML(
              item.label
            )}
          </button>
        `
      )
      .join("");


  renderSelectedFormulas();
}


/* ============================================================
   17. FORMULA BUILDER
   ============================================================ */

function initializeFormulaBuilder() {

  /*
    Event delegation digunakan
    karena tombol formula dibuat ulang
    setiap challenge.
  */

  document.addEventListener(
    "click",
    function(event) {

      const button =
        event.target.closest(
          ".formula-block"
        );


      if (!button) {

        return;
      }


      if (!isMyTurn) {

        showFeedback(
          "Tunggu giliran Anda."
        );

        return;
      }


      const formulaId =
        button.dataset.formula;


      if (!formulaId) {

        return;
      }


      if (
        formulaStageStartTime ===
        null
      ) {

        formulaStageStartTime =
          nowMs();
      }


      /*
        Saat siswa mulai memilih formula,
        waktu PATH dianggap selesai.
      */

      if (
        pathStageStartTime !==
        null
      ) {

        pathTimeMs =
          elapsedMs(
            pathStageStartTime
          );
      }


      const index =
        selectedFormulas.indexOf(
          formulaId
        );


      if (index >= 0) {

        /*
          Memungkinkan koreksi urutan
          formula multi-step.
        */

        selectedFormulas =
          selectedFormulas.slice(
            0,
            index
          );

      } else {

        selectedFormulas.push(
          formulaId
        );
      }


      formulaTimeMs =
        elapsedMs(
          formulaStageStartTime
        );


      renderFormulaSelection();

      renderSelectedFormulas();
    }
  );
}


/* ============================================================
   18. UNIT OPTIONS
   ============================================================ */

function renderDynamicUnits() {

  if (!unitAnswer) {

    return;
  }


  const units = [

    [
      "",
      "UNIT"
    ],

    [
      "mol",
      "mol"
    ],

    [
      "g",
      "g"
    ],

    [
      "L",
      "L"
    ],

    [
      "mL",
      "mL"
    ],

    [
      "M",
      "M"
    ],

    [
      "partikel",
      "partikel"
    ],

    [
      "molekul",
      "molekul"
    ],

    [
      "atom",
      "atom"
    ]

  ];


  unitAnswer.innerHTML =
    units
      .map(
        ([value, label]) => `
          <option
            value="${escapeHTML(
              value
            )}"
          >
            ${escapeHTML(
              label
            )}
          </option>
        `
      )
      .join("");
}


/* ============================================================
   19. DIAGNOSTIC TIMERS
   ============================================================ */

function resetDiagnosticTimers() {

  questionStartTime =
    nowMs();


  pathStageStartTime =
    null;


  formulaStageStartTime =
    null;


  calculationStageStartTime =
    null;


  pathTimeMs =
    null;


  formulaTimeMs =
    null;


  calculationTimeMs =
    null;
}


function finalizeDiagnosticTimers() {

  if (
    pathStageStartTime !==
    null
  ) {

    pathTimeMs =
      elapsedMs(
        pathStageStartTime
      );
  }


  if (
    formulaStageStartTime !==
    null
  ) {

    formulaTimeMs =
      elapsedMs(
        formulaStageStartTime
      );
  }


  if (
    calculationStageStartTime !==
    null
  ) {

    calculationTimeMs =
      elapsedMs(
        calculationStageStartTime
      );
  }
}


function getTotalResponseTime() {

  return questionStartTime
    ? elapsedMs(
        questionStartTime
      )
    : null;
}


/* ============================================================
   20. RESET ATTEMPT
   ============================================================ */

function resetAttemptState() {

  selectedPath = [];

  selectedFormulas = [];

  hintCount = 0;

  retryCount = 0;

  attemptSequence = 1;

  isSubmitting = false;


  if (calculationAnswer) {

    calculationAnswer.value =
      "";
  }


  if (unitAnswer) {

    unitAnswer.value =
      "";
  }


  if (caseFeedback) {

    caseFeedback.textContent =
      "";
  }


  renderSelectedPath();

  renderPathSelection();

  renderSelectedFormulas();

  renderFormulaSelection();

  resetDiagnosticTimers();
}


/* ============================================================
   21. LOAD QUESTION
   ============================================================ */

async function loadQuestion() {

  /*
    Privasi multiplayer:
    soal hanya dirender pada browser
    siswa yang sedang mendapat giliran.
  */

  if (!isMyTurn) {

    currentQuestion =
      null;


    if (caseTitle) {

      caseTitle.textContent =
        "WAITING FOR TURN";
    }


    if (caseQuestion) {

      caseQuestion.textContent =
        "Challenge hanya ditampilkan saat giliran Anda.";
    }


    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("questions")
      .select("*")
      .eq(
        "active",
        true
      )
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


  let pool =
    [...data];


  /*
    Jika siswa memilih zona,
    prioritaskan soal zona tersebut.
  */

  if (selectedZone) {

    const zoneQuestions =
      data.filter(
        question =>
          normalizeText(
            question.nexus_zone
          ) ===
          normalizeText(
            selectedZone
          )
      );


    if (
      zoneQuestions.length >
      0
    ) {

      pool =
        zoneQuestions;
    }
  }


  /*
    Hindari soal yang sama
    berturut-turut jika ada alternatif.
  */

  if (
    pool.length > 1 &&
    lastQuestionId
  ) {

    const alternative =
      pool.filter(
        question =>
          question.question_id !==
          lastQuestionId
      );


    if (
      alternative.length >
      0
    ) {

      pool =
        alternative;
    }
  }


  currentQuestion =
    pool[
      Math.floor(
        Math.random() *
        pool.length
      )
    ];


  lastQuestionId =
    currentQuestion.question_id ||
    currentQuestion.id ||
    null;


  renderQuestion(
    currentQuestion
  );
}


/* ============================================================
   22. RENDER QUESTION
   ============================================================ */

function renderQuestion(
  question
) {

  if (!question) {

    return;
  }


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
      String(
        difficulty
      ).toUpperCase();
  }


  if (caseTitle) {

    caseTitle.textContent =
      title;
  }


  if (caseQuestion) {

    caseQuestion.textContent =
      text;
  }


  resetAttemptState();

  renderDynamicFormulaBuilder();

  renderDynamicUnits();

  setSubmitDisabled(
    !isMyTurn
  );
}


/* ============================================================
   23. CALCULATION TRACKING
   ============================================================ */

function initializeCalculationTracking() {

  if (!calculationAnswer) {

    return;
  }


  const startCalculation =
    function() {

      if (
        calculationStageStartTime ===
        null
      ) {

        calculationStageStartTime =
          nowMs();
      }


      /*
        Begitu masuk perhitungan,
        waktu formula difinalisasi.
      */

      if (
        formulaStageStartTime !==
        null
      ) {

        formulaTimeMs =
          elapsedMs(
            formulaStageStartTime
          );
      }
    };


  calculationAnswer.addEventListener(
    "focus",
    startCalculation
  );


  calculationAnswer.addEventListener(
    "input",
    function() {

      startCalculation();


      calculationTimeMs =
        elapsedMs(
          calculationStageStartTime
        );
    }
  );
}


/* ============================================================
   24. UNIT TRACKING
   ============================================================ */

function initializeUnitTracking() {

  if (!unitAnswer) {

    return;
  }


  unitAnswer.addEventListener(
    "change",
    function() {

      if (
        calculationStageStartTime !==
        null
      ) {

        calculationTimeMs =
          elapsedMs(
            calculationStageStartTime
          );
      }
    }
  );
}


/* ============================================================
   25. HINT SYSTEM
   ============================================================ */

function initializeHintButton() {

  if (!hintButton) {

    return;
  }


  hintButton.addEventListener(
    "click",
    function() {

      if (!isMyTurn) {

        showFeedback(
          "Tunggu giliran Anda."
        );

        return;
      }


      if (!currentQuestion) {

        showFeedback(
          "Belum ada challenge aktif."
        );

        return;
      }


      hintCount++;


      if (hintCount === 1) {

        showFeedback(
          "HINT 1: Identifikasi besaran awal dan besaran yang ditanyakan."
        );

      } else if (
        hintCount === 2
      ) {

        showFeedback(
          "HINT 2: Hubungkan besaran melalui MOL sebagai pusat Nexus."
        );

      } else {

        showFeedback(
          "HINT 3: Periksa PATH, FORMULA, perhitungan, dan satuan."
        );
      }
    }
  );
}


/* ============================================================
   END BAGIAN 2
   ============================================================ */
/* ============================================================
   26. VALIDATE CURRENT ANSWER
   ============================================================ */

function validateCurrentAnswer() {

  if (!isMyTurn) {

    return {
      valid: false,
      message:
        "Sekarang bukan giliran Anda."
    };
  }


  if (!currentQuestion) {

    return {
      valid: false,
      message:
        "Belum ada challenge aktif."
    };
  }


  if (
    selectedPath.length === 0
  ) {

    return {
      valid: false,
      message:
        "Bangun Nexus Path terlebih dahulu."
    };
  }


  if (
    selectedFormulas.length === 0
  ) {

    return {
      valid: false,
      message:
        "Pilih formula terlebih dahulu."
    };
  }


  const rawAnswer =
    String(
      calculationAnswer?.value ??
      ""
    ).trim();


  if (!rawAnswer) {

    return {
      valid: false,
      message:
        "Masukkan hasil perhitungan."
    };
  }


  const numericAnswer =
    Number(
      rawAnswer.replace(
        ",",
        "."
      )
    );


  if (
    !Number.isFinite(
      numericAnswer
    )
  ) {

    return {
      valid: false,
      message:
        "Jawaban perhitungan harus berupa angka."
    };
  }


  if (
    !unitAnswer ||
    !unitAnswer.value
  ) {

    return {
      valid: false,
      message:
        "Pilih satuan jawaban."
    };
  }


  return {
    valid: true,
    message: ""
  };
}


/* ============================================================
   27. SAVE STUDENT ATTEMPT
   ============================================================ */

async function saveStudentAttempt() {

  /*
    Browser hanya mengirim RESPONS siswa.

    Penentuan:
    - path benar/salah
    - formula benar/salah
    - calculation benar/salah
    - unit benar/salah
    - final_correct
    - first_failure_point
    - error_type

    dilakukan oleh RPC
    save_student_attempt di server.
  */


  if (!sessionToken) {

    throw new Error(
      "SESSION_TOKEN_MISSING"
    );
  }


  if (!room) {

    throw new Error(
      "ROOM_MISSING"
    );
  }


  if (
    !currentQuestion ||
    !currentQuestion.question_id
  ) {

    throw new Error(
      "QUESTION_ID_MISSING"
    );
  }


  const selectedFormulaText =
    selectedFormulas
      .map(
        formulaIdToLabel
      )
      .join("; ");


  const rawAnswer =
    String(
      calculationAnswer.value
    )
      .trim()
      .replace(
        ",",
        "."
      );


  const numericAnswer =
    Number(
      rawAnswer
    );


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "save_student_attempt",
      {

        p_session_token:
          sessionToken,

        p_room_code:
          room,

        p_question_id:
          currentQuestion.question_id,

        p_attempt_sequence:
          attemptSequence,

        p_selected_path:
          [...selectedPath],

        p_selected_formula:
          selectedFormulaText,

        p_student_answer:
          numericAnswer,

        p_selected_unit:
          unitAnswer.value,

        p_path_time_ms:
          pathTimeMs,

        p_formula_time_ms:
          formulaTimeMs,

        p_calculation_time_ms:
          calculationTimeMs,

        p_total_response_time_ms:
          getTotalResponseTime(),

        p_hint_count:
          hintCount,

        p_retry_count:
          retryCount
      }
    );


  if (error) {

    console.error(
      "SAVE ATTEMPT RPC ERROR:",
      error
    );

    throw error;
  }


  const result =
    Array.isArray(data)
      ? data[0]
      : data;


  if (!result) {

    throw new Error(
      "EMPTY_ATTEMPT_RESPONSE"
    );
  }


  console.log(
    "SERVER DIAGNOSTIC RESULT:",
    result
  );


  return result;
}

/* ============================================================
   28B. AWARD CRYSTAL
   ============================================================ */

async function awardCrystal() {

  if (
    !sessionToken ||
    !room ||
    !currentQuestion?.question_id
  ) {
    return null;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "award_student_crystal",
      {
        p_session_token:
          sessionToken,

        p_room_code:
          room,

        p_question_id:
          currentQuestion.question_id
      }
    );


  if (error) {

    console.error(
      "CRYSTAL RPC ERROR:",
      error
    );

    return null;
  }


  const result =
    Array.isArray(data)
      ? data[0]
      : data;


  console.log(
    "CRYSTAL RESULT:",
    result
  );


  /*
    Refresh room_players agar
    Crystal terbaru langsung
    tampil pada UI.
  */

  await loadGamePlayers();


  return result;
}
/* ============================================================
   28. ADD ENERGY
   ============================================================ */

async function addEnergy(
  amount
) {

  if (
    !sessionToken ||
    !room
  ) {

    return false;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "add_student_energy",
      {

        p_session_token:
          sessionToken,

        p_room_code:
          room,

        p_amount:
          Number(
            amount || 0
          )
      }
    );


  if (error) {

    console.error(
      "ENERGY RPC ERROR:",
      error
    );

    return false;
  }


  /*
    RPC mengembalikan energy
    terbaru milik siswa.
  */

  if (currentPlayer) {

    currentPlayer.nexus_energy =
      Number(
        data || 0
      );


    renderCurrentPlayer();
  }


  return true;
}


/* ============================================================
   29. ADVANCE TURN
   ============================================================ */

async function advanceTurn() {

  if (!room) {

    return false;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "next_turn",
      {
        p_room_code:
          room
      }
    );


  if (error) {

    console.error(
      "ADVANCE TURN ERROR:",
      error
    );


    return false;
  }


  currentTurn =
    Number(
      data || 1
    );


  console.log(
    "TURN ADVANCED:",
    currentTurn
  );


  return true;
}


/* ============================================================
   30. SUBMIT CURRENT CASE
   ============================================================ */

async function submitCurrentCase() {

  /*
    Cegah double click.
  */

  if (isSubmitting) {

    return;
  }


  const validation =
    validateCurrentAnswer();


  if (!validation.valid) {

    showFeedback(
      validation.message
    );

    return;
  }


  isSubmitting =
    true;


  setSubmitDisabled(
    true
  );


  try {

    /*
      Finalisasi waktu setiap
      tahap diagnostik.
    */

    finalizeDiagnosticTimers();


    /*
      Kirim respons siswa ke server.
    */

    const result =
      await saveStudentAttempt();


    /*
      PENTING:
      keputusan benar/salah
      memakai hasil SERVER.

      Browser tidak menentukan
      final_correct.
    */

    const finalCorrect =
      result.final_correct ===
      true;


    if (finalCorrect) {

      /*
        REWARD:

        Benar pertama tanpa hint = +3

        Benar pertama dengan hint = +2

        Benar setelah retry = +1
      */

      let reward = 1;


      if (
        retryCount === 0
      ) {

        reward =
          hintCount === 0
            ? 3
            : 2;
      }


      await addEnergy(
        reward
      );

     const crystalResult =
  await awardCrystal(); 
       
      showFeedback(
        `NEXUS CLEAR ✓  +${reward} ENERGY`
      );


      /*
        Beri waktu siswa melihat
        feedback.
      */

      await wait(
        1200
      );


      /*
        Pindahkan giliran.
      */

      const advanced =
        await advanceTurn();


      if (advanced) {

        /*
          Refresh state multiplayer.
        */

        await loadGamePlayers();


        const roomData =
          await loadGameRoom();


        if (roomData) {

          applyTurnState(
            roomData
          );
        }
      }


      /*
        Jika setelah pergantian
        ternyata masih giliran siswa
        ini (contoh room testing
        max_players = 1),
        langsung ambil soal berikutnya.
      */

      if (isMyTurn) {

        await loadQuestion();

      } else {

        currentQuestion =
          null;


        if (caseTitle) {

          caseTitle.textContent =
            "WAITING FOR TURN";
        }


        if (caseQuestion) {

          caseQuestion.textContent =
            "Menunggu giliran berikutnya.";
        }
      }


      return;
    }


    /* ========================================================
       WRONG ANSWER
       ======================================================== */


    retryCount++;


    attemptSequence++;


    showFeedback(
      "NEXUS UNSTABLE — periksa kembali PATH, FORMULA, perhitungan, atau UNIT lalu coba lagi."
    );


    /*
      Pilihan siswa tidak dihapus.

      Ini penting agar proses
      perbaikannya dapat direkam
      pada attempt berikutnya.
    */


    resetDiagnosticTimers();


    setSubmitDisabled(
      false
    );


  } catch (error) {

    console.error(
      "SUBMIT CURRENT CASE ERROR:",
      error
    );


    showFeedback(
      "Data diagnostik gagal disimpan. Silakan coba lagi."
    );


    setSubmitDisabled(
      false
    );


  } finally {

    isSubmitting =
      false;
  }
}


/* ============================================================
   31. SUBMIT BUTTON
   ============================================================ */

function initializeSubmitButton() {

  if (!submitCaseButton) {

    return;
  }


  submitCaseButton.addEventListener(
    "click",
    submitCurrentCase
  );
}


/* ============================================================
   32. ZONE BUTTONS
   ============================================================ */

function initializeZoneButtons() {

  document
    .querySelectorAll(
      ".nexus-zone"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async function() {

            if (!isMyTurn) {

              showFeedback(
                "Tunggu giliran Anda."
              );

              return;
            }


            selectedZone =
              this.dataset.zone ||
              null;


            if (!selectedZone) {

              return;
            }


            document
              .querySelectorAll(
                ".nexus-zone"
              )
              .forEach(
                zoneButton => {

                  zoneButton
                    .classList
                    .remove(
                      "selected"
                    );
                }
              );


            this.classList.add(
              "selected"
            );


            setMessage(
              `${selectedZone} NEXUS selected.`
            );


            await loadQuestion();
          }
        );
      }
    );
}


/* ============================================================
   33. GAME ACTION BAR
   ============================================================ */

function initializeGameActions() {

  document
    .querySelectorAll(
      ".game-action-bar button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          function() {

            const action =
              this.textContent
                .trim()
                .toUpperCase();


            if (
              action === "EVENT"
            ) {

              setMessage(
                "EVENT NEXUS akan tersedia pada tahap berikutnya."
              );


            } else if (
              action === "DUEL"
            ) {

              setMessage(
                "NEXUS DUEL akan tersedia pada tahap berikutnya."
              );


            } else if (
              action === "MAP"
            ) {

              setMessage(
                "Stoichiometry Nexus Map active."
              );


            } else if (
              action === "HELP"
            ) {

              setMessage(
                "Bangun PATH → pilih FORMULA → hitung → pilih UNIT → LOCK ANSWER."
              );
            }
          }
        );
      }
    );
}


/* ============================================================
   END BAGIAN 3
   ============================================================ */
/* ============================================================
   34. REALTIME PLAYERS
   ============================================================ */

function subscribePlayers() {

  if (
    !room ||
    playersChannel
  ) {
    return;
  }


  playersChannel =
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

          /*
            Ada perubahan:
            - energy
            - ready
            - player
            - crystal
            dll.

            Refresh daftar pemain.
          */

          await loadGamePlayers();


          const roomData =
            await loadGameRoom();


          if (roomData) {

            applyTurnState(
              roomData
            );
          }
        }
      )
      .subscribe(
        status => {

          console.log(
            "PLAYERS REALTIME:",
            status
          );
        }
      );
}


/* ============================================================
   35. REALTIME ROOM
   ============================================================ */

function subscribeRoom() {

  if (
    !room ||
    roomChannel
  ) {
    return;
  }


  roomChannel =
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
        async function(payload) {

          console.log(
            "ROOM REALTIME UPDATE:",
            payload.new
          );


          /*
            Simpan kondisi giliran
            sebelum update.
          */

          const previousMyTurn =
            isMyTurn;


          /*
            Refresh pemain terlebih dahulu
            supaya currentPlayer dan slot
            tetap sinkron.
          */

          await loadGamePlayers();


          /*
            Terapkan current_turn terbaru.
          */

          applyTurnState(
            payload.new
          );


          /*
            Jika sebelumnya bukan giliran
            siswa ini, lalu sekarang menjadi
            gilirannya:
            ambil challenge BARU.
          */

          if (
            !previousMyTurn &&
            isMyTurn
          ) {

            await loadQuestion();
          }


          /*
            Jika giliran siswa ini selesai,
            sembunyikan challenge.

            Dengan demikian soal milik siswa
            tidak ditampilkan pada pemain lain.
          */

          if (
            previousMyTurn &&
            !isMyTurn
          ) {

            currentQuestion =
              null;


            if (caseZone) {

              caseZone.textContent =
                "NEXUS";
            }


            if (caseTitle) {

              caseTitle.textContent =
                "WAITING FOR TURN";
            }


            if (caseDifficulty) {

              caseDifficulty.textContent =
                "WAITING";
            }


            if (caseQuestion) {

              caseQuestion.textContent =
                "Challenge pemain lain tidak ditampilkan.";
            }


            setSubmitDisabled(
              true
            );
          }
        }
      )
      .subscribe(
        status => {

          console.log(
            "ROOM REALTIME:",
            status
          );
        }
      );
}


/* ============================================================
   36. INTERFACE INITIALIZATION
   ============================================================ */

function initializeInterface() {

  /*
    Event listener hanya dipasang
    satu kali saat halaman dibuka.
  */

  initializePathBuilder();

  initializeFormulaBuilder();

  initializeCalculationTracking();

  initializeUnitTracking();

  initializeHintButton();

  initializeSubmitButton();

  initializeZoneButtons();

  initializeGameActions();


  /*
    Render kondisi awal.
  */

  renderSelectedPath();

  renderDynamicFormulaBuilder();

  renderDynamicUnits();


  /*
    LOCK ANSWER belum boleh digunakan
    sebelum session + turn siap.
  */

  setSubmitDisabled(
    true
  );


  console.log(
    "MOL-NEXUS INTERFACE INITIALIZED"
  );
}


/* ============================================================
   37. START MOL-NEXUS GAME
   ============================================================ */

async function startMolNexusGame() {

  console.log(
    "================================"
  );

  console.log(
    "MOL-NEXUS GAME CONTROLLER v3.0"
  );

  console.log(
    "================================"
  );


  /*
    Pasang interface terlebih dahulu.
  */

  initializeInterface();


  /*
    Tidak ada token berarti game
    tidak boleh dibuka langsung.
  */

  if (!sessionToken) {

    console.warn(
      "SESSION TOKEN NOT FOUND"
    );


    window.location.replace(
      "student-login.html"
    );


    return;
  }


  try {

    /* ========================================================
       STEP 1
       VALIDATE STUDENT SESSION
       ======================================================== */

    const studentRecord =
      await validateStudentSession();


    student =
      studentRecord.display_name ||
      student;


    console.log(
      "STUDENT SESSION VALID:",
      {
        student_id:
          currentStudentId,

        display_name:
          student
      }
    );


    /* ========================================================
       STEP 2
       GET ROOM FROM LOBBY STORAGE
       ======================================================== */

    room =
      sessionStorage.getItem(
        "mol_nexus_room"
      ) ||
      room;


    if (!room) {

      console.warn(
        "ROOM NOT FOUND"
      );


      setMessage(
        "Room tidak ditemukan. Masuk kembali melalui Multiplayer Lobby."
      );


      /*
        Tidak langsung menghapus token.
        Token siswa masih valid.
      */

      setTimeout(
        function() {

          window.location.replace(
            "lobby.html"
          );
        },
        1000
      );


      return;
    }


    /*
      Sekarang identitas siswa dan room
      sudah tervalidasi.

      Baru render header.
    */

    renderBasicData();


    /* ========================================================
       STEP 3
       LOAD ROOM
       ======================================================== */

    const roomData =
      await loadGameRoom();


    if (!roomData) {

      console.warn(
        "START GAME: ROOM FAILED"
      );


      return;
    }


    console.log(
      "ROOM READY:",
      {
        room_code:
          roomData.room_code,

        status:
          roomData.status,

        current_turn:
          roomData.current_turn
      }
    );


    /* ========================================================
       STEP 4
       LOAD ROOM PLAYERS
       ======================================================== */

    await loadGamePlayers();


    /*
      currentPlayer harus ditemukan
      dari membership room_players.
    */

    if (!currentPlayer) {

      console.warn(
        "CURRENT PLAYER NOT FOUND"
      );


      setMessage(
        "Akun siswa tidak ditemukan sebagai anggota room."
      );


      if (turnStatus) {

        turnStatus.textContent =
          "PLAYER NOT FOUND";
      }


      return;
    }


    console.log(
      "CURRENT PLAYER READY:",
      {
        player_slot:
          currentPlayer.player_slot,

        student_id:
          currentPlayer.student_id,

        player_name:
          getPlayerName(
            currentPlayer
          )
      }
    );


    /* ========================================================
       STEP 5
       APPLY TURN
       ======================================================== */

    applyTurnState(
      roomData
    );


    /* ========================================================
       STEP 6
       START REALTIME
       ======================================================== */

    subscribePlayers();

    subscribeRoom();


    /* ========================================================
       STEP 7
       LOAD PERSONAL CHALLENGE
       ======================================================== */

    if (isMyTurn) {

      await loadQuestion();

    } else {

      currentQuestion =
        null;


      if (caseZone) {

        caseZone.textContent =
          "NEXUS";
      }


      if (caseTitle) {

        caseTitle.textContent =
          "WAITING FOR TURN";
      }


      if (caseDifficulty) {

        caseDifficulty.textContent =
          "WAITING";
      }


      if (caseQuestion) {

        caseQuestion.textContent =
          "Challenge pemain lain tidak ditampilkan.";
      }
    }


    console.log(
      "================================"
    );

    console.log(
      "MOL-NEXUS GAME READY v3.0"
    );

    console.log(
      {
        room:
          room,

        student:
          student,

        student_id:
          currentStudentId,

        player_slot:
          currentPlayer.player_slot,

        current_turn:
          currentTurn,

        is_my_turn:
          isMyTurn
      }
    );

    console.log(
      "================================"
    );


  } catch (error) {

    console.error(
      "START MOL-NEXUS ERROR:",
      error
    );


    /*
      Jika validate_student_session
      gagal, kemungkinan token:
      - tidak valid
      - expired
      - revoked

      Token lokal dihapus.
    */

    sessionStorage.removeItem(
      "mol_nexus_session_token"
    );


    setMessage(
      "Sesi siswa tidak valid atau sudah berakhir."
    );


    if (turnStatus) {

      turnStatus.textContent =
        "SESSION EXPIRED";
    }


    setTimeout(
      function() {

        window.location.replace(
          "student-login.html"
        );
      },
      1200
    );
  }
}


/* ============================================================
   38. CLEANUP REALTIME
   ============================================================ */

window.addEventListener(
  "beforeunload",
  function() {

    if (playersChannel) {

      supabaseClient.removeChannel(
        playersChannel
      );
    }


    if (roomChannel) {

      supabaseClient.removeChannel(
        roomChannel
      );
    }
  }
);


/* ============================================================
   39. START AFTER DOM READY
   ============================================================ */

window.addEventListener(
  "DOMContentLoaded",
  startMolNexusGame
);


/* ============================================================
   END
   MOL-NEXUS GAME CONTROLLER v3.0 CLEAN
   ============================================================ */
