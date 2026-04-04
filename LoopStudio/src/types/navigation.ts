export type RootStackParamList = {
  Home: undefined;
  Editor: { loopId: string };
  EffectBrowser: { loopId: string };
  EffectConfig: { loopId: string; effectInstanceId: string };
  Moments: { loopId: string };
  Export: { loopId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
