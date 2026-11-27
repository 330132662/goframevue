import { defHttp } from '@/utils/http';
import { FilterParam } from '/@/utils';

enum Api {
  getList = '/tenant/getList',
  getParent = '/tenant/getParent',
  save = '/tenant/save',
  upStatus = '/tenant/upStatus',
  del = '/tenant/del',
  adminList = '/tenant/adminList',
  adminInit = '/tenant/adminInit',
  channelList = '/tenant/channelList',
  channelSave = '/tenant/channelSave',
  channelDel = '/tenant/channelDel',
}

export function getList(params: any) {
  return defHttp.get({ url: Api.getList, params: FilterParam(params) }, { errorMessageMode: 'message' });
}
export function getParent(params: any) {
  return defHttp.get({ url: Api.getParent, params }, { errorMessageMode: 'message' });
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
export function channelList(params: any) {
  return defHttp.get({ url: Api.channelList, params }, { errorMessageMode: 'message' });
}
export function channelSave(params: object) {
  return defHttp.post({ url: Api.channelSave, params }, { errorMessageMode: 'message' });
}
export function channelDel(params: object) {
  return defHttp.delete({ url: Api.channelDel, params }, { errorMessageMode: 'message' });
}
