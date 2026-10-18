<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { useSession } from "./session";
const session = useSession(),
  user = ref(""),
  password = ref(""),
  busy = ref(false),
  error = ref("");
const nav = [
  ["overview", "运营概览", "◈"],
  ["analytics", "使用分析", "↗"],
  ["suggestions", "用户建议", "✉"],
  ["feedback", "词条反馈", "≋"],
  ["words", "词库观察", "▦"],
  ["word-batches", "词库批次", "▤"],
  ["emoji", "贴纸猜词", "☺"],
  ["jobs", "自动任务", "◷"],
  ["gomoku", "五子棋对战", "⊞"],
  ["skills", "技能分析", "◇"],
  ["loadouts", "配装与对手", "⇄"],
];
async function login() {
  busy.value = true;
  error.value = "";
  try {
    await session.login(user.value, password.value);
    password.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function logout() {
  try {
    await session.logout();
  } catch (e) {
    ElMessage.error((e as Error).message);
  }
}
const unauthorized = () => session.clear();
onMounted(() => {
  window.addEventListener("admin-unauthorized", unauthorized);
  session.restore();
});
onUnmounted(() =>
  window.removeEventListener("admin-unauthorized", unauthorized),
);
</script>
<template>
  <div v-if="!session.ready" class="boot">正在连接运营后台…</div>
  <main v-else-if="!session.username" class="login-screen">
    <div class="login-intro">
      <span class="eyebrow">HAVE FUN · OPERATIONS</span>
      <h1>看见每一次<br />聚会的变化。</h1>
      <p>使用、反馈与游戏平衡，<br />从记录找到下一步。</p>
      <div class="login-mark">✳</div>
    </div>
    <form class="login-card" @submit.prevent="login">
      <span class="eyebrow">管理员入口</span>
      <h2>登录运营后台</h2>
      <p>请使用独立管理员账号</p>
      <label
        >账号<el-input
          v-model="user"
          autocomplete="username"
          maxlength="80" /></label
      ><label
        >密码<el-input
          v-model="password"
          type="password"
          autocomplete="current-password"
          show-password
          maxlength="256" /></label
      ><el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
      /><el-button
        native-type="submit"
        type="primary"
        :loading="busy"
        :disabled="!user || !password"
        size="large"
        >登录</el-button
      ><small>管理权限与微信小程序账号独立</small>
    </form>
  </main>
  <div v-else class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-icon">✳</span>
        <div>聚有趣<small>运营工作台</small></div>
      </div>
      <span class="nav-caption">工作空间</span>
      <nav>
        <router-link
          v-for="[path, title, icon] in nav"
          :key="path"
          :to="'/' + path"
          ><span>{{ icon }}</span
          >{{ title }}</router-link
        >
      </nav>
      <div class="account">
        <span class="avatar">管</span>
        <div>{{ session.username }}<small>管理员</small></div>
        <button @click="logout">退出</button>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <span>聚会小游戏 / 运营后台</span
        ><span class="access-dot">管理会话已验证</span>
      </header>
      <router-view />
    </div>
  </div>
</template>
