"use strict";

(() => {

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {

    console.error(
      "Supabase client library is not available."
    );

    return;
  }


  const teacherSessionClient =
    window.supabase.createClient(
      "https://snlpdwqdjfnborsorspd.supabase.co",
      "sb_publishable_IHtv0ZDrEQ7584lyNvbCWg_WFUW65oE"
    );


  async function injectSuperAdminMenu() {

    const nav =
      document.querySelector(
        ".teacher-nav"
      );


    const logoutButton =
      document.getElementById(
        "teacherLogoutButton"
      );


    if (
      !nav ||
      !logoutButton ||
      nav.querySelector(
        '[data-super-admin-link="1"]'
      )
    ) {

      return;
    }


    try {

      const {
        data: {
          session
        }
      } =
        await teacherSessionClient
          .auth
          .getSession();


      if (!session) {
        return;
      }


      const {
        data,
        error
      } =
        await teacherSessionClient.rpc(
          "is_mol_nexus_super_admin"
        );


      if (
        error ||
        data !== true
      ) {

        return;
      }


      const link =
        document.createElement(
          "a"
        );


      link.href =
        "teacher-admin.html";

      link.className =
        "nav-link";

      link.dataset.superAdminLink =
        "1";

      link.textContent =
        "🛡️ Guru & Akses";


      nav.insertBefore(
        link,
        logoutButton
      );


    } catch (error) {

      console.error(
        "Super Admin menu check failed:",
        error
      );
    }
  }


  async function logoutTeacher() {

    const logoutButton =
      document.getElementById(
        "teacherLogoutButton"
      );


    if (!logoutButton) {
      return;
    }


    if (
      logoutButton.dataset.busy ===
      "1"
    ) {

      return;
    }


    logoutButton.dataset.busy =
      "1";

    logoutButton.disabled =
      true;


    const originalText =
      logoutButton.textContent;


    logoutButton.textContent =
      "Keluar...";


    try {

      const {
        error
      } =
        await teacherSessionClient
          .auth
          .signOut();


      if (error) {
        throw error;
      }


      window.location.replace(
        "teacher-login.html"
      );


    } catch (error) {

      console.error(
        "Teacher logout failed:",
        error
      );


      logoutButton.dataset.busy =
        "0";

      logoutButton.disabled =
        false;

      logoutButton.textContent =
        originalText;


      window.alert(
        "Logout gagal. Silakan coba lagi."
      );
    }
  }


  const logoutButton =
    document.getElementById(
      "teacherLogoutButton"
    );


  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      logoutTeacher
    );
  }


  injectSuperAdminMenu();

})();
