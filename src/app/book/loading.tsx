export default function Loading() {
  return (
    <div className="min-h-screen bg-[#141420] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading booking page...</p>
      </div>
    </div>
  );
}
