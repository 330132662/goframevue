import { defHttp } from '@/utils/http';
import { FilterParam } from '/@/utils';

// 商户（子租户）管理：租户后台管理自己的直属商户
// 后端会逐条校验归属（parent_id=当前租户id），前端无需也不能传归属参数
enum Api {
  getList = '/merchant/getList',
  save = '/merchant/save',
  upStatus = '/merchant/upStatus',
  del = '/merchant/del',
  adminList = '/merchant/adminList',
  adminInit = '/merchant/adminInit',
}

export function getList(params: any) {
  return defHttp.get({ url: Api.getList, params: FilterParam(params) }, { errorMessageMode: 'message' });
}
export function save(params: object) {
  return defHttp.post({ url: Api.save, params }, { errorMessageMode: 'message' });
}
export function upStatus(params: object) {
  return defHttp.post({ url: Api.upStatus, params }, { errorMessageMode: 'message' });
}
export function del(params: object) {
  return defHttp.delete({ url: Api.del, params }, { errorMessageMode: 'message' });
}
export function adminList(params: any) {
  return defHttp.get({ url: Api.adminList, params }, { errorMessageMode: 'message' });
}
export function adminInit(params: object) {
  return defHttp.post({ url: Api.adminInit, params }, { errorMessageMode: 'message' });
}
