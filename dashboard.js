/* =========================================================
   MOL-NEXUS
   SMART ANALYTICS DASHBOARD
   Version 1.0
========================================================= */


/* =========================================================
   1. SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  "https://snlpdwqdjfnborsorspd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";


const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

/* =========================================================
   TEACHER AUTH GUARD
========================================================= */

async function requireTeacherAuth() {
  try {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {
      window.location.replace("teacher-login.html");
      return false;
    }

    return true;

  } catch (error) {
    console.error("Authentication check failed.");
    window.location.replace("teacher-login.html");
    return false;
  }
}
/* =========================================================
   2. DOM ELEMENTS
========================================================= */

const totalStudentsEl =
  document.getElementById("totalStudents");

const totalAttemptsEl =
  document.getElementById("totalAttempts");

const classAccuracyEl =
  document.getElementById("classAccuracy");

const needInterventionEl =
  document.getElementById("needIntervention");

const studentCardsEl =
  document.getElementById("studentCards");

const loadingStateEl =
  document.getElementById("loadingState");

const errorStateEl =
  document.getElementById("errorState");

const diagnosticPanelEl =
  document.getElementById("diagnosticPanel");

const refreshButton =
  document.getElementById("refreshDashboard");


/* =========================================================
   3. LOCAL DATA
========================================================= */

let dashboardData = [];


/* =========================================================
   4. UTILITIES
========================================================= */

function safeNumber(value) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}


function percentage(value) {

  return (
    safeNumber(value) * 100
  ).toFixed(0) + "%";
}


function profileName(profile) {

  const names = {

    P0:
      "Pola Campuran / Bukti Belum Cukup",

    P1:
      "Indikasi Hambatan Konseptual",

    P2:
      "Hambatan Prosedural / Formula",

    P3:
      "Hambatan Numerasi",

    P4:
      "Pola Respons Guessing",

    P5:
      "Penguasaan Optimal"

  };

  return (
    names[profile] ||
    "Belum Terklasifikasi"
  );
}


function evidenceLabel(value) {

  if (!value) {
    return "LIMITED";
  }

  return String(value).toUpperCase();
}


function formatDiagnosticName(value) {

  if (!value) {
    return "—";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, letter =>
      letter.toUpperCase()
    );
}


/* =========================================================
   5. TEACHER RECOMMENDATION
========================================================= */

function teacherRecommendation(row) {

  switch (row.predicted_profile) {

    case "P1":

      return (
        "Fokuskan intervensi pada pemahaman " +
        "hubungan antarkonsep stoikiometri. " +
        "Gunakan representasi visual dan latihan " +
        "Path Builder sebelum perhitungan."
      );


    case "P2":

      return (
        "Berikan latihan pemilihan dan penyusunan " +
        "rumus secara bertahap. Tekankan hubungan " +
        "antara besaran diketahui, besaran tujuan, " +
        "dan formula yang digunakan."
      );


    case "P3":

      return (
        "Berikan penguatan numerasi kimia, terutama " +
        "operasi hitung, notasi ilmiah, rasio, dan " +
        "konversi satuan sesuai kelemahan siswa."
      );


    case "P4":

      return (
        "Tinjau pola respons cepat-salah siswa. " +
        "Dorong siswa membaca kasus secara utuh dan " +
        "menjelaskan alasan pemilihan jalur sebelum " +
        "mengirim jawaban."
      );


    case "P5":

      return (
        "Pertahankan penguasaan melalui soal " +
        "multistep dan Nexus Challenge dengan " +
        "kompleksitas yang lebih tinggi."
      );


    default:

      return (
        "Data diagnostik belum cukup untuk menetapkan " +
        "profil yang stabil. Tambahkan attempt pada " +
        "beberapa Nexus sebelum melakukan intervensi."
      );
  }
}


/* =========================================================
   6. LOAD DATA
========================================================= */

async function loadDashboard() {

  showLoading();

  try {

    const {
      data: features,
      error: featureError
    } =
      await supabaseClient
        .from("student_features")
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        );


    if (featureError) {
      throw featureError;
    }


    const {
      data: classifications,
      error: classificationError
    } =
      await supabaseClient
        .from("classification_results")
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        );


    if (classificationError) {
      throw classificationError;
    }


    const {
      data: students,
      error: studentError
    } =
      await supabaseClient
        .from("students")
        .select(
          "student_id, student_code, display_name, username"
        );


    if (studentError) {
      throw studentError;
    }


    dashboardData =
      mergeDashboardData(
        features || [],
        classifications || [],
        students || []
      );


    renderDashboard();

  }

  catch (error) {

    console.error(
      "DASHBOARD LOAD ERROR:",
      error
    );

    showError(
      error.message ||
      "Gagal mengambil data MOL-NEXUS."
    );
  }
}


/* =========================================================
   7. MERGE DATA
========================================================= */

function mergeDashboardData(
  features,
  classifications,
  students
) {

  return features.map(feature => {

    const classification =
      classifications.find(item =>
        item.feature_id ===
        feature.feature_id
      );


    const student =
      students.find(item =>
        item.student_id ===
        feature.student_id
      );


    return {

      ...feature,

      predicted_profile:
        classification?.predicted_profile ||
        "P0",

      evidence_strength:
        classification?.evidence_strength ||
        "LIMITED",

      dominant_failure:
        classification?.dominant_failure ||
        null,

      weakest_nexus:
        classification?.weakest_nexus ||
        null,

      weakest_numeracy_skill:
        classification?.weakest_numeracy_skill ||
        null,

      decision_trace:
        classification?.decision_trace ||
        null,

      algorithm_version:
        classification?.algorithm_version ||
        null,

      display_name:
        student?.display_name ||
        student?.username ||
        student?.student_code ||
        "Siswa MOL-NEXUS",

      student_code:
        student?.student_code ||
        "—"
    };

  });
}


/* =========================================================
   8. RENDER DASHBOARD
========================================================= */

function renderDashboard() {

  loadingStateEl.hidden = true;
  errorStateEl.hidden = true;

  renderSummary();
  renderStudentCards();
}


/* =========================================================
   9. SUMMARY
========================================================= */

function renderSummary() {

  const totalStudents =
    new Set(
      dashboardData.map(
        row => row.student_id
      )
    ).size;


  const totalAttempts =
    dashboardData.reduce(
      (total, row) =>
        total +
        safeNumber(row.total_attempts),
      0
    );


  const accuracyValues =
    dashboardData
      .map(row =>
        Number(row.overall_accuracy)
      )
      .filter(value =>
        Number.isFinite(value)
      );


  const averageAccuracy =
    accuracyValues.length
      ? (
          accuracyValues.reduce(
            (a, b) => a + b,
            0
          ) /
          accuracyValues.length
        )
      : 0;


  const interventionStudents =
    new Set(
      dashboardData
        .filter(row =>
          ["P1", "P2", "P3", "P4"]
            .includes(
              row.predicted_profile
            )
        )
        .map(row =>
          row.student_id
        )
    ).size;


  totalStudentsEl.textContent =
    totalStudents;

  totalAttemptsEl.textContent =
    totalAttempts;

  classAccuracyEl.textContent =
    percentage(
      averageAccuracy
    );

  needInterventionEl.textContent =
    interventionStudents;
}


/* =========================================================
   10. STUDENT CARDS
========================================================= */

function renderStudentCards() {

  studentCardsEl.innerHTML = "";


  if (!dashboardData.length) {

    studentCardsEl.innerHTML = `
      <div class="state-message">
        Belum ada data diagnostik siswa.
      </div>
    `;

    return;
  }


  dashboardData.forEach(
    (row, index) => {

      const card =
        document.createElement("article");

      card.className =
        "student-card";

      card.innerHTML = `

        <div class="student-card-top">

          <div>

            <span class="student-code">
              ${row.student_code}
            </span>

            <h3>
              ${row.display_name}
            </h3>

          </div>

          <span
            class="profile-badge profile-${row.predicted_profile}"
          >
            ${row.predicted_profile}
          </span>

        </div>


        <p class="profile-name">
          ${profileName(
            row.predicted_profile
          )}
        </p>


        <div class="student-stats">

          <div>
            <span>Attempt</span>
            <strong>
              ${safeNumber(
                row.total_attempts
              )}
            </strong>
          </div>

          <div>
            <span>Akurasi</span>
            <strong>
              ${percentage(
                row.overall_accuracy
              )}
            </strong>
          </div>

          <div>
            <span>Evidence</span>
            <strong>
              ${evidenceLabel(
                row.evidence_strength
              )}
            </strong>
          </div>

        </div>


        <button
          type="button"
          class="detail-button"
          data-index="${index}"
        >
          Lihat Analisis
        </button>

      `;


      studentCardsEl.appendChild(
        card
      );
    }
  );


  document
    .querySelectorAll(
      ".detail-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const index =
            Number(
              button.dataset.index
            );

          showStudentDetail(
            dashboardData[index]
          );
        }
      );

    });
}


/* =========================================================
   11. STUDENT DETAIL
========================================================= */

function showStudentDetail(row) {

  diagnosticPanelEl.innerHTML = `

    <div class="panel-heading">

      <div>

        <p class="section-label">
          DIAGNOSTIC ENGINE
        </p>

        <h2>
          ${row.display_name}
        </h2>

        <p>
          ${row.student_code}
        </p>

      </div>

      <span
        class="profile-badge profile-${row.predicted_profile}"
      >
        ${row.predicted_profile}
      </span>

    </div>


    <div class="diagnostic-summary">

      <h3>
        ${profileName(
          row.predicted_profile
        )}
      </h3>

      <p>
        Evidence Strength:
        <strong>
          ${evidenceLabel(
            row.evidence_strength
          )}
        </strong>
      </p>

    </div>


    <div class="accuracy-grid">

      ${accuracyCard(
        "Path",
        row.path_accuracy
      )}

      ${accuracyCard(
        "Formula",
        row.formula_accuracy
      )}

      ${accuracyCard(
        "Calculation",
        row.calculation_accuracy
      )}

      ${accuracyCard(
        "Unit",
        row.unit_accuracy
      )}

    </div>


    <div class="diagnostic-info-grid">

      <div class="diagnostic-info">

        <span>
          Dominant Failure
        </span>

        <strong>
          ${formatDiagnosticName(
            row.dominant_failure
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Weakest Nexus
        </span>

        <strong>
          ${formatDiagnosticName(
            row.weakest_nexus
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Weakest Numeracy Skill
        </span>

        <strong>
          ${formatDiagnosticName(
            row.weakest_numeracy_skill
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Fast Wrong Rate
        </span>

        <strong>
          ${percentage(
            row.fast_wrong_rate
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Hint Rate
        </span>

        <strong>
          ${percentage(
            row.hint_rate
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Retry Rate
        </span>

        <strong>
          ${percentage(
            row.retry_rate
          )}
        </strong>

      </div>

    </div>


    <div class="recommendation-box">

      <p class="section-label">
        TEACHER RECOMMENDATION
      </p>

      <h3>
        Rekomendasi Intervensi
      </h3>

      <p>
       ${generateTeacherRecommendation(row)}
      </p>

    </div>


    <div class="decision-box">

      <p class="section-label">
        DECISION TREE TRACE
      </p>

      <pre>${formatDecisionTrace(
        row.decision_trace
      )}</pre>

    </div>

  `;


  diagnosticPanelEl
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


/* =========================================================
   12. ACCURACY CARD
========================================================= */

function accuracyCard(
  label,
  value
) {

  const numeric =
    safeNumber(value);

  return `

    <div class="accuracy-card">

      <span>
        ${label}
      </span>

      <strong>
        ${percentage(numeric)}
      </strong>

      <div class="progress-track">

        <div
          class="progress-fill"
          style="width:
          ${Math.min(
            numeric * 100,
            100
          )}%"
        ></div>

      </div>

    </div>

  `;
}


/* =========================================================
   13. DECISION TRACE
========================================================= */

function formatDecisionTrace(trace) {

  if (!trace) {
    return "Belum tersedia.";
  }


  if (
    typeof trace === "object"
  ) {

    return JSON.stringify(
      trace,
      null,
      2
    );
  }


  try {

    return JSON.stringify(
      JSON.parse(trace),
      null,
      2
    );

  }

  catch {

    return String(trace);
  }
}

function generateTeacherRecommendation(student) {
  const attempts = Number(student.total_attempts || 0);
  const coverage = Number(student.nexus_coverage || 0);

  const profile = student.predicted_profile || "P0";

  const path = Number(student.path_accuracy || 0);
  const formula = Number(student.formula_accuracy || 0);
  const calculation = Number(student.calculation_accuracy || 0);
  const unit = Number(student.unit_accuracy || 0);

  // ======================================================
// EVIDENCE GATE
// Hanya berlaku jika profil masih P0.
// Jika Diagnostic Engine sudah menetapkan P1–P5,
// rekomendasi harus mengikuti profil hasil klasifikasi.
// ======================================================

if (profile === "P0") {

  const components = [
    { name: "Path", value: path },
    { name: "Formula", value: formula },
    { name: "Calculation", value: calculation },
    { name: "Unit", value: unit }
  ];

  const weakest = components.reduce(
    (a, b) => a.value <= b.value ? a : b
  );

  if (attempts < 5 || coverage < 3) {

    if (weakest.value < 0.8) {
      return `
        Bukti diagnostik belum mencukupi untuk menetapkan
        profil kognitif final. Namun, respons awal menunjukkan
        kelemahan relatif pada tahap <strong>${weakest.name}</strong>
        (${Math.round(weakest.value * 100)}%).
        Berikan latihan terarah pada komponen tersebut dan
        kumpulkan respons tambahan pada beberapa Nexus sebelum
        menetapkan profil siswa.
      `;
    }

    return `
      Performa awal menunjukkan penguasaan Path, Formula,
      Calculation, dan Unit yang baik. Namun, jumlah attempt
      dan cakupan Nexus belum mencukupi untuk menetapkan profil
      penguasaan final. Lanjutkan pengumpulan bukti pada beberapa
      Nexus dan tingkat kesulitan yang berbeda.
    `;
  }

  return `
    Data menunjukkan pola kemampuan yang belum cukup konsisten
    untuk dimasukkan ke profil P1–P5. Lanjutkan pengumpulan
    respons dan evaluasi pola kesalahan siswa pada beberapa Nexus.
  `;
}


  // =====================================================
  // P1 — INDIKASI HAMBATAN KONSEPTUAL
  // =====================================================

  if (profile === "P1") {
    return `
      Terdapat indikasi hambatan konseptual pada pemilihan
      jalur penyelesaian stoikiometri. Guru disarankan
      memberikan latihan pemetaan hubungan antarbesaran
      kimia menggunakan skema
      <strong>besaran awal → mol → besaran target</strong>
      sebelum melanjutkan ke perhitungan kompleks.
    `;
  }


  // =====================================================
  // P2 — HAMBATAN PROSEDURAL / FORMULA
  // =====================================================

  if (profile === "P2") {
    return `
      Siswa mampu mengenali jalur konsep, tetapi masih
      mengalami hambatan dalam memilih atau menyusun formula.
      Berikan latihan Formula Builder bertahap dan minta siswa
      menjelaskan alasan pemilihan setiap persamaan sebelum
      melakukan substitusi angka.
    `;
  }


  // =====================================================
  // P3 — HAMBATAN NUMERASI
  // =====================================================

  if (profile === "P3") {
    return `
      Jalur konsep dan formula relatif telah dikuasai,
      tetapi ditemukan indikasi hambatan numerasi.
      Fokuskan intervensi pada operasi hitung, konversi satuan,
      rasio, desimal, dan notasi ilmiah sesuai pola kesalahan
      yang paling sering muncul.
    `;
  }


  // =====================================================
  // P4 — POLA RESPONS GUESSING
  // =====================================================

  if (profile === "P4") {
    return `
      Sistem mendeteksi pola respons cepat-salah yang
      konsisten dengan indikasi guessing. Guru disarankan
      meminta siswa menuliskan atau menjelaskan alasan
      pemilihan Path dan Formula serta menggunakan soal
      verifikasi sebelum menyimpulkan tingkat penguasaan.
    `;
  }


  // =====================================================
  // P5 — PENGUASAAN OPTIMAL
  // =====================================================

  if (profile === "P5") {
    return `
      Siswa menunjukkan penguasaan yang kuat pada Path,
      Formula, Calculation, dan Unit dengan bukti diagnostik
      yang memadai. Berikan tantangan stoikiometri multistep,
      soal kontekstual, dan aktivitas transfer konsep untuk
      mempertahankan serta memperluas penguasaan.
    `;
  }


  // =====================================================
  // P0 — MIXED / UNCERTAIN
  // =====================================================

  return `
    Pola respons masih campuran atau belum menunjukkan
    kecenderungan diagnostik yang cukup kuat. Tambahkan
    beberapa kasus dari Nexus dan tingkat kesulitan berbeda
    sebelum menentukan bentuk intervensi khusus.
  `;
}
/* =========================================================
   14. STATES
========================================================= */

function showLoading() {

  loadingStateEl.hidden = false;

  loadingStateEl.textContent =
    "Memuat data MOL-NEXUS...";

  errorStateEl.hidden = true;

  studentCardsEl.innerHTML = "";
}


function showError(message) {

  loadingStateEl.hidden = true;

  errorStateEl.hidden = false;

  errorStateEl.textContent =
    "Dashboard Error: " + message;
}


/* =========================================================
   15. EVENTS
========================================================= */

refreshButton.addEventListener(
  "click",
  loadDashboard
);


/* =========================================================
   16. INITIALIZE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const authenticated =
      await requireTeacherAuth();

    if (!authenticated) {
      return;
    }

    loadDashboard();

  }
);
