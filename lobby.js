// ============================================================
// MOL-NEXUS v2.0
// SECURE MULTIPLAYER LOBBY
// ============================================================


// ============================================================
// 1. SUPABASE CONFIG
// ============================================================

const SUPABASE_URL =
    "https://snlpdwqdjfnborsorspd.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ============================================================
// 2. ELEMENTS
// ============================================================

const roomDisplay =
    document.getElementById("roomDisplay");

const playerCount =
    document.getElementById("playerCount");

const readyButton =
    document.getElementById("readyButton");

const leaveButton =
    document.getElementById("leaveButton");

const statusText =
    document.getElementById("statusText");


// ============================================================
// 3. SECURE SESSION CONTEXT
// ============================================================

const sessionToken =
    sessionStorage.getItem(
        "mol_nexus_session_token"
    );

const room =
    sessionStorage.getItem(
        "mol_nexus_room"
    );

let currentStudent = null;

let currentPlayerSlot = null;

let isReady = false;

let roomMaxPlayers = 4;

let gameRedirectStarted = false;


// ============================================================
// 4. INITIAL GUARD
// ============================================================

if (!sessionToken) {

    window.location.replace(
        "student-login.html"
    );

}

if (!room) {

    window.location.replace(
        "index.html"
    );

}


roomDisplay.textContent =
    room || "-----";


// ============================================================
// 5. VALIDATE SESSION
// ============================================================

async function validateSession() {

    try {

        const { data, error } =
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


        if (!data || data.length === 0) {

            clearStudentSession();

            window.location.replace(
                "student-login.html"
            );

            return false;
        }


        currentStudent =
            data[0];


        return true;


    } catch (error) {

        console.error(
            "SESSION VALIDATION ERROR:",
            error
        );


        clearStudentSession();

        window.location.replace(
            "student-login.html"
        );


        return false;
    }
}


// ============================================================
// 6. LOAD ROOM
// ============================================================

async function loadRoom() {

    const { data, error } =
        await supabaseClient
            .from("game_rooms")
            .select(
                "room_code, game_mode, status, max_players"
            )
            .eq(
                "room_code",
                room
            )
            .single();


    if (error || !data) {

        console.error(
            "ROOM ERROR:",
            error
        );

        statusText.textContent =
            "ROOM TIDAK DITEMUKAN";

        return false;
    }


    roomMaxPlayers =
        data.max_players || 4;


    if (data.status === "PLAYING") {

        goToGame();

        return true;
    }


    return true;
}


// ============================================================
// 7. FIND CURRENT PLAYER
// ============================================================

async function loadCurrentPlayer() {

    if (!currentStudent) {
        return false;
    }


    const { data, error } =
        await supabaseClient
            .from("room_players")
            .select(
                "player_slot, is_ready"
            )
            .eq(
                "room_code",
                room
            )
            .eq(
                "student_id",
                currentStudent.student_id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "CURRENT PLAYER ERROR:",
            error
        );

        return false;
    }


    if (!data) {

        statusText.textContent =
            "PLAYER TIDAK TERDAFTAR DI ROOM";

        return false;
    }


    currentPlayerSlot =
        data.player_slot;

    isReady =
        data.is_ready;


    sessionStorage.setItem(
        "mol_nexus_player_slot",
        String(currentPlayerSlot)
    );


    return true;
}


// ============================================================
// 8. RENDER PLAYERS
// ============================================================

async function renderPlayers() {

    const { data: players, error } =
        await supabaseClient
            .from("room_players")
            .select(
                "player_name, player_slot, is_ready"
            )
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
            "RENDER ERROR:",
            error
        );

        statusText.textContent =
            "GAGAL MEMBACA LOBBY";

        return;
    }


    const safePlayers =
        players || [];


    playerCount.textContent =
        safePlayers.length +
        " / " +
        roomMaxPlayers;


    for (
        let slot = 1;
        slot <= roomMaxPlayers;
        slot++
    ) {

        const player =
            safePlayers.find(
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
    // STATUS PEMAIN SENDIRI
    // --------------------------------------------------------

    const me =
        safePlayers.find(
            player =>
                player.player_slot ===
                currentPlayerSlot
        );


    if (!me) {
        return;
    }


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


    // Setelah render, cek apakah game bisa dimulai.
    await tryStartGame();
}


// ============================================================
// 9. READY BUTTON — SECURE RPC
// ============================================================

readyButton.addEventListener(
    "click",
    async function () {

        if (
            !sessionToken ||
            !room ||
            currentPlayerSlot === null
        ) {

            return;
        }


        const newReadyState =
            !isReady;


        readyButton.disabled =
            true;


        const { error } =
            await supabaseClient.rpc(
                "set_student_ready",
                {
                    p_session_token:
                        sessionToken,

                    p_room_code:
                        room,

                    p_is_ready:
                        newReadyState
                }
            );


        readyButton.disabled =
            false;


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
// 10. TRY START GAME — SECURE RPC
// ============================================================

async function tryStartGame() {

    if (
        !sessionToken ||
        !room ||
        gameRedirectStarted
    ) {

        return;
    }


    const { data, error } =
        await supabaseClient.rpc(
            "start_game_if_ready",
            {
                p_session_token:
                    sessionToken,

                p_room_code:
                    room
            }
        );


    if (error) {

        console.error(
            "START GAME ERROR:",
            error
        );

        return;
    }


    if (data === true) {

        statusText.textContent =
            "ALL PLAYERS READY — INITIALIZING NEXUS...";

        goToGame();

    }
}


// ============================================================
// 11. LEAVE ROOM — SECURE RPC
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


        leaveButton.disabled =
            true;


        const { error } =
            await supabaseClient.rpc(
                "leave_student_room",
                {
                    p_session_token:
                        sessionToken,

                    p_room_code:
                        room
                }
            );


        if (error) {

            console.error(
                "LEAVE ERROR:",
                error
            );

            statusText.textContent =
                "GAGAL KELUAR DARI ROOM";

            leaveButton.disabled =
                false;

            return;
        }


        sessionStorage.removeItem(
            "mol_nexus_room"
        );

        sessionStorage.removeItem(
            "mol_nexus_player_slot"
        );


        window.location.replace(
            "index.html"
        );

    }
);


// ============================================================
// 12. REALTIME — ROOM PLAYERS
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
            async function () {

                await renderPlayers();

            }
        )
        .subscribe();


// ============================================================
// 13. REALTIME — GAME STATUS
// ============================================================

const gameStatusChannel =
    supabaseClient
        .channel(
            "mol-nexus-game-status-" +
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
            function (payload) {

                if (
                    payload.new.status ===
                    "PLAYING"
                ) {

                    goToGame();

                }

            }
        )
        .subscribe();


// ============================================================
// 14. GAME REDIRECT
// ============================================================

function goToGame() {

    if (gameRedirectStarted) {
        return;
    }


    gameRedirectStarted =
        true;


    /*
    Tidak lagi mengirim:
    ?student=
    ?room=
    */

    window.location.replace(
        "game.html"
    );
}


// ============================================================
// 15. CLEAR STUDENT SESSION
// ============================================================

function clearStudentSession() {

    sessionStorage.removeItem(
        "mol_nexus_session_token"
    );

    sessionStorage.removeItem(
        "mol_nexus_student_id"
    );

    sessionStorage.removeItem(
        "mol_nexus_student_code"
    );

    sessionStorage.removeItem(
        "mol_nexus_display_name"
    );

    sessionStorage.removeItem(
        "mol_nexus_session_expires"
    );

    sessionStorage.removeItem(
        "mol_nexus_room"
    );

    sessionStorage.removeItem(
        "mol_nexus_player_slot"
    );

}


// ============================================================
// 16. START LOBBY
// ============================================================

async function startLobby() {

    console.log(
        "MOL-NEXUS SECURE LOBBY v2.0"
    );


    const sessionValid =
        await validateSession();


    if (!sessionValid) {
        return;
    }


    const roomValid =
        await loadRoom();


    if (!roomValid) {
        return;
    }


    const playerValid =
        await loadCurrentPlayer();


    if (!playerValid) {
        return;
    }


    await renderPlayers();

}


// ============================================================
// START
// ============================================================

window.addEventListener(
    "DOMContentLoaded",
    startLobby
);


// ============================================================
// MOL-NEXUS
// END SECURE MULTIPLAYER LOBBY
// ============================================================
