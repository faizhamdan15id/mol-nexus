"use strict";

const SUPABASE_URL =
  "https://snlpdwqdjfnborsorspd.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


const totalRooms =
  document.getElementById("totalRooms");

const waitingRooms =
  document.getElementById("waitingRooms");

const playingRooms =
  document.getElementById("playingRooms");

const totalPlayers =
  document.getElementById("totalPlayers");

const roomState =
  document.getElementById("roomState");

const roomList =
  document.getElementById("roomList");

const roomSearch =
  document.getElementById("roomSearch");

const roomStatusFilter =
  document.getElementById("roomStatusFilter");

const refreshRoomsButton =
  document.getElementById("refreshRoomsButton");

const createRoomButton =
  document.getElementById("createRoomButton");

const roomModal =
  document.getElementById("roomModal");

const closeRoomModal =
  document.getElementById("closeRoomModal");

const roomForm =
  document.getElementById("roomForm");

const roomCodeInput =
  document.getElementById("roomCodeInput");

const maxPlayersInput =
  document.getElementById("maxPlayersInput");

const gameModeInput =
  document.getElementById("gameModeInput");

const saveRoomButton =
  document.getElementById("saveRoomButton");

const playerModal =
  document.getElementById("playerModal");

const closePlayerModal =
  document.getElementById("closePlayerModal");

const playerModalTitle =
  document.getElementById("playerModalTitle");

const playerList =
  document.getElementById("playerList");


let roomsData = [];
let refreshTimer = null;
let currentPlayerModalRoom = null;


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


async function requireTeacherAuth() {

  const {
    data: { session },
    error
  } =
    await supabaseClient.auth.getSession();

  if (error || !session) {

    window.location.replace(
      "teacher-login.html"
    );

    return false;
  }

  return true;
}


function normalizeStatus(status) {

  return String(
    status || ""
  ).trim().toUpperCase();
}


function renderSummary() {

  totalRooms.textContent =
    roomsData.length;

  waitingRooms.textContent =
    roomsData.filter(
      room =>
        normalizeStatus(
          room.status
        ) === "WAITING"
    ).length;

  playingRooms.textContent =
    roomsData.filter(
      room =>
        normalizeStatus(
          room.status
        ) === "PLAYING"
    ).length;

  totalPlayers.textContent =
    roomsData.reduce(
      (sum, room) =>
        sum +
        Number(
          room.player_count || 0
        ),
      0
    );
}


function getStatusClass(status) {

  const value =
    normalizeStatus(status);

  if (value === "PLAYING") {
    return "playing";
  }

  if (value === "COMPLETED") {
    return "completed";
  }

  return "waiting";
}


function renderRooms() {

  const keyword =
    roomSearch.value
      .trim()
      .toLowerCase();

  const statusFilter =
    roomStatusFilter.value;


  const filtered =
    roomsData.filter(
      room => {

        const matchesSearch =
          !keyword ||
          String(
            room.room_code || ""
          )
            .toLowerCase()
            .includes(keyword);

        const matchesStatus =
          !statusFilter ||
          normalizeStatus(
            room.status
          ) === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );


  if (
    filtered.length === 0
  ) {

    roomList.innerHTML = `
      <div class="room-empty-state">
        Tidak ada room yang sesuai.
      </div>
    `;

    return;
  }


  roomList.innerHTML =
    filtered
      .map(
        room => {

          const status =
            normalizeStatus(
              room.status
            );

          const playerCount =
            Number(
              room.player_count || 0
            );

          const readyCount =
            Number(
              room.ready_count || 0
            );

          const maxPlayers =
            Number(
              room.max_players || 0
            );

          const canStart =
            status === "WAITING" &&
            playerCount >= 2 &&
            readyCount === playerCount;

          const canEnd =
            status === "WAITING" ||
            status === "PLAYING";

          const canResetReady =
            status === "WAITING" &&
            readyCount > 0;

          const canResetRoom =
            status !== "PLAYING" &&
            (
              playerCount > 0 ||
              status === "COMPLETED" ||
              room.active_session === true
            );


          return `
            <article class="room-card">

              <div class="room-card-top">

                <div>
                  <span class="room-code-label">
                    ROOM CODE
                  </span>

                  <h3>
                    ${escapeHTML(
                      room.room_code
                    )}
                  </h3>
                </div>

                <span
                  class="room-status ${getStatusClass(status)}"
                >
                  ${escapeHTML(status)}
                </span>

              </div>


              <p class="room-card-meta">
                ${escapeHTML(
                  room.game_mode ||
                  "STANDARD NEXUS"
                )}
                • Kapasitas ${maxPlayers} pemain
              </p>


              <div class="room-stats">

                <div>
                  <span>Pemain</span>
                  <strong>
                    ${playerCount}/${maxPlayers}
                  </strong>
                </div>

                <div>
                  <span>Ready</span>
                  <strong>
                    ${readyCount}
                  </strong>
                </div>

                <div>
                  <span>Session</span>
                  <strong
                    class="${
                      room.active_session
                        ? "room-session-ok"
                        : "room-session-off"
                    }"
                  >
                    ${
                      room.active_session
                        ? "ACTIVE"
                        : "—"
                    }
                  </strong>
                </div>

              </div>


              <div class="room-actions">

                <button
                  type="button"
                  class="room-action-button room-view-button"
                  data-action="players"
                  data-room="${escapeHTML(
                    room.room_code
                  )}"
                >
                  👥 Lihat Pemain
                </button>

                ${
                  status === "WAITING"
                    ? `
                      <button
                        type="button"
                        class="room-action-button room-start-button"
                        data-action="start"
                        data-room="${escapeHTML(
                          room.room_code
                        )}"
                        ${canStart ? "" : "disabled"}
                      >
                        ▶ Mulai Game
                      </button>
                    `
                    : ""
                }

                ${
                  canResetReady
                    ? `
                      <button
                        type="button"
                        class="room-action-button room-reset-ready-button"
                        data-action="reset-ready"
                        data-room="${escapeHTML(
                          room.room_code
                        )}"
                      >
                        ↺ Reset READY
                      </button>
                    `
                    : ""
                }

                ${
                  canEnd
                    ? `
                      <button
                        type="button"
                        class="room-action-button room-end-button"
                        data-action="end"
                        data-room="${escapeHTML(
                          room.room_code
                        )}"
                      >
                        ■ Akhiri Room
                      </button>
                    `
                    : ""
                }

                ${
                  canResetRoom
                    ? `
                      <button
                        type="button"
                        class="room-action-button room-reset-room-button"
                        data-action="reset-room"
                        data-room="${escapeHTML(
                          room.room_code
                        )}"
                      >
                        ♻ Reset Room
                      </button>
                    `
                    : ""
                }

              </div>

            </article>
          `;
        }
      )
      .join("");
}


async function loadRooms(
  silent = false
) {

  if (!silent) {

    roomState.hidden =
      false;

    roomState.textContent =
      "Memuat room permainan...";
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "admin_room_list"
    );


  if (error) {

    console.error(
      "ROOM LIST ERROR:",
      error
    );

    roomState.hidden =
      false;

    roomState.textContent =
      "Gagal memuat room.";

    return;
  }


  roomsData =
    data || [];


  renderSummary();

  renderRooms();


  roomState.hidden =
    roomsData.length > 0;


  if (
    roomsData.length === 0
  ) {

    roomState.textContent =
      "Belum ada room permainan.";
  }
}


async function loadPlayers(
  roomCode
) {

  currentPlayerModalRoom =
    roomCode;

  const roomData =
    roomsData.find(
      room =>
        room.room_code === roomCode
    );

  const roomStatus =
    normalizeStatus(
      roomData?.status
    );

  playerModalTitle.textContent =
    `Pemain • ${roomCode}`;

  playerList.innerHTML = `
    <div class="room-empty-state">
      Memuat pemain...
    </div>
  `;

  playerModal.hidden =
    false;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "admin_room_players",
      {
        p_room_code:
          roomCode
      }
    );


  if (error) {

    console.error(
      "ROOM PLAYER ERROR:",
      error
    );

    playerList.innerHTML = `
      <div class="room-empty-state">
        Gagal membaca pemain.
      </div>
    `;

    return;
  }


  const players =
    data || [];


  if (
    players.length === 0
  ) {

    playerList.innerHTML = `
      <div class="room-empty-state">
        Belum ada siswa yang masuk.
      </div>
    `;

    return;
  }


  playerList.innerHTML =
    players
      .map(
        player => {

          const crystals = [
            player.mass_crystal
              ? "MASS"
              : null,

            player.particle_crystal
              ? "PARTICLE"
              : null,

            player.gas_crystal
              ? "GAS"
              : null,

            player.solution_crystal
              ? "SOLUTION"
              : null
          ]
            .filter(Boolean)
            .length;


          return `
            <article class="room-player-card">

              <div class="room-player-top">

                <div>
                  <span class="room-player-slot">
                    PLAYER ${escapeHTML(
                      player.player_slot
                    )}
                  </span>

                  <h3>
                    ${escapeHTML(
                      player.player_name
                    )}
                  </h3>
                </div>

                <span
                  class="${
                    player.is_ready
                      ? "room-ready"
                      : "room-not-ready"
                  }"
                >
                  ${
                    player.is_ready
                      ? "READY"
                      : "NOT READY"
                  }
                </span>

              </div>


              <div class="room-player-stats">

                <span>
                  ⚡ ${Number(
                    player.nexus_energy || 0
                  )} Energy
                </span>

                <span>
                  💎 ${crystals}/4 Crystal
                </span>

                ${
                  player.final_nexus_completed
                    ? "<span>🏆 Final Complete</span>"
                    : ""
                }

              </div>

              ${
                roomStatus === "WAITING"
                  ? `
                    <button
                      type="button"
                      class="room-kick-button"
                      data-player-action="kick"
                      data-room="${escapeHTML(
                        roomCode
                      )}"
                      data-student-id="${escapeHTML(
                        player.student_id
                      )}"
                      data-player-name="${escapeHTML(
                        player.player_name
                      )}"
                    >
                      ⛔ Keluarkan Pemain
                    </button>
                  `
                  : `
                    <p class="room-player-lock-note">
                      Kontrol pemain dikunci saat game berlangsung.
                    </p>
                  `
              }

            </article>
          `;
        }
      )
      .join("");
}


async function kickPlayer(
  roomCode,
  studentId,
  playerName,
  button
) {

  const confirmed =
    confirm(
      `Keluarkan "${playerName}" dari room ${roomCode}?`
    );

  if (!confirmed) {
    return;
  }

  const oldText =
    button.textContent;

  button.disabled =
    true;

  button.textContent =
    "Mengeluarkan...";

  const { error } =
    await supabaseClient.rpc(
      "admin_kick_room_player",
      {
        p_room_code:
          roomCode,
        p_student_id:
          studentId
      }
    );

  if (error) {
    console.error(
      "KICK PLAYER ERROR:",
      error
    );
    alert(
      error.message ||
      "Pemain gagal dikeluarkan."
    );
    button.disabled = false;
    button.textContent = oldText;
    return;
  }

  await loadRooms(true);
  await loadPlayers(roomCode);
}


async function resetReady(
  roomCode,
  button
) {

  const confirmed =
    confirm(
      `Reset status READY semua pemain di room ${roomCode}?`
    );

  if (!confirmed) {
    return;
  }

  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = "Mereset...";

  const { data, error } =
    await supabaseClient.rpc(
      "admin_reset_room_ready",
      {
        p_room_code:
          roomCode
      }
    );

  if (error) {
    console.error(
      "RESET READY ERROR:",
      error
    );
    alert(
      error.message ||
      "Status READY gagal direset."
    );
    button.disabled = false;
    button.textContent = oldText;
    return;
  }

  await loadRooms(true);

  if (
    currentPlayerModalRoom === roomCode
  ) {
    await loadPlayers(roomCode);
  }

  alert(
    `${Number(data || 0)} status READY berhasil direset.`
  );
}


async function resetRoom(
  roomCode,
  button
) {

  const confirmed =
    confirm(
      `RESET ROOM ${roomCode}?\n\nSemua pemain akan dikeluarkan dan room kembali WAITING. Riwayat attempt penelitian yang sudah tersimpan tidak dihapus.`
    );

  if (!confirmed) {
    return;
  }

  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = "Resetting...";

  const { error } =
    await supabaseClient.rpc(
      "admin_reset_room",
      {
        p_room_code:
          roomCode
      }
    );

  if (error) {
    console.error(
      "RESET ROOM ERROR:",
      error
    );

    let message =
      error.message ||
      "Room gagal direset.";

    if (
      message.includes(
        "ROOM_MUST_BE_ENDED_FIRST"
      )
    ) {
      message =
        "Game masih PLAYING. Akhiri Room terlebih dahulu sebelum reset.";
    }

    alert(message);
    button.disabled = false;
    button.textContent = oldText;
    return;
  }

  if (
    currentPlayerModalRoom === roomCode
  ) {
    playerModal.hidden = true;
    currentPlayerModalRoom = null;
  }

  await loadRooms(true);

  alert(
    `Room ${roomCode} siap digunakan untuk pertandingan baru.`
  );
}

async function startRoom(
  roomCode,
  button
) {

  const confirmed =
    confirm(
      `Mulai room ${roomCode} sekarang?`
    );

  if (!confirmed) {
    return;
  }


  const oldText =
    button.textContent;

  button.disabled =
    true;

  button.textContent =
    "Memulai...";


  const {
    error
  } =
    await supabaseClient.rpc(
      "admin_start_room",
      {
        p_room_code:
          roomCode
      }
    );


  if (error) {

    console.error(
      "START ROOM ERROR:",
      error
    );

    alert(
      error.message ||
      "Room gagal dimulai."
    );

    button.disabled =
      false;

    button.textContent =
      oldText;

    return;
  }


  await loadRooms(true);
}


async function endRoom(
  roomCode,
  button
) {

  const confirmed =
    confirm(
      `Akhiri room ${roomCode}?\n\nGame session aktif akan ditutup dan data permainan tetap tersimpan.`
    );

  if (!confirmed) {
    return;
  }


  const oldText =
    button.textContent;

  button.disabled =
    true;

  button.textContent =
    "Mengakhiri...";


  const {
    error
  } =
    await supabaseClient.rpc(
      "admin_end_room",
      {
        p_room_code:
          roomCode
      }
    );


  if (error) {

    console.error(
      "END ROOM ERROR:",
      error
    );

    alert(
      error.message ||
      "Room gagal diakhiri."
    );

    button.disabled =
      false;

    button.textContent =
      oldText;

    return;
  }


  await loadRooms(true);
}


roomList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "[data-action]"
      );

    if (!button) {
      return;
    }


    const action =
      button.dataset.action;

    const roomCode =
      button.dataset.room;


    if (
      action === "players"
    ) {

      await loadPlayers(
        roomCode
      );

      return;
    }


    if (
      action === "start"
    ) {

      await startRoom(
        roomCode,
        button
      );

      return;
    }


    if (
      action === "reset-ready"
    ) {

      await resetReady(
        roomCode,
        button
      );

      return;
    }


    if (
      action === "end"
    ) {

      await endRoom(
        roomCode,
        button
      );

      return;
    }


    if (
      action === "reset-room"
    ) {

      await resetRoom(
        roomCode,
        button
      );
    }
  }
);


playerList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "[data-player-action]"
      );

    if (!button) {
      return;
    }

    if (
      button.dataset.playerAction ===
      "kick"
    ) {

      await kickPlayer(
        button.dataset.room,
        button.dataset.studentId,
        button.dataset.playerName,
        button
      );
    }
  }
);

createRoomButton.addEventListener(
  "click",
  () => {

    roomForm.reset();

    maxPlayersInput.value =
      "4";

    roomModal.hidden =
      false;

    roomCodeInput.focus();
  }
);


closeRoomModal.addEventListener(
  "click",
  () => {

    roomModal.hidden =
      true;
  }
);


closePlayerModal.addEventListener(
  "click",
  () => {

    playerModal.hidden =
      true;

    currentPlayerModalRoom =
      null;
  }
);


roomModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      roomModal
    ) {

      roomModal.hidden =
        true;
    }
  }
);


playerModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      playerModal
    ) {

      playerModal.hidden =
        true;

      currentPlayerModalRoom =
        null;
    }
  }
);


roomCodeInput.addEventListener(
  "input",
  () => {

    roomCodeInput.value =
      roomCodeInput.value
        .toUpperCase()
        .replace(
          /[^A-Z0-9_-]/g,
          ""
        );
  }
);


roomForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const roomCode =
      roomCodeInput.value
        .trim()
        .toUpperCase();

    const maxPlayers =
      Number(
        maxPlayersInput.value
      );

    const gameMode =
      gameModeInput.value;


    saveRoomButton.disabled =
      true;

    saveRoomButton.textContent =
      "Membuat Room...";


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "admin_create_room",
        {

          p_room_code:
            roomCode,

          p_max_players:
            maxPlayers,

          p_game_mode:
            gameMode
        }
      );


    saveRoomButton.disabled =
      false;

    saveRoomButton.textContent =
      "Buat Room";


    if (error) {

      console.error(
        "CREATE ROOM ERROR:",
        error
      );


      let message =
        error.message ||
        "Room gagal dibuat.";


      if (
        message.includes(
          "ROOM_CODE_ALREADY_EXISTS"
        )
      ) {

        message =
          "Kode room sudah digunakan.";
      }


      if (
        message.includes(
          "INVALID_ROOM_CODE"
        )
      ) {

        message =
          "Kode room harus 4–20 karakter dan hanya berisi huruf, angka, _ atau -.";
      }


      alert(message);

      return;
    }


    roomModal.hidden =
      true;


    await loadRooms(true);


    alert(
      `Room ${data || roomCode} berhasil dibuat.`
    );
  }
);


roomSearch.addEventListener(
  "input",
  renderRooms
);


roomStatusFilter.addEventListener(
  "change",
  renderRooms
);


refreshRoomsButton.addEventListener(
  "click",
  () =>
    loadRooms(false)
);


async function initRoomManagement() {

  const authenticated =
    await requireTeacherAuth();


  if (!authenticated) {
    return;
  }


  await loadRooms(false);


  refreshTimer =
    setInterval(
      () =>
        loadRooms(true),
      3000
    );
}


window.addEventListener(
  "beforeunload",
  () => {

    if (refreshTimer) {

      clearInterval(
        refreshTimer
      );
    }
  }
);


initRoomManagement();
