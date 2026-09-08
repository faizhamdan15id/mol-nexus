"use strict";

/* =========================================
   MOL-NEXUS
   FORMULA BANK MANAGEMENT
========================================= */

const SUPABASE_URL = "https://snlpdwqdjfnborsorspd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const formulaList = document.getElementById("formulaList");


async function requireTeacherAuth() {
  const { data: { session }, error } =
    await supabaseClient.auth.getSession();

  if (error || !session) {
    window.location.replace("teacher-login.html");
    return false;
  }

  return true;
}


async function loadFormulas() {

  formulaList.innerHTML =
    `<p class="state-message">Memuat Bank Rumus...</p>`;

  const { data, error } = await supabaseClient
    .from("formula_bank")
    .select(`
      id,
      formula_code,
      formula_label,
      origin_concept,
      target_concept,
      description,
      is_active
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);

    formulaList.innerHTML =
      `<p class="state-message error-message">
        Gagal memuat Bank Rumus.
      </p>`;

    return;
  }

  if (!data || data.length === 0) {
    formulaList.innerHTML =
      `<p class="state-message">
        Belum ada rumus.
      </p>`;

    return;
  }

  formulaList.innerHTML = data.map(formula => `
    <article class="summary-card" style="margin-bottom:16px">

      <span>
        ${formula.origin_concept}
        →
        ${formula.target_concept}
      </span>

      <strong>
        ${formula.formula_label}
      </strong>

      <p>
        ${formula.description || "-"}
      </p>

      <small>
        ${formula.formula_code}
        •
        ${formula.is_active ? "AKTIF" : "NONAKTIF"}
      </small>
<button
  type="button"
  class="edit-formula-button"
  data-id="${formula.id}"
>
  ✏️ Edit
</button>
    </article>
  `).join("");
}


async function initFormulaBank() {

  const authenticated = await requireTeacherAuth();

  if (!authenticated) return;

  await loadFormulas();
}


initFormulaBank();
/* =========================================
   FORMULA MODAL
========================================= */

const addFormulaButton =
  document.getElementById("addFormulaButton");

const formulaModal =
  document.getElementById("formulaModal");

const closeFormulaModal =
  document.getElementById("closeFormulaModal");

const formulaForm =
  document.getElementById("formulaForm");


function openAddFormulaModal() {

  formulaForm.reset();

  document.getElementById("formulaId").value = "";
  document.getElementById("formulaActive").checked = true;

  document.getElementById("formulaModalTitle").textContent =
    "Tambah Rumus";

  formulaModal.hidden = false;
}


function closeFormulaEditor() {
  formulaModal.hidden = true;
}


addFormulaButton.addEventListener(
  "click",
  openAddFormulaModal
);


closeFormulaModal.addEventListener(
  "click",
  closeFormulaEditor
);


formulaModal.addEventListener("click", (event) => {

  if (event.target === formulaModal) {
    closeFormulaEditor();
  }

});
formulaForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formulaCode =
    document.getElementById("formulaCode").value.trim().toUpperCase();

  const formulaLabel =
    document.getElementById("formulaLabel").value.trim();

  const originConcept =
    document.getElementById("originConcept").value.trim().toUpperCase();

  const targetConcept =
    document.getElementById("targetConcept").value.trim().toUpperCase();

  const description =
    document.getElementById("formulaDescription").value.trim();

  const isActive =
    document.getElementById("formulaActive").checked;

  const saveButton =
    formulaForm.querySelector(".formula-save-button");

  saveButton.disabled = true;
  saveButton.textContent = "Menyimpan...";

  try {

  const formulaId =
  document.getElementById("formulaId").value;

let result;

if (formulaId) {

  // EDIT / UPDATE
  result = await supabaseClient
    .from("formula_bank")
    .update({
      formula_code: formulaCode,
      formula_label: formulaLabel,
      origin_concept: originConcept,
      target_concept: targetConcept,
      description: description || null,
      is_active: isActive
    })
    .eq("id", formulaId);

} else {

  // TAMBAH / INSERT
  result = await supabaseClient
    .from("formula_bank")
    .insert({
      formula_code: formulaCode,
      formula_label: formulaLabel,
      origin_concept: originConcept,
      target_concept: targetConcept,
      description: description || null,
      is_active: isActive
    });

}

if (result.error) throw result.error;  

    closeFormulaEditor();

    await loadFormulas();

    alert("Rumus berhasil ditambahkan.");

  } catch (error) {

    console.error("Gagal menyimpan rumus:", error);

    alert(
      error?.message ||
      "Rumus gagal disimpan."
    );

  } finally {

    saveButton.disabled = false;
    saveButton.textContent = "Simpan Rumus";

  }
});
/* =========================================
   EDIT FORMULA
========================================= */

formulaList.addEventListener("click", async (event) => {

  const editButton =
    event.target.closest(".edit-formula-button");

  if (!editButton) return;

  const formulaId = editButton.dataset.id;

  const { data, error } = await supabaseClient
    .from("formula_bank")
    .select(`
      id,
      formula_code,
      formula_label,
      origin_concept,
      target_concept,
      description,
      is_active
    `)
    .eq("id", formulaId)
    .single();

  if (error) {
    console.error("Gagal mengambil rumus:", error);
    alert("Data rumus gagal dimuat.");
    return;
  }

  document.getElementById("formulaId").value =
    data.id;

  document.getElementById("formulaCode").value =
    data.formula_code;

  document.getElementById("formulaLabel").value =
    data.formula_label;

  document.getElementById("originConcept").value =
    data.origin_concept;

  document.getElementById("targetConcept").value =
    data.target_concept;

  document.getElementById("formulaDescription").value =
    data.description || "";

  document.getElementById("formulaActive").checked =
    data.is_active;

  document.getElementById("formulaModalTitle").textContent =
    "Edit Rumus";

  formulaModal.hidden = false;
});
