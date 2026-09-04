/* ============================================================
   MOL-NEXUS GAME CONTROLLER
   Version 2.2
   Multiplayer + Supabase + Multi-Step Diagnostic Gameplay
   ============================================================ */


/* ============================================================
   1. SUPABASE CONFIG
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
   2. URL / PLAYER DATA
   ============================================================ */

const urlParams =
  new URLSearchParams(
    window.location.search
  );

const student =
  urlParams.get("student") ||
  localStorage.getItem(
    "molNexusStudent"
  ) ||
  "";

const room =
  urlParams.get("room") ||
  localStorage.getItem(
    "molNexusRoom"
  ) ||
  "";

if (student) {
  localStorage.setItem(
    "molNexusStudent",
    student
  );
}

if (room) {
  localStorage.setItem(
    "molNexusRoom",
    room
  );
}


/* ============================================================
   3. DOM
   ============================================================ */

const gameRoom =
  document.getElementById(
    "gameRoom"
  );

const gameStudent =
  document.getElementById(
    "gameStudent"
  );

const gameEnergy =
  document.getElementById(
    "gameEnergy"
  );

const sideEnergy =
  document.getElementById(
    "sideEnergy"
  );

const crystalCount =
  document.getElementById(
    "crystalCount"
  );

const gamePlayersList =
  document.getElementById(
    "gamePlayersList"
  );

const currentPlayerName =
  document.getElementById(
    "currentPlayerName"
  );

const turnStatus =
  document.getElementById(
    "turnStatus"
  );

const gameMessage =
  document.getElementById(
    "gameMessage"
  );

const caseZone =
  document.getElementById(
    "caseZone"
  );

const caseTitle =
  document.getElementById(
    "caseTitle"
  );

const caseDifficulty =
  document.getElementById(
    "caseDifficulty"
  );

const caseQuestion =
  document.getElementById(
    "caseQuestion"
  );

const selectedPathElement =
  document.getElementById(
    "selectedPath"
  );

const calculationAnswer =
  document.getElementById(
    "calculationAnswer"
  );

const unitAnswer =
  document.getElementById(
    "unitAnswer"
  );

const hintButton =
  document.getElementById(
    "hintButton"
  );

const submitCaseButton =
  document.getElementById(
    "submitCaseButton"
  );

const caseFeedback =
  document.getElementById(
    "caseFeedback"
  );


/* ============================================================
   4. GAME STATE
   ============================================================ */

let currentPlayer = null;
let currentQuestion = null;

let currentStudentId = null;
let currentSessionId = null;

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

let selectedZone = null;

let lastQuestionId = null;

/* ============================================================
   MULTIPLAYER TURN STATE
   ============================================================ */

let currentTurn = 1;
let isMyTurn = false;
let currentPlayers = [];
/* ============================================================
   5. UTILITIES
   ============================================================ */

function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}


function normalizeText(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function getPlayerName(player) {

  if (!player) {
    return "";
  }

  return (
    player.student_name ||
    player.player_name ||
    player.name ||
    ""
  );
}


function nowMs() {

  return Date.now();
}


function elapsedMs(start) {

  if (!start) {
    return null;
  }

  return Math.max(
    0,
    nowMs() - start
  );
}


function setSubmitDisabled(
  disabled
) {

  if (!submitCaseButton) {
    return;
  }

  submitCaseButton.disabled =
    disabled;
}

/* ============================================================
   MULTIPLAYER TURN CONTROL
   ============================================================ */

function applyTurnState(roomData) {
    if (!roomData || !currentPlayer) {
        return;
    }

    currentTurn = Number(roomData.current_turn || 1);

    const mySlot = Number(currentPlayer.player_slot);

    isMyTurn = mySlot === currentTurn;

    /*
     * CURRENT PLAYER harus menunjukkan
     * pemain yang BENAR-BENAR sedang mendapat giliran,
     * bukan pemilik browser/tab.
     */
    const activePlayer =
        Array.isArray(currentPlayers)
            ? currentPlayers.find(
                player =>
                    Number(player.player_slot) === currentTurn
              )
            : null;

    if (currentPlayerName) {
        currentPlayerName.textContent =
            activePlayer
                ? getPlayerName(activePlayer).toUpperCase()
                : "PLAYER " + currentTurn;
    }

    if (isMyTurn) {
        if (turnStatus) {
            turnStatus.textContent =
                "YOUR TURN • PLAYER " + mySlot;
        }

        if (gameMessage) {
            gameMessage.textContent =
                "Giliran Anda. Pilih Nexus dan selesaikan challenge.";
        }

        setSubmitDisabled(false);

    } else {
        if (turnStatus) {
            turnStatus.textContent =
                "PLAYER " + currentTurn + " TURN";
        }

        if (gameMessage) {
            gameMessage.textContent =
                "Menunggu giliran Player " + currentTurn + ".";
        }

        setSubmitDisabled(true);
    }

    console.log(
        "TURN STATE:",
        {
            current_turn: currentTurn,
            my_slot: mySlot,
            active_player:
                activePlayer
                    ? getPlayerName(activePlayer)
                    : null,
            is_my_turn: isMyTurn
        }
    );
}
/* ============================================================
   6. BASIC DATA
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
   7. LOAD ROOM
   ============================================================ */

async function loadGameRoom() {

  if (!room) {
    return null;
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("game_rooms")
    .select("*")
    .eq(
      "room_code",
      room
    )
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


  const status =
    String(
      data.status || ""
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

  } else {

    if (gameMessage) {

      gameMessage.textContent =
        "Waiting for Nexus activation.";
    }
  }

applyTurnState(data);
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
    data: players,
    error
  } = await supabaseClient
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

    if (gameMessage) {

      gameMessage.textContent =
        "Gagal membaca data pemain.";
    }

    return [];
  }


  const safePlayers =
    players || [];


  renderPlayers(
    safePlayers
  );

  findCurrentPlayer(
    safePlayers
  );

const roomData = await loadGameRoom();

if (roomData) {
  applyTurnState(roomData);
}
  return safePlayers;
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
              playerName ||
              "WAITING..."
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


  gamePlayersList.innerHTML =
    html;
}


/* ============================================================
   10. CURRENT PLAYER
   ============================================================ */

function findCurrentPlayer(
  players
) {

  if (!student) {
    return;
  }


  const target =
    normalizeText(student);


  currentPlayer =
    players.find(
      player =>
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


/* ============================================================
   11. ENSURE STUDENT RECORD
   ============================================================ */

async function ensureStudentRecord() {

  if (!currentPlayer) {

    console.warn(
      "STUDENT RECORD: currentPlayer belum tersedia."
    );

    return null;
  }


  const playerId =
    currentPlayer.id ??
    currentPlayer.player_slot;


  if (
    playerId === null ||
    playerId === undefined
  ) {

    console.error(
      "STUDENT RECORD: ID pemain tidak ditemukan."
    );

    return null;
  }


  const displayName =
    getPlayerName(
      currentPlayer
    ) ||
    student ||
    `PLAYER ${playerId}`;


  const studentCode =
    `${String(room)
      .trim()
      .toUpperCase()}-P${playerId}`;


  try {

    const {
      data: existingStudent,
      error: findError
    } = await supabaseClient
      .from("students")
      .select(
        "student_id, student_code, display_name"
      )
      .eq(
        "student_code",
        studentCode
      )
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


    const {
      data: newStudent,
      error: insertError
    } = await supabaseClient
      .from("students")
      .insert({
        student_code:
          studentCode,

        display_name:
          displayName,

        username:
          displayName
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
}/* ============================================================
   GAME SESSION
   Memastikan setiap room memiliki session aktif
   ============================================================ */

async function ensureGameSession() {

  if (!room) {

    console.warn(
      "GAME SESSION: room belum tersedia."
    );

    return null;
  }


  try {

    const {
      data: existingSessions,
      error: findError
    } = await supabaseClient
      .from("game_sessions")
      .select(
        "session_id, room_code, status, created_at"
      )
      .eq(
        "room_code",
        room
      )
      .in(
        "status",
        ["WAITING", "PLAYING"]
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(1);


    if (findError) {

      console.error(
        "FIND GAME SESSION ERROR:",
        findError
      );

      return null;
    }


    if (
      Array.isArray(
        existingSessions
      ) &&
      existingSessions.length > 0
    ) {

      currentSessionId =
        existingSessions[0]
          .session_id;


      console.log(
        "GAME SESSION FOUND:",
        existingSessions[0]
      );


      return existingSessions[0];
    }


    const {
      data: newSession,
      error: insertError
    } = await supabaseClient
      .from("game_sessions")
      .insert({
        room_code:
          room,

        status:
          "WAITING"
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


      if (gameMessage) {

        gameMessage.textContent =
          "SESSION ERROR: " +
          (
            insertError.message ||
            JSON.stringify(
              insertError
            )
          );
      }


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


/* ============================================================
   CURRENT PLAYER DISPLAY
   ============================================================ */

function renderCurrentPlayer() {

  if (!currentPlayer) {
    return;
  }


  const name =
    getPlayerName(
      currentPlayer
    );


  const energy =
    Number(
      currentPlayer.nexus_energy ||
      0
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


  renderCrystals(
    currentPlayer
  );
}


/* ============================================================
   11. CRYSTALS
   ============================================================ */

function renderCrystals(player) {

  const crystalMap = [

    {
      id:
        "massCrystal",

      fields: [
        "mass_crystal",
        "crystal_mass"
      ]
    },

    {
      id:
        "particleCrystal",

      fields: [
        "particle_crystal",
        "crystal_particle"
      ]
    },

    {
      id:
        "gasCrystal",

      fields: [
        "gas_crystal",
        "crystal_gas"
      ]
    },

    {
      id:
        "solutionCrystal",

      fields: [
        "solution_crystal",
        "crystal_solution"
      ]
    }

  ];


  let total = 0;


  crystalMap.forEach(
    item => {

      const element =
        document.getElementById(
          item.id
        );


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
    }
  );


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
    .querySelectorAll(
      ".path-block"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          function() {

            const value =
              this.dataset.path;


            if (!value) {
              return;
            }


            /*
               Timer PATH dimulai ketika
               siswa pertama kali berinteraksi
               dengan Path Builder.
            */

            if (
              pathStageStartTime ===
              null
            ) {

              pathStageStartTime =
                nowMs();
            }


            /*
               Jika node belum dipilih,
               tambahkan ke akhir path.

               Jika node sudah dipilih,
               path dipotong sampai sebelum
               node tersebut.

               Contoh:
               MASS → MOL → PARTICLE

               tekan MOL lagi:
               menjadi MASS
            */

            if (
              selectedPath.includes(
                value
              )
            ) {

              const index =
                selectedPath.indexOf(
                  value
                );


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
   RENDER SELECTED PATH
   ============================================================ */

function renderSelectedPath() {

  if (!selectedPathElement) {
    return;
  }


  if (
    selectedPath.length === 0
  ) {

    selectedPathElement.textContent =
      "PATH: —";

    return;
  }


  selectedPathElement.textContent =
    "PATH: " +
    selectedPath.join(
      " → "
    );
}


/* ============================================================
   RENDER PATH BUTTON STATE
   ============================================================ */

function renderPathSelection() {

  document
    .querySelectorAll(
      ".path-block"
    )
    .forEach(
      button => {

        const value =
          button.dataset.path;


        if (
          selectedPath.includes(
            value
          )
        ) {

          button.classList.add(
            "selected"
          );

        } else {

          button.classList.remove(
            "selected"
          );
        }
      }
    );
}


/* ============================================================
   RESET PATH
   ============================================================ */

function resetPath() {

  selectedPath = [];


  document
    .querySelectorAll(
      ".path-block"
    )
    .forEach(
      button => {

        button.classList.remove(
          "selected"
        );
      }
    );


  renderSelectedPath();
     }/* ============================================================
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
    document.createElement(
      "div"
    );


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


/* ============================================================
   RENDER SELECTED FORMULAS
   ============================================================ */

function renderSelectedFormulas() {

  const element =
    getFormulaDisplayElement();


  if (!element) {
    return;
  }


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
    labels.join(
      " → "
    );
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
     Formula diacak setiap challenge
     supaya posisi tombol tidak menjadi
     petunjuk jawaban bagi siswa.
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
        item => {

          return `
            <button
              type="button"
              class="formula-block"
              data-formula="${escapeHTML(item.id)}"
            >
              ${escapeHTML(item.label)}
            </button>
          `;

        }
      )
      .join("");


  renderSelectedFormulas();
}


/* ============================================================
   16. FORMULA BUILDER — MULTI STEP
   ============================================================ */

function initializeFormulaBuilder() {

  /*
     Event delegation digunakan karena
     tombol formula dibuat ulang setiap
     challenge.
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


      const formulaId =
        button.dataset.formula;


      if (!formulaId) {
        return;
      }


      /*
         Timer formula dimulai pada
         interaksi formula pertama.
      */

      if (
        formulaStageStartTime ===
        null
      ) {

        formulaStageStartTime =
          nowMs();
      }


      /*
         Bila siswa mulai memilih formula,
         timer PATH dihentikan apabila
         sebelumnya sudah dimulai.
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


      const existingIndex =
        selectedFormulas.indexOf(
          formulaId
        );


      /*
         Formula belum ada:
         tambahkan sebagai langkah baru.
      */

      if (
        existingIndex === -1
      ) {

        selectedFormulas.push(
          formulaId
        );

      } else {

        /*
           Formula ditekan kembali:
           hapus formula tersebut dan
           seluruh formula setelahnya.

           Contoh:

           n=m/Mr → N=n×NA

           Jika n=m/Mr ditekan kembali,
           sequence kembali kosong.
        */

        selectedFormulas =
          selectedFormulas.slice(
            0,
            existingIndex
          );
      }


      formulaTimeMs =
        elapsedMs(
          formulaStageStartTime
        );


      renderFormulaSelection();

      renderSelectedFormulas();


      console.log(
        "FORMULA PATH:",
        selectedFormulas
      );
    }
  );
}


/* ============================================================
   RENDER FORMULA SELECTION
   ============================================================ */

function renderFormulaSelection() {

  document
    .querySelectorAll(
      ".formula-block"
    )
    .forEach(
      button => {

        const formulaId =
          button.dataset.formula;


        const index =
          selectedFormulas.indexOf(
            formulaId
          );


        if (
          index >= 0
        ) {

          button.classList.add(
            "selected"
          );


          button.setAttribute(
            "data-step",
            String(
              index + 1
            )
          );

        } else {

          button.classList.remove(
            "selected"
          );


          button.removeAttribute(
            "data-step"
          );
        }
      }
    );
}


/* ============================================================
   RESET FORMULA
   ============================================================ */

function resetFormula() {

  selectedFormulas = [];


  document
    .querySelectorAll(
      ".formula-block"
    )
    .forEach(
      button => {

        button.classList.remove(
          "selected"
        );


        button.removeAttribute(
          "data-step"
        );
      }
    );


  renderSelectedFormulas();
}


/* ============================================================
   17. NORMALIZE PATH
   ============================================================ */

function normalizePath(value) {

  if (!value) {
    return "";
  }


  if (
    Array.isArray(value)
  ) {

    return value
      .map(
        item =>
          String(item)
            .trim()
            .toUpperCase()
      )
      .join(">");
  }


  /*
     expected_path dari Supabase dapat
     berupa JSON / JSON string / teks.
  */

  const text =
    String(value).trim();


  try {

    const parsed =
      JSON.parse(text);


    if (
      Array.isArray(parsed)
    ) {

      return parsed
        .map(
          item =>
            String(item)
              .trim()
              .toUpperCase()
        )
        .join(">");
    }

  } catch (error) {

    /*
       Bukan JSON.
       Lanjutkan normalisasi teks biasa.
    */
  }


  return text
    .replaceAll(
      "→",
      ">"
    )
    .replaceAll(
      "↔",
      ">"
    )
    .replace(
      /[\[\]"']/g,
      ""
    )
    .replaceAll(
      ",",
      ">"
    )
    .replace(
      /\s+/g,
      ""
    )
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
    normalizePath(
      selectedPath
    ) ===
    normalizePath(
      expected
    )
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


  text =
    text
      .replace(
        /\s+/g,
        ""
      )
      .replace(
        /[×x]/g,
        "*"
      )
      .replace(
        /÷/g,
        "/"
      )
      .replace(
        /,/g,
        "."
      )
      .replace(
        /₂/g,
        "2"
      )
      .replace(
        /₃/g,
        "3"
      );


  /*
     Database menggunakan Vm pada
     beberapa soal gas.

     Interface menggunakan 22.4 L/mol.

     Untuk konteks STP keduanya
     diperlakukan sebagai representasi
     hubungan yang sama.
  */

  text =
    text
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


/* ============================================================
   SPLIT EXPECTED FORMULAS
   ============================================================ */

function splitExpectedFormulas(
  value
) {

  if (!value) {
    return [];
  }


  if (
    Array.isArray(value)
  ) {

    return value
      .map(
        item =>
          String(item).trim()
      )
      .filter(Boolean);
  }


  return String(value)
    .split(
      /[;|]+/
    )
    .map(
      item =>
        item.trim()
    )
    .filter(Boolean);
}


/* ============================================================
   FORMULA ID → LABEL
   ============================================================ */

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


  /*
     Jumlah formula harus sama.
     Ini penting untuk soal multistep.
  */

  if (
    selectedFormulas.length !==
    expectedParts.length
  ) {

    return false;
  }


  /*
     Urutan formula juga harus sama.
  */

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
     }/* ============================================================
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
      .replace(
        ",",
        "."
      );


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
   CALCULATION TIMER
   ============================================================ */

function initializeCalculationTracking() {

  if (!calculationAnswer) {
    return;
  }


  /*
     Timer calculation dimulai ketika
     siswa pertama kali berinteraksi
     dengan kolom jawaban.
  */

  const startCalculationTimer =
    function() {

      if (
        calculationStageStartTime ===
        null
      ) {

        calculationStageStartTime =
          nowMs();
      }


      /*
         Ketika tahap calculation dimulai,
         waktu formula terakhir dicatat.
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
    startCalculationTimer
  );


  calculationAnswer.addEventListener(
    "input",
    function() {

      startCalculationTimer();


      calculationTimeMs =
        elapsedMs(
          calculationStageStartTime
        );
    }
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

    "molar": "molar",

    "molekul": "molekul",

    "molecule": "molekul",

    "molecules": "molekul",

    "partikel": "partikel",

    "particle": "partikel",

    "particles": "partikel",

    "liter": "l",

    "litre": "l",

    "l": "l",

    "milliliter": "ml",

    "millilitre": "ml",

    "ml": "ml",

    "gram": "g",

    "grams": "g",

    "g": "g",

    "mol": "mol",

    "atom": "atom",

    "atoms": "atom"

  };


  return (
    aliases[text] ||
    text
  );
}


/* ============================================================
   EVALUATE UNIT
   ============================================================ */

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
    normalizeUnit(
      answer
    ) ===
    normalizeUnit(
      expected
    )
  );
}


/* ============================================================
   23. FIRST FAILURE POINT
   ============================================================ */

/*
   FIRST FAILURE POINT menunjukkan
   tahap pertama tempat kesalahan
   siswa muncul.

   Nilai yang disimpan ke Supabase:

   PATH
   FORMULA
   CALCULATION
   UNIT
   NONE

   Nilai ini sengaja DIPISAHKAN
   dari error_type.
*/

function determineFirstFailurePoint(
  pathCorrect,
  formulaCorrect,
  calculationCorrect,
  unitCorrect
) {

  if (
    pathCorrect === false
  ) {

    return "PATH";
  }


  if (
    formulaCorrect === false
  ) {

    return "FORMULA";
  }


  if (
    calculationCorrect === false
  ) {

    return "CALCULATION";
  }


  if (
    unitCorrect === false
  ) {

    return "UNIT";
  }


  return "NONE";
}


/* ============================================================
   24. ERROR TYPE
   ============================================================ */

/*
   ERROR TYPE menunjukkan pola
   kesalahan pada satu attempt.

   Jika hanya satu komponen salah:

   PATH_ERROR
   FORMULA_ERROR
   CALCULATION_ERROR
   UNIT_ERROR

   Jika lebih dari satu komponen salah:

   MULTIPLE_ERROR

   Jika seluruh komponen benar:

   NONE
*/

function determineErrorType(
  pathCorrect,
  formulaCorrect,
  calculationCorrect,
  unitCorrect
) {

  const errors = [];


  if (
    pathCorrect === false
  ) {

    errors.push(
      "PATH_ERROR"
    );
  }


  if (
    formulaCorrect === false
  ) {

    errors.push(
      "FORMULA_ERROR"
    );
  }


  if (
    calculationCorrect === false
  ) {

    errors.push(
      "CALCULATION_ERROR"
    );
  }


  if (
    unitCorrect === false
  ) {

    errors.push(
      "UNIT_ERROR"
    );
  }


  if (
    errors.length === 0
  ) {

    return "NONE";
  }


  if (
    errors.length > 1
  ) {

    return "MULTIPLE_ERROR";
  }


  return errors[0];
}


/* ============================================================
   25. FINAL CORRECT
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
   26. RESET DIAGNOSTIC TIMERS
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


/* ============================================================
   27. FINALIZE DIAGNOSTIC TIMERS
   ============================================================ */

function finalizeDiagnosticTimers() {

  /*
     Saat LOCK ANSWER ditekan,
     timer tahap yang sedang aktif
     diperbarui untuk terakhir kali.
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


/* ============================================================
   28. GET TOTAL RESPONSE TIME
   ============================================================ */

function getTotalResponseTime() {

  if (!questionStartTime) {
    return null;
  }


  return elapsedMs(
    questionStartTime
  );
}


/* ============================================================
   29. RESET ATTEMPT STATE
   ============================================================ */

function resetAttemptState() {

  selectedPath = [];

  selectedFormulas = [];

  hintCount = 0;

  retryCount = 0;

  attemptSequence = 1;


  resetDiagnosticTimers();


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
         }/* ============================================================
   30. LOAD QUESTION
   ============================================================ */

async function loadQuestion() {

  const {
    data,
    error
  } = await supabaseClient
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


  /*
     Jika pemain memilih zona Nexus,
     prioritaskan soal dari zona tersebut.
  */

  let questionPool =
    [...data];


  if (selectedZone) {

    const zoneFiltered =
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
      zoneFiltered.length > 0
    ) {

      questionPool =
        zoneFiltered;
    }
  }


  /*
     Hindari soal yang sama muncul
     dua kali berturut-turut apabila
     tersedia lebih dari satu soal.
  */

  if (
    questionPool.length > 1 &&
    lastQuestionId
  ) {

    const withoutLast =
      questionPool.filter(
        question =>
          question.question_id !==
          lastQuestionId
      );


    if (
      withoutLast.length > 0
    ) {

      questionPool =
        withoutLast;
    }
  }


  const randomIndex =
    Math.floor(
      Math.random() *
      questionPool.length
    );


  currentQuestion =
    questionPool[
      randomIndex
    ];


  lastQuestionId =
    currentQuestion.question_id ||
    currentQuestion.id ||
    null;


  console.log(
    "CURRENT QUESTION:",
    currentQuestion
  );


  renderQuestion(
    currentQuestion
  );
}


/* ============================================================
   31. RENDER QUESTION
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
    zone +
      " CHALLENGE";


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


  /*
     Setiap challenge baru harus
     memulai attempt dari kondisi bersih.
  */

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


  /*
     Formula Builder dibuat ulang agar
     posisi tombol kembali diacak.
  */

  renderDynamicFormulaBuilder();

  renderFormulaSelection();


  /*
     Unit jawaban dibuat ulang.
  */

  renderDynamicUnits();


  /*
     Mulai timer challenge.
  */

  resetDiagnosticTimers();


  /*
     Tombol LOCK ANSWER diaktifkan
     kembali setelah soal baru muncul.
  */

  setSubmitDisabled(
    false
  );


  console.log(
    "QUESTION READY:",
    {
      question_id:
        question.question_id ||
        question.id,

      question_code:
        question.question_code,

      zone:
        zone,

      attempt_sequence:
        attemptSequence
    }
  );
}


/* ============================================================
   32. UNIT OPTIONS
   ============================================================ */

function renderDynamicUnits() {

  if (!unitAnswer) {
    return;
  }


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
    units
      .map(
        unit => {

          return `
            <option value="${escapeHTML(unit.value)}">
              ${escapeHTML(unit.label)}
            </option>
          `;

        }
      )
      .join("");
}


/* ============================================================
   33. UNIT INTERACTION TRACKING
   ============================================================ */

function initializeUnitTracking() {

  if (!unitAnswer) {
    return;
  }


  unitAnswer.addEventListener(
    "change",
    function() {

      /*
         Ketika siswa sudah memilih unit,
         calculation timer diperbarui.

         Unit belum memiliki kolom timer
         tersendiri pada case_attempts,
         sehingga waktunya tetap menjadi
         bagian dari total_response_time_ms.
      */

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
   34. HINT
   ============================================================ */

function initializeHintButton() {

  if (!hintButton) {
    return;
  }


  hintButton.addEventListener(
    "click",
    function() {

      if (!currentQuestion) {

        showFeedback(
          "Belum ada challenge aktif."
        );

        return;
      }


      hintCount++;


      /*
         Maksimal level hint adalah 3.
         Klik berikutnya tetap tercatat
         sebagai penggunaan hint, tetapi
         pesan tetap pada Hint 3.
      */

      if (
        hintCount === 1
      ) {

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
          "HINT 3: Periksa kembali urutan PATH, FORMULA, perhitungan, dan satuan."
        );
      }


      console.log(
        "HINT USED:",
        {
          question_id:
            currentQuestion.question_id ||
            currentQuestion.id,

          hint_count:
            hintCount
        }
      );
    }
  );
}


/* ============================================================
   35. VALIDATE ANSWER INPUT
   ============================================================ */

function validateCurrentAnswer() {

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


  const calculationValue =
    String(
      calculationAnswer?.value ??
      ""
    ).trim();


  if (
    calculationValue === ""
  ) {

    return {
      valid: false,
      message:
        "Masukkan hasil perhitungan."
    };
  }


  if (
    !unitAnswer?.value
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
   36. CREATE DIAGNOSTIC RESULT
   ============================================================ */

function createDiagnosticResult(
  pathCorrect,
  formulaCorrect,
  calculationCorrect,
  unitCorrect,
  finalCorrect,
  firstFailurePoint,
  errorType,
  responseTimeMs
) {

  return {

    question_id:
      currentQuestion?.question_id ||
      currentQuestion?.id ||
      null,

    question_code:
      currentQuestion?.question_code ||
      null,

    nexus_zone:
      currentQuestion?.nexus_zone ||
      null,

    difficulty:
      currentQuestion?.difficulty ||
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
      firstFailurePoint,

    error_type:
      errorType,

    attempt_sequence:
      attemptSequence,

    retry_count:
      retryCount,

    response_time_ms:
      responseTimeMs,

    path_time_ms:
      pathTimeMs,

    formula_time_ms:
      formulaTimeMs,

    calculation_time_ms:
      calculationTimeMs,

    hint_count:
      hintCount
  };
       }/* ============================================================
   37. BUILD CASE ATTEMPT DATA
   ============================================================ */

function buildAttemptData(
  pathCorrect,
  formulaCorrect,
  calculationCorrect,
  unitCorrect,
  finalCorrect,
  firstFailurePoint,
  errorType,
  responseTimeMs
) {

  return {

    student_id:
      currentStudentId,

    session_id:
      currentSessionId,

    question_id:
      currentQuestion.question_id,

    attempt_sequence:
      attemptSequence,

    /*
       selected_path adalah JSONB
       di Supabase.

       Kirim array JavaScript langsung,
       tidak perlu JSON.stringify().
    */

    selected_path:
      [...selectedPath],

    path_correct:
      pathCorrect,

    selected_formula:
      selectedFormulas
        .map(
          formulaId =>
            formulaIdToLabel(
              formulaId
            )
        )
        .join("; "),

    formula_correct:
      formulaCorrect,

    student_answer:
      Number(
        String(
          calculationAnswer.value
        )
          .trim()
          .replace(",", ".")
      ),

    calculation_correct:
      calculationCorrect,

    selected_unit:
      unitAnswer.value,

    unit_correct:
      unitCorrect,

    final_correct:
      finalCorrect,

    path_time_ms:
      pathTimeMs,

    formula_time_ms:
      formulaTimeMs,

    calculation_time_ms:
      calculationTimeMs,

    total_response_time_ms:
      responseTimeMs,

    hint_count:
      hintCount,

    retry_count:
      retryCount,

    first_failure_point:
      firstFailurePoint,

    error_type:
      errorType
  };
}


/* ============================================================
   38. SAVE CASE ATTEMPT
   ============================================================ */

async function saveCaseAttempt(
  attemptData
) {

  /*
     Tiga ID ini wajib tersedia agar
     attempt dapat dihubungkan dengan:

     siswa
     sesi permainan
     soal
  */

  if (
    !currentStudentId ||
    !currentSessionId ||
    !currentQuestion?.question_id
  ) {

    console.error(
      "CASE ATTEMPT NOT SAVED: missing required ID",
      {
        student_id:
          currentStudentId,

        session_id:
          currentSessionId,

        question_id:
          currentQuestion?.question_id
      }
    );


    return {
      success: false,
      error:
        "MISSING_REQUIRED_ID"
    };
  }


  console.log(
    "SAVING CASE ATTEMPT:",
    attemptData
  );


  const {
  error
} = await supabaseClient
  .from("case_attempts")
  .insert(
    attemptData
  );


  if (error) {

    console.error(
      "CASE ATTEMPT INSERT ERROR:",
      error
    );


    /*
       Detail error juga ditampilkan
       di console agar mudah diperiksa
       apabila constraint Supabase
       menolak suatu nilai.
    */

    console.error(
      "CASE ATTEMPT ERROR DETAIL:",
      {
        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code
      }
    );


    return {
      success: false,
      error: error
    };
  }


  console.log(
    "CASE ATTEMPT SAVED:",
    {

      attempt_sequence:
        attemptData.attempt_sequence,

      first_failure_point:
        attemptData.first_failure_point,

      error_type:
        attemptData.error_type,

      final_correct:
        attemptData.final_correct
    }
  );


  return {
  success: true
};
}


/* ============================================================
   39. INITIALIZE SUBMIT BUTTON
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
   40. SUBMIT CURRENT CASE
   ============================================================ */

async function submitCurrentCase() {

  /*
     Mencegah double click menghasilkan
     dua row attempt sekaligus.
  */

  if (isSubmitting) {

    console.warn(
      "SUBMIT BLOCKED: request masih diproses."
    );

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


  /*
     Pastikan identitas penelitian
     tersedia sebelum evaluasi disimpan.
  */

  if (
    !currentStudentId ||
    !currentSessionId
  ) {

    console.warn(
      "DIAGNOSTIC ID belum siap. Mencoba sinkronisasi ulang."
    );


    if (!currentStudentId) {

      await ensureStudentRecord();
    }


    if (!currentSessionId) {

      await ensureGameSession();
    }
  }


  if (
    !currentStudentId ||
    !currentSessionId ||
    !currentQuestion?.question_id
  ) {

    showFeedback(
      "Data pemain belum tersinkronisasi. Coba beberapa saat lagi."
    );

    return;
  }


  isSubmitting = true;

  setSubmitDisabled(
    true
  );


  try {

    /*
       Finalisasi timer sebelum evaluasi.
    */

    finalizeDiagnosticTimers();


    const responseTimeMs =
      getTotalResponseTime();


    /* ========================================================
       EVALUATE FOUR DIAGNOSTIC COMPONENTS
       ======================================================== */

    const pathCorrect =
      evaluatePath();


    const formulaCorrect =
      evaluateFormula();


    const calculationCorrect =
      evaluateCalculation();


    const unitCorrect =
      evaluateUnit();


    /* ========================================================
       FINAL CORRECT
       ======================================================== */

    const finalCorrect =
      determineFinalCorrect(
        pathCorrect,
        formulaCorrect,
        calculationCorrect,
        unitCorrect
      );


    /* ========================================================
       FIRST FAILURE POINT
       ======================================================== */

    const firstFailurePoint =
      determineFirstFailurePoint(
        pathCorrect,
        formulaCorrect,
        calculationCorrect,
        unitCorrect
      );


    /* ========================================================
       ERROR TYPE
       ======================================================== */

    const errorType =
      determineErrorType(
        pathCorrect,
        formulaCorrect,
        calculationCorrect,
        unitCorrect
      );


    /* ========================================================
       DIAGNOSTIC RESULT FOR CONSOLE
       ======================================================== */

    const diagnosticResult =
      createDiagnosticResult(
        pathCorrect,
        formulaCorrect,
        calculationCorrect,
        unitCorrect,
        finalCorrect,
        firstFailurePoint,
        errorType,
        responseTimeMs
      );


    console.log(
      "MOL-NEXUS DIAGNOSTIC RESULT:",
      diagnosticResult
    );


    /* ========================================================
       BUILD DATABASE ROW
       ======================================================== */

    const attemptData =
      buildAttemptData(
        pathCorrect,
        formulaCorrect,
        calculationCorrect,
        unitCorrect,
        finalCorrect,
        firstFailurePoint,
        errorType,
        responseTimeMs
      );


    /* ========================================================
       SAVE FIRST
       ======================================================== */

    const saveResult =
      await saveCaseAttempt(
        attemptData
      );


    /*
       Jangan berikan reward atau
       memindahkan challenge jika data
       penelitian gagal tersimpan.
    */

    if (!saveResult.success) {

      showFeedback(
        "Jawaban telah diperiksa, tetapi data diagnostik gagal disimpan."
      );


      setSubmitDisabled(
        false
      );


      return;
    }


    /* ========================================================
       CORRECT ANSWER
       ======================================================== */

    if (finalCorrect) {

      /*
         ENERGY:

         Attempt pertama tanpa hint = +3

         Attempt pertama dengan hint = +2

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


      showFeedback(
        `NEXUS CLEAR ✓  +${reward} ENERGY`
      );


      console.log(
        "NEXUS CLEAR:",
        {
          reward:
            reward,

          attempt_sequence:
            attemptSequence,

          retry_count:
            retryCount,

          hint_count:
            hintCount
        }
      );


      /*
         Beri waktu agar siswa melihat
         feedback sebelum challenge baru.
      */

      await wait(
  1400
);

const turnAdvanced =
  await advanceTurn();

if (turnAdvanced) {

  const updatedRoom =
    await loadGameRoom();

  if (updatedRoom) {
    applyTurnState(updatedRoom);
  }
}

return;
    }


    /* ========================================================
       WRONG ANSWER / RETRY
       ======================================================== */

    retryCount++;

    attemptSequence++;


    /*
       Jawaban salah TIDAK menghapus
       pilihan siswa.

       Dengan demikian siswa dapat
       memperbaiki bagian yang dianggap
       salah dan melakukan LOCK ANSWER
       kembali.

       Ini penting untuk merekam proses
       diagnostik, bukan hanya skor akhir.
    */


    showFeedback(
      "NEXUS UNSTABLE — periksa kembali PATH, FORMULA, perhitungan, atau UNIT lalu coba lagi."
    );


    console.log(
      "NEXUS RETRY:",
      {
        next_attempt_sequence:
          attemptSequence,

        retry_count:
          retryCount,

        previous_first_failure:
          firstFailurePoint,

        previous_error_type:
          errorType
      }
    );


    /*
       Timer attempt berikutnya dimulai
       setelah feedback jawaban salah.
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
      "Terjadi gangguan saat memproses jawaban."
    );


    setSubmitDisabled(
      false
    );


  } finally {

    isSubmitting = false;
  }
}

/* ============================================================
   MULTIPLAYER — ADVANCE TURN
   ============================================================ */

async function advanceTurn() {

  if (!room) {
    console.warn("ADVANCE TURN: room tidak tersedia.");
    return false;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient.rpc(
      "next_turn",
      {
        p_room_code: room
      }
    );

    if (error) {

      console.error(
        "ADVANCE TURN ERROR:",
        error
      );

      return false;
    }

    currentTurn = Number(data || 1);

    console.log(
      "TURN ADVANCED:",
      {
        room: room,
        current_turn: currentTurn
      }
    );

    return true;

  } catch (error) {

    console.error(
      "ADVANCE TURN EXCEPTION:",
      error
    );

    return false;
  }
}
/* ============================================================
   41. WAIT UTILITY
   ============================================================ */

function wait(milliseconds) {

  return new Promise(
    resolve => {

      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}


/* ============================================================
   42. FEEDBACK
   ============================================================ */

function showFeedback(message) {

  if (caseFeedback) {

    caseFeedback.textContent =
      message;
  }
}


/* ============================================================
   43. ENERGY
   ============================================================ */

async function addEnergy(amount) {

  if (!currentPlayer) {

    console.warn(
      "ENERGY: currentPlayer tidak tersedia."
    );

    return false;
  }


  if (!currentPlayer.id) {

    console.warn(
      "PLAYER ID NOT FOUND"
    );

    return false;
  }


  const oldEnergy =
    Number(
      currentPlayer.nexus_energy ||
      0
    );


  const newEnergy =
    oldEnergy +
    Number(
      amount || 0
    );


  const {
    error
  } = await supabaseClient
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

    return false;
  }


  currentPlayer.nexus_energy =
    newEnergy;


  renderCurrentPlayer();


  console.log(
    "ENERGY UPDATED:",
    {
      old_energy:
        oldEnergy,

      added:
        Number(
          amount || 0
        ),

      new_energy:
        newEnergy
    }
  );


  return true;
     }/* ============================================================
   44. ZONE BUTTONS
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

            const zone =
              this.dataset.zone;


            if (!zone) {
              return;
            }


            selectedZone =
              zone;


            /*
               Tandai zona yang sedang
               dipilih pada interface.
            */

            document
              .querySelectorAll(
                ".nexus-zone"
              )
              .forEach(
                zoneButton => {

                  zoneButton.classList.remove(
                    "selected"
                  );
                }
              );


            this.classList.add(
              "selected"
            );


            if (gameMessage) {

              gameMessage.textContent =
                zone +
                " NEXUS selected.";
            }


            console.log(
              "ZONE SELECTED:",
              selectedZone
            );


            /*
               Memuat challenge dari zona
               yang dipilih jika tersedia.
            */

            await loadQuestion();
          }
        );
      }
    );
}


/* ============================================================
   45. GAME ACTIONS
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


            if (!gameMessage) {
              return;
            }


            if (
              action === "EVENT"
            ) {

              gameMessage.textContent =
                "EVENT NEXUS akan tersedia pada tahap berikutnya.";

            } else if (
              action === "DUEL"
            ) {

              gameMessage.textContent =
                "NEXUS DUEL akan tersedia pada tahap berikutnya.";

            } else if (
              action === "MAP"
            ) {

              gameMessage.textContent =
                "Stoichiometry Nexus Map active.";

            } else if (
              action === "HELP"
            ) {

              gameMessage.textContent =
                "Bangun PATH → pilih FORMULA secara berurutan → hitung → pilih UNIT → LOCK ANSWER.";
            }
          }
        );
      }
    );
}


/* ============================================================
   46. REALTIME PLAYERS
   ============================================================ */

function subscribePlayers() {

  if (!room) {
    return;
  }


  supabaseClient
    .channel(
      "mol-nexus-game-players-" +
      room
    )
    .on(

      "postgres_changes",

      {
        event: "*",

        schema:
          "public",

        table:
          "room_players",

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
    .subscribe(
      status => {

        console.log(
          "PLAYER REALTIME STATUS:",
          status
        );
      }
    );
}


/* ============================================================
   47. REALTIME ROOM
   ============================================================ */

function subscribeRoom() {

  if (!room) {
    return;
  }


  supabaseClient
    .channel(
      "mol-nexus-game-room-" +
      room
    )
    .on(

      "postgres_changes",

      {
        event:
          "UPDATE",

        schema:
          "public",

        table:
          "game_rooms",

        filter:
          "room_code=eq." +
          room
      },

      function(payload) {

        console.log(
          "ROOM REALTIME:",
          payload
        );


        const status =
          String(
            payload.new?.status ||
            ""
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

        } else {

          if (turnStatus) {

            turnStatus.textContent =
              status ||
              "WAITING";
          }
        }
      }
    )
    .subscribe(
      status => {

        console.log(
          "ROOM REALTIME STATUS:",
          status
        );
      }
    );
}


/* ============================================================
   48. INTERFACE INITIALIZATION
   ============================================================ */

function initializeInterface() {

  renderBasicData();


  /*
     PATH BUILDER
  */

  initializePathBuilder();


  /*
     FORMULA BUILDER

     Menggunakan document event
     delegation sehingga hanya perlu
     diinisialisasi satu kali.
  */

  initializeFormulaBuilder();


  /*
     TRACKING CALCULATION
  */

  initializeCalculationTracking();


  /*
     TRACKING UNIT
  */

  initializeUnitTracking();


  /*
     ZONE SELECTOR
  */

  initializeZoneButtons();


  /*
     HINT
  */

  initializeHintButton();


  /*
     LOCK ANSWER
  */

  initializeSubmitButton();


  /*
     EVENT / DUEL / MAP / HELP
  */

  initializeGameActions();


  console.log(
    "MOL-NEXUS INTERFACE INITIALIZED"
  );
}


/* ============================================================
   49. START GAME
   ============================================================ */

async function startMolNexusGame() {

  console.log(
    "================================"
  );

  console.log(
    "MOL-NEXUS GAME CONTROLLER v2.2"
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


  /*
     Pasang seluruh event listener.
  */

  initializeInterface();


  /*
     Game harus dibuka melalui Lobby
     agar student dan room tersedia.
  */

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


  /*
     1. Pastikan room tersedia.
  */

  const roomData =
    await loadGameRoom();


  if (!roomData) {

    console.warn(
      "START GAME: room tidak tersedia."
    );

    return;
  }


  /*
     2. Ambil pemain.

     Ini harus dilakukan sebelum
     ensureStudentRecord karena
     currentPlayer berasal dari
     room_players.
  */

  await loadGamePlayers();


  if (!currentPlayer) {

    console.warn(
      "START GAME: current player belum ditemukan."
    );


    if (gameMessage) {

      gameMessage.textContent =
        "Pemain belum ditemukan di room. Masuk kembali melalui Multiplayer Lobby.";
    }


    return;
  }


  /*
     3. Sinkronkan player dengan
        tabel students.
  */

  const studentRecord =
    await ensureStudentRecord();


  if (!studentRecord) {

    console.warn(
      "START GAME: student record gagal disiapkan."
    );


    if (gameMessage) {

      gameMessage.textContent =
        "Data siswa gagal disinkronkan.";
    }


    return;
  }


  /*
     4. Pastikan game session aktif.
  */

  const sessionRecord =
    await ensureGameSession();


  if (!sessionRecord) {

    console.warn(
      "START GAME: session gagal disiapkan."
    );


    if (gameMessage) {

      gameMessage.textContent =
        "Game session gagal disiapkan.";
    }


    return;
  }


  console.log(
    "RESEARCH IDENTIFIERS READY:",
    {
      student_id:
        currentStudentId,

      session_id:
        currentSessionId
    }
  );


  /*
     5. Aktifkan realtime.
  */

  subscribePlayers();

  subscribeRoom();


  /*
     6. Ambil challenge pertama.
  */

  await loadQuestion();


  console.log(
    "================================"
  );

  console.log(
    "MOL-NEXUS GAME READY v2.2"
  );

  console.log(
    "================================"
  );
}


/* ============================================================
   50. START AFTER DOM READY
   ============================================================ */

window.addEventListener(
  "DOMContentLoaded",
  startMolNexusGame
);


/* ============================================================
   END
   MOL-NEXUS GAME CONTROLLER v2.2
   ============================================================ */
