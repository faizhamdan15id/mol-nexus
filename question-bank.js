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

    alert(
  questionId
    ? "Soal berhasil diperbarui."
    : "Soal berhasil ditambahkan."
);

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


/* =========================================
   BULK QUESTION IMPORT
========================================= */

const importQuestionsButton =
  document.getElementById(
    "importQuestionsButton"
  );

const downloadQuestionTemplateButton =
  document.getElementById(
    "downloadQuestionTemplateButton"
  );

const questionExcelInput =
  document.getElementById(
    "questionExcelInput"
  );

const importQuestionModal =
  document.getElementById(
    "importQuestionModal"
  );

const closeImportQuestionModal =
  document.getElementById(
    "closeImportQuestionModal"
  );

const questionImportSummary =
  document.getElementById(
    "questionImportSummary"
  );

const questionImportPreview =
  document.getElementById(
    "questionImportPreview"
  );

const confirmImportQuestions =
  document.getElementById(
    "confirmImportQuestions"
  );


let questionImportRows = [];

let questionImportExistingCodes =
  new Set();

let questionImportFormulaMap =
  new Map();


const QUESTION_IMPORT_ZONES =
  new Set([
    "MASS",
    "PARTICLE",
    "GAS",
    "SOLUTION",
    "STOICHIOMETRY"
  ]);


const QUESTION_IMPORT_DIFFICULTIES =
  new Set([
    "EXPLORER",
    "CONNECTOR",
    "STRATEGIST",
    "NEXUS_MASTER"
  ]);


const QUESTION_IMPORT_TYPES =
  new Set([
    "CASE",
    "FINAL_NEXUS"
  ]);


const QUESTION_IMPORT_CONCEPTS =
  new Set([
    "MASS",
    "PARTICLE",
    "GAS",
    "SOLUTION",
    "MOL"
  ]);


const QUESTION_IMPORT_NUMERACY =
  new Set([
    "DIVISION",
    "MULTIPLICATION",
    "DECIMAL_DIVISION",
    "DECIMAL",
    "SCIENTIFIC_NOTATION",
    "RATIO",
    "UNIT_CONVERSION",
    "MULTI_STEP_STOICHIOMETRY"
  ]);


/* =========================================
   IMPORT UTILITIES
========================================= */

function normalizeQuestionImportText(
  value
) {

  return String(
    value ?? ""
  )
    .trim();

}


function normalizeQuestionImportUpper(
  value
) {

  return normalizeQuestionImportText(
    value
  )
    .toUpperCase();

}


function escapeQuestionImportHtml(
  value
) {

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


function splitQuestionImportList(
  value
) {

  return normalizeQuestionImportText(
    value
  )
    .split(
      /[,;>→]+/
    )
    .map(
      item =>
        item
          .trim()
          .toUpperCase()
    )
    .filter(Boolean);

}


function parseQuestionImportNumber(
  value
) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {

    return null;
  }


  let text =
    String(value)
      .trim()
      .replaceAll(" ", "");


  if (
    text.includes(",") &&
    !text.includes(".")
  ) {

    text =
      text.replace(",", ".");
  }


  const number =
    Number(text);


  return Number.isFinite(number)
    ? number
    : null;

}


function parseQuestionImportBoolean(
  value
) {

  const text =
    normalizeQuestionImportUpper(
      value
    );


  if (!text) {
    return true;
  }


  if (
    [
      "TRUE",
      "1",
      "YA",
      "YES",
      "AKTIF"
    ].includes(text)
  ) {

    return true;
  }


  if (
    [
      "FALSE",
      "0",
      "TIDAK",
      "NO",
      "NONAKTIF"
    ].includes(text)
  ) {

    return false;
  }


  return null;

}


/* =========================================
   LOAD IMPORT REFERENCES
========================================= */

async function loadQuestionImportReferences() {

  const [
    questionsResult,
    formulasResult
  ] =
    await Promise.all([

      supabaseClient
        .from("questions")
        .select(
          "question_code"
        ),

      supabaseClient
        .from("formula_bank")
        .select(
          "formula_code, formula_label, origin_concept, target_concept, is_active"
        )
        .eq(
          "is_active",
          true
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        )
    ]);


  if (questionsResult.error) {
    throw questionsResult.error;
  }


  if (formulasResult.error) {
    throw formulasResult.error;
  }


  questionImportExistingCodes =
    new Set(
      (questionsResult.data || [])
        .map(
          item =>
            normalizeQuestionImportUpper(
              item.question_code
            )
        )
    );


  questionImportFormulaMap =
    new Map(
      (formulasResult.data || [])
        .map(
          item => [
            normalizeQuestionImportUpper(
              item.formula_code
            ),
            item
          ]
        )
    );


  return {
    formulas:
      formulasResult.data || []
  };
}


/* =========================================
   DOWNLOAD QUESTION EXCEL TEMPLATE
========================================= */

downloadQuestionTemplateButton
  ?.addEventListener(
    "click",
    async () => {

      try {

        const {
          formulas
        } =
          await loadQuestionImportReferences();


        const templateData = [

          [
            "Kode Soal",
            "Zona Nexus",
            "Difficulty",
            "Tipe Soal",
            "Teks Soal",
            "Konsep Asal",
            "Konsep Tujuan",
            "Path",
            "Kode Rumus",
            "Jawaban Benar",
            "Toleransi",
            "Satuan",
            "Numeracy Skill",
            "Aktif"
          ],

          [
            "MN-MASS-101",
            "MASS",
            "EXPLORER",
            "CASE",
            "Sebanyak 18 gram H2O memiliki Mr 18. Tentukan jumlah mol H2O.",
            "MASS",
            "MOL",
            "MASS,MOL",
            "MASS_TO_MOL",
            1,
            0.001,
            "mol",
            "DIVISION",
            "TRUE"
          ],

          [
            "MN-PARTICLE-101",
            "PARTICLE",
            "CONNECTOR",
            "CASE",
            "Suatu sampel mengandung 6.02 × 10^23 molekul CO2. Jika Mr CO2 = 44, tentukan massanya.",
            "PARTICLE",
            "MASS",
            "PARTICLE,MOL,MASS",
            "PARTICLE_TO_MOL,MOL_TO_MASS",
            44,
            0.001,
            "g",
            "SCIENTIFIC_NOTATION",
            "TRUE"
          ]

        ];


        const worksheet =
          XLSX.utils.aoa_to_sheet(
            templateData
          );


        worksheet["!cols"] = [

          { wch: 20 },
          { wch: 18 },
          { wch: 18 },
          { wch: 18 },
          { wch: 68 },
          { wch: 18 },
          { wch: 18 },
          { wch: 28 },
          { wch: 42 },
          { wch: 18 },
          { wch: 14 },
          { wch: 14 },
          { wch: 28 },
          { wch: 12 }

        ];


        const instructionData = [

          [
            "PETUNJUK IMPORT SOAL MOL-NEXUS"
          ],

          [""],

          [
            "1.",
            "Jangan mengubah nama kolom pada sheet DATA SOAL."
          ],

          [
            "2.",
            "Kode Soal wajib unik dan tidak boleh sama dengan soal yang sudah ada."
          ],

          [
            "3.",
            "Zona Nexus: MASS, PARTICLE, GAS, SOLUTION, atau STOICHIOMETRY."
          ],

          [
            "4.",
            "Difficulty: EXPLORER, CONNECTOR, STRATEGIST, atau NEXUS_MASTER."
          ],

          [
            "5.",
            "Tipe Soal: CASE atau FINAL_NEXUS."
          ],

          [
            "6.",
            "Konsep Asal/Tujuan: MASS, PARTICLE, GAS, SOLUTION, atau MOL."
          ],

          [
            "7.",
            "Path dipisahkan koma. Contoh: MASS,MOL,PARTICLE."
          ],

          [
            "8.",
            "Kode Rumus harus menggunakan formula_code dari sheet BANK RUMUS dan ditulis berurutan, dipisahkan koma."
          ],

          [
            "9.",
            "Jawaban Benar harus berupa angka. Toleransi boleh dikosongkan dan akan memakai 0.001."
          ],

          [
            "10.",
            "Numeracy Skill dapat menggunakan DIVISION, MULTIPLICATION, DECIMAL_DIVISION, SCIENTIFIC_NOTATION, UNIT_CONVERSION, atau MULTI_STEP_STOICHIOMETRY."
          ],

          [
            "11.",
            "Aktif diisi TRUE atau FALSE. Jika kosong, dianggap TRUE."
          ],

          [
            "12.",
            "Hapus dua baris contoh sebelum mengimpor soal sebenarnya."
          ]

        ];


        const instructionSheet =
          XLSX.utils.aoa_to_sheet(
            instructionData
          );


        instructionSheet["!cols"] = [
          { wch: 8 },
          { wch: 95 }
        ];


        const formulaData = [

          [
            "Kode Rumus",
            "Rumus",
            "Konsep Asal",
            "Konsep Tujuan"
          ],

          ...formulas.map(
            item => [
              item.formula_code,
              item.formula_label,
              item.origin_concept,
              item.target_concept
            ]
          )

        ];


        const formulaSheet =
          XLSX.utils.aoa_to_sheet(
            formulaData
          );


        formulaSheet["!cols"] = [
          { wch: 25 },
          { wch: 38 },
          { wch: 18 },
          { wch: 18 }
        ];


        const workbook =
          XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          "DATA SOAL"
        );


        XLSX.utils.book_append_sheet(
          workbook,
          instructionSheet,
          "PETUNJUK"
        );


        XLSX.utils.book_append_sheet(
          workbook,
          formulaSheet,
          "BANK RUMUS"
        );


        XLSX.writeFile(
          workbook,
          "Template_Import_Soal_MOL-NEXUS.xlsx"
        );


      } catch (error) {

        console.error(
          "Gagal membuat template soal:",
          error
        );


        alert(
          error?.message ||
          "Template Excel soal gagal dibuat."
        );

      }

    }
  );


/* =========================================
   OPEN / CLOSE IMPORT
========================================= */

importQuestionsButton
  ?.addEventListener(
    "click",
    () => {

      questionExcelInput.value =
        "";

      questionExcelInput.click();

    }
  );


function closeQuestionImportEditor() {

  importQuestionModal.hidden =
    true;

}


closeImportQuestionModal
  ?.addEventListener(
    "click",
    closeQuestionImportEditor
  );


importQuestionModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        importQuestionModal
      ) {

        closeQuestionImportEditor();

      }

    }
  );


/* =========================================
   READ QUESTION EXCEL
========================================= */

questionExcelInput
  ?.addEventListener(
    "change",
    async event => {

      const file =
        event.target.files?.[0];


      if (!file) {
        return;
      }


      try {

        await loadQuestionImportReferences();


        const buffer =
          await file.arrayBuffer();


        const workbook =
          XLSX.read(
            buffer,
            {
              type:
                "array"
            }
          );


        const sheetName =
          workbook.SheetNames.includes(
            "DATA SOAL"
          )
            ? "DATA SOAL"
            : workbook.SheetNames[0];


        const worksheet =
          workbook.Sheets[
            sheetName
          ];


        const excelRows =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              defval: "",
              raw: false
            }
          );


        if (
          excelRows.length === 0
        ) {

          alert(
            "File Excel tidak memiliki data soal."
          );

          return;
        }


        validateImportedQuestions(
          excelRows
        );


        importQuestionModal.hidden =
          false;


      } catch (error) {

        console.error(
          "Gagal membaca Excel soal:",
          error
        );


        alert(
          error?.message ||
          "File Excel soal gagal dibaca."
        );

      }

    }
  );


/* =========================================
   VALIDATE IMPORTED QUESTIONS
========================================= */

function validateImportedQuestions(
  rows
) {

  const fileCodes =
    new Set();


  questionImportRows =
    rows.map(
      (row, index) => {

        const questionCode =
          normalizeQuestionImportUpper(
            row["Kode Soal"]
          );


        const nexusZone =
          normalizeQuestionImportUpper(
            row["Zona Nexus"]
          );


        const difficulty =
          normalizeQuestionImportUpper(
            row["Difficulty"]
          );


        const questionType =
          normalizeQuestionImportUpper(
            row["Tipe Soal"]
          ) ||
          "CASE";


        const questionText =
          normalizeQuestionImportText(
            row["Teks Soal"]
          );


        const originConcept =
          normalizeQuestionImportUpper(
            row["Konsep Asal"]
          );


        const targetConcept =
          normalizeQuestionImportUpper(
            row["Konsep Tujuan"]
          );


        const expectedPath =
          splitQuestionImportList(
            row["Path"]
          );


        const formulaCodes =
          splitQuestionImportList(
            row["Kode Rumus"]
          );


        const correctAnswer =
          parseQuestionImportNumber(
            row["Jawaban Benar"]
          );


        const rawTolerance =
          normalizeQuestionImportText(
            row["Toleransi"]
          );


        const answerTolerance =
          rawTolerance
            ? parseQuestionImportNumber(
                rawTolerance
              )
            : 0.001;


        const correctUnit =
          normalizeQuestionImportText(
            row["Satuan"]
          );


        const numeracySkill =
          normalizeQuestionImportUpper(
            row["Numeracy Skill"]
          );


        const active =
          parseQuestionImportBoolean(
            row["Aktif"]
          );


        const errors = [];
        const warnings = [];


        if (!questionCode) {

          errors.push(
            "Kode soal kosong"
          );

        }


        if (
          questionCode &&
          questionImportExistingCodes.has(
            questionCode
          )
        ) {

          errors.push(
            "Kode soal sudah terdaftar"
          );

        }


        if (questionCode) {

          if (
            fileCodes.has(
              questionCode
            )
          ) {

            errors.push(
              "Kode soal duplikat di Excel"
            );

          } else {

            fileCodes.add(
              questionCode
            );

          }

        }


        if (
          !QUESTION_IMPORT_ZONES.has(
            nexusZone
          )
        ) {

          errors.push(
            "Zona Nexus tidak valid"
          );

        }


        if (
          !QUESTION_IMPORT_DIFFICULTIES.has(
            difficulty
          )
        ) {

          errors.push(
            "Difficulty tidak valid"
          );

        }


        if (
          !QUESTION_IMPORT_TYPES.has(
            questionType
          )
        ) {

          errors.push(
            "Tipe soal tidak valid"
          );

        }


        if (!questionText) {

          errors.push(
            "Teks soal kosong"
          );

        }


        if (
          !QUESTION_IMPORT_CONCEPTS.has(
            originConcept
          )
        ) {

          errors.push(
            "Konsep asal tidak valid"
          );

        }


        if (
          !QUESTION_IMPORT_CONCEPTS.has(
            targetConcept
          )
        ) {

          errors.push(
            "Konsep tujuan tidak valid"
          );

        }


        if (
          expectedPath.length === 0
        ) {

          errors.push(
            "Path kosong"
          );

        } else {

          const invalidPath =
            expectedPath.find(
              item =>
                !QUESTION_IMPORT_CONCEPTS.has(
                  item
                )
            );


          if (invalidPath) {

            errors.push(
              `Path memiliki konsep tidak valid: ${invalidPath}`
            );

          }


          if (
            expectedPath[0] !==
            originConcept
          ) {

            errors.push(
              "Path harus dimulai dari Konsep Asal"
            );

          }


          if (
            expectedPath[
              expectedPath.length - 1
            ] !==
            targetConcept
          ) {

            errors.push(
              "Path harus berakhir pada Konsep Tujuan"
            );

          }

        }


        if (
          formulaCodes.length === 0
        ) {

          errors.push(
            "Kode Rumus kosong"
          );

        }


        const invalidFormulaCodes =
          formulaCodes.filter(
            code =>
              !questionImportFormulaMap.has(
                code
              )
          );


        if (
          invalidFormulaCodes.length
        ) {

          errors.push(
            `Kode rumus tidak ditemukan/aktif: ${invalidFormulaCodes.join(", ")}`
          );

        }


        if (
          correctAnswer === null
        ) {

          errors.push(
            "Jawaban benar harus berupa angka"
          );

        }


        if (
          answerTolerance === null ||
          answerTolerance < 0
        ) {

          errors.push(
            "Toleransi tidak valid"
          );

        }


        if (!correctUnit) {

          errors.push(
            "Satuan kosong"
          );

        }


        if (
          numeracySkill &&
          !QUESTION_IMPORT_NUMERACY.has(
            numeracySkill
          )
        ) {

          errors.push(
            "Numeracy Skill tidak valid"
          );

        }


        if (
          active === null
        ) {

          errors.push(
            "Nilai Aktif harus TRUE/FALSE"
          );

        }


        if (
          questionType ===
            "FINAL_NEXUS" &&
          nexusZone !==
            "STOICHIOMETRY"
        ) {

          warnings.push(
            "Final Nexus biasanya memakai zona STOICHIOMETRY"
          );

        }


        return {

          rowNumber:
            index + 2,

          questionCode,
          nexusZone,
          difficulty,
          questionType,
          questionText,
          originConcept,
          targetConcept,
          expectedPath,
          formulaCodes,
          correctAnswer,
          answerTolerance,
          correctUnit,
          numeracySkill,
          active,

          errors,
          warnings,

          valid:
            errors.length === 0

        };

      }
    );


  renderQuestionImportPreview();

}


/* =========================================
   RENDER QUESTION IMPORT PREVIEW
========================================= */

function renderQuestionImportPreview() {

  const validRows =
    questionImportRows.filter(
      row =>
        row.valid
    );


  const invalidRows =
    questionImportRows.filter(
      row =>
        !row.valid
    );


  const warningRows =
    questionImportRows.filter(
      row =>
        row.valid &&
        row.warnings.length > 0
    );


  questionImportSummary.innerHTML = `

    <div class="question-import-summary-grid">

      <div>
        <strong>
          ${questionImportRows.length}
        </strong>
        <span>Total Baris</span>
      </div>

      <div>
        <strong>
          ✅ ${validRows.length}
        </strong>
        <span>Valid</span>
      </div>

      <div>
        <strong>
          ⚠️ ${warningRows.length}
        </strong>
        <span>Peringatan</span>
      </div>

      <div>
        <strong>
          ❌ ${invalidRows.length}
        </strong>
        <span>Tidak Valid</span>
      </div>

    </div>

  `;


  questionImportPreview.innerHTML =
    questionImportRows
      .map(
        row => {

          const status =
            row.valid
              ? (
                  row.warnings.length
                    ? "⚠️"
                    : "✅"
                )
              : "❌";


          const messages = [
            ...row.errors,
            ...row.warnings
          ];


          return `

            <article class="question-import-row">

              <div class="question-import-status">
                ${status}
              </div>

              <div class="question-import-row-content">

                <div class="question-import-row-head">

                  <strong>
                    ${escapeQuestionImportHtml(
                      row.questionCode ||
                      `Baris ${row.rowNumber}`
                    )}
                  </strong>

                  <span>
                    ${escapeQuestionImportHtml(
                      row.nexusZone ||
                      "-"
                    )}
                    •
                    ${escapeQuestionImportHtml(
                      row.difficulty ||
                      "-"
                    )}
                  </span>

                </div>


                <p>
                  ${escapeQuestionImportHtml(
                    row.questionText ||
                    "Teks soal kosong"
                  )}
                </p>


                <small>

                  Path:
                  ${escapeQuestionImportHtml(
                    row.expectedPath.join(
                      " → "
                    ) ||
                    "-"
                  )}

                  <br>

                  Rumus:
                  ${escapeQuestionImportHtml(
                    row.formulaCodes.join(
                      " → "
                    ) ||
                    "-"
                  )}

                </small>


                ${
                  messages.length
                    ? `
                      <div class="question-import-messages">
                        ${escapeQuestionImportHtml(
                          messages.join(
                            " • "
                          )
                        )}
                      </div>
                    `
                    : `
                      <div class="question-import-ready">
                        Data siap diimport.
                      </div>
                    `
                }

              </div>

            </article>

          `;

        }
      )
      .join("");


  confirmImportQuestions.hidden =
    validRows.length === 0;


  confirmImportQuestions.textContent =
    `Import ${validRows.length} Soal Valid`;

}


/* =========================================
   CONFIRM QUESTION BULK IMPORT
========================================= */

confirmImportQuestions
  ?.addEventListener(
    "click",
    async () => {

      const validRows =
        questionImportRows.filter(
          row =>
            row.valid
        );


      const invalidCount =
        questionImportRows.length -
        validRows.length;


      if (
        validRows.length === 0
      ) {

        alert(
          "Tidak ada soal valid untuk diimport."
        );

        return;
      }


      const confirmed =
        confirm(
          `Import ${validRows.length} soal valid ke MOL-NEXUS?` +
          (
            invalidCount
              ? `\n\n${invalidCount} baris tidak valid tidak akan diimport.`
              : ""
          )
        );


      if (!confirmed) {
        return;
      }


      const payload =
        validRows.map(
          row => ({

            question_code:
              row.questionCode,

            nexus_zone:
              row.nexusZone,

            difficulty:
              row.difficulty,

            question_type:
              row.questionType,

            question_text:
              row.questionText,

            origin_concept:
              row.originConcept,

            target_concept:
              row.targetConcept,

            expected_path:
              row.expectedPath,

            formula_codes:
              row.formulaCodes,

            correct_answer:
              row.correctAnswer,

            answer_tolerance:
              row.answerTolerance,

            correct_unit:
              row.correctUnit,

            numeracy_skill:
              row.numeracySkill ||
              null,

            active:
              row.active

          })
        );


      confirmImportQuestions.disabled =
        true;


      confirmImportQuestions.textContent =
        "Mengimport soal...";


      try {

        const {
          data,
          error
        } =
          await supabaseClient.rpc(
            "import_questions_bulk",
            {
              p_rows:
                payload
            }
          );


        if (error) {
          throw error;
        }


        const result =
          Array.isArray(data)
            ? data[0]
            : data;


        const imported =
          result?.imported_questions ??
          validRows.length;


        closeQuestionImportEditor();


        questionExcelInput.value =
          "";


        questionImportRows =
          [];


        await loadQuestions();


        alert(
          `Import soal berhasil!\n\nSoal masuk: ${imported}`
        );


      } catch (error) {

        console.error(
          "Gagal import soal:",
          error
        );


        alert(
          error?.message ||
          "Import soal gagal."
        );


      } finally {

        confirmImportQuestions.disabled =
          false;


        confirmImportQuestions.textContent =
          "Import Soal Valid";

      }

    }
  );
