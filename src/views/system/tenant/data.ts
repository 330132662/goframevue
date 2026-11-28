import type { TableColumnData } from '@arco-design/web-vue/es/table/interface';

export const columns: TableColumnData[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 80,
  },
  {
    title: '租户编码',
    dataIndex: 'code',
    width: 160,
    tooltip: true,
  },
  {
    title: '租户名称',
    dataIndex: 'name',
    width: 200,
  },
  {
    title: '平台租户',
    dataIndex: 'is_platform',
    width: 100,
    render: ({ record }: any) => {
      return record.is_platform === 1 ? '是' : '-';
    },
  },
  {
    title: '管理员数量',
    dataIndex: 'admin_count',
    width: 110,
  },
  {
    title: '到期时间',
    dataIndex: 'expire_time',
    width: 170,
    render: ({ record }: any) => {
      return record.expire_time ? record.expire_time : '永久';
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'createtime',
    width: 170,
  },
  {
    title: '备注',
    dataIndex: 'remark',
    width: 200,
    ellipsis: true,
  },
];
