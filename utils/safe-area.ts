export const getSafeTopInset = (extra = 18, fallbackStatusBarHeight = 24): number => {
  let statusBarHeight = fallbackStatusBarHeight;
  try {
    if (typeof wx.getWindowInfo === 'function') {
      statusBarHeight = wx.getWindowInfo().statusBarHeight || fallbackStatusBarHeight;
    } else {
      statusBarHeight = wx.getSystemInfoSync().statusBarHeight || fallbackStatusBarHeight;
    }
  } catch (_error) {
    statusBarHeight = fallbackStatusBarHeight;
  }
  return statusBarHeight + extra;
};

export const getSafeTopStyle = (extra = 18): string => `padding-top:${getSafeTopInset(extra)}px;`;
