"use strict";

/* =========================================
   MOL-NEXUS
   STUDENT MANAGEMENT
========================================= */

const SUPABASE_URL =
  "https://snlpdwqdjfnborsorspd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";


const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================
   DOM
========================================= */

const studentCountEl =
  document.getElementById("studentCount");

const classCountEl =
  document.getElementById("classCount");

const nisnCountEl =
  document.getElementById("nisnCount");

const unassignedCountEl =
  document.getElementById("unassignedCount");

const studentList =
  document.getElementById("studentList");

const studentSearch =
  document.getElementById("studentSearch");

const classFilter =
  document.getElementById("classFilter");


/* STUDENT EDITOR */

const addStudentButton =
  document.getElementById("addStudentButton");

const studentModal =
  document.getElementById("studentModal");

const closeStudentModal =
  document.getElementById("closeStudentModal");

const studentForm =
  document.getElementById("studentForm");

const studentClassInput =
  document.getElementById("studentClassInput");


/* IMPORT */

const importStudentsButton =
  document.getElementById("importStudentsButton");

const studentExcelInput =
  document.getElementById("studentExcelInput");

const importStudentModal =
  document.getElementById("importStudentModal");

const closeImportStudentModal =
  document.getElementById("closeImportStudentModal");

const importSummary =
  document.getElementById("importSummary");

const importPreview =
  document.getElementById("importPreview");

const confirmImportStudents =
  document.getElementById("confirmImportStudents");

const downloadTemplateButton =
  document.getElementById("downloadTemplateButton");


/* =========================================
   LOCAL DATA
========================================= */

let studentsData = [];
let classesData = [];
let importStudentRows = [];


/* =========================================
   TEACHER AUTH
========================================= */

async function requireTeacherAuth() {

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();


  if (error || !session) {

    window.location.replace(
      "teacher-login.html"
    );

    return false;
  }


  return true;
}


/* =========================================
   HELPERS
========================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function maskNisn(nisn) {

  if (!nisn) return "-";

  const value = String(nisn);

  if (value.length <= 4) {
    return "****";
  }

  return (
    value.slice(0, 4) +
    "******"
  );
}


function getClassName(classId) {

  if (!classId) {
    return "Belum memiliki kelas";
  }


  const classData =
    classesData.find(
      item =>
        item.class_id === classId
    );


  if (!classData) {
    return "Kelas tidak ditemukan";
  }


  return classData.academic_year

    ? `${classData.class_name} • ${classData.academic_year}`

    : classData.class_name;
}


function normalizeImportText(value) {

  return String(
    value ?? ""
  ).trim();
}


/* =========================================
   LOAD CLASSES
========================================= */

async function loadClasses() {

  const {
    data,
    error
  } = await supabaseClient

    .from("classes")

    .select(`
      class_id,
      class_name,
      academic_year
    `)

    .order(
      "class_name",
      { ascending: true }
    );


  if (error) {
    throw error;
  }


  classesData =
    data || [];


  classCountEl.textContent =
    classesData.length;


  classFilter.innerHTML = `

    <option value="">
      Semua Kelas
    </option>

    ${classesData.map(item => `

      <option value="${escapeHtml(item.class_id)}">

        ${escapeHtml(item.class_name)}

        ${
          item.academic_year
            ? `• ${escapeHtml(item.academic_year)}`
            : ""
        }

      </option>

    `).join("")}

  `;
}


/* =========================================
   LOAD STUDENTS
========================================= */

async function loadStudents() {

  const {
    data,
    error
  } = await supabaseClient

    .from("students")

    .select(`
      student_id,
      student_code,
      display_name,
      class_id,
      username,
      nisn,
      created_at
    `)

    .order(
      "display_name",
      { ascending: true }
    );


  if (error) {
    throw error;
  }


  studentsData =
    data || [];


  studentCountEl.textContent =
    studentsData.length;


  nisnCountEl.textContent =
    studentsData.filter(
      student => student.nisn
    ).length;


  unassignedCountEl.textContent =
    studentsData.filter(
      student => !student.class_id
    ).length;


  renderStudents();
}


/* =========================================
   RENDER STUDENTS
========================================= */

function renderStudents() {

  const keyword =
    studentSearch.value
      .trim()
      .toLowerCase();


  const selectedClass =
    classFilter.value;


  const filteredStudents =
    studentsData.filter(student => {

      const displayName =
        String(
          student.display_name || ""
        ).toLowerCase();


      const studentCode =
        String(
          student.student_code || ""
        ).toLowerCase();


      const nisn =
        String(
          student.nisn || ""
        );


      const matchesSearch =
        !keyword ||
        displayName.includes(keyword) ||
        studentCode.includes(keyword) ||
        nisn.includes(keyword);


      const matchesClass =
        !selectedClass ||
        student.class_id === selectedClass;


      return (
        matchesSearch &&
        matchesClass
      );

    });


  if (
    filteredStudents.length === 0
  ) {

    studentList.innerHTML = `

      <p class="state-message">
        Tidak ada siswa ditemukan.
      </p>

    `;

    return;
  }


  studentList.innerHTML =

    filteredStudents
      .map(student => `

        <article class="student-management-card">

          <div>

            <span class="student-code">

              ${escapeHtml(
                student.student_code
              )}

            </span>


            <h3>

              ${escapeHtml(
                student.display_name
              )}

            </h3>


            <p>

              👥 ${escapeHtml(
                getClassName(
                  student.class_id
                )
              )}

            </p>


            <p>

              NISN:
              ${escapeHtml(
                maskNisn(
                  student.nisn
                )
              )}

            </p>

          </div>


          <button
            type="button"
            class="edit-student-button"
            data-id="${escapeHtml(student.student_id)}"
          >
            ✏️ Edit
          </button>


          <button
            type="button"
            class="delete-student-button"
            data-id="${escapeHtml(student.student_id)}"
            data-name="${escapeHtml(student.display_name)}"
          >
            🗑 Hapus
          </button>

        </article>

      `)
      .join("");
}


/* =========================================
   SEARCH / FILTER
========================================= */

studentSearch.addEventListener(
  "input",
  renderStudents
);


classFilter.addEventListener(
  "change",
  renderStudents
);


/* =========================================
   STUDENT CLASS OPTIONS
========================================= */

function populateStudentClassOptions() {

  studentClassInput.innerHTML = `

    <option value="">
      Belum memilih kelas
    </option>

    ${classesData.map(item => `

      <option value="${escapeHtml(item.class_id)}">

        ${escapeHtml(item.class_name)}

        ${
          item.academic_year
            ? `• ${escapeHtml(item.academic_year)}`
            : ""
        }

      </option>

    `).join("")}

  `;
}


/* =========================================
   ADD STUDENT MODAL
========================================= */

function openAddStudentModal() {

  studentForm.reset();


  document
    .getElementById("studentId")
    .value = "";


  document
    .getElementById(
      "studentModalTitle"
    )
    .textContent =
      "Tambah Siswa";


  populateStudentClassOptions();


  studentModal.hidden = false;
}


function closeStudentEditor() {

  studentModal.hidden = true;

}


addStudentButton.addEventListener(
  "click",
  openAddStudentModal
);


closeStudentModal.addEventListener(
  "click",
  closeStudentEditor
);


studentModal.addEventListener(
  "click",
  event => {

    if (
      event.target === studentModal
    ) {

      closeStudentEditor();

    }

  }
);


/* =========================================
   EDIT STUDENT
========================================= */

studentList.addEventListener(
  "click",
  event => {

    const editButton =
      event.target.closest(
        ".edit-student-button"
      );


    if (!editButton) {
      return;
    }


    const studentId =
      editButton.dataset.id;


    const student =
      studentsData.find(
        item =>
          item.student_id === studentId
      );


    if (!student) {

      alert(
        "Data siswa tidak ditemukan."
      );

      return;
    }


    populateStudentClassOptions();


    document
      .getElementById("studentId")
      .value =
        student.student_id;


    document
      .getElementById(
        "studentCodeInput"
      )
      .value =
        student.student_code || "";


    document
      .getElementById(
        "studentNameInput"
      )
      .value =
        student.display_name || "";


    document
      .getElementById(
        "studentNisnInput"
      )
      .value =
        student.nisn || "";


    document
      .getElementById(
        "studentClassInput"
      )
      .value =
        student.class_id || "";


    document
      .getElementById(
        "studentModalTitle"
      )
      .textContent =
        "Edit Siswa";


    studentModal.hidden = false;

  }
);


/* =========================================
   DELETE BUTTON
   BELUM MENGHAPUS DATA
========================================= */

studentList.addEventListener(
  "click",
  event => {

    const deleteButton =
      event.target.closest(
        ".delete-student-button"
      );


    if (!deleteButton) {
      return;
    }


    const studentName =
      deleteButton.dataset.name;


    alert(
      `Fitur hapus untuk ${studentName} akan diaktifkan setelah pengecekan relasi data penelitian siswa.`
    );

  }
);


/* =========================================
   SAVE / UPDATE STUDENT
========================================= */

studentForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const studentId =
      document
        .getElementById("studentId")
        .value || null;


    const studentCode =
      document
        .getElementById(
          "studentCodeInput"
        )
        .value
        .trim()
        .toUpperCase();


    const displayName =
      document
        .getElementById(
          "studentNameInput"
        )
        .value
        .trim();


    const nisn =
      document
        .getElementById(
          "studentNisnInput"
        )
        .value
        .trim();


    const classId =
      document
        .getElementById(
          "studentClassInput"
        )
        .value || null;


    if (
      !/^\d{10}$/.test(nisn)
    ) {

      alert(
        "NISN harus tepat 10 digit angka."
      );

      return;
    }


    const saveButton =
      studentForm.querySelector(
        ".formula-save-button"
      );


    saveButton.disabled = true;

    saveButton.textContent =
      "Menyimpan...";


    try {

      const {
        error
      } = await supabaseClient.rpc(
        "save_student_admin",
        {
          p_student_id:
            studentId,

          p_student_code:
            studentCode,

          p_display_name:
            displayName,

          p_nisn:
            nisn,

          p_class_id:
            classId
        }
      );


      if (error) {
        throw error;
      }


      closeStudentEditor();


      await loadStudents();


      alert(

        studentId

          ? "Data siswa berhasil diperbarui."

          : "Siswa berhasil ditambahkan."

      );


    } catch (error) {

      console.error(
        "Gagal menyimpan siswa:",
        error
      );


      let message =
        error?.message ||
        "Data siswa gagal disimpan.";


      if (
        message.includes(
          "students_student_code_key"
        )
      ) {

        message =
          "Kode siswa sudah digunakan.";

      }


      if (
        message.includes(
          "students_nisn_unique"
        )
      ) {

        message =
          "NISN sudah terdaftar.";

      }


      alert(message);


    } finally {

      saveButton.disabled = false;

      saveButton.textContent =
        "Simpan Siswa";

    }

  }
);


/* =========================================
   DOWNLOAD EXCEL TEMPLATE
========================================= */

downloadTemplateButton.addEventListener(
  "click",
  () => {

    const templateData = [

      [
        "Kode Siswa",
        "Nama Siswa",
        "NISN",
        "Kelas",
        "Tahun Ajaran"
      ],

      [
        "XIIIPA-001",
        "Ahmad Fauzan",
        "1234567890",
        "XII IPA 1",
        "2026/2027"
      ]

    ];


    const worksheet =
      XLSX.utils.aoa_to_sheet(
        templateData
      );


    worksheet["!cols"] = [

      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 }

    ];


    const instructionData = [

      [
        "PETUNJUK IMPORT SISWA MOL-NEXUS"
      ],

      [""],

      [
        "1.",
        "Jangan mengubah nama kolom pada template."
      ],

      [
        "2.",
        "Kode Siswa wajib unik."
      ],

      [
        "3.",
        "NISN diisi 10 digit dan tidak boleh sama dengan siswa lain."
      ],

      [
        "4.",
        "Nama kelas harus ditulis konsisten, contoh: XII IPA 1."
      ],

      [
        "5.",
        "Tahun ajaran ditulis seperti: 2026/2027."
      ],

      [
        "6.",
        "Hapus baris contoh sebelum mengimpor data sebenarnya."
      ]

    ];


    const instructionSheet =
      XLSX.utils.aoa_to_sheet(
        instructionData
      );


    instructionSheet["!cols"] = [

      { wch: 8 },
      { wch: 70 }

    ];


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "DATA SISWA"
    );


    XLSX.utils.book_append_sheet(
      workbook,
      instructionSheet,
      "PETUNJUK"
    );


    XLSX.writeFile(
      workbook,
      "Template_Import_Siswa_MOL-NEXUS.xlsx"
    );

  }
);


/* =========================================
   IMPORT EXCEL - OPEN / CLOSE
========================================= */

importStudentsButton.addEventListener(
  "click",
  () => {

    studentExcelInput.value = "";

    studentExcelInput.click();

  }
);


function closeStudentImportModal() {

  importStudentModal.hidden = true;

}


closeImportStudentModal.addEventListener(
  "click",
  closeStudentImportModal
);


importStudentModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      importStudentModal
    ) {

      closeStudentImportModal();

    }

  }
);


/* =========================================
   READ EXCEL
========================================= */

studentExcelInput.addEventListener(
  "change",
  async event => {

    const file =
      event.target.files?.[0];


    if (!file) return;


    try {

      const buffer =
        await file.arrayBuffer();


      const workbook =
        XLSX.read(
          buffer,
          {
            type: "array"
          }
        );


      const sheetName =
        workbook.SheetNames.includes(
          "DATA SISWA"
        )

          ? "DATA SISWA"

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
          "File Excel tidak memiliki data siswa."
        );

        return;
      }


      validateImportedStudents(
        excelRows
      );


      importStudentModal.hidden =
        false;


    } catch (error) {

      console.error(
        "Gagal membaca Excel:",
        error
      );


      alert(
        "File Excel gagal dibaca."
      );

    }

  }
);


/* =========================================
   VALIDATE IMPORT
========================================= */

function validateImportedStudents(rows) {

  const existingCodes =
    new Set(

      studentsData.map(student =>

        String(
          student.student_code
        )
          .trim()
          .toUpperCase()

      )

    );


  const existingNisn =
    new Set(

      studentsData

        .filter(
          student =>
            student.nisn
        )

        .map(student =>
          String(
            student.nisn
          ).trim()
        )

    );


  const fileCodes =
    new Set();

  const fileNisn =
    new Set();


  importStudentRows =
    rows.map(
      (row, index) => {

        const studentCode =
          normalizeImportText(
            row["Kode Siswa"]
          ).toUpperCase();


        const displayName =
          normalizeImportText(
            row["Nama Siswa"]
          );


        const nisn =
          normalizeImportText(
            row["NISN"]
          );


        const className =
          normalizeImportText(
            row["Kelas"]
          );


        const academicYear =
          normalizeImportText(
            row["Tahun Ajaran"]
          );


        const errors = [];
        const warnings = [];


        if (!studentCode) {

          errors.push(
            "Kode siswa kosong"
          );

        }


        if (!displayName) {

          errors.push(
            "Nama siswa kosong"
          );

        }


        if (!nisn) {

          errors.push(
            "NISN kosong"
          );

        } else if (
          !/^\d{10}$/.test(nisn)
        ) {

          errors.push(
            "NISN harus tepat 10 digit"
          );

        }


        if (!className) {

          errors.push(
            "Kelas kosong"
          );

        }


        if (!academicYear) {

          errors.push(
            "Tahun ajaran kosong"
          );

        }


        if (
          studentCode &&
          existingCodes.has(
            studentCode
          )
        ) {

          errors.push(
            "Kode siswa sudah terdaftar"
          );

        }


        if (
          nisn &&
          existingNisn.has(nisn)
        ) {

          errors.push(
            "NISN sudah terdaftar"
          );

        }


        if (studentCode) {

          if (
            fileCodes.has(
              studentCode
            )
          ) {

            errors.push(
              "Kode siswa duplikat di Excel"
            );

          } else {

            fileCodes.add(
              studentCode
            );

          }

        }


        if (nisn) {

          if (
            fileNisn.has(nisn)
          ) {

            errors.push(
              "NISN duplikat di Excel"
            );

          } else {

            fileNisn.add(nisn);

          }

        }


        const matchingClass =
          classesData.find(
            item =>

              String(
                item.class_name
              )
                .trim()
                .toLowerCase() ===
              className.toLowerCase()

              &&

              String(
                item.academic_year || ""
              )
                .trim()
                .toLowerCase() ===
              academicYear.toLowerCase()
          );


        if (
          className &&
          academicYear &&
          !matchingClass
        ) {

          warnings.push(
            "Kelas baru — akan dibuat saat import"
          );

        }


        return {

          rowNumber:
            index + 2,

          studentCode,
          displayName,
          nisn,
          className,
          academicYear,

          existingClassId:
            matchingClass?.class_id ||
            null,

          errors,
          warnings,

          valid:
            errors.length === 0

        };

      }
    );


  renderImportPreview();
}


/* =========================================
   RENDER IMPORT PREVIEW
========================================= */

function renderImportPreview() {

  const validRows =
    importStudentRows.filter(
      row => row.valid
    );


  const invalidRows =
    importStudentRows.filter(
      row => !row.valid
    );


  const warningRows =
    importStudentRows.filter(
      row =>
        row.valid &&
        row.warnings.length > 0
    );


  importSummary.innerHTML = `

    <div class="import-summary-grid">

      <div>

        <strong>
          ${importStudentRows.length}
        </strong>

        <span>
          Total Data
        </span>

      </div>


      <div>

        <strong>
          ✅ ${validRows.length}
        </strong>

        <span>
          Valid
        </span>

      </div>


      <div>

        <strong>
          ⚠️ ${warningRows.length}
        </strong>

        <span>
          Peringatan
        </span>

      </div>


      <div>

        <strong>
          ❌ ${invalidRows.length}
        </strong>

        <span>
          Tidak Valid
        </span>

      </div>

    </div>

  `;


  importPreview.innerHTML =

    importStudentRows
      .map(row => {

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

          <article class="import-preview-row">

            <div class="import-preview-status">

              ${status}

            </div>


            <div>

              <strong>

                ${escapeHtml(
                  row.displayName ||
                  "Tanpa Nama"
                )}

              </strong>


              <p>

                ${escapeHtml(
                  row.studentCode ||
                  "-"
                )}

                •

                NISN
                ${escapeHtml(
                  row.nisn ||
                  "-"
                )}

              </p>


              <p>

                ${escapeHtml(
                  row.className ||
                  "-"
                )}

                •

                ${escapeHtml(
                  row.academicYear ||
                  "-"
                )}

              </p>


              ${
                messages.length

                  ? `
                    <small>
                      ${escapeHtml(
                        messages.join(
                          " • "
                        )
                      )}
                    </small>
                  `

                  : `
                    <small>
                      Data siap diimport
                    </small>
                  `
              }

            </div>

          </article>

        `;

      })
      .join("");


  confirmImportStudents.hidden =
    validRows.length === 0;


  confirmImportStudents.textContent =
    `Import ${validRows.length} Siswa Valid`;
}


/* =========================================
   CONFIRM BULK IMPORT
========================================= */

confirmImportStudents.addEventListener(
  "click",
  async () => {

    const validRows =
      importStudentRows.filter(
        row => row.valid
      );


    if (
      validRows.length === 0
    ) {

      alert(
        "Tidak ada data siswa valid untuk diimport."
      );

      return;
    }


    const confirmed =
      confirm(
        `Import ${validRows.length} siswa ke MOL-NEXUS?`
      );


    if (!confirmed) return;


    const payload =
      validRows.map(row => ({

        student_code:
          row.studentCode,

        display_name:
          row.displayName,

        nisn:
          row.nisn,

        class_name:
          row.className,

        academic_year:
          row.academicYear

      }));


    confirmImportStudents.disabled =
      true;


    confirmImportStudents.textContent =
      "Mengimport siswa...";


    try {

      const {
        data,
        error
      } = await supabaseClient.rpc(

        "import_students_bulk",

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
        result?.imported_students ??
        validRows.length;


      const createdClasses =
        result?.created_classes ??
        0;


      closeStudentImportModal();


      studentExcelInput.value =
        "";


      importStudentRows = [];


      await loadClasses();

      await loadStudents();


      alert(

        `Import berhasil!\n\n` +

        `Siswa: ${imported}\n` +

        `Kelas baru: ${createdClasses}`

      );


    } catch (error) {

      console.error(
        "Gagal import siswa:",
        error
      );


      alert(
        error?.message ||
        "Import siswa gagal."
      );


    } finally {

      confirmImportStudents.disabled =
        false;


      confirmImportStudents.textContent =
        "Import Siswa Valid";

    }

  }
);


/* =========================================
   INITIALIZE
========================================= */

async function initStudentManagement() {

  const authenticated =
    await requireTeacherAuth();


  if (!authenticated) return;


  try {

    studentList.innerHTML = `

      <p class="state-message">
        Memuat data siswa...
      </p>

    `;


    await loadClasses();

    await loadStudents();


  } catch (error) {

    console.error(
      "Gagal memuat Manajemen Siswa:",
      error
    );


    studentList.innerHTML = `

      <p class="state-message error-message">

        Gagal memuat data siswa.

      </p>

    `;

  }

}


initStudentManagement();
