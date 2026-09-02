// ==============================================
// MOL-NEXUS v1.0
// MULTIPLAYER LOBBY CONTROLLER
// ==============================================

const roomDisplay = document.getElementById("roomDisplay");
const playerName = document.getElementById("playerName");
const playerCount = document.getElementById("playerCount");

const readyButton = document.getElementById("readyButton");
const leaveButton = document.getElementById("leaveButton");
const statusText = document.getElementById("statusText");


// ==============================================
// LOAD PLAYER DATA
// ==============================================

const student =
    localStorage.getItem("molNexusStudent");

const room =
    localStorage.getItem("molNexusRoom");


// Jika masuk ke lobby tanpa data login
if (!student || !room) {

    window.location.href = "index.html";

}


// Tampilkan data pemain
playerName.textContent =
    student || "PLAYER 1";

roomDisplay.textContent =
    room || "----";

playerCount.textContent = "1 / 4";


// ==============================================
// READY STATE
// ==============================================

let isReady = false;

readyButton.addEventListener("click", function () {

    isReady = !isReady;

    if (isReady) {

        readyButton.classList.add("is-ready");

        readyButton.textContent =
            "✓ YOU ARE READY";

        statusText.textContent =
            "READY — WAITING FOR OTHER PLAYERS";

    } else {

        readyButton.classList.remove("is-ready");

        readyButton.textContent =
            "✓ READY";

        statusText.textContent =
            "WAITING FOR OTHER PLAYERS";

    }

});


// ==============================================
// LEAVE ROOM
// ==============================================

leaveButton.addEventListener("click", function () {

    const confirmLeave =
        confirm("Keluar dari Nexus Room?");

    if (!confirmLeave) {
        return;
    }

    localStorage.removeItem("molNexusRoom");

    window.location.href = "index.html";

});


// ==============================================
// LOBBY STARTUP
// ==============================================

window.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "MOL-NEXUS Lobby initialized"
        );

        console.log(
            "Player:",
            student
        );

        console.log(
            "Room:",
            room
        );

    }
);
