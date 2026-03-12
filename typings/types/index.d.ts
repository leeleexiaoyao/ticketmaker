interface IAppOption {
  globalData: {
    version: string;
    remarkFontFamily: string;
    remarkFontLoaded: boolean;
  };
  tryLoadRemarkFont: () => void;
}
