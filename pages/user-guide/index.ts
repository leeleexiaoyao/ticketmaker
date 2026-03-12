import { getSafeTopStyle } from '../../utils/safe-area';

Page({
  data: {
    safeTopStyle: 'padding-top: 48px;',
  },
  onLoad() {
    this.setData({
      safeTopStyle: getSafeTopStyle(12),
    });
  },
});
