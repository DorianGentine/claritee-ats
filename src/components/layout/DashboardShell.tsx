export const DashboardShell = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="flex-1">{children}</main>
    </div>
  );
};
