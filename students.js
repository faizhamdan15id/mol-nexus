"use strict";

/* =========================================
   MOL-NEXUS
   STUDENT MANAGEMENT
========================================= */

const SUPABASE_URL = "https://snlpdwqdjfnborsorspd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE";

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


let studentsData = [];
let classesData = [];


/* =========================================
   TEACHER AUTH
========================================= */

async function requireTeacherAuth() {

  const { data: { session }, error } =
    await supabaseClient.auth.getSession();

  if (error || !session) {
    window.location.replace("teacher-login.html");
    return false;
  }

  return true;
}


/* =========================================
   HELPERS
========================================= */

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
      item => item.class_id === classId
    );

  if (!classData) {
    return "Kelas tidak ditemukan";
  }

  return classData.academic_year
    ? `${classData.class_name} • ${classData.academic_year}`
    : classData.class_name;
}


/* =========================================
   LOAD CLASSES
========================================= */

async function loadClasses() {

  const { data, error } = await supabaseClient
    .from("classes")
    .select(`
      class_id,
      class_name,
      academic_year
    `)
    .order("class_name", { ascending: true });

  if (error) {
    throw error;
  }

  classesData = data || [];

  classCountEl.textContent =
    classesData.length;

  classFilter.innerHTML = `
    <option value="">
      Semua Kelas
    </option>

    ${classesData.map(item => `
      <option value="${item.class_id}">
        ${item.class_name}
        ${item.academic_year
          ? `• ${item.academic_year}`
          : ""}
      </option>
    `).join("")}
  `;
}


/* =========================================
   LOAD STUDENTS
========================================= */

async function loadStudents() {

  const { data, error } = await supabaseClient
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
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  studentsData = data || [];

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

      const matchesSearch =
        !keyword ||
        student.display_name
          .toLowerCase()
          .includes(keyword) ||
        student.student_code
          .toLowerCase()
          .includes(keyword) ||
        (student.nisn || "")
          .includes(keyword);

      const matchesClass =
        !selectedClass ||
        student.class_id === selectedClass;

      return matchesSearch && matchesClass;
    });


  if (filteredStudents.length === 0) {

    studentList.innerHTML = `
      <p class="state-message">
        Tidak ada siswa ditemukan.
      </p>
    `;

    return;
  }


  studentList.innerHTML =
    filteredStudents.map(student => `

      <article class="student-management-card">

        <div>

          <span class="student-code">
            ${student.student_code}
          </span>

          <h3>
            ${student.display_name}
          </h3>

          <p>
            👥 ${getClassName(student.class_id)}
          </p>

          <p>
            NISN: ${maskNisn(student.nisn)}
          </p>

        </div>

      </article>

    `).join("");
}


/* =========================================
   FILTER EVENTS
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
