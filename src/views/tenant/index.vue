<template>
  <div class="container">
    <page-card breadcrumb>
      <div class="table-toolbar flex flex-between">
        <div class="left">
          <a-space>
            <a-input v-model="formModel.name" placeholder="租户名称/编码" allow-clear style="width: 200px" @press-enter="fetchData" />
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
            <a-button type="primary" @click="openTenant(false)">
              <template #icon><icon-plus /></template>
              新增租户
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
        :scroll="{ x: 1100 }"
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
            <a-link @click="openTenantRoles(record)">角色</a-link>
            <a-link @click="openTenantAccounts(record)">账号</a-link>
            <a-link @click="openChannel(record)">渠道</a-link>
            <a-link @click="openTenant(true, record)">编辑</a-link>
            <a-popconfirm content="停用后该租户所有用户无法登录，确定吗？" @ok="handleStatus(record, record.status === 0 ? 1 : 0)" v-if="record.status === 0">
              <a-link>停用</a-link>
            </a-popconfirm>
            <a-link @click="handleStatus(record, 0)" v-else>启用</a-link>
            <a-popconfirm content="确定删除该租户？有下级租户时无法删除。" @ok="handleDel(record)">
              <a-link status="danger">删除</a-link>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </page-card>

    <!-- 租户表单 -->
    <a-modal v-model:visible="tenantVisible" :title="tenantTitle" width="720px" @ok="submitTenant" @cancel="tenantVisible = false">
      <a-form ref="tenantFormRef" :model="tenantForm" :rules="tenantRules" auto-label-width>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="name" label="租户名称">
              <a-input v-model="tenantForm.name" placeholder="品牌名，如 A品牌" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="code" label="租户编码">
              <a-input v-model="tenantForm.code" placeholder="租户后台登录用，如 brand_a" :disabled="tenantForm.id > 0" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="parent_id" label="上级租户">
              <a-select v-model="tenantForm.parent_id" :options="parentOptions" placeholder="不选则为平台直属" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="expire_at" label="授权到期">
              <a-date-picker v-model="tenantForm.expire_at" style="width: 100%" placeholder="留空=永久" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="subject_name" label="公司主体">
              <a-input v-model="tenantForm.subject_name" placeholder="合同/发票用全称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="contact" label="联系人">
              <a-input v-model="tenantForm.contact" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="mobile" label="联系电话">
              <a-input v-model="tenantForm.mobile" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="status" label="状态">
              <a-select v-model="tenantForm.status" :options="statusOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item field="remark" label="备注">
              <a-textarea v-model="tenantForm.remark" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left" v-if="tenantForm.id === 0">初始化租户管理员</a-divider>
        <a-alert v-if="tenantForm.id === 0" type="info" style="margin-bottom: 12px">
          不填则租户创建后无人可登录，需到该租户后台手动添加账号。
        </a-alert>
        <a-row :gutter="16" v-if="tenantForm.id === 0">
          <a-col :span="12">
            <a-form-item field="admin_username" label="管理员账号">
              <a-input v-model="tenantForm.admin_username" placeholder="如 admin" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="admin_password" label="管理员密码">
              <a-input-password v-model="tenantForm.admin_password" placeholder="至少 6 位" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 租户管理员：首次登录必须在此初始化（账号+角色+关联一次建好） -->
    <a-modal v-model:visible="adminVisible" :title="`管理员 - ${currentTenant.name}`" width="680px" :footer="false">
      <a-alert type="info" style="margin-bottom: 12px">
        租户首次登录需先在这里创建管理员；会自动建账号、租户超管角色并绑定，无需进租户后台配置。
        租户后台入口：<b>/webadmin/#/tenant/login?tenant={{ currentTenant.code }}</b>
      </a-alert>
      <div class="channel-toolbar">
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
    <a-modal v-model:visible="adminFormVisible" title="初始化/重置租户管理员" width="520px" @ok="submitAdmin" @cancel="adminFormVisible = false">
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
          账号已存在时会<b>重置密码</b>并解禁；每个租户自动拥有独立的「租户超级管理员」角色。
        </a-alert>
      </a-form>
    </a-modal>

    <!-- 渠道管理 -->
    <a-modal v-model:visible="channelVisible" :title="`渠道配置 - ${currentTenant.name}`" width="820px" :footer="false">
      <div class="channel-toolbar">
        <a-button type="primary" @click="openChannelForm(false)">
          <template #icon><icon-plus /></template>
          新增渠道
        </a-button>
      </div>
      <a-table row-key="id" :columns="channelColumns" :data="channelData" :pagination="false" size="small">
        <template #type="{ record }">
          {{ { website: '网站', h5: 'H5', miniapp: '小程序' }[record.type] || record.type }}
        </template>
        <template #status="{ record }">
          <a-tag :color="record.status === 0 ? 'green' : 'red'">{{ record.status === 0 ? '正常' : '停用' }}</a-tag>
        </template>
        <template #operations="{ record }">
          <a-space>
            <a-link @click="openChannelForm(true, record)">编辑</a-link>
            <a-popconfirm content="确定删除该渠道？" @ok="handleChannelDel(record)">
              <a-link status="danger">删除</a-link>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-modal>

    <!-- 渠道表单 -->
    <a-modal v-model:visible="channelFormVisible" :title="channelFormTitle" width="560px" @ok="submitChannel" @cancel="channelFormVisible = false">
      <a-form ref="channelFormRef" :model="channelForm" :rules="channelRules" auto-label-width>
        <a-form-item field="type" label="渠道类型">
          <a-select v-model="channelForm.type" :options="channelTypes" />
        </a-form-item>
        <a-form-item field="name" label="渠道名称">
          <a-input v-model="channelForm.name" placeholder="如 A品牌官网" />
        </a-form-item>
        <a-form-item field="domain" label="绑定域名">
          <a-input v-model="channelForm.domain" placeholder="多个域名用英文逗号分隔，如 a.example.com,www.a.com" />
        </a-form-item>
        <a-form-item field="appid" label="小程序 AppID">
          <a-input v-model="channelForm.appid" placeholder="小程序渠道填写" />
        </a-form-item>
        <a-form-item field="appsecret" label="小程序 AppSecret">
          <a-input-password v-model="channelForm.appsecret" />
        </a-form-item>
        <a-form-item field="status" label="状态">
          <a-select v-model="channelForm.status" :options="statusOptions" />
        </a-form-item>
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
import {
  getList, getParent, save, upStatus, del,
  adminList, adminInit,
  channelList, channelSave, channelDel,
} from '@/api/tenant';

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
  { title: '租户编码', dataIndex: 'code', width: 130 },
  { title: '租户名称', dataIndex: 'name', width: 140 },
  { title: '公司主体', dataIndex: 'subject_name', width: 180 },
  { title: '层级', dataIndex: 'level', width: 70 },
  { title: '联系人', dataIndex: 'contact', width: 110 },
  { title: '状态', slotName: 'status', width: 90 },
  { title: '授权到期', slotName: 'expire_at', width: 120 },
  { title: '操作', slotName: 'operations', width: 320, fixed: 'right' },
];

// ---------------- 租户表单 ----------------
const tenantVisible = ref(false);
const tenantFormRef = ref<FormInstance>();
const tenantForm = reactive<any>({});
const parentOptions = ref<any[]>([]);
const tenantTitle = computed(() => (tenantForm.id ? '编辑租户' : '新增租户'));
const tenantRules = {
  name: [{ required: true, message: '请填写租户名称' }],
  code: [{ required: true, message: '请填写租户编码' }],
};
const blankTenant = () => ({
  id: 0, parent_id: 0, code: '', name: '', subject_name: '',
  contact: '', mobile: '', status: 0, expire_at: undefined,
  remark: '', admin_username: '', admin_password: '',
});
const openTenant = async (isUpdate: boolean, record?: any) => {
  Object.assign(tenantForm, blankTenant());
  if (isUpdate && record) Object.assign(tenantForm, record);
  const parents = await getParent({ id: record?.id || 0 });
  parentOptions.value = [{ label: '平台直属', value: 0 }].concat(
    (parents || []).map((p: any) => ({ label: `${p.name} (${p.code})`, value: p.id })),
  );
  tenantVisible.value = true;
};
const submitTenant = async () => {
  const err = await tenantFormRef.value?.validate();
  if (err) return;
  const payload = { ...tenantForm, expire_at: tenantForm.expire_at ? dayjs(tenantForm.expire_at).format('YYYY-MM-DD HH:mm:ss') : '' };
  await save(payload);
  Message.success('保存成功');
  tenantVisible.value = false;
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

// 当前操作的租户（管理员 / 渠道共用）
const currentTenant = ref<any>({});

// ---------------- 租户管理员 ----------------
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
  adminData.value = await adminList({ tenant_id: currentTenant.value.id }) || [];
};
const openAdmin = async (record: any) => {
  currentTenant.value = record;
  await loadAdmin();
  adminVisible.value = true;
};
// 平台代管某租户的角色：写入代管上下文后跳到共用的角色管理页。
const openTenantRoles = (record: any) => {
  setTenantProxy(record.id, `${record.name} (${record.code})`);
  router.push({ name: 'role' }).catch(() => router.push({ path: '/system/role' }));
};
// 平台代管某租户的账号管理：写入代管上下文后跳到共用的账号管理页。
// 后端 ResolveManageCtx 校验只有平台 token 能代管租户账号。
const openTenantAccounts = (record: any) => {
  setTenantProxy(record.id, `${record.name} (${record.code})`);
  router.push({ name: 'account' }).catch(() => router.push({ path: '/system/account' }));
};
const openAdminForm = () => {
  Object.assign(adminForm, { username: '', password: '', name: '' });
  adminFormVisible.value = true;
};
const submitAdmin = async () => {
  const err = await adminFormRef.value?.validate();
  if (err) return;
  const res = await adminInit({
    tenant_id: currentTenant.value.id,
    username: adminForm.username,
    password: adminForm.password,
    name: adminForm.name,
  });
  Message.success(`已就绪：租户 ${res?.tenant_code || ''} / 账号 ${res?.username || adminForm.username}`);
  adminFormVisible.value = false;
  await loadAdmin();
};

// ---------------- 渠道 ----------------
const channelVisible = ref(false);
const channelFormVisible = ref(false);
const channelData = ref<any[]>([]);
const channelFormRef = ref<FormInstance>();
const channelForm = reactive<any>({});
const channelFormTitle = computed(() => (channelForm.id ? '编辑渠道' : '新增渠道'));
const channelTypes = [
  { label: '网站', value: 'website' },
  { label: 'H5', value: 'h5' },
  { label: '小程序', value: 'miniapp' },
];
const channelRules = {
  type: [{ required: true, message: '请选择渠道类型' }],
  name: [{ required: true, message: '请填写渠道名称' }],
};
const channelColumns: TableColumnData[] = [
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 100 },
  { title: '名称', dataIndex: 'name', width: 140 },
  { title: '域名', dataIndex: 'domain', width: 260 },
  { title: 'AppID', dataIndex: 'appid', width: 150 },
  { title: '状态', slotName: 'status', width: 90 },
  { title: '操作', slotName: 'operations', width: 130 },
];
const openChannel = async (record: any) => {
  currentTenant.value = record;
  const res = await channelList({ tenant_id: record.id });
  channelData.value = res || [];
  channelVisible.value = true;
};
const openChannelForm = (isUpdate: boolean, record?: any) => {
  Object.assign(channelForm, isUpdate && record ? record : {
    id: 0, tenant_id: currentTenant.value.id, type: 'website',
    name: '', domain: '', appid: '', appsecret: '', status: 0,
  });
  channelFormVisible.value = true;
};
const submitChannel = async () => {
  const err = await channelFormRef.value?.validate();
  if (err) return;
  await channelSave(channelForm);
  Message.success('保存成功');
  channelFormVisible.value = false;
  const res = await channelList({ tenant_id: currentTenant.value.id });
  channelData.value = res || [];
};
const handleChannelDel = async (record: any) => {
  await channelDel({ ids: [record.id] });
  Message.success('删除成功');
  const res = await channelList({ tenant_id: currentTenant.value.id });
  channelData.value = res || [];
};

onMounted(fetchData);
</script>

<style scoped>
.channel-toolbar {
  margin-bottom: 12px;
}
.table-toolbar {
  margin-bottom: 12px;
}
</style>
