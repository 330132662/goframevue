import { defHttp } from '@/utils/http';
import { FilterParam } from '/@/utils';

enum Api {
  getList = '/system/tenant/getList',
  save = '/system/tenant/save',
  upStatus = '/system/tenant/upStatus',
  del = '/system/tenant/del',
}

export function getList(params: any) {
  params = FilterParam(params);
  return defHttp.get({ url: Api.getList, params: params }, { errorMessageMode: 'message' });
}
export function save(params: object) {
  return defHttp.post({ url: Api.save, params: params }, { errorMessageMode: 'message' });
}
export function upStatus(params: object) {
  return defHttp.post({ url: Api.upStatus, params: params }, { errorMessageMode: 'message' });
}
export function del(params: object) {
  return defHttp.delete({ url: Api.del, params: params }, { errorMessageMode: 'message' });
}
