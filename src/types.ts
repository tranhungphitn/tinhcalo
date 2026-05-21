export interface FoodItem {
  foodName: string;
  quantity: string;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  
  // Base properties used for proportional macro scaling
  baseServingSize?: string;
  baseCalories?: number;
  baseProtein?: number;
  baseCarb?: number;
  baseFat?: number;
}

export interface Meal {
  id: string;
  mealName: string;
  timestamp: string; // ISO String (e.g. "2026-05-21T01:02:39Z")
  items: FoodItem[];
  total: {
    calories: number;
    protein: number;
    carb: number;
    fat: number;
  };
}

export interface DailyGoal {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface CustomFood {
  id: string;
  name: string;
  servingSize: string; // e.g. "100g", "1 quả", "1 bát"
  calories: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface Recipe {
  recipeName: string;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  prepTime: string;
  ingredients: string[];
  instructions: string[];
  benefits: string;
}
