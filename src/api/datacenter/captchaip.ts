import { defHttp } from '@/utils/http';

enum Api {
  getList = '/datacenter/captchaip/getList',
  save = '/datacenter/captchaip/save',
  del = '/datacenter/captchaip/del',
}

// 验证码IP白名单列表
export function getCaptchaIpList(params: object) {
  return defHttp.get({ url: Api.getList, params }, { errorMessageMode: 'message' });
}

// 保存白名单（id>0 编辑，否则新增）
export function saveCaptchaIp(params: any) {
  return defHttp.post({ url: Api.save, params }, { errorMessageMode: 'message' });
}

// 删除白名单
export function delCaptchaIp(params: { id: number }) {
  return defHttp.post({ url: Api.del, params }, { errorMessageMode: 'message' });
}
