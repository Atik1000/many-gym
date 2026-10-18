// Picks a meaningful icon for an amenity / payment method by keyword, so every list reads at a glance.
import { LuAccessibility as Accessibility, LuBaby as Baby, LuBanknote as Banknote, LuBath as Bath, LuBike as Bike, LuBuilding2 as Building2, LuCircleParking as CircleParking, LuCoffee as Coffee, LuCreditCard as CreditCard, LuDoorOpen as DoorOpen, LuDroplets as Droplets, LuFan as Fan, LuFlame as Flame, LuLandmark as Landmark, LuLock as Lock, LuRepeat as Repeat, LuShirt as Shirt, LuShowerHead as ShowerHead, LuSofa as Sofa, LuSparkles as Sparkles, LuWaves as Waves, LuWifi as Wifi, LuWallet as Wallet } from "react-icons/lu";
import type { IconType } from "react-icons";

const AMENITY: [RegExp, IconType][] = [
  [/shower/i, ShowerHead], [/changing room/i, DoorOpen], [/locker/i, Lock], [/towel/i, Shirt], [/sauna/i, Flame], [/steam/i, Droplets],
  [/pool|swim/i, Waves], [/hot tub/i, Bath], [/massage/i, Sparkles], [/air con/i, Fan], [/wi-?fi/i, Wifi], [/water/i, Droplets],
  [/seating/i, Sofa], [/cafe|smoothie|protein|vending/i, Coffee], [/bicycle|bike/i, Bike], [/parking/i, CircleParking],
  [/step-free|lift|accessible|toilet/i, Accessibility], [/child/i, Baby],
];
export const amenityIcon = (name: string): IconType => AMENITY.find(([re]) => re.test(name))?.[1] ?? Building2;

const PAYMENT: Record<string, IconType> = { Card: CreditCard, Cash: Banknote, "Bank transfer": Landmark, "Direct debit": Repeat };
export const paymentIcon = (method: string): IconType => PAYMENT[method] ?? Wallet;
