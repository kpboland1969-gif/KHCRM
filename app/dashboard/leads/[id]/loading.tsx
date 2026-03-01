// app/dashboard/leads/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="p-8 text-center animate-pulse">
      <div className="h-8 w-1/3 bg-gray-200 rounded mb-4 mx-auto" />
      <div className="h-4 w-1/2 bg-gray-100 rounded mx-auto" />
    </div>
  );
}
