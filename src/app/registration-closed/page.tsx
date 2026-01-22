import { getRemainingSlots, getUserCount, getMaxUsers } from "@/lib/user-limit";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function RegistrationClosedPage() {
  const remaining = await getRemainingSlots();
  const current = await getUserCount();
  const max = getMaxUsers();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-5xl">🌱</div>
          <CardTitle className="text-xl">Registration Closed</CardTitle>
          <CardDescription>
            Garden Optimus is currently at capacity ({current}/{max} users).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We&apos;re limiting early access to ensure the best experience for
            our users. Thank you for your interest in Garden Optimus!
          </p>
          {remaining === 0 && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              All slots are currently filled. Please check back later as spots
              may open up.
            </p>
          )}
          <div className="pt-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
