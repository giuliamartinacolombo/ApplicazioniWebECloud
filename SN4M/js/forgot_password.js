(() => {
  const USERS_KEY = "users";

  const requestForm = document.getElementById("requestForm");
  const errorBox = document.getElementById("errorBox");

  if (!requestForm || !errorBox) return;

  const emailInput = requestForm.elements["email"];
  const btn = requestForm.querySelector("button[type='submit'], button:not([type])");

  function loadUsers() {
    try {
      const u = JSON.parse(localStorage.getItem(USERS_KEY));
      return Array.isArray(u) ? u : [];
    } catch {
      return [];
    }
  }

  function normalizeEmail(email) {
    return String(email).trim().toLowerCase();
  }

  function isValidEmailFormat(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function resetMessage() {
    errorBox.textContent = "";
    errorBox.style.color = "";
  }

  // Se l’utente cambia email, resettiamo il messaggio e riabilitiamo il bottone
  if (emailInput) {
    emailInput.addEventListener("input", () => {
      resetMessage();
      if (btn) btn.disabled = false;
    });
  }

  requestForm.addEventListener("submit", (e) => {
    e.preventDefault();
    resetMessage();

    const raw = emailInput?.value ?? "";
    const email = normalizeEmail(raw);

    if (!email || !isValidEmailFormat(email)) {
      errorBox.style.color = "#ffd0e8";
      errorBox.textContent = "Inserisci un'email valida.";
      return;
    }

    const users = loadUsers();

    const userExists = users.some((u) => {
      if (!u || !u.email) return false;
      return normalizeEmail(u.email) === email;
    });

    if (!userExists) {
      errorBox.style.color = "#ffd0e8";
      errorBox.textContent =
        "Nessun account trovato con questa email (controlla e riprova).";
      return;
    }

    // Email trovata → simulazione invio
    errorBox.style.color = "rgba(233,241,241,.85)";
    errorBox.textContent =
      "Abbiamo inviato un’email con le istruzioni per il recupero della password. Controlla la posta in arrivo e lo spam.";

    // (Opzionale) disabilita solo per 1 secondo per evitare doppio click, poi riabilita
    if (btn) {
      btn.disabled = true;
      setTimeout(() => {
        btn.disabled = false;
      }, 1000);
    }
  });
})();