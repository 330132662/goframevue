<template>
   <a-card class="general-card contentcard" v-if="formData">
        <template #title> 应用(系统)主要配置(对应manifest/config/app.yaml或系统数据表) 是整个项目共用配置</template>
        <a-form ref="formRef" :model="formData" auto-label-width>
          <a-list class="list-layout" :gridProps="{ gutter: 0, span: 12 }" :bordered="false" :loading="loading">
            <a-list-item  >
              <a-form-item
              label="登录启用人机验证"
              field="loginCaptcha"
              tooltip="登录是否启用人机验证，启用后登录时需要输入正确的数字验证码才可继续登录"
              >
                 <a-switch type="round" v-model="formData.loginCaptcha" :checked-value="true" :unchecked-value="false">
                    <template #checked>{{ $t('cell.open') }}</template>
                    <template #unchecked>{{ $t('cell.close') }}</template>
                  </a-switch>
              </a-form-item>
              <a-form-item
                label="前端源代码目录位置"
                field="vueobjroot"
                extra="配置代码生成时-前端代码根目录位置(开发必改)"
                >
                 <a-input v-model="formData.vueobjroot" placeholder="填写附件请求路径前缀" allow-clear/>
                </a-form-item>
            </a-list-item>
            <!--右边-->
            <a-list-item >
              <a-form-item
              label="是否允许多端登录"
              field="MultiLogin"
              >
                <a-radio-group v-model="formData.MultiLogin">
                  <a-radio :value="false">单端</a-radio>
                  <a-radio :value="true">多端</a-radio>
                </a-radio-group>
              </a-form-item>
              <!-- <a-form-item
              label="启用请求对称加密"
              field="validityApi"
              tooltip="是否启用接口请求对称加密，启用后请求后端接口需要检验请求头的对称密文"
              >
                 <a-switch type="round" v-model="formData.validityApi" :checked-value="true" :unchecked-value="false">
                    <template #checked>{{ $t('cell.open') }}</template>
                    <template #unchecked>{{ $t('cell.close') }}</template>
                  </a-switch>
              </a-form-item> -->
            </a-list-item>
          </a-list>
          <a-list class="list-layout" :bordered="false">
            <a-list-item style=" border: none;margin-left: 7px;">
               <div class="frombtn">
                    <a-button type="primary" html-type="submit" style="width: 120px;" @click="submitAttachmentConfig">保存</a-button>
                </div>
            </a-list-item>
          </a-list>
        </a-form>
    </a-card>

    <!-- 验证码 IP 白名单（存 DB，命中免验证码） -->
    <a-card class="general-card contentcard" style="margin-top: 12px;">
      <template #title> 验证码 IP 白名单（存在数据库中，命中白名单的 IP 登录免图形验证码，前端也不展示验证码）</template>
      <div style="padding: 4px 16px 16px;">
        <div style="margin: 8px 0 12px; display: flex; gap: 8px; align-items: center;">
          <a-input-search v-model="wlQuery.ip" placeholder="按 IP 搜索" style="width: 240px" allow-clear @search="loadWhitelist" @clear="loadWhitelist"/>
          <a-button type="primary" @click="openWlEdit()">新增白名单</a-button>
        </div>
        <a-table
          :data="wlData.items"
          :loading="wlLoading"
          :pagination="{ total: wlData.total, current: wlData.page, pageSize: wlData.pageSize, showTotal: true }"
          @page-change="onWlPageChange"
          size="medium"
        >
          <template #columns>
            <a-table-column title="ID" data-index="id" :width="80"></a-table-column>
            <a-table-column title="IP / CIDR 网段" data-index="ip" :width="200"></a-table-column>
            <a-table-column title="备注" data-index="remark"></a-table-column>
            <a-table-column title="状态" :width="110">
              <template #cell="{ record }">
                <a-switch type="round" :model-value="record.status === 1" @change="(v:any)=>toggleWlStatus(record, v)">
                  <template #checked>启用</template>
                  <template #unchecked>停用</template>
                </a-switch>
              </template>
            </a-table-column>
            <a-table-column title="创建时间" data-index="created_at" :width="170"></a-table-column>
            <a-table-column title="操作" :width="140">
              <template #cell="{ record }">
                <a-button type="text" size="small" @click="openWlEdit(record)">编辑</a-button>
                <a-popconfirm content="确认删除该白名单？" @ok="removeWl(record)">
                  <a-button type="text" size="small" status="danger">删除</a-button>
                </a-popconfirm>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </div>
    </a-card>

    <!-- 白名单 新增/编辑弹窗 -->
    <a-modal v-model:visible="wlModalVisible" :title="wlForm.id ? '编辑白名单' : '新增白名单'" @before-ok="submitWl" unmount-on-close>
      <a-form :model="wlForm" auto-label-width>
        <a-form-item label="IP / 网段" field="ip" required extra="支持精确 IP（192.168.1.100）和 CIDR 网段（192.168.1.0/24）">
          <a-input v-model="wlForm.ip" placeholder="192.168.1.100 或 192.168.1.0/24" allow-clear/>
        </a-form-item>
        <a-form-item label="备注" field="remark">
          <a-input v-model="wlForm.remark" placeholder="如：办公室出口IP" allow-clear/>
        </a-form-item>
        <a-form-item label="状态" field="status">
          <a-radio-group v-model="wlForm.status">
            <a-radio :value="1">启用</a-radio>
            <a-radio :value="0">停用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </template>

  <script lang="ts" setup>
    import {  ref, reactive, onMounted } from 'vue';
    //api
    import { saveConfig,getConfig} from '@/api/datacenter/appconfig';
    import { getCaptchaIpList, saveCaptchaIp, delCaptchaIp } from '@/api/datacenter/captchaip';
    import { Message } from '@arco-design/web-vue';
    import { cloneDeep } from 'lodash-es';
    import useLoading from '@/hooks/loading';
    const { loading, setLoading } = useLoading();
    //数据配置
    const formData=ref({
      vueobjroot:"",
      loginCaptcha:false,
      MultiLogin:false,
    })
    //保存邮箱
    const submitAttachmentConfig=async()=>{
      try{
        Message.loading({content:"保存中",id:"updata",duration:0})
        await saveConfig(cloneDeep(formData.value));
        Message.success({content:"保存成功",id:"updata",duration:2000})
      } catch (error) {
        Message.loading({content:"保存中",id:"updata",duration:1})
      }
    }
    //组件挂载完成后执行的函数
    onMounted(()=>{
      InitData()
      loadWhitelist()
    })
    //加载数据
    const InitData=async()=>{
      setLoading(true);
      try {
        const emaildata = await getConfig({});
        formData.value=Object.assign({},formData.value,emaildata)
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }

    // ==================== 验证码 IP 白名单 ====================
    const { loading: wlLoading, setLoading: setWlLoading } = useLoading();
    const wlQuery = reactive({ ip: '' });
    const wlData = reactive({ items: [] as any[], total: 0, page: 1, pageSize: 10 });
    const wlModalVisible = ref(false);
    const wlForm = reactive({ id: 0, ip: '', remark: '', status: 1 });

    //加载白名单列表
    const loadWhitelist = async(page = 1) => {
      setWlLoading(true);
      try {
        const res = await getCaptchaIpList({ page, pageSize: wlData.pageSize, ip: wlQuery.ip });
        wlData.items = res?.items || [];
        wlData.total = res?.total || 0;
        wlData.page = res?.page || page;
      } catch (err) {
      } finally {
        setWlLoading(false);
      }
    };
    const onWlPageChange = (page: number) => loadWhitelist(page);

    //打开新增/编辑弹窗
    const openWlEdit = (record?: any) => {
      wlForm.id = record?.id || 0;
      wlForm.ip = record?.ip || '';
      wlForm.remark = record?.remark || '';
      wlForm.status = record?.status ?? 1;
      wlModalVisible.value = true;
    };

    //提交保存
    const submitWl = async() => {
      if (!wlForm.ip.trim()) {
        Message.warning('IP 不能为空');
        return false;
      }
      try {
        await saveCaptchaIp(cloneDeep(wlForm));
        Message.success('保存成功');
        loadWhitelist(wlData.page);
        return true;
      } catch (err) {
        return false;
      }
    };

    //启用/停用（直接保存，立即生效）
    const toggleWlStatus = async(record: any, val: boolean) => {
      try {
        await saveCaptchaIp({ id: record.id, ip: record.ip, remark: record.remark, status: val ? 1 : 0 });
        record.status = val ? 1 : 0;
        Message.success('状态已更新');
      } catch (err) {
      }
    };

    //删除
    const removeWl = async(record: any) => {
      try {
        await delCaptchaIp({ id: record.id });
        Message.success('删除成功');
        loadWhitelist(wlData.page);
      } catch (err) {
      }
    };
  </script>

  <style scoped lang="less">
  .contentcard{
        overflow: hidden;
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
    .frombtn{
      width: 100%;
      text-align: center;
    }
  </style>
