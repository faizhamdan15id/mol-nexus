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

    </article>
  `).join("");
}


async function initFormulaBank() {

  const authenticated = await requireTeacherAuth();

  if (!authenticated) return;

  await loadFormulas();
}


initFormulaBank();
