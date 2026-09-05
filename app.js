// ============================================================
// MOL-NEXUS v2.0
// SECURE STUDENT ACCESS + ROOM JOIN
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

const studentName =
    document.getElementById("studentName");

const roomCode =
    document.getElementById("roomCode");

const joinButton =
    document.getElementById("joinButton");

const message =
    document.getElementById("message");


// ============================================================
// 3. STUDENT SESSION
// ============================================================

let currentStudent = null;

const sessionToken =
    sessionStorage.getItem(
        "mol_nexus_session_token"
    );


// ============================================================
// 4. VALIDATE STUDENT SESSION
// ============================================================

async function validateStudentAccess() {

    /*
    Jika tidak punya token Student Login,
    jangan izinkan masuk melalui index.html langsung.
    */

    if (!sessionToken) {

        window.location.replace(
            "student-login.html"
        );

        return false;
    }


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


        /*
        Nama berasal dari DATABASE,
        bukan input siswa.
        */

        studentName.value =
            currentStudent.display_name;


        /*
        Kunci kolom identitas.
        */

        studentName.readOnly = true;

        studentName.setAttribute(
            "aria-readonly",
            "true"
        );


        /*
        Hapus identitas lama sistem v1.0
        */

        localStorage.removeItem(
            "molNexusStudent"
        );


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
// 5. ROOM CODE AUTO UPPERCASE
// ============================================================

roomCode.addEventListener(
    "input",
    function () {

        this.value =
            this.value
                .toUpperCase()
                .replace(/\s/g, "");

    }
);


// ============================================================
// 6. ENTER KEY
// ============================================================

roomCode.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            joinNexus();

        }

    }
);


// ============================================================
// 7. JOIN BUTTON
// ============================================================

joinButton.addEventListener(
    "click",
    joinNexus
);


// ============================================================
// 8. JOIN NEXUS
// ============================================================

async function joinNexus() {

    const room =
        roomCode.value
            .trim()
            .toUpperCase();


    clearMessage();


    /*
    ============================================
    Pastikan session masih tersedia
    ============================================
    */

    if (!sessionToken || !currentStudent) {

        showMessage(
            "Session siswa tidak valid. Silakan login kembali.",
            "error"
        );

        return;
    }


    /*
    ============================================
    Validasi Room Code
    ============================================
    */

    if (!room) {

        showMessage(
            "Masukkan Room Code.",
            "error"
        );

        roomCode.focus();

        return;
    }


    if (room.length < 4) {

        showMessage(
            "Room Code minimal 4 karakter.",
            "error"
        );

        roomCode.focus();

        return;
    }


    /*
    ============================================
    Loading
    ============================================
    */

    joinButton.disabled = true;

    joinButton.innerHTML =
        "<span>CONNECTING TO NEXUS...</span>";


    try {

        /*
        ============================================
        SECURE JOIN

        Browser hanya mengirim:
        - session token
        - room code

        Nama, student_id, dan slot ditentukan DB.
        ============================================
        */

        const { data, error } =
            await supabaseClient.rpc(
                "join_student_room",
                {
                    p_session_token:
                        sessionToken,

                    p_room_code:
                        room
                }
            );


        if (error) {
            throw error;
        }


        if (!data || data.length === 0) {

            throw new Error(
                "Room tidak dapat diakses."
            );

        }


        const player =
            data[0];


        /*
        ============================================
        Simpan hanya konteks permainan.

        NISN tidak disimpan.
        ============================================
        */

        sessionStorage.setItem(
            "mol_nexus_room",
            player.room_code
        );

        sessionStorage.setItem(
            "mol_nexus_player_slot",
            String(player.player_slot)
        );


        /*
        Bersihkan data room sistem lama.
        */

        localStorage.removeItem(
            "molNexusRoom"
        );


        showMessage(
            "Nexus ditemukan. Menyiapkan Multiplayer Lobby...",
            "success"
        );


        joinButton.innerHTML =
            "<span>NEXUS CONNECTED ✓</span>";


        /*
        ============================================
        Masuk Lobby

        Tidak ada:
        ?student=
        ?room=
        ?nisn=
        ============================================
        */

        setTimeout(
            function () {

                window.location.href =
                    "lobby.html";

            },
            700
        );


    } catch (error) {

        console.error(
            "JOIN NEXUS ERROR:",
            error
        );


        /*
        Pesan aman untuk siswa.
        */

        let safeMessage =
            "Tidak dapat bergabung ke room.";


        if (
            error?.message
                ?.toLowerCase()
                .includes("room tidak ditemukan")
        ) {

            safeMessage =
                "Room Code tidak ditemukan.";

        } else if (
            error?.message
                ?.toLowerCase()
                .includes("room sudah penuh")
        ) {

            safeMessage =
                "Room sudah penuh.";

        } else if (
            error?.message
                ?.toLowerCase()
                .includes("memulai permainan")
        ) {

            safeMessage =
                "Permainan pada room ini sudah dimulai.";

        } else if (
            error?.message
                ?.toLowerCase()
                .includes("session")
        ) {

            safeMessage =
                "Session siswa telah berakhir. Silakan login kembali.";

        }


        showMessage(
            safeMessage,
            "error"
        );


        joinButton.disabled = false;

        joinButton.innerHTML =
            "<span>JOIN NEXUS →</span>";
    }
}


// ============================================================
// 9. SHOW MESSAGE
// ============================================================

function showMessage(text, type) {

    message.textContent =
        text;

    message.className =
        "message " + type;

}


// ============================================================
// 10. CLEAR MESSAGE
// ============================================================

function clearMessage() {

    message.textContent =
        "";

    message.className =
        "message";

}


// ============================================================
// 11. CLEAR STUDENT SESSION
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
// 12. START STUDENT ACCESS
// ============================================================

window.addEventListener(
    "DOMContentLoaded",
    async function () {

        /*
        Jangan restore nama dari localStorage lagi.
        */

        studentName.value = "";

        roomCode.value = "";


        joinButton.disabled = true;


        const valid =
            await validateStudentAccess();


        if (!valid) {
            return;
        }


        joinButton.disabled = false;

        roomCode.focus();

    }
);


// ============================================================
// MOL-NEXUS
// END SECURE STUDENT ACCESS CONTROLLER
// ============================================================
