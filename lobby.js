// ============================================================
// MOL-NEXUS v1.1
// MULTIPLAYER LOBBY + SUPABASE
// ============================================================

// ============================================================
// 1. SUPABASE CONFIG
// ============================================================

const SUPABASE_URL = "https://snlpdwqdjfnborsorspd.supabase.co";
const SUPABASE_KEY = "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ============================================================
// 2. ELEMENTS
// ============================================================

const roomDisplay = document.getElementById("roomDisplay");
const playerName = document.getElementById("playerName");
const playerCount = document.getElementById("playerCount");

const readyButton = document.getElementById("readyButton");
const leaveButton = document.getElementById("leaveButton");
const statusText = document.getElementById("statusText");


// ============================================================
// 3. LOAD LOGIN DATA
// ============================================================

// Ambil data dari URL jika tersedia
const urlParams = new URLSearchParams(window.location.search);

const studentFromURL = urlParams.get("student");
const roomFromURL = urlParams.get("room");

// Prioritaskan URL, fallback ke localStorage
const student =
    studentFromURL ||
    localStorage.getItem("molNexusStudent");

const room =
    roomFromURL ||
    localStorage.getItem("molNexusRoom");

// Simpan kembali agar tetap tersedia setelah refresh
if (student) {
    localStorage.setItem("molNexusStudent", student);
}

if (room) {
    localStorage.setItem("molNexusRoom", room);
}

console.log("LOBBY STUDENT:", student);
console.log("LOBBY ROOM:", room);

if (!student || !room) {

    window.location.href = "index.html";

}

playerName.textContent = student || "PLAYER";
roomDisplay.textContent = room || "-----";


// ============================================================
// 4. PLAYER STATE
// ============================================================

let currentPlayerId = null;
let currentPlayerSlot = null;
let isReady = false;


// ============================================================
// 5. LOAD ROOM
// ============================================================

async function loadRoom() {

    const { data, error } = await supabaseClient
        .from("game_rooms")
        .select("*")
        .eq("room_code", room)
        .single();

    if (error) {

        console.error("ROOM ERROR:", error);

        statusText.textContent =
            "ROOM TIDAK DITEMUKAN";

        return false;
    }

    return true;
}


// ============================================================
// 6. JOIN PLAYER
// ============================================================

async function joinPlayer() {

    const { data: existingPlayers, error: readError } =
        await supabaseClient
            .from("room_players")
            .select("*")
            .eq("room_code", room)
            .order("player_slot", {
                ascending: true
            });

    if (readError) {

        console.error(
            "READ PLAYER ERROR:",
            readError
        );

        statusText.textContent =
            "GAGAL MEMBACA PLAYER";

        return;
    }


    // --------------------------------------------------------
    // Cek apakah nama pemain sudah ada
    // --------------------------------------------------------

    const existingPlayer =
        existingPlayers.find(
            player =>
                player.player_name === student
        );


    if (existingPlayer) {

        currentPlayerId =
            existingPlayer.id;

        currentPlayerSlot =
            existingPlayer.player_slot;

        isReady =
            existingPlayer.is_ready;

        await renderPlayers();

        return;
    }


    // --------------------------------------------------------
    // Cari slot kosong 1 - 4
    // --------------------------------------------------------

    const usedSlots =
        existingPlayers.map(
            player => player.player_slot
        );

    let availableSlot = null;

    for (let slot = 1; slot <= 4; slot++) {

        if (!usedSlots.includes(slot)) {

            availableSlot = slot;

            break;
        }
    }


    if (!availableSlot) {

        statusText.textContent =
            "ROOM SUDAH PENUH";

        return;
    }


    // --------------------------------------------------------
    // Insert pemain
    // --------------------------------------------------------

    const { data, error } =
        await supabaseClient
            .from("room_players")
            .insert({

                room_code: room,

                player_name: student,

                player_slot: availableSlot,

                is_ready: false,

                nexus_energy: 0,

                mass_crystal: false,

                particle_crystal: false,

                gas_crystal: false,

                solution_crystal: false

            })
            .select()
            .single();


    if (error) {

        console.error(
            "JOIN ERROR:",
            error
        );

        statusText.textContent =
            "GAGAL MASUK ROOM";

        return;
    }


    currentPlayerId =
        data.id;

    currentPlayerSlot =
        data.player_slot;

    isReady = false;


    console.log(
        "PLAYER JOINED:",
        data
    );


    await renderPlayers();
}


// ============================================================
// 7. RENDER PLAYERS
// ============================================================

async function renderPlayers() {

    const { data: players, error } =
        await supabaseClient
            .from("room_players")
            .select("*")
            .eq("room_code", room)
            .order(
                "player_slot",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "RENDER ERROR:",
            error
        );

        return;
    }


    // --------------------------------------------------------
    // Update player count
    // --------------------------------------------------------

    playerCount.textContent =
        players.length + " / 4";


    // --------------------------------------------------------
    // Update setiap slot
    // --------------------------------------------------------

    for (let slot = 1; slot <= 4; slot++) {

        const player =
            players.find(
                item =>
                    item.player_slot === slot
            );


        const slotElement =
            document.querySelector(
                `[data-slot="${slot}"]`
            );


        if (!slotElement) {
            continue;
        }


        const nameElement =
            slotElement.querySelector(
                ".slot-player-name"
            );

        const subtitleElement =
            slotElement.querySelector(
                ".slot-player-subtitle"
            );

        const statusElement =
            slotElement.querySelector(
                ".slot-status"
            );


        if (player) {

            if (nameElement) {

                nameElement.textContent =
                    player.player_name;
            }


            if (subtitleElement) {

                subtitleElement.textContent =
                    "NEXUS EXPLORER";
            }


            if (statusElement) {

                if (player.is_ready) {

                    statusElement.textContent =
                        "READY";

                    statusElement.classList.add(
                        "is-ready"
                    );

                } else {

                    statusElement.textContent =
                        "NOT READY";

                    statusElement.classList.remove(
                        "is-ready"
                    );
                }
            }

        } else {

            if (nameElement) {

                nameElement.textContent =
                    "WAITING FOR PLAYER";
            }


            if (subtitleElement) {

                subtitleElement.textContent =
                    "SLOT AVAILABLE";
            }


            if (statusElement) {

                statusElement.textContent =
                    "WAITING";

                statusElement.classList.remove(
                    "is-ready"
                );
            }
        }
    }


    // --------------------------------------------------------
    // Update tombol ready pemain sendiri
    // --------------------------------------------------------

    const me =
        players.find(
            player =>
                player.id === currentPlayerId
        );


    if (me) {

        isReady =
            me.is_ready;


        if (isReady) {

            readyButton.textContent =
                "✓ YOU ARE READY";

            readyButton.classList.add(
                "is-ready"
            );

            statusText.textContent =
                "READY — WAITING FOR OTHER PLAYERS";

        } else {

            readyButton.textContent =
                "✓ READY";

            readyButton.classList.remove(
                "is-ready"
            );

            statusText.textContent =
                "WAITING FOR OTHER PLAYERS";
        }
    }
}


// ============================================================
// 8. READY BUTTON
// ============================================================

readyButton.addEventListener(
    "click",
    async function () {

        if (!currentPlayerId) {
            return;
        }


        const newReadyState =
            !isReady;


        readyButton.disabled = true;


        const { error } =
            await supabaseClient
                .from("room_players")
                .update({

                    is_ready:
                        newReadyState

                })
                .eq(
                    "id",
                    currentPlayerId
                );


        readyButton.disabled = false;


        if (error) {

            console.error(
                "READY ERROR:",
                error
            );

            statusText.textContent =
                "GAGAL MENGUBAH STATUS READY";

            return;
        }


        isReady =
            newReadyState;


        await renderPlayers();
    }
);


// ============================================================
// 9. LEAVE ROOM
// ============================================================

leaveButton.addEventListener(
    "click",
    async function () {

        const confirmLeave =
            confirm(
                "Keluar dari Nexus Room?"
            );


        if (!confirmLeave) {
            return;
        }


        if (currentPlayerId) {

            const { error } =
                await supabaseClient
                    .from("room_players")
                    .delete()
                    .eq(
                        "id",
                        currentPlayerId
                    );


            if (error) {

                console.error(
                    "LEAVE ERROR:",
                    error
                );
            }
        }


        localStorage.removeItem(
            "molNexusRoom"
        );

        localStorage.removeItem(
            "molNexusStudent"
        );


        window.location.href =
            "index.html";
    }
);


// ============================================================
// 10. REALTIME LISTENER
// ============================================================

const lobbyChannel =
    supabaseClient
        .channel(
            "mol-nexus-room-" + room
        )
        .on(
            "postgres_changes",
            {

                event: "*",

                schema: "public",

                table: "room_players",

                filter:
                    "room_code=eq." + room

            },

            function () {

                renderPlayers();

            }
        )
        .subscribe();


// ============================================================
// 11. START LOBBY
// ============================================================

async function startLobby() {

    console.log(
        "MOL-NEXUS SUPABASE LOBBY START"
    );


    const roomExists =
        await loadRoom();


    if (!roomExists) {
        return;
    }


    await joinPlayer();

    await renderPlayers();
}


window.addEventListener(
    "DOMContentLoaded",
    startLobby
);


// ============================================================
// MOL-NEXUS
// END MULTIPLAYER LOBBY CONTROLLER
// ============================================================
