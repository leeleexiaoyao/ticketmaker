interface IAppOption {
  globalData: {
    version: string;
    remarkFontFamilyMap: Record<string, string>;
    remarkFontLoadedMap: Record<string, boolean>;
    themeMode: 'dark' | 'light';
  };
  tryLoadRemarkFonts: () => void;
  tryLoadHomeTabFont: () => void;
}
