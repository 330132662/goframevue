<template>
  <div class="container">
    <page-card breadcrumb scrollPage :isFullscreen="isFullscreen">
      <div class="table-toolbar flex flex-between">
        <div class="left">
          <a-space>
            <a-input :style="{ width: '200px' }" v-model="formModel.name" placeholder="搜索租户名称" allow-clear />
            <a-input :style="{ width: '180px' }" v-model="formModel.code" placeholder="搜索租户编码" allow-clear />
            <a-select v-model="formModel.status" :options="statusOptions" placeholder="状态" :style="{ width: '120px' }" allow-clear @change="fetchData" />
            <a-button type="primary" @click="fetchData">
              <template #icon><icon-search /></template>
              搜索
            </a-button>
            <a-button @click="reset">重置</a-button>
          </a-space>
        </div>
        <div class="right">
          <tabletool
            :showbtn="['create', 'refresh', 'selectdensity', 'fullscreen']"
            @create="openAddDrawer"
            @refresh="fetchData"
            @selectdensity="(data: any) => (size = data)"
            @fullscreen="(data: any) => (isFullscreen = data)"
          ></tabletool>
        </div>
      </div>
      <a-table
        row-key="id"
        :loading="loading"
        :pagination="false"
        :columns="(cloneColumns as TableColumnData[])"
        :data="renderData"
        :bordered="{ wrapper: true, cell: true }"
        :size="size"
        :scroll="{ x: '100%', y: isFullscreen ? boxheight - 70 + 'px' : '' }"
      >
        <template #createtime="{ record }">
          {{ dayjs(record.createtime).format('YYYY-MM-DD HH:mm') }}
        </template>
        <template #status="{ record }">
          <a-switch
            type="round"
            v-if="record.is_platform !== 1"
            v-model="record.status"
            :checked-value="0"
            :unchecked-value="1"
            @change="handleStatus(record)"
          >
            <template #checked>开</template>
            <template #unchecked>关</template>
          </a-switch>
          <cell-status v-else :status="record.status" />
        </template>
        <template #operations="{ record }">
          <template v-if="record.is_platform !== 1">
            <Icon icon="svgfont-edit-square" class="iconbtn" @click="openEditDrawer(record)" :size="18" color="#0960bd" />
            <a-divider direction="vertical" />
            <a-popconfirm content="您确定要删除吗?" @ok="handleDel(record)">
              <Icon icon="svgfont-delete" class="iconbtn" :size="18" color="#ed6f6f" />
            </a-popconfirm>
          </template>
          <span v-else class="platform-tag">平台租户 · 受保护</span>
        </template>
      </a-table>
    </page-card>

    <!-- 添加/编辑抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="formModel.id ? '编辑租户' : '新增租户'"
      width="500px"
      :footer="false"
      unmount-on-close
    >
      <a-form :model="formModel" layout="vertical" ref="formRef">
        <a-form-item label="租户编码" field="code" :rules="[{ required: true, message: '租户编码不能为空' }]">
          <a-input v-model="formModel.code" placeholder="如：acme" :disabled="!!formModel.id" />
        </a-form-item>
        <a-form-item label="租户名称" field="name" :rules="[{ required: true, message: '租户名称不能为空' }]">
          <a-input v-model="formModel.name" placeholder="如：Acme 科技有限公司" />
        </a-form-item>
        <a-form-item label="状态">
          <a-switch v-model="formModel.status" :checked-value="0" :unchecked-value="1" />
          <span class="ml-2 text-gray">正常/禁用</span>
        </a-form-item>
        <a-form-item label="到期时间">
          <a-date-picker v-model="formModel.expire_time" show-time format="YYYY-MM-DD HH:mm:ss" placeholder="不填=永久" style="width: 100%" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model="formModel.remark" :auto-size="{ minRows: 2, maxRows: 4 }" placeholder="可选" />
        </a-form-item>
      </a-form>
      <div class="drawer-footer">
        <a-button @click="drawerVisible = false">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">确定</a-button>
      </div>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import useLoading from '@/hooks/loading';
import { getList, save, upStatus, del } from '@/api/system/tenant';
import type { TableColumnData } from '@arco-design/web-vue/es/table/interface';
import cloneDeep from 'lodash/cloneDeep';
import { dayjs, shortcuts } from '@/utils/dayjs';
import { columns } from './data';
import { Icon } from '@/components/Icon';
import { Message } from '@arco-design/web-vue';
import { tabletool, SizeProps, statusOptions } from '/@/components/tabletool';

const { loading, setLoading } = useLoading(true);
const renderData = ref<any[]>([]);
const cloneColumns = ref<TableColumnData[]>([]);
const isFullscreen = ref(false);
const size = ref<SizeProps>('large');
const boxheight = ref(document.documentElement.clientHeight);
const drawerVisible = ref(false);
const saving = ref(false);
const formRef = ref();

const defaultFormModel = () => ({
  id: 0,
  code: '',
  name: '',
  status: 0,
  expire_time: '',
  remark: '',
});
const formModel = ref(defaultFormModel());

const fetchData = async () => {
  setLoading(true);
  try {
    const res = await getList({ ...formModel.value });
    renderData.value = res.list;
  } catch { /* 错误已拦截 */ }
  setLoading(false);
};

const reset = () => {
  formModel.value = { ...defaultFormModel(), code: formModel.value.code }; // 保留搜索条件
  formModel.value.code = '';
  formModel.value.name = '';
  formModel.value.status = '' as any;
  fetchData();
};

watch(
  () => columns,
  (val) => { cloneColumns.value = cloneDeep(val); },
  { deep: true, immediate: true }
);

fetchData();

const openAddDrawer = () => {
  formModel.value = defaultFormModel();
  drawerVisible.value = true;
};

const openEditDrawer = (record: any) => {
  formModel.value = {
    id: record.id,
    code: record.code,
    name: record.name,
    status: record.status,
    expire_time: record.expire_time || '',
    remark: record.remark || '',
  };
  drawerVisible.value = true;
};

const handleSave = async () => {
  try {
    await formRef.value.validate();
  } catch { return; }
  saving.value = true;
  try {
    await save({ ...formModel.value });
    Message.success(formModel.value.id ? '更新成功' : '创建成功');
    drawerVisible.value = false;
    fetchData();
  } catch { /* 错误已拦截 */ }
  saving.value = false;
};

const handleStatus = async (record: any) => {
  try {
    await upStatus({ id: record.id, status: record.status });
    Message.success('状态更新成功');
  } catch {
    record.status = record.status === 1 ? 0 : 1; // 回滚
  }
};

const handleDel = async (record: any) => {
  try {
    await del({ ids: [record.id] });
    Message.success('删除成功');
    fetchData();
  } catch { /* 错误已拦截 */ }
};
</script>

<script lang="ts">
export default { name: 'tenant' };
</script>

<style scoped lang="less">
.iconbtn { user-select: none; cursor: pointer; opacity: .8; &:hover { opacity: 1; } }
.platform-tag { color: var(--color-text-3); font-size: 12px; }
.drawer-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border-2); }
</style>
