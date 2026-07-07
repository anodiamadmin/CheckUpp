export type PregnancyCheckupItem = {
  name: string;
  date: string;
  completed: boolean;
  icon?: string;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  [key: string]: any;
};

export type PregnancyPlanSnapshot = {
  conceptionDate?: string | null;
  expectedDueDate?: string | null;
  estimatedCheckupDates: PregnancyCheckupItem[];
};

export type SavePregnancyPlanInput = {
  conceptionDate: Date;
  expectedDueDate: Date;
  estimatedCheckupDates: PregnancyCheckupItem[];
};
