import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ContactForm } from "@/components/contact/contact-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE } from "@/lib/constants/site";

export const metadata = {
  title: "Contact",
  description: "Get in touch with Zubair Mobile for product enquiries, orders and repairs.",
};

const INFO = [
  { icon: Phone, label: "Phone", value: SITE.contact.phone },
  { icon: Mail, label: "Email", value: SITE.contact.email },
  { icon: MapPin, label: "Visit us", value: SITE.contact.address },
  { icon: Clock, label: "Hours", value: "Mon - Sat, 10:00 AM - 9:00 PM" },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Contact us"
        description="Questions about a phone, an order or a repair? We are happy to help."
        crumbs={[{ label: "Contact" }]}
      />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.5fr_1fr]">
        <ContactForm />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-xl">Shop details</CardTitle>
            <CardDescription>Placeholder details. Real store info comes from settings later.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-5">
              {INFO.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-sm text-muted-foreground">{value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
