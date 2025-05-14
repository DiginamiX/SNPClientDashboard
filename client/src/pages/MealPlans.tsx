import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { NutritionPlan, FormattedNutritionPlan, MacroTarget } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/dateUtils';

export default function MealPlans() {
  const [activePlan, setActivePlan] = useState<FormattedNutritionPlan | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch all nutrition plans
  const { data: nutritionPlans, isLoading } = useQuery<NutritionPlan[]>({
    queryKey: ['/api/nutrition-plans'],
  });

  // Fetch current active nutrition plan
  const { data: currentPlan, isLoading: isLoadingCurrent } = useQuery<NutritionPlan>({
    queryKey: ['/api/nutrition-plans', { current: true }],
  });

  const handleExportPdf = async () => {
    if (!activePlan) return;
    
    setPdfLoading(true);
    try {
      // In a real application, this would call an API to generate a PDF
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Mock PDF download
      const planName = activePlan.title.replace(/\s+/g, '_').toLowerCase();
      const fileName = `nutrition_plan_${planName}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      
      // Show success message instead of actual download
      alert(`Your plan would now download as ${fileName}`);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  // Preprocess nutrition plans for display
  const formatNutritionPlan = (plan: NutritionPlan): FormattedNutritionPlan => {
    return {
      id: plan.id,
      title: plan.title,
      updatedAt: plan.updatedAt,
      description: plan.description || undefined,
      startDate: plan.startDate,
      endDate: plan.endDate,
      macros: {
        protein: {
          name: 'Protein',
          current: plan.proteinTarget, // "current" is actually target in this mock
          target: plan.proteinTarget,
          color: 'bg-accent'
        },
        carbs: {
          name: 'Carbs',
          current: plan.carbsTarget, // "current" is actually target in this mock
          target: plan.carbsTarget,
          color: 'bg-primary'
        },
        fat: {
          name: 'Fat',
          current: plan.fatTarget, // "current" is actually target in this mock
          target: plan.fatTarget,
          color: 'bg-secondary'
        },
        calories: {
          name: 'Total Calories',
          current: plan.caloriesTarget, // "current" is actually target in this mock
          target: plan.caloriesTarget,
          color: 'bg-blue-400'
        }
      },
      coachNotes: plan.notes || undefined
    };
  };

  // Mock data for when loading or no data
  const mockNutritionPlan: FormattedNutritionPlan = {
    id: 1,
    title: "Summer Weight Loss Plan",
    updatedAt: "2023-05-30T14:30:00Z",
    startDate: "2023-05-01",
    endDate: "2023-08-31",
    description: "This plan is designed to help you achieve your summer weight loss goals while maintaining muscle mass.",
    macros: {
      protein: { name: "Protein", current: 180, target: 180, color: "bg-accent" },
      carbs: { name: "Carbs", current: 200, target: 220, color: "bg-primary" },
      fat: { name: "Fat", current: 65, target: 70, color: "bg-secondary" },
      calories: { name: "Total Calories", current: 2105, target: 2230, color: "bg-blue-400" }
    },
    coachNotes: "Great job hitting your protein goals consistently. We'll continue with these macros through the next 2 weeks, then evaluate for potential adjustments based on your progress."
  };

  const getProgressColor = (macro: MacroTarget) => {
    return macro.color;
  };

  const calculatePercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };
  
  const getActiveNutritionPlan = (): FormattedNutritionPlan => {
    if (activePlan) return activePlan;
    if (!isLoadingCurrent && currentPlan) return formatNutritionPlan(currentPlan);
    return mockNutritionPlan;
  };

  const currentMealPlan = getActiveNutritionPlan();

  // Mock meal plan details for display
  const mealPlanSections = [
    {
      title: "Breakfast Options",
      meals: [
        {
          name: "Protein Oatmeal Bowl",
          description: "1/2 cup oats, 1 scoop protein powder, 1 tbsp almond butter, 1/2 cup berries",
          macros: {
            protein: "30g",
            carbs: "40g",
            fat: "12g",
            calories: "386"
          }
        },
        {
          name: "Veggie Egg White Omelette",
          description: "5 egg whites, 1/2 cup spinach, 1/4 cup bell peppers, 1/4 avocado, 1 slice whole grain toast",
          macros: {
            protein: "26g",
            carbs: "18g",
            fat: "10g",
            calories: "262"
          }
        },
        {
          name: "Greek Yogurt Parfait",
          description: "1 cup Greek yogurt, 1/4 cup granola, 1 tbsp honey, 1/2 cup mixed berries",
          macros: {
            protein: "25g",
            carbs: "35g",
            fat: "8g",
            calories: "310"
          }
        }
      ]
    },
    {
      title: "Lunch Options",
      meals: [
        {
          name: "Grilled Chicken Salad",
          description: "5oz grilled chicken, 2 cups mixed greens, 1/4 cup chickpeas, 1/4 avocado, 2 tbsp vinaigrette",
          macros: {
            protein: "40g",
            carbs: "20g",
            fat: "15g",
            calories: "375"
          }
        },
        {
          name: "Turkey Wrap",
          description: "6oz turkey breast, whole grain wrap, 1 tbsp hummus, lettuce, tomato, 1/4 avocado",
          macros: {
            protein: "42g",
            carbs: "30g",
            fat: "12g",
            calories: "396"
          }
        },
        {
          name: "Quinoa Power Bowl",
          description: "1/2 cup quinoa, 4oz grilled tofu, 1 cup roasted vegetables, 2 tbsp tahini dressing",
          macros: {
            protein: "25g",
            carbs: "45g",
            fat: "16g",
            calories: "420"
          }
        }
      ]
    },
    {
      title: "Dinner Options",
      meals: [
        {
          name: "Salmon with Vegetables",
          description: "6oz baked salmon, 1 cup roasted brussels sprouts, 1/2 cup sweet potato",
          macros: {
            protein: "36g",
            carbs: "30g",
            fat: "18g",
            calories: "422"
          }
        },
        {
          name: "Lean Beef Stir Fry",
          description: "5oz lean beef, 1 cup mixed stir fry vegetables, 1/2 cup brown rice, 1 tbsp olive oil",
          macros: {
            protein: "35g",
            carbs: "35g",
            fat: "16g",
            calories: "420"
          }
        },
        {
          name: "Lentil and Vegetable Soup",
          description: "1 cup lentils, 2 cups mixed vegetables, 1 tbsp olive oil, herbs and spices",
          macros: {
            protein: "18g",
            carbs: "40g",
            fat: "14g",
            calories: "354"
          }
        }
      ]
    },
    {
      title: "Snack Options",
      meals: [
        {
          name: "Protein Shake",
          description: "1 scoop protein powder, 1 cup almond milk, 1/2 banana",
          macros: {
            protein: "25g",
            carbs: "15g",
            fat: "3g",
            calories: "187"
          }
        },
        {
          name: "Greek Yogurt and Berries",
          description: "3/4 cup Greek yogurt, 1/2 cup mixed berries",
          macros: {
            protein: "18g",
            carbs: "12g",
            fat: "0g",
            calories: "120"
          }
        },
        {
          name: "Apple and Nut Butter",
          description: "1 medium apple, 1 tbsp almond butter",
          macros: {
            protein: "4g",
            carbs: "25g",
            fat: "9g",
            calories: "195"
          }
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold md:hidden">Meal Plans</h1>
        <div className="ml-auto">
          <Button 
            className="bg-primary hover:bg-blue-600"
            onClick={handleExportPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-1"></i> Exporting...
              </>
            ) : (
              <>
                <i className="ri-file-download-line mr-1"></i> Export as PDF
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nutrition Macros Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{currentMealPlan.title}</CardTitle>
              <CardDescription>
                Updated {formatDate(currentMealPlan.updatedAt, 'MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(currentMealPlan.macros).map((macro) => (
                  <div key={macro.name} className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-white">{macro.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {macro.current}g / {macro.target}g target
                      </p>
                    </div>
                    <div className="w-1/2">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`${getProgressColor(macro)} h-2 rounded-full`}
                          style={{ width: `${calculatePercentage(macro.current, macro.target)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {currentMealPlan.coachNotes && (
                <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-800 dark:text-white mb-1">Coach Notes</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {currentMealPlan.coachNotes}
                  </p>
                </div>
              )}
              
              <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-slate-800 dark:text-white mb-1">Plan Duration</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {formatDate(currentMealPlan.startDate, 'MMMM d, yyyy')} 
                  {currentMealPlan.endDate ? ` - ${formatDate(currentMealPlan.endDate, 'MMMM d, yyyy')}` : ' (ongoing)'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Meal Plan Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Meal Options</CardTitle>
              <CardDescription>
                Select meals from each category to meet your daily macro targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="breakfast" className="space-y-4">
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
                  <TabsTrigger value="lunch">Lunch</TabsTrigger>
                  <TabsTrigger value="dinner">Dinner</TabsTrigger>
                  <TabsTrigger value="snacks">Snacks</TabsTrigger>
                </TabsList>
                
                {mealPlanSections.map((section, index) => (
                  <TabsContent 
                    key={section.title} 
                    value={['breakfast', 'lunch', 'dinner', 'snacks'][index]} 
                    className="space-y-4"
                  >
                    {section.meals.map((meal, mealIndex) => (
                      <div 
                        key={mealIndex} 
                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <h4 className="font-medium text-slate-800 dark:text-white mb-2">
                          {meal.name}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {meal.description}
                        </p>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="text-center p-1 bg-accent/10 dark:bg-accent/20 rounded">
                            <div className="font-medium text-accent dark:text-accent">Protein</div>
                            <div>{meal.macros.protein}</div>
                          </div>
                          <div className="text-center p-1 bg-primary/10 dark:bg-primary/20 rounded">
                            <div className="font-medium text-primary dark:text-primary">Carbs</div>
                            <div>{meal.macros.carbs}</div>
                          </div>
                          <div className="text-center p-1 bg-secondary/10 dark:bg-secondary/20 rounded">
                            <div className="font-medium text-secondary dark:text-secondary">Fat</div>
                            <div>{meal.macros.fat}</div>
                          </div>
                          <div className="text-center p-1 bg-blue-400/10 dark:bg-blue-400/20 rounded">
                            <div className="font-medium text-blue-400 dark:text-blue-400">Calories</div>
                            <div>{meal.macros.calories}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Nutrition Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Nutrition Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h3 className="font-medium text-slate-800 dark:text-white mb-2">
                Hydration
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Aim to drink at least 3-4 liters of water per day. You can also include herbal teas and black coffee (limit to 2 cups per day) in your fluid intake.
              </p>
            </div>
            
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h3 className="font-medium text-slate-800 dark:text-white mb-2">
                Meal Timing
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Try to space your meals 3-4 hours apart, with your last meal about 2-3 hours before bedtime. This helps maintain stable energy levels and optimizes digestion.
              </p>
            </div>
            
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h3 className="font-medium text-slate-800 dark:text-white mb-2">
                Supplements
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Consider taking a daily multivitamin, omega-3 fatty acids (if you don't eat fatty fish regularly), and vitamin D (especially during winter months or if you have limited sun exposure).
              </p>
            </div>
            
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h3 className="font-medium text-slate-800 dark:text-white mb-2">
                Free Meals
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You can have 1-2 "free" meals per week where you eat foods outside of your plan. Try to still make reasonable choices and be mindful of portions, but enjoy the flexibility for social occasions and mental health.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
