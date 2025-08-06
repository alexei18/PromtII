'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
    Zap,
    ArrowLeft,
    ArrowRight,
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const CUSTOM_ANSWER_KEY = 'Altele (specificați)';

const createFormSchema = (questions: SurveyQuestion[]) => {
    const schemaShape = questions.reduce((acc, q) => {
        acc[q.question] = z.object({
            selectedOptions: q.allowMultiple ? z.array(z.string()) : z.string(),
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
}

export function DynamicOnboardingForm({ questions, onSubmit }: DynamicOnboardingFormProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const formSchema = createFormSchema(questions);

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
                    // For multi-select questions
                    const filteredAnswers = selectedOptions.filter(opt => opt !== CUSTOM_ANSWER_KEY);
                    if (selectedOptions.includes(CUSTOM_ANSWER_KEY) && customAnswer.trim()) {
                        filteredAnswers.push(customAnswer.trim());
                    }
                    if (filteredAnswers.length > 0) {
                        acc[question] = filteredAnswers.join(', ');
                    }
                } else {
                    // For single-select questions
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
        const isValid = await form.trigger(`responses.${questions[currentStep].question}`);
        if (isValid && currentStep < questions.length - 1) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        setCurrentStep((prev) => prev - 1);
    };

    const VALID_ICONS = {
        'briefcase': Briefcase,
        'users': Users,
        'megaphone': Megaphone,
        'target': Target,
        'zap': Zap,
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
        if (!iconName) return <HelpCircle className="h-6 w-6 mb-2" />;

        const IconComponent = VALID_ICONS[iconName as keyof typeof VALID_ICONS];
        if (IconComponent) {
            return <IconComponent className="h-6 w-6 mb-2" />;
        }

        console.warn(`Icon "${iconName}" not found in valid icons list`);
        return <HelpCircle className="h-6 w-6 mb-2" />;
    };

    const isLastStep = currentStep === questions.length - 1;
    const currentQuestion = questions[currentStep];
    const watchSelectedOptions = form.watch(`responses.${currentQuestion.question}.selectedOptions`);
    const showCustomInput = Array.isArray(watchSelectedOptions)
        ? watchSelectedOptions.includes(CUSTOM_ANSWER_KEY)
        : watchSelectedOptions === CUSTOM_ANSWER_KEY;

    return (
        <Card className="min-h-screen w-full max-w-5xl mx-auto bg-black/95 text-white border-0 rounded-none">
            <CardHeader className="pt-16 pb-12 text-center">
                <CardTitle className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">
                    {currentQuestion.category}
                </CardTitle>
                <CardDescription className="text-xl text-gray-400 max-w-2xl mx-auto">
                    {currentStep + 1} din {questions.length}
                </CardDescription>
            </CardHeader>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                    <CardContent className="p-8 pb-24 min-h-[500px]">
                        <div className="mb-12">
                            <Progress
                                value={((currentStep + 1) / questions.length) * 100}
                                className="w-full h-1 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-violet-500"
                            />
                        </div>

                        <div className="max-w-4xl mx-auto">
                            <FormField
                                control={form.control}
                                name={`responses.${currentQuestion.question}.selectedOptions`}
                                render={({ field }) => (
                                    <FormItem className="space-y-8">
                                        <FormLabel className="text-2xl font-medium text-center block text-gray-200">
                                            {currentQuestion.question}
                                        </FormLabel>
                                        <FormControl>
                                            {currentQuestion.allowMultiple ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                                    {currentQuestion.options.map((option, optionIndex) => (
                                                        <FormItem key={optionIndex} className="flex items-start space-x-3">
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
                                                                    className="translate-y-1"
                                                                />
                                                            </FormControl>
                                                            <Label
                                                                htmlFor={`${currentStep}-${optionIndex}`}
                                                                className={cn(
                                                                    "flex flex-col items-center justify-center p-6 border border-gray-800 rounded-xl cursor-pointer transition-all duration-300 flex-1",
                                                                    "hover:border-blue-500 hover:bg-blue-500/10 hover:scale-[1.02]",
                                                                    "group relative overflow-hidden",
                                                                    Array.isArray(field.value) && field.value.includes(option.text)
                                                                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_30px_-5px] shadow-blue-500/30"
                                                                        : "bg-gray-900/50"
                                                                )}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                                                                <div className={cn(
                                                                    "w-12 h-12 mb-4 rounded-full flex items-center justify-center",
                                                                    "bg-gradient-to-br from-blue-600/20 to-violet-600/20 transition-colors duration-300",
                                                                    Array.isArray(field.value) && field.value.includes(option.text) ? "from-blue-600 to-violet-600" : ""
                                                                )}>
                                                                    {renderIcon(option.icon)}
                                                                </div>
                                                                <span className="text-center font-medium text-base text-gray-300 group-hover:text-white transition-colors duration-300">
                                                                    {option.text}
                                                                </span>
                                                            </Label>
                                                        </FormItem>
                                                    ))}
                                                </div>
                                            ) : (
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    value={field.value as string}
                                                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4"
                                                >
                                                    {currentQuestion.options.map((option, optionIndex) => (
                                                        <FormItem key={optionIndex}>
                                                            <FormControl>
                                                                <RadioGroupItem
                                                                    value={option.text}
                                                                    id={`${currentStep}-${optionIndex}`}
                                                                    className="sr-only"
                                                                />
                                                            </FormControl>
                                                            <Label
                                                                htmlFor={`${currentStep}-${optionIndex}`}
                                                                className={cn(
                                                                    "flex flex-col items-center justify-center p-6 border border-gray-800 rounded-xl cursor-pointer transition-all duration-300",
                                                                    "hover:border-blue-500 hover:bg-blue-500/10 hover:scale-[1.02]",
                                                                    "group relative overflow-hidden",
                                                                    field.value === option.text
                                                                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_30px_-5px] shadow-blue-500/30"
                                                                        : "bg-gray-900/50"
                                                                )}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                                                                <div className={cn(
                                                                    "w-12 h-12 mb-4 rounded-full flex items-center justify-center",
                                                                    "bg-gradient-to-br from-blue-600/20 to-violet-600/20 transition-colors duration-300",
                                                                    field.value === option.text ? "from-blue-600 to-violet-600" : ""
                                                                )}>
                                                                    {renderIcon(option.icon)}
                                                                </div>
                                                                <span className="text-center font-medium text-base text-gray-300 group-hover:text-white transition-colors duration-300">
                                                                    {option.text}
                                                                </span>
                                                            </Label>
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
                                                                className="bg-gray-900/50 border-gray-800 focus:border-blue-500"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                        <FormMessage className="pt-2 text-center" />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="fixed bottom-0 left-0 right-0 py-6 px-8 bg-black/95 border-t border-gray-800 flex justify-between items-center backdrop-blur-xl">
                        <div className="flex-1">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handlePrevious}
                                disabled={currentStep === 0}
                                className="text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Anterior
                            </Button>
                        </div>

                        <div className="flex-1 flex justify-center">
                            <div className="flex gap-1.5">
                                {Array.from({ length: questions.length }, (_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-300",
                                            i === currentStep
                                                ? "bg-blue-500 w-4"
                                                : i < currentStep
                                                    ? "bg-gray-600"
                                                    : "bg-gray-800"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex justify-end">
                            {isLastStep ? (
                                <Button
                                    type="submit"
                                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium px-8"
                                >
                                    <Zap className="mr-2 h-4 w-4" />
                                    Generează Prompt-ul
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium px-8"
                                >
                                    Următorul
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
