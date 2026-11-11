import { Handshake, ShieldCheck, Sparkles, Store } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE } from "@/lib/constants/site";

export const metadata = {
  title: "About",
  description: "The story and values behind Zubair Mobile.",
};

const VALUES = [
  { icon: ShieldCheck, title: "Genuine, always", text: "Every device is verified and sold with clear warranty terms." },
  { icon: Handshake, title: "Honest advice", text: "We recommend what fits your needs and budget, not what earns more." },
  { icon: Store, title: "Local roots, modern shop", text: "A trusted neighborhood mobile shop with a premium digital experience." },
  { icon: Sparkles, title: "Technology that helps", text: "Smart tools like phone finder and AI guidance make choosing easier." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title={`About ${SITE.shortName}`}
        description={SITE.tagline}
        crumbs={[{ label: "About" }]}
      />
      <div className="container-page py-12">
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {SITE.name} was built to make buying a smartphone simple and trustworthy. We combine a hands-on retail
          shop with modern technology so you can compare, choose and buy with confidence, and get support long after
          the sale.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardHeader>
                <span className="mb-2 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
