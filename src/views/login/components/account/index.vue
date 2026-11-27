<template>
  <a-form
    ref="formRef"
    :model="form"
    :label-col-style="{ display: 'none' }"
    :wrapper-col-style="{ flex: 1 }"
    size="large"
    @submit="handleLogin"
  >
    <!-- 租户后台入口：租户编码（也可通过 URL ?tenant=xxx 预填） -->
    <a-form-item v-if="isTenantLogin" field="tenantCode" hide-label :rules="[{ required: true, message: '请输入租户编码'}]" :validate-trigger="['change', 'blur']">
      <a-input v-model="form.tenantCode" placeholder="租户编码" allow-clear>
        <template #prefix>
          <icon-apps />
        </template>
      </a-input>
    </a-form-item>
    <a-form-item field="username" hide-label :rules="[{ required: true, message: $t('login.form.userName.errMsg')}]" :validate-trigger="['change', 'blur']">
      <a-input v-model="form.username" :placeholder="$t('login.form.userName.placeholder')+defAccount.username"  allow-clear  >
        <template #prefix>
          <icon-user />
        </template>
      </a-input>
    </a-form-item>
    <a-form-item field="password" hide-label :rules="[{ required: true, message: $t('login.form.password.errMsg')}]" :validate-trigger="['change', 'blur']">
      <a-input-password v-model="form.password" :placeholder="$t('login.form.password.placeholder')+defAccount.password" allow-clear>
        <template #prefix>
          <icon-lock />
        </template>
      </a-input-password>
    </a-form-item>
    <!-- 白名单IP：原验证码位置提示免验证码 -->
    <a-form-item v-if="!captchaShow && ipWhitelisted" hide-label>
      <a-alert type="success" class="wl-alert">您位于IP白名单（{{ clientIp || '未知' }}），无需图形验证码</a-alert>
    </a-form-item>
    <a-form-item field="captcha" v-if="captchaShow" hide-label :rules="[{ required: true, message: $t('login.form.verification.errMsg')}]" >
      <a-input v-model="form.captcha" :placeholder="$t('login.form.verification.placeholder')" :max-length="4" allow-clear style="flex: 1 1" hide-button/>
      <div class="captcha-container" @click="handleCaptcha">
        <a-tooltip :content="$t('login.form.clickverification')">
         <img :src="captchaImgBase64" alt="验证码" class="captcha" />
        </a-tooltip>
        <div v-if="form.expired" class="overlay">
          <p>{{$t("login.form.verification.expired") }}</p>
        </div>
      </div>
    </a-form-item>
    <!-- 非白名单IP：验证码下方提示可申请加白 -->
    <a-form-item v-if="captchaShow && !ipWhitelisted" hide-label style="margin-top:-12px;">
      <a-alert type="warning" class="wl-alert">您的IP（{{ clientIp || '未知' }}）不在白名单，可联系管理员加白</a-alert>
    </a-form-item>
    <a-form-item style="margin-top:-5px;margin-bottom:15px;">
      <a-row justify="space-between" align="center" class="w-full">
        <a-checkbox v-model="loginConfig.rememberMe"> {{$t('login.form.rememberPassword')}}</a-checkbox>
        <a-link>{{$t('login.form.forgetPassword')}}</a-link>
      </a-row>
    </a-form-item>
    <a-form-item>
      <a-space direction="vertical" fill class="w-full">
        <a-button class="btn" type="primary" :loading="loading" html-type="submit" size="large" long>{{$t('login.form.login')}}</a-button>
      </a-space>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { ref,reactive,watch,onBeforeUnmount,onMounted} from 'vue';
import { type FormInstance, Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core'
import { getCaptcha } from '@/api/user';
import { useUserStore, useAppStore } from '@/store';
import { setTenantCode } from '@/utils/auth';
import { getHomePath } from '@/router/constants';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const loginConfig = useStorage('login-data', {
  rememberMe: true,
  username: "", 
  password: ""
})
//演示用户名和密码默认值提示
const defAccount=ref({username:"",password:""})
const dfAcPass=window?.globalConfig?.DefaultAccountPassword
if(dfAcPass&&dfAcPass.length==2){
  defAccount.value.username = `（演示账号：${dfAcPass[0]}）`
  defAccount.value.password =  `（演示密码：${dfAcPass[1]}）`
}
const formRef = ref<FormInstance>()
const router = useRouter()
// 租户登录时显示租户编码字段；支持 ?tenant=brand_a 预填
const isTenantLogin = router.currentRoute.value.meta?.appType === 'tenant_admin'
const tenantFromUrl = (router.currentRoute.value.query?.tenant || router.currentRoute.value.query?.tenant_code || '') as string
const form = reactive({
  username: loginConfig.value.username,
  password: loginConfig.value.password,
  captcha: "",
  codeid: "",
  expired: false,
  tenantCode: tenantFromUrl
})
if (isTenantLogin) {
  setTenantCode(tenantFromUrl)
  watch(() => form.tenantCode, (v) => setTenantCode(v || ''))
}

// 验证码过期定时器
const timer=ref() 
const startTimer = (expireTime: number) => {
  if (timer.value) {
    clearTimeout(timer.value)
  }
  const remainingTime = expireTime - Date.now()
  if (remainingTime <= 0) {
    form.expired = true
    return
  }
  timer.value = setTimeout(() => {
    form.expired = true
  }, remainingTime)
}
// 组件销毁时清理定时器
onBeforeUnmount(() => {
  if (timer.value) {
    clearTimeout(timer.value)
  }
})

const captchaImgBase64 = ref()
const captchaShow = ref<boolean>(false)
// 来源IP与白名单状态（后端 getCaptcha 随验证码数据回传）
const clientIp = ref<string>('')
const ipWhitelisted = ref<boolean>(false)
// 获取验证码
const handleCaptcha = async() => {
  const resdata= await getCaptcha({type:"image"})
  const { id,show, img, expireTime, ip, whitelisted } = resdata
  form.codeid = id
  captchaShow.value= show
  captchaImgBase64.value = img
  clientIp.value = ip || ''
  ipWhitelisted.value = !!whitelisted
  form.expired = false
  startTimer(expireTime)
}

const userStore = useUserStore()
const loading = ref(false)
// 登录
const handleLogin = async () => {
  try {
    const isInvalid = await formRef.value?.validate()
    if (isInvalid) return
    loading.value = true
    await userStore.login({
      username: form.username,
      password:form.password,
      captcha: form.captcha,
      codeid: form.codeid
    })
    const appStore = useAppStore();
    const { redirect, ...othersQuery } = router.currentRoute.value.query;
    // B2 登录成功后用 getHomePath(appAsyncRoute) 从菜单推导首页；
    // redirect 为 notFound/login/home/空 时兜底 homePath；按 path 跳转失败 .catch() 再按 name 兜底
    const homePath = getHomePath(appStore.appAsyncRoute as any);
    const toURl = (redirect as string) || '';
    if (!toURl || toURl == 'notFound' || toURl == 'login' || toURl == 'home') {
      router
        .replace({ path: homePath, query: { ...othersQuery } })
        .catch(() => router.replace({ name: 'home' }).catch(() => {}));
    } else {
      router
        .replace({ name: toURl, query: { ...othersQuery } })
        .catch(() => router.replace({ path: homePath }).catch(() => {}));
    }
    const { rememberMe } = loginConfig.value
    loginConfig.value.username = rememberMe ? form.username : ''
    loginConfig.value.password = rememberMe ? form.password : ''
    Message.success({content:t('login.form.login.success'),id:"errmsg"})
  } catch (error) {
    handleCaptcha()
    form.captcha =''
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  handleCaptcha()
})
</script>

<style lang="less" scoped>
.arco-input-wrapper,
:deep(.arco-select-view-single) {
  height: 40px;
  border-radius: 4px;
  font-size: 13px;
}

.arco-input-wrapper.arco-input-error {
  background-color: rgb(var(--danger-1));
  border-color: rgb(var(--danger-3));
}

.arco-input-wrapper.arco-input-error:hover {
  background-color: rgb(var(--danger-1));
  border-color: rgb(var(--danger-6));
}

.arco-input-wrapper :deep(.arco-input) {
  font-size: 13px;
  color: var(--color-text-1);
}

.arco-input-wrapper:hover {
  border-color: rgb(var(--arcoblue-6));
}

.captcha {
  width: 111px;
  height: 39px;
  margin: 0 0 0 5px;
  background-color: var(--color-neutral-2);
  padding-left: 5px;
  border-radius: 4px;
}

.btn {
  height: 40px;
}

.wl-alert {
  width: 100%;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}

.captcha-container {
  position: relative;
  display: inline-block;
  cursor: pointer;
  height: 39px;
}

.captcha-container {
  position: relative;
  display: inline-block;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(51, 51, 51, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
}

.overlay p {
  font-size: 12px;
  color: white;
}
</style>
