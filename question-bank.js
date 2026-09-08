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
        
     <button
  type="button"
  class="edit-question-button"
  data-id="${question.question_id}"
>
  ✏️ Edit
</button>

<button
  type="button"
  class="delete-question-button"
  data-id="${question.question_id}"
  data-code="${question.question_code}"
>
  🗑 Hapus
</button>  
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
/* =========================================
   SAVE QUESTION
========================================= */

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const questionCode =
    document.getElementById("questionCode")
      .value.trim().toUpperCase();

  const nexusZone =
    document.getElementById("nexusZone").value;

  const difficulty =
    document.getElementById("questionDifficulty").value;

  const questionType =
    document.getElementById("questionType").value;

  const questionText =
    document.getElementById("questionText").value.trim();

  const originConcept =
    document.getElementById("originConceptQuestion").value;

  const targetConcept =
    document.getElementById("targetConceptQuestion").value;

  const expectedPath =
    document.getElementById("expectedPath")
      .value
      .split(",")
      .map(item => item.trim().toUpperCase())
      .filter(Boolean);

  const correctAnswer =
    Number(document.getElementById("correctAnswer").value);

  const answerTolerance =
    Number(document.getElementById("answerTolerance").value);

  const correctUnit =
    document.getElementById("correctUnit").value.trim();

  const numeracySkill =
    document.getElementById("numeracySkill").value || null;

  const active =
    document.getElementById("questionActive").checked;


  if (selectedFormulaSequence.length === 0) {
    alert("Pilih minimal satu rumus.");
    return;
  }


  const expectedFormula =
    selectedFormulaSequence
      .map(formula => formula.label)
      .join("; ");


  const saveButton =
    questionForm.querySelector(".formula-save-button");

  saveButton.disabled = true;
  saveButton.textContent = "Menyimpan...";


  try {

    const questionId =
  document.getElementById("questionId").value;

const questionPayload = {
  question_code: questionCode,
  nexus_zone: nexusZone,
  difficulty: difficulty,
  question_type: questionType,
  question_text: questionText,
  origin_concept: originConcept,
  target_concept: targetConcept,
  expected_path: expectedPath,
  expected_formula: expectedFormula,
  correct_answer: correctAnswer,
  answer_tolerance: answerTolerance,
  correct_unit: correctUnit,
  numeracy_skill: numeracySkill,
  active: active
};

let result;

if (questionId) {

  // EDIT / UPDATE
  result = await supabaseClient
    .from("questions")
    .update(questionPayload)
    .eq("question_id", questionId);

} else {

  // TAMBAH / INSERT
  result = await supabaseClient
    .from("questions")
    .insert(questionPayload);

}

if (result.error) throw result.error;

    closeQuestionEditor();

    await loadQuestions();

    alert("Soal berhasil ditambahkan.");

  } catch (error) {

    console.error("Gagal menyimpan soal:", error);

    alert(
      error?.message ||
      "Soal gagal disimpan."
    );

  } finally {

    saveButton.disabled = false;
    saveButton.textContent = "Simpan Soal";

  }
});
/* =========================================
   DELETE QUESTION
========================================= */

questionList.addEventListener("click", async (event) => {

  const deleteButton =
    event.target.closest(".delete-question-button");

  if (!deleteButton) return;

  const questionId = deleteButton.dataset.id;
  const questionCode = deleteButton.dataset.code;

  const confirmed = confirm(
    `Hapus permanen soal ${questionCode}?\n\nTindakan ini tidak dapat dibatalkan.`
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("questions")
    .delete()
    .eq("question_id", questionId);

  if (error) {
    console.error("Gagal menghapus soal:", error);

    alert(
      error.message ||
      "Soal gagal dihapus."
    );

    return;
  }

  alert("Soal berhasil dihapus.");

  await loadQuestions();
});
/* =========================================
   EDIT QUESTION
========================================= */

questionList.addEventListener("click", async (event) => {

  const editButton =
    event.target.closest(".edit-question-button");

  if (!editButton) return;

  const questionId = editButton.dataset.id;

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
    .eq("question_id", questionId)
    .single();

  if (error) {
    console.error("Gagal mengambil soal:", error);
    alert("Data soal gagal dimuat.");
    return;
  }

  questionForm.reset();
  selectedFormulaSequence = [];

  document.getElementById("questionId").value =
    data.question_id;

  document.getElementById("questionCode").value =
    data.question_code;

  document.getElementById("nexusZone").value =
    data.nexus_zone;

  document.getElementById("questionDifficulty").value =
    data.difficulty;

  document.getElementById("questionType").value =
    data.question_type || "CASE";

  document.getElementById("questionText").value =
    data.question_text;

  document.getElementById("originConceptQuestion").value =
    data.origin_concept || "";

  document.getElementById("targetConceptQuestion").value =
    data.target_concept || "";

  document.getElementById("expectedPath").value =
    Array.isArray(data.expected_path)
      ? data.expected_path.join(", ")
      : "";

  document.getElementById("correctAnswer").value =
    data.correct_answer ?? "";

  document.getElementById("answerTolerance").value =
    data.answer_tolerance ?? 0.001;

  document.getElementById("correctUnit").value =
    data.correct_unit || "";

  document.getElementById("numeracySkill").value =
    data.numeracy_skill || "";

  document.getElementById("questionActive").checked =
    data.active !== false;

  document.getElementById("questionModalTitle").textContent =
    "Edit Soal";

  // Modal langsung dibuka
  questionModal.hidden = false;

  // Muat Bank Rumus
  await loadFormulaOptions();

  // Pulihkan urutan rumus soal
  const storedFormulas = (data.expected_formula || "")
    .split(";")
    .map(item => item.trim())
    .filter(Boolean);

  const checkboxes = Array.from(
    formulaOptions.querySelectorAll(
      'input[name="questionFormula"]'
    )
  );

  storedFormulas.forEach(label => {

    const checkbox = checkboxes.find(
      item => item.dataset.label.trim() === label
    );

    if (checkbox) {
      checkbox.checked = true;

      selectedFormulaSequence.push({
        code: checkbox.value,
        label: checkbox.dataset.label
      });
    }

  });

  renderSelectedFormulaOrder();
});
