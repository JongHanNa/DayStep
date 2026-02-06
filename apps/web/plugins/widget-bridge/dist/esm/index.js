import { registerPlugin } from '@capacitor/core';
const WidgetBridge = registerPlugin('WidgetBridge', {
    web: () => import('./web').then(m => new m.WidgetBridgeWeb()),
});
export * from './definitions';
export { WidgetBridge };
