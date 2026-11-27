import { Decrypt } from '@/utils/CryptoJS'
const TOKEN_KEY = 'biztoken';
const CODESTORE_TOKEN_KEY = 'codestoretoken';
const TENANT_CODE_KEY = 'biztenantcode';
const APP_TYPE_KEY = 'bizapptype';

// 登录入口分流：租户编码 + 当前端类型（切换入口时清掉旧 token）
const getTenantCode = () => localStorage.getItem(TENANT_CODE_KEY) || '';
const setTenantCode = (code: string) => {
  if (code) localStorage.setItem(TENANT_CODE_KEY, code);
  else localStorage.removeItem(TENANT_CODE_KEY);
};
const getAppType = () => localStorage.getItem(APP_TYPE_KEY) || 'platform';
const setAppType = (type: string) => localStorage.setItem(APP_TYPE_KEY, type);

const isLogin = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

const setToken = (token: string| undefined) => {
  if(token){
    localStorage.setItem(TOKEN_KEY, Decrypt(token));//Decrypt需对token进行解密
  }else{
    localStorage.removeItem(TOKEN_KEY);
  }
};

const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};
//代码仓库登录
const cstoreIsLogin = () => {
  return !!localStorage.getItem(CODESTORE_TOKEN_KEY);
};
const getCstoreToken = () => {
  return localStorage.getItem(CODESTORE_TOKEN_KEY);
};
const setCstoreToken = (token: string| undefined) => {
  if(token){
    localStorage.setItem(CODESTORE_TOKEN_KEY, token);
  }else{
    localStorage.removeItem(CODESTORE_TOKEN_KEY);
  }
};
const clearCstoreToken = () => {
  localStorage.removeItem(CODESTORE_TOKEN_KEY);
};

export { isLogin, getToken, setToken, clearToken,
  cstoreIsLogin,getCstoreToken,setCstoreToken,clearCstoreToken,
  getTenantCode, setTenantCode, getAppType, setAppType };
