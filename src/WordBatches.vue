<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from './api';
const batches = ref<any[]>([]), entries = ref<any[]>([]), selected = ref(''), busy = ref(false), error = ref('');
async function load() { try { batches.value = await api('/word-batches'); error.value = ''; } catch(e) { error.value = (e as Error).message; } }
async function detail(b: any) { selected.value = b.title; entries.value = []; try { entries.value = await api('/word-batches/' + b.id); } catch(e) { ElMessage.error((e as Error).message); } }
async function rollback(b: any) {
  try { await ElMessageBox.confirm(`将停用“${b.title}”本批新增的 ${b.added_count} 个词。原有词语和历史反馈保留，重启不会重新导入。`, '撤回词库批次', { type: 'warning', confirmButtonText: '撤回本批', cancelButtonText: '取消' }); } catch { return; }
  busy.value = true;
  try { const r = await api('/word-batches/' + b.id + '/rollback', 'POST'); ElMessage.success(`已停用 ${r.disabled} 个词`); await load(); await detail(b); } catch(e) { ElMessage.error((e as Error).message); } finally { busy.value = false; }
}
onMounted(load);
</script>
<template>
  <main style="padding:32px"><h1>词库批次</h1><p>每批独立标记。重复词保留原来源，撤回只停用本批新增词；已撤回批次不会在重启后恢复。分类保留，历史记录保留。</p>
    <el-alert v-if="error" :title="error" type="error" />
    <el-table :data="batches" border><el-table-column prop="id" label="批次标记" min-width="260"/><el-table-column prop="title" label="内容" min-width="220"/><el-table-column prop="added_count" label="实际新增" width="100"/><el-table-column prop="existing_count" label="已存在" width="90"/><el-table-column label="状态" width="100"><template #default="s">{{s.row.status === 'APPLIED' ? '已导入' : '已撤回'}}</template></el-table-column><el-table-column label="操作" width="190"><template #default="s"><el-button @click="detail(s.row)">清单</el-button><el-button type="danger" plain :disabled="busy || s.row.status !== 'APPLIED'" @click="rollback(s.row)">撤回</el-button></template></el-table-column></el-table>
    <section v-if="selected" style="margin-top:32px"><h2>{{ selected }}</h2><el-table :data="entries" height="500" border><el-table-column prop="category_code" label="分类"/><el-table-column prop="term" label="标准答案"/><el-table-column label="本批新增"><template #default="s">{{s.row.inserted ? '是' : '原来已有，撤回不影响'}}</template></el-table-column><el-table-column prop="status" label="当前状态"/></el-table></section>
  </main>
</template>
