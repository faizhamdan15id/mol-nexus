"use strict";

/* =========================================
   MOL-NEXUS
   QUESTION BANK MANAGEMENT
========================================= */

const SUPABASE_URL = "https://snlpdwqdjfnborsorspd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const questionList =
  document.getElementById("questionList");


async function requireTeacherAuth() {

  const { data: { session }, error } =
    await supabaseClient.auth.getSession();

  if (error || !session) {
    window.location.replace("teacher-login.html");
    return false;
  }

  return true;
}


async function loadQuestions() {

  questionList.innerHTML =
    `<p class="state-message">Memuat Bank Soal...</p>`;

  const { data, error } = await supabaseClient
    .from("questions")
    .select(`
      question_id,
      question_code,
      nexus_zone,
      difficulty,
      question_type,
      question_text,
      origin_concept,
      target_concept,
      expected_path,
      expected_formula,
      correct_answer,
      answer_tolerance,
      correct_unit,
      numeracy_skill,
      active
    `)
    .order("created_at", { ascending: true });

  if (error) {

    console.error("Gagal memuat soal:", error);

    questionList.innerHTML =
      `<p class="state-message error-message">
        Gagal memuat Bank Soal.
      </p>`;

    return;
  }


  if (!data || data.length === 0) {

    questionList.innerHTML =
      `<p class="state-message">
        Belum ada soal.
      </p>`;

    return;
  }


  questionList.innerHTML = data.map(question => {

    const path = Array.isArray(question.expected_path)
      ? question.expected_path.join(" → ")
      : "-";

    return `
      <article class="summary-card" style="margin-bottom:16px">

        <span>
          ${question.nexus_zone}
          •
          ${question.difficulty}
        </span>

        <strong>
          ${question.question_code}
        </strong>

        <p>
          ${question.question_text}
        </p>

        <small>
          ${question.origin_concept || "-"}
          →
          ${question.target_concept || "-"}
        </small>

        <p>
          <b>Path:</b> ${path}
        </p>

        <p>
          <b>Rumus:</b>
          ${question.expected_formula || "-"}
        </p>

        <p>
          <b>Jawaban:</b>
          ${question.correct_answer ?? "-"}
          ${question.correct_unit || ""}
        </p>

        <small>
          ${question.question_type || "NORMAL"}
          •
          ${question.active ? "AKTIF" : "NONAKTIF"}
        </small>

      </article>
    `;
  }).join("");
}


async function initQuestionBank() {

  const authenticated =
    await requireTeacherAuth();

  if (!authenticated) return;

  await loadQuestions();
}


initQuestionBank();
/* =========================================
   QUESTION EDITOR MODAL
========================================= */

const addQuestionButton =
  document.getElementById("addQuestionButton");

const questionModal =
  document.getElementById("questionModal");

const closeQuestionModal =
  document.getElementById("closeQuestionModal");

const questionForm =
  document.getElementById("questionForm");

const formulaOptions =
  document.getElementById("formulaOptions");

const selectedFormulaOrder =
  document.getElementById("selectedFormulaOrder");

let selectedFormulaSequence = [];

async function loadFormulaOptions() {

  formulaOptions.innerHTML =
    `<p class="state-message">Memuat Bank Rumus...</p>`;

  const { data, error } = await supabaseClient
    .from("formula_bank")
    .select(`
      id,
      formula_code,
      formula_label,
      origin_concept,
      target_concept
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Gagal memuat Bank Rumus:", error);

    formulaOptions.innerHTML =
      `<p class="state-message error-message">
        Bank Rumus gagal dimuat.
      </p>`;

    return;
  }

  formulaOptions.innerHTML = data.map(formula => `
    <label class="question-formula-option">
      <input
        type="checkbox"
        name="questionFormula"
        value="${formula.formula_code}"
        data-label="${formula.formula_label}"
      >

      <span>
        <strong>${formula.formula_label}</strong>
        <small>
          ${formula.origin_concept} → ${formula.target_concept}
        </small>
      </span>
    </label>
  `).join("");
}


async function openAddQuestionModal() {

  questionForm.reset();
  selectedFormulaSequence = [];
renderSelectedFormulaOrder(); 
  document.getElementById("questionId").value = "";
  document.getElementById("questionActive").checked = true;

  document.getElementById("questionModalTitle").textContent =
    "Tambah Soal";

  // Buka modal terlebih dahulu
  questionModal.hidden = false;

  // Baru muat daftar rumus
  await loadFormulaOptions();
}


function closeQuestionEditor() {
  questionModal.hidden = true;
}


addQuestionButton.addEventListener(
  "click",
  openAddQuestionModal
);


closeQuestionModal.addEventListener(
  "click",
  closeQuestionEditor
);


questionModal.addEventListener("click", (event) => {

  if (event.target === questionModal) {
    closeQuestionEditor();
  }

});
/* =========================================
   FORMULA SELECTION ORDER
========================================= */

function renderSelectedFormulaOrder() {

  if (selectedFormulaSequence.length === 0) {
    selectedFormulaOrder.innerHTML = `
      <p class="state-message">
        Belum ada rumus dipilih.
      </p>
    `;
    return;
  }

  selectedFormulaOrder.innerHTML =
    selectedFormulaSequence
      .map((formula, index) => `
        <div class="selected-formula-step">
          <strong>
            ${index + 1}. ${formula.label}
          </strong>

          <small>
            ${formula.code}
          </small>
        </div>
      `)
      .join("");
}


formulaOptions.addEventListener("change", (event) => {

  const checkbox = event.target.closest(
    'input[name="questionFormula"]'
  );

  if (!checkbox) return;

  const formula = {
    code: checkbox.value,
    label: checkbox.dataset.label
  };

  if (checkbox.checked) {

    const alreadySelected =
      selectedFormulaSequence.some(
        item => item.code === formula.code
      );

    if (!alreadySelected) {
      selectedFormulaSequence.push(formula);
    }

  } else {

    selectedFormulaSequence =
      selectedFormulaSequence.filter(
        item => item.code !== formula.code
      );

  }

  renderSelectedFormulaOrder();
});
