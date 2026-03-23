import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { type SupportedLanguage, useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { useWellness } from '@/components/app/wellness-context';
import { AppIcon } from '@/components/ui/app-icon';

type LocalizedText = {
  en: string;
  zh: string;
};

type ExerciseCategory = {
  id: string;
  label: string;
  icon: ComponentProps<typeof AppIcon>['name'];
};

type ExerciseTemplate = {
  id: string;
  categoryId: string;
  name: string;
  met: number;
};

type ExerciseSpecTuple = [string, string, string, string, number];

const DEFAULT_WEIGHT_KG = 70;

const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  { id: 'walking', label: 'Walking', icon: 'directions-walk' },
  { id: 'running', label: 'Running', icon: 'directions-run' },
  { id: 'biking', label: 'Biking', icon: 'directions-bike' },
  { id: 'ball', label: 'Ball Games', icon: 'sports-basketball' },
  { id: 'water', label: 'Water Sports', icon: 'pool' },
  { id: 'other', label: 'Other Sports', icon: 'sports' },
  { id: 'gym', label: 'Gym Exercise', icon: 'fitness-center' },
  { id: 'aerobic', label: 'Aerobic Exercise', icon: 'favorite' },
  { id: 'dance', label: 'Dance', icon: 'music-note' },
];

const EXERCISE_LIBRARY: ExerciseTemplate[] = [
  { id: 'walk-slow', categoryId: 'walking', name: 'Slow walking (~3.2 km/h)', met: 2.8 },
  { id: 'walk-commute', categoryId: 'walking', name: 'Walking commute (moderate pace)', met: 3.5 },
  { id: 'walk-stroll', categoryId: 'walking', name: 'Leisure stroll (sanbu)', met: 2.5 },
  { id: 'walk-dog', categoryId: 'walking', name: 'Walking dogs', met: 3.0 },
  { id: 'walk-brisk', categoryId: 'walking', name: 'Brisk walking (~5.6 km/h)', met: 4.3 },
  { id: 'walk-fast', categoryId: 'walking', name: 'Fast walking (~6.4 km/h)', met: 5.0 },
  { id: 'walk-hills', categoryId: 'walking', name: 'Climbing hills / uphill walk', met: 6.0 },
  { id: 'walk-nordic', categoryId: 'walking', name: 'Nordic walking', met: 6.6 },

  { id: 'run-jog', categoryId: 'running', name: 'Jogging (~8 km/h)', met: 7.0 },
  { id: 'run-6mph', categoryId: 'running', name: 'Running (~9.7 km/h)', met: 9.8 },
  { id: 'run-7mph', categoryId: 'running', name: 'Running (~11.3 km/h)', met: 11.0 },
  { id: 'run-8mph', categoryId: 'running', name: 'Running (~12.9 km/h)', met: 11.8 },
  { id: 'run-9mph', categoryId: 'running', name: 'Running (~14.5 km/h)', met: 12.8 },
  { id: 'run-trail', categoryId: 'running', name: 'Trail running', met: 9.0 },
  { id: 'run-interval', categoryId: 'running', name: 'Interval/sprint training', met: 13.5 },

  { id: 'bike-lt16', categoryId: 'biking', name: 'Cycling <16 km/h (easy)', met: 4.0 },
  { id: 'bike-16-18', categoryId: 'biking', name: 'Cycling 16-18 km/h', met: 6.8 },
  { id: 'bike-19-22', categoryId: 'biking', name: 'Cycling 19-22 km/h', met: 8.0 },
  { id: 'bike-22-25', categoryId: 'biking', name: 'Cycling 22-25 km/h', met: 10.0 },
  { id: 'bike-25-30', categoryId: 'biking', name: 'Cycling 25-30 km/h', met: 12.0 },
  { id: 'bike-gt32', categoryId: 'biking', name: 'Cycling >32 km/h (race effort)', met: 15.8 },
  { id: 'bike-mtb', categoryId: 'biking', name: 'Mountain biking', met: 8.5 },
  { id: 'bike-commute', categoryId: 'biking', name: 'Bike commute mixed terrain', met: 6.0 },

  { id: 'ball-basket-shoot', categoryId: 'ball', name: 'Basketball shooting drills', met: 4.5 },
  { id: 'ball-basket-game', categoryId: 'ball', name: 'Basketball game', met: 8.0 },
  { id: 'ball-soccer-casual', categoryId: 'ball', name: 'Soccer casual play', met: 7.0 },
  { id: 'ball-soccer-match', categoryId: 'ball', name: 'Soccer match (competitive)', met: 10.0 },
  { id: 'ball-tennis-double', categoryId: 'ball', name: 'Tennis doubles', met: 5.0 },
  { id: 'ball-tennis-single', categoryId: 'ball', name: 'Tennis singles', met: 8.0 },
  { id: 'ball-volley-social', categoryId: 'ball', name: 'Volleyball social', met: 3.0 },
  { id: 'ball-volley-competitive', categoryId: 'ball', name: 'Volleyball competitive', met: 6.0 },
  { id: 'ball-baseball', categoryId: 'ball', name: 'Baseball or softball', met: 5.0 },
  { id: 'ball-table-tennis', categoryId: 'ball', name: 'Table tennis', met: 4.0 },

  { id: 'water-swim-leisure', categoryId: 'water', name: 'Swimming leisure', met: 6.0 },
  { id: 'water-swim-laps', categoryId: 'water', name: 'Swimming laps (moderate)', met: 8.3 },
  { id: 'water-swim-vigorous', categoryId: 'water', name: 'Swimming laps (vigorous)', met: 10.0 },
  { id: 'water-aerobics', categoryId: 'water', name: 'Water aerobics', met: 5.5 },
  { id: 'water-kayak', categoryId: 'water', name: 'Kayaking / paddling moderate', met: 5.0 },
  { id: 'water-rowing-open', categoryId: 'water', name: 'Rowing outdoor moderate', met: 7.0 },
  { id: 'water-surf', categoryId: 'water', name: 'Surfing', met: 3.0 },
  { id: 'water-scuba', categoryId: 'water', name: 'Scuba diving', met: 7.0 },

  { id: 'other-hike-moderate', categoryId: 'other', name: 'Hiking moderate trail', met: 6.0 },
  { id: 'other-hike-steep', categoryId: 'other', name: 'Hiking steep / loaded pack', met: 7.5 },
  { id: 'other-jumprope-mod', categoryId: 'other', name: 'Jump rope moderate', met: 10.0 },
  { id: 'other-jumprope-fast', categoryId: 'other', name: 'Jump rope fast', met: 12.3 },
  { id: 'other-martial', categoryId: 'other', name: 'Martial arts practice', met: 10.3 },
  { id: 'other-badminton', categoryId: 'other', name: 'Badminton recreational', met: 5.5 },
  { id: 'other-skateboard', categoryId: 'other', name: 'Skateboarding', met: 5.0 },
  { id: 'other-horseback', categoryId: 'other', name: 'Horseback riding', met: 5.5 },

  { id: 'gym-weights-light', categoryId: 'gym', name: 'Weight training light/moderate', met: 3.5 },
  { id: 'gym-weights-vigorous', categoryId: 'gym', name: 'Weight training vigorous', met: 6.0 },
  { id: 'gym-circuit', categoryId: 'gym', name: 'Circuit training', met: 8.0 },
  { id: 'gym-calisthenics', categoryId: 'gym', name: 'Bodyweight calisthenics', met: 5.0 },
  { id: 'gym-elliptical', categoryId: 'gym', name: 'Elliptical trainer moderate', met: 5.0 },
  { id: 'gym-rower', categoryId: 'gym', name: 'Rowing machine vigorous', met: 8.5 },
  { id: 'gym-stair', categoryId: 'gym', name: 'Stair machine', met: 8.8 },
  { id: 'gym-hiit', categoryId: 'gym', name: 'HIIT workout', met: 8.5 },

  { id: 'aerobic-low', categoryId: 'aerobic', name: 'Low-impact aerobics', met: 5.0 },
  { id: 'aerobic-high', categoryId: 'aerobic', name: 'High-impact aerobics', met: 7.3 },
  { id: 'aerobic-step-low', categoryId: 'aerobic', name: 'Step aerobics low', met: 6.5 },
  { id: 'aerobic-step-high', categoryId: 'aerobic', name: 'Step aerobics high', met: 8.5 },
  { id: 'aerobic-kickbox', categoryId: 'aerobic', name: 'Cardio kickboxing', met: 7.8 },
  { id: 'aerobic-bootcamp', categoryId: 'aerobic', name: 'Bootcamp intervals', met: 8.0 },
  { id: 'aerobic-trampoline', categoryId: 'aerobic', name: 'Cardio trampoline class', met: 6.0 },
  { id: 'aerobic-row', categoryId: 'aerobic', name: 'Cardio rowing intervals', met: 7.0 },

  { id: 'dance-social', categoryId: 'dance', name: 'Social dancing / slow dance', met: 3.0 },
  { id: 'dance-ballroom', categoryId: 'dance', name: 'Ballroom dance moderate', met: 4.5 },
  { id: 'dance-salsa', categoryId: 'dance', name: 'Salsa or bachata', met: 5.5 },
  { id: 'dance-hiphop', categoryId: 'dance', name: 'Hip-hop dance', met: 7.3 },
  { id: 'dance-zumba', categoryId: 'dance', name: 'Zumba / cardio dance', met: 7.5 },
  { id: 'dance-ballet', categoryId: 'dance', name: 'Ballet class', met: 5.0 },
  { id: 'dance-folk', categoryId: 'dance', name: 'Folk dance', met: 4.8 },
  { id: 'dance-contemporary', categoryId: 'dance', name: 'Contemporary dance vigorous', met: 6.8 },
];

const EXERCISE_CATEGORY_LABELS: Record<string, LocalizedText> = {
  walking: { en: 'Walking', zh: '步行' },
  running: { en: 'Running', zh: '跑步' },
  biking: { en: 'Biking', zh: '骑行' },
  ball: { en: 'Ball Games', zh: '球类运动' },
  water: { en: 'Water Sports', zh: '水上运动' },
  other: { en: 'Other Sports', zh: '其他运动' },
  gym: { en: 'Gym Exercise', zh: '健身训练' },
  aerobic: { en: 'Aerobic Exercise', zh: '有氧运动' },
  dance: { en: 'Dance', zh: '舞蹈' },
};

const EXERCISE_NAME_LABELS: Record<string, LocalizedText> = {
  'walk-slow': { en: 'Slow walking (~3.2 km/h)', zh: '慢走（约 3.2 公里/小时）' },
  'walk-commute': { en: 'Walking commute (moderate pace)', zh: '通勤步行（中等速度）' },
  'walk-stroll': { en: 'Leisure stroll (sanbu)', zh: '散步' },
  'walk-dog': { en: 'Walking dogs', zh: '遛狗' },
  'walk-brisk': { en: 'Brisk walking (~5.6 km/h)', zh: '快走（约 5.6 公里/小时）' },
  'walk-fast': { en: 'Fast walking (~6.4 km/h)', zh: '快速步行（约 6.4 公里/小时）' },
  'walk-hills': { en: 'Climbing hills / uphill walk', zh: '爬坡步行' },
  'walk-nordic': { en: 'Nordic walking', zh: '北欧式健走' },
  'run-jog': { en: 'Jogging (~8 km/h)', zh: '慢跑（约 8 公里/小时）' },
  'run-6mph': { en: 'Running (~9.7 km/h)', zh: '跑步（约 9.7 公里/小时）' },
  'run-7mph': { en: 'Running (~11.3 km/h)', zh: '跑步（约 11.3 公里/小时）' },
  'run-8mph': { en: 'Running (~12.9 km/h)', zh: '跑步（约 12.9 公里/小时）' },
  'run-9mph': { en: 'Running (~14.5 km/h)', zh: '跑步（约 14.5 公里/小时）' },
  'run-trail': { en: 'Trail running', zh: '越野跑' },
  'run-interval': { en: 'Interval/sprint training', zh: '间歇/冲刺训练' },
  'bike-lt16': { en: 'Cycling <16 km/h (easy)', zh: '骑行 <16 公里/小时（轻松）' },
  'bike-16-18': { en: 'Cycling 16-18 km/h', zh: '骑行 16-18 公里/小时' },
  'bike-19-22': { en: 'Cycling 19-22 km/h', zh: '骑行 19-22 公里/小时' },
  'bike-22-25': { en: 'Cycling 22-25 km/h', zh: '骑行 22-25 公里/小时' },
  'bike-25-30': { en: 'Cycling 25-30 km/h', zh: '骑行 25-30 公里/小时' },
  'bike-gt32': { en: 'Cycling >32 km/h (race effort)', zh: '骑行 >32 公里/小时（竞速）' },
  'bike-mtb': { en: 'Mountain biking', zh: '山地骑行' },
  'bike-commute': { en: 'Bike commute mixed terrain', zh: '通勤骑行（混合路况）' },
  'ball-basket-shoot': { en: 'Basketball shooting drills', zh: '篮球投篮练习' },
  'ball-basket-game': { en: 'Basketball game', zh: '篮球比赛' },
  'ball-soccer-casual': { en: 'Soccer casual play', zh: '休闲足球' },
  'ball-soccer-match': { en: 'Soccer match (competitive)', zh: '足球比赛（竞技）' },
  'ball-tennis-double': { en: 'Tennis doubles', zh: '双打网球' },
  'ball-tennis-single': { en: 'Tennis singles', zh: '单打网球' },
  'ball-volley-social': { en: 'Volleyball social', zh: '休闲排球' },
  'ball-volley-competitive': { en: 'Volleyball competitive', zh: '竞技排球' },
  'ball-baseball': { en: 'Baseball or softball', zh: '棒球或垒球' },
  'ball-table-tennis': { en: 'Table tennis', zh: '乒乓球' },
  'water-swim-leisure': { en: 'Swimming leisure', zh: '轻松游泳' },
  'water-swim-laps': { en: 'Swimming laps (moderate)', zh: '分组游泳（中等强度）' },
  'water-swim-vigorous': { en: 'Swimming laps (vigorous)', zh: '分组游泳（高强度）' },
  'water-aerobics': { en: 'Water aerobics', zh: '水中有氧操' },
  'water-kayak': { en: 'Kayaking / paddling moderate', zh: '皮划艇/划桨（中等强度）' },
  'water-rowing-open': { en: 'Rowing outdoor moderate', zh: '户外划船（中等强度）' },
  'water-surf': { en: 'Surfing', zh: '冲浪' },
  'water-scuba': { en: 'Scuba diving', zh: '水肺潜水' },
  'other-hike-moderate': { en: 'Hiking moderate trail', zh: '徒步（中等路线）' },
  'other-hike-steep': { en: 'Hiking steep / loaded pack', zh: '徒步（陡坡/负重）' },
  'other-jumprope-mod': { en: 'Jump rope moderate', zh: '跳绳（中等强度）' },
  'other-jumprope-fast': { en: 'Jump rope fast', zh: '跳绳（快速）' },
  'other-martial': { en: 'Martial arts practice', zh: '武术训练' },
  'other-badminton': { en: 'Badminton recreational', zh: '休闲羽毛球' },
  'other-skateboard': { en: 'Skateboarding', zh: '滑板' },
  'other-horseback': { en: 'Horseback riding', zh: '骑马' },
  'gym-weights-light': { en: 'Weight training light/moderate', zh: '力量训练（轻/中强度）' },
  'gym-weights-vigorous': { en: 'Weight training vigorous', zh: '力量训练（高强度）' },
  'gym-circuit': { en: 'Circuit training', zh: '循环训练' },
  'gym-calisthenics': { en: 'Bodyweight calisthenics', zh: '徒手训练' },
  'gym-elliptical': { en: 'Elliptical trainer moderate', zh: '椭圆机（中等强度）' },
  'gym-rower': { en: 'Rowing machine vigorous', zh: '划船机（高强度）' },
  'gym-stair': { en: 'Stair machine', zh: '爬楼机' },
  'gym-hiit': { en: 'HIIT workout', zh: '高强度间歇训练' },
  'aerobic-low': { en: 'Low-impact aerobics', zh: '低冲击有氧操' },
  'aerobic-high': { en: 'High-impact aerobics', zh: '高冲击有氧操' },
  'aerobic-step-low': { en: 'Step aerobics low', zh: '踏板操（低强度）' },
  'aerobic-step-high': { en: 'Step aerobics high', zh: '踏板操（高强度）' },
  'aerobic-kickbox': { en: 'Cardio kickboxing', zh: '有氧搏击' },
  'aerobic-bootcamp': { en: 'Bootcamp intervals', zh: '训练营间歇训练' },
  'aerobic-trampoline': { en: 'Cardio trampoline class', zh: '蹦床有氧课' },
  'aerobic-row': { en: 'Cardio rowing intervals', zh: '划船有氧间歇训练' },
  'dance-social': { en: 'Social dancing / slow dance', zh: '社交舞 / 慢舞' },
  'dance-ballroom': { en: 'Ballroom dance moderate', zh: '交谊舞（中等强度）' },
  'dance-salsa': { en: 'Salsa or bachata', zh: '萨尔萨或巴恰塔' },
  'dance-hiphop': { en: 'Hip-hop dance', zh: '街舞' },
  'dance-zumba': { en: 'Zumba / cardio dance', zh: '尊巴 / 有氧舞蹈' },
  'dance-ballet': { en: 'Ballet class', zh: '芭蕾课' },
  'dance-folk': { en: 'Folk dance', zh: '民族舞' },
  'dance-contemporary': { en: 'Contemporary dance vigorous', zh: '现代舞（高强度）' },
};

const EXTRA_EXERCISE_SPECS: ExerciseSpecTuple[] = [
  ['walk-tread-25', 'walking', 'Treadmill walking 2.5 mph', '跑步机步行 2.5 英里/小时', 2.9],
  ['walk-tread-35', 'walking', 'Treadmill walking 3.5 mph', '跑步机步行 3.5 英里/小时', 4.3],
  ['walk-incline', 'walking', 'Incline treadmill walk', '坡度跑步机步行', 5.3],
  ['walk-backpack', 'walking', 'Walking with backpack', '背包步行', 4.6],
  ['walk-stroller', 'walking', 'Walking with stroller', '推婴儿车步行', 3.8],
  ['walk-mall', 'walking', 'Mall walking', '商场步行', 3.2],
  ['walk-stairs', 'walking', 'Stair walking easy', '楼梯步行（轻松）', 4.0],
  ['walk-beach', 'walking', 'Beach walking', '沙滩步行', 6.0],
  ['run-tread-jog', 'running', 'Treadmill jogging', '跑步机慢跑', 8.3],
  ['run-tread-tempo', 'running', 'Treadmill tempo run', '跑步机节奏跑', 10.5],
  ['run-track-interval', 'running', 'Track interval run', '田径场间歇跑', 12.0],
  ['run-cross-country', 'running', 'Cross-country running', '越野长跑', 9.0],
  ['run-stairs', 'running', 'Stair running', '楼梯跑', 15.0],
  ['run-marathon-pace', 'running', 'Marathon pace run', '马拉松配速跑', 11.0],
  ['run-hill-repeats', 'running', 'Hill repeats', '上坡重复跑', 12.5],
  ['run-fartlek', 'running', 'Fartlek run', '法特莱克跑', 10.8],
  ['bike-spin-easy', 'biking', 'Spin bike easy', '动感单车（轻松）', 6.0],
  ['bike-spin-vigorous', 'biking', 'Spin bike vigorous', '动感单车（高强度）', 10.5],
  ['bike-stationary-mod', 'biking', 'Stationary cycling moderate', '健身车骑行（中等强度）', 7.0],
  ['bike-stationary-hard', 'biking', 'Stationary cycling hard', '健身车骑行（高强度）', 10.5],
  ['bike-ebike', 'biking', 'E-bike easy ride', '电助力自行车轻松骑行', 3.5],
  ['bike-gravel', 'biking', 'Gravel biking', '砂石路骑行', 8.3],
  ['bike-bmx', 'biking', 'BMX riding', 'BMX 骑行', 8.5],
  ['bike-downhill', 'biking', 'Downhill biking', '下坡骑行', 5.8],
  ['ball-pickle-single', 'ball', 'Pickleball singles', '匹克球单打', 7.5],
  ['ball-pickle-double', 'ball', 'Pickleball doubles', '匹克球双打', 5.0],
  ['ball-football-touch', 'ball', 'Touch football', '腰旗橄榄球', 8.0],
  ['ball-handball', 'ball', 'Team handball', '手球', 12.0],
  ['ball-cricket', 'ball', 'Cricket match', '板球比赛', 5.0],
  ['ball-racquetball', 'ball', 'Racquetball', '壁球拍球', 7.0],
  ['ball-squash', 'ball', 'Squash', '壁球', 12.0],
  ['ball-ultimate', 'ball', 'Ultimate frisbee', '极限飞盘', 8.0],
  ['water-jogging', 'water', 'Water jogging', '水中慢跑', 9.8],
  ['water-polo', 'water', 'Water polo', '水球', 10.0],
  ['water-sup', 'water', 'Stand-up paddleboarding', '桨板', 6.0],
  ['water-snorkel', 'water', 'Snorkeling', '浮潜', 5.0],
  ['water-canoe', 'water', 'Canoeing moderate', '划独木舟（中等强度）', 5.8],
  ['water-breaststroke', 'water', 'Breaststroke easy', '蛙泳（轻松）', 5.3],
  ['water-backstroke', 'water', 'Backstroke moderate', '仰泳（中等强度）', 7.0],
  ['water-open-water', 'water', 'Open-water swimming', '公开水域游泳', 9.5],
  ['other-climb-indoor', 'other', 'Indoor rock climbing', '室内攀岩', 8.0],
  ['other-climb-bouldering', 'other', 'Bouldering', '抱石', 7.5],
  ['other-ski-downhill', 'other', 'Downhill skiing', '高山滑雪', 6.8],
  ['other-ski-cross', 'other', 'Cross-country skiing', '越野滑雪', 9.0],
  ['other-snowboard', 'other', 'Snowboarding', '单板滑雪', 5.3],
  ['other-rollerblade', 'other', 'Rollerblading', '轮滑', 9.0],
  ['other-iceskate', 'other', 'Ice skating', '滑冰', 7.0],
  ['other-fencing', 'other', 'Fencing', '击剑', 6.0],
  ['gym-kettlebell', 'gym', 'Kettlebell workout', '壶铃训练', 8.0],
  ['gym-pilates', 'gym', 'Pilates mat class', '普拉提垫上训练', 3.0],
  ['gym-pilates-reformer', 'gym', 'Pilates reformer', '普拉提核心床', 4.8],
  ['gym-bands', 'gym', 'Resistance bands workout', '弹力带训练', 4.5],
  ['gym-battle-ropes', 'gym', 'Battle ropes', '战绳训练', 8.0],
  ['gym-pushups', 'gym', 'Push-up and core circuit', '俯卧撑核心循环', 6.0],
  ['gym-bench', 'gym', 'Bench press workout', '卧推动作训练', 5.0],
  ['gym-deadlift', 'gym', 'Deadlift workout', '硬拉训练', 6.0],
  ['aerobic-jacks', 'aerobic', 'Jumping jacks workout', '开合跳训练', 8.0],
  ['aerobic-dance-cardio', 'aerobic', 'Dance cardio class', '有氧舞蹈课', 7.5],
  ['aerobic-shadow-box', 'aerobic', 'Shadow boxing', '空击拳训练', 7.8],
  ['aerobic-body-combat', 'aerobic', 'Body combat class', '搏击操课程', 8.8],
  ['aerobic-step-mod', 'aerobic', 'Step aerobics moderate', '踏板操（中等强度）', 7.5],
  ['aerobic-circuit-cardio', 'aerobic', 'Cardio circuit class', '有氧循环课', 8.0],
  ['aerobic-hula', 'aerobic', 'Hula hoop workout', '呼啦圈训练', 5.5],
  ['aerobic-burpees', 'aerobic', 'Burpee intervals', '波比跳间歇训练', 10.0],
  ['dance-jazz', 'dance', 'Jazz dance', '爵士舞', 6.0],
  ['dance-line', 'dance', 'Line dance', '排舞', 4.8],
  ['dance-tap', 'dance', 'Tap dance', '踢踏舞', 6.5],
  ['dance-kpop', 'dance', 'K-pop dance practice', 'K-pop 舞练习', 7.0],
  ['dance-cheer', 'dance', 'Cheer dance', '啦啦队舞蹈', 6.5],
  ['dance-belly', 'dance', 'Belly dance', '肚皮舞', 4.5],
  ['dance-latin-fit', 'dance', 'Latin fitness dance', '拉丁健身舞', 7.0],
  ['dance-swing', 'dance', 'Swing dance', '摇摆舞', 5.8],
];

const EXTRA_EXERCISE_NAME_LABELS = Object.fromEntries(
  EXTRA_EXERCISE_SPECS.map(([id, , en, zh]) => [id, { en, zh }])
) as Record<string, LocalizedText>;

const ALL_EXERCISE_LIBRARY: ExerciseTemplate[] = [
  ...EXERCISE_LIBRARY,
  ...EXTRA_EXERCISE_SPECS.map(([id, categoryId, name, , met]) => ({ id, categoryId, name, met })),
];

const ALL_EXERCISE_NAME_LABELS: Record<string, LocalizedText> = {
  ...EXERCISE_NAME_LABELS,
  ...EXTRA_EXERCISE_NAME_LABELS,
};

function getCategoryLabel(categoryId: string, language: SupportedLanguage) {
  return EXERCISE_CATEGORY_LABELS[categoryId]?.[language] ?? categoryId;
}

function getExerciseName(exercise: ExerciseTemplate, language: SupportedLanguage) {
  return ALL_EXERCISE_NAME_LABELS[exercise.id]?.[language] ?? exercise.name;
}

function parsePositiveNumber(input: string, fallback: number) {
  const value = Number(input.trim());
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function caloriesPerHourFromMet(met: number, weightKg: number) {
  return Math.round(met * 3.5 * weightKg * 60 / 200);
}

function caloriesForDuration(caloriesPerHour: number, durationMinutes: number) {
  return Math.round((caloriesPerHour * durationMinutes) / 60);
}

export default function ExerciseScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { width } = useWindowDimensions();
  const { effectiveLanguage, t } = useLanguage();
  const { theme } = useAppTheme();
  const {
    addExerciseSession,
    deleteExerciseSession,
    exerciseGoalCalories,
    exerciseWeightKg,
    todayExerciseCalories,
    todayExerciseSessions,
    updateExerciseSettings,
    updateExerciseSession,
  } = useWellness();
  const [selectedCategoryId, setSelectedCategoryId] = useState(EXERCISE_CATEGORIES[0]?.id ?? 'walking');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState(String(exerciseWeightKg || DEFAULT_WEIGHT_KG));
  const [goalInput, setGoalInput] = useState(String(exerciseGoalCalories));
  const [durationInput, setDurationInput] = useState('30');
  const [customNameInput, setCustomNameInput] = useState('');
  const [customCaloriesInput, setCustomCaloriesInput] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [isEditingSetup, setIsEditingSetup] = useState(false);
  const isChinese = effectiveLanguage === 'zh';
  const calorieUnit = isChinese ? '千卡' : 'kcal';
  const isCompactMobile = width < 430;

  useEffect(() => {
    if (isEditingSetup) {
      return;
    }

    setWeightInput(String(exerciseWeightKg || DEFAULT_WEIGHT_KG));
    setGoalInput(String(exerciseGoalCalories));
  }, [exerciseGoalCalories, exerciseWeightKg, isEditingSetup]);

  const selectedExercise = useMemo(
    () => ALL_EXERCISE_LIBRARY.find((item) => item.id === selectedExerciseId) ?? null,
    [selectedExerciseId]
  );

  const weightKg = parsePositiveNumber(weightInput, DEFAULT_WEIGHT_KG);
  const durationMinutes = Math.max(1, Math.round(parsePositiveNumber(durationInput, 30)));
  const isSearchingAllExercises = searchQuery.trim().length > 0;

  const filteredExercises = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    const searchAcrossAll = normalized.length > 0;
    return ALL_EXERCISE_LIBRARY.filter((exercise) => {
      const categoryMatch = searchAcrossAll || exercise.categoryId === selectedCategoryId;
      const localizedName = getExerciseName(exercise, effectiveLanguage).toLowerCase();
      const localizedCategory = getCategoryLabel(exercise.categoryId, effectiveLanguage).toLowerCase();
      const searchMatch =
        normalized.length === 0 ||
        exercise.name.toLowerCase().includes(normalized) ||
        localizedName.includes(normalized) ||
        exercise.categoryId.toLowerCase().includes(normalized) ||
        localizedCategory.includes(normalized);
      return categoryMatch && searchMatch;
    });
  }, [effectiveLanguage, searchQuery, selectedCategoryId]);

  const caloriesPerHour = selectedExercise
    ? caloriesPerHourFromMet(selectedExercise.met, weightKg)
    : Math.round(parsePositiveNumber(customCaloriesInput, 0));
  const previewCalories = caloriesPerHour > 0 ? caloriesForDuration(caloriesPerHour, durationMinutes) : 0;
  const canLogSession = previewCalories > 0 && durationMinutes > 0 && (selectedExercise || customNameInput.trim().length > 0);
  const goalPercent = Math.min(100, Math.round((todayExerciseCalories / exerciseGoalCalories) * 100));
  const selectedExerciseName = selectedExercise ? getExerciseName(selectedExercise, effectiveLanguage) : '';
  const saveExerciseSetup = () => {
    updateExerciseSettings({
      weightKg: Math.max(20, Math.round(parsePositiveNumber(weightInput, exerciseWeightKg || DEFAULT_WEIGHT_KG))),
      targetCalories: Math.max(50, Math.round(parsePositiveNumber(goalInput, exerciseGoalCalories))),
    });
    setIsEditingSetup(false);
  };

  const resetComposer = () => {
    setSelectedExerciseId(null);
    setDurationInput('30');
    setCustomNameInput('');
    setCustomCaloriesInput('');
    setEditingSessionId(null);
  };

  const beginEditSession = (sessionId: string) => {
    const session = todayExerciseSessions.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }

    setEditingSessionId(session.id);
    setDurationInput(String(session.durationMinutes));

    if (session.exerciseTemplateId) {
      const template = ALL_EXERCISE_LIBRARY.find((item) => item.id === session.exerciseTemplateId);
      if (template) {
        setSelectedCategoryId(template.categoryId);
        setSelectedExerciseId(template.id);
        setCustomNameInput('');
        setCustomCaloriesInput('');
        return;
      }
    }

    setSelectedExerciseId(null);
    setSelectedCategoryId(EXERCISE_CATEGORIES[0]?.id ?? 'walking');
    setCustomNameInput(session.name);
    setCustomCaloriesInput(String(session.caloriesPerHour || 0));
  };

  const handleSaveSession = () => {
    if (!canLogSession) {
      return;
    }

    const sessionDraft = {
      name: selectedExercise ? selectedExercise.name : customNameInput.trim(),
      categoryId: selectedExercise?.categoryId ?? 'custom',
      durationMinutes,
      calories: previewCalories,
      metLabel: selectedExercise ? `MET ${selectedExercise.met.toFixed(1)}` : isChinese ? '自定义 千卡/小时' : 'Custom kcal/h',
      caloriesPerHour,
      exerciseTemplateId: selectedExercise?.id ?? null,
    };

    if (editingSessionId) {
      const existing = todayExerciseSessions.find((session) => session.id === editingSessionId);
      updateExerciseSession(editingSessionId, {
        ...sessionDraft,
        createdAt: existing?.createdAt ?? Date.now(),
      });
      resetComposer();
      return;
    }

    addExerciseSession(sessionDraft);
    resetComposer();
  };

  const handleDeleteSession = (sessionId: string) => {
    if (editingSessionId === sessionId) {
      resetComposer();
    }
    deleteExerciseSession(sessionId);
  };

  const content = (
    <>
      <AppCard delay={90}>
        <SectionLabel text={t('exercise.dailyBurn')} />
        <CardTitle accent={theme.primary} icon="local-fire-department" title={t('exercise.todayBurned')} />
        <Text style={styles.bigNumber}>{todayExerciseCalories} {calorieUnit}</Text>
        <View style={styles.goalRow}>
          <Text style={styles.goalText}>{t('exercise.goal', { goal: exerciseGoalCalories })}</Text>
          <Text style={styles.goalText}>{goalPercent}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${goalPercent}%`, backgroundColor: theme.primary }]} />
        </View>
        <View style={styles.topSetupWrap}>
          <View style={styles.topSetupRow}>
            <View style={[styles.topSetupField, isCompactMobile && styles.topSetupFieldCompact]}>
              <Text style={styles.inputLabel}>{t('exercise.weight')}</Text>
              <TextInput
                editable={isEditingSetup}
                keyboardType="decimal-pad"
                onChangeText={setWeightInput}
                placeholder="70"
                placeholderTextColor="#8A93AB"
                style={[styles.input, !isEditingSetup && styles.inputDisabled]}
                value={weightInput}
              />
            </View>
            <View style={[styles.topSetupField, isCompactMobile && styles.topSetupFieldCompact]}>
              <Text style={styles.inputLabel}>{t('exercise.goalCalories')}</Text>
              <TextInput
                editable={isEditingSetup}
                keyboardType="number-pad"
                onChangeText={setGoalInput}
                placeholder="650"
                placeholderTextColor="#8A93AB"
                style={[styles.input, !isEditingSetup && styles.inputDisabled]}
                value={goalInput}
              />
            </View>
            <Pressable
              onPress={() => {
                if (isEditingSetup) {
                  saveExerciseSetup();
                  return;
                }
                setIsEditingSetup(true);
              }}
              style={[
                styles.inlineActionButton,
                isCompactMobile && styles.inlineActionButtonCompact,
                { backgroundColor: isEditingSetup ? theme.primary : `${theme.primary}12`, borderColor: `${theme.primary}35` },
              ]}>
              <Text style={[styles.inlineActionText, { color: isEditingSetup ? '#FFFFFF' : theme.primary }]}>
                {isEditingSetup ? t('common.save') : t('common.edit')}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>{t('exercise.setupHint')}</Text>
        </View>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text={t('exercise.library')} />
        <View style={styles.searchRow}>
          <AppIcon color="#6B7491" name="search" size={18} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('exercise.searchPlaceholder')}
            placeholderTextColor="#8A93AB"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.categoryWrap}>
          {EXERCISE_CATEGORIES.map((category) => {
            const selected = category.id === selectedCategoryId;
            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={[
                  styles.categoryPill,
                  selected && { backgroundColor: `${theme.primary}1A`, borderColor: `${theme.primary}66` },
                ]}>
                <AppIcon color={selected ? theme.primary : '#5A6586'} name={category.icon} size={16} />
                <Text style={[styles.categoryPillText, selected && { color: theme.primary }]}>
                  {getCategoryLabel(category.id, effectiveLanguage)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.exerciseList}>
          {filteredExercises.length === 0 ? (
            <Text style={styles.emptyText}>{t('exercise.noMatches')}</Text>
          ) : null}
          {filteredExercises.map((exercise) => {
            const selected = exercise.id === selectedExerciseId;
            const perHour = caloriesPerHourFromMet(exercise.met, weightKg);
            return (
              <Pressable
                key={exercise.id}
                onPress={() => {
                  setSelectedExerciseId(exercise.id);
                  setCustomNameInput('');
                  setCustomCaloriesInput('');
                }}
                style={[
                  styles.exerciseRow,
                  selected && { borderColor: `${theme.primary}66`, backgroundColor: `${theme.primary}10` },
                ]}>
                <View style={styles.exerciseCopy}>
                  <Text style={[styles.exerciseName, selected && { color: theme.primary }]}>
                    {getExerciseName(exercise, effectiveLanguage)}
                  </Text>
                  <Text style={styles.exerciseMeta}>
                    {isChinese
                      ? `MET ${exercise.met.toFixed(1)} · 约 ${perHour} 千卡/小时${isSearchingAllExercises ? ` · ${getCategoryLabel(exercise.categoryId, effectiveLanguage)}` : ''}`
                      : `MET ${exercise.met.toFixed(1)} · ~${perHour} kcal/hour${isSearchingAllExercises ? ` · ${getCategoryLabel(exercise.categoryId, effectiveLanguage)}` : ''}`}
                  </Text>
                </View>
                {selected ? <AppIcon color={theme.primary} name="check-circle" size={18} /> : null}
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard delay={200}>
        <SectionLabel text={t('exercise.customSection')} />
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>{t('exercise.customName')}</Text>
          <TextInput
            value={customNameInput}
            onChangeText={(value) => {
              setCustomNameInput(value);
              if (value.trim().length > 0) {
                setSelectedExerciseId(null);
              }
            }}
            placeholder={t('exercise.customName')}
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>{t('exercise.customCalories')}</Text>
          <TextInput
            value={customCaloriesInput}
            onChangeText={(value) => {
              setCustomCaloriesInput(value);
              if (value.trim().length > 0) {
                setSelectedExerciseId(null);
              }
            }}
            keyboardType="number-pad"
            placeholder="420"
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
        </View>
      </AppCard>

      <AppCard delay={230}>
        <SectionLabel text={t('exercise.logSession')} />
        {editingSessionId ? (
          <View style={[styles.editingBanner, { borderColor: `${theme.primary}35`, backgroundColor: `${theme.primary}12` }]}>
            <View style={styles.editingCopy}>
              <Text style={[styles.editingTitle, { color: theme.primary }]}>{t('exercise.editingSession')}</Text>
              <Text style={styles.editingMeta}>{t('exercise.updateBelow')}</Text>
            </View>
            <Pressable onPress={resetComposer} style={styles.cancelEditButton}>
              <Text style={styles.cancelEditText}>{t('exercise.cancelEdit')}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.sessionPreview}>
          <Text style={styles.previewLabel}>{t('exercise.selectedPrompt')}</Text>
          <Text style={styles.previewName}>
            {selectedExerciseName || customNameInput.trim() || t('exercise.selectedPrompt')}
          </Text>
          <Text style={styles.previewMeta}>
            {isChinese
              ? `${t('exercise.preview')} · ${caloriesPerHour > 0 ? caloriesPerHour : 0} 千卡/小时`
              : `${t('exercise.preview')} · ${caloriesPerHour > 0 ? caloriesPerHour : 0} kcal/hour`}
          </Text>
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>{t('exercise.duration')}</Text>
          <TextInput
            value={durationInput}
            onChangeText={setDurationInput}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
        </View>

        <View style={styles.logSummaryRow}>
          <Text style={styles.logSummaryText}>{t('exercise.sessionEstimate')}</Text>
          <Text style={[styles.logSummaryText, styles.logSummaryStrong]}>{previewCalories} {calorieUnit}</Text>
        </View>

        <Pressable
          disabled={!canLogSession}
          onPress={handleSaveSession}
          style={[styles.logButton, { backgroundColor: canLogSession ? theme.primary : '#BCC4D9' }]}>
          <Text style={styles.logButtonText}>{editingSessionId ? t('exercise.updateSession') : t('exercise.logSession')}</Text>
        </Pressable>
      </AppCard>

      <AppCard delay={260}>
        <SectionLabel text={t('exercise.loggedToday')} />
        {todayExerciseSessions.length === 0 ? <Text style={styles.emptyText}>{t('exercise.noneToday')}</Text> : null}
        {todayExerciseSessions.map((session) => {
          const template = session.exerciseTemplateId
            ? ALL_EXERCISE_LIBRARY.find((item) => item.id === session.exerciseTemplateId) ?? null
            : null;
          const displayName = template ? getExerciseName(template, effectiveLanguage) : session.name;
          const displayMetLabel = template
            ? `MET ${template.met.toFixed(1)}`
            : isChinese
              ? '自定义 千卡/小时'
              : 'Custom kcal/h';

          return (
            <View key={session.id} style={styles.loggedRow}>
              <View style={styles.loggedCopy}>
                <Text style={styles.loggedName}>{displayName}</Text>
                <Text style={styles.loggedMeta}>
                  {isChinese ? `${session.durationMinutes} 分钟 · ${displayMetLabel}` : `${session.durationMinutes} min · ${displayMetLabel}`}
                </Text>
              </View>
              <View style={styles.loggedActions}>
                <Text style={[styles.loggedCalories, { color: theme.primary }]}>{session.calories} {calorieUnit}</Text>
                <View style={styles.loggedButtonsRow}>
                  <Pressable
                    onPress={() => beginEditSession(session.id)}
                    style={[styles.sessionActionButton, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}2E` }]}>
                    <AppIcon color={theme.primary} name="edit" size={14} />
                    <Text style={[styles.sessionActionText, { color: theme.primary }]}>{t('common.edit')}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteSession(session.id)} style={styles.sessionDeleteButton}>
                    <AppIcon color="#C7506A" name="delete-outline" size={14} />
                    <Text style={styles.sessionDeleteText}>{t('common.delete')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </AppCard>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScreenShell title={t('exercise.title')} subtitle={t('exercise.subtitle')}>
      {content}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  bigNumber: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: '#1A2133',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalText: {
    fontSize: 12,
    color: '#626A82',
    fontWeight: '600',
  },
  barTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#E4E9F6',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  topSetupWrap: {
    gap: 10,
    marginTop: 4,
  },
  topSetupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  topSetupField: {
    width: '37%',
    minWidth: 118,
    gap: 6,
  },
  topSetupFieldCompact: {
    width: '34%',
    minWidth: 104,
  },
  inputRow: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B6583',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4DDEE',
    backgroundColor: '#F7FAFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
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
    minHeight: 42,
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
  helperText: {
    fontSize: 12,
    color: '#6E7896',
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D4DDEE',
    backgroundColor: '#F7FAFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C2438',
    fontWeight: '600',
    paddingVertical: 2,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5EA',
    backgroundColor: '#F5F8FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#465478',
  },
  exerciseList: {
    gap: 8,
  },
  exerciseRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D2DAEB',
    backgroundColor: '#F7F9FE',
    paddingVertical: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseCopy: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2133',
  },
  exerciseMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66708D',
  },
  editingBanner: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editingCopy: {
    flex: 1,
    gap: 2,
  },
  editingTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  editingMeta: {
    fontSize: 12,
    color: '#6A738F',
    fontWeight: '600',
  },
  cancelEditButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4DDEE',
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#48567A',
  },
  sessionPreview: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D5DDEE',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },
  previewLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    color: '#68728F',
    fontWeight: '700',
  },
  previewName: {
    fontSize: 14,
    color: '#1A2133',
    fontWeight: '700',
  },
  previewMeta: {
    fontSize: 12,
    color: '#65708E',
    fontWeight: '600',
  },
  logSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logSummaryText: {
    fontSize: 13,
    color: '#5D6786',
    fontWeight: '600',
  },
  logSummaryStrong: {
    fontSize: 16,
    color: '#1A2133',
    fontWeight: '800',
  },
  logButton: {
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loggedRow: {
    borderRadius: 14,
    backgroundColor: '#F7F9FE',
    borderWidth: 1,
    borderColor: '#D2DAEB',
    paddingVertical: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loggedCopy: {
    flex: 1,
    gap: 2,
  },
  loggedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2133',
  },
  loggedMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#69728C',
  },
  loggedActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  loggedButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  loggedCalories: {
    fontSize: 13,
    fontWeight: '800',
  },
  sessionActionButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sessionDeleteButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F1C7D2',
    backgroundColor: '#FFF5F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionDeleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C7506A',
  },
  emptyText: {
    fontSize: 13,
    color: '#6D7793',
    lineHeight: 20,
    fontWeight: '600',
  },
});
