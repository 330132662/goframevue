<template>
  <div class="container">
    <page-card breadcrumb>
      <div class="table-toolbar flex flex-between">
        <div class="left">
          <a-space>
            <a-input v-model="formModel.name" placeholder="商户名称/编码" allow-clear style="width: 200px" @press-enter="fetchData" />
            <a-select v-model="formModel.status" :options="statusOptions" placeholder="状态" style="width: 100px" @change="fetchData" />
            <a-button type="primary" @click="fetchData">
              <template #icon><icon-search /></template>
              搜索
            </a-button>
            <a-button @click="reset">重置</a-button>
          </a-space>
        </div>
        <div class="right">
          <a-space>
            <a-button type="primary" @click="openMerchant(false)">
              <template #icon><icon-plus /></template>
              新增商户
            </a-button>
            <a-button @click="fetchData">
              <template #icon><icon-refresh /></template>
              刷新
            </a-button>
          </a-space>
        </div>
      </div>

      <a-table
        row-key="id"
        :loading="loading"
        :pagination="false"
        :columns="columns"
        :data="renderData"
        :bordered="{ wrapper: true, cell: true }"
        :scroll="{ x: 1000 }"
      >
        <template #status="{ record }">
          <a-tag :color="record.status === 0 ? 'green' : 'red'">
            {{ record.status === 0 ? '正常' : '停用' }}
          </a-tag>
        </template>
        <template #expire_at="{ record }">
          {{ record.expire_at ? dayjs(record.expire_at).format('YYYY-MM-DD') : '永久' }}
        </template>
        <template #operations="{ record }">
          <a-space>
            <a-link @click="openAdmin(record)">管理员</a-link>
            <a-link @click="openMerchantRoles(record)">角色</a-link>
            <a-link @click="openMerchant(true, record)">编辑</a-link>
            <a-popconfirm content="停用后该商户所有用户无法登录，确定吗？" @ok="handleStatus(record, record.status === 0 ? 1 : 0)" v-if="record.status === 0">
              <a-link>停用</a-link>
            </a-popconfirm>
            <a-link @click="handleStatus(record, 0)" v-else>启用</a-link>
            <a-popconfirm content="确定删除该商户？有下级商户时无法删除。" @ok="handleDel(record)">
              <a-link status="danger">删除</a-link>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </page-card>

    <!-- 商户表单 -->
    <a-modal v-model:visible="merchantVisible" :title="merchantTitle" width="680px" @ok="submitMerchant" @cancel="merchantVisible = false">
      <a-form ref="merchantFormRef" :model="merchantForm" :rules="merchantRules" auto-label-width>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="name" label="商户名称">
              <a-input v-model="merchantForm.name" placeholder="商户品牌名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="code" label="商户编码">
              <a-input v-model="merchantForm.code" placeholder="商户后台登录用，如 shop_001" :disabled="merchantForm.id > 0" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="expire_at" label="授权到期">
              <a-date-picker v-model="merchantForm.expire_at" style="width: 100%" placeholder="留空=永久" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="subject_name" label="公司主体">
              <a-input v-model="merchantForm.subject_name" placeholder="合同/发票用全称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="contact" label="联系人">
              <a-input v-model="merchantForm.contact" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="mobile" label="联系电话">
              <a-input v-model="merchantForm.mobile" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="status" label="状态">
              <a-select v-model="merchantForm.status" :options="statusOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item field="remark" label="备注">
              <a-textarea v-model="merchantForm.remark" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left" v-if="merchantForm.id === 0">初始化商户管理员</a-divider>
        <a-alert v-if="merchantForm.id === 0" type="info" style="margin-bottom: 12px">
          不填则商户创建后无人可登录，需到该商户管理里点「初始化管理员」重试。
        </a-alert>
        <a-row :gutter="16" v-if="merchantForm.id === 0">
          <a-col :span="12">
            <a-form-item field="admin_username" label="管理员账号">
              <a-input v-model="merchantForm.admin_username" placeholder="如 admin" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="admin_password" label="管理员密码">
              <a-input-password v-model="merchantForm.admin_password" placeholder="至少 6 位" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 商户管理员 -->
    <a-modal v-model:visible="adminVisible" :title="`管理员 - ${currentMerchant.name || ''}`" width="680px" :footer="false">
      <a-alert type="info" style="margin-bottom: 12px">
        会自动建账号、商户超管角色并绑定。商户后台入口：<b>/webadmin/#/tenant/login?tenant={{ currentMerchant.code }}</b>
      </a-alert>
      <div class="table-toolbar">
        <a-button type="primary" @click="openAdminForm()">
          <template #icon><icon-plus /></template>
          新增/重置管理员
        </a-button>
      </div>
      <a-table row-key="id" :columns="adminColumns" :data="adminData" :pagination="false" size="small">
        <template #status="{ record }">
          <a-tag :color="record.status === 0 ? 'green' : 'red'">{{ record.status === 0 ? '正常' : '禁用' }}</a-tag>
        </template>
      </a-table>
    </a-modal>

    <!-- 管理员表单 -->
    <a-modal v-model:visible="adminFormVisible" title="初始化/重置商户管理员" width="520px" @ok="submitAdmin" @cancel="adminFormVisible = false">
      <a-form ref="adminFormRef" :model="adminForm" :rules="adminRules" auto-label-width>
        <a-form-item field="username" label="管理员账号">
          <a-input v-model="adminForm.username" placeholder="如 admin" />
        </a-form-item>
        <a-form-item field="password" label="登录密码">
          <a-input-password v-model="adminForm.password" placeholder="至少 6 位" />
        </a-form-item>
        <a-form-item field="name" label="姓名">
          <a-input v-model="adminForm.name" placeholder="可选，默认同账号" />
        </a-form-item>
        <a-alert type="warning" style="margin-top: 4px">
          账号已存在时会<b>重置密码</b>并解禁；每个商户自动拥有独立的「租户超级管理员」角色。
        </a-alert>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
import dayjs from 'dayjs';
import useLoading from '@/hooks/loading';
import { setTenantProxy } from '@/utils/tenantProxy';
import { getList, save, upStatus, del, adminList, adminInit } from '@/api/merchant';

const { loading, setLoading } = useLoading(false);
const router = useRouter();
const renderData = ref<any[]>([]);
const statusOptions = [
  { label: '正常', value: 0 },
  { label: '停用', value: 1 },
];
const formModel = ref({ name: '', status: undefined as any });
const fetchData = async () => {
  setLoading(true);
  try {
    const res = await getList(formModel.value);
    renderData.value = res?.items || [];
  } finally {
    setLoading(false);
  }
};
const reset = () => {
  formModel.value = { name: '', status: undefined };
  fetchData();
};

const columns: TableColumnData[] = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '商户编码', dataIndex: 'code', width: 130 },
  { title: '商户名称', dataIndex: 'name', width: 150 },
  { title: '公司主体', dataIndex: 'subject_name', width: 180 },
  { title: '联系人', dataIndex: 'contact', width: 100 },
  { title: '联系电话', dataIndex: 'mobile', width: 120 },
  { title: '状态', slotName: 'status', width: 80 },
  { title: '授权到期', slotName: 'expire_at', width: 110 },
  { title: '操作', slotName: 'operations', width: 260, fixed: 'right' },
];

// ---------------- 商户表单 ----------------
const merchantVisible = ref(false);
const merchantFormRef = ref<FormInstance>();
const merchantForm = reactive<any>({});
const merchantTitle = computed(() => (merchantForm.id ? '编辑商户' : '新增商户'));
const merchantRules = {
  name: [{ required: true, message: '请填写商户名称' }],
  code: [{ required: true, message: '请填写商户编码' }],
};
const blankMerchant = () => ({
  id: 0, code: '', name: '', subject_name: '',
  contact: '', mobile: '', status: 0, expire_at: undefined,
  remark: '', admin_username: '', admin_password: '',
});
const openMerchant = (isUpdate: boolean, record?: any) => {
  Object.assign(merchantForm, blankMerchant());
  if (isUpdate && record) Object.assign(merchantForm, record);
  merchantVisible.value = true;
};
const submitMerchant = async () => {
  const err = await merchantFormRef.value?.validate();
  if (err) return;
  const payload = { ...merchantForm, expire_at: merchantForm.expire_at ? dayjs(merchantForm.expire_at).format('YYYY-MM-DD HH:mm:ss') : '' };
  await save(payload);
  Message.success('保存成功');
  merchantVisible.value = false;
  fetchData();
};
const handleStatus = async (record: any, status: number) => {
  await upStatus({ id: record.id, status });
  Message.success('状态已更新');
  fetchData();
};
const handleDel = async (record: any) => {
  await del({ ids: [record.id] });
  Message.success('删除成功');
  fetchData();
};

// 当前操作的商户（管理员弹窗共用）
const currentMerchant = ref<any>({});

// ---------------- 商户管理员 ----------------
const adminVisible = ref(false);
const adminFormVisible = ref(false);
const adminFormRef = ref<FormInstance>();
const adminData = ref<any[]>([]);
const adminForm = reactive<any>({ username: '', password: '', name: '' });
const adminRules = {
  username: [{ required: true, message: '请填写管理员账号' }],
  password: [{ required: true, minLength: 6, message: '密码至少 6 位' }],
};
const adminColumns: TableColumnData[] = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '账号', dataIndex: 'username', width: 140 },
  { title: '姓名', dataIndex: 'name', width: 140 },
  { title: '状态', slotName: 'status', width: 90 },
  { title: '创建时间', dataIndex: 'createtime', width: 170 },
];
const loadAdmin = async () => {
  adminData.value = await adminList({ tenant_id: currentMerchant.value.id }) || [];
};
const openAdmin = async (record: any) => {
  currentMerchant.value = record;
  await loadAdmin();
  adminVisible.value = true;
};
const openAdminForm = () => {
  Object.assign(adminForm, { username: '', password: '', name: '' });
  adminFormVisible.value = true;
};
const submitAdmin = async () => {
  const err = await adminFormRef.value?.validate();
  if (err) return;
  const res = await adminInit({
    tenant_id: currentMerchant.value.id,
    username: adminForm.username,
    password: adminForm.password,
    name: adminForm.name,
  });
  Message.success(`已就绪：商户 ${res?.tenant_code || ''} / 账号 ${res?.username || adminForm.username}`);
  adminFormVisible.value = false;
  await loadAdmin();
};

// 父租户代管商户角色：写入代管上下文后跳到共用的角色管理页。
// 后端 ResolveManageCtx 校验：仅允许代管自己的直接子商户。
const openMerchantRoles = (record: any) => {
  setTenantProxy(record.id, `${record.name} (${record.code})`);
  router.push({ name: 'role' }).catch(() => router.push({ path: '/system/role' }));
};

onMounted(fetchData);
</script>

<style scoped>
.table-toolbar {
  margin-bottom: 12px;
}
</style>
