import { defHttp } from '@/utils/http';
import md5 from 'md5'
import { FilterParam } from '/@/utils';
import { getTenantProxyId } from '@/utils/tenantProxy';
//类型
export interface LoginData {
  username: string;
  password: string;
}
enum Api {
    getList = '/system/account/getList',
    getRole = '/system/role/getParent',
    save = '/system/account/save',
    Isaccountexist = '/system/account/isaccountexist',
    upStatus = '/system/account/upStatus',
    del = '/system/account/del',
}

// 平台代管租户账号 / 租户代管子租户账号：所有账号接口统一带上 tenant_id。
// 后端 ResolveManageCtx 校验：只有平台 token 才能代管租户，租户 token 传别人的 id 会被拒。
const withProxy = (params: any) => {
  const tenantId = getTenantProxyId();
  return tenantId > 0 ? { ...params, tenant_id: tenantId } : params;
};

//数据列表
export function getList(params: any) {
  params=FilterParam(withProxy(params))
  return defHttp.get({ url: Api.getList, params:params }, { errorMessageMode: 'message' });
}
//选择角色（注意：getRole 也是代管上下文，同样需要 tenant_id）
export function getRole() {
  return defHttp.get({ url: Api.getRole, params:withProxy({}) }, { errorMessageMode: 'message' });
}
//提交菜单
export function save(params: any) {
  if(params.password){
    params=Object.assign({},params,{password:md5(params.password)})//加密推送
  }
  return defHttp.post({ url: Api.save, params:withProxy(params)}, { errorMessageMode: 'message' });
}
//判断账号是否已经存在
export function isAccountexist(params: object) {
  return defHttp.post({ url: Api.Isaccountexist, params:params}, { errorMessageMode: 'message',isTransformResponse:false});
}
//更新状态
export function upStatus(params: object) {
    return defHttp.post({ url: Api.upStatus, params:withProxy(params)}, { errorMessageMode: 'message' });
}
//删除数据
export function del(params: object) {
    return defHttp.delete({ url: Api.del, params:withProxy(params)}, { errorMessageMode: 'message' });
}
/**数据类型 */
export interface DataItem {
    id:number,
    pid:number,
    locale: string;
    title: string;
  }