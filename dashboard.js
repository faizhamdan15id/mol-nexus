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
    } =
      await supabaseClient.auth.getSession();

    if (error || !session) {

      window.location.replace(
        "teacher-login.html"
      );

      return false;
    }


    const {
      data: isTeacher,
      error: teacherError
    } =
      await supabaseClient.rpc(
        "is_mol_nexus_teacher"
      );


    if (
      teacherError ||
      isTeacher !== true
    ) {

      console.warn(
        "TEACHER ACCESS DENIED"
      );

      await supabaseClient.auth.signOut();

      window.location.replace(
        "teacher-login.html?denied=1"
      );

      return false;
    }


    return true;

  } catch (error) {

    console.error(
      "Teacher authorization check failed:",
      error
    );

    window.location.replace(
      "teacher-login.html"
    );

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

const profileDistributionEl =
  document.getElementById("profileDistribution");

const nexusPerformanceEl =
  document.getElementById("nexusPerformance");

const dashboardStudentSearchEl =
  document.getElementById("dashboardStudentSearch");

const dashboardClassFilterEl =
  document.getElementById("dashboardClassFilter");

const dashboardProfileFilterEl =
  document.getElementById("dashboardProfileFilter");

const dashboardEvidenceFilterEl =
  document.getElementById("dashboardEvidenceFilter");

const dashboardUpdatedAtEl =
  document.getElementById("dashboardUpdatedAt");


/* =========================================================
   3. LOCAL DATA
========================================================= */

let dashboardData = [];
let allDashboardData = [];
let classesData = [];


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

function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function validMetricValues(
  rows,
  field
) {

  return rows
    .map(
      row =>
        row[field]
    )
    .filter(
      value =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(
          Number(value)
        )
    )
    .map(Number);
}

function averageMetric(
  rows,
  field
) {

  const values =
    validMetricValues(
      rows,
      field
    );


  if (!values.length) {
    return 0;
  }


  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    values.length
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

    const [
      featureResult,
      classificationResult,
      studentResult,
      classResult
    ] =
      await Promise.all([

        supabaseClient
          .from("student_features")
          .select("*")
          .order(
            "created_at",
            { ascending: false }
          ),

        supabaseClient
          .from("classification_results")
          .select("*")
          .order(
            "created_at",
            { ascending: false }
          ),

        supabaseClient
          .from("students")
          .select(
            "student_id, student_code, display_name, username, class_id"
          ),

        supabaseClient
          .from("classes")
          .select(
            "class_id, class_name, academic_year"
          )
          .order(
            "class_name",
            { ascending: true }
          )
      ]);


    if (featureResult.error) {
      throw featureResult.error;
    }

    if (classificationResult.error) {
      throw classificationResult.error;
    }

    if (studentResult.error) {
      throw studentResult.error;
    }

    if (classResult.error) {
      throw classResult.error;
    }


    classesData =
      classResult.data || [];


    allDashboardData =
      mergeDashboardData(
        featureResult.data || [],
        classificationResult.data || [],
        studentResult.data || [],
        classesData
      );


    populateDashboardFilters();

    applyDashboardFilters();


    if (dashboardUpdatedAtEl) {

      dashboardUpdatedAtEl.textContent =
        new Date().toLocaleString(
          "id-ID",
          {
            dateStyle: "medium",
            timeStyle: "short"
          }
        );
    }

  } catch (error) {

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
  students,
  classes
) {

  const latestFeatureByStudent =
    new Map();


  for (const feature of features) {

    if (!feature.student_id) {
      continue;
    }


    const existing =
      latestFeatureByStudent.get(
        feature.student_id
      );


    if (
      !existing ||
      new Date(
        feature.created_at || 0
      ).getTime() >
      new Date(
        existing.created_at || 0
      ).getTime()
    ) {

      latestFeatureByStudent.set(
        feature.student_id,
        feature
      );
    }
  }


  const classificationByFeature =
    new Map();


  for (const item of classifications) {

    if (
      item.feature_id &&
      !classificationByFeature.has(
        item.feature_id
      )
    ) {

      classificationByFeature.set(
        item.feature_id,
        item
      );
    }
  }


  const studentById =
    new Map(
      students.map(
        student => [
          student.student_id,
          student
        ]
      )
    );


  const classById =
    new Map(
      classes.map(
        item => [
          item.class_id,
          item
        ]
      )
    );


  return [
    ...latestFeatureByStudent.values()
  ]
    .map(feature => {

      const classification =
        classificationByFeature.get(
          feature.feature_id
        );


      const student =
        studentById.get(
          feature.student_id
        );


      const classData =
        classById.get(
          student?.class_id
        );


      const nexusCoverage =
        [
          feature.mass_attempts,
          feature.particle_attempts,
          feature.gas_attempts,
          feature.solution_attempts
        ]
          .filter(
            value =>
              Number(value || 0) > 0
          )
          .length;


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
          "—",

        class_id:
          student?.class_id ||
          null,

        class_name:
          classData?.class_name ||
          "Belum memiliki kelas",

        academic_year:
          classData?.academic_year ||
          null,

        nexus_coverage:
          nexusCoverage
      };

    })
    .sort(
      (a, b) =>
        String(
          a.display_name || ""
        ).localeCompare(
          String(
            b.display_name || ""
          ),
          "id"
        )
    );
}


/* =========================================================
   8. RENDER DASHBOARD
========================================================= */

function renderDashboard() {

  loadingStateEl.hidden =
    true;

  errorStateEl.hidden =
    true;

  renderSummary();

  renderAnalyticsOverview();

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

  studentCardsEl.innerHTML =
    "";


  if (!dashboardData.length) {

    studentCardsEl.innerHTML = `
      <div class="state-message">
        Tidak ada data diagnostik yang sesuai filter.
      </div>
    `;

    return;
  }


  dashboardData.forEach(
    row => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "student-card";


      const classLabel =
        row.academic_year
          ? `${row.class_name} • ${row.academic_year}`
          : row.class_name;


      card.innerHTML = `

        <div class="student-card-top">

          <div>

            <span class="student-code">
              ${escapeHTML(
                row.student_code
              )}
            </span>

            <h3>
              ${escapeHTML(
                row.display_name
              )}
            </h3>

            <p class="student-class-label">
              ${escapeHTML(
                classLabel
              )}
            </p>

          </div>

          <span
            class="profile-badge profile-${escapeHTML(
              row.predicted_profile
            )}"
          >
            ${escapeHTML(
              row.predicted_profile
            )}
          </span>

        </div>


        <p class="profile-name">
          ${escapeHTML(
            profileName(
              row.predicted_profile
            )
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
              ${escapeHTML(
                evidenceLabel(
                  row.evidence_strength
                )
              )}
            </strong>
          </div>

        </div>


        <div class="student-weakness">
          Weakest Nexus:
          <strong>
            ${escapeHTML(
              formatDiagnosticName(
                row.weakest_nexus
              )
            )}
          </strong>
        </div>


        <button
          type="button"
          class="detail-button"
          data-student-id="${escapeHTML(
            row.student_id
          )}"
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
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const row =
              dashboardData.find(
                item =>
                  item.student_id ===
                  button.dataset.studentId
              );


            if (row) {

              showStudentDetail(
                row
              );
            }
          }
        );
      }
    );
}


/* =========================================================
   11. STUDENT DETAIL
========================================================= */

function showStudentDetail(row) {

  const classLabel =
    row.academic_year
      ? `${row.class_name} • ${row.academic_year}`
      : row.class_name;


  diagnosticPanelEl.innerHTML = `

    <div class="panel-heading">

      <div>

        <p class="section-label">
          DIAGNOSTIC ENGINE
        </p>

        <h2>
          ${escapeHTML(
            row.display_name
          )}
        </h2>

        <p>
          ${escapeHTML(
            row.student_code
          )}
          •
          ${escapeHTML(
            classLabel
          )}
        </p>

      </div>

      <span
        class="profile-badge profile-${escapeHTML(
          row.predicted_profile
        )}"
      >
        ${escapeHTML(
          row.predicted_profile
        )}
      </span>

    </div>


    <div class="diagnostic-summary">

      <h3>
        ${escapeHTML(
          profileName(
            row.predicted_profile
          )
        )}
      </h3>

      <p>
        Evidence Strength:
        <strong>
          ${escapeHTML(
            evidenceLabel(
              row.evidence_strength
            )
          )}
        </strong>
        •
        Nexus Coverage:
        <strong>
          ${safeNumber(
            row.nexus_coverage
          )}/4
        </strong>
      </p>

    </div>


    <p class="detail-section-title">
      Cognitive Process Accuracy
    </p>

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


    <p class="detail-section-title">
      Nexus Accuracy
    </p>

    <div class="accuracy-grid">

      ${accuracyCard(
        "Mass",
        row.mass_accuracy
      )}

      ${accuracyCard(
        "Particle",
        row.particle_accuracy
      )}

      ${accuracyCard(
        "Gas",
        row.gas_accuracy
      )}

      ${accuracyCard(
        "Solution",
        row.solution_accuracy
      )}

    </div>


    <div class="diagnostic-info-grid">

      <div class="diagnostic-info">

        <span>
          Dominant Failure
        </span>

        <strong>
          ${escapeHTML(
            formatDiagnosticName(
              row.dominant_failure
            )
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Weakest Nexus
        </span>

        <strong>
          ${escapeHTML(
            formatDiagnosticName(
              row.weakest_nexus
            )
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Weakest Numeracy Skill
        </span>

        <strong>
          ${escapeHTML(
            formatDiagnosticName(
              row.weakest_numeracy_skill
            )
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


      <div class="diagnostic-info">

        <span>
          Analysis Scope
        </span>

        <strong>
          ${escapeHTML(
            row.analysis_scope ||
            "—"
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Algorithm
        </span>

        <strong>
          ${escapeHTML(
            row.algorithm_version ||
            "—"
          )}
        </strong>

      </div>


      <div class="diagnostic-info">

        <span>
          Total Attempt
        </span>

        <strong>
          ${safeNumber(
            row.total_attempts
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
        ${generateTeacherRecommendation(
          row
        )}
      </p>

    </div>


    <div class="decision-box">

      <p class="section-label">
        DECISION TREE TRACE
      </p>

      <pre>${escapeHTML(
        formatDecisionTrace(
          row.decision_trace
        )
      )}</pre>

    </div>

  `;


  diagnosticPanelEl
    .scrollIntoView(
      {
        behavior: "smooth",
        block: "start"
      }
    );
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
function populateDashboardFilters() {

  if (
    dashboardClassFilterEl
  ) {

    const currentValue =
      dashboardClassFilterEl.value;


    dashboardClassFilterEl.innerHTML = `

      <option value="">
        Semua Kelas
      </option>

      ${classesData
        .map(
          item => `

            <option
              value="${escapeHTML(
                item.class_id
              )}"
            >
              ${escapeHTML(
                item.class_name
              )}
              ${
                item.academic_year
                  ? `• ${escapeHTML(
                      item.academic_year
                    )}`
                  : ""
              }
            </option>

          `
        )
        .join("")}

    `;


    dashboardClassFilterEl.value =
      currentValue;
  }


  if (
    dashboardEvidenceFilterEl
  ) {

    const currentValue =
      dashboardEvidenceFilterEl.value;


    const evidenceValues =
      [
        ...new Set(
          allDashboardData
            .map(
              row =>
                evidenceLabel(
                  row.evidence_strength
                )
            )
            .filter(Boolean)
        )
      ]
        .sort();


    dashboardEvidenceFilterEl.innerHTML = `

      <option value="">
        Semua Evidence
      </option>

      ${evidenceValues
        .map(
          value => `
            <option
              value="${escapeHTML(
                value
              )}"
            >
              ${escapeHTML(
                value
              )}
            </option>
          `
        )
        .join("")}

    `;


    dashboardEvidenceFilterEl.value =
      currentValue;
  }
}

function applyDashboardFilters() {

  const keyword =
    String(
      dashboardStudentSearchEl?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const classId =
    dashboardClassFilterEl?.value ||
    "";


  const profile =
    dashboardProfileFilterEl?.value ||
    "";


  const evidence =
    dashboardEvidenceFilterEl?.value ||
    "";


  dashboardData =
    allDashboardData
      .filter(
        row => {

          const matchesSearch =
            !keyword ||
            String(
              row.display_name ||
              ""
            )
              .toLowerCase()
              .includes(
                keyword
              ) ||
            String(
              row.student_code ||
              ""
            )
              .toLowerCase()
              .includes(
                keyword
              );


          const matchesClass =
            !classId ||
            row.class_id ===
              classId;


          const matchesProfile =
            !profile ||
            row.predicted_profile ===
              profile;


          const matchesEvidence =
            !evidence ||
            evidenceLabel(
              row.evidence_strength
            ) ===
              evidence;


          return (
            matchesSearch &&
            matchesClass &&
            matchesProfile &&
            matchesEvidence
          );
        }
      );


  renderDashboard();
}

function renderAnalyticsOverview() {

  renderProfileDistribution();

  renderNexusPerformance();
}

function renderProfileDistribution() {

  if (!profileDistributionEl) {
    return;
  }


  const profiles =
    [
      "P0",
      "P1",
      "P2",
      "P3",
      "P4",
      "P5"
    ];


  const total =
    dashboardData.length;


  profileDistributionEl.innerHTML =
    profiles
      .map(
        profile => {

          const count =
            dashboardData
              .filter(
                row =>
                  row.predicted_profile ===
                  profile
              )
              .length;


          const ratio =
            total
              ? count / total
              : 0;


          return `

            <div class="distribution-row">

              <div class="distribution-label">

                <span
                  class="profile-badge profile-${profile}"
                >
                  ${profile}
                </span>

                <div>

                  <strong>
                    ${count} siswa
                  </strong>

                  <small>
                    ${escapeHTML(
                      profileName(
                        profile
                      )
                    )}
                  </small>

                </div>

              </div>


              <div class="distribution-meter">

                <div
                  class="distribution-fill"
                  style="width:
                    ${Math.min(
                      ratio * 100,
                      100
                    )}%"
                ></div>

              </div>

            </div>

          `;
        }
      )
      .join("");
}

function renderNexusPerformance() {

  if (!nexusPerformanceEl) {
    return;
  }


  const nexusMetrics =
    [
      [
        "MASS",
        "mass_accuracy"
      ],
      [
        "PARTICLE",
        "particle_accuracy"
      ],
      [
        "GAS",
        "gas_accuracy"
      ],
      [
        "SOLUTION",
        "solution_accuracy"
      ]
    ];


  nexusPerformanceEl.innerHTML =
    nexusMetrics
      .map(
        ([label, field]) => {

          const value =
            averageMetric(
              dashboardData,
              field
            );


          return `

            <div class="nexus-performance-row">

              <div class="nexus-performance-label">

                <span>
                  ${label}
                </span>

                <strong>
                  ${percentage(
                    value
                  )}
                </strong>

              </div>


              <div class="progress-track">

                <div
                  class="progress-fill"
                  style="width:
                    ${Math.min(
                      value * 100,
                      100
                    )}%"
                ></div>

              </div>

            </div>

          `;
        }
      )
      .join("");
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

dashboardStudentSearchEl?.addEventListener(
  "input",
  applyDashboardFilters
);

dashboardClassFilterEl?.addEventListener(
  "change",
  applyDashboardFilters
);

dashboardProfileFilterEl?.addEventListener(
  "change",
  applyDashboardFilters
);

dashboardEvidenceFilterEl?.addEventListener(
  "change",
  applyDashboardFilters
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
