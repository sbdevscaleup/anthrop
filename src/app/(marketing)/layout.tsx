import { MarketingHeader } from "@/shared/ui/marketing/marketing-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      {children}
    </div>
  );
}

