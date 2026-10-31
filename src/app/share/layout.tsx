import { PublicHeader } from "@/components/layout/PublicHeader";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicHeader />
      {children}
    </>
  );
}
