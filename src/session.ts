import { defineStore } from "pinia";
import { ref } from "vue";
import { api, setCsrf } from "./api";
export const useSession = defineStore("session", () => {
  const username = ref(""),
    ready = ref(false);
  async function restore() {
    try {
      const data = await api("/auth/me");
      username.value = data.username;
      setCsrf(data.csrfToken);
    } catch {
      username.value = "";
    } finally {
      ready.value = true;
    }
  }
  async function login(user: string, password: string) {
    const data = await api("/auth/login", "POST", { username: user, password });
    username.value = data.username;
    setCsrf(data.csrfToken);
  }
  async function logout() {
    await api("/auth/logout", "POST");
    clear();
  }
  function clear() {
    username.value = "";
    setCsrf("");
  }
  return { username, ready, restore, login, logout, clear };
});
