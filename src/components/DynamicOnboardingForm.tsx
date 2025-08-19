'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Briefcase,
  Users,
  Megaphone,
  Target,
  Settings,
  MessageCircle,
  DollarSign,
  Calendar,
  Award,
  Shield,
  Lightbulb,
  Link,
  GitBranch,
  PieChart,
  Compass,
  BookOpen,
  Feather,
  PenTool,
  Server,
  Database,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import type { SurveyQuestion } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const CUSTOM_ANSWER_KEY = 'Altele';

const createFormSchema = (questions: SurveyQuestion[]) => {
  const schemaShape = questions.reduce((acc, q) => {
    acc[q.question] = z.object({
      selectedOptions: q.allowMultiple ? z.array(z.string()).optional() : z.string().optional(),
      customAnswer: z.string().optional()
    });
    return acc;
  }, {} as Record<string, z.ZodType<any>>);

  return z.object({
    responses: z.object(schemaShape)
  });
};

export type DynamicOnboardingData = z.infer<ReturnType<typeof createFormSchema>>;

interface DynamicOnboardingFormProps {
  questions: SurveyQuestion[];
  onSubmit: (data: { responses: Record<string, string> }) => void;
  onBack: () => void;
  onStepChange: (step: number) => void;
}

const VALID_ICONS = {
    'briefcase': Briefcase,
    'users': Users,
    'megaphone': Megaphone,
    'target': Target,
    'zap': Lightbulb, // Using Lightbulb for zap as it's more common
    'settings': Settings,
    'message-circle': MessageCircle,
    'dollar-sign': DollarSign,
    'calendar': Calendar,
    'award': Award,
    'shield': Shield,
    'lightbulb': Lightbulb,
    'link': Link,
    'workflow': GitBranch,
    'pie-chart': PieChart,
    'compass': Compass,
    'book-open': BookOpen,
    'feather': Feather,
    'pen-tool': PenTool,
    'server': Server,
    'database': Database,
    'x-circle': XCircle,
    'more-horizontal': MoreHorizontal
};

const renderIcon = (iconName: string | undefined) => {
    if (!iconName) return <HelpCircle className="h-5 w-5" />;
    const IconComponent = VALID_ICONS[iconName as keyof typeof VALID_ICONS];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />;
};

export function DynamicOnboardingForm({ questions, onSubmit, onBack, onStepChange }: DynamicOnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const formSchema = createFormSchema(questions);

  useEffect(() => {
    onStepChange(currentStep);
  }, [currentStep, onStepChange]);

  const form = useForm<DynamicOnboardingData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      responses: questions.reduce((acc, q) => {
        acc[q.question] = {
          selectedOptions: q.allowMultiple ? [] : '',
          customAnswer: ''
        };
        return acc;
      }, {} as DynamicOnboardingData['responses'])
    },
  });

  const handleFormSubmit = (data: DynamicOnboardingData) => {
    const formattedData = {
      responses: Object.entries(data.responses).reduce((acc, [question, answerData]) => {
        const { selectedOptions, customAnswer = '' } = answerData;
        let finalAnswer = selectedOptions;

        if (Array.isArray(selectedOptions)) {
          const filteredAnswers = selectedOptions.filter(opt => opt !== CUSTOM_ANSWER_KEY);
          if (selectedOptions.includes(CUSTOM_ANSWER_KEY) && customAnswer.trim()) {
            filteredAnswers.push(customAnswer.trim());
          }
          if (filteredAnswers.length > 0) {
            acc[question] = filteredAnswers.join(', ');
          }
        } else {
          if (selectedOptions === CUSTOM_ANSWER_KEY && customAnswer.trim()) {
            finalAnswer = customAnswer.trim();
          }
          if (finalAnswer && finalAnswer !== CUSTOM_ANSWER_KEY) {
            acc[question] = finalAnswer;
          }
        }
        return acc;
      }, {} as Record<string, string>)
    };
    onSubmit(formattedData);
  };

  const handleNext = async () => {
    if (isLastStep) {
      form.handleSubmit(handleFormSubmit)();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  const isLastStep = currentStep === questions.length - 1;
  const currentQuestion = questions[currentStep];
  const watchSelectedOptions = form.watch(`responses.${currentQuestion.question}.selectedOptions`);
  const showCustomInput = Array.isArray(watchSelectedOptions)
    ? watchSelectedOptions.includes(CUSTOM_ANSWER_KEY)
    : watchSelectedOptions === CUSTOM_ANSWER_KEY;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
        <div className="flex-grow p-2">
          <FormField
            control={form.control}
            name={`responses.${currentQuestion.question}.selectedOptions`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-gray-800">
                  {currentQuestion.question}
                </FormLabel>
                <FormControl className="mt-4">
                  {currentQuestion.allowMultiple ? (
                    <div className="space-y-3">
                      {currentQuestion.options.filter(option => option.text !== 'Nu este cazul').map((option, optionIndex) => (
                        <FormItem key={optionIndex} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              id={`${currentStep}-${optionIndex}`}
                              checked={Array.isArray(field.value) && field.value.includes(option.text)}
                              onCheckedChange={(checked) => {
                                const currentValue = Array.isArray(field.value) ? field.value : [];
                                if (checked) {
                                  field.onChange([...currentValue, option.text]);
                                } else {
                                  field.onChange(currentValue.filter(value => value !== option.text));
                                }
                              }}
                            />
                          </FormControl>
                          <div className="flex items-center gap-3">
                            {renderIcon(option.icon)}
                            <Label htmlFor={`${currentStep}-${optionIndex}`} className="font-normal text-gray-700 cursor-pointer flex-grow">
                              {option.text}
                            </Label>
                          </div>
                        </FormItem>
                      ))}
                    </div>
                  ) : (
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value as string}
                      className="space-y-3"
                    >
                      {currentQuestion.options.filter(option => option.text !== 'Nu este cazul').map((option, optionIndex) => (
                        <FormItem key={optionIndex} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <FormControl>
                            <RadioGroupItem value={option.text} id={`${currentStep}-${optionIndex}`} />
                          </FormControl>
                          <div className="flex items-center gap-3">
                            {renderIcon(option.icon)}
                            <Label htmlFor={`${currentStep}-${optionIndex}`} className="font-normal text-gray-700 cursor-pointer flex-grow">
                              {option.text}
                            </Label>
                          </div>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  )}
                </FormControl>
                {showCustomInput && (
                  <FormField
                    control={form.control}
                    name={`responses.${currentQuestion.question}.customAnswer`}
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Specificați răspunsul dvs..."
                            className="mt-2"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                <FormMessage className="pt-2" />
              </FormItem>
            )}
          />
        </div>

        <div className="p-0 mt-8 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={handlePrevious}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Înapoi
          </Button>
          <Button type="button" onClick={handleNext}>
            {isLastStep ? 'Generează Prompt-ul' : 'Următorul'} <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
