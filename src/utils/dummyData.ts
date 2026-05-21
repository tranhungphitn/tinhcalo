import { Meal, DailyGoal } from "../types";

export const DEFAULT_GOAL: DailyGoal = {
  calories: 1800,
  protein: 120, // grams
  carb: 200,    // grams
  fat: 55       // grams
};

export const getSeededMeals = (): Meal[] => {
  return [];
};
