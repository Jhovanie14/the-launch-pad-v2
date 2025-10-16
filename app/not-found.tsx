import { ToolCaseIcon } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center p-4 space-y-3">
      <h2 className="font-extrabold text-8xl text-muted-foreground">404</h2>
      <div>
        <p className="text-xl text-accent-foreground">
          Sorry, this page is unavailable
        </p>
        <div className="flex items-center  mb-4">
            <ToolCaseIcon className="h-5 w-5 mr-2" />
          <p className="text-sm text-muted-foreground">
            The page you are looking for is currently not available or does not
            exist.
          </p>
        </div>
      </div>
      <Link href="/" className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-blue-800">
        Return Home
      </Link>
    </div>
  );
}
