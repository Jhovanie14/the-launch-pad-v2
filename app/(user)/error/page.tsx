export default function ErrorPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const error = searchParams.error || "Unknown error";
  const description = searchParams.error_description || "Something went wrong.";

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-4">
      <h1 className="text-2xl font-bold mb-4 text-red-600">
        Authentication Error
      </h1>
      <p className="mb-2">Error: {error}</p>
      <p className="text-gray-500">{description}</p>
      <a href="/login" className="mt-4 text-blue-600 underline">
        Return to Login
      </a>
    </div>
  );
}
