import { PageHeader } from "@/components/shared/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { getFaqs } from "@/services/catalog";

export const metadata = {
  title: "FAQ",
  description: "Answers about warranty, delivery, returns and support.",
};

export default function FaqPage() {
  const faqs = getFaqs();
  return (
    <>
      <PageHeader
        title="Frequently asked questions"
        description="Quick answers to the things customers ask most."
        crumbs={[{ label: "FAQ" }]}
      />
      <div className="container-page max-w-3xl py-10">
        <Card>
          <CardContent>
            <Accordion type="single" collapsible defaultValue="faq-0">
              {faqs.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
