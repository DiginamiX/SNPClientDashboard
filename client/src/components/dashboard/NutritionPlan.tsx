import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface MacroTarget {
  name: string;
  current: number;
  target: number;
  color: string;
}

interface NutritionPlanProps {
  plan: {
    updatedAt: string;
    macros: {
      protein: MacroTarget;
      carbs: MacroTarget;
      fat: MacroTarget;
      calories: MacroTarget;
    };
    coachNotes?: string;
  };
  onViewFullPlanClick: () => void;
}

export default function NutritionPlan({ plan, onViewFullPlanClick }: NutritionPlanProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  const getProgressColor = (macro: MacroTarget) => {
    switch (macro.name.toLowerCase()) {
      case "protein":
        return "bg-accent";
      case "carbs":
        return "bg-primary";
      case "fat":
        return "bg-secondary";
      case "calories":
        return "bg-blue-400";
      default:
        return "bg-slate-400";
    }
  };

  const calculatePercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Current Nutrition Plan</h3>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Updated {formatDate(plan.updatedAt)}
          </span>
        </div>
        <div className="space-y-4">
          {Object.values(plan.macros).map((macro) => (
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
        {plan.coachNotes && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-800 dark:text-white mb-1">Coach Notes</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {plan.coachNotes}
            </p>
          </div>
        )}
        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={onViewFullPlanClick}
          >
            <i className="ri-file-list-3-line mr-1"></i> View Full Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
