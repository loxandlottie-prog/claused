const LS_ACCOUNT = "inbora_account";
const LS_SESSION = "inbora_session";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSION));
  } catch {
    return null;
  }
}

export function signup(email, password) {
  localStorage.setItem(LS_ACCOUNT, JSON.stringify({ email, password }));
  localStorage.setItem(LS_SESSION, JSON.stringify({ email }));
}

export function login(email, password) {
  try {
    const account = JSON.parse(localStorage.getItem(LS_ACCOUNT));
    if (!account) return false;
    if (account.email !== email || account.password !== password) return false;
    localStorage.setItem(LS_SESSION, JSON.stringify({ email }));
    return true;
  } catch {
    return false;
  }
}

export function logout() {
  localStorage.removeItem(LS_SESSION);
}
