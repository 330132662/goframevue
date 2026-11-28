<template>
  <div class="container" >
    <page-card breadcrumb scrollPage :isFullscreen="isFullscreen">
      <!-- 平台代管租户角色时的提示（租户自己登录不会显示） -->
      <a-alert v-if="proxyTenantId > 0" type="info" closable style="margin-bottom: 12px" @close="exitProxy">
        正在代管租户【{{ proxyTenantName || proxyTenantId }}】的角色，保存/删除均作用于该租户。
        <a-link style="margin-left: 8px" @click="exitProxy">退出代管</a-link>
      </a-alert>
      <div class="table-toolbar flex flex-between">
        <div class="left">
          <a-space>
            <a-input :style="{width:'200px'}"  v-model="formModel.name" placeholder="搜索角色名称" allow-clear />
            <a-range-picker v-model="formModel.createtime" :shortcuts="shortcuts" shortcuts-position="left" :style="{width:'230px'}" @change="fetchData"/>
            <a-select v-model="formModel.status"  :options="statusOptions" placeholder="状态" :style="{width:'90px'}" @change="fetchData"/>
            <a-button type="primary" @click="fetchData">
              <template #icon>
                <icon-search />
              </template>
              {{ $t('searchTable.form.search') }}
            </a-button>
            <a-button @click="reset">
              {{ $t('searchTable.form.reset') }}
            </a-button>
          </a-space>
        </div>
        <div class="right">
        <tabletool :showbtn="['create','refresh','selectdensity','fullscreen']"
           @create="createData" @refresh="fetchData" @selectdensity="(data)=>size=data" @fullscreen="(data)=>isFullscreen=data"></tabletool>
          </div>
        </div>
      <a-table
         row-key="id"
        :loading="loading"
        :pagination="false"
        :columns="(cloneColumns as TableColumnData[])"
        :data="renderData"
        :bordered="{wrapper:true,cell:true}"
        :size="size"
        :default-expand-all-rows="true"
        :scroll="{ x: '100%', y: isFullscreen?(boxheight-70)+'px':'' }"
        ref="artable"
        @change="handleChange" 
      >
        <template #title="{ record }">
          <span v-html="record.spacer" style="padding-right: 5px;color: var(--color-neutral-4);"></span>{{ record.name }}
        </template>
        <template #createtime="{ record }">
          {{dayjs(record.createtime).format("YYYY-MM-DD")}}
        </template>
        <template #status="{ record }">
          <!-- 超管角色(rules='*')和顶级预置角色(account_id=0 且 pid=0)不允许开关状态 -->
          <a-switch v-if="canManageRole(record)" type="round" v-model="record.status" :checked-value="0" :unchecked-value="1" @change="handleStatus(record)">
            <template #checked>
              开
            </template>
            <template #unchecked>
              关
            </template>
          </a-switch>
          <cell-status v-else :status="record.status"/>
        </template>
        <template #operations="{ record }">
          <!-- 踩坑：旧条件 record.account_id != 0 把平台代管/父租户代管子租户新建的角色
               （account_id 可能是创建者 uid 或历史脏数据为 0）全部误伤 → 用户反馈
               "只能看到角色，无法管理角色"。现在只保护超管角色和顶级预置角色。 -->
          <template v-if="canManageRole(record)">
            <Icon icon="svgfont-edit-square" class="iconbtn" @click="handleEdit(record)" :size="18" color="#0960bd"></Icon>
            <a-divider direction="vertical" />
            <a-popconfirm content="您确定要删除吗?" @ok="handleDel(record)">
              <Icon icon="svgfont-delete" class="iconbtn" :size="18" color="#ed6f6f"></Icon>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </page-card>
    <!--表单-->
    <AddDrawer ref="AddFormRef"  @success="handleData"/>
  </div>
</template>

<script lang="ts" setup>
  import { ref, watch, nextTick } from 'vue';
  import { useRouter } from 'vue-router';
  import useLoading from '@/hooks/loading';
  import { getList,upStatus,del} from '@/api/system/role';
  import { getTenantProxyId, getTenantProxyName, clearTenantProxy } from '@/utils/tenantProxy';
  import type { TableColumnData } from '@arco-design/web-vue/es/table/interface';
  import cloneDeep from 'lodash/cloneDeep';
  import { shortcuts, dayjs} from '@/utils/dayjs';
  //数据
  import { columns} from './data';
  //表单
  import AddDrawer from './AddDrawer.vue';
  import {Icon} from '@/components/Icon';
  import { Message } from '@arco-design/web-vue';
  import {tabletool,SizeProps,statusOptions} from '/@/components/tabletool';
  //用户信息
  type Column = TableColumnData & { checked?: true };
  const { loading, setLoading } = useLoading(true);
  const router = useRouter();
  // 平台代管上下文：API 层会自动带上 tenant_id，这里只负责提示与退出。
  const proxyTenantId = ref(getTenantProxyId());
  const proxyTenantName = ref(getTenantProxyName());
  const exitProxy = () => {
    clearTenantProxy();
    proxyTenantId.value = 0;
    proxyTenantName.value = '';
    fetchData();
  };
  const AddFormRef = ref();
  const renderData = ref([]);
  const cloneColumns = ref<Column[]>([]);
  const isFullscreen = ref(false);
  const size = ref<SizeProps>('large');
  const boxheight=ref(document.documentElement.clientHeight)
  //查询字段
  const generateFormModel = () => {
    return {
      name: '',
      createtime: [],
      status: '',
    };
  };
  const formModel = ref(generateFormModel());
  const artable=ref()
  const max_pid=ref(0)
  // 哪些角色允许编辑/删除/开关状态：
  // - 超管角色(rules='*')：保护，不允许降级/删除（后端 RoleSave 也有护栏）
  // - 顶级预置角色(pid=0 且 account_id=0)：平台初始化的根角色，不动
  // - 其余（租户自建 / 平台代管创建 / 父租户代管创建）全部允许
  const canManageRole = (record: any) => {
    if (record.rules === '*') return false;
    if (record.pid === 0 && record.account_id === 0) return false;
    return true;
  }
  const fetchData = async () => {
    setLoading(true);
    try {
      const data= await getList({...formModel.value});
      renderData.value = data.list;
      max_pid.value = data.max_pid;
      nextTick(()=>{
        artable.value.expandAll()
      })
    } catch (err) {
      // you can report use errorHandler or other
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    formModel.value = generateFormModel();
    fetchData();
  };
  fetchData();

  watch(
    () => columns.value,
    (val) => {
      cloneColumns.value = cloneDeep(val);
    },
    { deep: true, immediate: true }
  );
  //添加
  const createData=()=>{
    AddFormRef.value?.openDrawer({
      isUpdate: false,
      record:null
    })
  }
  //编辑数据
  const handleEdit=async(record:any)=>{
    AddFormRef.value?.openDrawer({
      isUpdate: true,
      record:record
    })
  }
  //更新数据
  const handleData=async()=>{
    fetchData();
  }
  //排序拖拽
  const handleChange = (_data:any) => {
    renderData.value = _data
  }
  //更新状态
  const handleStatus=async(record:any)=>{
    try {
        Message.loading({content:"更新状态中",id:"upStatus",duration:0})
        await upStatus({id:record.id,status:record.status});
         Message.success({content:"更新状态成功",id:"upStatus",duration:2000})
    }catch (error) {
      record.status=record.status==1?0:1
      Message.loading({content:"更新状态中",id:"upStatus",duration:1})
    } 
  }
  //删除数据
  const handleDel=async(record:any)=>{
    try {
        Message.loading({content:"删除中",id:"del",duration:0})
        await del({ids:[record.id]});
        fetchData();
         Message.success({content:"删除成功",id:"del",duration:2000})
    }catch (error) {
         Message.loading({content:"删除中",id:"del",duration:1})
    } 
  }

</script>

<script lang="ts">
  export default {
    name: 'role',//页签是名字和路由name相同则缓存生效
  };
</script>

<style scoped lang="less">
  :deep(.arco-table-th) {
    &:last-child {
      .arco-table-th-item-title {
        margin-left: 16px;
      }
    }
  }
  .action-icon {
    margin-left: 12px;
    cursor: pointer;
  }
  .active {
    color: #0960bd;
    background-color: #e3f4fc;
  }
  .setting {
    display: flex;
    align-items: center;
    width: 200px;
    .title {
      margin-left: 12px;
      cursor: pointer;
    }
  }
  :deep(.general-card > .arco-card-header){
    padding: 10px 16px;
  }
  .iconbtn{
    user-select: none;
    cursor: pointer;
    opacity: .8;
    &:hover{
      opacity: 1;
    }
  }
</style>
