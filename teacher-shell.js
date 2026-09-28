"use strict";

(() => {

  const logoutButton =
    document.getElementById(
      "teacherLogoutButton"
    );

  if (!logoutButton) {
    return;
  }

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


  logoutButton.addEventListener(
    "click",
    async () => {

      if (
        logoutButton.dataset.busy === "1"
      ) {
        return;
      }


      logoutButton.dataset.busy = "1";
      logoutButton.disabled = true;

      const originalText =
        logoutButton.textContent;

      logoutButton.textContent =
        "Keluar...";


      try {

        const { error } =
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


        logoutButton.dataset.busy = "0";
        logoutButton.disabled = false;
        logoutButton.textContent =
          originalText;


        window.alert(
          "Logout gagal. Silakan coba lagi."
        );
      }
    }
  );

})();
