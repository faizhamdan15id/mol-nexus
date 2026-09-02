// ==============================================
// MOL-NEXUS v1.0
// STUDENT ACCESS CONTROLLER
// ==============================================

const studentName = document.getElementById("studentName");
const roomCode = document.getElementById("roomCode");
const joinButton = document.getElementById("joinButton");
const message = document.getElementById("message");


// ==============================================
// ROOM CODE AUTO UPPERCASE
// ==============================================

roomCode.addEventListener("input", function () {

    this.value = this.value
        .toUpperCase()
        .replace(/\s/g, "");

});


// ==============================================
// ENTER KEY
// ==============================================

studentName.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {
        roomCode.focus();
    }

});


roomCode.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {
        joinNexus();
    }

});


// ==============================================
// JOIN BUTTON
// ==============================================

joinButton.addEventListener("click", joinNexus);


// ==============================================
// JOIN NEXUS
// ==============================================

function joinNexus() {

    const student = studentName.value.trim();
    const room = roomCode.value.trim();

    clearMessage();


    // VALIDASI NAMA
    if (!student) {

        showMessage(
            "Masukkan nama atau kode siswa.",
            "error"
        );

        studentName.focus();

        return;
    }


    // VALIDASI ROOM
    if (!room) {

        showMessage(
            "Masukkan Room Code.",
            "error"
        );

        roomCode.focus();

        return;
    }


    // MINIMUM ROOM CODE
    if (room.length < 4) {

        showMessage(
            "Room Code minimal 4 karakter.",
            "error"
        );

        roomCode.focus();

        return;
    }


    // LOADING STATE
    joinButton.disabled = true;

    joinButton.innerHTML =
        "<span>CONNECTING TO NEXUS...</span>";


    // SIMPAN DATA LOGIN
localStorage.setItem("molNexusStudent", student);
localStorage.setItem("molNexusRoom", room);

console.log("Student saved:", localStorage.getItem("molNexusStudent"));
console.log("Room saved:", localStorage.getItem("molNexusRoom"));

showMessage(
    "Nexus ditemukan. Menyiapkan Multiplayer Lobby...",
    "success"
);

joinButton.innerHTML =
    "<span>NEXUS CONNECTED ✓</span>";

// MASUK KE MULTIPLAYER LOBBY
setTimeout(function () {
    window.location.href =
        "lobby.html?student=" +
        encodeURIComponent(student) +
        "&room=" +
        encodeURIComponent(room);
}, 700);

}


// ==============================================
// SHOW MESSAGE
// ==============================================

function showMessage(text, type) {

    message.textContent = text;

    message.className =
        "message " + type;

}


// ==============================================
// CLEAR MESSAGE
// ==============================================

function clearMessage() {

    message.textContent = "";

    message.className = "message";

}


// ==============================================
// RESTORE PREVIOUS DATA
// ==============================================

window.addEventListener("DOMContentLoaded", function () {

    const savedStudent =
        localStorage.getItem("molNexusStudent");

    const savedRoom =
        localStorage.getItem("molNexusRoom");


    if (savedStudent) {
        studentName.value = savedStudent;
    }


    if (savedRoom) {
        roomCode.value = savedRoom;
    }

});
