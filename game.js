/* ============================================================
   MOL-NEXUS GAME CONTROLLER
   Version 1.0
   Multiplayer + Supabase + Diagnostic Gameplay
   ============================================================ */


/* ============================================================
   1. SUPABASE CONFIG
   ============================================================

   COPY nilai SUPABASE_URL dan SUPABASE_KEY
   langsung dari lobby.js Anda.
   ============================================================ */

const SUPABASE_URL = "https://snlpdwqdjfnborsorspd.supabase.co";
const SUPABASE_KEY = "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* ============================================================
   2. LOGIN / URL DATA
   ============================================================ */

const urlParams = new URLSearchParams(window.location.search);

const studentFromURL = urlParams.get("student");
const roomFromURL = urlParams.get("room");

const student =
  studentFromURL ||
  localStorage.getItem("molNexusStudent") ||
  "";

const room =
  roomFromURL ||
  localStorage.getItem("molNexusRoom") ||
  "";


/* Simpan agar tetap tersedia setelah refresh */

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


console.log("================================");
console.log("MOL-NEXUS GAME CONTROLLER");
console.log("STUDENT:", student);
console.log("ROOM:", room);
console.log("================================");


/* ============================================================
   3. DOM ELEMENTS
   ============================================================ */

const gameRoom =
  document.getElementById("gameRoom");

const gameStudent =
  document.getElementById("gameStudent");

const gameEnergy =
  document.getElementById("gameEnergy");

const sideEnergy =
  document.getElementById("sideEnergy");

const crystalCount =
  document.getElementById("crystalCount");

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

let selectedPath = [];

let selectedFormula = null;

let hintCount = 0;

let questionStartTime = null;


/* ============================================================
   5. BASIC SCREEN DATA
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
   6. SAFE HTML
   ============================================================ */

function escapeHTML(value) {

  return String(value ?? "")

    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ============================================================
   7. PLAYER NAME HELPER
   ============================================================ */

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


/* ============================================================
   8. LOAD GAME ROOM
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


  console.log(
    "GAME ROOM:",
    data
  );


  if (!data) {

    if (gameMessage) {
      gameMessage.textContent =
        "Room tidak ditemukan.";
    }

    return null;
  }


  if (data.status === "PLAYING") {

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
   9. LOAD PLAYERS
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


  console.log(
    "ROOM PLAYERS:",
    players
  );


  renderPlayers(
    players || []
  );

  findCurrentPlayer(
    players || []
  );


  return players || [];
}


/* ============================================================
   10. RENDER 4 PLAYERS
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


  gamePlayersList.innerHTML =
    html;
}


/* ============================================================
   11. FIND CURRENT PLAYER
   ============================================================ */

function findCurrentPlayer(players) {

  if (!student) {
    return;
  }


  const target =
    student
      .trim()
      .toLowerCase();


  currentPlayer =
    players.find(player => {

      const playerName =
        getPlayerName(player)
          .trim()
          .toLowerCase();

      return playerName === target;

    }) || null;


  if (!currentPlayer) {

    console.warn(
      "CURRENT PLAYER NOT FOUND:",
      student
    );

    if (currentPlayerName) {
      currentPlayerName.textContent =
        student.toUpperCase();
    }

    return;
  }


  console.log(
    "CURRENT PLAYER:",
    currentPlayer
  );


  renderCurrentPlayer();
}


/* ============================================================
   12. RENDER CURRENT PLAYER
   ============================================================ */

function renderCurrentPlayer() {

  if (!currentPlayer) {
    return;
  }


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


  renderCrystals(
    currentPlayer
  );
}


/* ============================================================
   13. CRYSTALS
   ============================================================ */

function renderCrystals(player) {

  const crystalMap = {

    mass: {
      element:
        document.getElementById(
          "massCrystal"
        ),

      fields: [
        "mass_crystal",
        "crystal_mass"
      ]
    },

    particle: {
      element:
        document.getElementById(
          "particleCrystal"
        ),

      fields: [
        "particle_crystal",
        "crystal_particle"
      ]
    },

    gas: {
      element:
        document.getElementById(
          "gasCrystal"
        ),

      fields: [
        "gas_crystal",
        "crystal_gas"
      ]
    },

    solution: {
      element:
        document.getElementById(
          "solutionCrystal"
        ),

      fields: [
        "solution_crystal",
        "crystal_solution"
      ]
    }

  };


  let total = 0;


  Object.values(
    crystalMap
  ).forEach(item => {

    const collected =
      item.fields.some(
        field =>
          player[field] === true
      );


    if (collected) {

      total++;

      item.element?.classList.add(
        "collected"
      );

    } else {

      item.element?.classList.remove(
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
   14. PATH BUILDER
   ============================================================ */

function initializePathBuilder() {

  document
    .querySelectorAll(
      ".path-block"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        function () {

          const value =
            this.dataset.path;


          if (!value) {
            return;
          }


          selectedPath.push(
            value
          );


          this.classList.add(
            "selected"
          );


          renderSelectedPath();

        }
      );

    });

}


/* ============================================================
   15. RENDER PATH
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
    selectedPath.join(" → ");
}


/* ============================================================
   16. RESET PATH
   ============================================================ */

function resetPath() {

  selectedPath = [];


  document
    .querySelectorAll(
      ".path-block"
    )
    .forEach(button => {

      button.classList.remove(
        "selected"
      );

    });


  renderSelectedPath();
}


/* ============================================================
   17. FORMULA BUILDER
   ============================================================ */

function initializeFormulaBuilder() {

  document
    .querySelectorAll(
      ".formula-block"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        function () {

          selectedFormula =
            this.dataset.formula;


          document
            .querySelectorAll(
              ".formula-block"
            )
            .forEach(item => {

              item.classList.remove(
                "selected"
              );

            });


          this.classList.add(
            "selected"
          );


          console.log(
            "SELECTED FORMULA:",
            selectedFormula
          );

        }
      );

    });

}


/* ============================================================
   18. RESET FORMULA
   ============================================================ */

function resetFormula() {

  selectedFormula = null;


  document
    .querySelectorAll(
      ".formula-block"
    )
    .forEach(button => {

      button.classList.remove(
        "selected"
      );

    });

}


/* ============================================================
   19. ZONE BUTTONS
   ============================================================ */

function initializeZoneButtons() {

  document
    .querySelectorAll(
      ".nexus-zone"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        function () {

          const zone =
            this.dataset.zone;


          console.log(
            "NEXUS ZONE:",
            zone
          );


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
   20. HINT SYSTEM
   ============================================================ */

function initializeHintButton() {

  if (!hintButton) {
    return;
  }


  hintButton.addEventListener(
    "click",
    function () {

      hintCount++;


      if (!caseFeedback) {
        return;
      }


      if (hintCount === 1) {

        caseFeedback.textContent =
          "HINT 1: Tentukan besaran awal dan besaran yang ditanyakan.";

      }

      else if (
        hintCount === 2
      ) {

        caseFeedback.textContent =
          "HINT 2: Hubungkan besaran tersebut melalui MOL.";

      }

      else {

        caseFeedback.textContent =
          "HINT 3: Periksa kembali jalur, rumus, perhitungan, dan satuan.";

      }

    }
  );

}


/* ============================================================
   21. LOAD QUESTION
   ============================================================ */

async function loadQuestion() {

  /*
     Tahap pertama:
     mencoba mengambil satu soal dari tabel questions.

     Jika struktur kolom questions berbeda,
     board tetap berjalan dan kita sesuaikan
     pada tahap berikutnya.
  */


  const {
    data,
    error
  } = await supabaseClient
    .from("questions")
    .select("*")
    .limit(20);


  if (error) {

    console.error(
      "QUESTION ERROR:",
      error
    );

    return;
  }


  if (
    !data ||
    data.length === 0
  ) {

    console.warn(
      "NO QUESTIONS FOUND"
    );

    if (caseTitle) {
      caseTitle.textContent =
        "WAITING FOR CHALLENGE";
    }

    if (caseQuestion) {
      caseQuestion.textContent =
        "Belum ada soal pada database.";
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
   22. RENDER QUESTION
   ============================================================ */

function renderQuestion(question) {

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
      difficulty;
  }


  if (caseTitle) {
    caseTitle.textContent =
      title;
  }


  if (caseQuestion) {
    caseQuestion.textContent =
      text;
  }


  questionStartTime =
    Date.now();


  resetDiagnosticInput();
}


/* ============================================================
   23. RESET DIAGNOSTIC INPUT
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
   24. NORMALIZE PATH
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


  return String(value)
    .replaceAll("→", ">")
    .replaceAll("↔", ">")
    .replaceAll(" ", "")
    .toUpperCase();
}


/* ============================================================
   25. CHECK PATH
   ============================================================ */

function evaluatePath() {

  if (!currentQuestion) {
    return null;
  }


  const expected =
    currentQuestion.correct_path ||
    currentQuestion.expected_path;


  if (!expected) {
    return null;
  }


  return (
    normalizePath(selectedPath) ===
    normalizePath(expected)
  );
}


/* ============================================================
   26. CHECK FORMULA
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


  if (!selectedFormula) {
    return false;
  }


  return (
    String(selectedFormula)
      .trim()
      .toLowerCase()
    ===
    String(expected)
      .trim()
      .toLowerCase()
  );
}


/* ============================================================
   27. CHECK CALCULATION
   ============================================================ */

function evaluateCalculation() {

  if (!currentQuestion) {
    return null;
  }


  const expected =
    Number(
      currentQuestion.correct_answer
    );


  const answer =
    Number(
      calculationAnswer?.value
    );


  if (
    !Number.isFinite(expected)
  ) {
    return null;
  }


  if (
    !Number.isFinite(answer)
  ) {
    return false;
  }


  const tolerance =
    Math.max(
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
   28. CHECK UNIT
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
    String(answer)
      .trim()
      .toLowerCase()
    ===
    String(expected)
      .trim()
      .toLowerCase()
  );
}


/* ============================================================
   29. FIRST FAILURE POINT
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
   30. FINAL CORRECT
   ============================================================ */

function determineFinalCorrect(
  pathCorrect,
  formulaCorrect,
  calculationCorrect,
  unitCorrect
) {

  const availableChecks = [
    pathCorrect,
    formulaCorrect,
    calculationCorrect,
    unitCorrect
  ].filter(
    value =>
      value !== null
  );


  if (
    availableChecks.length === 0
  ) {
    return false;
  }


  return availableChecks.every(
    value => value === true
  );
}


/* ============================================================
   31. SUBMIT CASE
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
   32. SUBMIT CURRENT CASE
   ============================================================ */

async function submitCurrentCase() {

  if (!currentQuestion) {

    if (caseFeedback) {
      caseFeedback.textContent =
        "Belum ada challenge aktif.";
    }

    return;
  }


  if (
    selectedPath.length === 0
  ) {

    if (caseFeedback) {
      caseFeedback.textContent =
        "Bangun Nexus Path terlebih dahulu.";
    }

    return;
  }


  if (!selectedFormula) {

    if (caseFeedback) {
      caseFeedback.textContent =
        "Pilih formula terlebih dahulu.";
    }

    return;
  }


  if (
    !calculationAnswer?.value
  ) {

    if (caseFeedback) {
      caseFeedback.textContent =
        "Masukkan hasil perhitungan.";
    }

    return;
  }


  if (!unitAnswer?.value) {

    if (caseFeedback) {
      caseFeedback.textContent =
        "Pilih satuan jawaban.";
    }

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


  console.log(
    "CASE RESULT:",
    {
      pathCorrect,
      formulaCorrect,
      calculationCorrect,
      unitCorrect,
      finalCorrect,
      errorType,
      responseTimeMs,
      hintCount
    }
  );


  if (finalCorrect) {

    if (caseFeedback) {
      caseFeedback.textContent =
        "NEXUS CLEAR ✓";
    }


    await addEnergy(3);

  } else {

    if (caseFeedback) {
      caseFeedback.textContent =
        "NEXUS UNSTABLE — lanjutkan eksplorasi.";
    }

  }


  /*
     Penyimpanan case_attempts akan kita aktifkan
     setelah nama kolom tabel case_attempts
     diverifikasi, supaya tidak merusak database.
  */

}


/* ============================================================
   33. ADD ENERGY
   ============================================================ */

async function addEnergy(amount) {

  if (!currentPlayer) {
    return;
  }


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

    return;
  }


  currentPlayer.nexus_energy =
    newEnergy;


  renderCurrentPlayer();


  console.log(
    "ENERGY:",
    newEnergy
  );
}


/* ============================================================
   34. REALTIME PLAYERS
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
   35. REALTIME ROOM STATUS
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
        event: "UPDATE",
        schema: "public",
        table: "game_rooms",
        filter:
          "room_code=eq." +
          room
      },

      async function(payload) {

        console.log(
          "ROOM REALTIME:",
          payload.new
        );


        if (
          payload.new?.status ===
          "PLAYING"
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
   36. GAME ACTION BUTTONS
   ============================================================ */

function initializeGameActions() {

  document
    .querySelectorAll(
      ".game-action-bar button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        function () {

          const action =
            this.textContent
              .trim()
              .toUpperCase();


          console.log(
            "GAME ACTION:",
            action
          );


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
              "Bangun PATH → pilih FORMULA → hitung → pilih UNIT → LOCK ANSWER.";

          }

        }
      );

    });

}


/* ============================================================
   37. INITIALIZE INTERFACE
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
   38. START MOL-NEXUS GAME
   ============================================================ */

async function startMolNexusGame() {

  console.log(
    "MOL-NEXUS INITIALIZING..."
  );


  initializeInterface();


  if (!student || !room) {

    console.warn(
      "STUDENT OR ROOM MISSING"
    );


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


  /*
     Coba load soal.
     Jika tabel questions masih kosong,
     game tetap dapat tampil.
  */

  await loadQuestion();


  console.log(
    "MOL-NEXUS GAME READY"
  );
}


/* ============================================================
   39. START AFTER HTML READY
   ============================================================ */

window.addEventListener(
  "DOMContentLoaded",
  startMolNexusGame
);


/* ============================================================
   MOL-NEXUS GAME CONTROLLER
   END v1.0
   ============================================================ */
