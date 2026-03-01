// app/dashboard/leads/[id]/not-found.tsx
export default function NotFound() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-2">Lead Not Found</h1>
      <p className="text-muted-foreground">The lead you are looking for does not exist or you do not have access.</p>
    </div>
  );
}
