import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { type SupportedLanguage, useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { type DietEntry, type DietEntryDraft, type DietMealType, useWellness } from '@/components/app/wellness-context';
import { AppIcon } from '@/components/ui/app-icon';

type LocalizedText = {
  en: string;
  zh: string;
};

type LocalizedFoodCopy = {
  name: LocalizedText;
  servingLabel: LocalizedText;
};

type FoodCategory = {
  id: string;
  label: string;
  icon: ComponentProps<typeof AppIcon>['name'];
};

type FoodTemplate = {
  id: string;
  categoryId: string;
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  keywords: string[];
};

type FoodSpecTuple = [
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  string[],
];

const FOOD_CATEGORIES: FoodCategory[] = [
  { id: 'staples', label: 'Staples', icon: 'restaurant' },
  { id: 'protein', label: 'Protein & Dairy', icon: 'set-meal' },
  { id: 'fruit', label: 'Fruit', icon: 'filter-vintage' },
  { id: 'vegetables', label: 'Vegetables', icon: 'eco' },
  { id: 'nuts', label: 'Nuts & Beans', icon: 'spa' },
  { id: 'snacks', label: 'Snacks & Drinks', icon: 'local-cafe' },
  { id: 'meals', label: 'Meals', icon: 'fastfood' },
];

const FOOD_LIBRARY: FoodTemplate[] = [
  { id: 'rice-bowl', categoryId: 'staples', name: 'Steamed rice', servingLabel: '1 bowl', calories: 209, protein: 4, carbs: 46, fat: 0, keywords: ['rice', 'white rice', 'bowl'] },
  { id: 'brown-rice', categoryId: 'staples', name: 'Brown rice', servingLabel: '1 bowl', calories: 216, protein: 5, carbs: 45, fat: 2, keywords: ['brown rice', 'grain'] },
  { id: 'oatmeal', categoryId: 'staples', name: 'Oatmeal', servingLabel: '1 cup', calories: 154, protein: 6, carbs: 27, fat: 3, keywords: ['oats', 'breakfast', 'porridge'] },
  { id: 'sweet-potato', categoryId: 'staples', name: 'Steamed sweet potato', servingLabel: '1 small', calories: 84, protein: 2, carbs: 20, fat: 0, keywords: ['sweet potato', 'yam'] },
  { id: 'whole-wheat-bread', categoryId: 'staples', name: 'Whole wheat bread', servingLabel: '2 slices', calories: 138, protein: 7, carbs: 24, fat: 2, keywords: ['bread', 'toast'] },
  { id: 'bagel', categoryId: 'staples', name: 'Plain bagel', servingLabel: '1 bagel', calories: 245, protein: 9, carbs: 48, fat: 1, keywords: ['bagel', 'bread'] },
  { id: 'boiled-egg', categoryId: 'protein', name: 'Boiled egg', servingLabel: '1 egg', calories: 74, protein: 6, carbs: 1, fat: 5, keywords: ['egg', 'boiled egg'] },
  { id: 'fried-egg', categoryId: 'protein', name: 'Fried egg', servingLabel: '1 egg', calories: 117, protein: 6, carbs: 1, fat: 9, keywords: ['egg', 'fried egg'] },
  { id: 'chicken-breast', categoryId: 'protein', name: 'Chicken breast', servingLabel: '100 g', calories: 165, protein: 31, carbs: 0, fat: 4, keywords: ['chicken', 'breast', 'protein'] },
  { id: 'salmon', categoryId: 'protein', name: 'Salmon fillet', servingLabel: '100 g', calories: 208, protein: 20, carbs: 0, fat: 13, keywords: ['salmon', 'fish'] },
  { id: 'ground-beef', categoryId: 'protein', name: 'Lean ground beef', servingLabel: '100 g', calories: 217, protein: 26, carbs: 0, fat: 12, keywords: ['beef', 'ground beef'] },
  { id: 'greek-yogurt', categoryId: 'protein', name: 'Greek yogurt', servingLabel: '170 g', calories: 100, protein: 17, carbs: 6, fat: 0, keywords: ['yogurt', 'greek yogurt'] },
  { id: 'milk', categoryId: 'protein', name: '2% milk', servingLabel: '1 cup', calories: 122, protein: 8, carbs: 12, fat: 5, keywords: ['milk', 'dairy'] },
  { id: 'tofu', categoryId: 'protein', name: 'Firm tofu', servingLabel: '100 g', calories: 144, protein: 17, carbs: 3, fat: 8, keywords: ['tofu', 'soy'] },
  { id: 'apple', categoryId: 'fruit', name: 'Apple', servingLabel: '1 medium', calories: 95, protein: 0, carbs: 25, fat: 0, keywords: ['apple', 'fruit'] },
  { id: 'banana', categoryId: 'fruit', name: 'Banana', servingLabel: '1 banana', calories: 105, protein: 1, carbs: 27, fat: 0, keywords: ['banana', 'fruit'] },
  { id: 'grapes', categoryId: 'fruit', name: 'Grapes', servingLabel: '1 cup', calories: 104, protein: 1, carbs: 27, fat: 0, keywords: ['grapes', 'fruit'] },
  { id: 'blueberries', categoryId: 'fruit', name: 'Blueberries', servingLabel: '1 cup', calories: 85, protein: 1, carbs: 21, fat: 0, keywords: ['berries', 'blueberry'] },
  { id: 'orange', categoryId: 'fruit', name: 'Orange', servingLabel: '1 orange', calories: 62, protein: 1, carbs: 15, fat: 0, keywords: ['orange', 'citrus'] },
  { id: 'avocado', categoryId: 'fruit', name: 'Avocado', servingLabel: '1/2 avocado', calories: 120, protein: 2, carbs: 6, fat: 11, keywords: ['avocado'] },
  { id: 'broccoli', categoryId: 'vegetables', name: 'Broccoli', servingLabel: '1 cup', calories: 55, protein: 4, carbs: 11, fat: 1, keywords: ['broccoli', 'veg'] },
  { id: 'spinach', categoryId: 'vegetables', name: 'Spinach', servingLabel: '1 cup cooked', calories: 41, protein: 5, carbs: 7, fat: 1, keywords: ['spinach', 'greens'] },
  { id: 'salad', categoryId: 'vegetables', name: 'Mixed salad greens', servingLabel: '2 cups', calories: 25, protein: 2, carbs: 5, fat: 0, keywords: ['salad', 'greens'] },
  { id: 'cucumber', categoryId: 'vegetables', name: 'Cucumber', servingLabel: '1 cup', calories: 16, protein: 1, carbs: 4, fat: 0, keywords: ['cucumber'] },
  { id: 'carrots', categoryId: 'vegetables', name: 'Carrot sticks', servingLabel: '1 cup', calories: 50, protein: 1, carbs: 12, fat: 0, keywords: ['carrot', 'carrots'] },
  { id: 'edamame', categoryId: 'nuts', name: 'Edamame', servingLabel: '1 cup', calories: 188, protein: 18, carbs: 14, fat: 8, keywords: ['edamame', 'soy beans'] },
  { id: 'almonds', categoryId: 'nuts', name: 'Almonds', servingLabel: '28 g', calories: 164, protein: 6, carbs: 6, fat: 14, keywords: ['almonds', 'nuts'] },
  { id: 'peanut-butter', categoryId: 'nuts', name: 'Peanut butter', servingLabel: '2 tbsp', calories: 188, protein: 8, carbs: 7, fat: 16, keywords: ['peanut butter'] },
  { id: 'black-beans', categoryId: 'nuts', name: 'Black beans', servingLabel: '1/2 cup', calories: 114, protein: 8, carbs: 20, fat: 0, keywords: ['beans', 'black beans'] },
  { id: 'trail-mix', categoryId: 'nuts', name: 'Trail mix', servingLabel: '1/4 cup', calories: 173, protein: 4, carbs: 16, fat: 11, keywords: ['trail mix', 'nuts'] },
  { id: 'protein-bar', categoryId: 'snacks', name: 'Protein bar', servingLabel: '1 bar', calories: 210, protein: 20, carbs: 22, fat: 7, keywords: ['bar', 'protein bar'] },
  { id: 'latte', categoryId: 'snacks', name: 'Cafe latte', servingLabel: '1 cup', calories: 190, protein: 10, carbs: 19, fat: 8, keywords: ['coffee', 'latte'] },
  { id: 'soda', categoryId: 'snacks', name: 'Regular soda', servingLabel: '355 ml', calories: 140, protein: 0, carbs: 39, fat: 0, keywords: ['soda', 'cola'] },
  { id: 'orange-juice', categoryId: 'snacks', name: 'Orange juice', servingLabel: '1 cup', calories: 112, protein: 2, carbs: 26, fat: 0, keywords: ['juice', 'orange juice'] },
  { id: 'chips', categoryId: 'snacks', name: 'Potato chips', servingLabel: '28 g', calories: 152, protein: 2, carbs: 15, fat: 10, keywords: ['chips'] },
  { id: 'ice-cream', categoryId: 'snacks', name: 'Vanilla ice cream', servingLabel: '1/2 cup', calories: 137, protein: 2, carbs: 16, fat: 7, keywords: ['ice cream', 'dessert'] },
  { id: 'chicken-bowl', categoryId: 'meals', name: 'Chicken rice bowl', servingLabel: '1 bowl', calories: 520, protein: 34, carbs: 54, fat: 18, keywords: ['bowl', 'chicken bowl'] },
  { id: 'salmon-plate', categoryId: 'meals', name: 'Salmon plate', servingLabel: '1 plate', calories: 610, protein: 38, carbs: 42, fat: 30, keywords: ['salmon plate', 'dinner'] },
  { id: 'poke-bowl', categoryId: 'meals', name: 'Poke bowl', servingLabel: '1 bowl', calories: 540, protein: 28, carbs: 58, fat: 22, keywords: ['poke', 'bowl'] },
  { id: 'burger', categoryId: 'meals', name: 'Cheeseburger', servingLabel: '1 burger', calories: 303, protein: 17, carbs: 30, fat: 14, keywords: ['burger', 'cheeseburger'] },
  { id: 'pizza-slice', categoryId: 'meals', name: 'Cheese pizza slice', servingLabel: '1 slice', calories: 285, protein: 12, carbs: 36, fat: 10, keywords: ['pizza'] },
  { id: 'sushi-roll', categoryId: 'meals', name: 'California roll', servingLabel: '8 pieces', calories: 255, protein: 9, carbs: 38, fat: 7, keywords: ['sushi', 'roll'] },
  { id: 'ramen', categoryId: 'meals', name: 'Ramen bowl', servingLabel: '1 bowl', calories: 480, protein: 18, carbs: 58, fat: 20, keywords: ['ramen', 'noodles'] },
  { id: 'caesar-salad', categoryId: 'meals', name: 'Chicken caesar salad', servingLabel: '1 salad', calories: 470, protein: 31, carbs: 18, fat: 29, keywords: ['salad', 'caesar'] },
];

const FOOD_CATEGORY_LABELS: Record<string, LocalizedText> = {
  staples: { en: 'Staples', zh: '主食' },
  protein: { en: 'Protein & Dairy', zh: '肉蛋奶' },
  fruit: { en: 'Fruit', zh: '水果' },
  vegetables: { en: 'Vegetables', zh: '蔬菜' },
  nuts: { en: 'Nuts & Beans', zh: '豆类坚果' },
  snacks: { en: 'Snacks & Drinks', zh: '零食饮料' },
  meals: { en: 'Meals', zh: '整餐' },
};

const FOOD_COPY: Record<string, LocalizedFoodCopy> = {
  'rice-bowl': { name: { en: 'Steamed rice', zh: '米饭' }, servingLabel: { en: '1 bowl', zh: '1碗' } },
  'brown-rice': { name: { en: 'Brown rice', zh: '糙米饭' }, servingLabel: { en: '1 bowl', zh: '1碗' } },
  oatmeal: { name: { en: 'Oatmeal', zh: '燕麦粥' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  'sweet-potato': { name: { en: 'Steamed sweet potato', zh: '蒸红薯' }, servingLabel: { en: '1 small', zh: '1个小的' } },
  'whole-wheat-bread': { name: { en: 'Whole wheat bread', zh: '全麦面包' }, servingLabel: { en: '2 slices', zh: '2片' } },
  bagel: { name: { en: 'Plain bagel', zh: '原味贝果' }, servingLabel: { en: '1 bagel', zh: '1个' } },
  'boiled-egg': { name: { en: 'Boiled egg', zh: '水煮蛋' }, servingLabel: { en: '1 egg', zh: '1个' } },
  'fried-egg': { name: { en: 'Fried egg', zh: '煎蛋' }, servingLabel: { en: '1 egg', zh: '1个' } },
  'chicken-breast': { name: { en: 'Chicken breast', zh: '鸡胸肉' }, servingLabel: { en: '100 g', zh: '100克' } },
  salmon: { name: { en: 'Salmon fillet', zh: '三文鱼排' }, servingLabel: { en: '100 g', zh: '100克' } },
  'ground-beef': { name: { en: 'Lean ground beef', zh: '瘦牛肉末' }, servingLabel: { en: '100 g', zh: '100克' } },
  'greek-yogurt': { name: { en: 'Greek yogurt', zh: '希腊酸奶' }, servingLabel: { en: '170 g', zh: '170克' } },
  milk: { name: { en: '2% milk', zh: '2%牛奶' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  tofu: { name: { en: 'Firm tofu', zh: '老豆腐' }, servingLabel: { en: '100 g', zh: '100克' } },
  apple: { name: { en: 'Apple', zh: '苹果' }, servingLabel: { en: '1 medium', zh: '1个中等大小' } },
  banana: { name: { en: 'Banana', zh: '香蕉' }, servingLabel: { en: '1 banana', zh: '1根' } },
  grapes: { name: { en: 'Grapes', zh: '葡萄' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  blueberries: { name: { en: 'Blueberries', zh: '蓝莓' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  orange: { name: { en: 'Orange', zh: '橙子' }, servingLabel: { en: '1 orange', zh: '1个' } },
  avocado: { name: { en: 'Avocado', zh: '牛油果' }, servingLabel: { en: '1/2 avocado', zh: '半个' } },
  broccoli: { name: { en: 'Broccoli', zh: '西兰花' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  spinach: { name: { en: 'Spinach', zh: '菠菜' }, servingLabel: { en: '1 cup cooked', zh: '熟的1杯' } },
  salad: { name: { en: 'Mixed salad greens', zh: '综合生菜沙拉' }, servingLabel: { en: '2 cups', zh: '2杯' } },
  cucumber: { name: { en: 'Cucumber', zh: '黄瓜' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  carrots: { name: { en: 'Carrot sticks', zh: '胡萝卜条' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  edamame: { name: { en: 'Edamame', zh: '毛豆' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  almonds: { name: { en: 'Almonds', zh: '杏仁' }, servingLabel: { en: '28 g', zh: '28克' } },
  'peanut-butter': { name: { en: 'Peanut butter', zh: '花生酱' }, servingLabel: { en: '2 tbsp', zh: '2汤匙' } },
  'black-beans': { name: { en: 'Black beans', zh: '黑豆' }, servingLabel: { en: '1/2 cup', zh: '半杯' } },
  'trail-mix': { name: { en: 'Trail mix', zh: '混合坚果' }, servingLabel: { en: '1/4 cup', zh: '1/4杯' } },
  'protein-bar': { name: { en: 'Protein bar', zh: '蛋白棒' }, servingLabel: { en: '1 bar', zh: '1根' } },
  latte: { name: { en: 'Cafe latte', zh: '拿铁' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  soda: { name: { en: 'Regular soda', zh: '含糖汽水' }, servingLabel: { en: '355 ml', zh: '355毫升' } },
  'orange-juice': { name: { en: 'Orange juice', zh: '橙汁' }, servingLabel: { en: '1 cup', zh: '1杯' } },
  chips: { name: { en: 'Potato chips', zh: '薯片' }, servingLabel: { en: '28 g', zh: '28克' } },
  'ice-cream': { name: { en: 'Vanilla ice cream', zh: '香草冰淇淋' }, servingLabel: { en: '1/2 cup', zh: '半杯' } },
  'chicken-bowl': { name: { en: 'Chicken rice bowl', zh: '鸡肉饭碗' }, servingLabel: { en: '1 bowl', zh: '1碗' } },
  'salmon-plate': { name: { en: 'Salmon plate', zh: '三文鱼套餐' }, servingLabel: { en: '1 plate', zh: '1份' } },
  'poke-bowl': { name: { en: 'Poke bowl', zh: '波奇饭' }, servingLabel: { en: '1 bowl', zh: '1碗' } },
  burger: { name: { en: 'Cheeseburger', zh: '芝士汉堡' }, servingLabel: { en: '1 burger', zh: '1个' } },
  'pizza-slice': { name: { en: 'Cheese pizza slice', zh: '芝士披萨片' }, servingLabel: { en: '1 slice', zh: '1片' } },
  'sushi-roll': { name: { en: 'California roll', zh: '加州卷' }, servingLabel: { en: '8 pieces', zh: '8块' } },
  ramen: { name: { en: 'Ramen bowl', zh: '拉面' }, servingLabel: { en: '1 bowl', zh: '1碗' } },
  'caesar-salad': { name: { en: 'Chicken caesar salad', zh: '鸡肉凯撒沙拉' }, servingLabel: { en: '1 salad', zh: '1份沙拉' } },
};

const EXTRA_FOOD_SPECS: FoodSpecTuple[] = [
  ['quinoa', 'staples', 'Cooked quinoa', '熟藜麦', '1 cup', '1杯', 222, 8, 39, 4, ['quinoa', 'grain']],
  ['pasta', 'staples', 'Cooked pasta', '熟意面', '1 cup', '1杯', 221, 8, 43, 1, ['pasta', 'noodles']],
  ['udon', 'staples', 'Udon noodles', '乌冬面', '1 bowl', '1碗', 240, 7, 48, 1, ['udon', 'noodles']],
  ['corn', 'staples', 'Sweet corn', '甜玉米', '1 ear', '1根', 96, 3, 21, 1, ['corn']],
  ['potato', 'staples', 'Baked potato', '烤土豆', '1 medium', '1个中等大小', 161, 4, 37, 0, ['potato']],
  ['wrap', 'staples', 'Whole wheat wrap', '全麦卷饼皮', '1 wrap', '1张', 130, 5, 22, 3, ['wrap', 'tortilla']],
  ['couscous', 'staples', 'Cooked couscous', '熟库斯库斯', '1 cup', '1杯', 176, 6, 36, 0, ['couscous']],
  ['english-muffin', 'staples', 'English muffin', '英式松饼', '1 muffin', '1个', 134, 5, 26, 1, ['muffin', 'bread']],
  ['shrimp', 'protein', 'Shrimp', '虾仁', '100 g', '100克', 99, 24, 0, 0, ['shrimp']],
  ['tuna', 'protein', 'Tuna in water', '水浸金枪鱼', '100 g', '100克', 116, 26, 0, 1, ['tuna', 'fish']],
  ['turkey-breast', 'protein', 'Turkey breast', '火鸡胸肉', '100 g', '100克', 135, 29, 0, 1, ['turkey']],
  ['cottage-cheese', 'protein', 'Cottage cheese', '茅屋奶酪', '1/2 cup', '半杯', 103, 12, 4, 4, ['cheese', 'cottage cheese']],
  ['tempeh', 'protein', 'Tempeh', '丹贝', '100 g', '100克', 193, 20, 8, 11, ['tempeh', 'soy']],
  ['pork-loin', 'protein', 'Pork loin', '猪里脊', '100 g', '100克', 143, 26, 0, 4, ['pork']],
  ['mozzarella', 'protein', 'Part-skim mozzarella', '低脂马苏里拉', '28 g', '28克', 72, 7, 1, 4, ['cheese', 'mozzarella']],
  ['protein-shake', 'protein', 'Whey protein shake', '乳清蛋白奶昔', '1 scoop', '1勺', 120, 24, 3, 1, ['protein shake', 'whey']],
  ['strawberries', 'fruit', 'Strawberries', '草莓', '1 cup', '1杯', 49, 1, 12, 0, ['strawberry', 'berries']],
  ['pear', 'fruit', 'Pear', '梨', '1 medium', '1个中等大小', 101, 1, 27, 0, ['pear']],
  ['peach', 'fruit', 'Peach', '桃子', '1 medium', '1个中等大小', 59, 1, 14, 0, ['peach']],
  ['watermelon', 'fruit', 'Watermelon', '西瓜', '2 cups', '2杯', 91, 2, 23, 0, ['watermelon']],
  ['pineapple', 'fruit', 'Pineapple', '菠萝', '1 cup', '1杯', 83, 1, 22, 0, ['pineapple']],
  ['mango', 'fruit', 'Mango', '芒果', '1 cup', '1杯', 99, 1, 25, 1, ['mango']],
  ['kiwi', 'fruit', 'Kiwi', '猕猴桃', '2 kiwis', '2个', 84, 2, 21, 1, ['kiwi']],
  ['cherries', 'fruit', 'Cherries', '樱桃', '1 cup', '1杯', 97, 2, 25, 0, ['cherry', 'cherries']],
  ['bell-pepper', 'vegetables', 'Bell pepper', '甜椒', '1 cup', '1杯', 39, 1, 9, 0, ['pepper']],
  ['asparagus', 'vegetables', 'Asparagus', '芦笋', '1 cup', '1杯', 27, 3, 5, 0, ['asparagus']],
  ['mushroom', 'vegetables', 'Mushrooms', '蘑菇', '1 cup', '1杯', 21, 3, 3, 0, ['mushroom']],
  ['zucchini', 'vegetables', 'Zucchini', '西葫芦', '1 cup', '1杯', 27, 2, 5, 0, ['zucchini']],
  ['cauliflower', 'vegetables', 'Cauliflower', '菜花', '1 cup', '1杯', 29, 2, 5, 0, ['cauliflower']],
  ['green-beans', 'vegetables', 'Green beans', '四季豆', '1 cup', '1杯', 44, 2, 10, 0, ['green beans']],
  ['cabbage', 'vegetables', 'Cabbage', '卷心菜', '1 cup', '1杯', 22, 1, 5, 0, ['cabbage']],
  ['tomato', 'vegetables', 'Tomato', '番茄', '1 medium', '1个中等大小', 22, 1, 5, 0, ['tomato']],
  ['walnuts', 'nuts', 'Walnuts', '核桃', '28 g', '28克', 185, 4, 4, 18, ['walnuts']],
  ['pistachios', 'nuts', 'Pistachios', '开心果', '28 g', '28克', 159, 6, 8, 13, ['pistachio']],
  ['cashews', 'nuts', 'Cashews', '腰果', '28 g', '28克', 157, 5, 9, 12, ['cashews']],
  ['chickpeas', 'nuts', 'Chickpeas', '鹰嘴豆', '1/2 cup', '半杯', 134, 7, 22, 2, ['chickpeas', 'garbanzo']],
  ['lentils', 'nuts', 'Lentils', '小扁豆', '1/2 cup', '半杯', 115, 9, 20, 0, ['lentils']],
  ['hummus', 'nuts', 'Hummus', '鹰嘴豆泥', '1/4 cup', '1/4杯', 166, 5, 14, 10, ['hummus']],
  ['peanuts', 'nuts', 'Peanuts', '花生', '28 g', '28克', 161, 7, 5, 14, ['peanuts']],
  ['pumpkin-seeds', 'nuts', 'Pumpkin seeds', '南瓜子', '28 g', '28克', 160, 8, 4, 13, ['pumpkin seeds']],
  ['dark-chocolate', 'snacks', 'Dark chocolate', '黑巧克力', '30 g', '30克', 170, 2, 13, 12, ['chocolate']],
  ['granola-bar', 'snacks', 'Granola bar', '燕麦能量棒', '1 bar', '1根', 190, 4, 29, 7, ['granola', 'bar']],
  ['popcorn', 'snacks', 'Air-popped popcorn', '空气爆米花', '3 cups', '3杯', 93, 3, 19, 1, ['popcorn']],
  ['smoothie', 'snacks', 'Fruit smoothie', '水果奶昔', '1 cup', '1杯', 180, 4, 35, 2, ['smoothie']],
  ['sports-drink', 'snacks', 'Sports drink', '运动饮料', '500 ml', '500毫升', 110, 0, 28, 0, ['sports drink']],
  ['cookies', 'snacks', 'Chocolate chip cookies', '巧克力曲奇', '2 cookies', '2块', 160, 2, 22, 7, ['cookies']],
  ['banana-bread', 'snacks', 'Banana bread', '香蕉面包', '1 slice', '1片', 196, 3, 32, 7, ['banana bread']],
  ['yogurt-drink', 'snacks', 'Yogurt drink', '酸奶饮品', '1 bottle', '1瓶', 150, 8, 20, 4, ['yogurt drink']],
  ['burrito-bowl', 'meals', 'Chicken burrito bowl', '鸡肉墨西哥饭碗', '1 bowl', '1碗', 560, 35, 58, 20, ['burrito bowl']],
  ['turkey-sandwich', 'meals', 'Turkey sandwich', '火鸡三明治', '1 sandwich', '1份', 360, 28, 34, 12, ['sandwich']],
  ['grilled-salad', 'meals', 'Grilled chicken salad', '烤鸡沙拉', '1 salad', '1份沙拉', 390, 34, 18, 19, ['chicken salad']],
  ['pho', 'meals', 'Beef pho', '牛肉河粉', '1 bowl', '1碗', 460, 27, 52, 14, ['pho', 'noodle soup']],
  ['bibimbap', 'meals', 'Bibimbap', '韩式拌饭', '1 bowl', '1碗', 530, 22, 68, 18, ['bibimbap']],
  ['fried-rice', 'meals', 'Chicken fried rice', '鸡肉炒饭', '1 plate', '1盘', 520, 24, 62, 18, ['fried rice']],
  ['bolognese', 'meals', 'Pasta bolognese', '肉酱意面', '1 plate', '1盘', 610, 29, 72, 22, ['bolognese', 'pasta']],
  ['salmon-bowl', 'meals', 'Salmon rice bowl', '三文鱼饭碗', '1 bowl', '1碗', 570, 32, 54, 24, ['salmon bowl']],
];

const EXTRA_FOOD_COPY = Object.fromEntries(
  EXTRA_FOOD_SPECS.map(([id, , enName, zhName, enServing, zhServing]) => [
    id,
    { name: { en: enName, zh: zhName }, servingLabel: { en: enServing, zh: zhServing } },
  ])
) as Record<string, LocalizedFoodCopy>;

const ALL_FOODS: FoodTemplate[] = [
  ...FOOD_LIBRARY,
  ...EXTRA_FOOD_SPECS.map(
    ([id, categoryId, name, , servingLabel, , calories, protein, carbs, fat, keywords]) => ({
      id,
      categoryId,
      name,
      servingLabel,
      calories,
      protein,
      carbs,
      fat,
      keywords,
    })
  ),
];

function getFoodCategoryLabel(categoryId: string, language: SupportedLanguage) {
  return FOOD_CATEGORY_LABELS[categoryId]?.[language] ?? categoryId;
}

function getFoodName(food: FoodTemplate, language: SupportedLanguage) {
  return (EXTRA_FOOD_COPY[food.id] ?? FOOD_COPY[food.id])?.name[language] ?? food.name;
}

function getFoodServingLabel(food: FoodTemplate, language: SupportedLanguage) {
  return (EXTRA_FOOD_COPY[food.id] ?? FOOD_COPY[food.id])?.servingLabel[language] ?? food.servingLabel;
}

const MEAL_OPTIONS: { id: DietMealType; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

const CATEGORY_LOOKUP = Object.fromEntries(FOOD_CATEGORIES.map((category) => [category.id, category]));

function parsePositiveNumber(input: string, fallback: number) {
  const value = Number(input.trim());
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function EntryActionButton({ icon, onPress, tone = 'neutral' }: { icon: ComponentProps<typeof AppIcon>['name']; onPress: () => void; tone?: 'neutral' | 'danger' }) {
  return (
    <Pressable onPress={onPress} style={[styles.entryActionButton, tone === 'danger' && styles.entryActionDanger]}>
      <AppIcon color={tone === 'danger' ? '#D05068' : '#56637E'} name={icon} size={16} />
    </Pressable>
  );
}

export default function DietScreen() {
  const { width } = useWindowDimensions();
  const { effectiveLanguage, t } = useLanguage();
  const { theme } = useAppTheme();
  const {
    addDietEntry,
    deleteDietEntry,
    dietEntries,
    dietSummary,
    todayDietEntries,
    updateDietEntry,
    updateDietSummary,
  } = useWellness();
  const [selectedMealType, setSelectedMealType] = useState<DietMealType>('dinner');
  const [selectedCategoryId, setSelectedCategoryId] = useState(FOOD_CATEGORIES[0]?.id ?? 'staples');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [servingsInput, setServingsInput] = useState('1');
  const [targetInput, setTargetInput] = useState(String(dietSummary.targetCalories));
  const [waterInput, setWaterInput] = useState(String(dietSummary.waterMl));
  const [customNameInput, setCustomNameInput] = useState('');
  const [customCaloriesInput, setCustomCaloriesInput] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const isChinese = effectiveLanguage === 'zh';
  const isCompactMobile = width < 430;

  useEffect(() => {
    if (isEditingTarget) {
      return;
    }

    setTargetInput(String(dietSummary.targetCalories));
  }, [dietSummary.targetCalories, isEditingTarget]);

  const selectedFood = useMemo(
    () => ALL_FOODS.find((item) => item.id === selectedFoodId) ?? null,
    [selectedFoodId]
  );
  const servings = parsePositiveNumber(servingsInput, 1);
  const remainingCalories = Math.max(0, dietSummary.targetCalories - dietSummary.consumedCalories);
  const progressPercent = dietSummary.targetCalories > 0 ? Math.min(100, Math.round((dietSummary.consumedCalories / dietSummary.targetCalories) * 100)) : 0;
  const isSearchingAllFoods = searchQuery.trim().length > 0;
  const filteredFoods = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return ALL_FOODS.filter((food) => {
      const categoryMatch = normalized.length > 0 || food.categoryId === selectedCategoryId;
      const localizedName = getFoodName(food, effectiveLanguage).toLowerCase();
      const localizedServing = getFoodServingLabel(food, effectiveLanguage).toLowerCase();
      const localizedCategory = getFoodCategoryLabel(food.categoryId, effectiveLanguage).toLowerCase();
      const searchMatch =
        normalized.length === 0 ||
        food.name.toLowerCase().includes(normalized) ||
        localizedName.includes(normalized) ||
        localizedServing.includes(normalized) ||
        localizedCategory.includes(normalized) ||
        food.keywords.some((keyword) => keyword.toLowerCase().includes(normalized));
      return categoryMatch && searchMatch;
    });
  }, [effectiveLanguage, searchQuery, selectedCategoryId]);
  const selectedMealEntries = useMemo(
    () => todayDietEntries.filter((entry) => entry.mealType === selectedMealType),
    [selectedMealType, todayDietEntries]
  );
  const selectedMealCalories = useMemo(
    () => selectedMealEntries.reduce((sum, entry) => sum + entry.calories, 0),
    [selectedMealEntries]
  );
  const showCategoryRail = width >= 920;

  const resetComposer = () => {
    setSelectedFoodId(null);
    setServingsInput('1');
    setCustomNameInput('');
    setCustomCaloriesInput('');
    setEditingEntryId(null);
  };

  const buildDraft = (): DietEntryDraft | null => {
    if (selectedFood) {
      return {
        name: selectedFood.name,
        categoryId: selectedFood.categoryId,
        mealType: selectedMealType,
        servingLabel: selectedFood.servingLabel,
        servings,
        caloriesPerServing: selectedFood.calories,
        proteinPerServing: selectedFood.protein,
        carbsPerServing: selectedFood.carbs,
        fatPerServing: selectedFood.fat,
        foodTemplateId: selectedFood.id,
      };
    }

    const customName = customNameInput.trim();
    if (customName.length === 0) {
      return null;
    }

    return {
      name: customName,
      categoryId: selectedCategoryId,
      mealType: selectedMealType,
      servingLabel: isChinese ? '1份自定义记录' : '1 custom entry',
      servings,
      caloriesPerServing: parsePositiveNumber(customCaloriesInput, 0),
      proteinPerServing: 0,
      carbsPerServing: 0,
      fatPerServing: 0,
      foodTemplateId: null,
    };
  };

  const previewDraft = buildDraft();
  const previewCalories = previewDraft ? Math.round(previewDraft.caloriesPerServing * previewDraft.servings) : 0;
  const canSaveEntry = Boolean(previewDraft && previewCalories > 0);

  const saveDietTarget = () => {
    updateDietSummary({
      targetCalories: Math.max(1200, Math.round(parsePositiveNumber(targetInput, dietSummary.targetCalories))),
    });
    setIsEditingTarget(false);
  };

  const saveWaterGoal = () => {
    updateDietSummary({
      waterMl: Math.max(0, Math.round(parsePositiveNumber(waterInput, dietSummary.waterMl))),
    });
  };

  const beginEditEntry = (entry: DietEntry) => {
    setEditingEntryId(entry.id);
    setSelectedMealType(entry.mealType);
    setServingsInput(String(entry.servings));

    if (entry.foodTemplateId) {
      const template = ALL_FOODS.find((item) => item.id === entry.foodTemplateId);
      if (template) {
        setSelectedCategoryId(template.categoryId);
        setSelectedFoodId(template.id);
        setCustomNameInput('');
        setCustomCaloriesInput('');
        return;
      }
    }

    setSelectedFoodId(null);
    setSelectedCategoryId(entry.categoryId || FOOD_CATEGORIES[0]?.id || 'staples');
    setCustomNameInput(entry.name);
    setCustomCaloriesInput(String(entry.caloriesPerServing));
  };

  const handleSaveEntry = () => {
    const draft = buildDraft();
    if (!draft || draft.caloriesPerServing <= 0) {
      return;
    }

    if (editingEntryId) {
      const existing = dietEntries.find((entry) => entry.id === editingEntryId);
      updateDietEntry(editingEntryId, {
        ...draft,
        createdAt: existing?.createdAt ?? Date.now(),
      });
    } else {
      addDietEntry(draft);
    }

    resetComposer();
  };

  const quickAddFood = (food: FoodTemplate) => {
    addDietEntry({
      name: food.name,
      categoryId: food.categoryId,
      mealType: selectedMealType,
      servingLabel: food.servingLabel,
      servings: 1,
      caloriesPerServing: food.calories,
      proteinPerServing: food.protein,
      carbsPerServing: food.carbs,
      fatPerServing: food.fat,
      foodTemplateId: food.id,
    });
  };

  const groupedEntries = useMemo(() => {
    return MEAL_OPTIONS.map((meal) => ({
      meal,
      entries: todayDietEntries.filter((entry) => entry.mealType === meal.id),
    })).filter((group) => group.entries.length > 0);
  }, [todayDietEntries]);

  const mealLabel = (mealType: DietMealType) => t(`diet.${mealType}`);
  const categoryLabel = (categoryId: string) => {
    switch (categoryId) {
      case 'staples':
        return t('diet.staples');
      case 'protein':
        return t('diet.protein');
      case 'fruit':
        return t('diet.fruit');
      case 'vegetables':
        return t('diet.vegetables');
      case 'nuts':
        return t('diet.nuts');
      case 'snacks':
        return t('diet.snacks');
      case 'meals':
        return t('diet.mealCategory');
      default:
        return t('diet.foods');
    }
  };

  return (
    <ScreenShell title={t('diet.title')} subtitle={t('diet.subtitle')}>
      <AppCard delay={80}>
        <SectionLabel text={t('diet.caloriesLeft')} />
        <CardTitle accent="#2CB67D" icon="restaurant-menu" title={t('diet.title')} />
        <Text style={styles.bigKcal}>{dietSummary.consumedCalories} / {dietSummary.targetCalories} kcal</Text>
        <View style={styles.progressMetaRow}>
          <Text style={styles.progressMeta}>{`${remainingCalories} kcal`}</Text>
          <Text style={styles.progressMeta}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: theme.primary }]} />
        </View>
        <View style={styles.topGoalRow}>
          <View style={[styles.topGoalField, isCompactMobile && styles.topGoalFieldCompact]}>
            <Text style={styles.inputLabel}>{t('diet.targetCalories')}</Text>
            <TextInput
              editable={isEditingTarget}
              value={targetInput}
              onChangeText={setTargetInput}
              keyboardType="number-pad"
              placeholder={t('diet.targetCalories')}
              placeholderTextColor="#8A93AB"
              style={[styles.input, !isEditingTarget && styles.inputDisabled]}
            />
          </View>
          <Pressable
            onPress={() => {
              if (isEditingTarget) {
                saveDietTarget();
                return;
              }
              setIsEditingTarget(true);
            }}
            style={[
              styles.inlineActionButton,
              isCompactMobile && styles.inlineActionButtonCompact,
              { backgroundColor: isEditingTarget ? theme.primary : `${theme.primary}12`, borderColor: `${theme.primary}35` },
            ]}>
            <Text style={[styles.inlineActionText, { color: isEditingTarget ? '#FFFFFF' : theme.primary }]}>
              {isEditingTarget ? t('common.save') : t('common.edit')}
            </Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard delay={115}>
        <SectionLabel text={t('diet.meals')} />
        <View style={styles.mealHeaderRow}>
          {MEAL_OPTIONS.map((meal) => {
            const selected = meal.id === selectedMealType;
            return (
              <Pressable
                key={meal.id}
                onPress={() => setSelectedMealType(meal.id)}
                style={[styles.mealPill, selected && { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}66` }]}>
                <Text style={[styles.mealPillText, selected && { color: theme.primary }]}>{mealLabel(meal.id)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.searchRow}>
          <AppIcon color="#6B7491" name="search" size={18} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('diet.searchPlaceholder')}
            placeholderTextColor="#8A93AB"
            style={styles.searchInput}
          />
        </View>

        <View style={[styles.libraryLayout, showCategoryRail && styles.libraryLayoutWide]}>
          <View style={[styles.categoryRail, showCategoryRail && styles.categoryRailWide]}>
            {FOOD_CATEGORIES.map((category) => {
              const selected = category.id === selectedCategoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                  style={[styles.categoryPill, selected && { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}50` }]}>
                  <AppIcon color={selected ? theme.primary : '#5A6586'} name={category.icon} size={16} />
                  <Text style={[styles.categoryPillText, selected && { color: theme.primary }]}>{categoryLabel(category.id)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.foodColumn}>
            <View style={styles.foodListHeader}>
              <Text style={styles.foodListTitle}>{isSearchingAllFoods ? t('diet.foods') : categoryLabel(selectedCategoryId)}</Text>
              <Text style={styles.foodListMeta}>{t('diet.loggedForMeal', { meal: mealLabel(selectedMealType), calories: selectedMealCalories })}</Text>
            </View>
            <View style={styles.foodList}>
              {filteredFoods.length === 0 ? <Text style={styles.emptyState}>{t('diet.noMatches')}</Text> : null}
              {filteredFoods.map((food) => {
                const selected = food.id === selectedFoodId;
                const displayName = getFoodName(food, effectiveLanguage);
                const servingLabel = getFoodServingLabel(food, effectiveLanguage);
                return (
                  <Pressable
                    key={food.id}
                    onPress={() => {
                      setSelectedFoodId(food.id);
                      setCustomNameInput('');
                      setCustomCaloriesInput('');
                    }}
                    style={[styles.foodRow, selected && { borderColor: `${theme.primary}55`, backgroundColor: `${theme.primary}10` }]}>
                    <View style={[styles.foodIconWrap, { backgroundColor: `${theme.primary}14` }]}>
                      <AppIcon color={theme.primary} name={CATEGORY_LOOKUP[food.categoryId]?.icon ?? 'restaurant'} size={18} />
                    </View>
                    <View style={styles.foodCopy}>
                      <Text style={[styles.foodName, selected && { color: theme.primary }]}>{displayName}</Text>
                      <Text style={styles.foodMeta}>{food.calories} kcal / {servingLabel}</Text>
                    </View>
                    <View style={styles.foodActions}>
                      <Text style={styles.foodMacroMeta}>
                        {isChinese ? `蛋${food.protein} · 碳${food.carbs} · 脂${food.fat}` : `${food.protein}P · ${food.carbs}C · ${food.fat}F`}
                      </Text>
                      <Pressable onPress={() => quickAddFood(food)} style={styles.quickAddButton}>
                        <AppIcon color={theme.primary} name="add" size={18} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </AppCard>

      <AppCard delay={150}>
        <SectionLabel text={t('diet.quickAdd')} />
        {editingEntryId ? (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerText}>{`${t('common.edit')} · ${mealLabel(selectedMealType)}`}</Text>
            <Pressable onPress={resetComposer}>
              <Text style={[styles.linkText, { color: theme.primary }]}>{t('diet.cancelEdit')}</Text>
            </Pressable>
          </View>
        ) : null}

        {selectedFood ? (
          <View style={styles.selectionCard}>
            <View>
              <Text style={styles.selectionTitle}>{getFoodName(selectedFood, effectiveLanguage)}</Text>
              <Text style={styles.selectionMeta}>
                {isChinese
                  ? `${selectedFood.calories} 千卡 / ${getFoodServingLabel(selectedFood, effectiveLanguage)}`
                  : `${selectedFood.calories} kcal per ${getFoodServingLabel(selectedFood, effectiveLanguage)}`}
              </Text>
            </View>
            <View style={styles.servingRow}>
              <Text style={styles.inputLabel}>{t('diet.servings')}</Text>
              <TextInput
                value={servingsInput}
                onChangeText={setServingsInput}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor="#8A93AB"
                style={[styles.input, styles.servingInput]}
              />
            </View>
            <Text style={styles.previewText}>
              {isChinese
                ? `${t('diet.previewEntry')}：${previewCalories} 千卡 · 蛋白 ${Math.round((selectedFood.protein ?? 0) * servings)}g · 碳水 ${Math.round((selectedFood.carbs ?? 0) * servings)}g · 脂肪 ${Math.round((selectedFood.fat ?? 0) * servings)}g`
                : `${t('diet.previewEntry')}: ${previewCalories} kcal · ${Math.round((selectedFood.protein ?? 0) * servings)}P · ${Math.round((selectedFood.carbs ?? 0) * servings)}C · ${Math.round((selectedFood.fat ?? 0) * servings)}F`}
            </Text>
          </View>
        ) : null}

        <Text style={styles.customHeading}>{t('diet.customFood')}</Text>
        <View style={styles.inputGroup}>
          <TextInput
            value={customNameInput}
            onChangeText={(value) => {
              setCustomNameInput(value);
              if (value.trim().length > 0) {
                setSelectedFoodId(null);
              }
            }}
            placeholder={t('diet.customFoodName')}
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
          <TextInput
            value={customCaloriesInput}
            onChangeText={setCustomCaloriesInput}
            keyboardType="number-pad"
            placeholder={t('diet.customCalories')}
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
        </View>

        <Pressable disabled={!canSaveEntry} onPress={handleSaveEntry} style={[styles.primaryButton, { backgroundColor: canSaveEntry ? theme.primary : '#AEB8D4' }]}>
          <Text style={styles.primaryButtonText}>{editingEntryId ? t('diet.updateEntry') : t('diet.addEntry')}</Text>
        </Pressable>
      </AppCard>

      <AppCard delay={190}>
        <SectionLabel text={t('diet.waterMl')} />
        <View style={styles.nutrientRow}>
          <TextInput value={waterInput} onChangeText={setWaterInput} keyboardType="number-pad" placeholder={t('diet.waterMl')} placeholderTextColor="#8A93AB" style={[styles.input, styles.nutrientInput]} />
        </View>
        <Pressable onPress={saveWaterGoal} style={[styles.secondaryButton, { borderColor: `${theme.primary}40` }]}>
          <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>{t('common.save')}</Text>
        </Pressable>
      </AppCard>

      <AppCard delay={230}>
        <SectionLabel text={t('diet.meals')} />
        {groupedEntries.length === 0 ? <Text style={styles.emptyState}>{t('diet.noEntries')}</Text> : null}
        {groupedEntries.map((group) => (
          <View key={group.meal.id} style={styles.mealSection}>
            <View style={styles.mealSectionHeader}>
              <Text style={styles.mealSectionTitle}>{mealLabel(group.meal.id)}</Text>
              <Text style={styles.mealSectionMeta}>{group.entries.reduce((sum, entry) => sum + entry.calories, 0)} kcal</Text>
            </View>
            {group.entries.map((entry) => {
              const template = entry.foodTemplateId
                ? ALL_FOODS.find((item) => item.id === entry.foodTemplateId) ?? null
                : null;
              const displayName = template ? getFoodName(template, effectiveLanguage) : entry.name;
              const servingLabel = template ? getFoodServingLabel(template, effectiveLanguage) : entry.servingLabel;

              return (
                <View key={entry.id} style={styles.loggedRow}>
                  <View style={styles.loggedCopy}>
                    <Text style={styles.loggedTitle}>{displayName}</Text>
                    <Text style={styles.loggedMeta}>
                      {isChinese
                        ? `${entry.calories} 千卡 · ${entry.servings} 份 × ${servingLabel}`
                        : `${entry.calories} kcal · ${entry.servings} x ${servingLabel}`}
                    </Text>
                    <Text style={styles.loggedMeta}>
                      {isChinese
                        ? `蛋白 ${entry.proteinGrams}g · 碳水 ${entry.carbsGrams}g · 脂肪 ${entry.fatGrams}g`
                        : `${entry.proteinGrams}P · ${entry.carbsGrams}C · ${entry.fatGrams}F`}
                    </Text>
                  </View>
                  <View style={styles.loggedActions}>
                    <EntryActionButton icon="edit" onPress={() => beginEditEntry(entry)} />
                    <EntryActionButton icon="delete-outline" onPress={() => deleteDietEntry(entry.id)} tone="danger" />
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </AppCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  bigKcal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A2133',
    letterSpacing: -0.7,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#62708A',
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#E4E9F6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  topGoalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  topGoalField: {
    flex: 1,
    minWidth: 160,
    gap: 6,
  },
  topGoalFieldCompact: {
    minWidth: 132,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mealPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#58647E',
  },
  searchRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C2438',
    fontWeight: '600',
  },
  inputDisabled: {
    color: '#5D6786',
    backgroundColor: '#F2F5FC',
  },
  inlineActionButton: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  inlineActionButtonCompact: {
    minWidth: 76,
    paddingHorizontal: 12,
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  libraryLayout: {
    gap: 12,
  },
  libraryLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryRailWide: {
    width: 188,
    flexDirection: 'column',
  },
  categoryPill: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#58647E',
  },
  foodColumn: {
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  foodListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
  },
  foodListTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A2133',
    letterSpacing: -0.4,
  },
  foodListMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#61708B',
  },
  foodList: {
    gap: 10,
  },
  foodRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E1E7F4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodCopy: {
    flex: 1,
    gap: 3,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2133',
  },
  foodMeta: {
    fontSize: 13,
    color: '#6B7590',
    fontWeight: '600',
  },
  foodActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  foodMacroMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93A0BA',
  },
  quickAddButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E2F2',
    backgroundColor: '#F8FBFF',
    padding: 14,
    gap: 10,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A2133',
  },
  selectionMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#65728D',
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#61718A',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  servingInput: {
    flex: 1,
  },
  previewText: {
    fontSize: 13,
    color: '#5E6A83',
    fontWeight: '700',
  },
  customHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2133',
  },
  inputGroup: {
    gap: 10,
  },
  nutrientRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  nutrientInput: {
    flex: 1,
    minWidth: 110,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4DDEE',
    backgroundColor: '#F7FAFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C2438',
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FBFF',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  editingBanner: {
    borderRadius: 14,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F4D3A2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  editingBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#7A6030',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '800',
  },
  mealSection: {
    gap: 10,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A2133',
  },
  mealSectionMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#66708C',
  },
  loggedRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE3F1',
    backgroundColor: '#FAFCFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  loggedCopy: {
    flex: 1,
    gap: 3,
  },
  loggedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2133',
  },
  loggedMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66708C',
  },
  loggedActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  entryActionButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryActionDanger: {
    borderColor: '#F3C4CD',
    backgroundColor: '#FFF5F7',
  },
  emptyState: {
    fontSize: 13,
    color: '#69728C',
    fontWeight: '600',
  },
});
