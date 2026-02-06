import { registerPlugin } from '@capacitor/core';
import type { DayStepWidgetPlugin } from './definitions';

const DayStepWidget = registerPlugin<DayStepWidgetPlugin>('DayStepWidget');

export * from './definitions';
export { DayStepWidget };