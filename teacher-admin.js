"use strict";

const SUPABASE_URL =
  "https://snlpdwqdjfnborsorspd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


const totalTeachers =
  document.getElementById(
    "totalTeachers"
  );

const activeTeachers =
  document.getElementById(
    "activeTeachers"
  );

const inactiveTeachers =
  document.getElementById(
    "inactiveTeachers"
  );

const superAdminCount =
  document.getElementById(
    "superAdminCount"
  );

const teacherAdminState =
  document.getElementById(
    "teacherAdminState"
  );

const teacherAdminList =
  document.getElementById(
    "teacherAdminList"
  );

const refreshTeachersButton =
  document.getElementById(
    "refreshTeachersButton"
  );

const addTeacherButton =
  document.getElementById(
    "addTeacherButton"
  );

const teacherAdminModal =
  document.getElementById(
    "teacherAdminModal"
  );

const closeTeacherAdminModal =
  document.getElementById(
    "closeTeacherAdminModal"
  );

const teacherAdminForm =
  document.getElementById(
    "teacherAdminForm"
  );

const teacherCodeInput =
  document.getElementById(
    "teacherCodeInput"
  );

const teacherNameInput =
  document.getElementById(
    "teacherNameInput"
  );

const teacherEmailInput =
  document.getElementById(
    "teacherEmailInput"
  );

const teacherPasswordInput =
  document.getElementById(
    "teacherPasswordInput"
  );

const saveTeacherButton =
  document.getElementById(
    "saveTeacherButton"
  );

const passwordResetModal =
  document.getElementById(
    "passwordResetModal"
  );

const closePasswordResetModal =
  document.getElementById(
    "closePasswordResetModal"
  );

const passwordResetForm =
  document.getElementById(
    "passwordResetForm"
  );

const passwordResetTeacherId =
  document.getElementById(
    "passwordResetTeacherId"
  );

const passwordResetTitle =
  document.getElementById(
    "passwordResetTitle"
  );

const newTeacherPasswordInput =
  document.getElementById(
    "newTeacherPasswordInput"
  );

const confirmPasswordResetButton =
  document.getElementById(
    "confirmPasswordResetButton"
  );


let teacherRows = [];


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function safeErrorMessage(error) {

  const text =
    String(
      error?.message ||
      error?.context?.body ||
      ""
    );


  if (
    text.includes(
      "SUPER_ADMIN_REQUIRED"
    )
  ) {
    return "Akses Super Admin diperlukan.";
  }


  if (
    text.includes(
      "PASSWORD_TOO_SHORT"
    )
  ) {
    return "Password minimal 8 karakter.";
  }


  if (
    text.includes(
      "AUTH_USER_CREATE_FAILED"
    )
  ) {
    return "Akun Auth gagal dibuat. Pastikan email belum digunakan.";
  }


  if (
    text.includes(
      "TEACHER_RECORD_CREATE_FAILED"
    )
  ) {
    return "Data guru gagal dibuat. Periksa kode guru atau email yang mungkin sudah digunakan.";
  }


  if (
    text.includes(
      "SUPER_ADMIN_ACCOUNT_PROTECTED"
    )
  ) {
    return "Akun Super Admin dilindungi.";
  }


  return (
    error?.message ||
    "Terjadi kesalahan pada pengelolaan akun guru."
  );
}


async function requireSuperAdmin() {

  try {

    const {
      data: {
        session
      },
      error
    } =
      await supabaseClient
        .auth
        .getSession();


    if (
      error ||
      !session
    ) {

      window.location.replace(
        "teacher-login.html"
      );

      return false;
    }


    const {
      data,
      error: roleError
    } =
      await supabaseClient.rpc(
        "is_mol_nexus_super_admin"
      );


    if (
      roleError ||
      data !== true
    ) {

      window.location.replace(
        "dashboard.html"
      );

      return false;
    }


    return true;


  } catch (error) {

    console.error(
      "Super Admin guard failed:",
      error
    );


    window.location.replace(
      "teacher-login.html"
    );


    return false;
  }
}


async function invokeTeacherAdmin(
  body
) {

  const {
    data,
    error
  } =
    await supabaseClient
      .functions
      .invoke(
        "teacher-admin",
        {
          body
        }
      );


  if (error) {

    let detail = null;


    try {

      if (
        error.context &&
        typeof error.context.json ===
          "function"
      ) {

        detail =
          await error.context.json();
      }

    } catch {
      detail = null;
    }


    const failure =
      new Error(
        detail?.error ||
        error.message ||
        "EDGE_FUNCTION_ERROR"
      );


    failure.payload =
      detail;


    throw failure;
  }


  if (data?.error) {

    const failure =
      new Error(
        data.error
      );

    failure.payload =
      data;

    throw failure;
  }


  return data;
}


function nextTeacherCode() {

  const max =
    teacherRows
      .map(
        teacher => {

          const match =
            String(
              teacher.teacher_code ||
              ""
            )
              .match(
                /^TCH-(\d+)$/i
              );


          return match
            ? Number(
                match[1]
              )
            : 0;
        }
      )
      .reduce(
        (current, value) =>
          Math.max(
            current,
            value
          ),
        0
      );


  return (
    "TCH-" +
    String(
      max + 1
    )
      .padStart(
        3,
        "0"
      )
  );
}


function renderTeacherSummary() {

  totalTeachers.textContent =
    String(
      teacherRows.length
    );


  activeTeachers.textContent =
    String(
      teacherRows.filter(
        teacher =>
          teacher.is_active === true
      ).length
    );


  inactiveTeachers.textContent =
    String(
      teacherRows.filter(
        teacher =>
          teacher.is_active !== true
      ).length
    );


  superAdminCount.textContent =
    String(
      teacherRows.filter(
        teacher =>
          teacher.role ===
          "SUPER_ADMIN"
      ).length
    );
}


function renderTeacherList() {

  if (
    teacherRows.length === 0
  ) {

    teacherAdminState.hidden =
      false;

    teacherAdminState.textContent =
      "Belum ada akun guru.";

    teacherAdminList.innerHTML =
      "";

    return;
  }


  teacherAdminState.hidden =
    true;


  teacherAdminList.innerHTML =
    teacherRows
      .map(
        teacher => {

          const isSuper =
            teacher.role ===
            "SUPER_ADMIN";


          const statusClass =
            teacher.is_active
              ? "active"
              : "inactive";


          const statusLabel =
            teacher.is_active
              ? "AKTIF"
              : "NONAKTIF";


          const roleLabel =
            isSuper
              ? "SUPER ADMIN"
              : "TEACHER";


          return `

            <article
              class="teacher-admin-card"
              data-teacher-id="${escapeHtml(
                teacher.teacher_id
              )}"
            >

              <div class="teacher-admin-head">

                <div>

                  <span class="teacher-code">
                    ${escapeHtml(
                      teacher.teacher_code ||
                      "-"
                    )}
                  </span>

                  <h3>
                    ${escapeHtml(
                      teacher.display_name
                    )}
                  </h3>

                </div>


                <span
                  class="teacher-badge ${isSuper ? "super" : ""}"
                >
                  ${roleLabel}
                </span>

              </div>


              <p class="teacher-admin-email">
                ${escapeHtml(
                  teacher.email ||
                  "Email belum tersimpan"
                )}
              </p>


              <div class="teacher-admin-meta">

                <span
                  class="teacher-badge ${statusClass}"
                >
                  ${statusLabel}
                </span>

              </div>


              <div class="teacher-admin-actions">

                <button
                  type="button"
                  data-action="reset-password"
                  data-teacher-id="${escapeHtml(
                    teacher.teacher_id
                  )}"
                  data-teacher-name="${escapeHtml(
                    teacher.display_name
                  )}"
                  ${isSuper ? "disabled" : ""}
                >
                  🔑 Reset Password
                </button>


                <button
                  type="button"
                  class="${teacher.is_active ? "danger" : ""}"
                  data-action="toggle-active"
                  data-teacher-id="${escapeHtml(
                    teacher.teacher_id
                  )}"
                  data-active="${teacher.is_active ? "true" : "false"}"
                  ${isSuper ? "disabled" : ""}
                >
                  ${
                    teacher.is_active
                      ? "⛔ Nonaktifkan"
                      : "✓ Aktifkan"
                  }
                </button>

              </div>

            </article>

          `;

        }
      )
      .join("");
}


async function loadTeachers() {

  teacherAdminState.hidden =
    false;

  teacherAdminState.textContent =
    "Memuat akun guru...";


  teacherAdminList.innerHTML =
    "";


  try {

    const data =
      await invokeTeacherAdmin({
        action:
          "list"
      });


    teacherRows =
      Array.isArray(
        data?.teachers
      )
        ? data.teachers
        : [];


    renderTeacherSummary();

    renderTeacherList();


  } catch (error) {

    console.error(
      "Teacher list failed:",
      error
    );


    teacherAdminState.hidden =
      false;

    teacherAdminState.textContent =
      safeErrorMessage(
        error
      );
  }
}


function closeCreateTeacherModal() {

  teacherAdminModal.hidden =
    true;
}


function closeResetPasswordModal() {

  passwordResetModal.hidden =
    true;
}


addTeacherButton.addEventListener(
  "click",
  () => {

    teacherAdminForm.reset();

    teacherCodeInput.value =
      nextTeacherCode();

    teacherAdminModal.hidden =
      false;

    teacherNameInput.focus();
  }
);


closeTeacherAdminModal.addEventListener(
  "click",
  closeCreateTeacherModal
);


teacherAdminModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      teacherAdminModal
    ) {

      closeCreateTeacherModal();
    }
  }
);


closePasswordResetModal.addEventListener(
  "click",
  closeResetPasswordModal
);


passwordResetModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      passwordResetModal
    ) {

      closeResetPasswordModal();
    }
  }
);


refreshTeachersButton.addEventListener(
  "click",
  loadTeachers
);


teacherAdminForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const teacherCode =
      teacherCodeInput
        .value
        .trim()
        .toUpperCase();


    const displayName =
      teacherNameInput
        .value
        .trim();


    const email =
      teacherEmailInput
        .value
        .trim()
        .toLowerCase();


    const password =
      teacherPasswordInput
        .value;


    if (
      password.length < 8
    ) {

      alert(
        "Password awal minimal 8 karakter."
      );

      return;
    }


    saveTeacherButton.disabled =
      true;

    saveTeacherButton.textContent =
      "Membuat akun...";


    try {

      await invokeTeacherAdmin({

        action:
          "create",

        teacher_code:
          teacherCode,

        display_name:
          displayName,

        email,

        password

      });


      closeCreateTeacherModal();

      await loadTeachers();


      alert(
        `Akun guru ${displayName} berhasil dibuat.\n\nKode: ${teacherCode}\nEmail: ${email}`
      );


    } catch (error) {

      console.error(
        "Create teacher failed:",
        error
      );


      alert(
        safeErrorMessage(
          error
        )
      );


    } finally {

      saveTeacherButton.disabled =
        false;

      saveTeacherButton.textContent =
        "Buat Akun Guru";
    }
  }
);


teacherAdminList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "button[data-action]"
      );


    if (
      !button ||
      button.disabled
    ) {

      return;
    }


    const teacherId =
      button.dataset.teacherId;


    const action =
      button.dataset.action;


    if (
      action ===
      "reset-password"
    ) {

      passwordResetForm.reset();

      passwordResetTeacherId.value =
        teacherId;

      passwordResetTitle.textContent =
        "Reset Password • " +
        (
          button.dataset.teacherName ||
          "Guru"
        );

      passwordResetModal.hidden =
        false;

      newTeacherPasswordInput.focus();

      return;
    }


    if (
      action ===
      "toggle-active"
    ) {

      const currentlyActive =
        button.dataset.active ===
        "true";


      const nextActive =
        !currentlyActive;


      const confirmed =
        confirm(
          nextActive
            ? "Aktifkan kembali akun guru ini?"
            : "Nonaktifkan akun guru ini? Guru tidak akan dapat mengakses MOL-NEXUS."
        );


      if (!confirmed) {
        return;
      }


      button.disabled =
        true;


      try {

        await invokeTeacherAdmin({

          action:
            "toggle_active",

          teacher_id:
            teacherId,

          is_active:
            nextActive

        });


        await loadTeachers();


      } catch (error) {

        console.error(
          "Teacher status update failed:",
          error
        );


        alert(
          safeErrorMessage(
            error
          )
        );


        button.disabled =
          false;
      }
    }
  }
);


passwordResetForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const teacherId =
      passwordResetTeacherId.value;


    const newPassword =
      newTeacherPasswordInput.value;


    if (
      newPassword.length < 8
    ) {

      alert(
        "Password baru minimal 8 karakter."
      );

      return;
    }


    confirmPasswordResetButton.disabled =
      true;

    confirmPasswordResetButton.textContent =
      "Menyimpan...";


    try {

      await invokeTeacherAdmin({

        action:
          "reset_password",

        teacher_id:
          teacherId,

        new_password:
          newPassword

      });


      closeResetPasswordModal();


      alert(
        "Password guru berhasil diperbarui."
      );


    } catch (error) {

      console.error(
        "Teacher password reset failed:",
        error
      );


      alert(
        safeErrorMessage(
          error
        )
      );


    } finally {

      confirmPasswordResetButton.disabled =
        false;

      confirmPasswordResetButton.textContent =
        "Simpan Password Baru";
    }
  }
);


async function initTeacherAdmin() {

  const allowed =
    await requireSuperAdmin();


  if (!allowed) {
    return;
  }


  await loadTeachers();
}


initTeacherAdmin();
