import { defHttp } from '@/utils/http';
import { FilterParam } from '/@/utils';
import { getTenantProxyId } from '@/utils/tenantProxy';
//类型
export interface LoginData {
  username: string;
  password: string;
}
enum Api {
    getList = '/system/role/getList',
    getParent = '/system/role/getParent',
    getMenuList = '/system/role/getMenuList',
    save = '/system/role/save',
    upStatus = '/system/role/upStatus',
    del = '/system/role/del',
}

// 平台代管租户角色：所有角色接口统一带上 tenant_id（租户自己登录时为 0，
// 后端按 token 判定：只有平台 token 才允许代管，租户 token 传别人的 id 会被拒）。
const withProxy = (params: any) => {
  const tenantId = getTenantProxyId();
  return tenantId > 0 ? { ...params, tenant_id: tenantId } : params;
};

//列表数据
export function getList(params: any) {
  params=FilterParam(withProxy(params));
  return defHttp.get({ url: Api.getList, params:params }, { errorMessageMode: 'message' });
}
//选择数据
export function getParent(params: any) {
  return defHttp.get({ url: Api.getParent, params:withProxy(params) }, { errorMessageMode: 'message' });
}
//获取菜单数据
export function getMenuList(params: object) {
  return defHttp.get({ url: Api.getMenuList, params:withProxy(params)}, { errorMessageMode: 'message' });
}
//提交数据
export function save(params: object) {
    return defHttp.post({ url: Api.save, params:withProxy(params)}, { errorMessageMode: 'message' });
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
export interface RuleItem {
    id:number,
    pid:number,
    locale: string;
    title: string;
  }