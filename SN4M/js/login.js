(() => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // Non obbligatorio: se non esiste, usiamo alert
  const errorBox = document.getElementById("errorBox");

  function showError(msg) {
    if (errorBox) errorBox.textContent = msg;
    else alert(msg);
  }

  function clearError() {
    if (errorBox) errorBox.textContent = "";
  }

  function getUsers() {
    try {
      const users = JSON.parse(localStorage.getItem("users"));
      return Array.isArray(users) ? users : [];
    } catch {
      return [];
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();

    const username = form.elements["username"]?.value?.trim() || "";
    const password = form.elements["password"]?.value || "";

    const users = getUsers();

    // Se non ci sono utenti registrati
    if (users.length === 0) {
      showError("Nessun utente registrato. Vai su Registrati.");
      return;
    }

    const user = users.find(
      (u) =>
        (u.username || "").toLowerCase() === username.toLowerCase() &&
        u.password === password
    );

    if (!user) {
      showError("Username o password non corretti.");
      return;
    }

    // Login riuscito
    localStorage.setItem("currentUser", JSON.stringify(user));
    window.location.href = "homepage.html";
  });
})();