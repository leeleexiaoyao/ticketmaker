export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'ticket_stub_theme_mode_v1';
const DEFAULT_THEME_MODE: ThemeMode = 'dark';

const normalizeThemeMode = (value: unknown): ThemeMode => (value === 'light' ? 'light' : 'dark');

export const getStoredThemeMode = (): ThemeMode => {
  try {
    const storedMode = wx.getStorageSync(THEME_STORAGE_KEY);
    return normalizeThemeMode(storedMode);
  } catch (_error) {
    return DEFAULT_THEME_MODE;
  }
};

export const getCurrentThemeMode = (): ThemeMode => {
  const app = getApp<IAppOption>();
  const mode = normalizeThemeMode(app?.globalData?.themeMode);
  if (app?.globalData) {
    app.globalData.themeMode = mode;
  }
  return mode;
};

export const setCurrentThemeMode = (mode: ThemeMode): ThemeMode => {
  const nextMode = normalizeThemeMode(mode);
  const app = getApp<IAppOption>();
  if (app?.globalData) {
    app.globalData.themeMode = nextMode;
  }
  try {
    wx.setStorageSync(THEME_STORAGE_KEY, nextMode);
  } catch (_error) {
    // Ignore storage errors and keep runtime theme.
  }
  applyNativeTheme(nextMode);
  return nextMode;
};

export const getThemeClass = (mode: ThemeMode): string => (mode === 'light' ? 'theme-light' : 'theme-dark');

export const getNextThemeMode = (mode: ThemeMode): ThemeMode => (mode === 'dark' ? 'light' : 'dark');

export const applyNativeTheme = (mode: ThemeMode) => {
  const safeMode = normalizeThemeMode(mode);
  const backgroundColor = safeMode === 'light' ? '#f4f7fc' : '#101114';
  const frontColor = safeMode === 'light' ? '#000000' : '#ffffff';

  wx.setNavigationBarColor({
    backgroundColor,
    frontColor,
    animation: {
      duration: 120,
      timingFunc: 'easeIn',
    },
  });

  wx.setBackgroundColor({
    backgroundColor,
    bottomBackgroundColor: backgroundColor,
  });
};
