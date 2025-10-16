import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";
import { Footer } from "@/components/user/footer";
import { UserNavbar } from "@/components/user/navbar";

export default function Contact() {
  return (
    <div className="py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left container */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-900">
              Contact us
            </h1>
            <p className="text-xl text-muted-foreground">
              Our friendly team would love to hear from you.
            </p>
          </div>

          <div className="">
            {/* Email Contact */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-muted-foreground" />
              </div>
              <a
                href="mailto:thelaunchpadht@gmail.com"
                className="text-muted-foreground hover:text-blue-900 transition-colors font-medium"
              >
                thelaunchpadht@gmail.com
              </a>
            </div>

            {/* Phone Contact */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-muted-foreground" />
              </div>
              <a
                href="tel:+1-555-123-4567"
                className="text-muted-foreground hover:text-blue-900 transition-colors font-medium"
              >
                832-219-8320
              </a>
            </div>

            {/* Location */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-foreground font-medium">10410 S Main St, Houston, TX 77025</span>
            </div>
          </div>
        </div>

        {/* Right Container - Form */}
        <div className="rounded-lg p-8">
          <form className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-muted-foreground"
              >
                Email
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* First Name Field */}
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="text-sm font-medium text-muted-foreground"
              >
                First Name
              </Label>
              <Input
                type="text"
                id="firstName"
                name="firstName"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Last Name Field */}
            <div className="space-y-2">
              <Label
                htmlFor="lastName"
                className="text-sm font-medium text-muted-foreground"
              >
                Last Name
              </Label>
              <Input
                type="text"
                id="lastName"
                name="lastName"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-sm font-medium text-muted-foreground"
              >
                Mobile phone number
              </Label>
              <Input
                type="tel"
                id="phone"
                name="phone"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <Label
                htmlFor="message"
                className="text-sm font-medium text-muted-foreground"
              >
                Message
              </Label>
              <Textarea
                id="message"
                name="message"
                rows={4}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Privacy Notice */}
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                By entering your phone number, you consent to receive SMS
                communications from The Launch Pad related to your booking.
                Standard message and data rates apply. Message frequency varies.
                The Launch Pad will not share your contact phone number with any
                third parties. Reply STOP to cancel.{" "}
                <a
                  href="/legal/privacy-policy"
                  className="text-blue-400 hover:text-blue-600 underline"
                >
                  Privacy Policy
                </a>
              </p>

              {/* Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="promotional"
                  name="promotional"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label
                  htmlFor="promotional"
                  className="text-sm text-muted-foreground"
                >
                  I agree to receive promotional messages about new products and
                  special offers.
                </Label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <Button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                Submit
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
