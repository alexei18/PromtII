'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIcon, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


const plans = [
  {
    name: "Starter",
    price: "€29",
    period: "/lună",
    description: "Perfect pentru echipe mici și freelanceri",
    features: [
      "Până la 1,000 minute/lună",
      "Reducerea zgomotului AI",
      "Suport email",
      "API basic",
      "99.5% uptime",
    ],
    cta: "Începe Gratuit",
    popular: false,
  },
  {
    name: "Professional",
    price: "€99",
    period: "/lună",
    description: "Ideal pentru echipe medii și companii în creștere",
    features: [
      "Până la 10,000 minute/lună",
      "Toate funcțiile AI",
      "Suport prioritar",
      "API complet",
      "99.9% uptime",
      "Analize avansate",
      "Integrări personalizate",
    ],
    cta: "Începe Gratuit",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Personalizat",
    period: "",
    description: "Soluții scalabile pentru organizații mari",
    features: [
      "Minute nelimitate",
      "AI personalizat",
      "Account manager dedicat",
      "SLA garantat",
      "99.99% uptime",
      "Securitate avansată",
      "Deploy on-premise",
      "Conformitate GDPR/HIPAA",
    ],
    cta: "Contactează-ne",
    popular: false,
  },
];

const checkoutSchema = z.object({
  fullName: z.string().min(3, { message: "Numele trebuie să aibă cel puțin 3 caractere." }),
  email: z.string().email({ message: "Adresa de email nu este validă." }),
  cardName: z.string().min(3, { message: "Numele de pe card este obligatoriu." }),
  cardNumber: z.string().regex(/^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/, { message: "Număr de card invalid." }),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{4}|[0-9]{2})$/, { message: "Data de expirare invalidă (MM/AA)." }),
  cvc: z.string().regex(/^[0-9]{3,4}$/, { message: "CVC invalid." }),
  billingAddress: z.string().min(5, { message: "Adresa de facturare este obligatorie." }),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

type Plan = typeof plans[0];

const CheckoutForm = ({ selectedPlan, onBack }: { selectedPlan: Plan; onBack: () => void }) => {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
      cardName: "",
      cardNumber: "",
      expiryDate: "",
      cvc: "",
      billingAddress: "",
    }
  });

  const onSubmit = (data: CheckoutFormData) => {
    console.log("Subscription data:", { plan: selectedPlan.name, ...data });
    toast({
      title: "Abonament Activat!",
      description: `Felicitări! Ați activat planul ${selectedPlan.name}.`,
      className: "bg-green-500 text-white",
    });
    // Redirect to a confirmation or dashboard page after successful submission
    router.push('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="shadow-2xl">
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="justify-self-start mb-4 w-auto p-0 h-auto">
            <ArrowLeft className="mr-2 h-4 w-4" /> Înapoi la Planuri
          </Button>
          <CardTitle className="text-3xl font-bold">Finalizează Comanda</CardTitle>
          <CardDescription>Ați selectat planul: <span className="font-bold text-primary">{selectedPlan.name}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Nume Complet</FormLabel><FormControl><Input placeholder="Ion Popescu" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Adresă de Email</FormLabel><FormControl><Input type="email" placeholder="email@exemplu.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <h3 className="text-lg font-semibold pt-4 border-t">Detalii de Plată</h3>
              
              <FormField control={form.control} name="cardName" render={({ field }) => (
                <FormItem><FormLabel>Numele de pe Card</FormLabel><FormControl><Input placeholder="Ion Popescu" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cardNumber" render={({ field }) => (
                <FormItem><FormLabel>Număr Card</FormLabel><FormControl><Input placeholder="•••• •••• •••• ••••" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="expiryDate" render={({ field }) => (
                  <FormItem><FormLabel>Data Expirării</FormLabel><FormControl><Input placeholder="MM/AA" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cvc" render={({ field }) => (
                  <FormItem><FormLabel>CVC</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <h3 className="text-lg font-semibold pt-4 border-t">Informații de Facturare</h3>
              <FormField control={form.control} name="billingAddress" render={({ field }) => (
                <FormItem><FormLabel>Adresă de Facturare</FormLabel><FormControl><Input placeholder="Str. Exemplului, Nr. 10, București" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <Button type="submit" size="lg" className="w-full mt-8">Plătește {selectedPlan.price}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
};


export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const handleSelectPlan = (plan: Plan) => {
    if (plan.name !== "Enterprise") {
      setSelectedPlan(plan);
    }
  };

  const handleBack = () => {
    setSelectedPlan(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-8 font-body">
      <div className="w-full max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {!selectedPlan ? (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">Alegeți Planul Potrivit</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Soluții simple și transparente pentru a vă scala afacerea cu ajutorul inteligenței artificiale.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {plans.map((plan) => (
                  <Card
                    key={plan.name}
                    className={`flex flex-col shadow-lg hover:shadow-2xl transition-shadow duration-300 ${plan.popular ? 'border-primary border-2 relative' : 'border'}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 right-4 bg-primary text-primary-foreground px-3 py-1 text-sm font-bold rounded-full">
                        Cel mai popular
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="text-center my-4">
                        <span className="text-4xl font-extrabold">{plan.price}</span>
                        {plan.period && <span className="text-gray-500">{plan.period}</span>}
                      </div>
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center">
                            <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {plan.name === "Enterprise" ? (
                         <Dialog>
                            <DialogTrigger asChild>
                               <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>{plan.cta}</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Contact Enterprise</DialogTitle>
                                </DialogHeader>
                                <p>Pentru soluții personalizate, vă rugăm să ne contactați la <a href="mailto:sales@aichat.md" className="text-primary font-semibold">sales@aichat.md</a>.</p>
                            </DialogContent>
                         </Dialog>
                      ) : (
                        <Button onClick={() => handleSelectPlan(plan)} className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                          {plan.cta}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </motion.div>
          ) : (
            <CheckoutForm selectedPlan={selectedPlan} onBack={handleBack} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}