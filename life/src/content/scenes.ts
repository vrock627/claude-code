// Scene registry — every scene graph the reducer can address by id.

import type { Scene } from '../engine/types';
import { ENC_BAR, ENC_CAFE, ENC_PARK } from './encounters';
import { TEXT_HUB } from './texts';
import { DATE_COFFEE } from './dates/coffee';
import { DATE_DINNER } from './dates/dinner';
import { DATE_BAR } from './dates/bar';

export const SCENES: Record<string, Scene> = {
  [ENC_CAFE.id]: ENC_CAFE,
  [ENC_PARK.id]: ENC_PARK,
  [ENC_BAR.id]: ENC_BAR,
  [TEXT_HUB.id]: TEXT_HUB,
  [DATE_COFFEE.id]: DATE_COFFEE,
  [DATE_DINNER.id]: DATE_DINNER,
  [DATE_BAR.id]: DATE_BAR,
};
