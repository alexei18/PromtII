import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckIcon } from "lucide-react";

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-lg shadow-md">
          {/* Left Side */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Try Similarweb Starter for free</h2>
            <p className="text-gray-700 mb-8">Free 7-day trial - Cancel anytime</p>
            
            <ul className="space-y-8">
              <li className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                  <div className="w-0.5 h-16 bg-gray-300 my-1"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Today: Choose your plan</h3>
                  <p className="text-sm text-gray-700">Select annual or monthly billing</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                  <div className="w-0.5 h-16 bg-gray-300 my-1"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-500">Enter payment information</h3>
                  <p className="text-sm text-gray-600">$0 today - You won&apos;t be charged until August 16</p>
                </div>
              </li>
               <li className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                  <div className="w-0.5 h-16 bg-gray-300 my-1"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-500">August 14: Get an email reminder</h3>
                  <p className="text-sm text-gray-600">We&apos;ll remind you 2 days before your trial ends</p>
                </div>
              </li>
              <li className="flex items-start">
                 <div className="w-6 h-6 border-2 border-gray-300 rounded-full mr-4"></div>
                <div>
                  <h3 className="font-semibold text-gray-500">August 16: Your subscription starts</h3>
                  <p className="text-sm text-gray-600">Your card is charged and your subscription starts</p>
                </div>
              </li>
            </ul>
            <p className="text-sm text-gray-600 mt-8">
              Don&apos;t want to add your payment details? <a href="#" className="text-blue-600">Get our limited version here</a>
            </p>
          </div>

          {/* Right Side */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-4">Competitive Intelligence: Starter</h3>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-500 mr-2" /> 1 user</li>
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-500 mr-2" /> 100 website results per report</li>
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-500 mr-2" /> 1,000 keyword results per report</li>
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-500 mr-2" /> 3 months of historical data</li>
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-500 mr-2" /> 100 data credits</li>
            </ul>
            
            <h4 className="font-semibold mb-3">Billing Cycle</h4>
            <RadioGroup defaultValue="yearly" className="space-y-2">
              <div className="border border-blue-600 rounded-md p-3 flex justify-between items-center">
                <div className="flex items-center">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="ml-2">
                    <span className="font-bold">Yearly</span> <span className="text-blue-600 text-xs bg-blue-100 px-2 py-1 rounded-full ml-1">Best value - save 33%</span>
                    <p className="text-gray-700 text-sm">$125/Per month billed annually</p>
                  </Label>
                </div>
              </div>
              <div className="border rounded-md p-3 flex justify-between items-center">
                 <div className="flex items-center">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="ml-2">
                    <span className="font-bold">Monthly</span>
                    <p className="text-gray-700 text-sm">$199/Per month billed monthly</p>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            <div className="flex justify-between items-center mt-6 mb-4">
              <span className="font-semibold">Due today</span>
              <span className="font-bold text-2xl">$0</span>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
